package com.jtech.service;

import com.jtech.dto.request.CommentRequest;
import com.jtech.dto.request.UpdateCommentRequest;
import com.jtech.dto.response.CommentResponse;
import com.jtech.entity.ClassPostComment;
import com.jtech.entity.User;
import com.jtech.repository.CommentRepository;
import com.jtech.repository.PostRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class CommentService {
    private static final Logger log = LoggerFactory.getLogger(CommentService.class);
    private final PostService postService;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final CloudinaryService cloudinary;

    public CommentService(PostService postService, PostRepository postRepository,
            CommentRepository commentRepository, CloudinaryService cloudinary) {
        this.postService = postService;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.cloudinary = cloudinary;
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(Long classId, Long postId) {
        postService.checkPostAccess(classId, false);
        requirePost(classId, postId);
        return thread(postId);
    }

    @Transactional
    public CommentResponse create(Long classId, Long postId, CommentRequest request, MultipartFile attachment) {
        User actor = postService.checkPostAccess(classId, true);
        requirePost(classId, postId);
        String content = validateContent(request == null ? null : request.content(), attachment != null);
        Long parentId = request.parentId();
        if (parentId != null) {
            var parent = commentRepository.findByIdAndPostId(parentId, postId)
                    .orElseThrow(() -> new EntityNotFoundException("Bình luận cha không tồn tại."));
            if (parent.getContent() == null && parent.getAudioUrl() == null)
                throw new IllegalArgumentException("Không thể trả lời bình luận đã xóa.");
        }
        Map<String, String> upload = null;
        if (attachment != null) {
            try { upload = cloudinary.uploadCommentAttachment(attachment); }
            catch (IllegalStateException exception) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Không thể tải tệp bình luận lên Cloudinary.", exception);
            }
        }
        Map<String, String> uploaded = upload;
        if (uploaded != null && TransactionSynchronizationManager.isSynchronizationActive())
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status == STATUS_COMMITTED) return;
                    try { cloudinary.deleteCommentAttachment(uploaded.get("publicId"), uploaded.get("resourceType")); }
                    catch (RuntimeException error) { log.warn("Could not clean up failed comment upload", error); }
                }
            });
        var comment = new ClassPostComment();
        comment.setPostId(postId);
        comment.setUserId(actor.getUserId());
        comment.setContent(content.isEmpty() ? null : content);
        if (uploaded != null) {
            comment.setAudioUrl(uploaded.get("url"));
            comment.setAudioPublicId(uploaded.get("publicId"));
        }
        comment.setParentId(parentId);
        try {
            commentRepository.saveAndFlush(comment);
            return findResponse(postId, comment.getId());
        } catch (RuntimeException exception) {
            if (uploaded != null && !TransactionSynchronizationManager.isSynchronizationActive())
                cloudinary.deleteCommentAttachment(uploaded.get("publicId"), uploaded.get("resourceType"));
            throw exception;
        }
    }

    @Transactional
    public CommentResponse update(Long classId, Long postId, Long commentId,
            UpdateCommentRequest request, MultipartFile attachment) {
        User actor = postService.checkPostAccess(classId, true);
        requirePost(classId, postId);
        var comment = requireComment(postId, commentId);
        if (!comment.getUserId().equals(actor.getUserId()))
            throw new AccessDeniedException("Bạn chỉ được sửa bình luận của mình.");
        if (comment.getContent() == null && comment.getAudioUrl() == null)
            throw new EntityNotFoundException("Bình luận đã xóa.");
        if (request == null) throw new IllegalArgumentException("Nội dung bình luận không hợp lệ.");
        if (request.removeAttachment() && attachment != null)
            throw new IllegalArgumentException("Không thể vừa gỡ vừa thay tệp đính kèm.");
        boolean hasAttachment = attachment != null
                || (!request.removeAttachment() && comment.getAudioUrl() != null);
        String content = validateContent(request.content(), hasAttachment);
        Map<String, String> upload = null;
        if (attachment != null) {
            try { upload = cloudinary.uploadCommentAttachment(attachment); }
            catch (IllegalStateException exception) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "Không thể tải tệp bình luận lên Cloudinary.", exception);
            }
        }
        Map<String, String> uploaded = upload;
        boolean synchronizedTransaction = TransactionSynchronizationManager.isSynchronizationActive();
        if (uploaded != null && synchronizedTransaction)
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED)
                        cleanupUploadedAttachment(uploaded.get("publicId"), uploaded.get("resourceType"));
                }
            });
        String oldPublicId = comment.getAudioPublicId();
        String oldUrl = comment.getAudioUrl();
        boolean attachmentChanged = uploaded != null || request.removeAttachment();
        comment.setContent(content.isEmpty() ? null : content);
        if (uploaded != null) {
            comment.setAudioUrl(uploaded.get("url"));
            comment.setAudioPublicId(uploaded.get("publicId"));
        } else if (request.removeAttachment()) {
            comment.setAudioUrl(null);
            comment.setAudioPublicId(null);
        }
        comment.setUpdatedAt(LocalDateTime.now());
        try {
            commentRepository.saveAndFlush(comment);
            CommentResponse response = findResponse(postId, commentId);
            if (attachmentChanged) cleanupPreviousAttachmentAfterCommit(oldPublicId, oldUrl);
            return response;
        } catch (RuntimeException exception) {
            if (uploaded != null && !synchronizedTransaction)
                cleanupUploadedAttachment(uploaded.get("publicId"), uploaded.get("resourceType"));
            throw exception;
        }
    }

    @Transactional
    public void delete(Long classId, Long postId, Long commentId) {
        User actor = postService.checkPostAccess(classId, true);
        requirePost(classId, postId);
        var comment = requireComment(postId, commentId);
        boolean moderator = actor.getRole() != null && "MODERATOR".equals(actor.getRole().getRoleName());
        if (!moderator && !comment.getUserId().equals(actor.getUserId()))
            throw new AccessDeniedException("Bạn chỉ được xóa bình luận của mình.");
        if (comment.getContent() == null && comment.getAudioUrl() == null)
            throw new EntityNotFoundException("Bình luận đã xóa.");
        String publicId = comment.getAudioPublicId();
        String url = comment.getAudioUrl();
        comment.setContent(null);
        comment.setAudioUrl(null);
        comment.setAudioPublicId(null);
        comment.setUpdatedAt(LocalDateTime.now());
        commentRepository.saveAndFlush(comment);
        cleanupPreviousAttachmentAfterCommit(publicId, url);
    }

    private void requirePost(Long classId, Long postId) {
        if (!postRepository.existsByIdAndClassroomId(postId, classId))
            throw new EntityNotFoundException("Bài đăng không tồn tại.");
    }
    private ClassPostComment requireComment(Long postId, Long commentId) {
        return commentRepository.findByIdAndPostId(commentId, postId)
                .orElseThrow(() -> new EntityNotFoundException("Bình luận không tồn tại."));
    }
    private String validateContent(String input, boolean hasAttachment) {
        String value = input == null ? "" : input.trim();
        if (value.isEmpty() && !hasAttachment)
            throw new IllegalArgumentException("Nội dung bình luận không được để trống");
        if (value.length() > 200) throw new IllegalArgumentException("Bình luận không được vượt quá 200 ký tự.");
        for (String token : value.split("\\s+")) {
            if (token.matches("(?i)^[a-z][a-z0-9+.-]*://.*")
                    && !token.matches("(?i)^https?://.+"))
                throw new IllegalArgumentException("Liên kết chỉ được dùng HTTP hoặc HTTPS.");
        }
        return value;
    }

    private void cleanupUploadedAttachment(String publicId, String resourceType) {
        try { cloudinary.deleteCommentAttachment(publicId, resourceType); }
        catch (RuntimeException error) { log.warn("Could not clean up uploaded comment attachment {}", publicId, error); }
    }

    private void cleanupPreviousAttachmentAfterCommit(String publicId, String url) {
        if (publicId == null) return;
        Runnable cleanup = () -> {
            try { cloudinary.deleteCommentAttachmentByUrl(publicId, url); }
            catch (RuntimeException error) { log.warn("Could not clean up old comment attachment {}", publicId, error); }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive())
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { cleanup.run(); }
            });
        else cleanup.run();
    }
    private CommentResponse findResponse(Long postId, Long id) {
        return thread(postId).stream().map(comment -> findNested(comment, id)).filter(java.util.Objects::nonNull)
                .findFirst().orElseThrow(() -> new EntityNotFoundException("Bình luận không tồn tại."));
    }
    private CommentResponse findNested(CommentResponse current, Long id) {
        if (current.id().equals(id)) return current;
        for (var reply : current.replies()) {
            var found = findNested(reply, id);
            if (found != null) return found;
        }
        return null;
    }
    private List<CommentResponse> thread(Long postId) {
        return PostService.buildCommentHierarchy(commentRepository.findThreadRows(postId));
    }
}

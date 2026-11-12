package com.jtech.service;

import com.jtech.dto.response.PostResponse;
import com.jtech.dto.response.PostDetailResponse;
import com.jtech.dto.response.CommentResponse;
import com.jtech.dto.request.PostRequest;
import com.jtech.entity.ClassPost;
import com.jtech.entity.User;
import com.jtech.entity.ClassroomStatus;
import com.jtech.entity.UserStatus;
import com.jtech.repository.ClassRepository;
import com.jtech.repository.PostRepository;
import com.jtech.repository.CommentRepository;
import com.jtech.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class PostService {
    private static final Logger log = LoggerFactory.getLogger(PostService.class);
    private static final ZoneId POST_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final ClassRepository classRepository;
    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;
    private final EntityManager entityManager;

    public PostService(PostRepository postRepository, CommentRepository commentRepository, ClassRepository classRepository,
                       UserRepository userRepository, CloudinaryService cloudinaryService,
                       EntityManager entityManager) {
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.classRepository = classRepository;
        this.userRepository = userRepository;
        this.cloudinaryService = cloudinaryService;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<PostResponse> getPostsByClass(Long classId) {
        checkPostAccess(classId, false);
        return postRepository.findByClassroomOrderByCreatedAtDesc(classId).stream()
                .map(PostResponse::fromQueryRow).toList();
    }

    @Transactional(readOnly = true)
    public PostDetailResponse getPostDetail(Long classId, Long postId) {
        checkPostAccess(classId, false);
        Object[] row = postRepository.findDetailRows(classId, postId).stream().findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Bài đăng không tồn tại."));
        List<CommentResponse> comments = buildCommentHierarchy(commentRepository.findThreadRows(postId));
        boolean readOnly = classRepository.findById(classId)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học không tồn tại."))
                .getStatus() != ClassroomStatus.ACTIVE;
        return new PostDetailResponse(PostResponse.fromQueryRow(row), comments, readOnly);
    }

    public static List<CommentResponse> buildCommentHierarchy(List<Object[]> rows) {
        Map<Long, Object[]> byId = new HashMap<>();
        Map<Long, List<Long>> children = new HashMap<>();
        List<Long> roots = new ArrayList<>();
        for (Object[] row : rows) byId.put(((Number) row[0]).longValue(), row);
        for (Object[] row : rows) {
            Long id = ((Number) row[0]).longValue();
            Long parent = row[7] == null ? null : ((Number) row[7]).longValue();
            if (parent == null || !byId.containsKey(parent) || parent.equals(id)) roots.add(id);
            else children.computeIfAbsent(parent, ignored -> new ArrayList<>()).add(id);
        }
        return roots.stream().map(id -> buildComment(id, byId, children, new HashSet<>())).toList();
    }

    private static CommentResponse buildComment(Long id, Map<Long, Object[]> rows,
            Map<Long, List<Long>> children, Set<Long> visiting) {
        if (!visiting.add(id)) throw new IllegalStateException("Cấu trúc bình luận không hợp lệ.");
        List<CommentResponse> replies = children.getOrDefault(id, List.of()).stream()
                .map(child -> buildComment(child, rows, children, visiting)).toList();
        visiting.remove(id);
        return CommentResponse.fromRow(rows.get(id), replies);
    }

    @Transactional
    public PostResponse createPost(Long classId, PostRequest request, MultipartFile attachment) {
        User moderator = checkClassAccess(classId, true);
        PostRequest data = validatePostRequest(request, null);

        ClassPost post = new ClassPost();
        post.setClassroomId(classId);
        post.setAuthorId(moderator.getUserId());
        post.setTitle(data.title());
        post.setContent(data.content());
        post.setDueAt(data.dueAt());
        java.util.Map<String, String> upload = null;
        if (attachment != null) {
            upload = cloudinaryService.uploadPostAttachment(attachment);
            post.setAttachmentUrl(upload.get("url"));
            post.setAttachmentPublicId(upload.get("publicId"));
        }
        try {
            postRepository.saveAndFlush(post);
            entityManager.refresh(post);
            return PostResponse.fromPost(post, moderator);
        } catch (RuntimeException exception) {
            if (upload != null) {
                try { cloudinaryService.deletePostAttachment(upload.get("publicId"), upload.get("resourceType")); }
                catch (RuntimeException cleanupError) { exception.addSuppressed(cleanupError); }
            }
            throw exception;
        }
    }

    @Transactional
    public PostResponse updatePost(Long classId, Long postId, PostRequest request, MultipartFile attachment) {
        checkClassAccess(classId, true);
        ClassPost post = postRepository.findByIdAndClassroomId(postId, classId)
                .orElseThrow(() -> new EntityNotFoundException("Bài đăng không tồn tại."));
        PostRequest data = validatePostRequest(request, post.getDueAt());
        String oldPublicId = post.getAttachmentPublicId();
        String oldUrl = post.getAttachmentUrl();

        Map<String, String> upload = attachment == null ? null : cloudinaryService.uploadPostAttachment(attachment);
        if (upload != null) {
            post.setAttachmentUrl(upload.get("url"));
            post.setAttachmentPublicId(upload.get("publicId"));
            registerAttachmentCleanup(upload, oldPublicId, oldUrl);
        }
        post.setTitle(data.title());
        post.setContent(data.content());
        post.setDueAt(data.dueAt());
        postRepository.saveAndFlush(post);
        entityManager.refresh(post);
        User author = userRepository.findById(post.getAuthorId())
                .orElseThrow(() -> new EntityNotFoundException("Tác giả bài đăng không tồn tại."));
        return PostResponse.fromPost(post, author);
    }

    @Transactional
    public void deletePost(Long classId, Long postId) {
        checkClassAccess(classId, true);
        ClassPost post = postRepository.findByIdAndClassroomId(postId, classId)
                .orElseThrow(() -> new EntityNotFoundException("Bài đăng không tồn tại."));

        List<AttachmentRef> attachments = new ArrayList<>();
        if (post.getAttachmentPublicId() != null) {
            attachments.add(new AttachmentRef(post.getAttachmentPublicId(), post.getAttachmentUrl(), false));
        }
        for (Object[] row : postRepository.findCommentAttachments(postId)) {
            attachments.add(new AttachmentRef((String) row[0], (String) row[1], true));
        }

        while (postRepository.countCommentsByPostId(postId) > 0) {
            List<Long> leafIds = postRepository.findLeafCommentIds(postId).stream()
                    .map(Number::longValue).toList();
            if (leafIds.isEmpty()) {
                throw new IllegalStateException("Không thể xóa bài đăng vì bình luận đang được tham chiếu.");
            }
            postRepository.deleteCommentIds(leafIds);
        }
        postRepository.delete(post);
        postRepository.flush();

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) return;
                for (AttachmentRef attachment : attachments) {
                    try {
                        if (attachment.commentAttachment()) {
                            cloudinaryService.deleteCommentAttachmentByUrl(attachment.publicId(), attachment.url());
                        } else {
                            cloudinaryService.deletePostAttachmentByUrl(attachment.publicId(), attachment.url());
                        }
                    } catch (RuntimeException exception) {
                        log.warn("Could not delete asset {} for classroom post {}", attachment.publicId(), postId, exception);
                    }
                }
            }
        });
    }

    private record AttachmentRef(String publicId, String url, boolean commentAttachment) {}

    private PostRequest validatePostRequest(PostRequest request, LocalDateTime existingDueAt) {
        String postType = request == null || request.postType() == null ? "" : request.postType().trim();
        String title = request == null || request.title() == null ? "" : request.title().trim();
        String content = request == null || request.content() == null ? "" : request.content().trim();
        if (title.isEmpty() || content.isEmpty()) {
            throw new IllegalArgumentException("Nội dung * là bắt buộc, không được để trống.");
        }
        if (title.length() > 200) throw new IllegalArgumentException("Tiêu đề không được vượt quá 200 ký tự.");
        if (content.length() > 200) throw new IllegalArgumentException("Nội dung không được vượt quá 200 ký tự.");
        if (!postType.equals("ASSIGNMENT") && !postType.equals("ANNOUNCEMENT")) {
            throw new IllegalArgumentException("Loại bài đăng không hợp lệ.");
        }
        LocalDateTime dueAt = request.dueAt();
        if (postType.equals("ANNOUNCEMENT") && dueAt != null) {
            throw new IllegalArgumentException("Thông báo lớp không có hạn nộp.");
        }
        if (dueAt != null && (existingDueAt == null
                || !dueAt.truncatedTo(ChronoUnit.MINUTES).equals(existingDueAt.truncatedTo(ChronoUnit.MINUTES)))
                && dueAt.isBefore(LocalDateTime.now(POST_TIME_ZONE).truncatedTo(ChronoUnit.MINUTES))) {
            throw new IllegalArgumentException("Hạn nộp không được trước thời điểm hiện tại.");
        }
        return new PostRequest(postType, title, content, dueAt);
    }

    private void registerAttachmentCleanup(Map<String, String> upload, String oldPublicId, String oldUrl) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                try {
                    if (status == STATUS_COMMITTED) {
                        cloudinaryService.deletePostAttachmentByUrl(oldPublicId, oldUrl);
                    } else {
                        cloudinaryService.deletePostAttachment(upload.get("publicId"), upload.get("resourceType"));
                    }
                } catch (RuntimeException exception) {
                    log.warn("Could not clean up classroom post attachment", exception);
                }
            }
        });
    }

    private User checkClassAccess(Long classId, boolean requireActive) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("Vui lòng đăng nhập.");
        }
        var moderator = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Tài khoản không tồn tại."));
        if (moderator.getStatus() != UserStatus.ACTIVE || moderator.getRole() == null
                || !"MODERATOR".equals(moderator.getRole().getRoleName())) {
            throw new AccessDeniedException("Bạn không có quyền xem bài đăng lớp học.");
        }
        var classroom = classRepository.findById(classId)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học không tồn tại."));
        if (!moderator.getUserId().equals(classroom.getModeratorId())) {
            throw new AccessDeniedException("Bạn không có quyền xem bài đăng lớp học này.");
        }
        if (classroom.getStatus() != ClassroomStatus.ACTIVE
                && classroom.getStatus() != ClassroomStatus.ARCHIVED) {
            throw new AccessDeniedException("Lớp học không hoạt động.");
        }
        if (requireActive && classroom.getStatus() != ClassroomStatus.ACTIVE) {
            throw new AccessDeniedException("Lớp lưu trữ chỉ được xem bài đăng.");
        }
        return moderator;
    }

    @Transactional(readOnly = true)
    public User checkPostAccess(Long classId, boolean requireActive) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated())
            throw new AuthenticationCredentialsNotFoundException("Vui lòng đăng nhập.");
        var user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Tài khoản không tồn tại."));
        if (user.getStatus() != UserStatus.ACTIVE || user.getRole() == null)
            throw new AccessDeniedException("Bạn không có quyền truy cập lớp học.");
        var classroom = classRepository.findById(classId)
                .orElseThrow(() -> new EntityNotFoundException("Lớp học không tồn tại."));
        if (classroom.getStatus() != ClassroomStatus.ACTIVE && classroom.getStatus() != ClassroomStatus.ARCHIVED)
            throw new AccessDeniedException("Lớp học không hoạt động.");
        if (requireActive && classroom.getStatus() != ClassroomStatus.ACTIVE)
            throw new AccessDeniedException("Lớp lưu trữ chỉ được xem bình luận.");
        String role = user.getRole().getRoleName();
        boolean moderator = "MODERATOR".equals(role) && user.getUserId().equals(classroom.getModeratorId());
        boolean student = "STUDENT".equals(role)
                && ((Number) entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM classroom_member WHERE classroom_id = :classId AND student_id = :studentId")
                        .setParameter("classId", classId).setParameter("studentId", user.getUserId())
                        .getSingleResult()).longValue() > 0;
        if (!moderator && !student) throw new AccessDeniedException("Bạn không thuộc lớp học này.");
        return user;
    }
}

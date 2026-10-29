package com.jtech.service;

import com.cloudinary.Cloudinary;
import com.jtech.dto.request.FeedbackRequest;
import com.jtech.dto.request.FeedbackResolutionRequest;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.repository.UserRepository;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.sql.Statement;
import java.util.*;

@Service
public class FeedbackService {
    private final JdbcTemplate db;
    private final UserRepository users;
    private final Cloudinary cloudinary;
    private final ApplicationEventPublisher events;
    private static final String SELECT = """
        SELECT f.id, f.feedback_type AS feedbackType, f.category, f.title, f.content,
          f.lesson_id AS lessonId, f.question_id AS questionId, f.attachment_url AS attachmentUrl,
          f.status, f.resolution_note AS resolutionNote, f.created_at AS createdAt,
          f.updated_at AS updatedAt, f.resolved_at AS resolvedAt,
          u.full_name AS submitterName, u.email AS submitterEmail,
          h.full_name AS handlerName, l.title AS lessonTitle, l.skill_type AS skillType,
          ch.id AS chapterId, c.id AS courseId, c.name AS courseName,
          CASE WHEN l.status = 'PUBLISHED' AND ch.status = 'PUBLISHED' AND c.status = 'PUBLISHED'
            THEN TRUE ELSE FALSE END AS contentAvailable
        FROM feedback f JOIN user_account u ON u.id = f.user_id
        LEFT JOIN user_account h ON h.id = f.handled_by
        LEFT JOIN lesson l ON l.id = f.lesson_id
        LEFT JOIN chapter ch ON ch.id = l.chapter_id LEFT JOIN course c ON c.id = ch.course_id
        """;

    public FeedbackService(JdbcTemplate db, UserRepository users, Cloudinary cloudinary, ApplicationEventPublisher events) {
        this.db = db; this.users = users; this.cloudinary = cloudinary; this.events = events;
    }

    public User actor(Principal principal, String role) {
        if (principal == null) throw new AccessDeniedException("Bạn cần đăng nhập.");
        User user = users.findByEmail(principal.getName()).orElseThrow(() -> new AccessDeniedException("Không tìm thấy tài khoản."));
        if (user.getStatus() != UserStatus.ACTIVE || user.getRole() == null || !role.equals(user.getRole().getRoleName()))
            throw new AccessDeniedException("Bạn không có quyền xử lý loại phản hồi này.");
        return user;
    }

    @Transactional
    public Map<String, Object> submit(Principal principal, FeedbackRequest request, MultipartFile image) {
        User user = actor(principal, "STUDENT");
        boolean content = request.feedbackType() == FeedbackRequest.Type.CONTENT;
        if (!Set.of("LESSON", "LECTURE", "QUESTION").contains(request.category()) && content
                || !Set.of("SYSTEM", "UX", "OTHER").contains(request.category()) && !content)
            throw new IllegalArgumentException("Loại phản hồi không hợp lệ.");
        Long lessonId = request.lessonId();
        Long questionId = request.questionId();
        if (!content && (lessonId != null || questionId != null))
            throw new IllegalArgumentException("Phản hồi kỹ thuật không cần tham chiếu học liệu.");
        if (content) {
            if ("QUESTION".equals(request.category())) {
                if (questionId == null) throw new IllegalArgumentException("Vui lòng chọn câu hỏi liên quan.");
                var rows = db.queryForList("SELECT lesson_id FROM question WHERE id = ? AND status = 'ACTIVE'", questionId);
                if (rows.isEmpty() || rows.getFirst().get("lesson_id") == null) throw invalidReference();
                long parent = ((Number) rows.getFirst().get("lesson_id")).longValue();
                if (lessonId != null && lessonId != parent) throw invalidReference();
                lessonId = parent;
            } else if (questionId != null) throw invalidReference();
            if (lessonId == null || db.queryForObject("""
                SELECT COUNT(*) FROM lesson l JOIN chapter ch ON ch.id=l.chapter_id
                JOIN course c ON c.id=ch.course_id WHERE l.id=? AND l.status='PUBLISHED'
                AND ch.status='PUBLISHED' AND c.status='PUBLISHED'
                """, Integer.class, lessonId) == 0) throw invalidReference();
        }
        validateImage(image);
        Map<?, ?> uploaded = null;
        if (image != null && !image.isEmpty()) {
            try {
                uploaded = cloudinary.uploader().upload(image.getBytes(), Map.of("folder", "jtech/feedback", "resource_type", "image"));
            } catch (Exception ex) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Lỗi tải ảnh lên đám mây. Vui lòng thử lại.");
            }
            String publicId = Objects.toString(uploaded.get("public_id"), null);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED && publicId != null) {
                        try { cloudinary.uploader().destroy(publicId, Map.of("resource_type", "image")); }
                        catch (Exception ex) { LoggerFactory.getLogger(FeedbackService.class).warn("Không thể dọn ảnh feedback {}", publicId, ex); }
                    }
                }
            });
        }
        String url = uploaded == null ? null : Objects.toString(uploaded.get("secure_url"), null);
        String publicId = uploaded == null ? null : Objects.toString(uploaded.get("public_id"), null);
        Long finalLessonId = lessonId;
        GeneratedKeyHolder key = new GeneratedKeyHolder();
        db.update(connection -> {
            var stmt = connection.prepareStatement("""
                INSERT INTO feedback(user_id,feedback_type,category,title,content,lesson_id,question_id,attachment_url,attachment_public_id)
                VALUES (?,?,?,?,?,?,?,?,?)
                """, Statement.RETURN_GENERATED_KEYS);
            Object[] values = {user.getUserId(), request.feedbackType().name(), request.category(), request.title().trim(),
                request.content().trim(), finalLessonId, questionId, url, publicId};
            for (int i = 0; i < values.length; i++) stmt.setObject(i + 1, values[i]);
            return stmt;
        }, key);
        return detail(key.getKey().longValue(), user.getUserId(), null);
    }

    void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) return;
        if (file.getSize() > 3 * 1024 * 1024 || !Set.of("image/jpeg", "image/png", "image/webp").contains(Objects.toString(file.getContentType(), "")))
            throw new IllegalArgumentException("Ảnh phải thuộc định dạng JPG, PNG, WEBP và không quá 3MB.");
        try {
            byte[] bytes = file.getBytes();
            boolean jpeg = bytes.length >= 3 && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255;
            boolean png = bytes.length >= 8 && Arrays.equals(Arrays.copyOf(bytes, 8), new byte[]{(byte)137,80,78,71,13,10,26,10});
            boolean webp = bytes.length >= 12 && new String(bytes, 0, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF")
                && new String(bytes, 8, 4, java.nio.charset.StandardCharsets.US_ASCII).equals("WEBP");
            if (!(jpeg && file.getContentType().equals("image/jpeg") || png && file.getContentType().equals("image/png") || webp && file.getContentType().equals("image/webp")))
                throw new IllegalArgumentException("Nội dung tệp ảnh không hợp lệ.");
        } catch (java.io.IOException ex) { throw new IllegalArgumentException("Không đọc được tệp ảnh."); }
    }

    public Map<String, Object> list(Long userId, String type, String status, String search, Long courseId, Long lessonId, int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("Phân trang không hợp lệ.");
        if (status != null && !Set.of("PENDING", "IN_PROGRESS", "RESOLVED", "REJECTED").contains(status))
            throw new IllegalArgumentException("Trạng thái không hợp lệ.");
        StringBuilder where = new StringBuilder(" WHERE 1=1");
        List<Object> args = new ArrayList<>();
        if (userId != null) { where.append(" AND f.user_id=?"); args.add(userId); }
        if (type != null) { where.append(" AND f.feedback_type=?"); args.add(type); }
        if (status != null) { where.append(" AND f.status=?"); args.add(status); }
        if (courseId != null) { where.append(" AND c.id=?"); args.add(courseId); }
        if (lessonId != null) { where.append(" AND f.lesson_id=?"); args.add(lessonId); }
        if (search != null && !search.isBlank()) {
            if (search.length() > 200) throw new IllegalArgumentException("Từ khóa quá dài.");
            where.append(" AND (LOCATE(LOWER(?),LOWER(CONCAT_WS(' ',f.id,f.title,f.content,u.full_name,u.email,c.code,f.lesson_id,f.question_id)))>0)");
            args.add(search.trim());
        }
        Long total = db.queryForObject("SELECT COUNT(*) FROM (" + SELECT + where + ") counted", Long.class, args.toArray());
        args.add(size); args.add((long) page * size);
        return Map.of("content", db.queryForList(SELECT + where + " ORDER BY (f.status='PENDING') DESC,f.created_at DESC,f.id DESC LIMIT ? OFFSET ?", args.toArray()),
            "totalElements", total, "page", page, "size", size);
    }

    public Map<String, Object> detail(long id, Long userId, String type) {
        List<Object> args = new ArrayList<>(List.of(id));
        String where = " WHERE f.id=?";
        if (userId != null) { where += " AND f.user_id=?"; args.add(userId); }
        if (type != null) { where += " AND f.feedback_type=?"; args.add(type); }
        var rows = db.queryForList(SELECT + where, args.toArray());
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phản hồi.");
        return rows.getFirst();
    }

    @Transactional
    public Map<String, Object> resolve(long id, String type, User handler, FeedbackResolutionRequest request) {
        var locked = db.queryForList("SELECT id FROM feedback WHERE id=? AND feedback_type=? FOR UPDATE", id, type);
        if (locked.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy phản hồi.");
        String note = request.resolutionNote() == null ? "" : request.resolutionNote().trim();
        boolean terminal = request.status() != FeedbackResolutionRequest.Status.IN_PROGRESS;
        if (terminal && note.isEmpty()) throw new IllegalArgumentException("Không được để trống ghi chú xử lý.");
        db.update("UPDATE feedback SET status=?,resolution_note=?,handled_by=?,resolved_at=IF(?,CURRENT_TIMESTAMP,NULL),updated_at=CURRENT_TIMESTAMP WHERE id=?",
            request.status().name(), note, handler.getUserId(), terminal, id);
        var ticket = detail(id, null, type);
        String label = switch(request.status()) { case IN_PROGRESS -> "Đang xử lý"; case RESOLVED -> "Đã xử lý"; case REJECTED -> "Từ chối"; };
        String message = "Phản hồi #" + id + ": " + label + (note.isEmpty() ? "" : ". " + note);
        db.update("""
            INSERT INTO notification(user_id,type,title,content,link_url)
            SELECT user_id,'FEEDBACK',?, ?, ? FROM feedback WHERE id=?
            """, "Cập nhật tiến độ xử lý phản hồi", message.substring(0, Math.min(1000, message.length())), "/feedback?id=" + id, id);
        events.publishEvent(new FeedbackMailService.ResolutionMail((String) ticket.get("submitterEmail"), id, (String) ticket.get("title"), label, note));
        return ticket;
    }

    public List<Map<String, Object>> references() {
        return db.queryForList("""
            SELECT l.id, l.title, l.skill_type AS skillType, ch.title AS chapterTitle, c.name AS courseName, c.id AS courseId
            FROM lesson l JOIN chapter ch ON ch.id=l.chapter_id JOIN course c ON c.id=ch.course_id
            WHERE l.status='PUBLISHED' AND ch.status='PUBLISHED' AND c.status='PUBLISHED'
            ORDER BY c.display_order,ch.display_order,l.display_order,l.id
            """);
    }

    private IllegalArgumentException invalidReference() { return new IllegalArgumentException("Học liệu hoặc câu hỏi liên quan không tồn tại hoặc chưa được xuất bản."); }
}

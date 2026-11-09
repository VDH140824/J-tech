package com.jtech.service;

import com.jtech.dto.request.PostRequest;
import com.jtech.dto.response.PostResponse;
import com.jtech.entity.ClassPost;
import com.jtech.entity.Classroom;
import com.jtech.entity.ClassroomStatus;
import com.jtech.entity.Role;
import com.jtech.entity.User;
import com.jtech.entity.UserStatus;
import com.jtech.repository.ClassRepository;
import com.jtech.repository.PostRepository;
import com.jtech.repository.UserRepository;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import jakarta.persistence.EntityManager;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;

class PostServiceTest {
    private static final Long CLASS_ID = 10L;
    private static final Long MODERATOR_ID = 7L;
    private static final Long POST_ID = 20L;
    private static final String EMAIL = "moderator@example.com";

    private PostService service;
    private Optional<User> account;
    private Optional<Classroom> classroom;
    private Optional<ClassPost> existingPost;
    private List<Object[]> postRows;
    private int accountLookups;
    private int classroomLookups;
    private int postLookups;
    private int postFindCalls;
    private int saveCalls;
    private ClassPost savedPost;
    private RuntimeException saveFailure;
    private List<Object[]> commentAudioRows;
    private List<List<Long>> leafCommentBatches;
    private List<String> deleteOperations;
    private int deletedCommentBatches;
    private int commentCountCalls;
    private String deleteFailureAt;
    private RuntimeException deleteFailure;
    private PostCloudinaryStub cloudinary;

    @BeforeEach
    void setUp() {
        account = Optional.of(user(UserStatus.ACTIVE, "MODERATOR"));
        classroom = Optional.of(classroom(ClassroomStatus.ACTIVE, MODERATOR_ID));
        existingPost = Optional.of(existingPost());
        postRows = List.of();
        commentAudioRows = List.of();
        leafCommentBatches = List.of();
        deleteOperations = new ArrayList<>();
        TransactionSynchronizationManager.initSynchronization();

        UserRepository userRepository = stub(UserRepository.class, (proxy, method, args) -> {
            if (method.getName().equals("findByEmail")) {
                assertEquals(EMAIL, args[0]);
                accountLookups++;
                return account;
            }
            if (method.getName().equals("findById")) {
                assertEquals(MODERATOR_ID, args[0]);
                return account;
            }
            throw new AssertionError("Unexpected user repository call: " + method.getName());
        });
        ClassRepository classRepository = stub(ClassRepository.class, (proxy, method, args) -> {
            if (!method.getName().equals("findById")) throw new AssertionError("Unexpected class repository call");
            assertEquals(CLASS_ID, args[0]);
            classroomLookups++;
            return classroom;
        });
        PostRepository postRepository = stub(PostRepository.class, (proxy, method, args) -> {
            if (method.getName().equals("saveAndFlush")) {
                saveCalls++;
                if (saveFailure != null) throw saveFailure;
                savedPost = (ClassPost) args[0];
                if (savedPost.getId() == null) {
                    savedPost.setId(80L);
                    savedPost.setCreatedAt(LocalDateTime.of(2026, 11, 9, 10, 0));
                }
                return savedPost;
            }
            if (method.getName().equals("findByIdAndClassroomId")) {
                assertEquals(POST_ID, args[0]);
                assertEquals(CLASS_ID, args[1]);
                postFindCalls++;
                return existingPost;
            }
            if (method.getName().equals("findCommentAudioAssets")) {
                assertEquals(POST_ID, args[0]);
                return commentAudioRows;
            }
            if (method.getName().equals("countCommentsByPostId")) {
                assertEquals(POST_ID, args[0]);
                commentCountCalls++;
                return deletedCommentBatches < leafCommentBatches.size()
                        ? (long) leafCommentBatches.get(deletedCommentBatches).size() : 0L;
            }
            if (method.getName().equals("findLeafCommentIds")) {
                assertEquals(POST_ID, args[0]);
                return leafCommentBatches.get(deletedCommentBatches);
            }
            if (method.getName().equals("deleteCommentIds")) {
                if (method.getName().equals(deleteFailureAt)) throw deleteFailure;
                assertEquals(leafCommentBatches.get(deletedCommentBatches), args[0]);
                deleteOperations.add("comments:" + args[0]);
                deletedCommentBatches++;
                return ((List<?>) args[0]).size();
            }
            if (method.getName().equals("delete")) {
                if (method.getName().equals(deleteFailureAt)) throw deleteFailure;
                assertSame(existingPost.orElseThrow(), args[0]);
                deleteOperations.add("post");
                return null;
            }
            if (method.getName().equals("flush")) {
                if (method.getName().equals(deleteFailureAt)) throw deleteFailure;
                deleteOperations.add("flush");
                return null;
            }
            if (!method.getName().equals("findByClassroomOrderByCreatedAtDesc"))
                throw new AssertionError("Unexpected post repository call: " + method.getName());
            assertEquals(CLASS_ID, args[0]);
            postLookups++;
            return postRows;
        });
        EntityManager entityManager = stub(EntityManager.class, (proxy, method, args) -> {
            if (!method.getName().equals("refresh")) throw new AssertionError("Unexpected entity manager call");
            return null;
        });
        cloudinary = new PostCloudinaryStub();
        service = new PostService(postRepository, classRepository, userRepository,
                cloudinary, entityManager);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, "unused",
                        List.of(new SimpleGrantedAuthority("ROLE_MODERATOR"))));
    }

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.clearSynchronization();
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("UTCID01: View posts in an active classroom")
    void viewActiveClassroomPosts() {
        postRows = List.of(postRow(22L), postRow(21L));

        List<PostResponse> result = service.getPostsByClass(CLASS_ID);

        assertEquals(List.of(22L, 21L), result.stream().map(PostResponse::id).toList());
        assertEquals(CLASS_ID, result.get(0).classroomId());
        assertEquals(1, postLookups);
    }

    @Test
    @DisplayName("UTCID02: View posts in an archived classroom")
    void viewArchivedClassroomPosts() {
        classroom = Optional.of(classroom(ClassroomStatus.ARCHIVED, MODERATOR_ID));
        postRows = List.<Object[]>of(postRow(22L));

        List<PostResponse> result = service.getPostsByClass(CLASS_ID);

        assertEquals(1, result.size());
        assertEquals(22L, result.get(0).id());
    }

    @Test
    @DisplayName("UTCID03: Return an empty list when the classroom has no posts")
    void viewEmptyClassroomPosts() {
        assertTrue(service.getPostsByClass(CLASS_ID).isEmpty());
        assertEquals(1, postLookups);
    }

    @Test
    @DisplayName("UTCID04: Reject missing or unauthenticated sessions")
    void rejectUnauthenticatedSession() {
        SecurityContextHolder.clearContext();
        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> service.getPostsByClass(CLASS_ID));

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, "unused"));
        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> service.getPostsByClass(CLASS_ID));
        assertEquals(0, accountLookups);
        assertEquals(0, classroomLookups);
        assertEquals(0, postLookups);
    }

    @Test
    @DisplayName("UTCID05: Reject an account that does not exist")
    void rejectMissingAccount() {
        account = Optional.empty();

        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> service.getPostsByClass(CLASS_ID));
        assertEquals(0, classroomLookups);
        assertEquals(0, postLookups);
    }

    @Test
    @DisplayName("UTCID06: Reject inactive accounts and non-moderators")
    void rejectInactiveOrNonModeratorAccount() {
        for (User candidate : List.of(user(UserStatus.PENDING, "MODERATOR"),
                user(UserStatus.REJECTED, "MODERATOR"),
                user(UserStatus.LOCKED, "MODERATOR"),
                user(UserStatus.ACTIVE, "STUDENT"),
                user(UserStatus.ACTIVE, null))) {
            account = Optional.of(candidate);
            assertThrows(AccessDeniedException.class, () -> service.getPostsByClass(CLASS_ID));
        }
        assertEquals(0, classroomLookups);
        assertEquals(0, postLookups);
    }

    @Test
    @DisplayName("UTCID07: Reject a classroom assigned to another moderator")
    void rejectAnotherModeratorsClassroom() {
        classroom = Optional.of(classroom(ClassroomStatus.ACTIVE, 99L));

        assertThrows(AccessDeniedException.class, () -> service.getPostsByClass(CLASS_ID));
        assertEquals(0, postLookups);
    }

    @Test
    @DisplayName("UTCID08: Reject posts in a closed classroom")
    void rejectClosedClassroom() {
        classroom = Optional.of(classroom(ClassroomStatus.CLOSED, MODERATOR_ID));

        assertThrows(AccessDeniedException.class, () -> service.getPostsByClass(CLASS_ID));
        assertEquals(0, postLookups);
    }

    @Test
    @DisplayName("UTCID09: Create a valid post without attachment or due date")
    void createValidPost() {
        PostResponse result = service.createPost(CLASS_ID, request("ANNOUNCEMENT", "Tiêu đề", "Nội dung", null), null);

        assertEquals(80L, result.id());
        assertEquals(CLASS_ID, savedPost.getClassroomId());
        assertEquals(MODERATOR_ID, savedPost.getAuthorId());
        assertEquals("Tiêu đề", savedPost.getTitle());
        assertEquals("Nội dung", savedPost.getContent());
        assertNull(savedPost.getDueAt());
        assertNull(savedPost.getAttachmentUrl());
        assertEquals(1, saveCalls);
        assertEquals(0, cloudinary.uploadCalls);
    }

    @Test
    @DisplayName("UTCID10: Accept exactly 200 characters in title and content")
    void createAcceptsMaximumTextLength() {
        service.createPost(CLASS_ID, request("ANNOUNCEMENT", "T".repeat(200), "N".repeat(200), null), null);

        assertEquals(200, savedPost.getTitle().length());
        assertEquals(200, savedPost.getContent().length());
    }

    @Test
    @DisplayName("UTCID11: Reject a title longer than 200 characters")
    void createRejectsLongTitle() {
        assertThrows(IllegalArgumentException.class,
                () -> service.createPost(CLASS_ID, request("ANNOUNCEMENT", "T".repeat(201), "Nội dung", null), null));
        assertEquals(0, saveCalls);
        assertEquals(0, cloudinary.uploadCalls);
    }

    @Test
    @DisplayName("UTCID12: Reject content longer than 200 characters")
    void createRejectsLongContent() {
        assertThrows(IllegalArgumentException.class,
                () -> service.createPost(CLASS_ID, request("ANNOUNCEMENT", "Tiêu đề", "N".repeat(201), null), null));
        assertEquals(0, saveCalls);
        assertEquals(0, cloudinary.uploadCalls);
    }

    @Test
    @DisplayName("UTCID13: Reject null empty and blank mandatory text")
    void createRejectsMissingMandatoryText() {
        for (String invalid : new String[] { null, "", "   " }) {
            assertThrows(IllegalArgumentException.class,
                    () -> service.createPost(CLASS_ID, request("ANNOUNCEMENT", invalid, "Nội dung", null), null));
            assertThrows(IllegalArgumentException.class,
                    () -> service.createPost(CLASS_ID, request("ANNOUNCEMENT", "Tiêu đề", invalid, null), null));
        }
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID14: Trim mandatory text before applying the 200-character limit")
    void createTrimsTextBeforeValidation() {
        service.createPost(CLASS_ID,
                request("ANNOUNCEMENT", "  " + "T".repeat(200) + "  ", "  " + "N".repeat(200) + "  ", null), null);

        assertEquals("T".repeat(200), savedPost.getTitle());
        assertEquals("N".repeat(200), savedPost.getContent());
    }

    @Test
    @DisplayName("UTCID15: Reject a missing or unsupported post type")
    void createRejectsInvalidPostType() {
        for (String invalid : new String[] { null, "", "OTHER" }) {
            assertThrows(IllegalArgumentException.class,
                    () -> service.createPost(CLASS_ID, request(invalid, "Tiêu đề", "Nội dung", null), null));
        }
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID16: Create an assignment without a due date")
    void createAssignmentWithoutDueDate() {
        PostResponse result = service.createPost(CLASS_ID, request("ASSIGNMENT", "Bài tập", "Nội dung", null), null);

        assertNull(result.dueAt());
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID17: Accept a future due date and reject a past due date")
    void createValidatesDueDate() {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDateTime future = now.plusDays(1);
        LocalDateTime past = now.minusDays(1);

        service.createPost(CLASS_ID, request("ASSIGNMENT", "Bài tập", "Nội dung", future), null);
        assertEquals(future, savedPost.getDueAt());
        assertThrows(IllegalArgumentException.class,
                () -> service.createPost(CLASS_ID, request("ASSIGNMENT", "Bài tập", "Nội dung", past), null));
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID18: Upload a valid attachment and save its Cloudinary identifiers")
    void createWithAttachment() {
        PostResponse result = service.createPost(CLASS_ID, request("ANNOUNCEMENT", "Tiêu đề", "Nội dung", null), file());

        assertEquals(1, cloudinary.uploadCalls);
        assertEquals("https://res.cloudinary.com/example/video/upload/new.mp3", savedPost.getAttachmentUrl());
        assertEquals("Jtech/Moderator/Classroom/Post/new", savedPost.getAttachmentPublicId());
        assertEquals(savedPost.getAttachmentUrl(), result.attachmentUrl());
    }

    @Test
    @DisplayName("UTCID19: Do not save a post when attachment upload fails")
    void createStopsAfterUploadFailure() {
        cloudinary.uploadFailure = new IllegalStateException("Upload failed");

        assertSame(cloudinary.uploadFailure, assertThrows(IllegalStateException.class,
                () -> service.createPost(CLASS_ID, request("ANNOUNCEMENT", "Tiêu đề", "Nội dung", null), file())));
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID20: Reject unauthorized users and non-active classrooms before uploading")
    void createRejectsUnauthorizedAccess() {
        SecurityContextHolder.clearContext();
        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> service.createPost(CLASS_ID, request("ANNOUNCEMENT", "Tiêu đề", "Nội dung", null), file()));
        authenticateModerator();

        account = Optional.of(user(UserStatus.ACTIVE, "STUDENT"));
        assertThrows(AccessDeniedException.class,
                () -> service.createPost(CLASS_ID, request("ANNOUNCEMENT", "Tiêu đề", "Nội dung", null), file()));
        account = Optional.of(user(UserStatus.ACTIVE, "MODERATOR"));

        classroom = Optional.of(classroom(ClassroomStatus.ACTIVE, 99L));
        assertThrows(AccessDeniedException.class,
                () -> service.createPost(CLASS_ID, request("ANNOUNCEMENT", "Tiêu đề", "Nội dung", null), file()));
        classroom = Optional.of(classroom(ClassroomStatus.ARCHIVED, MODERATOR_ID));
        assertThrows(AccessDeniedException.class,
                () -> service.createPost(CLASS_ID, request("ANNOUNCEMENT", "Tiêu đề", "Nội dung", null), file()));
        classroom = Optional.of(classroom(ClassroomStatus.CLOSED, MODERATOR_ID));
        assertThrows(AccessDeniedException.class,
                () -> service.createPost(CLASS_ID, request("ANNOUNCEMENT", "Tiêu đề", "Nội dung", null), file()));

        assertEquals(0, cloudinary.uploadCalls);
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID21: Remove a newly uploaded attachment when saving the post fails")
    void createCleansAttachmentAfterSaveFailure() {
        saveFailure = new IllegalStateException("Database failed");

        assertSame(saveFailure, assertThrows(IllegalStateException.class,
                () -> service.createPost(CLASS_ID, request("ANNOUNCEMENT", "Tiêu đề", "Nội dung", null), file())));
        assertEquals(1, cloudinary.uploadCalls);
        assertEquals(List.of("Jtech/Moderator/Classroom/Post/new|video"), cloudinary.deletedAssets);
    }

    @Test
    @DisplayName("UTCID22: Update title and content while retaining the existing attachment")
    void updateTextWithoutChangingAttachment() {
        PostResponse result = service.updatePost(CLASS_ID, POST_ID,
                request("ANNOUNCEMENT", "Tiêu đề mới", "Nội dung mới", null), null);

        assertEquals(POST_ID, result.id());
        assertEquals("Tiêu đề mới", savedPost.getTitle());
        assertEquals("Nội dung mới", savedPost.getContent());
        assertEquals("https://res.cloudinary.com/example/video/upload/old.mp3", savedPost.getAttachmentUrl());
        assertEquals("Jtech/Moderator/Classroom/Post/old", savedPost.getAttachmentPublicId());
        assertEquals(1, postFindCalls);
        assertEquals(1, saveCalls);
        assertEquals(0, cloudinary.uploadCalls);
        assertTrue(cloudinary.deletedAssets.isEmpty());
    }

    @Test
    @DisplayName("UTCID23: Accept exactly 200 characters in an updated title and content")
    void updateAcceptsMaximumTextLength() {
        service.updatePost(CLASS_ID, POST_ID,
                request("ANNOUNCEMENT", "T".repeat(200), "N".repeat(200), null), null);

        assertEquals(200, savedPost.getTitle().length());
        assertEquals(200, savedPost.getContent().length());
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID24: Reject an updated title longer than 200 characters")
    void updateRejectsLongTitle() {
        assertThrows(IllegalArgumentException.class,
                () -> service.updatePost(CLASS_ID, POST_ID,
                        request("ANNOUNCEMENT", "T".repeat(201), "Nội dung", null), file()));

        assertEquals(0, saveCalls);
        assertEquals(0, cloudinary.uploadCalls);
    }

    @Test
    @DisplayName("UTCID25: Reject updated content longer than 200 characters")
    void updateRejectsLongContent() {
        assertThrows(IllegalArgumentException.class,
                () -> service.updatePost(CLASS_ID, POST_ID,
                        request("ANNOUNCEMENT", "Tiêu đề", "N".repeat(201), null), file()));

        assertEquals(0, saveCalls);
        assertEquals(0, cloudinary.uploadCalls);
    }

    @Test
    @DisplayName("UTCID26: Reject null empty and blank mandatory text during update")
    void updateRejectsMissingMandatoryText() {
        for (String invalid : new String[] { null, "", "   " }) {
            assertThrows(IllegalArgumentException.class,
                    () -> service.updatePost(CLASS_ID, POST_ID,
                            request("ANNOUNCEMENT", invalid, "Nội dung", null), file()));
            assertThrows(IllegalArgumentException.class,
                    () -> service.updatePost(CLASS_ID, POST_ID,
                            request("ANNOUNCEMENT", "Tiêu đề", invalid, null), file()));
        }

        assertEquals(0, saveCalls);
        assertEquals(0, cloudinary.uploadCalls);
    }

    @Test
    @DisplayName("UTCID27: Trim updated text before applying the 200-character limit")
    void updateTrimsTextBeforeValidation() {
        service.updatePost(CLASS_ID, POST_ID,
                request("ANNOUNCEMENT", "  " + "T".repeat(200) + "  ",
                        "  " + "N".repeat(200) + "  ", null), null);

        assertEquals("T".repeat(200), savedPost.getTitle());
        assertEquals("N".repeat(200), savedPost.getContent());
    }

    @Test
    @DisplayName("UTCID28: Allow an assignment without a due date during update")
    void updateAssignmentWithoutDueDate() {
        PostResponse result = service.updatePost(CLASS_ID, POST_ID,
                request("ASSIGNMENT", "Bài tập", "Nội dung", null), null);

        assertNull(savedPost.getDueAt());
        assertNull(result.dueAt());
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID29: Accept a changed future due date and reject a past one")
    void updateValidatesChangedDueDate() {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDateTime future = now.plusDays(1);
        LocalDateTime past = now.minusDays(1);

        service.updatePost(CLASS_ID, POST_ID,
                request("ASSIGNMENT", "Bài tập", "Nội dung", future), null);
        assertEquals(future, savedPost.getDueAt());
        assertThrows(IllegalArgumentException.class,
                () -> service.updatePost(CLASS_ID, POST_ID,
                        request("ASSIGNMENT", "Bài tập", "Nội dung", past), null));
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID30: Keep an unchanged past due date when editing other fields")
    void updateKeepsUnchangedPastDueDate() {
        LocalDateTime oldDueAt = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(1);
        existingPost.orElseThrow().setDueAt(oldDueAt);

        service.updatePost(CLASS_ID, POST_ID,
                request("ASSIGNMENT", "Tiêu đề mới", "Nội dung mới", oldDueAt), null);

        assertEquals(oldDueAt, savedPost.getDueAt());
        assertEquals("Nội dung mới", savedPost.getContent());
        assertEquals(1, saveCalls);
    }

    @Test
    @DisplayName("UTCID31: Replace an attachment and delete the old asset after commit")
    void updateReplacesAttachmentAfterCommit() {
        PostResponse result = service.updatePost(CLASS_ID, POST_ID,
                request("ANNOUNCEMENT", "Tiêu đề mới", "Nội dung mới", null), file());

        assertEquals(1, cloudinary.uploadCalls);
        assertEquals(1, saveCalls);
        assertEquals("https://res.cloudinary.com/example/video/upload/new.mp3", savedPost.getAttachmentUrl());
        assertEquals("Jtech/Moderator/Classroom/Post/new", savedPost.getAttachmentPublicId());
        assertEquals(savedPost.getAttachmentUrl(), result.attachmentUrl());
        assertTrue(cloudinary.deletedAssets.isEmpty());

        completeTransaction(TransactionSynchronization.STATUS_COMMITTED);
        assertEquals(List.of("old|Jtech/Moderator/Classroom/Post/old"), cloudinary.deletedAssets);
    }

    @Test
    @DisplayName("UTCID32: Keep the old attachment and skip saving when upload fails")
    void updateStopsAfterUploadFailure() {
        cloudinary.uploadFailure = new IllegalStateException("Upload failed");

        assertSame(cloudinary.uploadFailure, assertThrows(IllegalStateException.class,
                () -> service.updatePost(CLASS_ID, POST_ID,
                        request("ANNOUNCEMENT", "Tiêu đề mới", "Nội dung mới", null), file())));
        assertEquals(0, saveCalls);
        assertEquals("Jtech/Moderator/Classroom/Post/old", existingPost.orElseThrow().getAttachmentPublicId());
        assertTrue(cloudinary.deletedAssets.isEmpty());
    }

    @Test
    @DisplayName("UTCID33: Delete the new attachment after a database rollback")
    void updateCleansNewAttachmentAfterSaveFailure() {
        saveFailure = new IllegalStateException("Database failed");

        assertSame(saveFailure, assertThrows(IllegalStateException.class,
                () -> service.updatePost(CLASS_ID, POST_ID,
                        request("ANNOUNCEMENT", "Tiêu đề mới", "Nội dung mới", null), file())));
        assertEquals(1, cloudinary.uploadCalls);
        assertEquals(1, saveCalls);
        assertTrue(cloudinary.deletedAssets.isEmpty());

        completeTransaction(TransactionSynchronization.STATUS_ROLLED_BACK);
        assertEquals(List.of("Jtech/Moderator/Classroom/Post/new|video"), cloudinary.deletedAssets);
    }

    @Test
    @DisplayName("UTCID34: Reject unauthorized updates and non-active classrooms before upload")
    void updateRejectsUnauthorizedAccess() {
        PostRequest request = request("ANNOUNCEMENT", "Tiêu đề mới", "Nội dung mới", null);
        SecurityContextHolder.clearContext();
        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> service.updatePost(CLASS_ID, POST_ID, request, file()));
        authenticateModerator();

        account = Optional.of(user(UserStatus.ACTIVE, "STUDENT"));
        assertThrows(AccessDeniedException.class,
                () -> service.updatePost(CLASS_ID, POST_ID, request, file()));
        account = Optional.of(user(UserStatus.ACTIVE, "MODERATOR"));

        classroom = Optional.of(classroom(ClassroomStatus.ACTIVE, 99L));
        assertThrows(AccessDeniedException.class,
                () -> service.updatePost(CLASS_ID, POST_ID, request, file()));
        classroom = Optional.of(classroom(ClassroomStatus.ARCHIVED, MODERATOR_ID));
        assertThrows(AccessDeniedException.class,
                () -> service.updatePost(CLASS_ID, POST_ID, request, file()));
        classroom = Optional.of(classroom(ClassroomStatus.CLOSED, MODERATOR_ID));
        assertThrows(AccessDeniedException.class,
                () -> service.updatePost(CLASS_ID, POST_ID, request, file()));

        assertEquals(0, postFindCalls);
        assertEquals(0, cloudinary.uploadCalls);
        assertEquals(0, saveCalls);
    }

    @Test
    @DisplayName("UTCID35: Delete a post without comments or attachments")
    void deletePostWithoutCommentsOrAttachments() {
        existingPost.orElseThrow().setAttachmentPublicId(null);
        existingPost.orElseThrow().setAttachmentUrl(null);

        service.deletePost(CLASS_ID, POST_ID);

        assertEquals(List.of("post", "flush"), deleteOperations);
        assertEquals(1, postFindCalls);
        assertEquals(1, commentCountCalls);
        completeTransaction(TransactionSynchronization.STATUS_COMMITTED);
        assertTrue(cloudinary.deletedAssets.isEmpty());
    }

    @Test
    @DisplayName("UTCID36: Delete nested comments from child to parent before deleting the post")
    void deleteNestedCommentsBeforePost() {
        leafCommentBatches = List.of(List.of(13L), List.of(12L), List.of(11L));

        service.deletePost(CLASS_ID, POST_ID);

        assertEquals(List.of("comments:[13]", "comments:[12]", "comments:[11]", "post", "flush"),
                deleteOperations);
        assertEquals(4, commentCountCalls);
    }

    @Test
    @DisplayName("UTCID37: Delete more than 500 comments in multiple batches")
    void deleteMoreThanFiveHundredComments() {
        List<Long> firstBatch = new ArrayList<>();
        for (long id = 1; id <= 500; id++) firstBatch.add(id);
        leafCommentBatches = List.of(firstBatch, List.of(501L));

        service.deletePost(CLASS_ID, POST_ID);

        assertEquals(2, deletedCommentBatches);
        assertEquals(3, commentCountCalls);
        assertEquals(4, deleteOperations.size());
        assertEquals("comments:[501]", deleteOperations.get(1));
        assertEquals(List.of("post", "flush"), deleteOperations.subList(2, 4));
    }

    @Test
    @DisplayName("UTCID38: Delete post attachment and comment audio only after commit")
    void deleteCloudinaryAssetsAfterCommit() {
        commentAudioRows = List.<Object[]>of(
                new Object[] { "Jtech/Moderator/Classroom/Post/comment-1",
                        "https://res.cloudinary.com/example/video/upload/comment-1.mp3" },
                new Object[] { "Jtech/Moderator/Classroom/Post/comment-2",
                        "https://res.cloudinary.com/example/video/upload/comment-2.mp3" });
        leafCommentBatches = List.of(List.of(31L, 32L));

        service.deletePost(CLASS_ID, POST_ID);

        assertTrue(cloudinary.deletedAssets.isEmpty());
        assertEquals(List.of("comments:[31, 32]", "post", "flush"), deleteOperations);
        completeTransaction(TransactionSynchronization.STATUS_COMMITTED);
        assertEquals(List.of("old|Jtech/Moderator/Classroom/Post/old",
                "audio|Jtech/Moderator/Classroom/Post/comment-1",
                "audio|Jtech/Moderator/Classroom/Post/comment-2"), cloudinary.deletedAssets);
    }

    @Test
    @DisplayName("UTCID39: Keep Cloudinary assets when post deletion rolls back")
    void deleteKeepsAssetsAfterRollback() {
        commentAudioRows = List.<Object[]>of(new Object[] { "comment-audio",
                "https://res.cloudinary.com/example/video/upload/comment.mp3" });
        leafCommentBatches = List.of(List.of(31L));

        service.deletePost(CLASS_ID, POST_ID);
        completeTransaction(TransactionSynchronization.STATUS_ROLLED_BACK);

        assertEquals(List.of("comments:[31]", "post", "flush"), deleteOperations);
        assertTrue(cloudinary.deletedAssets.isEmpty());
    }

    @Test
    @DisplayName("UTCID40: Reject unauthenticated unauthorized and unassigned moderators before deletion")
    void deleteRejectsUnauthorizedAccess() {
        SecurityContextHolder.clearContext();
        assertThrows(AuthenticationCredentialsNotFoundException.class,
                () -> service.deletePost(CLASS_ID, POST_ID));
        authenticateModerator();

        account = Optional.of(user(UserStatus.ACTIVE, "STUDENT"));
        assertThrows(AccessDeniedException.class, () -> service.deletePost(CLASS_ID, POST_ID));
        account = Optional.of(user(UserStatus.ACTIVE, "MODERATOR"));

        classroom = Optional.of(classroom(ClassroomStatus.ACTIVE, 99L));
        assertThrows(AccessDeniedException.class, () -> service.deletePost(CLASS_ID, POST_ID));

        assertEquals(0, postFindCalls);
        assertTrue(deleteOperations.isEmpty());
        assertTrue(cloudinary.deletedAssets.isEmpty());
    }

    @Test
    @DisplayName("UTCID41: Reject deletion in archived and closed classrooms")
    void deleteRejectsNonActiveClassrooms() {
        for (ClassroomStatus status : List.of(ClassroomStatus.ARCHIVED, ClassroomStatus.CLOSED)) {
            classroom = Optional.of(classroom(status, MODERATOR_ID));
            assertThrows(AccessDeniedException.class, () -> service.deletePost(CLASS_ID, POST_ID));
        }

        assertEquals(0, postFindCalls);
        assertTrue(deleteOperations.isEmpty());
        assertTrue(cloudinary.deletedAssets.isEmpty());
    }

    @Test
    @DisplayName("UTCID42: Propagate database deletion failures without removing Cloudinary assets")
    void deleteDatabaseFailureKeepsAssets() {
        leafCommentBatches = List.of(List.of(31L));
        commentAudioRows = List.<Object[]>of(new Object[] { "comment-audio",
                "https://res.cloudinary.com/example/video/upload/comment.mp3" });
        deleteFailure = new IllegalStateException("Database failed");

        for (String failingOperation : List.of("deleteCommentIds", "delete", "flush")) {
            deletedCommentBatches = 0;
            deleteOperations.clear();
            deleteFailureAt = failingOperation;
            assertSame(deleteFailure, assertThrows(IllegalStateException.class,
                    () -> service.deletePost(CLASS_ID, POST_ID)));
            completeTransaction(TransactionSynchronization.STATUS_ROLLED_BACK);
            assertTrue(cloudinary.deletedAssets.isEmpty());
        }
    }

    @Test
    @DisplayName("UTCID43: Continue cleaning comment audio when post attachment deletion fails")
    void deleteContinuesCleanupAfterCloudinaryFailure() {
        commentAudioRows = List.<Object[]>of(new Object[] { "comment-audio",
                "https://res.cloudinary.com/example/video/upload/comment.mp3" });
        cloudinary.postDeleteFailure = new IllegalStateException("Cloudinary failed");

        service.deletePost(CLASS_ID, POST_ID);
        completeTransaction(TransactionSynchronization.STATUS_COMMITTED);

        assertEquals(List.of("post", "flush"), deleteOperations);
        assertEquals(List.of("old|Jtech/Moderator/Classroom/Post/old", "audio|comment-audio"),
                cloudinary.deletedAssets);
    }

    private static void completeTransaction(int status) {
        for (TransactionSynchronization synchronization : TransactionSynchronizationManager.getSynchronizations()) {
            synchronization.afterCompletion(status);
        }
    }

    private static ClassPost existingPost() {
        ClassPost post = new ClassPost();
        post.setId(POST_ID);
        post.setClassroomId(CLASS_ID);
        post.setAuthorId(MODERATOR_ID);
        post.setTitle("Tiêu đề cũ");
        post.setContent("Nội dung cũ");
        post.setAttachmentUrl("https://res.cloudinary.com/example/video/upload/old.mp3");
        post.setAttachmentPublicId("Jtech/Moderator/Classroom/Post/old");
        post.setCreatedAt(LocalDateTime.of(2026, 11, 9, 10, 0));
        return post;
    }

    private static PostRequest request(String type, String title, String content, LocalDateTime dueAt) {
        return new PostRequest(type, title, content, dueAt);
    }

    private static MultipartFile file() {
        return new MockMultipartFile("attachment", "audio.mp3", "audio/mpeg", new byte[] { 1, 2, 3 });
    }

    private static void authenticateModerator() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(EMAIL, "unused",
                        List.of(new SimpleGrantedAuthority("ROLE_MODERATOR"))));
    }

    private static class PostCloudinaryStub extends CloudinaryService {
        int uploadCalls;
        RuntimeException uploadFailure;
        RuntimeException postDeleteFailure;
        List<String> deletedAssets = new ArrayList<>();

        PostCloudinaryStub() { super(null); }

        @Override
        public Map<String, String> uploadPostAttachment(MultipartFile attachment) {
            uploadCalls++;
            if (uploadFailure != null) throw uploadFailure;
            return Map.of("url", "https://res.cloudinary.com/example/video/upload/new.mp3",
                    "publicId", "Jtech/Moderator/Classroom/Post/new", "resourceType", "video");
        }

        @Override
        public void deletePostAttachment(String publicId, String resourceType) {
            deletedAssets.add(publicId + "|" + resourceType);
        }

        @Override
        public void deletePostAttachmentByUrl(String publicId, String url) {
            deletedAssets.add("old|" + publicId);
            if (postDeleteFailure != null) throw postDeleteFailure;
        }

        @Override
        public void deleteCommentAudioByUrl(String publicId, String url) {
            deletedAssets.add("audio|" + publicId);
        }
    }

    private static Classroom classroom(ClassroomStatus status, Long moderatorId) {
        Classroom value = new Classroom();
        value.setId(CLASS_ID);
        value.setModeratorId(moderatorId);
        value.setStatus(status);
        return value;
    }

    private static User user(UserStatus status, String roleName) {
        User value = new User();
        value.setUserId(MODERATOR_ID);
        value.setEmail(EMAIL);
        value.setStatus(status);
        if (roleName != null) value.setRole(Role.builder().roleName(roleName).build());
        return value;
    }

    private static Object[] postRow(Long id) {
        return new Object[] { id, CLASS_ID, MODERATOR_ID, "Moderator", null,
                "Bài đăng " + id, "Nội dung bài đăng", null, null,
                Timestamp.valueOf(LocalDateTime.of(2026, 11, 9, 10, 0)), 0L };
    }

    @SuppressWarnings("unchecked")
    private static <T> T stub(Class<T> type, InvocationHandler handler) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] { type }, handler);
    }
}

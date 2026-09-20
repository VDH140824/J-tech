# 🇻🇳 J-Tech Japanese Learning Website

## 1. Giới thiệu dự án

**J-Tech Japanese Learning Website** là nền tảng mạng xã hội định hướng nội dung **lịch sử Việt Nam**, nơi người dùng có thể tạo tài khoản, quản lý hồ sơ cá nhân, chia sẻ kiến thức lịch sử và tương tác với cộng đồng.

Backend hiện tại được đặt tên ứng dụng là **`jtech-backend`** và đang sử dụng lại một số phần nền tảng từ dự án cũ. Khi phát triển tiếp cần chuyển dần toàn bộ package, text hiển thị, email template và domain logic sang ngữ cảnh **J-Tech / J-Tech Japanese Learning Website**.

Phạm vi backend hiện tại:

- Đăng ký, đăng nhập và xác thực người dùng.
- JWT access token và refresh token.
- Xác minh email đăng ký.
- Quên mật khẩu / đặt lại mật khẩu.
- Đăng nhập Google OAuth2.
- Quản lý thông tin người dùng và hồ sơ cá nhân.
- Phân quyền cơ bản theo role: `ADMIN`, `MODERATOR`, `USER`.
- Lưu lịch sử đăng nhập.
- Cấu hình upload media qua Cloudinary.

Các chức năng mạng xã hội lịch sử sẽ phát triển theo từng module:

- Bài viết lịch sử, hình ảnh và tài liệu.
- Video lịch sử và feed video ngắn.
- Like, comment, reply comment.
- Theo dõi người dùng / kết bạn.
- Bookmark nội dung.
- Tìm kiếm nội dung và người dùng.
- Chủ đề lịch sử.
- Chat realtime giữa người dùng.
- Thông báo hoạt động.
- Báo cáo nội dung và kiểm duyệt.
- Admin/Moderator quản lý hệ thống.

Mục tiêu là tạo ra một **cộng đồng mạng xã hội dành riêng cho những người quan tâm, học tập, nghiên cứu và yêu thích lịch sử Việt Nam**.

---

# 2. Công nghệ sử dụng

## Backend

- **Java 21**
- **Spring Boot**
- **Maven**
- Spring Web
- Spring Security
- Spring Data JPA
- Spring Validation
- Spring OAuth2 Client
- Spring Mail
- MySQL
- Lombok
- Cloudinary Java SDK

> Ghi chú: WebSocket/chat realtime là module định hướng phát triển sau, chưa phải phạm vi chính của database hiện tại.

## Frontend

Frontend sẽ dùng React/Vite theo cấu trúc dự án hiện tại. Khi chỉnh frontend cần kiểm tra trực tiếp `package.json` để xác nhận version thư viện trước khi thay đổi.

Định hướng thư viện:

- React
- TypeScript
- Vite
- React Router
- TanStack React Query
- React Hook Form
- Zod
- Zustand
- Axios
- Tailwind CSS

## Authentication

- Spring Security
- JWT
- Refresh Token
- OAuth2
- Google Login

## Storage

- **Cloudinary** cho hình ảnh, video và thumbnail.
- Database chỉ lưu metadata và URL của file.

## Realtime

- Module realtime/chat chưa được ưu tiên trong schema hiện tại.
- Khi triển khai có thể dùng **Spring WebSocket** và **STOMP** nếu phù hợp với kiến trúc backend.

---

# 3. Kiến trúc dự án

Sử dụng kiến trúc **Monolithic** với:

```text
React Frontend
       │
       │ REST API
       ▼
Spring Boot Backend (`jtech-backend`)
       │
       ├── Controller
       ├── Service
       ├── Repository
       └── Security
       │
       ├──────────► MySQL (`jtech_learning`)
       │
       └──────────► Cloudinary
```

Không sử dụng Microservices ở giai đoạn hiện tại.

Ưu tiên kiến trúc đơn giản, dễ phát triển và dễ bảo trì.

---

# 4. Tái sử dụng code hiện tại

Dự án được phát triển dựa trên nền tảng project hiện có.

Có thể **tái sử dụng những infrastructure đã ổn định**, đặc biệt:

- Authentication
- JWT
- Refresh Token
- Google OAuth2
- Spring Security
- User
- User Profile
- Role
- Email verification
- Password reset
- Cloudinary
- Cloudinary upload/config
- React Query
- Zustand
- Axios
- React Router
- Form validation

Không cần viết lại những hệ thống trên nếu chúng đã hoạt động tốt.

Tuy nhiên, domain của dự án mới phải được thiết kế lại theo **J-Tech Japanese Learning Website**. Các dấu vết từ dự án cũ như package `com.japaneselearning`, nội dung email "Japanese Learning" hoặc logic đặc thù của hệ thống học tiếng Nhật cần được đổi dần sang `com.jtech` và ngữ cảnh lịch sử Việt Nam.

---

# 5. Nguyên tắc code

### 5.1. Không tự ý thay đổi công nghệ

Giữ nguyên stack đã được xác định ở trên.

Không tự ý chuyển sang framework hoặc thư viện khác nếu không được yêu cầu.

### 5.2. Không phá code đang hoạt động

Trước khi sửa một module hiện có:

1. Đọc và hiểu code hiện tại.
2. Xác định dependency.
3. Sửa với phạm vi nhỏ nhất.
4. Đảm bảo các chức năng cũ vẫn hoạt động.

### 5.3. Backend

Tuân thủ:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

- Controller chỉ xử lý request/response.
- Business logic nằm trong Service.
- Repository chỉ xử lý database.
- Sử dụng DTO cho API.
- Validation bằng Jakarta Validation.
- Xử lý exception tập trung.
- Không expose Entity trực tiếp khi không cần thiết.

### 5.4. Frontend

Phân tách rõ:

```text
pages
components
api
services
hooks
store
types
```

- API call tập trung trong `api/`.
- Type/interface nằm trong `types/`.
- Server state sử dụng React Query.
- Global state sử dụng Zustand khi cần.
- Form sử dụng React Hook Form + Zod.
- Component có khả năng tái sử dụng phải được tách riêng.
- Không viết logic lớn trực tiếp trong Page component.

### 5.5. Database

Database hiện tại: **`jtech_learning`**.

File schema chính: **`doc/J-Tech.sql`**.

Các bảng hiện có trong schema tài liệu:

- `roles`: lưu quyền hệ thống (`ADMIN`, `MODERATOR`, `USER`).
- `users`: tài khoản người dùng, email, mật khẩu đã hash, avatar, trạng thái và thời gian đăng nhập gần nhất.
- `user_profiles`: thông tin hồ sơ mở rộng của người dùng.
- `refresh_tokens`: refresh token dùng cho cơ chế JWT.
- `email_verifications`: mã xác minh email khi đăng ký.
- `login_history`: lịch sử đăng nhập, thiết bị, trình duyệt, IP và trạng thái thành công/thất bại.

Nguyên tắc database:

- Sử dụng MySQL với charset `utf8mb4` và collation `utf8mb4_unicode_ci` để hỗ trợ tiếng Việt tốt.
- Thiết kế quan hệ rõ ràng bằng khóa ngoại.
- Không lưu file binary lớn trực tiếp trong database.
- File/media lưu trên Cloudinary hoặc storage phù hợp; database chỉ lưu URL/metadata.
- Không tự ý thay đổi database schema nếu chưa kiểm tra ảnh hưởng tới Entity, Repository, Service và API.

### 5.6. Security

- Không tin tưởng `userId`, `role` hoặc thông tin người dùng được gửi trực tiếp từ frontend.
- Lấy thông tin user hiện tại từ Spring Security context.
- Phân quyền bằng Spring Security.
- Không trả password, token hoặc dữ liệu nhạy cảm về frontend.
- Các endpoint admin phải được bảo vệ.

### 5.7. Code quality

Ưu tiên:

- Clean Code.
- DRY.
- SOLID khi phù hợp.
- Tên class, method và biến rõ ràng.
- Không copy-paste logic.
- Không tạo abstraction quá mức khi chưa cần thiết.
- Không tạo file/package dư thừa.
- Không tạo package lặp hoặc sai package root.

---

# 6. Nguyên tắc phát triển

Không triển khai toàn bộ hệ thống cùng một lúc.

Phát triển từng module:

```text
Authentication
      ↓
User / Profile
      ↓
Post / Like / Comment
      ↓
Follow / Friend
      ↓
Topic / Feed
      ↓
Document
      ↓
Video
      ↓
Chat / WebSocket
      ↓
Notification
      ↓
Admin / Moderation
```

Mỗi module phải được kiểm tra trước khi chuyển sang module tiếp theo.

---

# 7. Mục tiêu cuối cùng

Xây dựng một nền tảng:

> 🇻🇳 **J-Tech Japanese Learning Website**

nơi người dùng có thể:

**Học lịch sử → Chia sẻ kiến thức → Thảo luận → Kết nối cộng đồng → Khám phá tài liệu và video lịch sử.**

Ưu tiên hàng đầu:

**Ổn định → Dễ bảo trì → Bảo mật → UX tốt → Có khả năng mở rộng.**
# 🇯🇵 J-Tech Japanese Practice Website

## 1. Giới thiệu dự án

**J-Tech Japanese Practice Website** là nền tảng web hỗ trợ sinh viên IT/FPT University luyện tập tiếng Nhật theo hướng tự học, ôn tập và theo dõi tiến độ học tập. Dự án tập trung vào việc cung cấp một môi trường học trực tuyến giúp người học củng cố kiến thức từ lớp học, luyện tập từ vựng, ngữ pháp, Kanji, đọc, nghe, nói và các bài kiểm tra đánh giá năng lực.

Tên dự án trong tài liệu đồ án: **Web-Based Japanese Practice Support Application for IT Students at FPT University**.

Mã dự án: **J-Tech**.

Backend hiện tại được đặt tên ứng dụng là **`jtech-backend`**, package root là **`com.jtech`**, database mặc định là **`jtech`**.

### 1.1. Mục tiêu sản phẩm

Dự án hướng tới giải quyết các vấn đề phổ biến của sinh viên IT khi học tiếng Nhật:

- Khó cân bằng thời gian giữa môn chuyên ngành và môn tiếng Nhật.
- Thiếu nền tảng tiếng Nhật vững chắc.
- Cần tài liệu và bài luyện tập tập trung theo chương trình học.
- Cần theo dõi tiến độ cá nhân để nhận biết điểm yếu.
- Cần môi trường tự học mọi lúc, mọi nơi.

Mục tiêu cuối cùng là xây dựng một nền tảng giúp sinh viên:

> **Học tiếng Nhật → Luyện tập kỹ năng → Theo dõi tiến độ → Cải thiện điểm yếu → Chuẩn bị tốt hơn cho yêu cầu học tập tại FPT University.**

### 1.2. Phạm vi hiện tại của source code

Phạm vi đã có trong code hiện tại gồm:

- Đăng nhập bằng Google OAuth2.
- Xác thực bằng Spring Security.
- JWT access token.
- Refresh token.
- Đăng xuất và thu hồi refresh token.
- Lấy thông tin người dùng hiện tại.
- Cập nhật hồ sơ cá nhân với các trường đang dùng: `fullName`, `birthday`.
- Quản lý tài khoản người dùng phía Admin.
- Duyệt/từ chối tài khoản đang chờ phê duyệt.
- Cập nhật trạng thái người dùng.
- Xóa tài khoản người dùng.
- Thống kê dashboard cơ bản cho Admin.
- Lưu lịch sử đăng nhập.
- Cấu hình upload media qua Cloudinary.
- Frontend React/Vite cho login, OAuth2 redirect, home, profile và admin portal.

### 1.3. Phạm vi định hướng phát triển

Các module học tập tiếng Nhật sẽ được phát triển dần theo từng giai đoạn:

- Quản lý khóa học/chủ đề/bài học.
- Từ vựng.
- Ngữ pháp.
- Kanji.
- Bài đọc.
- Bài nghe.
- Luyện nói.
- Video bài học.
- Tạo, cập nhật và xóa bài kiểm tra.
- Làm bài kiểm tra và chấm điểm.
- Theo dõi tiến độ học tập.
- Nhận diện điểm yếu của người học.
- Gợi ý bài luyện tập cá nhân hóa.
- Quản lý tài liệu học tập.
- Thông báo/nhắc nhở học tập.
- AI hỗ trợ đọc, nói hoặc hội thoại nếu phù hợp với phạm vi đồ án.

> Lưu ý: Các module học tập ở trên là định hướng/requirement tương lai. Schema hiện tại trong `doc/jtech.sql` mới bao gồm nền tảng người dùng, phân quyền, refresh token và lịch sử đăng nhập.

---

## 2. Công nghệ sử dụng

## 2.1. Backend

Backend sử dụng:

- **Java 21**
- **Spring Boot 3.3.2**
- **Maven**
- Spring Web
- Spring Security
- Spring Data JPA
- Spring Validation
- Spring OAuth2 Client
- MySQL
- Lombok
- JJWT
- Cloudinary Java SDK

Hiện tại `pom.xml` chưa có `spring-boot-starter-mail`, vì vậy không mô tả email verification/password reset là chức năng đã có cho đến khi dependency và implementation được bổ sung.

## 2.2. Frontend

Frontend hiện tại là React/Vite với các thư viện chính trong `frontend/package.json`:

- **React 18**
- **TypeScript 5**
- **Vite 5**
- React Router DOM
- TanStack React Query
- React Hook Form
- Zod
- Zustand
- Axios

Không ghi nhận Tailwind CSS trong `package.json` hiện tại; nếu muốn dùng Tailwind cần cài đặt và cấu hình riêng trước khi áp dụng.

## 2.3. Authentication

- Spring Security.
- Google OAuth2 Login.
- JWT access token.
- Refresh token lưu trong database.
- Refresh token có thể được gửi qua request body hoặc cookie tùy flow frontend/backend.

## 2.4. Storage

- Cloudinary dùng cho media như avatar, hình ảnh, video hoặc thumbnail.
- Database chỉ lưu URL/metadata, không lưu file binary lớn trực tiếp.

## 2.5. Realtime/AI

- Realtime notification/chat và AI learning support chưa thuộc schema hiện tại.
- Khi triển khai cần thiết kế module riêng và cập nhật Entity, Repository, Service, API, frontend type/form/page tương ứng.

---

## 3. Kiến trúc dự án

Dự án đang đi theo kiến trúc **Monolithic**:

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
       ├── Security
       ├── DTO / Mapper
       └── Exception Handler
       │
       ├──────────► MySQL (`jtech`)
       │
       └──────────► Cloudinary
```

Không sử dụng Microservices ở giai đoạn hiện tại.

Ưu tiên kiến trúc đơn giản, dễ phát triển, dễ kiểm thử và dễ bảo trì.

---

## 4. Cấu trúc module hiện tại

## 4.1. Backend

Các package chính:

```text
com.jtech
├── config
├── controller
├── dto
│   ├── request
│   └── response
├── entity
├── exception
├── mapper
├── repository
├── security
└── service
    └── impl
```

Các controller hiện có:

- `AuthController`: logout, refresh token.
- `UserController`: lấy thông tin user hiện tại, cập nhật profile.
- `AdminUserController`: quản lý user phía admin.
- `AdminStatsController`: thống kê dashboard admin.

Các entity hiện có:

- `User`
- `Role`
- `UserProfile`
- `RefreshToken`
- `LoginHistory`
- `UserStatus`

## 4.2. Frontend

Các khu vực chính hiện có:

- `pages/auth`: login, OAuth2 redirect, pending approval, rejected account.
- `pages/home`: trang home/landing sau đăng nhập.
- `pages/profile`: trang thông tin cá nhân.
- `pages/admin`: admin dashboard, admin user management, pending users.
- `components/auth`: protected route và admin protected route.
- `api`, `hooks`, `store`, `types`: quản lý API call, React Query hooks, Zustand auth state và TypeScript types.

---

## 5. Tái sử dụng code hiện tại

Dự án đã có nền tảng authentication và user management. Có thể tiếp tục tái sử dụng các phần ổn định:

- Spring Security.
- JWT.
- Refresh token.
- Google OAuth2.
- User.
- User Profile.
- Role.
- User status.
- Login history.
- Admin user management.
- Cloudinary config/service.
- React Query.
- Zustand.
- Axios.
- React Router.
- Form validation.

Khi mở rộng module học tập tiếng Nhật, cần phát triển domain mới quanh nội dung học tập thay vì đưa logic lớn vào các service authentication/user sẵn có.

---

## 6. Nguyên tắc code

### 6.1. Không tự ý thay đổi công nghệ

Giữ nguyên stack đã được xác định ở trên. Không tự ý chuyển framework, database hoặc thư viện chính nếu chưa có yêu cầu.

### 6.2. Không phá code đang hoạt động

Trước khi sửa module hiện có:

1. Đọc và hiểu code hiện tại.
2. Xác định dependency liên quan.
3. Sửa với phạm vi nhỏ nhất.
4. Đồng bộ backend DTO/entity/schema và frontend type/form/API.
5. Build/test lại backend và frontend nếu có thể.

### 6.3. Backend

Tuân thủ flow:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Database
```

Nguyên tắc:

- Controller chỉ xử lý request/response.
- Business logic đặt trong Service.
- Repository chỉ xử lý truy vấn database.
- Sử dụng DTO cho API.
- Validation bằng Jakarta Validation.
- Xử lý exception tập trung trong `GlobalExceptionHandler`.
- Không expose Entity trực tiếp khi không cần thiết.
- Mapper dùng để chuyển đổi Entity ↔ DTO khi phù hợp.
- Không đặt logic học tập vào module auth/user nếu không liên quan.

### 6.4. Frontend

Phân tách rõ:

```text
pages
components
api
hooks
store
types
```

Nguyên tắc:

- API call tập trung trong `api/`.
- Type/interface nằm trong `types/`.
- Server state sử dụng React Query.
- Global auth state sử dụng Zustand khi cần.
- Form nên dùng React Hook Form + Zod khi có validation phức tạp.
- Component có khả năng tái sử dụng nên tách khỏi Page component.
- Không viết logic lớn trực tiếp trong Page component.

### 6.5. Database

Database hiện tại: **`jtech`**.

File schema chính: **`doc/jtech.sql`**.

Các bảng hiện có trong schema tài liệu:

- `roles`: lưu quyền hệ thống (`ADMIN`, `MODERATOR`, `USER`).
- `users`: tài khoản người dùng, email, display name, phone, avatar, trạng thái và thời gian đăng nhập gần nhất.
- `user_profiles`: thông tin hồ sơ mở rộng hiện đang gồm `full_name`, `birthday`, timestamps.
- `refresh_tokens`: refresh token dùng cho cơ chế JWT.
- `login_history`: lịch sử đăng nhập, thiết bị, trình duyệt, IP và trạng thái thành công/thất bại.

Nguyên tắc database:

- Sử dụng MySQL với charset `utf8mb4` và collation `utf8mb4_unicode_ci`.
- Thiết kế quan hệ rõ ràng bằng khóa ngoại.
- Không lưu file binary lớn trực tiếp trong database.
- File/media lưu trên Cloudinary hoặc storage phù hợp; database chỉ lưu URL/metadata.
- Không tự ý thay đổi schema nếu chưa kiểm tra ảnh hưởng tới Entity, Repository, Service, API và frontend types.
- Dự án hiện chưa có migration framework như Flyway/Liquibase; thay đổi schema cho database đã tồn tại cần có SQL migration thủ công hoặc bổ sung migration framework.

### 6.6. Security

- Không tin tưởng `userId`, `role` hoặc thông tin nhạy cảm gửi trực tiếp từ frontend.
- Ưu tiên lấy user hiện tại từ Spring Security context khi xử lý tác vụ của chính user.
- Phân quyền bằng Spring Security.
- Không trả password, token nội bộ hoặc dữ liệu nhạy cảm không cần thiết về frontend.
- Endpoint admin phải được bảo vệ bằng role phù hợp.
- Refresh token cần được thu hồi khi logout.
- Không commit secret thật của Google OAuth2, JWT hoặc Cloudinary lên repository public; nên chuyển sang biến môi trường cho môi trường thật.

### 6.7. Code quality

Ưu tiên:

- Clean Code.
- DRY.
- SOLID khi phù hợp.
- Tên class, method và biến rõ ràng.
- Không copy-paste logic.
- Không tạo abstraction quá mức khi chưa cần thiết.
- Không tạo file/package dư thừa.
- Không tạo package lặp hoặc sai package root.
- Đồng bộ thuật ngữ tiếng Nhật/học tập trong backend, frontend và tài liệu.

---

## 7. Nguyên tắc phát triển module

Không triển khai toàn bộ hệ thống cùng một lúc. Nên phát triển theo từng module độc lập, có kiểm thử và build sau mỗi giai đoạn.

Thứ tự đề xuất:

```text
Authentication / OAuth2 / JWT
      ↓
User / Profile / Role / Admin User Management
      ↓
Learning Content Foundation
(Course / Topic / Lesson)
      ↓
Vocabulary / Grammar / Kanji
      ↓
Reading / Listening / Speaking Practice
      ↓
Test / Question / Answer / Attempt / Scoring
      ↓
Learning Progress / Weakness Analysis
      ↓
Personalized Recommendation
      ↓
Learning Documents / Media
      ↓
Notification / Reminder
      ↓
AI-assisted Practice
      ↓
Admin / Moderation / Reporting
```

Mỗi module khi thêm mới cần cập nhật đầy đủ:

- Database schema/migration.
- Entity.
- Repository.
- DTO request/response.
- Service/interface/implementation.
- Controller/API.
- Security rule nếu cần.
- Frontend API client.
- Frontend type.
- Page/component/hook/store liên quan.
- Tài liệu nếu schema hoặc API thay đổi.

---

## 8. Mục tiêu cuối cùng

Xây dựng một nền tảng:

> 🇯🇵 **J-Tech Japanese Learning Website**

nơi sinh viên có thể:

**Ôn tập tiếng Nhật → Luyện từ vựng/ngữ pháp/Kanji → Làm bài kiểm tra → Theo dõi tiến độ → Nhận diện điểm yếu → Học tập hiệu quả hơn bên cạnh chương trình IT.**

Ưu tiên hàng đầu:

**Ổn định → Bảo mật → Dễ bảo trì → Đúng domain học tiếng Nhật → UX tốt → Có khả năng mở rộng.**

# Cửa hàng vật phẩm

Triển khai SRS UC-29–32 và sequence đã cung cấp: danh mục công khai, chi tiết, xác nhận giá hiện tại, đổi xu, kho, trang bị/tháo và mở tài liệu theo quyền sở hữu.

## Cài đặt

Chạy `doc/migrations/20261103_reward_store.sql` **một lần** trên cơ sở dữ liệu hiện có trước khi chạy bản này. Migration thêm loại MATERIAL, URL tài liệu, hạn sử dụng và ràng buộc một vật phẩm mỗi học viên. Không chạy lại toàn bộ `doc/jtech.sql` vì file này tạo lại database. Không tự thay đổi hoặc xóa bản ghi trùng nếu migration báo lỗi ràng buộc.

Danh mục đọc từ `store_item` có status ACTIVE, không tạo tên/giá/vật phẩm mẫu. Dữ liệu mới cần được cấu hình theo danh mục thực tế. `material_url` chỉ trả về qua endpoint kiểm tra quyền; không nằm trong danh mục hoặc kho. `usable_until` NULL nghĩa là không có hạn sử dụng được cấu hình. Vật phẩm ẩn vẫn thuộc kho và vẫn được trang bị khi quyền sử dụng còn hợp lệ.

`theme_config` hỗ trợ các khóa CSS `--primary`, `--primary-hover`, `--primary-light`, `--primary-border`, `--bg-main`, `--bg-surface` với giá trị màu hex; chỉ áp dụng màu được lưu. Ảnh đại diện, khung và huy hiệu được áp dụng tại thành phần UserAvatar trong giao diện học viên.

POST `/store/{id}/redeem` nhận expectedPrice và requestId. Khóa dòng tài khoản tuần tự hóa đổi/trang bị theo học viên; khóa vật phẩm đảm bảo giá đọc lúc xác nhận. Trừ xu, ghi coin_transaction và cấp user_inventory nằm trong cùng transaction. Thử lại cùng requestId trả lại kết quả gốc (kể cả số dư tại thời điểm giao dịch). UI giữ requestId khi mất phản hồi. Không tự cộng xu hoặc thêm điều kiện đủ tư cách ngoài dữ liệu SRS/schema.

Kiểm tra: `npm run build` trong frontend; Java 21 và `mvn -f backend/pom.xml -Dtest=RewardStoreServiceTest test`. Unit test dùng repository/JDBC giả lập; cần kiểm tra thêm transaction rollback/concurrency trên MySQL và giao diện với phiên học viên thật trước khi phát hành. Chưa chạy migration trên database của người dùng.

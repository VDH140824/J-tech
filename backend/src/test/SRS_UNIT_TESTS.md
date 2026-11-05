# Phạm vi unit test theo method

| Mục | Method có quy tắc cần kiểm tra | File |
| --- | --- | --- |
| 12 | `StreakService.calculate`: ngày liên tiếp, trùng ngày, đứt chuỗi (BR74, BR112). | LearningProgressStreakSrsUnitTest.java |
| 13 | `CoinRewardService.awardCoins`: cùng yêu cầu không được cấp thưởng hai lần (NS-08). | CoinWalletSrsUnitTest.java |
| 14 | `StoreService.redeem`: thiếu coin, đổi giá, giới hạn sở hữu, gửi lại yêu cầu (UC-30). | RewardStoreServiceTest.java đã có sẵn |
| 16 | `FeedbackService.validateImage` và Bean Validation của `FeedbackRequest`: ảnh tùy chọn, định dạng, giới hạn kích thước, tiêu đề và nội dung (UC-34, BR27). | StudentFeedbackSrsUnitTest.java |
| 17 | `FeedbackService.resolve`: yêu cầu ghi chú khi hoàn tất hoặc từ chối (UC-50, UC-64, BR59). | FeedbackHandlingSrsUnitTest.java |

Các test mới gọi trực tiếp method hoặc validator và kiểm tra giá trị trả về, lỗi hoặc việc từ chối thay đổi trạng thái. Mock chỉ cung cấp dữ liệu đầu vào và cô lập phụ thuộc. Không kiểm tra chuỗi SQL, tải danh sách hay gửi email. Case ảnh quá dung lượng dùng 4.000.000 byte, vượt 3 MB theo cả hai cách quy đổi thông dụng. BR110 mô tả công thức phần trăm tiến độ nhưng hiện chưa tìm thấy method tính để gọi trực tiếp.

Chạy các suite SRS từ thư mục gốc với JDK 21:

```powershell
mvn -o -f backend/pom.xml '-Dtest=*SrsUnitTest,RewardStoreServiceTest' test
```

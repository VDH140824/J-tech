# Đặc tả Unit Test từ SRS và Business Rules

Phạm vi gồm CD-12 Progress & Streak, CD-13 Coin Wallet, CD-14 Store & Inventory, CD-16 Student Feedback và CD-17 Feedback Handling. Nguồn là **Report3_Software Requirement Specification (5).docx**. Mã UC, NS và BR trong mỗi dòng chỉ đến yêu cầu trong tài liệu. Khi số BR trong một use case lệch với bảng Business Rules, đối chiếu theo nội dung quy tắc trong bảng.

Các tên ở cột Đơn vị nghiệp vụ mô tả hành vi cần kiểm thử và không quy định tên method Java. Các con số ví dụ như số hoạt động, số dư và giá là dữ liệu kiểm thử. Mỗi dòng là một case độc lập với đầu vào và kết quả mong đợi. Các case chưa thực thi. Phạm vi tập trung vào quy tắc tính toán, kiểm tra điều kiện, quyền sở hữu, chuyển trạng thái và chống xử lý trùng. Kiểm thử tích hợp DB và giao diện nằm ngoài phạm vi.

## CD-12 Progress & Streak

| ID | Căn cứ | Đơn vị nghiệp vụ | Điều kiện và đầu vào | Thao tác | Kết quả mong đợi |
|---|---|---|---|---|---|
| PS-01 | UC-26, BR110 | Tính phần trăm hoàn thành | Phạm vi có 10 hoạt động bắt buộc, đã hoàn thành 4 | Tính phần trăm | Kết quả 40%. |
| PS-02 | UC-26 A2, BR110 | Tính phần trăm hoàn thành | Phạm vi không có hoạt động bắt buộc | Tính phần trăm | Phần trăm ở trạng thái không khả dụng. |
| PS-03 | UC-26, BR106 | Ghi nhận hoàn thành lần đầu | Nội dung được hoàn thành lần đầu tại T1, rồi hoàn thành lại tại T2 | Ghi nhận lần tại T2 | Giữ T1 làm thời điểm hoàn thành lần đầu. Nội dung không được đếm thêm vào số nội dung hoặc kiến thức mới. |
| PS-04 | UC-26, BR107 | Tổng hợp kết quả luyện tập | Cùng hoạt động có ba lần hoàn thành theo thời gian với điểm 60, 90, 70 | Tổng hợp các lần luyện tập | Kết quả đầu tiên là 60, gần nhất là 70 và cao nhất là 90. |
| PS-05 | UC-26 A1, BR118 | Tổng hợp tiến độ khi chưa có dữ liệu | Truy xuất thành công nhưng không có bản ghi khớp phạm vi đã chọn | Tổng hợp tiến độ | Số hoạt động bằng 0. Kết quả luyện tập ở trạng thái không khả dụng. |
| PS-06 | BR43, BR112 | Tính chuỗi ngày học | Có hoạt động đủ điều kiện trong ba ngày lịch địa phương liên tiếp, kết thúc hôm nay | Tính chuỗi hiện tại | Chuỗi hiện tại là 3 ngày. |
| PS-07 | BR112 | Ghi nhận ngày học | Hoàn thành hai hoạt động đủ điều kiện trong cùng ngày theo Asia/Ho_Chi_Minh | Ghi nhận cả hai hoạt động | Tính một ngày học. Chuỗi tăng tối đa một lần trong ngày. |
| PS-08 | BR112 | Xác định ngày học đủ điều kiện | Student hoàn thành ôn tập nội dung đã học, có bản ghi hoàn thành | Đánh giá hoạt động ôn tập | Ngày đó đủ điều kiện là ngày học. |
| PS-09 | BR45, BR112 | Xác định ngày học đủ điều kiện | Student chỉ đăng nhập và không hoàn thành hoạt động | Đánh giá ngày học | Ngày đó không đủ điều kiện là ngày học. |
| PS-10 | BR45, BR112 | Xác định ngày học đủ điều kiện | Student chỉ mở trang bài học và không hoàn thành hoạt động | Đánh giá ngày học | Ngày đó không đủ điều kiện là ngày học. |
| PS-11 | BR74 | Quyết định reset chuỗi | Có chuỗi hiện tại. Ngày lịch liền trước không có hoạt động học hoàn thành đủ điều kiện. Không có streak-freeze bảo vệ | Đánh giá tại lần reset hằng ngày | Chuỗi hiện tại về 0. |
| PS-12 | BR74 | Quyết định reset chuỗi | Ngày lịch liền trước có hoạt động học hoàn thành đủ điều kiện | Đánh giá tại lần reset hằng ngày | Không đặt lại chuỗi vì thiếu hoạt động ngày trước. |
| PS-13 | UC-27 A1, BR108 | Xác định mốc thưởng tiếp theo | Có chuỗi hiện tại và chuỗi dài nhất nhưng không có mốc tiếp theo phù hợp | Xác định thông tin mốc | Trả hai giá trị chuỗi cùng trạng thái không có mốc kế tiếp. |
| PS-14 | BR45 | Quyết định thưởng mốc | Mốc đã được thưởng trong cùng chuỗi chưa bị gián đoạn | Đánh giá lại mốc đó | Không thưởng coin lần nữa cho mốc trong chuỗi này. |

## CD-13 Coin Wallet

| ID | Căn cứ | Đơn vị nghiệp vụ | Điều kiện và đầu vào | Thao tác | Kết quả mong đợi |
|---|---|---|---|---|---|
| CW-01 | UC-28 E2, BR22 | Kiểm tra quyền xem giao dịch | Giao dịch thuộc Student B. Student A yêu cầu chi tiết | Kiểm tra quyền của A | Không tiết lộ chi tiết giao dịch cho A. |
| CW-02 | UC-28 A3 | Bảo toàn chi tiết giao dịch | Giao dịch vẫn tồn tại nhưng hoạt động nguồn không còn truy cập được | Chuẩn bị chi tiết giao dịch | Giữ mã tham chiếu, mô tả đã ghi, số coin và thời điểm giao dịch. |
| CW-03 | NS-08, mục 3.1.4 số 8 | Cấp thưởng | Hoạt động đủ điều kiện hoàn thành, có mức coin và EXP theo cấu hình và khóa cấp thưởng chưa xử lý | Áp dụng một lần cấp thưởng | Ghi nhận coin, EXP và bản ghi ledger tương ứng trong cùng giao dịch nghiệp vụ. |
| CW-04 | NS-08, mục 3.1.4 số 8 | Chống cấp thưởng trùng | Một lần cấp thưởng đã thành công | Xử lý lại cùng yêu cầu và cùng khóa idempotency | Không cộng coin hoặc EXP lần hai và không tạo bản ghi thưởng trùng. |
| CW-05 | NS-08, mục 3.1.4 số 8 | Bảo toàn tính nguyên tử | Một bước ghi của giao dịch cấp thưởng thất bại | Xử lý giao dịch cấp thưởng | Không để lại trạng thái chỉ ghi một phần giữa số dư coin, EXP và ledger. Quy tắc rollback thực tế cần xác nhận ở mức tích hợp. |

## CD-14 Store & Inventory

| ID | Căn cứ | Đơn vị nghiệp vụ | Điều kiện và đầu vào | Thao tác | Kết quả mong đợi |
|---|---|---|---|---|---|
| SI-01 | UC-30, BR143 | Đổi vật phẩm | Vật phẩm giá 80 coin, Student có 100 coin và đủ các điều kiện còn lại | Xác nhận đổi | Trừ đúng 80 coin, còn 20 coin, ghi giao dịch đổi và cấp vật phẩm vào inventory. |
| SI-02 | UC-30, BR143 | Kiểm tra đủ số dư | Giá 80 coin, số dư 80 coin và đủ các điều kiện còn lại | Xác nhận đổi | Đổi thành công. Số dư sau đổi bằng 0. |
| SI-03 | UC-30 A2, BR143 | Kiểm tra đủ số dư | Giá 80 coin, số dư 79 coin | Xác nhận đổi | Từ chối vì thiếu coin. Không hoàn tất redemption. |
| SI-04 | UC-30 A3 | Kiểm tra giá khi xác nhận | Giá hiển thị lúc chuẩn bị đổi là 80, giá hiện tại là 90 | Xử lý xác nhận theo giá cũ | Trả giá mới để xác nhận lại. Xác nhận cũ không cho phép thực hiện đổi theo giá mới. |
| SI-05 | UC-30 A4 | Kiểm tra khả dụng | Vật phẩm từng khả dụng nhưng hết khả dụng trước khi xác nhận | Xác nhận đổi | Từ chối yêu cầu. Không cấp vật phẩm hoặc trừ coin. |
| SI-06 | UC-30 A4, BR47 | Kiểm tra giới hạn sở hữu | Student đã sở hữu vật phẩm chỉ được sở hữu một lần | Xác nhận đổi lại vật phẩm | Từ chối lần đổi tiếp theo. |
| SI-07 | UC-30 E2 | Chống đổi trùng | Giao dịch đổi đã thành công nhưng phản hồi bị mất | Gửi lại cùng yêu cầu | Trả kết quả đổi đã có. Không phát sinh lần trừ coin hoặc cấp vật phẩm thứ hai. |
| SI-08 | UC-30 E1 | Bảo toàn trạng thái khi đổi thất bại | Một bước trong giao dịch đổi thất bại | Xử lý đổi vật phẩm | Báo thất bại, giữ số dư và quyền sở hữu trước khi đổi. Rollback thực tế cần xác nhận ở mức tích hợp. |
| SI-09 | UC-31 A3, UC-32 | Thay vật phẩm đang trang bị | Student sở hữu A và B cùng loại. A đang được trang bị | Trang bị B | B thay A. Chỉ B được trang bị trong loại đó. Student vẫn sở hữu cả A và B. |
| SI-10 | UC-32 A1 | Bỏ trang bị | A thuộc Student và đang được trang bị | Bỏ trang bị A | Xóa gán trang bị cho A, vẫn giữ quyền sở hữu A. |
| SI-11 | UC-32 E1 | Kiểm tra quyền trang bị | Vật phẩm không thuộc Student thực hiện yêu cầu | Yêu cầu trang bị | Từ chối. Cấu hình trang bị trước đó được giữ nguyên. |
| SI-12 | BR09 | Bảo toàn quyền sở hữu | Student đã đổi vật phẩm thành công, vật phẩm sau đó bị ẩn khỏi cửa hàng | Áp dụng thay đổi trạng thái cửa hàng | Quyền sở hữu đã ghi nhận của Student vẫn được giữ. |

## CD-16 Student Feedback

Mỗi case validation chỉ thay đổi trường được nêu. Những trường còn lại dùng dữ liệu hợp lệ theo UC-34 và BR27.

| ID | Căn cứ | Đơn vị nghiệp vụ | Điều kiện và đầu vào | Thao tác | Kết quả mong đợi |
|---|---|---|---|---|---|
| SF-01 | BR27 | Kiểm tra tiêu đề bắt buộc | Tiêu đề rỗng hoặc toàn khoảng trắng | Validate phản hồi | Từ chối do thiếu tiêu đề. |
| SF-02 | BR27 | Kiểm tra giới hạn tiêu đề | Tiêu đề không trống có đúng 200 ký tự | Validate tiêu đề | Chấp nhận độ dài này. |
| SF-03 | BR27 | Kiểm tra giới hạn tiêu đề | Tiêu đề có 201 ký tự | Validate tiêu đề | Từ chối do vượt giới hạn. |
| SF-04 | BR27 | Kiểm tra mô tả bắt buộc | Mô tả rỗng hoặc toàn khoảng trắng | Validate phản hồi | Từ chối do thiếu mô tả. |
| SF-05 | BR27 | Kiểm tra giới hạn mô tả | Mô tả không trống có đúng 10.000 ký tự | Validate mô tả | Chấp nhận độ dài này. |
| SF-06 | BR27 | Kiểm tra giới hạn mô tả | Mô tả có 10.001 ký tự | Validate mô tả | Từ chối do vượt giới hạn. |
| SF-07 | UC-34 A2 | Kiểm tra ảnh tùy chọn | Phản hồi hợp lệ và không có ảnh | Validate phản hồi | Chấp nhận việc không đính kèm ảnh. |
| SF-08 | BR27 | Kiểm tra định dạng ảnh | Lần lượt một ảnh JPG, JPEG, PNG hoặc WEBP hợp lệ, kích thước nhỏ hơn 3 MB | Validate từng tệp | Chấp nhận bốn định dạng. |
| SF-09 | BR27, UC-34 E2 | Kiểm tra định dạng ảnh | Tệp PDF được gửi làm ảnh đính kèm | Validate tệp | Từ chối tệp và yêu cầu bỏ hoặc thay ảnh. |
| SF-10 | BR27 | Kiểm tra dung lượng ảnh | Một ảnh hợp lệ lớn hơn 3 MB | Validate tệp | Từ chối do vượt dung lượng. |
| SF-11 | BR27 | Kiểm tra số lượng ảnh | Phản hồi kèm hai ảnh, mỗi ảnh hợp lệ riêng lẻ | Validate danh sách ảnh | Từ chối vì tối đa một ảnh cho mỗi phản hồi. |
| SF-12 | UC-34, bước 7–9 | Kiểm tra định tuyến phản hồi nội dung | Loại Content Feedback, tham chiếu hợp lệ tới bài học, bài giảng hoặc câu hỏi | Xác định nơi xử lý | Chuyển phản hồi tới Moderator. |
| SF-13 | UC-34 A1, bước 9 | Kiểm tra định tuyến lỗi kỹ thuật | Loại Technical Issue, mô tả hợp lệ và không tham chiếu học liệu | Xác định nơi xử lý | Chấp nhận việc thiếu tham chiếu học liệu và chuyển phản hồi tới Admin. |
| SF-14 | UC-34 E1 | Kiểm tra tham chiếu học liệu | Content Feedback có tham chiếu học liệu không hợp lệ | Validate phản hồi | Báo lỗi tham chiếu và yêu cầu sửa. |
| SF-15 | UC-35 E2 | Kiểm tra quyền xem phản hồi | Phản hồi thuộc Student B. Student A yêu cầu chi tiết | Kiểm tra quyền của A | Từ chối truy cập và không tiết lộ dữ liệu phản hồi. |

## CD-17 Feedback Handling

| ID | Căn cứ | Đơn vị nghiệp vụ | Điều kiện và đầu vào | Thao tác | Kết quả mong đợi |
|---|---|---|---|---|---|
| FH-01 | UC-48, UC-63, BR14, BR113 | Phân loại trách nhiệm xử lý | Có phản hồi học liệu và báo lỗi kỹ thuật | Xác định bên xử lý từng loại | Phản hồi học liệu thuộc Moderator. Lỗi kỹ thuật thuộc Administrator. |
| FH-02 | UC-50 luồng 3a | Kiểm tra ghi chú Moderator | Phản hồi nội dung đang chờ xử lý hoặc đang xử lý. Chọn Đã xử lý và để trống ghi chú | Xác nhận xử lý | Từ chối cập nhật. Trạng thái cũ được giữ. |
| FH-03 | UC-50 luồng 3a | Kiểm tra ghi chú Moderator | Phản hồi nội dung đang chờ xử lý hoặc đang xử lý. Chọn Từ chối và để trống ghi chú | Xác nhận xử lý | Từ chối cập nhật. Trạng thái cũ được giữ. |
| FH-04 | UC-64 luồng 5a, BR59 | Kiểm tra ghi chú Admin | Chọn trạng thái hoàn tất cho báo lỗi kỹ thuật và để trống ghi chú | Xác nhận cập nhật | Từ chối cập nhật. Trạng thái cũ được giữ. |
| FH-05 | UC-64 luồng 5a, BR59 | Kiểm tra ghi chú Admin | Chọn Từ chối báo lỗi kỹ thuật và để trống ghi chú | Xác nhận cập nhật | Từ chối cập nhật. Trạng thái cũ được giữ. |
| FH-06 | UC-50 luồng 4a | Ngăn ghi đè cập nhật đồng thời | Moderator A đang xử lý phiếu. Moderator B đã cập nhật cùng phiếu kể từ lúc A mở phiếu | A xác nhận theo dữ liệu cũ | Chặn cập nhật của A và yêu cầu tải lại phiếu. Kết quả của B được giữ. |
| FH-07 | UC-50, UC-64, BR59, BR115 | Áp dụng kết quả xử lý hợp lệ | Người xử lý đúng vai trò, chọn trạng thái kết thúc hợp lệ, có ghi chú giải thích | Xác nhận xử lý | Lưu kết quả và ghi chú. Kích hoạt thông báo trong ứng dụng và email cho Student gửi phản hồi. Case chỉ kiểm tra quyết định kích hoạt, không gửi email thật. |

## Điểm chưa chốt theo tài liệu

- **Progress & Streak.** NS-02 nhắc đăng nhập đủ điều kiện, trong khi BR45 và BR112 loại trừ việc chỉ đăng nhập. PS-09 bám đúng định nghĩa ngày học của BR112. BR74 dẫn BR146 về streak-freeze nhưng bảng BR của bản nguồn kết thúc ở BR145, nên chưa đặt cách sử dụng hoặc tiêu hao freeze.
- **Store & Inventory.** Danh mục vật phẩm giữa UC-29, UC-31 và BR143 chưa đồng nhất. Case chỉ đặt thuộc tính cần cho từng quy tắc, chẳng hạn cùng loại trang bị hoặc chỉ được sở hữu một lần.
- **Student Feedback.** SRS ghi 3 MB và chưa định nghĩa cách quy đổi sang byte. Chưa đặt test lệch một byte quanh giới hạn.
- **Feedback Handling.** UC-63 và UC-64 dùng hai nhãn cho trạng thái hoàn tất. Các case dùng ý nghĩa nghiệp vụ, không gán giá trị enum. UC-64 bước 5 và luồng 5a cũng chưa thống nhất về yêu cầu ghi chú đối với trạng thái Đang xử lý, nên chưa đặt kết quả cho trường hợp đó.

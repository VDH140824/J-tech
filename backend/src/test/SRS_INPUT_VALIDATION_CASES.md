# Unit Test kiểm tra dữ liệu đầu vào theo SRS và BR

Nguồn: Report3_Software Requirement Specification (5).docx. Phạm vi gồm năm mục đã chọn và form Chỉnh sửa bài học trong ảnh để đối chiếu. Đây là đặc tả test case, chưa chạy. Mỗi case thay đổi trường hoặc điều kiện được nêu, giữ các đầu vào còn lại hợp lệ, rồi kiểm tra quyết định validation trước khi lưu. Các giá trị như 80 coin hay mã vật phẩm là dữ liệu kiểm thử.

**Cách đọc kết quả.** Hợp lệ nghĩa là đầu vào đáp ứng quy tắc đang kiểm tra. Không hợp lệ nghĩa là SRS có quy tắc yêu cầu từ chối. Chưa chốt nghĩa là tài liệu chưa đủ để đặt assertion đúng hoặc sai.

## Form Chỉnh sửa bài học trong ảnh

**Tiêu đề `-1223` và mô tả `-123` là chuỗi văn bản.** BR136 quy định giá trị tối thiểu 1 cho số bài học và thứ tự sắp xếp. Hai trường đó trong ảnh đều là 2. BR137 quy định tiêu đề bắt buộc và có giới hạn độ dài. UC-38 và mục 3.14.3 mô tả tên và mô tả là trường văn bản. Không có quy tắc trong các mục này yêu cầu tiếng Nhật hoặc cấm chuỗi chỉ gồm số và dấu trừ. Ảnh cũng chỉ cho thấy dữ liệu đã nhập, chưa cho thấy kết quả validation.

**Giới hạn tiêu đề bị mâu thuẫn.** Mục 2.4.38 ghi BR137 tối đa 200 ký tự, bảng Business Rules ghi tối đa 50 ký tự. Các case dưới đây chỉ chốt những biên mà cả hai phần đồng ý.

| ID | Trường | Dữ liệu và thao tác | Kết quả mong đợi | Căn cứ |
|---|---|---|---|---|
| LS-01 | Số bài học | Để trống rồi validate | Không hợp lệ vì bắt buộc. | BR136 |
| LS-02 | Số bài học | Nhập -1 rồi validate | Không hợp lệ vì nhỏ hơn 1. | BR136 |
| LS-03 | Số bài học | Nhập 0 rồi validate | Không hợp lệ vì nhỏ hơn 1. | BR136 |
| LS-04 | Số bài học | Nhập 1, giả định chưa trùng trong chương | Hợp lệ theo giới hạn tối thiểu. | BR136, UC-38 |
| LS-05 | Số bài học | Khi tạo, nhập số đã thuộc một bài khác trong cùng chương | Không hợp lệ vì trùng trong chương. | UC-38 bước 5, 7 và E1 |
| LS-06 | Số bài học | Khi tạo, dùng số chỉ tồn tại ở chương khác | Hợp lệ theo quy tắc duy nhất trong chương. | UC-38 bước 5, 7 |
| LS-07 | Thứ tự sắp xếp | Để trống rồi validate | Không hợp lệ vì bắt buộc. | BR136 |
| LS-08 | Thứ tự sắp xếp | Nhập -1 rồi validate | Không hợp lệ vì nhỏ hơn 1. | BR136 |
| LS-09 | Thứ tự sắp xếp | Nhập 0 rồi validate | Không hợp lệ vì nhỏ hơn 1. | BR136 |
| LS-10 | Thứ tự sắp xếp | Nhập 1 rồi validate | Hợp lệ theo giới hạn tối thiểu. | BR136 |
| LS-11 | Tiêu đề | Để trống rồi validate | Không hợp lệ vì bắt buộc. | BR137 |
| LS-12 | Tiêu đề | Nhập tiêu đề văn bản đúng 50 ký tự | Hợp lệ về độ dài theo cả hai giới hạn. | UC-38 và bảng BR137 |
| LS-13 | Tiêu đề | Nhập tiêu đề văn bản 51 ký tự | Chưa chốt. Bảng BR yêu cầu từ chối, UC-38 cho phép theo độ dài. | UC-38 và bảng BR137 |
| LS-14 | Tiêu đề | Nhập tiêu đề văn bản 201 ký tự | Không hợp lệ theo cả hai giới hạn. | UC-38 và bảng BR137 |
| LS-15 | Tiêu đề | Nhập chuỗi -1223 như ảnh | Đáp ứng điều kiện có giá trị và độ dài. Chưa có căn cứ để yêu cầu từ chối vì chữ số, dấu trừ hoặc thiếu tiếng Nhật. | BR137, mục 3.14.3 |
| LS-16 | Mô tả | Nhập chuỗi -123 như ảnh | Chưa có quy tắc định dạng để kết luận phải từ chối. | Mục 3.14.3 |
| LS-17 | URL PDF | Đối chiếu yêu cầu để kiểm tra bắt buộc, tên miền, phần mở rộng, quy cách mỗi dòng | Chưa chốt các assertion này. Quy cách hiển thị trong ảnh chưa đủ để coi là BR. | Mục 3.14.3 |

## Progress & Streak

UC-26 và UC-27 chủ yếu dùng dữ liệu học tập và bộ lọc. Các case sau kiểm tra dữ liệu có được tính theo định nghĩa trong tài liệu hay không.

| ID | Đầu vào | Dữ liệu và thao tác | Kết quả mong đợi | Căn cứ |
|---|---|---|---|---|
| PS-01 | Bộ lọc thời gian | Lần lượt chọn Tuần, Tháng, Toàn bộ | Mỗi lựa chọn là một phạm vi hợp lệ được SRS liệt kê. | UC-26 bước 7–9, BR117 |
| PS-02 | Bộ lọc học tập | Chọn một khóa học và chương, dữ liệu mẫu có cả bản ghi ngoài phạm vi | Chỉ bản ghi khớp phạm vi được dùng để thống kê. | UC-26 bước 7–10, BR117 |
| PS-03 | Hoạt động | Chỉ đăng nhập, chưa hoàn thành hoạt động học hoặc luyện tập | Không đủ điều kiện tính ngày học. | BR45, BR112 |
| PS-04 | Hoạt động | Chỉ mở trang bài học, chưa hoàn thành hoạt động | Không đủ điều kiện tính ngày học. | BR45, BR112 |
| PS-05 | Hoạt động | Hoàn thành một lượt ôn nội dung đã học và hệ thống có ghi nhận | Đủ điều kiện tính ngày học. | BR112 |
| PS-06 | Ngày hoạt động | Hai lần hoàn thành đủ điều kiện trong cùng ngày Asia/Ho_Chi_Minh | Hai đầu vào chỉ được tính là một ngày học. | BR112 |

## Coin Wallet

UC-28 là xem ví. Các điều kiện có thể kiểm tra từ tài liệu là quyền trên giao dịch được chọn và tính trùng của đầu vào cấp thưởng theo NS-08. Bộ lọc ngày hoặc credit/debit ở UC-28 A2 chỉ áp dụng nếu đề xuất được giữ lại.

| ID | Đầu vào | Dữ liệu và thao tác | Kết quả mong đợi | Căn cứ |
|---|---|---|---|---|
| CW-01 | Giao dịch được chọn | Student chọn giao dịch tồn tại thuộc chính mình | Hợp lệ theo điều kiện quyền sở hữu. | UC-28, BR22 |
| CW-02 | Giao dịch được chọn | Student chọn giao dịch thuộc Student khác | Không hợp lệ với người yêu cầu. | UC-28 E2, BR22 |
| CW-03 | Giao dịch được chọn | Chọn tham chiếu không tương ứng với giao dịch nào | Không tìm thấy giao dịch để xem. | UC-28 E2 |
| CW-04 | Khóa cấp thưởng | Gửi lại cùng yêu cầu với khóa của lần cấp thưởng đã xử lý | Đầu vào là yêu cầu trùng và không đủ điều kiện nhận thêm coin hoặc EXP. | NS-08, mục 3.1.4 số 8 |

## Store & Inventory

| ID | Đầu vào | Dữ liệu và thao tác | Kết quả mong đợi | Căn cứ |
|---|---|---|---|---|
| SI-01 | Số dư so với giá | Giá 80 coin, số dư 79 coin | Không đủ điều kiện về số dư. | UC-30 A2, BR143 |
| SI-02 | Số dư so với giá | Giá 80 coin, số dư 80 coin | Đủ điều kiện về số dư. | UC-30, BR143 |
| SI-03 | Giá tại thời điểm xác nhận | Xác nhận giá 80 coin khi giá hiện tại đã đổi thành 90 coin | Xác nhận cũ không hợp lệ đối với giá mới. Cần xác nhận lại. | UC-30 A3 |
| SI-04 | Vật phẩm được chọn | Vật phẩm không còn khả dụng tại thời điểm xác nhận | Không đủ điều kiện đổi. | UC-30 A4 |
| SI-05 | Vật phẩm được chọn | Vật phẩm chỉ cho phép sở hữu một lần và Student đã sở hữu | Không đủ điều kiện đổi thêm. | UC-30 A4, BR47 |
| SI-06 | Vật phẩm đem trang bị | Vật phẩm không thuộc Student gửi yêu cầu | Không hợp lệ vì không có quyền sở hữu. | UC-32 E1 |
| SI-07 | Vật phẩm đem trang bị | Vật phẩm thuộc Student nhưng không còn usable tại thời điểm xác minh | Không đủ điều kiện trang bị. | UC-31 E2 |
| SI-08 | Vật phẩm và vị trí trang bị | Vật phẩm thuộc Student nhưng không tương thích vị trí trang bị | Không đáp ứng điều kiện tương thích. | UC-31 bước 5 |

## Student Feedback

Mỗi case giới hạn ký tự dùng chuỗi có đúng số ký tự nêu trong bảng. Mỗi case ảnh giữ các trường văn bản hợp lệ.

| ID | Trường | Dữ liệu và thao tác | Kết quả mong đợi | Căn cứ |
|---|---|---|---|---|
| SF-01 | Tiêu đề | Rỗng hoặc toàn khoảng trắng | Không hợp lệ vì phải có nội dung. | BR27 |
| SF-02 | Tiêu đề | 200 ký tự và không trống | Hợp lệ về độ dài. | BR27 |
| SF-03 | Tiêu đề | 201 ký tự | Không hợp lệ do vượt giới hạn. | BR27 |
| SF-04 | Mô tả | Rỗng hoặc toàn khoảng trắng | Không hợp lệ vì phải có nội dung. | BR27 |
| SF-05 | Mô tả | 10.000 ký tự và không trống | Hợp lệ về độ dài. | BR27 |
| SF-06 | Mô tả | 10.001 ký tự | Không hợp lệ do vượt giới hạn. | BR27 |
| SF-07 | Ảnh | Không đính kèm ảnh | Hợp lệ về số lượng ảnh. | UC-34 A2, BR27 |
| SF-08 | Định dạng ảnh | Thử riêng một ảnh JPG, JPEG, PNG và WEBP với dung lượng dưới giới hạn | Cả bốn định dạng đều được phép. | BR27 |
| SF-09 | Định dạng ảnh | Đính kèm tệp PDF thay cho ảnh | Không hợp lệ theo quy tắc ảnh phản hồi. | BR27, UC-34 E2 |
| SF-10 | Dung lượng ảnh | Một ảnh hợp lệ đúng 3 MB theo đơn vị của tài liệu | Hợp lệ về dung lượng. Chưa đặt giá trị byte cụ thể. | BR27 |
| SF-11 | Dung lượng ảnh | Một ảnh hợp lệ 4 MB | Không hợp lệ vì vượt 3 MB. | BR27 |
| SF-12 | Số lượng ảnh | Hai ảnh đều hợp lệ riêng lẻ | Không hợp lệ vì tối đa một ảnh. | BR27 |
| SF-13 | Tham chiếu học liệu | Content Feedback, thử riêng tham chiếu hợp lệ tới bài học, bài giảng và câu hỏi | Mỗi loại tham chiếu trên được phép theo UC. | UC-34 bước 4, 7 |
| SF-14 | Tham chiếu học liệu | Content Feedback với tham chiếu không hợp lệ | Không hợp lệ. | UC-34 E1 |
| SF-15 | Tham chiếu học liệu | Technical Issue, để trống tham chiếu bài học, bài giảng, câu hỏi | Hợp lệ vì trường này không bắt buộc đối với báo lỗi kỹ thuật. | UC-34 A1 |

## Feedback Handling

| ID | Trường | Dữ liệu và thao tác | Kết quả mong đợi | Căn cứ |
|---|---|---|---|---|
| FH-01 | Ghi chú Moderator | Chọn Đã xử lý và để trống ghi chú | Không hợp lệ. | UC-50 luồng 3a |
| FH-02 | Ghi chú Moderator | Chọn Từ chối và để trống ghi chú | Không hợp lệ. | UC-50 luồng 3a |
| FH-03 | Ghi chú Moderator | Chọn Đã xử lý, nhập ghi chú giải thích việc đã sửa học liệu | Đáp ứng yêu cầu ghi chú. | UC-50 bước 3, 5 và luồng 3a |
| FH-04 | Ghi chú Admin | Chọn trạng thái hoàn tất cho báo lỗi kỹ thuật và để trống ghi chú | Không hợp lệ. | UC-64 luồng 5a, BR59 |
| FH-05 | Ghi chú Admin | Chọn Từ chối báo lỗi kỹ thuật và để trống ghi chú | Không hợp lệ. | UC-64 luồng 5a, BR59 |
| FH-06 | Ghi chú Admin | Chọn Từ chối và nhập lời giải thích | Đáp ứng yêu cầu ghi chú. | UC-64 luồng 5a, BR59 |
| FH-07 | Ghi chú Admin | Chọn Đang xử lý và để trống ghi chú | Chưa chốt. Bước 5 nêu ghi chú không trống, luồng 5a và BR59 chỉ nêu bắt buộc ở trạng thái hoàn tất hoặc từ chối. | UC-64 bước 5, luồng 5a, BR59 |

Không lấy giới hạn 200 hoặc 10.000 ký tự của BR27 để áp cho ghi chú xử lý. Các số đó áp cho tiêu đề và mô tả của Student Feedback. Không áp quy tắc nhật ngữ hoặc cấm chuỗi số lên các trường văn bản khi tài liệu chưa quy định.

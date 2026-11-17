# Campus 3D: phòng chung và trò chuyện

Đây là chức năng multiplayer qua WebSocket của backend Spring Boot, dùng tài khoản học viên đang đăng nhập. Tất cả người chơi phải kết nối cùng một backend.

## Chạy trên máy phát triển

1. Tại `backend`, chạy `mvn -DskipTests spring-boot:run`. Nếu backend cũ đang chạy, cần khởi động lại để nạp WebSocket mới.
2. Tại `frontend`, chạy `npm run dev`.
3. Đăng nhập và mở `/games/campus-3d`. Dòng dưới tên nhân vật phải hiện số người đang trong map. Nút **Chat** nằm ở góc phải phía dưới bản đồ.

Mặc định frontend dùng API `http://localhost:8080/api`, socket tương ứng là `ws://localhost:8080/api/campus/ws`. Không đưa access token vào URL; kết nối xác thực bằng frame đầu tiên. Chỉ tài khoản `ACTIVE` có vai trò `STUDENT` được vào phòng.

## Chơi từ nhiều laptop

`localhost` trên mỗi laptop là chính laptop đó. Hãy cho mọi người mở cùng địa chỉ frontend, và cấu hình frontend dùng chung địa chỉ backend có thể truy cập được.

Ví dụ máy chạy server có địa chỉ LAN `192.168.1.10`:

- Frontend: đặt `VITE_API_BASE_URL=http://192.168.1.10:8080/api` trong môi trường chạy/build Vite, sau đó khởi động lại frontend. Chạy Vite bằng `npm run dev -- --host 0.0.0.0` để các máy khác truy cập `http://192.168.1.10:5173`.
- Backend: đặt `APP_FRONTEND_URL=http://192.168.1.10:5173`. Nếu có nhiều frontend hợp lệ, đặt `APP_FRONTEND_ALLOWED_ORIGINS` thành danh sách địa chỉ đầy đủ, ngăn cách bằng dấu phẩy. Mặc định vẫn là `http://localhost:5173`.
- Cấu hình đăng nhập Google hiện có của dự án cũng cần khớp địa chỉ website/callback được dùng. Chức năng campus không thay đổi luồng OAuth hiện tại.
- Khi website chạy HTTPS, backend/socket cũng phải dùng HTTPS/WSS. Reverse proxy cần chuyển tiếp WebSocket Upgrade cho `/api/campus/ws`.

Có thể đặt `VITE_CAMPUS_WS_URL` để chỉ định riêng URL WebSocket. Mặc định URL này được suy ra từ `VITE_API_BASE_URL`. Không dùng URL chứa JWT.

## Cách hoạt động

- Một phòng chung, tối đa 30 tài khoản. `APP_CAMPUS_CAPACITY` có thể giảm giới hạn, tối đa vẫn là 30.
- Có 30 điểm xuất phát đã kiểm tra va chạm, cách nhau để người mới vào không đứng chồng lên nhau.
- Mỗi tài khoản chỉ có một kết nối điều khiển nhân vật. Khi mở map ở tab/máy mới, kết nối cũ được thông báo; tab cũ không tự giành lại quyền.
- Vị trí được gửi tối đa 10 lần/giây; máy nhận nội suy chuyển động. Đi/chạy, hướng quay, ngồi và động tác chạm/vái được đồng bộ. Va chạm với map vẫn được xử lý trên trình duyệt.
- Cửa dùng trạng thái chung. Server kiểm tra khoảng cách và người đang đứng trong lối xoay trước khi chấp nhận thao tác.
- Ghế được server giữ riêng cho một người; được trả khi đứng dậy, rời map hoặc mất kết nối. Không chọn ghế đã có người khác giữ.
- Chat dùng tên từ tài khoản trên server, tối đa 300 ký tự/tin và 5 tin/5 giây/người. Nội dung được hiển thị dưới dạng văn bản. Khi nhập chat, điều khiển di chuyển tạm dừng.
- Server giữ 100 tin gần nhất trong bộ nhớ; người mới vào nhận được các tin này. Chat, trạng thái cửa và giữ ghế được xóa khi backend khởi động lại. Không thêm bảng hay migration database.
- Tự kết nối lại khi mạng gián đoạn. Khi mất kết nối, bản đồ vẫn có thể xem/di chuyển tại máy, nhưng chưa thể gửi chat hoặc nhìn thấy người khác cho đến khi kết nối lại.
- Đèn ngày/đêm, bài mẫu và lượt khấn hiện giữ cách hoạt động riêng theo người chơi. Quẻ rút thăm chưa chuyển thành phần thưởng lưu trên backend.

Phòng hiện nằm trong bộ nhớ của **một tiến trình backend**. Nếu triển khai nhiều instance backend, cần bổ sung kho/trung chuyển trạng thái chung trước khi cân bằng tải giữa các instance.

## Khi thay file map GLB

Chạy từ thư mục dự án:

```powershell
node frontend/scripts/exportCampusMap.cjs
```

Lệnh chỉ đọc GLB và tạo lại `backend/src/main/resources/campus-map.json`, đồng thời cập nhật `CAMPUS_MAP_ID` trong `frontend/game_3d/campusMultiplayer.ts`. Dữ liệu có vị trí 46 cửa, 46 ghế và điểm xuất phát an toàn của map hiện tại. Sau đó build/khởi động lại backend và frontend cùng phiên bản. Server từ chối client dùng map khác phiên bản để tránh sai vị trí cửa/ghế.

## Các file của chức năng

Backend: `pom.xml`, `SecurityConfig.java`, `CampusWebSocketConfig.java`, `campus/CampusMessages.java`, `campus/CampusRoomService.java`, `campus/CampusWebSocketHandler.java`, `resources/campus-map.json`.

Frontend: `scripts/exportCampusMap.cjs`, `game_3d/campusMultiplayer.ts`, `useCampusMultiplayer.ts`, `CampusRemotePlayers.tsx`, `CampusChat.tsx`, `Campus3DPage.tsx`, `Campus3DPage.css`, `CampusPlayer.tsx`, `CampusDoors.tsx`, `CampusSeatInteraction.tsx`, `campusSeating.ts`.

Không thêm file test vào dự án theo yêu cầu. Build frontend/backend và kiểm tra kết nối được thực hiện riêng trong quá trình triển khai.

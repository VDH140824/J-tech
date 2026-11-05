const fs = require('fs');
const path = require('path');
const out = path.join(__dirname, 'jtech-srs-16-17-32-33.drawio');
const pages = [];
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const m=(a,b,t)=>({a,b,t}), r=(a,b,t)=>({a,b,t,ret:true});
const note=t=>({note:t});
const alt=(...branches)=>({kind:'alt',branches});
const opt=(guard,...rows)=>({kind:'opt',branches:[[guard,rows]]});
const ref=t=>({ref:t});
const end=t=>note('Kết thúc nhánh: '+t);
function diagram(id,title,uc,role,rows,extra=[]){
 const actors=[role,'Giao diện','Hệ thống J-Tech','Cơ sở dữ liệu',...extra];
 const xs=actors.map((_,i)=>110+i*360), W=xs.at(-1)+165;
 const layers=[[],[],[],[]];let seq=0,k=2,y=240;
 const box=(l,t,style,x,yy,w,h)=>layers[l].push(`<mxCell id="${k++}" value="${esc(t)}" style="html=0;fontFamily=Arial;fontSize=14;whiteSpace=wrap;${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${yy}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
 const line=(l,t,style,x1,y1,x2,y2,pts='')=>layers[l].push(`<mxCell id="${k++}" value="${esc(t)}" style="html=0;fontFamily=Arial;fontSize=14;${style}" edge="1" parent="1"><mxGeometry relative="1" as="geometry"><mxPoint x="${x1}" y="${y1}" as="sourcePoint"/><mxPoint x="${x2}" y="${y2}" as="targetPoint"/>${pts}</mxGeometry></mxCell>`);
 box(0,`${id}  ${title}`,'text;align=left;fontSize=23;fontStyle=1;',28,12,W-30,38);
 box(0,`Nguồn: SRS §2.4.${uc} (UC-${uc}); §5.2 Common Requirements. Điều kiện: ${role} đã đăng nhập, có đúng vai trò/quyền theo UC.`,'text;align=left;',28,58,W-30,42);
 box(0,'Mức tương tác theo yêu cầu SRS: các lifeline Giao diện / Hệ thống / CSDL là vai trò logic, không khẳng định tên class, API hoặc bảng chưa được đặc tả. Mũi tên liền: yêu cầu; nét đứt: phản hồi.','text;align=left;fontSize=12;fontColor=#555555;',28,108,W-30,40);
 const render=(rows,depth=0)=>rows.forEach(row=>{
  if(row.note){let h=Math.max(58,28+Math.ceil(row.note.length/((W-120)/7))*19);box(3,row.note,'shape=note;align=left;verticalAlign=middle;spacing=10;fillColor=#fff2cc;strokeColor=#d6b656;',35,y-10,W-65,h);y+=h+30;return;}
  if(row.ref){const h=Math.max(70,32+Math.ceil(row.ref.length/((W-180)/7))*20);box(1,'','fillColor=#e1d5e7;strokeColor=#9673a6;',35,y-10,W-65,h);box(3,'ref','shape=umlFrame;align=left;spacingLeft=6;fillColor=#e1d5e7;strokeColor=#9673a6;',35,y-10,60,28);box(3,row.ref,'text;align=left;verticalAlign=middle;spacing=8;',105,y-8,W-145,h-4);y+=h+28;return;}
  if(row.kind){const top=y-15,left=30+depth*12,right=W-10-depth*12;y+=35;row.branches.forEach(([guard,rs],i)=>{if(i){line(1,'','endArrow=none;dashed=1;strokeColor=#777777;',left,y-15,right,y-15);y+=18;}box(3,`[${guard}]`,'text;align=left;fontStyle=2;fillColor=#ffffff;',left+80,y-13,right-left-90,35);y+=53;render(rs,depth+1);});box(1,'','fillColor=none;strokeColor=#666666;',left,top,right-left,y-top+4);box(3,row.kind,'shape=umlFrame;align=left;spacingLeft=6;fillColor=#dae8fc;strokeColor=#6c8ebf;fontStyle=1;',left,top,68,28);y+=38;return;}
  const a=xs[row.a],b=xs[row.b],self=a===b,yy=y;
  if(row.b>0)box(2,'','fillColor=#ffffff;strokeColor=#444444;',b-6+(self?6:0),yy,12,self?44:34);
  const pts=self?`<Array as="points"><mxPoint x="${a+125}" y="${yy}"/><mxPoint x="${a+125}" y="${yy+38}"/></Array>`:'';
  const text=`${++seq}. ${row.t}`;
  line(3,text,`endArrow=${row.ret?'open':'block'};endFill=${row.ret?0:1};${row.ret?'dashed=1;':''}strokeColor=#222222;whiteSpace=wrap;labelWidth=${self?285:Math.abs(a-b)-38};labelBackgroundColor=#ffffff;verticalAlign=bottom;spacingBottom=7;`,a,yy,self?b+6:b,self?yy+38:yy,pts);
  y+=self?112:100;
 });
 render(rows);
 actors.forEach((a,i)=>{box(0,a,i===0?'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;':'rounded=0;fillColor=#dae8fc;strokeColor=#6c8ebf;align=center;',i===0?xs[i]-20:xs[i]-130,170,i===0?40:260,i===0?48:48);line(0,'','endArrow=none;dashed=1;strokeColor=#888888;',xs[i],230,xs[i],y);});
 pages.push(`<diagram id="${id}" name="${esc(id+' '+title)}"><mxGraphModel grid="0" page="1" pageScale="1" pageWidth="${W+25}" pageHeight="${y+35}" background="#ffffff"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${layers.flat().join('')}</root></mxGraphModel></diagram>`);
}
const auth=role=>ref(`Xác thực phiên/JWT và quyền ${role} — §4.2.4, §5.2.1. Không hợp lệ: chặn truy cập theo quy định chung.`);
const list=(request,query,result)=>[m(0,1,request),m(1,2,'Yêu cầu tải danh sách theo tiêu chí hiện tại'),auth('đúng vai trò'),m(2,3,query),r(3,2,'Kết quả truy vấn'),r(2,1,result),r(1,0,'Hiển thị danh sách / trạng thái rỗng')];

diagram('SD-16.1','Submit feedback / bug report',34,'Student',[
 m(0,1,'Chọn Send Feedback / Report a Bug'),auth('Student đang hoạt động'),r(1,0,'Hiển thị loại phản hồi, mô tả, tham chiếu nội dung và đính kèm ảnh'),
 m(0,1,'Chọn Content Feedback hoặc Technical Issue'),
 alt(['Content Feedback',[alt(['Mở từ trang nội dung',[r(1,0,'Điền sẵn tham chiếu lesson / lecture / question')]],['Mở biểu mẫu độc lập',[m(0,1,'Chọn lesson / lecture / question liên quan')]])]],['Technical Issue — A1',[m(0,1,'Mô tả chức năng bị ảnh hưởng; không bắt buộc tham chiếu nội dung')]]),
 m(0,1,'Nhập mô tả; tùy chọn đính kèm ảnh'),
 alt(['Hủy trước Submit — A3',[m(0,1,'Hủy gửi'),end('không tạo báo cáo')]],['Submit',[m(0,1,'Chọn Submit'),m(1,1,'Trim, kiểm tra đầu vào phía client (§5.2.2)'),m(1,2,'Gửi loại báo cáo, mô tả, tham chiếu và ảnh nếu có'),m(2,2,'Kiểm tra bắt buộc, sanitize mô tả; kiểm tra tham chiếu nội dung khi áp dụng'),
 alt(['Thiếu dữ liệu / tham chiếu không hợp lệ — E1',[r(2,1,'Chỉ ra dữ liệu cần sửa'),r(1,0,'Yêu cầu sửa thông tin'),end('chưa báo gửi thành công')]],['Chi tiết hợp lệ',[
 m(2,2,'Kiểm tra ảnh nếu có: JPG/JPEG/PNG/WEBP; tối đa 3 MB/tệp (§5.2.4)'),
 alt(['Ảnh không hợp lệ — E2',[r(2,1,'Yêu cầu bỏ hoặc thay ảnh'),r(1,0,'Hiển thị lỗi tệp đính kèm'),end('chưa báo gửi thành công')]],['Không có ảnh — A2 / ảnh hợp lệ',[
 opt('Có ảnh hợp lệ',ref('Lưu ảnh theo quy định Cloudinary §5.2.4; UC-34 không đặc tả thứ tự upload chi tiết.')),
 m(2,3,'Lưu báo cáo: trạng thái ban đầu, thời gian gửi, người gửi, tham chiếu nếu có và đính kèm được chấp nhận'),
 alt(['Không lưu được báo cáo hoặc đính kèm — E3',[r(3,2,'Lưu thất bại'),r(2,1,'Lỗi gửi báo cáo; giữ thông tin đã nhập'),r(1,0,'Cho phép sửa hoặc thử lại')]],['Lưu thành công',[r(3,2,'Báo cáo đã lưu'),alt(['Content Feedback',[m(2,2,'Đưa vào hàng đợi Moderator review')]],['Technical Issue',[m(2,2,'Đưa vào hàng đợi Admin review')]]),r(2,1,'Xác nhận gửi'),r(1,0,'Hiển thị xác nhận gửi thành công')]])]])]])]]),
 note('SRS không đặt tên cụ thể cho trạng thái ban đầu ở UC-34. Không tự gán enum, endpoint, cơ chế rollback hoặc chính sách retry.')
]);
diagram('SD-16.2','View my feedback',35,'Student',[
 m(0,1,'Mở Submitted Feedback'),auth('Student đang hoạt động'),m(1,2,'Yêu cầu các báo cáo của Student hiện tại'),m(2,3,'Truy vấn theo người gửi là Student hiện tại; tìm kiếm/lọc/phân trang theo §5.2.3'),
 alt(['Tải danh sách thất bại — E1',[r(3,2,'Không truy xuất được dữ liệu'),r(2,1,'Lỗi và tùy chọn Retry'),r(1,0,'Hiển thị lỗi; cho phép thử lại')]],['Truy xuất thành công',[r(3,2,'Danh sách báo cáo'),alt(['Chưa có báo cáo — A1',[r(2,1,'No submitted feedback'),r(1,0,'Hiển thị trạng thái chưa có phản hồi')]],['Có báo cáo',[r(2,1,'Loại, tóm tắt, ngày gửi, trạng thái'),r(1,0,'Hiển thị danh sách'),m(0,1,'Chọn một báo cáo'),m(1,2,'Yêu cầu chi tiết báo cáo'),m(2,3,'Đọc báo cáo và kiểm tra người sở hữu'),alt(['Không tồn tại / thuộc Student khác — E2',[r(3,2,'Báo cáo thiếu hoặc không thuộc Student'),r(2,1,'Từ chối truy cập'),r(1,0,'Quay về danh sách của Student')]],['Không tải được chi tiết — E1',[r(3,2,'Lỗi truy xuất'),r(2,1,'Lỗi và Retry'),r(1,0,'Hiển thị lỗi và cho phép thử lại')]],['Đúng chủ sở hữu',[r(3,2,'Mô tả, liên kết, ảnh, trạng thái và ghi chú được phép xem'),r(2,1,'Chi tiết báo cáo của Student'),opt('Chưa có ghi chú — A2',r(1,0,'Hiển thị trạng thái hiện tại và thông báo chưa có ghi chú')),opt('Nội dung liên kết không còn truy cập được — A3',r(1,0,'Giữ thông tin tham chiếu; hiển thị báo cáo nhưng không mở nội dung')),r(1,0,'Hiển thị chi tiết và ảnh nếu có'),m(0,1,'Quay lại danh sách hoặc rời trang')]])]])]]),note('Chỉ đọc; không đổi dữ liệu và không tiết lộ báo cáo của Student khác.')
]);
diagram('SD-17.1','View content feedback list',48,'Moderator',[
 ...list('Mở Nội dung phản hồi','Chỉ lấy phản hồi học thuật; ưu tiên Chờ xử lý, mới nhất trước','Mã, khóa học, bài học, loại nội dung, tiêu đề, người gửi, ngày gửi, trạng thái'),
 opt('Tìm kiếm / lọc / chuyển trang',m(0,1,'Chọn Course, Bài học, Trạng thái; nhập tiêu đề / tên Student / mã nội dung và Enter; hoặc chuyển trang'),m(1,2,'Gửi tiêu chí tìm kiếm, lọc và trang'),m(2,3,'Truy vấn phản hồi nội dung theo tiêu chí; mặc định 10 hoặc 20 bản ghi/trang'),r(3,2,'Kết quả tương ứng'),alt(['Có kết quả',[r(2,1,'Danh sách khớp tiêu chí'),r(1,0,'Làm mới bảng phản hồi')]],['Không có kết quả — 5a',[r(2,1,'Không tìm thấy phản hồi nội dung nào phù hợp với điều kiện tìm kiếm.'),r(1,0,'Hiển thị thông báo rỗng')]])),m(0,1,'Chọn Xem chi tiết'),ref('SD-17.2 — UC-49'),note('Chỉ đọc. UC-48 dẫn BR-105; nội dung tương ứng tại phụ lục là BR-100. Giữ nguyên phạm vi phản hồi học thuật.')
]);
diagram('SD-17.2','View content feedback detail',49,'Moderator',[
 m(0,1,'Chọn Xem chi tiết trên danh sách phản hồi'),auth('Moderator'),m(1,2,'Yêu cầu chi tiết phản hồi nội dung'),m(2,3,'Truy vấn ticket phản hồi học thuật và ngữ cảnh liên quan'),r(3,2,'Thông tin ticket, Student, mô tả, ảnh, Course/Chapter/Lesson/Question'),r(2,1,'ID, tên/email người gửi, thời gian, loại lỗi, trạng thái, tiêu đề, mô tả, bằng chứng và ngữ cảnh'),
 alt(['Có ảnh',[r(1,0,'Hiển thị ảnh đính kèm / screenshot preview')]],['Không có ảnh — 2a',[r(1,0,'Không có tệp hình ảnh đính kèm.')]]),r(1,0,'Hiển thị chi tiết và nút Xem bài giảng'),m(0,1,'Chọn Xem bài giảng'),m(1,2,'Yêu cầu mở nội dung / câu hỏi được tham chiếu'),m(2,3,'Kiểm tra nội dung tham chiếu và khả dụng'),r(3,2,'Trạng thái nội dung'),alt(['Nội dung còn khả dụng',[r(2,1,'Đích lesson / question trong Curriculum Management'),r(1,0,'Mở tab mới hoặc điều hướng trực tiếp để đối chiếu'),m(0,1,'Kiểm tra học liệu rồi quay lại chi tiết phản hồi')]],['Đã xóa / lưu trữ / ẩn — 3a',[r(2,1,'Học liệu hoặc câu hỏi liên quan hiện không còn khả dụng hoặc đã bị lưu trữ.'),r(1,0,'Hiển thị cảnh báo')]]),note('Không đổi trạng thái ticket. UC-49 ghi tham chiếu UC-95 ở tiền điều kiện; bảng đối chiếu và tiêu đề xác định màn hình danh sách là UC-48. Không tạo UC-95 mới.')
]);
diagram('SD-17.3','Process content feedback',50,'Moderator',[
 note('Tiền điều kiện UC-50: đang xem ticket nội dung ở Chờ xử lý hoặc Đang xử lý. Sơ đồ giữ nguyên luồng UC-50; các mâu thuẫn nguồn được ghi cuối trang.'),
 m(0,1,'Chọn Đang xử lý / Đã xử lý / Từ chối'),m(0,1,'Nhập Ghi chú xử lý; chọn Xác nhận xử lý'),m(1,1,'Kiểm tra đầu vào phía client; trim ghi chú'),m(1,2,'Gửi trạng thái mới và ghi chú'),auth('Moderator'),m(2,2,'Sanitize ghi chú; kiểm tra chuyển trạng thái hợp lệ và ghi chú bắt buộc khi Đã xử lý/Từ chối'),
 alt(['Đã xử lý/Từ chối nhưng ghi chú trống — 3a',[r(2,1,'Vui lòng nhập ghi chú xử lý chi tiết để phản hồi kết quả cho sinh viên.'),r(1,0,'Tô đỏ ghi chú; dừng lưu')]],['Dữ liệu và chuyển trạng thái hợp lệ',[
 m(2,3,'Cập nhật có kiểm tra xung đột: trạng thái, ghi chú, Moderator xử lý, thời gian hoàn tất; lưu lịch sử xử lý theo mô tả UC'),
 alt(['Ticket vừa bị Moderator khác cập nhật — 4a',[r(3,2,'Xung đột cập nhật đồng thời; không ghi đè'),r(2,1,'Phiếu phản hồi này vừa được xử lý bởi một kiểm duyệt viên khác. Vui lòng tải lại trang để xem dữ liệu mới nhất.'),r(1,0,'Hiển thị cảnh báo tải lại')]],['Cập nhật thành công',[r(3,2,'Dữ liệu xử lý đã lưu'),m(2,3,'Tạo thông báo in-app cho Student gửi phản hồi'),r(3,2,'Thông báo được ghi nhận'),m(2,4,'Gửi email thông báo kèm ghi chú đến Student'),r(4,2,'Kết quả gửi email theo luồng thành công'),r(2,1,'Cập nhật trạng thái và gửi phản hồi thành công'),r(1,0,'Hiển thị thành công; làm mới chi tiết/danh sách')]])]]),
 ref('Ghi audit bất biến cho can thiệp quản trị theo §4.2.4 và BR-07; SRS không đặc tả vị trí gọi chi tiết.'),
 note('Điểm chưa thống nhất, không tự sửa: UC-50 bước 7–8 đặt gửi in-app/email sau cập nhật; BR-54/BR-102 nhấn mạnh khi Resolved/Rejected. UC-50 dùng BR-105/106, phụ lục đánh số BR-100/102. Không thêm nhánh email lỗi vì UC-50 không mô tả.' )
],['Email Service']);
diagram('SD-17.4','View technical feedback list',63,'Administrator',[
 ...list('Mở Phản hồi & Báo lỗi hệ thống','Chỉ truy vấn technical bug / lỗi UI / sự cố nền tảng','Ticket ID, tên/email người gửi, loại, tiêu đề, ngày tạo, trạng thái'),
 opt('Tìm kiếm / lọc / phân trang',m(0,1,'Chọn Chờ xử lý / Đang xử lý / Đã giải quyết / Từ chối; tìm kiếm hoặc chuyển trang theo §5.2.3'),m(1,2,'Yêu cầu danh sách với tiêu chí'),m(2,3,'Truy vấn technical feedback theo trạng thái / từ khóa / trang'),r(3,2,'Kết quả'),r(2,1,'Danh sách tương ứng'),r(1,0,'Làm mới bảng')),
 opt('Không có phản ánh kỹ thuật chưa xử lý — 2a',r(1,0,'Hiện không có phản ánh kỹ thuật nào chưa xử lý. (MSG18)')),m(0,1,'Chọn một dòng phản hồi'),ref('SD-17.5 — mở chi tiết và xử lý technical feedback (UC-64)'),note('Chỉ đọc; không lấy phản hồi học thuật. UC-63 ghi UC-75 trong bước 4, còn bảng đối chiếu là UC-64; không phát sinh UC-75.')
]);
diagram('SD-17.5','Resolve technical feedback',64,'Administrator',[
 m(0,1,'Mở ticket technical feedback'),auth('Administrator'),m(1,2,'Yêu cầu chi tiết ticket'),m(2,3,'Truy vấn phản hồi kỹ thuật được chọn'),r(3,2,'Mô tả, screenshot đính kèm và thông tin thiết bị theo UC-64'),r(2,1,'Chi tiết phản hồi'),r(1,0,'Hiển thị chi tiết'),m(0,1,'Chọn Đang xử lý / Đã xử lý / Từ chối; nhập ghi chú'),m(0,1,'Chọn Cập nhật trạng thái'),m(1,1,'Kiểm tra phía client; trim ghi chú'),m(1,2,'Gửi trạng thái và ghi chú xử lý'),m(2,2,'Sanitize ghi chú; kiểm tra ghi chú không trống theo bước 5 UC-64'),
 alt(['Ghi chú trống — bước 5; luồng 5a nêu Resolved/Rejected',[r(2,1,'Lỗi bắt buộc ghi chú (MSG09)'),r(1,0,'Tô đỏ trường; ngăn lưu')]],['Ghi chú hợp lệ',[m(2,3,'Lưu trạng thái xử lý và ghi chú'),r(3,2,'Dữ liệu xử lý đã lưu'),m(2,3,'Tạo thông báo in-app cho Student'),r(3,2,'Thông báo được ghi nhận'),m(2,4,'Gửi email thông báo kết quả đến Student'),alt(['Gửi email thành công',[r(4,2,'Kết quả gửi thành công')]],['Gửi email lỗi — 6a',[r(4,2,'Email exception'),m(2,3,'Ghi log lỗi email; vẫn giữ trạng thái xử lý đã commit'),r(3,2,'Log được ghi nhận')]]),r(2,1,'Cập nhật tiến độ xử lý phản hồi thành công! (MSG17)'),r(1,0,'Hiển thị thành công')]]),
 ref('Audit bất biến cho can thiệp quản trị — §4.2.4, BR-07.'),
 note('Điểm chưa thống nhất, không tự sửa: bước 5 UC-64 yêu cầu ghi chú không trống; 5a và BR-54 chỉ nhấn mạnh Resolved/Rejected. Bước 6 gửi in-app/email sau cập nhật. UC-64 tham chiếu UC-74 và BR-48; phụ lục tương ứng về feedback là BR-54. Không thêm cơ chế retry email hoặc optimistic locking vì UC-64 không nêu.')
],['Email Service']);

diagram('SD-32.1','View coin reward rules',54,'Administrator',[
 ...list('Mở Cấu hình điểm thưởng','Truy vấn mức xu thưởng và trạng thái On/Off theo từng loại hoạt động','Mức thưởng hiện tại và trạng thái áp dụng'),note('Loại hoạt động theo UC-54: lecture exercises, lesson tests, chapter tests, listening, reading, conjugation và games. Màn hình chỉ xem; không cấp xu và không thay đổi ví.')
]);
diagram('SD-32.2','Update coin reward rules',54,'Administrator',[
 ref('SD-32.1 — tải cấu hình hiện tại'),m(0,1,'Sửa số xu thưởng và bật/tắt từng quy tắc'),m(0,1,'Chọn Lưu quy tắc'),m(1,1,'Trim và kiểm tra phía client: số nguyên dương > 0'),m(1,2,'Gửi các mức xu và trạng thái áp dụng'),auth('Administrator'),m(2,2,'Kiểm tra server: mọi số xu là số nguyên dương > 0'),
 alt(['Âm / 0 / không phải số nguyên — 5a',[r(2,1,'Số xu thưởng phải là số nguyên dương lớn hơn 0. (MSG07)'),r(1,0,'Tô đỏ dưới ô; ngăn lưu')]],['Hợp lệ',[m(2,3,'Cập nhật các quy tắc thưởng và trạng thái'),r(3,2,'Cấu hình đã lưu'),r(2,1,'Lưu cấu hình quy tắc thưởng thành công! (MSG06)'),r(1,0,'Hiển thị toast thành công')]]),ref('Audit bất biến cho can thiệp quản trị — §4.2.4, BR-07.'),note('BR-03: áp dụng cho hoàn thành hoạt động trong tương lai; không điều chỉnh số dư lịch sử. UC-54 dẫn BR-30 về lần hoàn thành đầu; nội dung này ở phụ lục BR-32. Không phát sinh bước cộng xu trong cấu hình.')
]);
const streakNote=note('Thuật ngữ nguồn chưa thống nhất: UC-55 gọi mốc chuỗi đăng nhập, BR-99 gọi chuỗi ngày học từ hoạt động hợp lệ. Sơ đồ chỉ quản lý cấu hình mốc theo UC-55; không suy diễn điều kiện tăng streak hoặc phát xu.');
diagram('SD-32.3','Create streak milestone',55,'Administrator',[
 m(0,1,'Chọn Thêm mốc mới'),r(1,0,'Hiển thị nhập số ngày liên tiếp và số xu thưởng'),m(0,1,'Nhập số ngày và xu; chọn Lưu mốc'),m(1,1,'Kiểm tra đầu vào phía client'),m(1,2,'Gửi số ngày và số xu của mốc'),auth('Administrator'),m(2,2,'Kiểm tra giá trị ngày / xu theo UC-55 và MSG07 (> 0)'),
 alt(['Giá trị ngày hoặc xu không hợp lệ — 3b',[r(2,1,'MSG07: giá trị ngày/xu phải lớn hơn 0'),r(1,0,'Tô đỏ ô lỗi; ngăn lưu')]],['Giá trị hợp lệ',[m(2,3,'Kiểm tra mốc đã có cùng số ngày'),r(3,2,'Kết quả kiểm tra trùng'),alt(['Trùng số ngày — 3a',[r(2,1,'Mốc ngày này đã tồn tại trong hệ thống.'),r(1,0,'Hiển thị cảnh báo; không tạo mốc trùng')]],['Chưa có mốc cùng số ngày',[m(2,3,'Tạo mốc với số ngày và số xu được nhập'),r(3,2,'Mốc đã lưu'),r(2,1,'Cập nhật thành công (MSG31)'),r(1,0,'Hiển thị thành công')]])]]),ref('Audit quản trị theo §4.2.4, BR-07.'),streakNote,note('Không tự gán trạng thái mặc định Active/Inactive cho mốc mới: UC-55 không xác định mặc định.')
]);
diagram('SD-32.4','View streak milestones',55,'Administrator',[
 ...list('Mở Cấu hình mốc chuỗi đăng nhập','Truy vấn mốc; sắp xếp số ngày mục tiêu tăng dần','Danh sách mốc theo số ngày tăng dần'),r(1,0,'Hiển thị số ngày, xu thưởng, trạng thái; số Student đạt mốc theo §3.9.4'),opt('Tìm kiếm / lọc / phân trang theo quy định quản lý chung',ref('§5.2.3: mặc định 10 hoặc 20 bản ghi/trang; kết quả rỗng hiển thị thông báo rõ ràng.')),streakNote,note('Chỉ đọc cấu hình; không cập nhật streak, không cấp thưởng. SRS không quy định nội dung chính xác của thông báo danh sách mốc rỗng.')
]);
diagram('SD-32.5','Update streak milestone',55,'Administrator',[
 ref('SD-32.4 — danh sách mốc'),m(0,1,'Chọn Sửa; đổi số xu thưởng hoặc Active/Inactive'),m(0,1,'Lưu cấu hình mốc Streak (§3.9.4)'),m(1,1,'Kiểm tra phía client'),m(1,2,'Gửi thay đổi số xu / trạng thái của mốc'),auth('Administrator'),m(2,2,'Kiểm tra giá trị xu theo UC-55 và MSG07'),alt(['Giá trị không hợp lệ',[r(2,1,'MSG07; chỉ ra ô lỗi'),r(1,0,'Tô đỏ; ngăn lưu')]],['Hợp lệ',[m(2,3,'Cập nhật xu thưởng và/hoặc Active/Inactive'),r(3,2,'Mốc đã cập nhật'),r(2,1,'Cập nhật thành công (MSG31)'),r(1,0,'Hiển thị thành công')]]),ref('Audit quản trị theo §4.2.4, BR-07.'),streakNote,note('UC-55 mô tả cập nhật số xu và trạng thái; không tự thêm khả năng đổi số ngày của mốc hiện có.')
]);
diagram('SD-32.6','Delete / disable streak milestone',55,'Administrator',[
 ref('SD-32.4 — danh sách mốc'),m(0,1,'Chọn Xóa ở mốc đã có'),m(1,2,'Yêu cầu xóa mốc'),auth('Administrator'),m(2,3,'Kiểm tra mốc đã từng được cấp thưởng cho Student hay chưa'),r(3,2,'Kết quả đã từng được cấp thưởng'),alt(['Chưa từng cấp thưởng',[m(2,3,'Xóa mốc'),r(3,2,'Mốc đã xóa')]],['Đã từng cấp thưởng',[m(2,3,'Chuyển mốc sang Inactive thay cho xóa'),r(3,2,'Mốc đã vô hiệu hóa')]]),r(2,1,'Cập nhật thành công (MSG31)'),r(1,0,'Hiển thị kết quả'),ref('Audit quản trị theo §4.2.4, BR-07.'),streakNote,note('Nhánh Delete/Inactive được UC-55 bước 5 quy định rõ. Không tự thêm hộp xác nhận, xóa lịch sử thưởng hoặc điều chỉnh ví Student.')
]);
const fields='Loại Huy hiệu/Khung/Theme, tên, mô tả, giá xu và graphic asset';
function itemForm(update){return [
 ref('SD-33.2 — danh sách vật phẩm'),m(0,1,update?'Chọn Chỉnh sửa vật phẩm':'Chọn Thêm vật phẩm mới'),r(1,0,update?'Hiển thị dữ liệu vật phẩm để chỉnh sửa':'Hiển thị biểu mẫu vật phẩm'),m(0,1,fields),m(1,1,'Trim; kiểm tra bắt buộc và giá phải là số; kiểm tra ảnh JPG/JPEG/PNG/WEBP ≤ 3 MB'),
 alt(['Thiếu bắt buộc / giá không phải số — 4a',[r(1,0,'Hiển thị lỗi bắt buộc (MSG09); yêu cầu sửa')]],['Ảnh sai định dạng / quá 3 MB — 4b',[r(1,0,'Ảnh không thuộc định dạng cho phép hoặc dung lượng lớn hơn 3MB (MSG24); chọn lại')]],['Dữ liệu / ảnh hợp lệ',[
 m(1,2,'Gửi dữ liệu và ảnh được chọn để kiểm tra'),auth('Administrator'),m(2,2,'Kiểm tra lại phía server: trường bắt buộc, kiểu giá, quy tắc ảnh'),ref('Nếu server phát hiện dữ liệu / ảnh không hợp lệ: trả lỗi MSG09/MSG24 tương ứng; không lưu thay đổi.'),
 m(2,4,'Upload graphic asset lên Cloudinary — bước 5 UC-56'),r(4,2,'Trả secure URL'),r(2,1,'Tham chiếu ảnh đã upload'),m(0,1,'Chọn Lưu vật phẩm — bước 6 UC-56'),m(1,2,'Yêu cầu lưu dữ liệu và secure URL'),m(2,3,update?'Cập nhật thông tin vật phẩm và tham chiếu ảnh':'Lưu vật phẩm và tham chiếu ảnh'),r(3,2,'Bản ghi vật phẩm đã lưu'),r(2,1,'Lưu vật phẩm thành công! (MSG08)'),r(1,0,'Hiển thị thành công')]]),ref('Audit quản trị theo §4.2.4, BR-07.'),note('Giữ thứ tự UC-56: upload trước khi chọn Lưu. UC-56 không mô tả nhánh Cloudinary lỗi, cleanup, trạng thái mặc định hoặc ràng buộc giá > 0; không tự thêm. Với Update, SRS không tách rõ trường hợp giữ nguyên ảnh nên sơ đồ thể hiện luồng chỉnh sửa có chọn asset như bước 4–5.')
];}
diagram('SD-33.1','Create store item',56,'Administrator',itemForm(false),['Cloudinary']);
diagram('SD-33.2','View store items',56,'Administrator',[
 ...list('Mở Quản lý cửa hàng đổi quà','Truy vấn danh mục quản trị gồm vật phẩm Đang bán / Ẩn và số lượt đổi','Danh sách: loại Huy hiệu/Khung/Theme, giá xu, trạng thái, redeemed count'),opt('Tìm kiếm / lọc / phân trang',m(0,1,'Nhập từ khóa / lọc trạng thái / chuyển trang (§5.2.3)'),m(1,2,'Gửi tiêu chí danh sách quản trị'),m(2,3,'Truy vấn vật phẩm theo tiêu chí'),r(3,2,'Kết quả'),alt(['Có bản ghi',[r(2,1,'Danh sách khớp tiêu chí'),r(1,0,'Làm mới danh mục')]],['Không có bản ghi',[r(2,1,'Kết quả rỗng'),r(1,0,'Hiển thị thông báo không có kết quả; SRS không ấn định câu chữ')]])),note('Chỉ đọc; không trừ xu, không đổi vật phẩm và không chỉnh inventory của Student.')
]);
diagram('SD-33.3','Update store item',56,'Administrator',itemForm(true),['Cloudinary']);
diagram('SD-33.4','Delete / hide store item',56,'Administrator',[
 note('Giới hạn nguồn cần xác nhận: tên SD trong bảng là Delete / hide; UC-56 chỉ quy định Deactivate/Hide. Phần dưới chỉ biểu diễn nhánh được SRS mô tả; không tự dựng thao tác Delete.'),
 ref('SD-33.2 — danh sách vật phẩm'),m(0,1,'Chuyển trạng thái vật phẩm sang Tạm ẩn — UC-56 7a'),m(1,2,'Yêu cầu lưu trạng thái ẩn'),auth('Administrator'),m(2,3,'Lưu trạng thái ẩn của vật phẩm'),r(3,2,'Trạng thái đã lưu'),r(2,1,'Vật phẩm đã ẩn; kết quả lưu theo UC-56'),r(1,0,'Hiển thị trạng thái Ẩn'),m(2,2,'Áp dụng ngay việc không hiển thị vật phẩm tại cửa hàng Student'),
 note('BR-04: Student đã đổi vẫn truy cập và trang bị vật phẩm trong inventory. §5.2.6: store_item đã được tham chiếu bởi giao dịch xu không được hard-delete. Không xóa inventory, không thu hồi vật phẩm và không hoàn xu.'),ref('Audit quản trị theo §4.2.4, BR-07.'),note('Không đặc tả hard-delete ngay cả khi chưa từng đổi: SRS chưa quy định thao tác đó. Cần quyết định của người dùng trước khi bổ sung.')
]);
fs.writeFileSync(out,`<mxfile host="Electron" pages="${pages.length}">${pages.join('\n')}</mxfile>`);
console.log(JSON.stringify({file:out,pages:pages.length,bytes:fs.statSync(out).size}));

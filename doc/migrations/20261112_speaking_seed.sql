-- Sample AI speaking scenarios so the speaking screens have content to practise.
-- sample_script is a JSON array of lines: {speaker: AI|STUDENT, segments: [{text, free?}], translation, hint?}.
-- "free": true marks the part a learner may replace with their own words.
-- Change @chapter_id to the chapter these scenarios belong to (default: the first published chapter).
SET @chapter_id = (SELECT id FROM chapter WHERE status = 'PUBLISHED' ORDER BY display_order, id LIMIT 1);

INSERT INTO speaking_scenario
  (chapter_id, title, situation, ai_role, student_role, max_turns, sample_script, display_order, status)
VALUES
(@chapter_id, 'Gọi món ở quán ramen',
 'Bạn vào một quán ramen ở Nhật. Nhân viên đón khách, hỏi số người và nhận gọi món.',
 'nhân viên 店員', 'khách 客', 20,
 '[
  {"speaker":"AI","segments":[{"text":"いらっしゃいませ。何名様ですか？"}],"translation":"Xin chào quý khách. Quý khách đi mấy người ạ?"},
  {"speaker":"STUDENT","segments":[{"text":"一人","free":true},{"text":"です。"}],"translation":"Tôi đi một mình.","hint":"Có thể thay: 二人 (hai người), 三人 (ba người)."},
  {"speaker":"AI","segments":[{"text":"こちらへどうぞ。ご注文はお決まりですか？"}],"translation":"Mời quý khách đi lối này. Quý khách đã chọn món chưa ạ?"},
  {"speaker":"STUDENT","segments":[{"text":"すみません。"},{"text":"ラーメン","free":true},{"text":"を"},{"text":"一つ","free":true},{"text":"お願いします。"}],"translation":"Xin lỗi, cho tôi một bát ramen.","hint":"Có thể thay món (うどん, カレー) và số lượng (二つ, 三つ)."},
  {"speaker":"AI","segments":[{"text":"かしこまりました。お飲み物はいかがですか？"}],"translation":"Vâng ạ. Quý khách có dùng đồ uống không ạ?"},
  {"speaker":"STUDENT","segments":[{"text":"お水","free":true},{"text":"をください。"}],"translation":"Cho tôi nước lọc.","hint":"Có thể thay: お茶 (trà), コーラ (cola)."},
  {"speaker":"AI","segments":[{"text":"お待たせしました。ラーメンとお水です。"}],"translation":"Xin lỗi đã để quý khách đợi. Ramen và nước của quý khách đây ạ."},
  {"speaker":"STUDENT","segments":[{"text":"ありがとうございます。","free":true}],"translation":"Cảm ơn.","hint":"Có thể cảm ơn theo cách khác, ví dụ どうも。"},
  {"speaker":"AI","segments":[{"text":"ごゆっくりどうぞ。"}],"translation":"Chúc quý khách ngon miệng."}
 ]', 1, 'PUBLISHED'),
(@chapter_id, 'Tự giới thiệu ngày đầu đi học',
 'Ngày đầu tiên ở trường tiếng Nhật, giáo viên hỏi thăm và mời bạn tự giới thiệu.',
 'giáo viên 先生', 'học viên 学生', 20,
 '[
  {"speaker":"AI","segments":[{"text":"はじめまして。お名前は何ですか？"}],"translation":"Rất vui được gặp em. Em tên là gì?"},
  {"speaker":"STUDENT","segments":[{"text":"はじめまして。"},{"text":"アン","free":true},{"text":"です。"}],"translation":"Rất vui được gặp cô. Em là An.","hint":"Thay アン bằng tên của bạn."},
  {"speaker":"AI","segments":[{"text":"お国はどちらですか？"}],"translation":"Em đến từ nước nào?"},
  {"speaker":"STUDENT","segments":[{"text":"ベトナム","free":true},{"text":"から来ました。"}],"translation":"Em đến từ Việt Nam.","hint":"Có thể nói thêm thành phố: ハノイ, ホーチミン."},
  {"speaker":"AI","segments":[{"text":"そうですか。お仕事は何ですか？"}],"translation":"Vậy à. Em làm nghề gì?"},
  {"speaker":"STUDENT","segments":[{"text":"学生","free":true},{"text":"です。"}],"translation":"Em là sinh viên.","hint":"Có thể thay: エンジニア (kỹ sư), 会社員 (nhân viên công ty)."},
  {"speaker":"AI","segments":[{"text":"これからよろしくお願いします。"}],"translation":"Từ nay mong được giúp đỡ nhé."},
  {"speaker":"STUDENT","segments":[{"text":"どうぞよろしくお願いします。"}],"translation":"Rất mong được cô giúp đỡ."}
 ]', 2, 'PUBLISHED');

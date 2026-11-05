from pathlib import Path

# Rebuild the previously agreed 112 headwords, excluding the zodiac illustration.
raw='''すし|Sushi (cơm giấm kiểu Nhật)
ちか|Tầng hầm; dưới lòng đất
くつ|Giày
さかな|Cá
にく|Thịt
ほん|Sách
がくせい|Học sinh; sinh viên
みず|Nước
だいがく|Trường đại học
ごご|Buổi chiều; sau 12 giờ trưa (PM)
しんぶん|Báo
としょかん|Thư viện
かいしゃ|Công ty
とけい|Đồng hồ
せんせい|Thầy; cô; giáo viên (cách gọi kính trọng)
きっさてん|Quán cà phê
びょういん|Bệnh viện
ぎゅうにゅう|Sữa bò
どくしょ|Đọc sách
くだもの|Trái cây
タイ|Thái Lan
テスト|Bài kiểm tra
ケーキ|Bánh ngọt
テニス|Quần vợt
カメラ|Máy ảnh
ワイン|Rượu vang
アメリカ|Mỹ; Hoa Kỳ
ブラジル|Brazil
パソコン|Máy tính cá nhân
スキー|Trượt tuyết
サッカー|Bóng đá
パン|Bánh mì
スーパー|Siêu thị
ジュース|Nước trái cây
ぎんこう|Ngân hàng
サラダ|Salad; rau trộn
きつえんじょ|Khu vực hút thuốc
けいたいでんわ|Điện thoại di động
でんしじしょ|Từ điển điện tử
けしゴム|Cục tẩy
あぶら|Dầu; mỡ
りょうり|Nấu ăn; món ăn
こうちゃ|Trà đen (hồng trà)
トイレ|Nhà vệ sinh
エスカレーター|Thang cuốn
エレベーター|Thang máy
レジ|Quầy thu ngân; máy tính tiền
レストラン|Nhà hàng
ペン|Bút
ズボン|Quần dài
カレー|Cà ri
コーヒー|Cà phê
ビール|Bia
イチゴ|Dâu tây
ロシア|Nga
オーストラリア|Úc
イタリア|Ý
テレビ|Ti vi
ベトナム|Việt Nam
にほん|Nhật Bản
かんこく|Hàn Quốc
ちゅうごく|Trung Quốc
こうこう|Trường trung học phổ thông
にほんごがっこう|Trường Nhật ngữ
きょうし|Giáo viên (tên nghề nghiệp)
かいしゃいん|Nhân viên công ty
ぎんこういん|Nhân viên ngân hàng
いしゃ|Bác sĩ
たんじょうび|Sinh nhật
しゅみ|Sở thích
すいえい|Bơi lội
えいが|Phim; điện ảnh
おんがく|Âm nhạc
りょこう|Du lịch
ATM|Máy rút tiền tự động
ひゃくえんショップ|Cửa hàng đồng giá 100 yên
こめ|Gạo
たまご|Trứng
てんいん|Nhân viên cửa hàng
いらっしゃいませ|Kính chào quý khách
ほんや|Hiệu sách
～かい|Tầng ~ (hậu tố đếm tầng)
かばん|Túi; cặp sách
Tシャツ|Áo phông; áo thun
やさい|Rau củ
リンゴ|Táo
とんかつ|Thịt lợn tẩm bột chiên xù
おちゃ|Trà; nước trà
ごぜん|Buổi sáng; trước 12 giờ trưa (AM)
たいいくかん|Nhà thi đấu; nhà thể chất
ゆうびんきょく|Bưu điện
バーベキュー|Tiệc nướng; nướng ngoài trời
はなび|Pháo hoa
はなみ|Ngắm hoa (thường là hoa anh đào)
さくら|Hoa anh đào; cây anh đào
おべんとう|Cơm hộp
おまつり|Lễ hội
いきます|Đi
かえります|Về; trở về
のみます|Uống
たべます|Ăn
みます|Xem; nhìn
コンビニ|Cửa hàng tiện lợi
チーズ|Phô mai
かいます|Mua
ききます|Nghe
はたらきます|Làm việc
よみます|Đọc
おきます|Thức dậy
ねます|Ngủ; đi ngủ
べんきょうします|Học; học tập
きます|Đến'''
lesson1=set('がくせい だいがく せんせい どくしょ タイ テニス アメリカ ブラジル サッカー りょうり ロシア オーストラリア イタリア ベトナム にほん かんこく ちゅうごく こうこう にほんごがっこう きょうし かいしゃいん ぎんこういん いしゃ たんじょうび しゅみ すいえい えいが おんがく りょこう'.split())
lesson3=set('すし ごご しんぶん としょかん かいしゃ びょういん ぎゅうにゅう くだもの テスト スキー ぎんこう サラダ テレビ ごぜん たいいくかん ゆうびんきょく バーベキュー はなび はなみ さくら おべんとう おまつり いきます かえります のみます たべます みます コンビニ チーズ かいます ききます はたらきます よみます おきます ねます べんきょうします きます'.split())
items=[]
for line in raw.splitlines():
    word,meaning=line.split('|')
    chapter=1 if word in lesson1 else 3 if word in lesson3 else 2
    reading={'ATM':'エーティーエム','Tシャツ':'ティーシャツ','けしゴム':'けしごむ'}.get(word,word)
    wordtype='Động từ' if word.endswith('ます') else 'Biểu thức chào hỏi' if word=='いらっしゃいませ' else 'Hậu tố' if word=='～かい' else 'Danh từ'
    items.append((chapter,word,reading,meaning,wordtype))
assert len(items)==112 and len({x[1] for x in items})==112
assert not any('座' in x[1] for x in items)
assert all(len(x[1])<=100 and len(x[2])<=100 and len(x[3])<=255 and len(x[4])<=50 for x in items)
assert lesson1|lesson3 <= {x[1] for x in items}
def q(x):return "'"+x.replace("'","''")+"'"
head='''-- JPD113: 112 mục từ đã thống nhất, kèm cách đọc và nghĩa tiếng Việt.
-- Đã bỏ 12 tên cung hoàng đạo trong hình minh họa. Không thêm từ mới ngoài danh sách.
-- Cấu trúc đã đối chiếu trực tiếp với MySQL jtech ngày 29/10/2026.
-- vocabulary hiện KHÔNG có audio_url/audio_public_id.
-- Tạo bài Vocab số 1 ở từng chương 1,2,3 của khóa JPD113 nếu chưa có.
-- Mỗi chương tương ứng bài 1,2,3 của tài liệu. Không gán tất cả vào lesson_id=1.
-- Trạng thái DRAFT. Giữ nguyên dữ liệu đã có, không DELETE/UPDATE/ALTER bảng thật.
-- Mở file bằng MySQL Workbench và chạy toàn bộ. Chạy lại không thêm trùng trong bài.
USE jtech;
SET NAMES utf8mb4;

DROP TEMPORARY TABLE IF EXISTS tmp_jpd113_vocab_112;
CREATE TEMPORARY TABLE tmp_jpd113_vocab_112 (
  chapter_no SMALLINT UNSIGNED NOT NULL,
  word VARCHAR(100) NOT NULL,
  reading VARCHAR(100) NOT NULL,
  meaning_vi VARCHAR(255) NOT NULL,
  word_type VARCHAR(50) NULL,
  display_order INT NOT NULL,
  PRIMARY KEY (chapter_no, word)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tmp_jpd113_vocab_112
(chapter_no, word, reading, meaning_vi, word_type, display_order)
VALUES
'''
values=[]
counts={1:0,2:0,3:0}
for chapter,word,reading,meaning,wordtype in sorted(items,key=lambda x:x[0]):
    counts[chapter]+=1
    values.append('('+str(chapter)+', '+', '.join(map(q,[word,reading,meaning,wordtype]))+', '+str(counts[chapter])+')')
tail=''';

START TRANSACTION;

INSERT INTO lesson (chapter_id, skill_type, lesson_no, title, description, display_order, status)
SELECT ch.id, 'VOCABULARY', 1,
       CONCAT('Từ vựng bài ', ch.chapter_no),
       'Từ vựng trích từ slide JPD113, kèm nghĩa tiếng Việt.',
       1, 'DRAFT'
FROM chapter ch
JOIN course co ON co.id=ch.course_id AND co.code='JPD113'
WHERE ch.chapter_no IN (1,2,3)
  AND NOT EXISTS (
    SELECT 1 FROM lesson l
    WHERE l.chapter_id=ch.id AND l.skill_type='VOCABULARY' AND l.lesson_no=1
  );

INSERT INTO vocabulary
(lesson_id, word, reading, meaning_vi, word_type, display_order, status)
SELECT target.lesson_id, src.word, src.reading, src.meaning_vi,
       src.word_type, src.display_order, 'DRAFT'
FROM tmp_jpd113_vocab_112 src
JOIN (
  SELECT ch.chapter_no, MIN(l.id) AS lesson_id
  FROM course co
  JOIN chapter ch ON ch.course_id=co.id
  JOIN lesson l ON l.chapter_id=ch.id AND l.skill_type='VOCABULARY' AND l.lesson_no=1
  WHERE co.code='JPD113' AND ch.chapter_no IN (1,2,3)
  GROUP BY ch.chapter_no
) target ON target.chapter_no=src.chapter_no
WHERE NOT EXISTS (
  SELECT 1 FROM vocabulary v
  WHERE v.lesson_id=target.lesson_id AND v.word=src.word
);

SELECT ROW_COUNT() AS so_tu_vua_them;
COMMIT;

SELECT ch.chapter_no, l.id AS lesson_id, l.title, COUNT(v.id) AS so_tu
FROM course co
JOIN chapter ch ON ch.course_id=co.id
JOIN lesson l ON l.chapter_id=ch.id AND l.skill_type='VOCABULARY' AND l.lesson_no=1
LEFT JOIN vocabulary v ON v.lesson_id=l.id
WHERE co.code='JPD113' AND ch.chapter_no IN (1,2,3)
GROUP BY ch.chapter_no,l.id,l.title
ORDER BY ch.chapter_no,l.id;

DROP TEMPORARY TABLE tmp_jpd113_vocab_112;
'''
output=Path(__file__).with_name('JPD113_vocab_112.sql')
output.write_text(head+',\n'.join(values)+tail,encoding='utf-8-sig')
print(f'Created {output}: {len(items)} words. Chapters: {counts}')

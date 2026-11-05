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
(1, 'がくせい', 'がくせい', 'Học sinh; sinh viên', 'Danh từ', 1),
(1, 'だいがく', 'だいがく', 'Trường đại học', 'Danh từ', 2),
(1, 'せんせい', 'せんせい', 'Thầy; cô; giáo viên (cách gọi kính trọng)', 'Danh từ', 3),
(1, 'どくしょ', 'どくしょ', 'Đọc sách', 'Danh từ', 4),
(1, 'タイ', 'タイ', 'Thái Lan', 'Danh từ', 5),
(1, 'テニス', 'テニス', 'Quần vợt', 'Danh từ', 6),
(1, 'アメリカ', 'アメリカ', 'Mỹ; Hoa Kỳ', 'Danh từ', 7),
(1, 'ブラジル', 'ブラジル', 'Brazil', 'Danh từ', 8),
(1, 'サッカー', 'サッカー', 'Bóng đá', 'Danh từ', 9),
(1, 'りょうり', 'りょうり', 'Nấu ăn; món ăn', 'Danh từ', 10),
(1, 'ロシア', 'ロシア', 'Nga', 'Danh từ', 11),
(1, 'オーストラリア', 'オーストラリア', 'Úc', 'Danh từ', 12),
(1, 'イタリア', 'イタリア', 'Ý', 'Danh từ', 13),
(1, 'ベトナム', 'ベトナム', 'Việt Nam', 'Danh từ', 14),
(1, 'にほん', 'にほん', 'Nhật Bản', 'Danh từ', 15),
(1, 'かんこく', 'かんこく', 'Hàn Quốc', 'Danh từ', 16),
(1, 'ちゅうごく', 'ちゅうごく', 'Trung Quốc', 'Danh từ', 17),
(1, 'こうこう', 'こうこう', 'Trường trung học phổ thông', 'Danh từ', 18),
(1, 'にほんごがっこう', 'にほんごがっこう', 'Trường Nhật ngữ', 'Danh từ', 19),
(1, 'きょうし', 'きょうし', 'Giáo viên (tên nghề nghiệp)', 'Danh từ', 20),
(1, 'かいしゃいん', 'かいしゃいん', 'Nhân viên công ty', 'Danh từ', 21),
(1, 'ぎんこういん', 'ぎんこういん', 'Nhân viên ngân hàng', 'Danh từ', 22),
(1, 'いしゃ', 'いしゃ', 'Bác sĩ', 'Danh từ', 23),
(1, 'たんじょうび', 'たんじょうび', 'Sinh nhật', 'Danh từ', 24),
(1, 'しゅみ', 'しゅみ', 'Sở thích', 'Danh từ', 25),
(1, 'すいえい', 'すいえい', 'Bơi lội', 'Danh từ', 26),
(1, 'えいが', 'えいが', 'Phim; điện ảnh', 'Danh từ', 27),
(1, 'おんがく', 'おんがく', 'Âm nhạc', 'Danh từ', 28),
(1, 'りょこう', 'りょこう', 'Du lịch', 'Danh từ', 29),
(2, 'ちか', 'ちか', 'Tầng hầm; dưới lòng đất', 'Danh từ', 1),
(2, 'くつ', 'くつ', 'Giày', 'Danh từ', 2),
(2, 'さかな', 'さかな', 'Cá', 'Danh từ', 3),
(2, 'にく', 'にく', 'Thịt', 'Danh từ', 4),
(2, 'ほん', 'ほん', 'Sách', 'Danh từ', 5),
(2, 'みず', 'みず', 'Nước', 'Danh từ', 6),
(2, 'とけい', 'とけい', 'Đồng hồ', 'Danh từ', 7),
(2, 'きっさてん', 'きっさてん', 'Quán cà phê', 'Danh từ', 8),
(2, 'ケーキ', 'ケーキ', 'Bánh ngọt', 'Danh từ', 9),
(2, 'カメラ', 'カメラ', 'Máy ảnh', 'Danh từ', 10),
(2, 'ワイン', 'ワイン', 'Rượu vang', 'Danh từ', 11),
(2, 'パソコン', 'パソコン', 'Máy tính cá nhân', 'Danh từ', 12),
(2, 'パン', 'パン', 'Bánh mì', 'Danh từ', 13),
(2, 'スーパー', 'スーパー', 'Siêu thị', 'Danh từ', 14),
(2, 'ジュース', 'ジュース', 'Nước trái cây', 'Danh từ', 15),
(2, 'きつえんじょ', 'きつえんじょ', 'Khu vực hút thuốc', 'Danh từ', 16),
(2, 'けいたいでんわ', 'けいたいでんわ', 'Điện thoại di động', 'Danh từ', 17),
(2, 'でんしじしょ', 'でんしじしょ', 'Từ điển điện tử', 'Danh từ', 18),
(2, 'けしゴム', 'けしごむ', 'Cục tẩy', 'Danh từ', 19),
(2, 'あぶら', 'あぶら', 'Dầu; mỡ', 'Danh từ', 20),
(2, 'こうちゃ', 'こうちゃ', 'Trà đen (hồng trà)', 'Danh từ', 21),
(2, 'トイレ', 'トイレ', 'Nhà vệ sinh', 'Danh từ', 22),
(2, 'エスカレーター', 'エスカレーター', 'Thang cuốn', 'Danh từ', 23),
(2, 'エレベーター', 'エレベーター', 'Thang máy', 'Danh từ', 24),
(2, 'レジ', 'レジ', 'Quầy thu ngân; máy tính tiền', 'Danh từ', 25),
(2, 'レストラン', 'レストラン', 'Nhà hàng', 'Danh từ', 26),
(2, 'ペン', 'ペン', 'Bút', 'Danh từ', 27),
(2, 'ズボン', 'ズボン', 'Quần dài', 'Danh từ', 28),
(2, 'カレー', 'カレー', 'Cà ri', 'Danh từ', 29),
(2, 'コーヒー', 'コーヒー', 'Cà phê', 'Danh từ', 30),
(2, 'ビール', 'ビール', 'Bia', 'Danh từ', 31),
(2, 'イチゴ', 'イチゴ', 'Dâu tây', 'Danh từ', 32),
(2, 'ATM', 'エーティーエム', 'Máy rút tiền tự động', 'Danh từ', 33),
(2, 'ひゃくえんショップ', 'ひゃくえんショップ', 'Cửa hàng đồng giá 100 yên', 'Danh từ', 34),
(2, 'こめ', 'こめ', 'Gạo', 'Danh từ', 35),
(2, 'たまご', 'たまご', 'Trứng', 'Danh từ', 36),
(2, 'てんいん', 'てんいん', 'Nhân viên cửa hàng', 'Danh từ', 37),
(2, 'いらっしゃいませ', 'いらっしゃいませ', 'Kính chào quý khách', 'Biểu thức chào hỏi', 38),
(2, 'ほんや', 'ほんや', 'Hiệu sách', 'Danh từ', 39),
(2, '～かい', '～かい', 'Tầng ~ (hậu tố đếm tầng)', 'Hậu tố', 40),
(2, 'かばん', 'かばん', 'Túi; cặp sách', 'Danh từ', 41),
(2, 'Tシャツ', 'ティーシャツ', 'Áo phông; áo thun', 'Danh từ', 42),
(2, 'やさい', 'やさい', 'Rau củ', 'Danh từ', 43),
(2, 'リンゴ', 'リンゴ', 'Táo', 'Danh từ', 44),
(2, 'とんかつ', 'とんかつ', 'Thịt lợn tẩm bột chiên xù', 'Danh từ', 45),
(2, 'おちゃ', 'おちゃ', 'Trà; nước trà', 'Danh từ', 46),
(3, 'すし', 'すし', 'Sushi (cơm giấm kiểu Nhật)', 'Danh từ', 1),
(3, 'ごご', 'ごご', 'Buổi chiều; sau 12 giờ trưa (PM)', 'Danh từ', 2),
(3, 'しんぶん', 'しんぶん', 'Báo', 'Danh từ', 3),
(3, 'としょかん', 'としょかん', 'Thư viện', 'Danh từ', 4),
(3, 'かいしゃ', 'かいしゃ', 'Công ty', 'Danh từ', 5),
(3, 'びょういん', 'びょういん', 'Bệnh viện', 'Danh từ', 6),
(3, 'ぎゅうにゅう', 'ぎゅうにゅう', 'Sữa bò', 'Danh từ', 7),
(3, 'くだもの', 'くだもの', 'Trái cây', 'Danh từ', 8),
(3, 'テスト', 'テスト', 'Bài kiểm tra', 'Danh từ', 9),
(3, 'スキー', 'スキー', 'Trượt tuyết', 'Danh từ', 10),
(3, 'ぎんこう', 'ぎんこう', 'Ngân hàng', 'Danh từ', 11),
(3, 'サラダ', 'サラダ', 'Salad; rau trộn', 'Danh từ', 12),
(3, 'テレビ', 'テレビ', 'Ti vi', 'Danh từ', 13),
(3, 'ごぜん', 'ごぜん', 'Buổi sáng; trước 12 giờ trưa (AM)', 'Danh từ', 14),
(3, 'たいいくかん', 'たいいくかん', 'Nhà thi đấu; nhà thể chất', 'Danh từ', 15),
(3, 'ゆうびんきょく', 'ゆうびんきょく', 'Bưu điện', 'Danh từ', 16),
(3, 'バーベキュー', 'バーベキュー', 'Tiệc nướng; nướng ngoài trời', 'Danh từ', 17),
(3, 'はなび', 'はなび', 'Pháo hoa', 'Danh từ', 18),
(3, 'はなみ', 'はなみ', 'Ngắm hoa (thường là hoa anh đào)', 'Danh từ', 19),
(3, 'さくら', 'さくら', 'Hoa anh đào; cây anh đào', 'Danh từ', 20),
(3, 'おべんとう', 'おべんとう', 'Cơm hộp', 'Danh từ', 21),
(3, 'おまつり', 'おまつり', 'Lễ hội', 'Danh từ', 22),
(3, 'いきます', 'いきます', 'Đi', 'Động từ', 23),
(3, 'かえります', 'かえります', 'Về; trở về', 'Động từ', 24),
(3, 'のみます', 'のみます', 'Uống', 'Động từ', 25),
(3, 'たべます', 'たべます', 'Ăn', 'Động từ', 26),
(3, 'みます', 'みます', 'Xem; nhìn', 'Động từ', 27),
(3, 'コンビニ', 'コンビニ', 'Cửa hàng tiện lợi', 'Danh từ', 28),
(3, 'チーズ', 'チーズ', 'Phô mai', 'Danh từ', 29),
(3, 'かいます', 'かいます', 'Mua', 'Động từ', 30),
(3, 'ききます', 'ききます', 'Nghe', 'Động từ', 31),
(3, 'はたらきます', 'はたらきます', 'Làm việc', 'Động từ', 32),
(3, 'よみます', 'よみます', 'Đọc', 'Động từ', 33),
(3, 'おきます', 'おきます', 'Thức dậy', 'Động từ', 34),
(3, 'ねます', 'ねます', 'Ngủ; đi ngủ', 'Động từ', 35),
(3, 'べんきょうします', 'べんきょうします', 'Học; học tập', 'Động từ', 36),
(3, 'きます', 'きます', 'Đến', 'Động từ', 37);

START TRANSACTION;

EXPLAIN INSERT INTO lesson (chapter_id, skill_type, lesson_no, title, description, display_order, status)
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

EXPLAIN INSERT INTO vocabulary
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

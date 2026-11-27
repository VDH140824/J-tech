-- MySQL 8.0+: run after 20261122_listening_reading_schema.sql on the J-Tech database.
-- Seeds, for every chapter of JPD113 (chapters 1-3) and JPD123 (chapters 4-7):
--   * one LISTENING lesson (lesson_no 1) with one listening_exercise (script read by browser TTS)
--     and 4 MCQ questions (skill LISTENING, answer_data {"options":{A..D},"correctAnswer":X});
--   * one READING lesson (lesson_no 1) used as the entry point of the AI Reading generator.
-- Rows are matched by course.code + chapter_no and skipped when they already exist,
-- so the script is safe to rerun. No existing row is modified.

START TRANSACTION;

INSERT INTO lesson (chapter_id, skill_type, lesson_no, title, description, display_order, status)
SELECT ch.id, seed.skill_type, 1, seed.title, seed.description, seed.display_order, 'PUBLISHED'
FROM (
    SELECT 'JPD113' AS course_code, 1 AS chapter_no, 'LISTENING' AS skill_type, 'Nghe hiểu bài 1' AS title, 'Hội thoại giới thiệu bản thân, nghề nghiệp, sở thích.' AS description, 10 AS display_order
    UNION ALL SELECT 'JPD113', 2, 'LISTENING', 'Nghe hiểu bài 2', 'Hội thoại mua sắm và hỏi vị trí.', 10
    UNION ALL SELECT 'JPD113', 3, 'LISTENING', 'Nghe hiểu bài 3', 'Hội thoại về giờ giấc, lịch trình, thói quen.', 10
    UNION ALL SELECT 'JPD123', 4, 'LISTENING', 'Nghe hiểu bài 4', 'Hội thoại về quê hương, thời tiết và vị trí.', 10
    UNION ALL SELECT 'JPD123', 5, 'LISTENING', 'Nghe hiểu bài 5', 'Hội thoại về ngày nghỉ, cảm nhận và mong muốn.', 10
    UNION ALL SELECT 'JPD123', 6, 'LISTENING', 'Nghe hiểu bài 6', 'Hội thoại rủ rê, hẹn gặp và so sánh.', 10
    UNION ALL SELECT 'JPD123', 7, 'LISTENING', 'Nghe hiểu bài 7', 'Hội thoại ở nhà bạn: vị trí, nhờ vả, giúp đỡ.', 10
    UNION ALL SELECT 'JPD113', 1, 'READING', 'Đọc hiểu AI bài 1', 'AI tạo bài đọc từ từ vựng, ngữ pháp, kanji của bài 1.', 11
    UNION ALL SELECT 'JPD113', 2, 'READING', 'Đọc hiểu AI bài 2', 'AI tạo bài đọc từ từ vựng, ngữ pháp, kanji của bài 2.', 11
    UNION ALL SELECT 'JPD113', 3, 'READING', 'Đọc hiểu AI bài 3', 'AI tạo bài đọc từ từ vựng, ngữ pháp, kanji của bài 3.', 11
    UNION ALL SELECT 'JPD123', 4, 'READING', 'Đọc hiểu AI bài 4', 'AI tạo bài đọc từ từ vựng, ngữ pháp, kanji của bài 4.', 11
    UNION ALL SELECT 'JPD123', 5, 'READING', 'Đọc hiểu AI bài 5', 'AI tạo bài đọc từ từ vựng, ngữ pháp, kanji của bài 5.', 11
    UNION ALL SELECT 'JPD123', 6, 'READING', 'Đọc hiểu AI bài 6', 'AI tạo bài đọc từ từ vựng, ngữ pháp, kanji của bài 6.', 11
    UNION ALL SELECT 'JPD123', 7, 'READING', 'Đọc hiểu AI bài 7', 'AI tạo bài đọc từ từ vựng, ngữ pháp, kanji của bài 7.', 11
) AS seed
JOIN course AS c ON c.code = seed.course_code
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = seed.chapter_no
WHERE NOT EXISTS (
    SELECT 1 FROM lesson AS l
    WHERE l.chapter_id = ch.id AND l.skill_type = seed.skill_type AND l.lesson_no = 1
);

INSERT INTO listening_exercise (chapter_id, lesson_id, title, script_jp, script_vi, display_order, status)
SELECT ch.id, l.id, seed.title, seed.script_jp, seed.script_vi, 1, 'PUBLISHED'
FROM (
    SELECT 'JPD113' AS course_code, 1 AS chapter_no, 'はじめまして' AS title,
      'はじめまして。わたしはリンです。ベトナムからきました。だいがくせいです。\nはじめまして。たなかです。かいしゃいんです。どうぞよろしく。\nたなかさんのしゅみはなんですか。\nサッカーです。リンさんは？\nわたしのしゅみはりょうりです。' AS script_jp,
      'Linh: Rất vui được gặp anh. Tôi là Linh. Tôi đến từ Việt Nam. Tôi là sinh viên đại học.\nTanaka: Rất vui được gặp chị. Tôi là Tanaka. Tôi là nhân viên công ty. Rất mong được giúp đỡ.\nLinh: Sở thích của anh Tanaka là gì?\nTanaka: Là bóng đá. Còn chị Linh?\nLinh: Sở thích của tôi là nấu ăn.' AS script_vi
    UNION ALL SELECT 'JPD113', 2, 'デパートで',
      'いらっしゃいませ。\nすみません、このかばんはいくらですか。\n3000えんです。\nじゃ、これをください。それから、トイレはどこですか。\nトイレはあそこです。エレベーターのとなりです。\nレストランはなんがいですか。\n7かいです。',
      'Nhân viên: Xin mời quý khách.\nKhách: Xin lỗi, cái túi này bao nhiêu tiền?\nNhân viên: 3000 yên.\nKhách: Vậy cho tôi cái này. Còn nữa, nhà vệ sinh ở đâu?\nNhân viên: Nhà vệ sinh ở đằng kia. Bên cạnh thang máy.\nKhách: Nhà hàng ở tầng mấy?\nNhân viên: Tầng 7.'
    UNION ALL SELECT 'JPD113', 3, 'マイさんのいちにち',
      'マイさん、まいあさなんじにおきますか。\n6じにおきます。7じはんにがっこうへいきます。\nなんじまでべんきょうしますか。\nごご4じまでです。それから、としょかんでべんきょうします。\nどようびはなにをしますか。\nともだちとえいがをみます。',
      'A: Chị Mai, mỗi sáng chị dậy lúc mấy giờ?\nMai: Tôi dậy lúc 6 giờ. 7 giờ rưỡi tôi đi đến trường.\nA: Chị học đến mấy giờ?\nMai: Đến 4 giờ chiều. Sau đó tôi học ở thư viện.\nA: Thứ bảy chị làm gì?\nMai: Tôi xem phim với bạn.'
    UNION ALL SELECT 'JPD123', 4, 'わたしのまち',
      'ハンさんのまちはどんなまちですか。\nダナンです。きれいなまちです。うみがあります。\nてんきはどうですか。\nなつはとてもあついです。でも、ふゆはあまりさむくないです。\nハンさんのうちはどこにありますか。\nうみのちかくにあります。',
      'A: Thành phố của anh Hân là thành phố như thế nào?\nHân: Là Đà Nẵng. Là một thành phố đẹp. Có biển.\nA: Thời tiết thế nào?\nHân: Mùa hè rất nóng. Nhưng mùa đông không lạnh lắm.\nA: Nhà anh Hân ở đâu?\nHân: Ở gần biển.'
    UNION ALL SELECT 'JPD123', 5, 'やすみのひ',
      'やすみのひ、なにをしましたか。\nきょうとへいきました。おてらをみました。\nどうでしたか。\nとてもたのしかったです。でも、ひとがおおかったです。\nつぎのやすみはなにをしたいですか。\nやまへいきたいです。しずかですから。',
      'A: Ngày nghỉ bạn đã làm gì?\nB: Tôi đã đi Kyoto. Tôi đã ngắm chùa.\nA: Thấy thế nào?\nB: Rất vui. Nhưng đông người.\nA: Kỳ nghỉ tới bạn muốn làm gì?\nB: Tôi muốn đi núi. Vì ở đó yên tĩnh.'
    UNION ALL SELECT 'JPD123', 6, 'いっしょにいきませんか',
      'キムさん、こんどのにちようび、いっしょにえいがをみませんか。\nいいですね。みましょう。\nどこであいましょうか。\nえきのまえであいましょう。10じはどうですか。\nいいですよ。ところで、キムさんはえいがとコンサートとどちらがすきですか。\nコンサートのほうがすきです。',
      'A: Chị Kim, chủ nhật tới cùng đi xem phim không?\nKim: Hay quá. Đi xem nhé.\nA: Gặp nhau ở đâu nhỉ?\nKim: Gặp ở trước nhà ga đi. 10 giờ được không?\nA: Được đấy. À này, chị Kim thích phim hay buổi hòa nhạc hơn?\nKim: Tôi thích buổi hòa nhạc hơn.'
    UNION ALL SELECT 'JPD123', 7, 'ともだちのうちで',
      'どうぞ、はいってください。\nおじゃまします。わあ、ひろいへやですね。\nありがとう。ここにすわってください。おちゃをいれます。\nてつだいましょうか。\nじゃ、つくえのうえのコップをとってください。\nはい。あ、ねこがいすのしたにいますね。',
      'A: Mời vào.\nB: Tôi xin phép. Ồ, căn phòng rộng quá nhỉ.\nA: Cảm ơn. Bạn ngồi ở đây nhé. Tôi đi pha trà.\nB: Để tôi giúp nhé?\nA: Vậy bạn lấy giúp tôi cái cốc trên bàn.\nB: Vâng. A, con mèo ở dưới ghế kìa.'
) AS seed
JOIN course AS c ON c.code = seed.course_code
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = seed.chapter_no
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'LISTENING' AND l.lesson_no = 1
WHERE NOT EXISTS (SELECT 1 FROM listening_exercise AS le WHERE le.lesson_id = l.id);

-- MySQL string literals treat \n as a newline, so scripts above keep one sentence per line.

INSERT INTO question (skill, question_type, lesson_id, listening_exercise_id, content, explanation,
                      answer_data, difficulty, is_exercise_question, display_order, status)
SELECT 'LISTENING', 'MCQ', l.id, le.id, seed.content, seed.explanation,
       JSON_OBJECT('options', JSON_OBJECT('A', seed.a, 'B', seed.b, 'C', seed.c, 'D', seed.d),
                   'correctAnswer', seed.correct_answer),
       'EASY', TRUE, seed.display_order, 'ACTIVE'
FROM (
    SELECT 'JPD113' AS course_code, 1 AS chapter_no, 1 AS display_order, 'リンさんはどこからきましたか。' AS content,
           'にほん' AS a, 'ベトナム' AS b, 'ちゅうごく' AS c, 'かんこく' AS d, 'B' AS correct_answer,
           'Linh nói 「ベトナムからきました」: tôi đến từ Việt Nam.' AS explanation
    UNION ALL SELECT 'JPD113', 1, 2, 'たなかさんのしごとはなんですか。', 'だいがくせい', 'せんせい', 'かいしゃいん', 'いしゃ', 'C',
           '「かいしゃいんです」 nghĩa là "tôi là nhân viên công ty".'
    UNION ALL SELECT 'JPD113', 1, 3, 'たなかさんのしゅみはなんですか。', 'りょうり', 'サッカー', 'どくしょ', 'おんがく', 'B',
           'Tanaka trả lời 「サッカーです」: bóng đá.'
    UNION ALL SELECT 'JPD113', 1, 4, 'リンさんのしゅみはなんですか。', 'りょうり', 'サッカー', 'りょこう', 'えいが', 'A',
           '「わたしのしゅみはりょうりです」: sở thích của tôi là nấu ăn.'

    UNION ALL SELECT 'JPD113', 2, 1, 'おきゃくさんはなにのねだんをききましたか。', 'かさ', 'とけい', 'かばん', 'くつ', 'C',
           '「このかばんはいくらですか」: cái túi này bao nhiêu tiền?'
    UNION ALL SELECT 'JPD113', 2, 2, 'それはいくらですか。', '300えん', '3000えん', '13000えん', '30000えん', 'B',
           'Nhân viên nói 「3000えんです」.'
    UNION ALL SELECT 'JPD113', 2, 3, 'トイレはどこですか。', 'エレベーターのとなり', 'レストランのまえ', '7かい', 'レジのとなり', 'A',
           '「エレベーターのとなりです」: bên cạnh thang máy.'
    UNION ALL SELECT 'JPD113', 2, 4, 'レストランはなんがいですか。', '1かい', '4かい', '6かい', '7かい', 'D',
           '「7かいです」: tầng 7.'

    UNION ALL SELECT 'JPD113', 3, 1, 'マイさんはまいあさなんじにおきますか。', '5じ', '6じ', '7じ', '7じはん', 'B',
           '「6じにおきます」: tôi dậy lúc 6 giờ.'
    UNION ALL SELECT 'JPD113', 3, 2, 'マイさんはなんじにがっこうへいきますか。', '6じ', '6じはん', '7じ', '7じはん', 'D',
           '「7じはんにがっこうへいきます」: 7 giờ rưỡi đi đến trường.'
    UNION ALL SELECT 'JPD113', 3, 3, 'マイさんはごご4じから、なにをしますか。', 'うちへかえります', 'としょかんでべんきょうします', 'アルバイトをします', 'スポーツをします', 'B',
           '「それから、としょかんでべんきょうします」: sau đó học ở thư viện.'
    UNION ALL SELECT 'JPD113', 3, 4, 'マイさんはどようびになにをしますか。', 'ともだちとえいがをみます', 'かいものをします', 'がっこうでべんきょうします', 'うちでりょうりをします', 'A',
           '「ともだちとえいがをみます」: xem phim với bạn.'

    UNION ALL SELECT 'JPD123', 4, 1, 'ハンさんのまちはどこですか。', 'ハノイ', 'フエ', 'ダナン', 'ホーチミン', 'C',
           '「ダナンです」: là Đà Nẵng.'
    UNION ALL SELECT 'JPD123', 4, 2, 'ハンさんのまちはどんなまちですか。', 'きれいで、うみがあります', 'にぎやかで、ひとがおおいです', 'ちいさくて、やまがあります', 'あたらしくて、かわがあります', 'A',
           '「きれいなまちです。うみがあります」: thành phố đẹp, có biển.'
    UNION ALL SELECT 'JPD123', 4, 3, 'ふゆはどうですか。', 'とてもさむいです', 'あまりさむくないです', 'とてもあついです', 'よくあめがふります', 'B',
           '「ふゆはあまりさむくないです」: mùa đông không lạnh lắm.'
    UNION ALL SELECT 'JPD123', 4, 4, 'ハンさんのうちはどこにありますか。', 'えきのちかく', 'やまのちかく', 'うみのちかく', 'がっこうのちかく', 'C',
           '「うみのちかくにあります」: ở gần biển.'

    UNION ALL SELECT 'JPD123', 5, 1, 'やすみのひ、どこへいきましたか。', 'とうきょう', 'きょうと', 'おおさか', 'やま', 'B',
           '「きょうとへいきました」: đã đi Kyoto.'
    UNION ALL SELECT 'JPD123', 5, 2, 'りょこうはどうでしたか。', 'とてもたのしかったです', 'つかれました', 'つまらなかったです', 'あまりたのしくなかったです', 'A',
           '「とてもたのしかったです」: rất vui.'
    UNION ALL SELECT 'JPD123', 5, 3, 'なにがよくなかったですか。', 'あめがふりました', 'たかかったです', 'ひとがおおかったです', 'りょうりがおいしくなかったです', 'C',
           '「ひとがおおかったです」: đông người.'
    UNION ALL SELECT 'JPD123', 5, 4, 'つぎのやすみはなにをしたいですか。どうしてですか。', 'うみへいきたいです。すずしいですから。', 'やまへいきたいです。しずかですから。', 'うちにいたいです。つかれましたから。', 'きょうとへいきたいです。きれいですから。', 'B',
           '「やまへいきたいです。しずかですから」: muốn đi núi vì yên tĩnh.'

    UNION ALL SELECT 'JPD123', 6, 1, 'ふたりはいっしょになにをしますか。', 'しょくじをします', 'えいがをみます', 'コンサートへいきます', 'かいものをします', 'B',
           '「いっしょにえいがをみませんか」: cùng xem phim không?'
    UNION ALL SELECT 'JPD123', 6, 2, 'ふたりはいつあいますか。', 'どようび', 'にちようび', 'きんようび', 'きょう', 'B',
           '「こんどのにちようび」: chủ nhật tới.'
    UNION ALL SELECT 'JPD123', 6, 3, 'ふたりはどこで、なんじにあいますか。', 'えきのまえで、10じに', 'えいがかんで、10じに', 'えきのまえで、2じに', 'がっこうで、9じに', 'A',
           '「えきのまえであいましょう。10じはどうですか」.'
    UNION ALL SELECT 'JPD123', 6, 4, 'キムさんはえいがとコンサートとどちらがすきですか。', 'えいがのほうがすきです', 'コンサートのほうがすきです', 'どちらもすきです', 'どちらもすきじゃありません', 'B',
           '「コンサートのほうがすきです」: thích buổi hòa nhạc hơn.'

    UNION ALL SELECT 'JPD123', 7, 1, 'へやはどうですか。', 'せまいです', 'ひろいです', 'ふるいです', 'くらいです', 'B',
           '「ひろいへやですね」: căn phòng rộng nhỉ.'
    UNION ALL SELECT 'JPD123', 7, 2, 'おちゃをいれるとき、おきゃくさんはなんといいましたか。', 'しつれいします', 'てつだいましょうか', 'みずをください', 'みちをおしえてください', 'B',
           '「てつだいましょうか」: để tôi giúp nhé?'
    UNION ALL SELECT 'JPD123', 7, 3, 'なにをとってくださいといいましたか。', 'つくえのうえのコップ', 'いす', 'ちゃわん', 'つくえのしたのコップ', 'A',
           '「つくえのうえのコップをとってください」: lấy giúp cái cốc trên bàn.'
    UNION ALL SELECT 'JPD123', 7, 4, 'ねこはどこにいますか。', 'つくえのうえ', 'いすのうえ', 'いすのした', 'ドアのそば', 'C',
           '「ねこがいすのしたにいますね」: con mèo ở dưới ghế.'
) AS seed
JOIN course AS c ON c.code = seed.course_code
JOIN chapter AS ch ON ch.course_id = c.id AND ch.chapter_no = seed.chapter_no
JOIN lesson AS l ON l.chapter_id = ch.id AND l.skill_type = 'LISTENING' AND l.lesson_no = 1
JOIN listening_exercise AS le ON le.lesson_id = l.id
WHERE NOT EXISTS (
    SELECT 1 FROM question AS q
    WHERE q.listening_exercise_id = le.id AND q.display_order = seed.display_order
);

COMMIT;

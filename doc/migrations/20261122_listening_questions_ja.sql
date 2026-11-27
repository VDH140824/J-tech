-- MySQL 8.0+: run once, after 20261122_listening_seed.sql has already been applied.
-- Rewrites the content and A-D options of the seeded listening questions in Japanese
-- (explanations stay in Vietnamese). The correct letter of every question is unchanged.
-- Rows are matched by course.code + chapter_no + LISTENING lesson 1 + question display_order,
-- so the script is safe to rerun. Questions edited by hand after seeding are overwritten too.

START TRANSACTION;

UPDATE question AS q
JOIN listening_exercise AS le ON le.id = q.listening_exercise_id
JOIN lesson AS l ON l.id = le.lesson_id AND l.skill_type = 'LISTENING' AND l.lesson_no = 1
JOIN chapter AS ch ON ch.id = l.chapter_id
JOIN course AS c ON c.id = ch.course_id
JOIN (
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
) AS seed ON seed.course_code = c.code AND seed.chapter_no = ch.chapter_no
         AND seed.display_order = q.display_order
SET q.content = seed.content,
    q.answer_data = JSON_OBJECT('options', JSON_OBJECT('A', seed.a, 'B', seed.b, 'C', seed.c, 'D', seed.d),
                                'correctAnswer', seed.correct_answer)
-- q.id > 0 keeps MySQL Workbench safe-update mode satisfied.
WHERE q.skill = 'LISTENING' AND q.id > 0;

COMMIT;

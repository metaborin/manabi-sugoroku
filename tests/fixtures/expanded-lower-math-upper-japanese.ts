// Independent review answers, derived from the stated problem, not question.answer.
// Math comments record the calculation or defining property used for the check.
export const reviewedAnswers: Record<string, string> = {
  'g1-m11': '13', // 12 + 1 = 13; 13 + 1 = 14.
  'g1-m12': '12', // max(8, 12, 9) = 12.
  'g1-m13': 'みどり', // The explicitly listed third item is green.
  'g1-m14': 'あおい たま', // Blue 9 > red 7.
  'g1-m15': '8', // 6 + 2 = 8; 8 + 2 = 10.
  'g1-m16': '13こ', // 10 + 3 = 13.
  'g1-m17': '2つ', // 20 = 10 + 10.
  'g1-m18': '2つ', // 26 = 2 tens + 6 ones.
  'g1-m19': '30', // 10 + 10 + 10 = 30.
  'g1-m20': '7こ', // 17 - 10 = 7.
  'g1-m21': 'さんかく', // A triangle has three corners; a quadrilateral four; a circle none.
  'g1-m22': '4つ', // Four-sided flat shape: four corners.
  'g1-m23': '0こ', // A circle has no sharp corner.
  'g1-m24': 'ころがる', // A ball-shaped solid can roll on its curved surface.
  'g1-m25': 'まる', // Tracing the circular flat end of a cylinder produces a circle.
  'g1-m26': 'かたほうの はしを そろえる', // Compare lengths by aligning one endpoint.
  'g1-m27': '5こぶん', // With the same unit length, 5 units > 3 units.
  'g1-m28': '6ぱいぶん', // With the same filled cup, 6 cupfuls > 4 cupfuls.
  'g1-m29': '6まいぶん', // Equal non-overlapping paper areas: 6A > 4A.
  'g1-m30': 'おなじ コップで なんばい はいるか しらべる', // Compare capacities with the same volume unit.

  'g2-m11': '342', // 3 * 100 + 4 * 10 + 2 = 342.
  'g2-m12': '0', // 508 = 5 hundreds + 0 tens + 8 ones.
  'g2-m13': '1000', // Ten groups of 100 total 1000.
  'g2-m14': '407', // 407 < 470 < 704.
  'g2-m15': '300', // 290 + 10 = 300; 300 + 10 = 310.
  'g2-m16': 'さんかくけい', // A plane shape enclosed by three straight sides is a triangle.
  'g2-m17': 'ちょっかく', // A rectangle has four right angles.
  'g2-m18': 'せいほうけい', // Four right angles and four equal sides specify a square.
  'g2-m19': '6つ', // Top/bottom + front/back + left/right = 2 + 2 + 2 faces.
  'g2-m20': 'ちょうてん', // Two adjacent sides meet at a vertex.
  'g2-m21': '10mm', // 1 cm = 10 mm.
  'g2-m22': '200cm', // 2 m = 2 * 100 cm = 200 cm.
  'g2-m23': '83mm', // 8 cm 3 mm = 8 * 10 mm + 3 mm = 83 mm.
  'g2-m24': 'cm', // 12 cm suits a pencil in a pencil case; m is too large, L is volume.
  'g2-m25': '11cm', // 15 cm - 4 cm = 11 cm.
  'g2-m26': '60ぷん', // 1 hour = 60 minutes.
  'g2-m27': '24じかん', // 1 day = 12 hours before noon + 12 after noon = 24 hours.
  'g2-m28': 'じかん', // An interval between two clock times is a duration.
  'g2-m29': '30ぷん', // 60 min - 30 min = 30 min.
  'g2-m30': '80ぷん', // 1 h 20 min = 60 + 20 = 80 min.

  'g3-m11': '10こ', // 10000 / 1000 = 10.
  'g3-m12': '7こ', // (27000 - 2 * 10000) / 1000 = 7.
  'g3-m13': '40200', // 4 * 10000 + 200 = 40200.
  'g3-m14': '35000', // 35000 > 30500 > 30050.
  'g3-m15': '100000', // 90000 + 10000 = 100000.
  'g3-m16': '42', // 14 * 3 = 30 + 12 = 42.
  'g3-m17': '92', // 23 * 4 = 80 + 12 = 92.
  'g3-m18': '45こ', // 15 per bag * 3 bags = 45; also 30 + 15.
  'g3-m19': '80ページ', // 20 pages per day * 4 days = 80 pages.
  'g3-m20': '4', // 24 = 20 + 4, so 24 * 3 = 20 * 3 + 4 * 3.
  'g3-m21': '1000m', // 1 km = 1000 m.
  'g3-m22': '2300m', // 2 * 1000 m + 300 m = 2300 m.
  'g3-m23': '1000g', // 1 kg = 1000 g.
  'g3-m24': '1300g', // 800 g + 500 g = 1300 g.
  'g3-m25': '500g', // 550 g total - 50 g container = 500 g rice.
  'g3-m26': '6cm', // Diameter = 2 * radius = 2 * 3 cm = 6 cm.
  'g3-m27': '5cm', // Radius = diameter / 2 = 10 cm / 2 = 5 cm.
  'g3-m28': 'どこでも おなじ', // Every point on one circle is the same distance from its centre.
  'g3-m29': 'にとうへんさんかくけい', // Sides 5,5,3 satisfy triangle inequality and have exactly two equal sides.
  'g3-m30': 'せいさんかくけい', // Three sides of length 4 form an equilateral triangle.

  'g4-j11': 'あおい はこ', // The object held in the first sentence is moved in the second.
  'g4-j12': 'おおきな いけ', // The carp's location refers to the previously mentioned pond.
  'g4-j13': 'あさがおと ひまわり', // The plural demonstrative includes both flowers.
  'g4-j14': 'かみを はんぶんに おる', // The referenced action produces the central crease.
  'g4-j15': 'もじを おおきく かくこと', // Larger letters are the stated change that improves readability.
  'g4-j16': 'りゆう', // The second sentence explains why the books should be rearranged.
  'g4-j17': 'あそびの れいを しめす', // Skipping and tag are examples of park activities.
  'g4-j18': 'じこくに よる ひとの ようす', // The same square has few people in the morning and many at noon.
  'g4-j19': 'ふくろの べつの よいところ', // Water resistance adds another benefit to strong handles.
  'g4-j20': '③', // The third statement generalises the red and yellow examples.
  'g4-j21': 'おもい にもつを はこぶ ひとに、てを かす。', // Helping someone carry a load uses the idiom.
  'g4-j22': 'えんそくを とても たのしみに まっている', // The idiom describes eagerly awaiting the excursion.
  'g4-j23': 'どりょくの けっかが あらわれる', // The previously impossible skill is achieved after practice.
  'g4-j24': 'とくいな ひとでも、ときには しっぱいする。', // Even an expert can make a mistake.
  'g4-j25': 'だいじょうぶか、よく たしかめてから はじめる。', // Testing even a stone bridge represents caution.
  'g4-j26': 'ふあんから、できた よろこびへ', // Explicit worry changes to a smile after success.
  'g4-j27': 'くまが いっしょに もとうと いったこと', // The offer to carry together immediately precedes relief.
  'g4-j28': 'てんき', // A bright sky becomes cloudy and rainy.
  'g4-j29': 'かぎが みつかったから', // The lost key is found before the smile.
  'g4-j30': 'もり → いけ → むら', // Morning, noon, evening order the three stated locations.

  'g5-j11': 'この こうえんには ベンチが 4つ ある。', // Bench count can be checked independently of preferences.
  'g5-j12': 'つぎは もっと おおくの ひとで そうじを したい。', // This expresses a future wish, not the recorded attendance.
  'g5-j13': 'じじつ：3つ さいていた／かんそう：うれしかった', // Observed flower count and the observer's feeling differ.
  'g5-j14': 'さいごの ばめんが いちばん おもしろかった。', // The judgement of greatest interest may differ by reader.
  'g5-j15': 'なえは きのうより 2 cm のびていた。', // The measured change is separated from the wish for growth.
  'g5-j16': 'かんがえ → りゆう', // A proposed reading habit is followed by its reason.
  'g5-j17': 'しらべた けっかを しめす', // The middle statement supplies the measured travel times.
  'g5-j18': '①の くふうが、②の けっかに つながった。', // The text explicitly makes the string the cause of easier retrieval.
  'g5-j19': 'ごみばこを おいたので、ごみが へりました。', // Installing the bin stays the reason; less litter stays the result.
  'g5-j20': 'はじめて くる ひとにも わかりやすい ちずを めざしました。', // Both larger destinations and landmarks aid map users.
  'g5-j21': 'かがみ', // A mirror is the comparison used for the reflecting pond.
  'g5-j22': 'まくらの やわらかそうな ようす', // The explicit shared feature is fluffiness.
  'g5-j23': 'おなじ ことばを くりかえしている。', // The opening phrase occurs twice.
  'g5-j24': 'あえた よろこび', // Repeating happiness strengthens the expressed joy of meeting.
  'g5-j25': 'ほしが、ほうせきのように うつくしく ひかる。', // The comparison concerns the stars' beautiful shine.
  'g5-j26': 'くらべる', // Comparing proposals means examining them against each other.
  'g5-j27': 'とくちょうに よって なかまに わける', // Classification groups books by their stated kinds.
  'g5-j28': 'たいせつな ところを みじかく まとめる', // The verb refers to summarising researched information.
  'g5-j29': 'これから どうなるかを かんがえる', // The outcome is explicitly not yet known.
  'g5-j30': 'ねじを 2ほん はずし、ふたを あけてください。', // This specifies both a quantity and an ordered action.

  'g6-j11': 'ふだが なく、どの たなか わからず さがす ひとが いた。', // Difficulty locating books supports adding shelf labels.
  'g6-j12': 'きろくした にんずうは、はじめる まえより ふえた。', // 18 exceeds 12; the record establishes neither future change nor preference.
  'g6-j13': 'きょう かぞえた まちがいは、きのうより すくない。', // 3 is less than 8; nothing establishes future or universal success.
  'g6-j14': 'いまは やねが なく、まつ あいだに ぬれるから。', // A roof addresses the stated problem of getting wet while waiting.
  'g6-j15': 'みたこと：たって やすんでいた／かんがえ：ベンチが ほしい', // Observed standing people precede the proposal to add a bench.
  'g6-j16': 'としょしつは しまっている。', // This week's closure is an explicit exception to the usual opening.
  'g6-j17': 'すいとう・ぼうし・かっぱ', // Rain gear is added to, not substituted for, the two usual items.
  'g6-j18': 'よみきかせを したいこと', // Both proposals share the activity while differing on location.
  'g6-j19': 'みなみの としょかん', // The announced venue is the library, south of the station.
  'g6-j20': 'まえの ひまでに もうしこむ。', // Grade 4 is eligible and the advance application rule still applies.
  'g6-j21': 'えほんを つくることです。', // A noun predicate fits the stated dream while preserving the desired action.
  'g6-j22': 'ごぜん 9じに あつまること', // This adds the requested meeting time.
  'g6-j23': 'ひとと ぶつかると あぶないので、ここで はしらないでください。', // The prohibition is retained and its reason added.
  'g6-j24': 'きょうは くつを かいました。', // Shoe shopping is unrelated to this book introduction.
  'g6-j25': 'わたしたち 3にんが、たねを まきました。', // Only this sentence identifies who planted the seeds.
  'g6-j26': 'いらっしゃいます', // Respectful form for the guest's coming.
  'g6-j27': 'うかがいます', // Humble form for the speaker's visit to the teacher.
  'g6-j28': 'せんせいが そう おっしゃいました。', // Respectful form of the teacher's speaking.
  'g6-j29': 'ごらんください', // A respectful request for the guest to look at the photograph.
  'g6-j30': 'うかがいました', // In this context the speaker humbly reports hearing the teacher.
};

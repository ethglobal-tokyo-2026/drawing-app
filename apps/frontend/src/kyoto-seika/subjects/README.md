# Kyoto Seika Subjects

`subjects.json` is the list Kyoto Seika Practice Mode deals from, edited by hand. Its sources and licences are in `NOTICES.txt`; the app credits them at `/sources.html`.

Each entry:

- `ja`: a subject the exam could set, broad enough to read many ways (風, 地図, 再会), never a narrow everyday item (缶コーヒー, はたき): food comes in as meals and treats (弁当, 駄菓子), never as a dish (おにぎり). A noun as the test would print it, up to six characters, that a student can picture. Action nouns (散歩, 再会) carry the verbs. A word whose kanji few can read prints in kana (団扇 → うちわ).
- `reading`: its furigana, in kana; empty for a word without kanji.
- `en`: JMdict's English for the sense meant, in American spelling.
- `kind`: one of five, as each set the exam has published holds one word of each (風, 再会, 地図, SNS, 双子). A deal never holds two words of one kind, nor two that share their English.
  - `phenomenon`: what the senses take in from the world that has no shape of its own (風, 光, 音, 匂い, 熱).
  - `moment`: what happens, what's felt, and when (再会, 瞬間, 不安, 夏).
  - `thing`: something with a shape you can draw (地図, 果物, 雨, 猫).
  - `loanword`: a modern topic, pastime, occasion or idea in katakana or the alphabet (SNS, スポーツ, チャンス). A katakana object is a thing, and a katakana person is people.
  - `people`: a person, a group or a character, creatures and spirits included (双子, 小学生, 鬼).

Words newer than JMdict's commonness marks (推し) come in only by hand.

## Words marked for deletion

The operator marks a dealt word for deletion by holding its cloud for 3 seconds on a deal, and unmarks it the same way. Marks live in the server's database, in `kyoto_seika_subjects_marked_for_deletion`, by the word's `ja`; a marked word is still dealt, tagged 「トル」 for the operator only, until it's taken out of `subjects.json` here. To read them on the box:

```sh
sqlite3 -readonly /srv/drawing-api/data/drawing-app.db "select word from kyoto_seika_subjects_marked_for_deletion order by created_at"
```

A mark whose word is no longer in the list stays as a record and does nothing.

# Kyoto Seika Subjects

`subjects.json` is the list Kyoto Seika Practice Mode deals from, edited by hand. Its sources and licences are in `NOTICES.txt`; the app credits them at `/sources.html`.

Each entry:

- `ja`: a subject the exam could set, broad enough to read many ways (風, 地図, 再会), never a narrow everyday item (缶コーヒー, はたき). A noun as the test would print it, up to six characters, that a student can picture. Action nouns (散歩, 再会) carry the verbs. A word whose kanji few can read prints in kana (団扇 → うちわ).
- `reading`: its furigana, in kana; empty for a word without kanji.
- `en`: JMdict's English for the sense meant, in American spelling.
- `kind`: `moment`, `thing`, `phenomenon`, `people` or `loanword`. A deal never holds two words of one kind, nor two that share their English.

Words newer than JMdict's commonness marks (推し) come in only by hand.

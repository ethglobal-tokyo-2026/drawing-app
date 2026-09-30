# Japanese glossary

The Japanese in the catalog was written by an LLM (2026-09-27) and needs a native speaker's review before launch: export it with `i18n:export`, and import the reviewed sheet with `i18n:import`. Every translator, human or LLM, uses these words so the app says one thing one way.

## Words

| English                            | Japanese                               | Notes                                                                                 |
| ---------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| Croquis (the app)                  | クロッキー                             |                                                                                       |
| sticker                            | シール                                 |                                                                                       |
| sticker board                      | シールボード                           | A person's board of stickers, never the app                                           |
| stat board (the board's cork back) | コルクボード                           |                                                                                       |
| User Stats                         | 記録                                   |                                                                                       |
| sticker tray                       | シールトレイ                           |                                                                                       |
| sticker sheet                      | シールシート                           |                                                                                       |
| Zipper                             | ファスナー                             |                                                                                       |
| seal (a sticker)                   | 仕上げる                               | The Seal key: 仕上げ. Sealed: 仕上がった                                              |
| draw                               | かく                                   | In hiragana, as on the Draw key                                                       |
| the check (the seal key)           | チェック                               | In words naming the key; the act it does is 仕上げ                                    |
| Time's up                          | 時間切れ                               | The drawing clock at 0:00                                                             |
| two fingers                        | 2本指                                  | Undo on the drawing screen; three fingers (3本指) redo                                |
| Timelapse                          | タイムラプス                           | The sticker detail's replay of how it was drawn                                       |
| gift / Gift Message                | ギフト / ギフトメッセージ              |                                                                                       |
| give (a sticker)                   | 贈る                                   |                                                                                       |
| receive                            | 受け取る                               |                                                                                       |
| gift bag                           | ギフト袋                               | It closes (封); 仕上げる is only for a sticker                                        |
| pull tab                           | つまみ                                 | Only for opening a gift bag                                                           |
| open (a gift, the app)             | ひらく                                 | In hiragana                                                                           |
| Gratitude                          | 感謝                                   | "Send gratitude": 感謝を送る                                                          |
| (Gratitude) Mini-game              | 感謝ミニゲーム                         |                                                                                       |
| hits                               | ヒット                                 |                                                                                       |
| combo                              | コンボ                                 | One run of hits; the Mini-game's notes say 今回の感謝                                 |
| Best combo                         | 最高コンボ                             | The most hits in one combo; never 最大コンボ                                          |
| streak                             | 連続日数                               | Days in a row you sealed a sticker; the longest: 最長連続日数                         |
| ticket / daily / reserve           | チケット / 無償チケット / 有償チケット | Gacha's words for free and bought; 無償チケットから先に使われます (ad0ll, 2026-09-27) |
| Shop (the tab)                     | ショップ                               |                                                                                       |
| laminate / backing foil            | ラミネート / ホイル                    | The Shop's coming-soon shelves                                                        |
| Original Artist                    | 作者                                   |                                                                                       |
| Direct / Residual (gratitude)      | 直接 / 作者として                      | The stat board's receipt rows; never a money word such as 印税                        |
| artist (someone who draws)         | アーティスト                           |                                                                                       |
| Transfer Trail                     | 来歴                                   | Provenance: who held it, and how it passed hand to hand (ad0ll, 2026-09-27)           |
| Explore / My board                 | さがす / マイボード                    | The tab labels; the way back is マイボードに戻る                                      |
| board address / Sui address        | ボードアドレス / Suiアドレス           | The stat board's two address papers                                                   |
| handle                             | ユーザー名                             | X's word for the @handle; a display name is 名前                                      |
| LINE friend / chat                 | 友だち / トーク                        | LINE's own words                                                                      |
| Official Account                   | 公式アカウント                         |                                                                                       |
| Terms / Privacy Policy             | 利用規約 / プライバシーポリシー        |                                                                                       |
| NSFW sticker / 18+                 | 成人向けシール / 18+                   | The toggle at sealing reads 18+ in both languages                                     |
| adult (Age status)                 | 成人                                   | "Verified adult": 年齢確認済みの成人                                                  |
| World ID                           | World ID                               | Never translated                                                                      |

## Style

- Sentences are polite (です・ます) and warm. Buttons and labels are short: a noun, or a verb in its plain form (送る, 閉じる, もう一度).
- Keep a label about as short as its English, since it has to fit the same button.
- Use Japanese punctuation (、。「」), with no spaces around Japanese text.
- Keep every `{{variable}}` exactly as the English has it, and put each `<tag>…</tag>` around the matching Japanese words.
- Japanese has no singular: leave `_one` keys empty and translate `_other`.
- The Mini-game's Japanese words (ありがと, 照れ, 昇天 and the pop-ins) are already Japanese: keep them.
- Anything under a `developer` key is the developer slip's, and stays English.

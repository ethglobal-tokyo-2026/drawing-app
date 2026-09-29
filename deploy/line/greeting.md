# The official account's greeting

LINE sends this message when someone adds Croquis's official account as a friend. It's set in LINE Official Account Manager, not in code, so this file keeps the text versioned beside the chat menus. It's Japanese first, in one message.

## The text

Paste it as one text bubble, exactly:

```text
3分でかいた絵が、シールになります。ボードにはるのも、友だちにあげるのも自由。下のメニューからシールボードをひらいてください。

Draw for three minutes, and your drawing becomes a sticker to keep on your board or give to a friend. Open Sticker Board from the menu below.
```

- It says what the app is, what you do in it and where to tap, in the app's own words.
- It sends people to "Open Sticker Board" (シールボードをひらく), the key on the default chat menu that new people see under it (`images/default.png`). If either one's words change, change the other.
- It doesn't use `{Nickname}`: LINE may not deliver a message that carries it to some people.

## Replacing LINE's default greeting

1. Open LINE Official Account Manager (manager.line.biz) and pick the account. LINE Developers Console links there too: the Messaging API channel's Messaging API tab → Greeting messages → Edit.
2. Go to トークルーム管理 → あいさつメッセージ (Greeting message).
3. Delete LINE's default bubbles, then paste the text above into one text bubble.
4. Tick the box that stops the greeting from going out again when someone unblocks the account: it's written for someone new.
5. Save with 変更を保存. Only greetings sent after that change.

## Auto-replies

LINE turns auto-replies on when a channel is made, so anyone who types in the chat may get a stock reply that says nothing about the app. Turn them off unless one says something useful:

1. In the Manager, go to 設定 (Settings) → 応答設定 (Response settings).
2. Keep あいさつメッセージ (Greeting message) on: while it's off, the greeting isn't sent, even saved.
3. Turn 応答メッセージ (Auto-response messages) off. To keep one useful reply, leave it on instead, open 応答メッセージ in the left menu, and switch every other reply off with its 「利用」 switch.
4. Leave Webhook as it is. Once the app's server greets people itself, from a follow webhook, turn the Manager's greeting off, or people get two.

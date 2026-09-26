export const giving = {
  tag: { from: "From", for: "For" },
  depositUnconfirmed:
    "The Sticker transfer could not be confirmed. Tap Send in LINE to check the gift again.",
  takeOutUnconfirmed:
    "Taking out the Sticker could not be confirmed. Check the gift in the app before trying again.",
  giftMessage: {
    altText: "{{name}} sent you a sticker",
    oneOfOne: "ONE OF ONE",
    body: "A one-of-one sticker, drawn in {{duration}}. It opens once.",
    open: "Open your gift",
  },
} as const;

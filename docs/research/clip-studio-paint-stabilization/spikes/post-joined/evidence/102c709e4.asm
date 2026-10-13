
FUNCTION 0x102c709e4 size 48
102c709e4: 081040b9  ldr	w8, [x0, #0x10]
102c709e8: 28010034  cbz	w8, 0x102c70a0c
102c709ec: 080040b9  ldr	w8, [x0]
102c709f0: 09090051  sub	w9, w8, #0x2
102c709f4: 2a008052  mov	w10, #0x1               ; =1
102c709f8: 1f150071  cmp	w8, #0x5
102c709fc: e8179f1a  cset	w8, eq
102c70a00: 3f0d0071  cmp	w9, #0x3
102c70a04: 4031881a  csel	w0, w10, w8, lo
102c70a08: c0035fd6  ret
102c70a0c: 00008052  mov	w0, #0x0                ; =0
102c70a10: c0035fd6  ret

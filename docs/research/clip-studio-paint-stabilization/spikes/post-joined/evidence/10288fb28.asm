
FUNCTION 0x10288fb28 size 316
10288fb28: f657bda9  stp	x22, x21, [sp, #-0x30]!
10288fb2c: f44f01a9  stp	x20, x19, [sp, #0x10]
10288fb30: fd7b02a9  stp	x29, x30, [sp, #0x20]
10288fb34: fd830091  add	x29, sp, #0x20
10288fb38: f40301aa  mov	x20, x1
10288fb3c: f30300aa  mov	x19, x0
10288fb40: 0a0c41f8  ldr	x10, [x0, #0x10]!
10288fb44: 08805ff8  ldur	x8, [x0, #-0x8]
10288fb48: 1f010aeb  cmp	x8, x10
10288fb4c: 62010054  b.hs	0x10288fb78
10288fb50: 800640ad  ldp	q0, q1, [x20]
10288fb54: 000500ad  stp	q0, q1, [x8]
10288fb58: 800641ad  ldp	q0, q1, [x20, #0x20]
10288fb5c: 8212c03d  ldr	q2, [x20, #0x40]
10288fb60: 892a40f9  ldr	x9, [x20, #0x50]
10288fb64: 092900f9  str	x9, [x8, #0x50]
10288fb68: 018901ad  stp	q1, q2, [x8, #0x30]
10288fb6c: 0009803d  str	q0, [x8, #0x20]
10288fb70: 15610191  add	x21, x8, #0x58
10288fb74: 36000014  b	0x10288fc4c
10288fb78: 49179dd2  mov	x9, #0xe8ba             ; =59578
10288fb7c: 4974b1f2  movk	x9, #0x8ba2, lsl #16
10288fb80: c945d7f2  movk	x9, #0xba2e, lsl #32
10288fb84: 095de0f2  movk	x9, #0x2e8, lsl #48
10288fb88: 6b0240f9  ldr	x11, [x19]
10288fb8c: 08010bcb  sub	x8, x8, x11
10288fb90: 08fd4393  asr	x8, x8, #3
10288fb94: 6c7491d2  mov	x12, #0x8ba3            ; =35747
10288fb98: cc45b7f2  movk	x12, #0xba2e, lsl #16
10288fb9c: 0c5dd4f2  movk	x12, #0xa2e8, lsl #32
10288fba0: 6cd1e5f2  movk	x12, #0x2e8b, lsl #48
10288fba4: 157d0c9b  mul	x21, x8, x12
10288fba8: a8060091  add	x8, x21, #0x1
10288fbac: 1f0109eb  cmp	x8, x9
10288fbb0: 88050054  b.hi	0x10288fc60
10288fbb4: 4a010bcb  sub	x10, x10, x11
10288fbb8: 4afd4393  asr	x10, x10, #3
10288fbbc: 4a7d0c9b  mul	x10, x10, x12
10288fbc0: 4bf97fd3  lsl	x11, x10, #1
10288fbc4: 7f0108eb  cmp	x11, x8
10288fbc8: 6881889a  csel	x8, x11, x8, hi
10288fbcc: ab8b8ed2  mov	x11, #0x745d            ; =29789
10288fbd0: 2bbaa8f2  movk	x11, #0x45d1, lsl #16
10288fbd4: eba2cbf2  movk	x11, #0x5d17, lsl #32
10288fbd8: 8b2ee0f2  movk	x11, #0x174, lsl #48
10288fbdc: 5f010beb  cmp	x10, x11
10288fbe0: 0131899a  csel	x1, x8, x9, lo
10288fbe4: 610000b4  cbz	x1, 0x10288fbf0
10288fbe8: 75657b97  bl	0x1007691bc
10288fbec: 02000014  b	0x10288fbf4
10288fbf0: 000080d2  mov	x0, #0x0                ; =0
10288fbf4: 080b8052  mov	w8, #0x58               ; =88
10288fbf8: a902089b  madd	x9, x21, x8, x0
10288fbfc: 3600089b  madd	x22, x1, x8, x0
10288fc00: 800640ad  ldp	q0, q1, [x20]
10288fc04: 200500ad  stp	q0, q1, [x9]
10288fc08: 800641ad  ldp	q0, q1, [x20, #0x20]
10288fc0c: 8212c03d  ldr	q2, [x20, #0x40]
10288fc10: 882a40f9  ldr	x8, [x20, #0x50]
10288fc14: 282900f9  str	x8, [x9, #0x50]
10288fc18: 218901ad  stp	q1, q2, [x9, #0x30]
10288fc1c: 2009803d  str	q0, [x9, #0x20]
10288fc20: 35610191  add	x21, x9, #0x58
10288fc24: 612240a9  ldp	x1, x8, [x19]
10288fc28: 020101cb  sub	x2, x8, x1
10288fc2c: 340102cb  sub	x20, x9, x2
10288fc30: e00314aa  mov	x0, x20
10288fc34: 573e4d94  bl	0x103bdf590
10288fc38: 600240f9  ldr	x0, [x19]
10288fc3c: 745600a9  stp	x20, x21, [x19]
10288fc40: 760a00f9  str	x22, [x19, #0x10]
10288fc44: 400000b4  cbz	x0, 0x10288fc4c
10288fc48: c1354d94  bl	0x103bdd34c
10288fc4c: 750600f9  str	x21, [x19, #0x8]
10288fc50: fd7b42a9  ldp	x29, x30, [sp, #0x20]
10288fc54: f44f41a9  ldp	x20, x19, [sp, #0x10]
10288fc58: f657c3a8  ldp	x22, x21, [sp], #0x30
10288fc5c: c0035fd6  ret
10288fc60: ff165e97  bl	0x10001585c

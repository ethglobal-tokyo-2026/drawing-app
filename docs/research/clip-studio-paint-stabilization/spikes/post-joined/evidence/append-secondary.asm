10288de68: 68a241b9  ldr	w8, [x19, #0x1a0]
10288de6c: a8faff34  cbz	w8, 0x10288ddc0
10288de70: e81f42b9  ldr	w8, [sp, #0x21c]
10288de74: 1f090071  cmp	w8, #0x2
10288de78: 40faff54  b.eq	0x10288ddc0
10288de7c: 082701b0  adrp	x8, 0x104d6e000
10288de80: 087d40f9  ldr	x8, [x8, #0xf8]
10288de84: e8f9ffb4  cbz	x8, 0x10288ddc0
10288de88: 082540a9  ldp	x8, x9, [x8]
10288de8c: 290108cb  sub	x9, x9, x8
10288de90: 29fd44d3  lsr	x9, x9, #4
10288de94: bfc229eb  cmp	x21, w9, sxtw
10288de98: 4af9ff54  b.ge	0x10288ddc0
10288de9c: e93f40f9  ldr	x9, [sp, #0x78]
10288dea0: 176969f8  ldr	x23, [x8, x9]
10288dea4: f7f8ffb4  cbz	x23, 0x10288ddc0
10288dea8: a003d53c  ldur	q0, [x29, #-0xb0]
10288deac: e057803d  str	q0, [sp, #0x150]
10288deb0: 604640f9  ldr	x0, [x19, #0x88]
10288deb4: 800000b4  cbz	x0, 0x10288dec4
10288deb8: e1430591  add	x1, sp, #0x150
10288debc: e20315aa  mov	x2, x21
10288dec0: 5dae1194  bl	0x102cf9834
10288dec4: 805240fd  ldr	d0, [x20, #0xa0]
10288dec8: 830a5529  ldp	w3, w2, [x20, #0xa8]
10288decc: 84b240b9  ldr	w4, [x20, #0xb0]
10288ded0: 689641b9  ldr	w8, [x19, #0x194]
10288ded4: 85c240b9  ldr	w5, [x20, #0xc0]
10288ded8: 8a2641a9  ldp	x10, x9, [x20, #0x10]
10288dedc: ea271fa9  stp	x10, x9, [sp, #0x1f0]
10288dee0: 690000b4  cbz	x9, 0x10288deec
10288dee4: 29210091  add	x9, x9, #0x8
10288dee8: 29013ab8  ldadd	w26, w9, [x9]
10288deec: 0101621e  scvtf	d1, w8
10288def0: e1430591  add	x1, sp, #0x150
10288def4: e6c30791  add	x6, sp, #0x1f0
10288def8: e7230b91  add	x7, sp, #0x2c8
10288defc: e00313aa  mov	x0, x19
10288df00: 8ffbff97  bl	0x10288cd3c
10288df04: e8c30791  add	x8, sp, #0x1f0
10288df08: 00210091  add	x0, x8, #0x8
10288df0c: c8085e97  bl	0x10001022c
10288df10: 082701b0  adrp	x8, 0x104d6e000
10288df14: 088540f9  ldr	x8, [x8, #0x108]
10288df18: e80200b4  cbz	x8, 0x10288df74
10288df1c: 082540a9  ldp	x8, x9, [x8]
10288df20: 290108cb  sub	x9, x9, x8
10288df24: 29fd44d3  lsr	x9, x9, #4
10288df28: bfc229eb  cmp	x21, w9, sxtw
10288df2c: 4a020054  b.ge	0x10288df74
10288df30: 0811158b  add	x8, x8, x21, lsl #4
10288df34: 000140f9  ldr	x0, [x8]
10288df38: e06b00f9  str	x0, [sp, #0xd0]
10288df3c: 080540f9  ldr	x8, [x8, #0x8]
10288df40: e86f00f9  str	x8, [sp, #0xd8]
10288df44: 680000b4  cbz	x8, 0x10288df50
10288df48: 08210091  add	x8, x8, #0x8
10288df4c: 08013ab8  ldadd	w26, w8, [x8]
10288df50: c00000b4  cbz	x0, 0x10288df68
10288df54: e06741fd  ldr	d0, [sp, #0x2c8]
10288df58: e16b41fd  ldr	d1, [sp, #0x2d0]
10288df5c: 816a40f9  ldr	x1, [x20, #0xd0]
10288df60: 94910194  bl	0x1028f25b0
10288df64: e07701fd  str	d0, [sp, #0x2e8]
10288df68: e8430391  add	x8, sp, #0xd0
10288df6c: 00210091  add	x0, x8, #0x8
10288df70: af085e97  bl	0x10001022c
10288df74: e1230b91  add	x1, sp, #0x2c8
10288df78: e2230a91  add	x2, sp, #0x288
10288df7c: e00317aa  mov	x0, x23
10288df80: 0041601e  fmov	d0, d8
10288df84: 71790194  bl	0x1028ec548
10288df88: 8effff17  b	0x10288ddc0

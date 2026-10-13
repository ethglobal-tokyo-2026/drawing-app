10288db40: 192701b0  adrp	x25, 0x104d6e000
10288db44: 287b40f9  ldr	x8, [x25, #0xf0]
10288db48: 082540a9  ldp	x8, x9, [x8]
10288db4c: 280108cb  sub	x8, x9, x8
10288db50: 09fd44d3  lsr	x9, x8, #4
10288db54: 3f050071  cmp	w9, #0x1
10288db58: cb630054  b.lt	0x10288e7d0
10288db5c: 150080d2  mov	x21, #0x0               ; =0
10288db60: fc630a91  add	x28, sp, #0x298
10288db64: 09d300b0  adrp	x9, 0x1042ee000
10288db68: 201544fd  ldr	d0, [x9, #0x828]
10288db6c: 0809601e  fmul	d8, d8, d0
10288db70: f8e30991  add	x24, sp, #0x278
10288db74: fba30991  add	x27, sp, #0x268
10288db78: 088944d3  ubfx	x8, x8, #4, #31
10288db7c: e83b00f9  str	x8, [sp, #0x70]
10288db80: 3a008052  mov	w26, #0x1               ; =1
10288db84: 01f4036f  fmov.2d	v1, #0.50000000
10288db88: 0a106c1e  fmov	d10, #0.50000000
10288db8c: 28ae87d2  mov	x8, #0x3d71             ; =15729
10288db90: 48e1baf2  movk	x8, #0xd70a, lsl #16
10288db94: 6814cef2  movk	x8, #0x70a3, lsl #32
10288db98: a8fce7f2  movk	x8, #0x3fe5, lsl #48
10288db9c: 000d084e  dup.2d	v0, x8
10288dba0: e08700ad  stp	q0, q1, [sp, #0x10]
10288dba4: 287b40f9  ldr	x8, [x25, #0xf0]
10288dba8: 080140f9  ldr	x8, [x8]
10288dbac: a9ee7cd3  lsl	x9, x21, #4
10288dbb0: e93f00f9  str	x9, [sp, #0x78]
10288dbb4: 166969f8  ldr	x22, [x8, x9]
10288dbb8: ff5b01f9  str	xzr, [sp, #0x2b0]
10288dbbc: ff5701f9  str	xzr, [sp, #0x2a8]
10288dbc0: ff5301f9  str	xzr, [sp, #0x2a0]
10288dbc4: ff4f01f9  str	xzr, [sp, #0x298]
10288dbc8: ff4b01f9  str	xzr, [sp, #0x290]
10288dbcc: ff4701f9  str	xzr, [sp, #0x288]
10288dbd0: 082701b0  adrp	x8, 0x104d6e000
10288dbd4: 088140f9  ldr	x8, [x8, #0x100]
10288dbd8: 080140f9  ldr	x8, [x8]
10288dbdc: 0811158b  add	x8, x8, x21, lsl #4
10288dbe0: 000140f9  ldr	x0, [x8]
10288dbe4: e03f01f9  str	x0, [sp, #0x278]
10288dbe8: 080540f9  ldr	x8, [x8, #0x8]
10288dbec: e84301f9  str	x8, [sp, #0x280]
10288dbf0: 680000b4  cbz	x8, 0x10288dbfc
10288dbf4: 08210091  add	x8, x8, #0x8
10288dbf8: 08013ab8  ldadd	w26, w8, [x8]
10288dbfc: 88265829  ldp	w8, w9, [x20, #0xc0]
10288dc00: e9000034  cbz	w9, 0x10288dc1c
10288dc04: c8000035  cbnz	w8, 0x10288dc1c
10288dc08: 800000b4  cbz	x0, 0x10288dc18
10288dc0c: f9920194  bl	0x1028f27f0
10288dc10: 88c240b9  ldr	w8, [x20, #0xc0]
10288dc14: 02000014  b	0x10288dc1c
10288dc18: 08008052  mov	w8, #0x0                ; =0
10288dc1c: 603e40f9  ldr	x0, [x19, #0x78]
10288dc20: e00c00b4  cbz	x0, 0x10288ddbc
10288dc24: c80c0035  cbnz	w8, 0x10288ddbc
10288dc28: 1b6b1194  bl	0x102ce8894
10288dc2c: f70300aa  mov	x23, x0
10288dc30: 603e40f9  ldr	x0, [x19, #0x78]
10288dc34: 216c1194  bl	0x102ce8cb8
10288dc38: f80300aa  mov	x24, x0
10288dc3c: fc0319aa  mov	x28, x25
10288dc40: ffab00f9  str	xzr, [sp, #0x150]
10288dc44: ff6b00f9  str	xzr, [sp, #0xd0]
10288dc48: ff7a0071  cmp	w23, #0x1e
10288dc4c: 20030054  b.eq	0x10288dcb0
10288dc50: 603e40f9  ldr	x0, [x19, #0x78]
10288dc54: e1030891  add	x1, sp, #0x200
10288dc58: 276c1194  bl	0x102ce8cf4
10288dc5c: a0020034  cbz	w0, 0x10288dcb0
10288dc60: 750000b5  cbnz	x21, 0x10288dc6c
10288dc64: e083c03d  ldr	q0, [sp, #0x200]
10288dc68: a003953c  stur	q0, [x29, #-0xb0]
10288dc6c: 604640f9  ldr	x0, [x19, #0x88]
10288dc70: 800000b4  cbz	x0, 0x10288dc80
10288dc74: e1030891  add	x1, sp, #0x200
10288dc78: e20315aa  mov	x2, x21
10288dc7c: eeae1194  bl	0x102cf9834
10288dc80: 609640fd  ldr	d0, [x19, #0x128]
10288dc84: 00a4200f  sshll.2d	v0, v0, #0x0
10288dc88: 00d8614e  scvtf.2d	v0, v0
10288dc8c: e183c03d  ldr	q1, [sp, #0x200]
10288dc90: 20d4604e  fadd.2d	v0, v1, v0
10288dc94: e03f41f9  ldr	x0, [sp, #0x278]
10288dc98: e11741f9  ldr	x1, [sp, #0x228]
10288dc9c: 0104185e  mov	d1, v0[1]
10288dca0: e3430591  add	x3, sp, #0x150
10288dca4: e4430391  add	x4, sp, #0xd0
10288dca8: e20318aa  mov	x2, x24
10288dcac: bb920194  bl	0x1028f2798
10288dcb0: 1f070071  cmp	w24, #0x1
10288dcb4: cb070054  b.lt	0x10288ddac
10288dcb8: 19008052  mov	w25, #0x0               ; =0
10288dcbc: 0903631e  ucvtf	d9, w24
10288dcc0: 603e40f9  ldr	x0, [x19, #0x78]
10288dcc4: e8030891  add	x8, sp, #0x200
10288dcc8: e10319aa  mov	x1, x25
10288dccc: 026c1194  bl	0x102ce8cd4
10288dcd0: 604640f9  ldr	x0, [x19, #0x88]
10288dcd4: 800000b4  cbz	x0, 0x10288dce4
10288dcd8: e1030891  add	x1, sp, #0x200
10288dcdc: e20315aa  mov	x2, x21
10288dce0: d5ae1194  bl	0x102cf9834
10288dce4: 689641b9  ldr	w8, [x19, #0x194]
10288dce8: e00b41fd  ldr	d0, [sp, #0x210]
10288dcec: e21f42b9  ldr	w2, [sp, #0x21c]
10288dcf0: e31b42b9  ldr	w3, [sp, #0x218]
10288dcf4: e42342b9  ldr	w4, [sp, #0x220]
10288dcf8: 85c240b9  ldr	w5, [x20, #0xc0]
10288dcfc: 8a2641a9  ldp	x10, x9, [x20, #0x10]
10288dd00: ea3701f9  str	x10, [sp, #0x268]
10288dd04: e93b01f9  str	x9, [sp, #0x270]
10288dd08: 690000b4  cbz	x9, 0x10288dd14
10288dd0c: 29210091  add	x9, x9, #0x8
10288dd10: 29013ab8  ldadd	w26, w9, [x9]
10288dd14: 0101621e  scvtf	d1, w8
10288dd18: 2203631e  ucvtf	d2, w25
10288dd1c: 4218691e  fdiv	d2, d2, d9
10288dd20: 4128611e  fadd	d1, d2, d1
10288dd24: e1030891  add	x1, sp, #0x200
10288dd28: e6a30991  add	x6, sp, #0x268
10288dd2c: e7230b91  add	x7, sp, #0x2c8
10288dd30: e00313aa  mov	x0, x19
10288dd34: 02fcff97  bl	0x10288cd3c
10288dd38: 60230091  add	x0, x27, #0x8
10288dd3c: 3c095e97  bl	0x10001022c
10288dd40: e82742b9  ldr	w8, [sp, #0x224]
10288dd44: 88000034  cbz	w8, 0x10288dd54
10288dd48: e81b43b9  ldr	w8, [sp, #0x318]
10288dd4c: 08011c32  orr	w8, w8, #0x10
10288dd50: e81b03b9  str	w8, [sp, #0x318]
10288dd54: ff7a0071  cmp	w23, #0x1e
10288dd58: 01010054  b.ne	0x10288dd78
10288dd5c: e03f41f9  ldr	x0, [sp, #0x278]
10288dd60: e06741fd  ldr	d0, [sp, #0x2c8]
10288dd64: e16b41fd  ldr	d1, [sp, #0x2d0]
10288dd68: e11741f9  ldr	x1, [sp, #0x228]
10288dd6c: 11920194  bl	0x1028f25b0
10288dd70: e07701fd  str	d0, [sp, #0x2e8]
10288dd74: 06000014  b	0x10288dd8c
10288dd78: e0ab40fd  ldr	d0, [sp, #0x150]
10288dd7c: e07701fd  str	d0, [sp, #0x2e8]
10288dd80: e16b40fd  ldr	d1, [sp, #0xd0]
10288dd84: 0028611e  fadd	d0, d0, d1
10288dd88: e0ab00fd  str	d0, [sp, #0x150]
10288dd8c: e1230b91  add	x1, sp, #0x2c8
10288dd90: e2a30a91  add	x2, sp, #0x2a8
10288dd94: e00316aa  mov	x0, x22
10288dd98: 0041601e  fmov	d0, d8
10288dd9c: eb790194  bl	0x1028ec548
10288dda0: 39070011  add	w25, w25, #0x1
10288dda4: 1f03196b  cmp	w24, w25
10288dda8: c1f8ff54  b.ne	0x10288dcc0
10288ddac: f8e30991  add	x24, sp, #0x278
10288ddb0: f9031caa  mov	x25, x28
10288ddb4: fc630a91  add	x28, sp, #0x298
10288ddb8: 02000014  b	0x10288ddc0
10288ddbc: 400400b4  cbz	x0, 0x10288de44

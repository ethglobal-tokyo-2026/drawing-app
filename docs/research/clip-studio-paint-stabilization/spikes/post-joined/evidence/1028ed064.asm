
FUNCTION 0x1028ed064 size 284
1028ed064: ff0303d1  sub	sp, sp, #0xc0
1028ed068: e923086d  stp	d9, d8, [sp, #0x80]
1028ed06c: f65709a9  stp	x22, x21, [sp, #0x90]
1028ed070: f44f0aa9  stp	x20, x19, [sp, #0xa0]
1028ed074: fd7b0ba9  stp	x29, x30, [sp, #0xb0]
1028ed078: fdc30291  add	x29, sp, #0xb0
1028ed07c: 2840601e  fmov	d8, d1
1028ed080: f40303aa  mov	x20, x3
1028ed084: f50302aa  mov	x21, x2
1028ed088: 0940601e  fmov	d9, d0
1028ed08c: f30300aa  mov	x19, x0
1028ed090: a4030034  cbz	w4, 0x1028ed104
1028ed094: e0230091  add	x0, sp, #0x8
1028ed098: 4f63fa97  bl	0x102785dd4
1028ed09c: 610e40f9  ldr	x1, [x19, #0x18]
1028ed0a0: e8cf00f0  adrp	x8, 0x1042ec000
1028ed0a4: 00bd45fd  ldr	d0, [x8, #0xb78]
1028ed0a8: 2009601e  fmul	d0, d9, d0
1028ed0ac: e0230091  add	x0, sp, #0x8
1028ed0b0: e20315aa  mov	x2, x21
1028ed0b4: e30314aa  mov	x3, x20
1028ed0b8: 0141601e  fmov	d1, d8
1028ed0bc: 7663fa97  bl	0x102785e94
1028ed0c0: f40300aa  mov	x20, x0
1028ed0c4: e0230091  add	x0, sp, #0x8
1028ed0c8: 5b63fa97  bl	0x102785e34
1028ed0cc: b40300b4  cbz	x20, 0x1028ed140
1028ed0d0: ffff00a9  stp	xzr, xzr, [sp, #0x8]
1028ed0d4: e1230091  add	x1, sp, #0x8
1028ed0d8: e00314aa  mov	x0, x20
1028ed0dc: 1852fa97  bl	0x10278193c
1028ed0e0: 210b01d0  adrp	x1, 0x104a53000
1028ed0e4: 21601891  add	x1, x1, #0x618
1028ed0e8: 220b01d0  adrp	x2, 0x104a53000
1028ed0ec: 42602e91  add	x2, x2, #0xb98
1028ed0f0: e00314aa  mov	x0, x20
1028ed0f4: 030080d2  mov	x3, #0x0                ; =0
1028ed0f8: d7c04b94  bl	0x103bdd454
1028ed0fc: 600e00f9  str	x0, [x19, #0x18]
1028ed100: 11000014  b	0x1028ed144
1028ed104: f60301aa  mov	x22, x1
1028ed108: e0230091  add	x0, sp, #0x8
1028ed10c: 4167fa97  bl	0x102786e10
1028ed110: 610e40f9  ldr	x1, [x19, #0x18]
1028ed114: e0230091  add	x0, sp, #0x8
1028ed118: e20316aa  mov	x2, x22
1028ed11c: 2041601e  fmov	d0, d9
1028ed120: e30315aa  mov	x3, x21
1028ed124: e40314aa  mov	x4, x20
1028ed128: 0141601e  fmov	d1, d8
1028ed12c: b268fa97  bl	0x1027873f4
1028ed130: f40300aa  mov	x20, x0
1028ed134: e0230091  add	x0, sp, #0x8
1028ed138: 5767fa97  bl	0x102786e94
1028ed13c: b4fcffb5  cbnz	x20, 0x1028ed0d0
1028ed140: 600e40f9  ldr	x0, [x19, #0x18]
1028ed144: fd7b4ba9  ldp	x29, x30, [sp, #0xb0]
1028ed148: f44f4aa9  ldp	x20, x19, [sp, #0xa0]
1028ed14c: f65749a9  ldp	x22, x21, [sp, #0x90]
1028ed150: e923486d  ldp	d9, d8, [sp, #0x80]
1028ed154: ff030391  add	sp, sp, #0xc0
1028ed158: c0035fd6  ret
1028ed15c: f30300aa  mov	x19, x0
1028ed160: e0230091  add	x0, sp, #0x8
1028ed164: 4c67fa97  bl	0x102786e94
1028ed168: 04000014  b	0x1028ed178
1028ed16c: f30300aa  mov	x19, x0
1028ed170: e0230091  add	x0, sp, #0x8
1028ed174: 3063fa97  bl	0x102785e34
1028ed178: e00313aa  mov	x0, x19
1028ed17c: fdb54b94  bl	0x103bda970

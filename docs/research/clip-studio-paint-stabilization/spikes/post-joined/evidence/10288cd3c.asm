
FUNCTION 0x10288cd3c size 444
10288cd3c: ffc301d1  sub	sp, sp, #0x70
10288cd40: e923026d  stp	d9, d8, [sp, #0x20]
10288cd44: f85f03a9  stp	x24, x23, [sp, #0x30]
10288cd48: f65704a9  stp	x22, x21, [sp, #0x40]
10288cd4c: f44f05a9  stp	x20, x19, [sp, #0x50]
10288cd50: fd7b06a9  stp	x29, x30, [sp, #0x60]
10288cd54: fd830191  add	x29, sp, #0x60
10288cd58: f30307aa  mov	x19, x7
10288cd5c: f40306aa  mov	x20, x6
10288cd60: f60304aa  mov	x22, x4
10288cd64: f50303aa  mov	x21, x3
10288cd68: f80302aa  mov	x24, x2
10288cd6c: 0840601e  fmov	d8, d0
10288cd70: f70300aa  mov	x23, x0
10288cd74: ff7c00a9  stp	xzr, xzr, [x7]
10288cd78: 08fee7d2  mov	x8, #0x3ff0000000000000 ; =4607182418800017408
10288cd7c: ff7c02a9  stp	xzr, xzr, [x7, #0x20]
10288cd80: e80c00f9  str	x8, [x7, #0x18]
10288cd84: 00f6036f  fmov.2d	v0, #1.00000000
10288cd88: e00c803d  str	q0, [x7, #0x30]
10288cd8c: fffc04a9  stp	xzr, xzr, [x7, #0x48]
10288cd90: e82000f9  str	x8, [x7, #0x40]
10288cd94: e55400b9  str	w5, [x7, #0x54]
10288cd98: 009440fd  ldr	d0, [x0, #0x128]
10288cd9c: 00a4200f  sshll.2d	v0, v0, #0x0
10288cda0: 00d8614e  scvtf.2d	v0, v0
10288cda4: 2200c03d  ldr	q2, [x1]
10288cda8: 40d4604e  fadd.2d	v0, v2, v0
10288cdac: e000803d  str	q0, [x7]
10288cdb0: e80800fd  str	d8, [x7, #0x10]
10288cdb4: 089041b9  ldr	w8, [x0, #0x190]
10288cdb8: 88010034  cbz	w8, 0x10288cde8
10288cdbc: 0001621e  scvtf	d0, w8
10288cdc0: 0020611e  fcmp	d0, d1
10288cdc4: 2d010054  b.le	0x10288cde8
10288cdc8: 2018601e  fdiv	d0, d1, d0
10288cdcc: 08d300f0  adrp	x8, 0x1042ef000
10288cdd0: 010940fd  ldr	d1, [x8, #0x10]
10288cdd4: 0008611e  fmul	d0, d0, d1
10288cdd8: 162ce697  bl	0x102217e30
10288cddc: 610a40fd  ldr	d1, [x19, #0x10]
10288cde0: 0008611e  fmul	d0, d0, d1
10288cde4: 600a00fd  str	d0, [x19, #0x10]
10288cde8: 00106e1e  fmov	d0, #1.00000000
10288cdec: 0021601e  fcmp	d8, d0
10288cdf0: 6d000054  b.le	0x10288cdfc
10288cdf4: 08fee7d2  mov	x8, #0x3ff0000000000000 ; =4607182418800017408
10288cdf8: 680a00f9  str	x8, [x19, #0x10]
10288cdfc: 0003621e  scvtf	d0, w24
10288ce00: 28e600d0  adrp	x8, 0x104552000
10288ce04: 018d44fd  ldr	d1, [x8, #0x918]
10288ce08: 0008611e  fmul	d0, d0, d1
10288ce0c: 600e00fd  str	d0, [x19, #0x18]
10288ce10: e84a41b9  ldr	w8, [x23, #0x148]
10288ce14: 88000035  cbnz	w8, 0x10288ce24
10288ce18: e84e41b9  ldr	w8, [x23, #0x14c]
10288ce1c: f50316aa  mov	x21, x22
10288ce20: 28050034  cbz	w8, 0x10288cec4
10288ce24: a002621e  scvtf	d0, w21
10288ce28: 601600fd  str	d0, [x19, #0x28]
10288ce2c: e8430091  add	x8, sp, #0x10
10288ce30: 15210091  add	x21, x8, #0x8
10288ce34: 892240a9  ldp	x9, x8, [x20]
10288ce38: e92301a9  stp	x9, x8, [sp, #0x10]
10288ce3c: 880000b4  cbz	x8, 0x10288ce4c
10288ce40: 08210091  add	x8, x8, #0x8
10288ce44: 29008052  mov	w9, #0x1                ; =1
10288ce48: 080129b8  ldadd	w9, w8, [x8]
10288ce4c: e0430091  add	x0, sp, #0x10
10288ce50: 1a180494  bl	0x102992eb8
10288ce54: f60300aa  mov	x22, x0
10288ce58: e00315aa  mov	x0, x21
10288ce5c: f40c5e97  bl	0x10001022c
10288ce60: d6000034  cbz	w22, 0x10288ce78
10288ce64: 601640fd  ldr	d0, [x19, #0x28]
10288ce68: 28d300f0  adrp	x8, 0x1042f3000
10288ce6c: 015d40fd  ldr	d1, [x8, #0xb8]
10288ce70: 2038601e  fsub	d0, d1, d0
10288ce74: 601600fd  str	d0, [x19, #0x28]
10288ce78: e8030091  mov	x8, sp
10288ce7c: 15210091  add	x21, x8, #0x8
10288ce80: 892240a9  ldp	x9, x8, [x20]
10288ce84: e92300a9  stp	x9, x8, [sp]
10288ce88: 880000b4  cbz	x8, 0x10288ce98
10288ce8c: 08210091  add	x8, x8, #0x8
10288ce90: 29008052  mov	w9, #0x1                ; =1
10288ce94: 080129b8  ldadd	w9, w8, [x8]
10288ce98: e0030091  mov	x0, sp
10288ce9c: 32180494  bl	0x102992f64
10288cea0: f40300aa  mov	x20, x0
10288cea4: e00315aa  mov	x0, x21
10288cea8: e10c5e97  bl	0x10001022c
10288ceac: d4000034  cbz	w20, 0x10288cec4
10288ceb0: 601640fd  ldr	d0, [x19, #0x28]
10288ceb4: 08d300f0  adrp	x8, 0x1042ef000
10288ceb8: 010d40fd  ldr	d1, [x8, #0x18]
10288cebc: 2038601e  fsub	d0, d1, d0
10288cec0: 601600fd  str	d0, [x19, #0x28]
10288cec4: fd7b46a9  ldp	x29, x30, [sp, #0x60]
10288cec8: f44f45a9  ldp	x20, x19, [sp, #0x50]
10288cecc: f65744a9  ldp	x22, x21, [sp, #0x40]
10288ced0: f85f43a9  ldp	x24, x23, [sp, #0x30]
10288ced4: e923426d  ldp	d9, d8, [sp, #0x20]
10288ced8: ffc30191  add	sp, sp, #0x70
10288cedc: c0035fd6  ret
10288cee0: 01000014  b	0x10288cee4
10288cee4: f30300aa  mov	x19, x0
10288cee8: e00315aa  mov	x0, x21
10288ceec: d00c5e97  bl	0x10001022c
10288cef0: e00313aa  mov	x0, x19
10288cef4: 9f364d94  bl	0x103bda970

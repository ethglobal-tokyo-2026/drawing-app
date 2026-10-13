
FUNCTION 0x1028ec8d0 size 244
1028ec8d0: ff8302d1  sub	sp, sp, #0xa0
1028ec8d4: f65707a9  stp	x22, x21, [sp, #0x70]
1028ec8d8: f44f08a9  stp	x20, x19, [sp, #0x80]
1028ec8dc: fd7b09a9  stp	x29, x30, [sp, #0x90]
1028ec8e0: fd430291  add	x29, sp, #0x90
1028ec8e4: f50303aa  mov	x21, x3
1028ec8e8: f40302aa  mov	x20, x2
1028ec8ec: f30300aa  mov	x19, x0
1028ec8f0: 200441ad  ldp	q0, q1, [x1, #0x20]
1028ec8f4: e08701ad  stp	q0, q1, [sp, #0x30]
1028ec8f8: 2010c03d  ldr	q0, [x1, #0x40]
1028ec8fc: e017803d  str	q0, [sp, #0x50]
1028ec900: 282840f9  ldr	x8, [x1, #0x50]
1028ec904: e83300f9  str	x8, [sp, #0x60]
1028ec908: 200440ad  ldp	q0, q1, [x1]
1028ec90c: e08700ad  stp	q0, q1, [sp, #0x10]
1028ec910: e1430091  add	x1, sp, #0x10
1028ec914: f3feff97  bl	0x1028ec4e0
1028ec918: 600e40f9  ldr	x0, [x19, #0x18]
1028ec91c: 9553fa97  bl	0x102781770
1028ec920: f60300aa  mov	x22, x0
1028ec924: 080040f9  ldr	x8, [x0]
1028ec928: 081940f9  ldr	x8, [x8, #0x30]
1028ec92c: 61a20191  add	x1, x19, #0x68
1028ec930: e2430091  add	x2, sp, #0x10
1028ec934: 00013fd6  blr	x8
1028ec938: e00316aa  mov	x0, x22
1028ec93c: 62faf997  bl	0x10276b2c4
1028ec940: 600e40f9  ldr	x0, [x19, #0x18]
1028ec944: 1e54fa97  bl	0x1027819bc
1028ec948: e08741ad  ldp	q0, q1, [sp, #0x30]
1028ec94c: 6082883c  stur	q0, [x19, #0x88]
1028ec950: 6182893c  stur	q1, [x19, #0x98]
1028ec954: e017c03d  ldr	q0, [sp, #0x50]
1028ec958: 60828a3c  stur	q0, [x19, #0xa8]
1028ec95c: e83340f9  ldr	x8, [sp, #0x60]
1028ec960: 685e00f9  str	x8, [x19, #0xb8]
1028ec964: e08740ad  ldp	q0, q1, [sp, #0x10]
1028ec968: 6082863c  stur	q0, [x19, #0x68]
1028ec96c: 6182873c  stur	q1, [x19, #0x78]
1028ec970: ff7f00a9  stp	xzr, xzr, [sp]
1028ec974: 75010034  cbz	w21, 0x1028ec9a0
1028ec978: 600640f9  ldr	x0, [x19, #0x8]
1028ec97c: 610e40f9  ldr	x1, [x19, #0x18]
1028ec980: 62a20091  add	x2, x19, #0x28
1028ec984: 63220191  add	x3, x19, #0x48
1028ec988: 24008052  mov	w4, #0x1                ; =1
1028ec98c: 5ed5ee97  bl	0x1024a1f04
1028ec990: e00700a9  stp	x0, x1, [sp]
1028ec994: e1030091  mov	x1, sp
1028ec998: e00313aa  mov	x0, x19
1028ec99c: 8affff97  bl	0x1028ec7c4
1028ec9a0: e1030091  mov	x1, sp
1028ec9a4: e00314aa  mov	x0, x20
1028ec9a8: 0fbbe497  bl	0x10221b5e4
1028ec9ac: 600e40f9  ldr	x0, [x19, #0x18]
1028ec9b0: fd7b49a9  ldp	x29, x30, [sp, #0x90]
1028ec9b4: f44f48a9  ldp	x20, x19, [sp, #0x80]
1028ec9b8: f65747a9  ldp	x22, x21, [sp, #0x70]
1028ec9bc: ff830291  add	sp, sp, #0xa0
1028ec9c0: c0035fd6  ret

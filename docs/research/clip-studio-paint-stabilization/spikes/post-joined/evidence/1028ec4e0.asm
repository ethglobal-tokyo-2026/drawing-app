
FUNCTION 0x1028ec4e0 size 104
1028ec4e0: 081c41b9  ldr	w8, [x0, #0x11c]
1028ec4e4: 08030034  cbz	w8, 0x1028ec544
1028ec4e8: f44fbea9  stp	x20, x19, [sp, #-0x20]!
1028ec4ec: fd7b01a9  stp	x29, x30, [sp, #0x10]
1028ec4f0: fd430091  add	x29, sp, #0x10
1028ec4f4: f30301aa  mov	x19, x1
1028ec4f8: f40300aa  mov	x20, x0
1028ec4fc: 01a00191  add	x1, x0, #0x68
1028ec500: e00313aa  mov	x0, x19
1028ec504: 459ce297  bl	0x102193618
1028ec508: 810a526d  ldp	d1, d2, [x20, #0x120]
1028ec50c: 0028621e  fadd	d0, d0, d2
1028ec510: 809600fd  str	d0, [x20, #0x128]
1028ec514: 0020611e  fcmp	d0, d1
1028ec518: 0a010054  b.ge	0x1028ec538
1028ec51c: 0018611e  fdiv	d0, d0, d1
1028ec520: 01106e1e  fmov	d1, #1.00000000
1028ec524: 2038601e  fsub	d0, d1, d0
1028ec528: 611a40fd  ldr	d1, [x19, #0x30]
1028ec52c: 0008611e  fmul	d0, d0, d1
1028ec530: 601a00fd  str	d0, [x19, #0x30]
1028ec534: 02000014  b	0x1028ec53c
1028ec538: 7f1a00f9  str	xzr, [x19, #0x30]
1028ec53c: fd7b41a9  ldp	x29, x30, [sp, #0x10]
1028ec540: f44fc2a8  ldp	x20, x19, [sp], #0x20
1028ec544: c0035fd6  ret

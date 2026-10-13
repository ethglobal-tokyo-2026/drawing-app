
FUNCTION 0x1028ec548 size 636
1028ec548: ff0303d1  sub	sp, sp, #0xc0
1028ec54c: e923076d  stp	d9, d8, [sp, #0x70]
1028ec550: f85f08a9  stp	x24, x23, [sp, #0x80]
1028ec554: f65709a9  stp	x22, x21, [sp, #0x90]
1028ec558: f44f0aa9  stp	x20, x19, [sp, #0xa0]
1028ec55c: fd7b0ba9  stp	x29, x30, [sp, #0xb0]
1028ec560: fdc30291  add	x29, sp, #0xb0
1028ec564: f30302aa  mov	x19, x2
1028ec568: 0840601e  fmov	d8, d0
1028ec56c: f50301aa  mov	x21, x1
1028ec570: f40300aa  mov	x20, x0
1028ec574: 200441ad  ldp	q0, q1, [x1, #0x20]
1028ec578: e08701ad  stp	q0, q1, [sp, #0x30]
1028ec57c: 2010c03d  ldr	q0, [x1, #0x40]
1028ec580: e017803d  str	q0, [sp, #0x50]
1028ec584: 282840f9  ldr	x8, [x1, #0x50]
1028ec588: e83300f9  str	x8, [sp, #0x60]
1028ec58c: 200440ad  ldp	q0, q1, [x1]
1028ec590: e08700ad  stp	q0, q1, [sp, #0x10]
1028ec594: 085841b9  ldr	w8, [x0, #0x158]
1028ec598: 48070034  cbz	w8, 0x1028ec680
1028ec59c: 800e40f9  ldr	x0, [x20, #0x18]
1028ec5a0: 7454fa97  bl	0x102781770
1028ec5a4: e1430091  add	x1, sp, #0x10
1028ec5a8: fafaf997  bl	0x10276b190
1028ec5ac: e08741ad  ldp	q0, q1, [sp, #0x30]
1028ec5b0: 8082883c  stur	q0, [x20, #0x88]
1028ec5b4: 8182893c  stur	q1, [x20, #0x98]
1028ec5b8: e017c03d  ldr	q0, [sp, #0x50]
1028ec5bc: 80828a3c  stur	q0, [x20, #0xa8]
1028ec5c0: e83340f9  ldr	x8, [sp, #0x60]
1028ec5c4: 885e00f9  str	x8, [x20, #0xb8]
1028ec5c8: e08740ad  ldp	q0, q1, [sp, #0x10]
1028ec5cc: 8082863c  stur	q0, [x20, #0x68]
1028ec5d0: 8182873c  stur	q1, [x20, #0x78]
1028ec5d4: 9f5a01b9  str	wzr, [x20, #0x158]
1028ec5d8: 800e40f9  ldr	x0, [x20, #0x18]
1028ec5dc: f854fa97  bl	0x1027819bc
1028ec5e0: 8082c83c  ldur	q0, [x20, #0x88]
1028ec5e4: 8182c93c  ldur	q1, [x20, #0x98]
1028ec5e8: 800607ad  stp	q0, q1, [x20, #0xe0]
1028ec5ec: 8082ca3c  ldur	q0, [x20, #0xa8]
1028ec5f0: 8042803d  str	q0, [x20, #0x100]
1028ec5f4: 8082c63c  ldur	q0, [x20, #0x68]
1028ec5f8: 8182c73c  ldur	q1, [x20, #0x78]
1028ec5fc: 800606ad  stp	q0, q1, [x20, #0xc0]
1028ec600: e08741ad  ldp	q0, q1, [sp, #0x30]
1028ec604: 8082883c  stur	q0, [x20, #0x88]
1028ec608: 8182893c  stur	q1, [x20, #0x98]
1028ec60c: e017c03d  ldr	q0, [sp, #0x50]
1028ec610: 80828a3c  stur	q0, [x20, #0xa8]
1028ec614: e08740ad  ldp	q0, q1, [sp, #0x10]
1028ec618: 8082863c  stur	q0, [x20, #0x68]
1028ec61c: 885e40f9  ldr	x8, [x20, #0xb8]
1028ec620: 888a00f9  str	x8, [x20, #0x110]
1028ec624: e83340f9  ldr	x8, [sp, #0x60]
1028ec628: 885e00f9  str	x8, [x20, #0xb8]
1028ec62c: 8182873c  stur	q1, [x20, #0x78]
1028ec630: a85240b9  ldr	w8, [x21, #0x50]
1028ec634: 08011c12  and	w8, w8, #0x10
1028ec638: 883e01b9  str	w8, [x20, #0x13c]
1028ec63c: 800640f9  ldr	x0, [x20, #0x8]
1028ec640: 810e40f9  ldr	x1, [x20, #0x18]
1028ec644: 82a20091  add	x2, x20, #0x28
1028ec648: 83220191  add	x3, x20, #0x48
1028ec64c: 04008052  mov	w4, #0x0                ; =0
1028ec650: 2dd6ee97  bl	0x1024a1f04
1028ec654: e00700a9  stp	x0, x1, [sp]
1028ec658: e1030091  mov	x1, sp
1028ec65c: e00313aa  mov	x0, x19
1028ec660: e1bbe497  bl	0x10221b5e4
1028ec664: fd7b4ba9  ldp	x29, x30, [sp, #0xb0]
1028ec668: f44f4aa9  ldp	x20, x19, [sp, #0xa0]
1028ec66c: f65749a9  ldp	x22, x21, [sp, #0x90]
1028ec670: f85f48a9  ldp	x24, x23, [sp, #0x80]
1028ec674: e923476d  ldp	d9, d8, [sp, #0x70]
1028ec678: ff030391  add	sp, sp, #0xc0
1028ec67c: c0035fd6  ret
1028ec680: e1430091  add	x1, sp, #0x10
1028ec684: e00314aa  mov	x0, x20
1028ec688: 96ffff97  bl	0x1028ec4e0
1028ec68c: 883e41b9  ldr	w8, [x20, #0x13c]
1028ec690: 08060034  cbz	w8, 0x1028ec750
1028ec694: f80314aa  mov	x24, x20
1028ec698: 008f41f8  ldr	x0, [x24, #0x18]!
1028ec69c: 3554fa97  bl	0x102781770
1028ec6a0: f60300aa  mov	x22, x0
1028ec6a4: c80240f9  ldr	x8, [x22]
1028ec6a8: 081d40f9  ldr	x8, [x8, #0x38]
1028ec6ac: 81a20191  add	x1, x20, #0x68
1028ec6b0: e00316aa  mov	x0, x22
1028ec6b4: 00013fd6  blr	x8
1028ec6b8: 883e41b9  ldr	w8, [x20, #0x13c]
1028ec6bc: 88000034  cbz	w8, 0x1028ec6cc
1028ec6c0: c84240b9  ldr	w8, [x22, #0x40]
1028ec6c4: 08011e32  orr	w8, w8, #0x4
1028ec6c8: c84200b9  str	w8, [x22, #0x40]
1028ec6cc: 800e40f9  ldr	x0, [x20, #0x18]
1028ec6d0: bb54fa97  bl	0x1027819bc
1028ec6d4: 800640f9  ldr	x0, [x20, #0x8]
1028ec6d8: 810e40f9  ldr	x1, [x20, #0x18]
1028ec6dc: 82a20091  add	x2, x20, #0x28
1028ec6e0: 83220191  add	x3, x20, #0x48
1028ec6e4: 04008052  mov	w4, #0x0                ; =0
1028ec6e8: 07d6ee97  bl	0x1024a1f04
1028ec6ec: e00700a9  stp	x0, x1, [sp]
1028ec6f0: e1030091  mov	x1, sp
1028ec6f4: e00313aa  mov	x0, x19
1028ec6f8: bbbbe497  bl	0x10221b5e4
1028ec6fc: 800e40f9  ldr	x0, [x20, #0x18]
1028ec700: 1c54fa97  bl	0x102781770
1028ec704: 080040f9  ldr	x8, [x0]
1028ec708: 082140f9  ldr	x8, [x8, #0x40]
1028ec70c: 81a20191  add	x1, x20, #0x68
1028ec710: e2430091  add	x2, sp, #0x10
1028ec714: 00013fd6  blr	x8
1028ec718: 883a41b9  ldr	w8, [x20, #0x138]
1028ec71c: e8f5ff34  cbz	w8, 0x1028ec5d8
1028ec720: 080340f9  ldr	x8, [x24]
1028ec724: 08854039  ldrb	w8, [x8, #0x21]
1028ec728: 88f52736  tbz	w8, #0x4, 0x1028ec5d8
1028ec72c: e00316aa  mov	x0, x22
1028ec730: 21008052  mov	w1, #0x1                ; =1
1028ec734: 5350fa97  bl	0x102780880
1028ec738: c8024139  ldrb	w8, [x22, #0x40]
1028ec73c: e8f40f36  tbz	w8, #0x1, 0x1028ec5d8
1028ec740: 000340f9  ldr	x0, [x24]
1028ec744: e10316aa  mov	x1, x22
1028ec748: b154fa97  bl	0x102781a0c
1028ec74c: a3ffff17  b	0x1028ec5d8
1028ec750: f80314aa  mov	x24, x20
1028ec754: 008f41f8  ldr	x0, [x24, #0x18]!
1028ec758: 082341b9  ldr	w8, [x24, #0x120]
1028ec75c: 28020034  cbz	w8, 0x1028ec7a0
1028ec760: 084040b9  ldr	w8, [x0, #0x40]
1028ec764: 1f050071  cmp	w8, #0x1
1028ec768: cd010054  b.le	0x1028ec7a0
1028ec76c: 809a40fd  ldr	d0, [x20, #0x130]
1028ec770: 01106e1e  fmov	d1, #1.00000000
1028ec774: 2118681e  fdiv	d1, d1, d8
1028ec778: 80020391  add	x0, x20, #0xc0
1028ec77c: 81a20191  add	x1, x20, #0x68
1028ec780: e20315aa  mov	x2, x21
1028ec784: 5a6cfa97  bl	0x1027878ec
1028ec788: f70300aa  mov	x23, x0
1028ec78c: 800e40f9  ldr	x0, [x20, #0x18]
1028ec790: f853fa97  bl	0x102781770
1028ec794: f60300aa  mov	x22, x0
1028ec798: 77f8ff35  cbnz	w23, 0x1028ec6a4
1028ec79c: 03000014  b	0x1028ec7a8
1028ec7a0: f453fa97  bl	0x102781770
1028ec7a4: f60300aa  mov	x22, x0
1028ec7a8: c80240f9  ldr	x8, [x22]
1028ec7ac: 081540f9  ldr	x8, [x8, #0x28]
1028ec7b0: 81a20191  add	x1, x20, #0x68
1028ec7b4: e2430091  add	x2, sp, #0x10
1028ec7b8: e00316aa  mov	x0, x22
1028ec7bc: 00013fd6  blr	x8
1028ec7c0: 86ffff17  b	0x1028ec5d8

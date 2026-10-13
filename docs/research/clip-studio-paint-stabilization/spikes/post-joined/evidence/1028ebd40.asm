
FUNCTION 0x1028ebd40 size 676
1028ebd40: ff8302d1  sub	sp, sp, #0xa0
1028ebd44: f65707a9  stp	x22, x21, [sp, #0x70]
1028ebd48: f44f08a9  stp	x20, x19, [sp, #0x80]
1028ebd4c: fd7b09a9  stp	x29, x30, [sp, #0x90]
1028ebd50: fd430291  add	x29, sp, #0x90
1028ebd54: f40301aa  mov	x20, x1
1028ebd58: f30300aa  mov	x19, x0
1028ebd5c: 280441b9  ldr	w8, [x1, #0x104]
1028ebd60: 081801b9  str	w8, [x0, #0x118]
1028ebd64: a8c300d1  sub	x8, x29, #0x30
1028ebd68: a617f897  bl	0x1026f1c00
1028ebd6c: 88da40b9  ldr	w8, [x20, #0xd8]
1028ebd70: 09048652  mov	w9, #0x3020             ; =12320
1028ebd74: 0a048452  mov	w10, #0x2020            ; =8224
1028ebd78: 1f010071  cmp	w8, #0x0
1028ebd7c: 4101891a  csel	w1, w10, w9, eq
1028ebd80: a0035df8  ldur	x0, [x29, #-0x30]
1028ebd84: 9137fa97  bl	0x102779bc8
1028ebd88: 600e00f9  str	x0, [x19, #0x18]
1028ebd8c: 892242a9  ldp	x9, x8, [x20, #0x20]
1028ebd90: a9233ca9  stp	x9, x8, [x29, #-0x40]
1028ebd94: 880000b4  cbz	x8, 0x1028ebda4
1028ebd98: 08210091  add	x8, x8, #0x8
1028ebd9c: 29008052  mov	w9, #0x1                ; =1
1028ebda0: 080129b8  ldadd	w9, w8, [x8]
1028ebda4: b50301d1  sub	x21, x29, #0x40
1028ebda8: 080040f9  ldr	x8, [x0]
1028ebdac: 085140f9  ldr	x8, [x8, #0xa0]
1028ebdb0: a10301d1  sub	x1, x29, #0x40
1028ebdb4: 00013fd6  blr	x8
1028ebdb8: a0220091  add	x0, x21, #0x8
1028ebdbc: 1c915c97  bl	0x10001022c
1028ebdc0: 600e40f9  ldr	x0, [x19, #0x18]
1028ebdc4: 800a40fd  ldr	d0, [x20, #0x10]
1028ebdc8: 080040f9  ldr	x8, [x0]
1028ebdcc: 084940f9  ldr	x8, [x8, #0x90]
1028ebdd0: 00013fd6  blr	x8
1028ebdd4: 600e40f9  ldr	x0, [x19, #0x18]
1028ebdd8: 800e40fd  ldr	d0, [x20, #0x18]
1028ebddc: 080040f9  ldr	x8, [x0]
1028ebde0: 084140f9  ldr	x8, [x8, #0x80]
1028ebde4: 00013fd6  blr	x8
1028ebde8: 600e40f9  ldr	x0, [x19, #0x18]
1028ebdec: 080040f9  ldr	x8, [x0]
1028ebdf0: 082940f9  ldr	x8, [x8, #0x50]
1028ebdf4: 81a20291  add	x1, x20, #0xa8
1028ebdf8: 00013fd6  blr	x8
1028ebdfc: 600e40f9  ldr	x0, [x19, #0x18]
1028ebe00: 080040f9  ldr	x8, [x0]
1028ebe04: 083140f9  ldr	x8, [x8, #0x60]
1028ebe08: 81d20291  add	x1, x20, #0xb4
1028ebe0c: 00013fd6  blr	x8
1028ebe10: 88de40b9  ldr	w8, [x20, #0xdc]
1028ebe14: a8000035  cbnz	w8, 0x1028ebe28
1028ebe18: 600e40f9  ldr	x0, [x19, #0x18]
1028ebe1c: 5556fa97  bl	0x102781770
1028ebe20: 81420191  add	x1, x20, #0x50
1028ebe24: dbfcf997  bl	0x10276b190
1028ebe28: 808642ad  ldp	q0, q1, [x20, #0x50]
1028ebe2c: 6182873c  stur	q1, [x19, #0x78]
1028ebe30: 6082863c  stur	q0, [x19, #0x68]
1028ebe34: 808643ad  ldp	q0, q1, [x20, #0x70]
1028ebe38: 8226c03d  ldr	q2, [x20, #0x90]
1028ebe3c: 885240f9  ldr	x8, [x20, #0xa0]
1028ebe40: 685e00f9  str	x8, [x19, #0xb8]
1028ebe44: 62828a3c  stur	q2, [x19, #0xa8]
1028ebe48: 6182893c  stur	q1, [x19, #0x98]
1028ebe4c: 6082883c  stur	q0, [x19, #0x88]
1028ebe50: 818242ad  ldp	q1, q0, [x20, #0x50]
1028ebe54: 610206ad  stp	q1, q0, [x19, #0xc0]
1028ebe58: 808643ad  ldp	q0, q1, [x20, #0x70]
1028ebe5c: 8226c03d  ldr	q2, [x20, #0x90]
1028ebe60: 885240f9  ldr	x8, [x20, #0xa0]
1028ebe64: 688a00f9  str	x8, [x19, #0x110]
1028ebe68: 618a07ad  stp	q1, q2, [x19, #0xf0]
1028ebe6c: 603a803d  str	q0, [x19, #0xe0]
1028ebe70: 7f3e01b9  str	wzr, [x19, #0x13c]
1028ebe74: 88c240b9  ldr	w8, [x20, #0xc0]
1028ebe78: 681e01b9  str	w8, [x19, #0x11c]
1028ebe7c: 80864c6d  ldp	d0, d1, [x20, #0xc8]
1028ebe80: 609200fd  str	d0, [x19, #0x120]
1028ebe84: 7f9600f9  str	xzr, [x19, #0x128]
1028ebe88: c8dc00b0  adrp	x8, 0x104484000
1028ebe8c: 002942fd  ldr	d0, [x8, #0x450]
1028ebe90: 0018611e  fdiv	d0, d0, d1
1028ebe94: 609a00fd  str	d0, [x19, #0x130]
1028ebe98: 88da40b9  ldr	w8, [x20, #0xd8]
1028ebe9c: 1f010071  cmp	w8, #0x0
1028ebea0: 880641b9  ldr	w8, [x20, #0x104]
1028ebea4: 0019407a  ccmp	w8, #0x0, #0x0, ne
1028ebea8: e8179f1a  cset	w8, eq
1028ebeac: 683a01b9  str	w8, [x19, #0x138]
1028ebeb0: 862640f9  ldr	x6, [x20, #0x48]
1028ebeb4: 66a200f9  str	x6, [x19, #0x140]
1028ebeb8: 88de40b9  ldr	w8, [x20, #0xdc]
1028ebebc: 685a01b9  str	w8, [x19, #0x158]
1028ebec0: bfc31bb8  stur	wzr, [x29, #-0x44]
1028ebec4: 600640f9  ldr	x0, [x19, #0x8]
1028ebec8: 610e40f9  ldr	x1, [x19, #0x18]
1028ebecc: 892240a9  ldp	x9, x8, [x20]
1028ebed0: e9a303a9  stp	x9, x8, [sp, #0x38]
1028ebed4: a80000b4  cbz	x8, 0x1028ebee8
1028ebed8: 08210091  add	x8, x8, #0x8
1028ebedc: 29008052  mov	w9, #0x1                ; =1
1028ebee0: 080129b8  ldadd	w9, w8, [x8]
1028ebee4: 66a240f9  ldr	x6, [x19, #0x140]
1028ebee8: 831243a9  ldp	x3, x4, [x20, #0x30]
1028ebeec: 852240f9  ldr	x5, [x20, #0x40]
1028ebef0: 87e240b9  ldr	w7, [x20, #0xe0]
1028ebef4: 88424ef8  ldur	x8, [x20, #0xe4]
1028ebef8: f5a30091  add	x21, sp, #0x28
1028ebefc: 8a264fa9  ldp	x10, x9, [x20, #0xf0]
1028ebf00: eaa702a9  stp	x10, x9, [sp, #0x28]
1028ebf04: 890000b4  cbz	x9, 0x1028ebf14
1028ebf08: 29210091  add	x9, x9, #0x8
1028ebf0c: 2a008052  mov	w10, #0x1               ; =1
1028ebf10: 29012ab8  ldadd	w10, w9, [x9]
1028ebf14: f6e30091  add	x22, sp, #0x38
1028ebf18: 89020491  add	x9, x20, #0x100
1028ebf1c: 8a0641b9  ldr	w10, [x20, #0x104]
1028ebf20: ea2300b9  str	w10, [sp, #0x20]
1028ebf24: aa1301d1  sub	x10, x29, #0x44
1028ebf28: ea2701a9  stp	x10, x9, [sp, #0x10]
1028ebf2c: e2e30091  add	x2, sp, #0x38
1028ebf30: e85700a9  stp	x8, x21, [sp]
1028ebf34: cdd4ee97  bl	0x1024a1268
1028ebf38: f40300aa  mov	x20, x0
1028ebf3c: a0220091  add	x0, x21, #0x8
1028ebf40: bb905c97  bl	0x10001022c
1028ebf44: c0220091  add	x0, x22, #0x8
1028ebf48: b9905c97  bl	0x10001022c
1028ebf4c: 74010034  cbz	w20, 0x1028ebf78
1028ebf50: a8c35bb8  ldur	w8, [x29, #-0x44]
1028ebf54: 68000034  cbz	w8, 0x1028ebf60
1028ebf58: 28008052  mov	w8, #0x1                ; =1
1028ebf5c: 683a01b9  str	w8, [x19, #0x138]
1028ebf60: 600e40f9  ldr	x0, [x19, #0x18]
1028ebf64: 61a20091  add	x1, x19, #0x28
1028ebf68: 62220191  add	x2, x19, #0x48
1028ebf6c: 6d77fa97  bl	0x102789d20
1028ebf70: 33008052  mov	w19, #0x1               ; =1
1028ebf74: 02000014  b	0x1028ebf7c
1028ebf78: 13008052  mov	w19, #0x0               ; =0
1028ebf7c: a8c300d1  sub	x8, x29, #0x30
1028ebf80: 00210091  add	x0, x8, #0x8
1028ebf84: aa905c97  bl	0x10001022c
1028ebf88: e00313aa  mov	x0, x19
1028ebf8c: fd7b49a9  ldp	x29, x30, [sp, #0x90]
1028ebf90: f44f48a9  ldp	x20, x19, [sp, #0x80]
1028ebf94: f65747a9  ldp	x22, x21, [sp, #0x70]
1028ebf98: ff830291  add	sp, sp, #0xa0
1028ebf9c: c0035fd6  ret
1028ebfa0: 0b000014  b	0x1028ebfcc
1028ebfa4: 0a000014  b	0x1028ebfcc
1028ebfa8: f30300aa  mov	x19, x0
1028ebfac: a0220091  add	x0, x21, #0x8
1028ebfb0: 9f905c97  bl	0x10001022c
1028ebfb4: c0220091  add	x0, x22, #0x8
1028ebfb8: 03000014  b	0x1028ebfc4
1028ebfbc: f30300aa  mov	x19, x0
1028ebfc0: a0220091  add	x0, x21, #0x8
1028ebfc4: 9a905c97  bl	0x10001022c
1028ebfc8: 02000014  b	0x1028ebfd0
1028ebfcc: f30300aa  mov	x19, x0
1028ebfd0: a8c300d1  sub	x8, x29, #0x30
1028ebfd4: 00210091  add	x0, x8, #0x8
1028ebfd8: 95905c97  bl	0x10001022c
1028ebfdc: e00313aa  mov	x0, x19
1028ebfe0: 64ba4b94  bl	0x103bda970

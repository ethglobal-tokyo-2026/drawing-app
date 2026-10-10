
FUNCTION 0x1028ebd40 size 676
1028ebd40:     	sub	sp, sp, #0xa0
1028ebd44:     	stp	x22, x21, [sp, #0x70]
1028ebd48:     	stp	x20, x19, [sp, #0x80]
1028ebd4c:     	stp	x29, x30, [sp, #0x90]
1028ebd50:     	add	x29, sp, #0x90
1028ebd54:     	mov	x20, x1
1028ebd58:     	mov	x19, x0
1028ebd5c:     	ldr	w8, [x1, #0x104]
1028ebd60:     	str	w8, [x0, #0x118]
1028ebd64:     	sub	x8, x29, #0x30
1028ebd68:     	bl	0x1026f1c00
1028ebd6c:     	ldr	w8, [x20, #0xd8]
1028ebd70:     	mov	w9, #0x3020             ; =12320
1028ebd74:     	mov	w10, #0x2020            ; =8224
1028ebd78:     	cmp	w8, #0x0
1028ebd7c:     	csel	w1, w10, w9, eq
1028ebd80:     	ldur	x0, [x29, #-0x30]
1028ebd84:     	bl	0x102779bc8
1028ebd88:     	str	x0, [x19, #0x18]
1028ebd8c:     	ldp	x9, x8, [x20, #0x20]
1028ebd90:     	stp	x9, x8, [x29, #-0x40]
1028ebd94:     	cbz	x8, 0x1028ebda4
1028ebd98:     	add	x8, x8, #0x8
1028ebd9c:     	mov	w9, #0x1                ; =1
1028ebda0:     	ldadd	w9, w8, [x8]
1028ebda4:     	sub	x21, x29, #0x40
1028ebda8:     	ldr	x8, [x0]
1028ebdac:     	ldr	x8, [x8, #0xa0]
1028ebdb0:     	sub	x1, x29, #0x40
1028ebdb4:     	blr	x8
1028ebdb8:     	add	x0, x21, #0x8
1028ebdbc:     	bl	0x10001022c
1028ebdc0:     	ldr	x0, [x19, #0x18]
1028ebdc4:     	ldr	d0, [x20, #0x10]
1028ebdc8:     	ldr	x8, [x0]
1028ebdcc:     	ldr	x8, [x8, #0x90]
1028ebdd0:     	blr	x8
1028ebdd4:     	ldr	x0, [x19, #0x18]
1028ebdd8:     	ldr	d0, [x20, #0x18]
1028ebddc:     	ldr	x8, [x0]
1028ebde0:     	ldr	x8, [x8, #0x80]
1028ebde4:     	blr	x8
1028ebde8:     	ldr	x0, [x19, #0x18]
1028ebdec:     	ldr	x8, [x0]
1028ebdf0:     	ldr	x8, [x8, #0x50]
1028ebdf4:     	add	x1, x20, #0xa8
1028ebdf8:     	blr	x8
1028ebdfc:     	ldr	x0, [x19, #0x18]
1028ebe00:     	ldr	x8, [x0]
1028ebe04:     	ldr	x8, [x8, #0x60]
1028ebe08:     	add	x1, x20, #0xb4
1028ebe0c:     	blr	x8
1028ebe10:     	ldr	w8, [x20, #0xdc]
1028ebe14:     	cbnz	w8, 0x1028ebe28
1028ebe18:     	ldr	x0, [x19, #0x18]
1028ebe1c:     	bl	0x102781770
1028ebe20:     	add	x1, x20, #0x50
1028ebe24:     	bl	0x10276b190
1028ebe28:     	ldp	q0, q1, [x20, #0x50]
1028ebe2c:     	stur	q1, [x19, #0x78]
1028ebe30:     	stur	q0, [x19, #0x68]
1028ebe34:     	ldp	q0, q1, [x20, #0x70]
1028ebe38:     	ldr	q2, [x20, #0x90]
1028ebe3c:     	ldr	x8, [x20, #0xa0]
1028ebe40:     	str	x8, [x19, #0xb8]
1028ebe44:     	stur	q2, [x19, #0xa8]
1028ebe48:     	stur	q1, [x19, #0x98]
1028ebe4c:     	stur	q0, [x19, #0x88]
1028ebe50:     	ldp	q1, q0, [x20, #0x50]
1028ebe54:     	stp	q1, q0, [x19, #0xc0]
1028ebe58:     	ldp	q0, q1, [x20, #0x70]
1028ebe5c:     	ldr	q2, [x20, #0x90]
1028ebe60:     	ldr	x8, [x20, #0xa0]
1028ebe64:     	str	x8, [x19, #0x110]
1028ebe68:     	stp	q1, q2, [x19, #0xf0]
1028ebe6c:     	str	q0, [x19, #0xe0]
1028ebe70:     	str	wzr, [x19, #0x13c]
1028ebe74:     	ldr	w8, [x20, #0xc0]
1028ebe78:     	str	w8, [x19, #0x11c]
1028ebe7c:     	ldp	d0, d1, [x20, #0xc8]
1028ebe80:     	str	d0, [x19, #0x120]
1028ebe84:     	str	xzr, [x19, #0x128]
1028ebe88:     	adrp	x8, 0x104484000
1028ebe8c:     	ldr	d0, [x8, #0x450]
1028ebe90:     	fdiv	d0, d0, d1
1028ebe94:     	str	d0, [x19, #0x130]
1028ebe98:     	ldr	w8, [x20, #0xd8]
1028ebe9c:     	cmp	w8, #0x0
1028ebea0:     	ldr	w8, [x20, #0x104]
1028ebea4:     	ccmp	w8, #0x0, #0x0, ne
1028ebea8:     	cset	w8, eq
1028ebeac:     	str	w8, [x19, #0x138]
1028ebeb0:     	ldr	x6, [x20, #0x48]
1028ebeb4:     	str	x6, [x19, #0x140]
1028ebeb8:     	ldr	w8, [x20, #0xdc]
1028ebebc:     	str	w8, [x19, #0x158]
1028ebec0:     	stur	wzr, [x29, #-0x44]
1028ebec4:     	ldr	x0, [x19, #0x8]
1028ebec8:     	ldr	x1, [x19, #0x18]
1028ebecc:     	ldp	x9, x8, [x20]
1028ebed0:     	stp	x9, x8, [sp, #0x38]
1028ebed4:     	cbz	x8, 0x1028ebee8
1028ebed8:     	add	x8, x8, #0x8
1028ebedc:     	mov	w9, #0x1                ; =1
1028ebee0:     	ldadd	w9, w8, [x8]
1028ebee4:     	ldr	x6, [x19, #0x140]
1028ebee8:     	ldp	x3, x4, [x20, #0x30]
1028ebeec:     	ldr	x5, [x20, #0x40]
1028ebef0:     	ldr	w7, [x20, #0xe0]
1028ebef4:     	ldur	x8, [x20, #0xe4]
1028ebef8:     	add	x21, sp, #0x28
1028ebefc:     	ldp	x10, x9, [x20, #0xf0]
1028ebf00:     	stp	x10, x9, [sp, #0x28]
1028ebf04:     	cbz	x9, 0x1028ebf14
1028ebf08:     	add	x9, x9, #0x8
1028ebf0c:     	mov	w10, #0x1               ; =1
1028ebf10:     	ldadd	w10, w9, [x9]
1028ebf14:     	add	x22, sp, #0x38
1028ebf18:     	add	x9, x20, #0x100
1028ebf1c:     	ldr	w10, [x20, #0x104]
1028ebf20:     	str	w10, [sp, #0x20]
1028ebf24:     	sub	x10, x29, #0x44
1028ebf28:     	stp	x10, x9, [sp, #0x10]
1028ebf2c:     	add	x2, sp, #0x38
1028ebf30:     	stp	x8, x21, [sp]
1028ebf34:     	bl	0x1024a1268
1028ebf38:     	mov	x20, x0
1028ebf3c:     	add	x0, x21, #0x8
1028ebf40:     	bl	0x10001022c
1028ebf44:     	add	x0, x22, #0x8
1028ebf48:     	bl	0x10001022c
1028ebf4c:     	cbz	w20, 0x1028ebf78
1028ebf50:     	ldur	w8, [x29, #-0x44]
1028ebf54:     	cbz	w8, 0x1028ebf60
1028ebf58:     	mov	w8, #0x1                ; =1
1028ebf5c:     	str	w8, [x19, #0x138]
1028ebf60:     	ldr	x0, [x19, #0x18]
1028ebf64:     	add	x1, x19, #0x28
1028ebf68:     	add	x2, x19, #0x48
1028ebf6c:     	bl	0x102789d20
1028ebf70:     	mov	w19, #0x1               ; =1
1028ebf74:     	b	0x1028ebf7c
1028ebf78:     	mov	w19, #0x0               ; =0
1028ebf7c:     	sub	x8, x29, #0x30
1028ebf80:     	add	x0, x8, #0x8
1028ebf84:     	bl	0x10001022c
1028ebf88:     	mov	x0, x19
1028ebf8c:     	ldp	x29, x30, [sp, #0x90]
1028ebf90:     	ldp	x20, x19, [sp, #0x80]
1028ebf94:     	ldp	x22, x21, [sp, #0x70]
1028ebf98:     	add	sp, sp, #0xa0
1028ebf9c:     	ret
1028ebfa0:     	b	0x1028ebfcc
1028ebfa4:     	b	0x1028ebfcc
1028ebfa8:     	mov	x19, x0
1028ebfac:     	add	x0, x21, #0x8
1028ebfb0:     	bl	0x10001022c
1028ebfb4:     	add	x0, x22, #0x8
1028ebfb8:     	b	0x1028ebfc4
1028ebfbc:     	mov	x19, x0
1028ebfc0:     	add	x0, x21, #0x8
1028ebfc4:     	bl	0x10001022c
1028ebfc8:     	b	0x1028ebfd0
1028ebfcc:     	mov	x19, x0
1028ebfd0:     	sub	x8, x29, #0x30
1028ebfd4:     	add	x0, x8, #0x8
1028ebfd8:     	bl	0x10001022c
1028ebfdc:     	mov	x0, x19
1028ebfe0:     	bl	0x103bda970

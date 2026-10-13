
FUNCTION 0x102ce9998 size 580
102ce9998:     	sub	sp, sp, #0xd0
102ce999c:     	stp	d9, d8, [sp, #0x80]
102ce99a0:     	stp	x24, x23, [sp, #0x90]
102ce99a4:     	stp	x22, x21, [sp, #0xa0]
102ce99a8:     	stp	x20, x19, [sp, #0xb0]
102ce99ac:     	stp	x29, x30, [sp, #0xc0]
102ce99b0:     	add	x29, sp, #0xc0
102ce99b4:     	mov	x19, x8
102ce99b8:     	ldr	x9, [x0, #0x10]
102ce99bc:     	cbz	x9, 0x102ce9a10
102ce99c0:     	mov	x20, x1
102ce99c4:     	mov	x21, x0
102ce99c8:     	ldr	x8, [x0, #0x18]
102ce99cc:     	stp	x9, x8, [x29, #-0x50]
102ce99d0:     	cbz	x8, 0x102ce99e0
102ce99d4:     	add	x8, x8, #0x8
102ce99d8:     	mov	w9, #0x1                ; =1
102ce99dc:     	ldadd	w9, w8, [x8]
102ce99e0:     	sub	x22, x29, #0x50
102ce99e4:     	sub	x0, x29, #0x50
102ce99e8:     	bl	0x102992930
102ce99ec:     	adrp	x8, 0x1042ee000
102ce99f0:     	ldr	d1, [x8, #0x828]
102ce99f4:     	fmul	d9, d0, d1
102ce99f8:     	add	x0, x22, #0x8
102ce99fc:     	bl	0x10001022c
102ce9a00:     	adrp	x8, 0x1042e3000
102ce9a04:     	ldr	d0, [x8, #0x690]
102ce9a08:     	fcmp	d9, d0
102ce9a0c:     	b.pl	0x102ce9a18
102ce9a10:     	stp	xzr, xzr, [x19]
102ce9a14:     	b	0x102ce9b70
102ce9a18:     	mov	w0, #0xa8               ; =168
102ce9a1c:     	bl	0x103bdd37c
102ce9a20:     	mov	x22, x0
102ce9a24:     	bl	0x102ce87a8
102ce9a28:     	adrp	x8, 0x104a71000
102ce9a2c:     	add	x8, x8, #0x8
102ce9a30:     	str	x8, [x22]
102ce9a34:     	stp	xzr, xzr, [x22, #0x68]
102ce9a38:     	mov	w8, #0xa                ; =10
102ce9a3c:     	str	w8, [x22, #0x20]
102ce9a40:     	stp	xzr, xzr, [x22, #0x58]
102ce9a44:     	movi.2d	v0, #0000000000000000
102ce9a48:     	stur	q0, [x22, #0x28]
102ce9a4c:     	stur	q0, [x22, #0x38]
102ce9a50:     	stur	q0, [x22, #0x48]
102ce9a54:     	add	x0, sp, #0x60
102ce9a58:     	mov	x1, x22
102ce9a5c:     	bl	0x102cea794
102ce9a60:     	ldr	w8, [x20, #0x14]
102ce9a64:     	str	w8, [x22, #0x24]
102ce9a68:     	ldp	x9, x8, [x21, #0x20]
102ce9a6c:     	stp	x9, x8, [sp, #0x50]
102ce9a70:     	cbz	x8, 0x102ce9a80
102ce9a74:     	add	x8, x8, #0x8
102ce9a78:     	mov	w9, #0x1                ; =1
102ce9a7c:     	ldadd	w9, w8, [x8]
102ce9a80:     	add	x23, sp, #0x50
102ce9a84:     	add	x1, sp, #0x50
102ce9a88:     	mov	x0, x22
102ce9a8c:     	bl	0x102ce9bdc
102ce9a90:     	add	x0, x23, #0x8
102ce9a94:     	bl	0x10001022c
102ce9a98:     	ldp	x8, x9, [x22, #0x60]
102ce9a9c:     	cmp	x8, x9
102ce9aa0:     	b.eq	0x102ce9b60
102ce9aa4:     	ldr	x0, [x21, #0x10]
102ce9aa8:     	bl	0x1021c7320
102ce9aac:     	fmov	d8, d0
102ce9ab0:     	add	x23, sp, #0x30
102ce9ab4:     	add	x0, sp, #0x30
102ce9ab8:     	bl	0x1031163b8
102ce9abc:     	add	x0, x23, #0x10
102ce9ac0:     	bl	0x1031163b8
102ce9ac4:     	ldr	x0, [x21, #0x10]
102ce9ac8:     	add	x1, sp, #0x30
102ce9acc:     	bl	0x1021bca90
102ce9ad0:     	add	x1, sp, #0x30
102ce9ad4:     	mov	w0, #0x20               ; =32
102ce9ad8:     	bl	0x1020c0b64
102ce9adc:     	scvtf	d0, w0
102ce9ae0:     	fmul	d0, d8, d0
102ce9ae4:     	fdiv	d0, d0, d9
102ce9ae8:     	str	d0, [x22, #0x58]
102ce9aec:     	stp	xzr, xzr, [sp, #0x20]
102ce9af0:     	ldp	d0, d1, [x20]
102ce9af4:     	mov	x1, sp
102ce9af8:     	add	x2, sp, #0x28
102ce9afc:     	add	x3, sp, #0x20
102ce9b00:     	add	x4, sp, #0x10
102ce9b04:     	mov	x0, x22
102ce9b08:     	bl	0x102ce9ee4
102ce9b0c:     	cbz	x0, 0x102ce9b58
102ce9b10:     	ldr	x8, [sp, #0x28]
102ce9b14:     	stp	x0, x8, [x22, #0x28]
102ce9b18:     	ldr	d0, [sp, #0x20]
102ce9b1c:     	str	d0, [x22, #0x38]
102ce9b20:     	mov	w1, #0x0                ; =0
102ce9b24:     	bl	0x102781e2c
102ce9b28:     	str	d0, [x22, #0x40]
102ce9b2c:     	ldr	q0, [sp, #0x10]
102ce9b30:     	stur	q0, [x22, #0x48]
102ce9b34:     	add	x1, x22, #0x78
102ce9b38:     	mov	x0, x21
102ce9b3c:     	bl	0x102ce8d3c
102ce9b40:     	ldr	q0, [sp]
102ce9b44:     	str	q0, [x20]
102ce9b48:     	ldr	q0, [sp, #0x60]
102ce9b4c:     	str	q0, [x19]
102ce9b50:     	stp	xzr, xzr, [sp, #0x60]
102ce9b54:     	b	0x102ce9b64
102ce9b58:     	ldr	w8, [x20, #0x14]
102ce9b5c:     	cbz	w8, 0x102ce9b48
102ce9b60:     	stp	xzr, xzr, [x19]
102ce9b64:     	add	x8, sp, #0x60
102ce9b68:     	orr	x0, x8, #0x8
102ce9b6c:     	bl	0x10001022c
102ce9b70:     	ldp	x29, x30, [sp, #0xc0]
102ce9b74:     	ldp	x20, x19, [sp, #0xb0]
102ce9b78:     	ldp	x22, x21, [sp, #0xa0]
102ce9b7c:     	ldp	x24, x23, [sp, #0x90]
102ce9b80:     	ldp	d9, d8, [sp, #0x80]
102ce9b84:     	add	sp, sp, #0xd0
102ce9b88:     	ret
102ce9b8c:     	b	0x102ce9bb8
102ce9b90:     	b	0x102ce9bb8
102ce9b94:     	mov	x19, x0
102ce9b98:     	add	x0, x23, #0x8
102ce9b9c:     	bl	0x10001022c
102ce9ba0:     	b	0x102ce9bbc
102ce9ba4:     	mov	x19, x0
102ce9ba8:     	mov	x0, x22
102ce9bac:     	bl	0x103bdd34c
102ce9bb0:     	b	0x102ce9bd4
102ce9bb4:     	b	0x102ce9bb8
102ce9bb8:     	mov	x19, x0
102ce9bbc:     	add	x8, sp, #0x60
102ce9bc0:     	orr	x0, x8, #0x8
102ce9bc4:     	b	0x102ce9bd0
102ce9bc8:     	mov	x19, x0
102ce9bcc:     	add	x0, x22, #0x8
102ce9bd0:     	bl	0x10001022c
102ce9bd4:     	mov	x0, x19
102ce9bd8:     	bl	0x103bda970

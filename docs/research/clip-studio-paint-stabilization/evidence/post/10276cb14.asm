10276cb14:     	sub	sp, sp, #0x30
10276cb18:     	stp	x20, x19, [sp, #0x10]
10276cb1c:     	stp	x29, x30, [sp, #0x20]
10276cb20:     	add	x29, sp, #0x20
10276cb24:     	mov	x19, x3
10276cb28:     	mov	x4, x2
10276cb2c:     	mov	x2, x1
10276cb30:     	mov	w8, #0x1                ; =1
10276cb34:     	str	w8, [sp, #0xc]
10276cb38:     	ldr	x1, [x0, #0x28]
10276cb3c:     	cbz	x1, 0x10276cb6c
10276cb40:     	ldr	x8, [x0]
10276cb44:     	ldr	x8, [x8, #0xf8]
10276cb48:     	fmov	d0, #4.00000000
10276cb4c:     	movi	d1, #0000000000000000
10276cb50:     	fmov	d2, #1.00000000
10276cb54:     	add	x5, sp, #0xc
10276cb58:     	mov	w3, #0x0                ; =0
10276cb5c:     	blr	x8
10276cb60:     	mov	x8, x0
10276cb64:     	ldr	w0, [sp, #0xc]
10276cb68:     	b	0x10276cb90
10276cb6c:     	ldr	x8, [x0, #0x38]
10276cb70:     	ldrb	w9, [x8, #0x21]
10276cb74:     	tbz	w9, #0x0, 0x10276cb80
10276cb78:     	ldr	x1, [x8, #0x30]
10276cb7c:     	cbnz	x1, 0x10276cb40
10276cb80:     	ldur	q0, [x0, #0x8]
10276cb84:     	str	q0, [x4]
10276cb88:     	mov	w0, #0x1                ; =1
10276cb8c:     	mov	w8, #0x1                ; =1
10276cb90:     	str	w8, [x19]
10276cb94:     	ldp	x29, x30, [sp, #0x20]
10276cb98:     	ldp	x20, x19, [sp, #0x10]
10276cb9c:     	add	sp, sp, #0x30
10276cba0:     	ret
10276cba4:     	ldr	x1, [x0, #0x28]
10276cba8:     	cbz	x1, 0x10276cbb8
10276cbac:     	ldr	x8, [x0]
10276cbb0:     	ldr	x2, [x8, #0x100]
10276cbb4:     	br	x2
10276cbb8:     	ldr	x8, [x0, #0x38]
10276cbbc:     	ldrb	w9, [x8, #0x21]
10276cbc0:     	tbz	w9, #0x0, 0x10276cbcc
10276cbc4:     	ldr	x1, [x8, #0x30]
10276cbc8:     	cbnz	x1, 0x10276cbac
10276cbcc:     	mov	w0, #0x0                ; =0
10276cbd0:     	ret
10276cbd4:     	sub	sp, sp, #0x170
10276cbd8:     	stp	d15, d14, [sp, #0xd0]
10276cbdc:     	stp	d13, d12, [sp, #0xe0]
10276cbe0:     	stp	d11, d10, [sp, #0xf0]
10276cbe4:     	stp	d9, d8, [sp, #0x100]
10276cbe8:     	stp	x28, x27, [sp, #0x110]
10276cbec:     	stp	x26, x25, [sp, #0x120]
10276cbf0:     	stp	x24, x23, [sp, #0x130]
10276cbf4:     	stp	x22, x21, [sp, #0x140]
10276cbf8:     	stp	x20, x19, [sp, #0x150]
10276cbfc:     	stp	x29, x30, [sp, #0x160]
10276cc00:     	add	x29, sp, #0x160
10276cc04:     	mov	x19, x6
10276cc08:     	str	w5, [sp, #0x1c]
10276cc0c:     	mov	x26, x4
10276cc10:     	mov	x24, x3
10276cc14:     	mov	x20, x2
10276cc18:     	mov	x21, x1
10276cc1c:     	mov	x22, x0
10276cc20:     	cbnz	w2, 0x10276cc5c
10276cc24:     	add	x8, x22, #0x70
10276cc28:     	cbz	w7, 0x10276cc40
10276cc2c:     	ldr	d0, [x19, #0x8]
10276cc30:     	fcvt	s0, d0
10276cc34:     	str	s0, [x22, #0x6c]
10276cc38:     	mov	x9, x19
10276cc3c:     	b	0x10276cc54
10276cc40:     	ldr	s0, [x22, #0x6c]
10276cc44:     	fcvt	d0, s0
10276cc48:     	str	d0, [x19, #0x8]
10276cc4c:     	mov	x9, x8
10276cc50:     	mov	x8, x19
10276cc54:     	ldr	d0, [x9]
10276cc58:     	str	d0, [x8]
10276cc5c:     	ldr	w8, [x29, #0x14]
10276cc60:     	str	w8, [sp, #0x18]
10276cc64:     	ldr	x27, [x22, #0x28]
10276cc68:     	cbnz	x27, 0x10276cc84
10276cc6c:     	ldr	x8, [x22, #0x38]
10276cc70:     	ldrb	w9, [x8, #0x21]
10276cc74:     	tbnz	w9, #0x0, 0x10276cc80
10276cc78:     	mov	x27, #0x0               ; =0
10276cc7c:     	b	0x10276cc84
10276cc80:     	ldr	x27, [x8, #0x30]
10276cc84:     	ldr	w25, [x29, #0x10]
10276cc88:     	ldrb	w8, [x22, #0x40]
10276cc8c:     	tbz	w8, #0x1, 0x10276ccb0
10276cc90:     	ldr	w4, [x19, #0x4]
10276cc94:     	mov	x0, x22
10276cc98:     	mov	x1, x21
10276cc9c:     	mov	x2, x20
10276cca0:     	mov	x3, x24
10276cca4:     	mov	x5, x25
10276cca8:     	ldr	w6, [sp, #0x18]
10276ccac:     	bl	0x10276d174
10276ccb0:     	adrp	x8, 0x1042e3000
10276ccb4:     	cbz	x27, 0x10276cccc
10276ccb8:     	ldrb	w8, [x22, #0x40]
10276ccbc:     	tbnz	w8, #0x4, 0x10276cd30
10276ccc0:     	ldr	d0, [x22, #0x58]
10276ccc4:     	fcvtl	v0.2d, v0.2s
10276ccc8:     	b	0x10276cd64
10276cccc:     	ldr	d0, [x19, #0x8]
10276ccd0:     	fabs	d0, d0
10276ccd4:     	ldr	d1, [x8, #0x690]
10276ccd8:     	fcmp	d0, d1
10276ccdc:     	b.hi	0x10276d11c
10276cce0:     	ldrb	w8, [x22, #0x40]
10276cce4:     	tbnz	w8, #0x5, 0x10276d11c
10276cce8:     	add	x1, sp, #0x70
10276ccec:     	mov	x0, x22
10276ccf0:     	mov	x2, x24
10276ccf4:     	bl	0x10276b944
10276ccf8:     	cbz	w24, 0x10276cd10
10276ccfc:     	ldr	w8, [sp, #0x1c]
10276cd00:     	cbnz	w8, 0x10276d11c
10276cd04:     	ldr	x8, [x22, #0x30]
10276cd08:     	cbnz	x8, 0x10276d11c
10276cd0c:     	str	xzr, [sp, #0xb8]
10276cd10:     	cbz	w25, 0x10276d14c
10276cd14:     	ldr	x0, [x22, #0x38]
10276cd18:     	ldp	d0, d1, [sp, #0x70]
10276cd1c:     	ldr	x8, [x0]
10276cd20:     	ldr	x8, [x8, #0xf8]
10276cd24:     	blr	x8
10276cd28:     	mov	x3, x0
10276cd2c:     	b	0x10276d150
10276cd30:     	add	x1, sp, #0x70
10276cd34:     	mov	x0, x27
10276cd38:     	mov	x2, x24
10276cd3c:     	bl	0x10276b944
10276cd40:     	str	wzr, [sp, #0x6c]
10276cd44:     	ldr	x8, [x21]
10276cd48:     	ldr	x8, [x8, #0x18]
10276cd4c:     	add	x1, sp, #0x70
10276cd50:     	add	x3, sp, #0x6c
10276cd54:     	mov	x0, x21
10276cd58:     	mov	x2, x20
10276cd5c:     	blr	x8
10276cd60:     	ldur	q0, [sp, #0xa8]
10276cd64:     	str	q0, [sp, #0x20]
10276cd68:     	ldr	w23, [x27, #0x40]
10276cd6c:     	tbnz	w23, #0x5, 0x10276cd80
10276cd70:     	ldr	d0, [x27, #0x58]
10276cd74:     	fcvtl	v0.2d, v0.2s
10276cd78:     	str	q0, [sp, #0x30]
10276cd7c:     	b	0x10276cdbc
10276cd80:     	add	x1, sp, #0x70
10276cd84:     	mov	x0, x22
10276cd88:     	mov	x2, x24
10276cd8c:     	bl	0x10276b944
10276cd90:     	str	wzr, [sp, #0x6c]
10276cd94:     	ldr	x8, [x21]
10276cd98:     	ldr	x8, [x8, #0x18]
10276cd9c:     	add	x1, sp, #0x70
10276cda0:     	add	x3, sp, #0x6c
10276cda4:     	mov	x0, x21
10276cda8:     	mov	x2, x20
10276cdac:     	blr	x8
10276cdb0:     	ldur	q0, [sp, #0xa8]
10276cdb4:     	str	q0, [sp, #0x30]
10276cdb8:     	ldr	w23, [x27, #0x40]
10276cdbc:     	ldr	w28, [x22, #0x40]
10276cdc0:     	ldr	x8, [x22]
10276cdc4:     	ldr	x8, [x8, #0x78]
10276cdc8:     	mov	x0, x22
10276cdcc:     	mov	w1, #0x0                ; =0
10276cdd0:     	mov	x2, x27
10276cdd4:     	blr	x8
10276cdd8:     	fmov	d8, d0
10276cddc:     	ldr	d10, [x19, #0x8]
10276cde0:     	cbz	w26, 0x10276ce00
10276cde4:     	mov	x0, x21
10276cde8:     	bl	0x10277047c
10276cdec:     	fmul	d0, d8, d0
10276cdf0:     	fcmp	d10, d0
10276cdf4:     	adrp	x8, 0x1042e3000
10276cdf8:     	ldr	d0, [x8, #0x688]
10276cdfc:     	fcsel	d10, d10, d0, lt
10276ce00:     	ldr	w8, [sp, #0x18]
10276ce04:     	cmp	w8, #0x0
10276ce08:     	cset	w11, eq
10276ce0c:     	and	w8, w23, #0x1000
10276ce10:     	ands	w9, w28, #0x1000
10276ce14:     	orr	w8, w9, w8
10276ce18:     	ubfx	w9, w23, #12, #1
10276ce1c:     	csinc	w10, w9, wzr, ne
10276ce20:     	stp	w10, w11, [sp, #0x10]
10276ce24:     	csel	w11, wzr, w9, ne
10276ce28:     	cmp	w8, #0x0
10276ce2c:     	cset	w26, ne
10276ce30:     	and	w8, w23, #0x2000
10276ce34:     	ands	w9, w28, #0x2000
10276ce38:     	orr	w8, w9, w8
10276ce3c:     	ubfx	w9, w23, #13, #1
10276ce40:     	csinc	w10, w9, wzr, ne
10276ce44:     	stp	w11, w10, [sp, #0x8]
10276ce48:     	csel	w9, wzr, w9, ne
10276ce4c:     	str	w9, [sp, #0x4]
10276ce50:     	cmp	w8, #0x0
10276ce54:     	cset	w23, ne
10276ce58:     	ldp	q0, q1, [sp, #0x20]
10276ce5c:     	mov	d11, v1[1]
10276ce60:     	mov	d12, v0[1]
10276ce64:     	adrp	x8, 0x1042e3000
10276ce68:     	ldr	d13, [x8, #0x690]
10276ce6c:     	fmov	d14, #1.00000000
10276ce70:     	fcmp	d10, d8
10276ce74:     	fmov	d9, d10
10276ce78:     	b.lt	0x10276ce90
10276ce7c:     	ldr	w8, [sp, #0x1c]
10276ce80:     	cbz	w8, 0x10276d110
10276ce84:     	ldr	x8, [x22, #0x28]
10276ce88:     	fmov	d9, d8
10276ce8c:     	cbnz	x8, 0x10276d110
10276ce90:     	fcmp	d8, d13
10276ce94:     	b.le	0x10276cec0
10276ce98:     	ldr	x8, [x22]
10276ce9c:     	ldr	x8, [x8, #0x70]
10276cea0:     	add	x2, sp, #0x70
10276cea4:     	mov	x0, x22
10276cea8:     	fmov	d0, d9
10276ceac:     	fmov	d1, d8
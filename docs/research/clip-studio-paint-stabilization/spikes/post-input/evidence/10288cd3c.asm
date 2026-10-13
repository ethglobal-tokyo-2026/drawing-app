
FUNCTION 0x10288cd3c size 444
10288cd3c:     	sub	sp, sp, #0x70
10288cd40:     	stp	d9, d8, [sp, #0x20]
10288cd44:     	stp	x24, x23, [sp, #0x30]
10288cd48:     	stp	x22, x21, [sp, #0x40]
10288cd4c:     	stp	x20, x19, [sp, #0x50]
10288cd50:     	stp	x29, x30, [sp, #0x60]
10288cd54:     	add	x29, sp, #0x60
10288cd58:     	mov	x19, x7
10288cd5c:     	mov	x20, x6
10288cd60:     	mov	x22, x4
10288cd64:     	mov	x21, x3
10288cd68:     	mov	x24, x2
10288cd6c:     	fmov	d8, d0
10288cd70:     	mov	x23, x0
10288cd74:     	stp	xzr, xzr, [x7]
10288cd78:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
10288cd7c:     	stp	xzr, xzr, [x7, #0x20]
10288cd80:     	str	x8, [x7, #0x18]
10288cd84:     	fmov.2d	v0, #1.00000000
10288cd88:     	str	q0, [x7, #0x30]
10288cd8c:     	stp	xzr, xzr, [x7, #0x48]
10288cd90:     	str	x8, [x7, #0x40]
10288cd94:     	str	w5, [x7, #0x54]
10288cd98:     	ldr	d0, [x0, #0x128]
10288cd9c:     	sshll.2d	v0, v0, #0x0
10288cda0:     	scvtf.2d	v0, v0
10288cda4:     	ldr	q2, [x1]
10288cda8:     	fadd.2d	v0, v2, v0
10288cdac:     	str	q0, [x7]
10288cdb0:     	str	d8, [x7, #0x10]
10288cdb4:     	ldr	w8, [x0, #0x190]
10288cdb8:     	cbz	w8, 0x10288cde8
10288cdbc:     	scvtf	d0, w8
10288cdc0:     	fcmp	d0, d1
10288cdc4:     	b.le	0x10288cde8
10288cdc8:     	fdiv	d0, d1, d0
10288cdcc:     	adrp	x8, 0x1042ef000
10288cdd0:     	ldr	d1, [x8, #0x10]
10288cdd4:     	fmul	d0, d0, d1
10288cdd8:     	bl	0x102217e30
10288cddc:     	ldr	d1, [x19, #0x10]
10288cde0:     	fmul	d0, d0, d1
10288cde4:     	str	d0, [x19, #0x10]
10288cde8:     	fmov	d0, #1.00000000
10288cdec:     	fcmp	d8, d0
10288cdf0:     	b.le	0x10288cdfc
10288cdf4:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
10288cdf8:     	str	x8, [x19, #0x10]
10288cdfc:     	scvtf	d0, w24
10288ce00:     	adrp	x8, 0x104552000
10288ce04:     	ldr	d1, [x8, #0x918]
10288ce08:     	fmul	d0, d0, d1
10288ce0c:     	str	d0, [x19, #0x18]
10288ce10:     	ldr	w8, [x23, #0x148]
10288ce14:     	cbnz	w8, 0x10288ce24
10288ce18:     	ldr	w8, [x23, #0x14c]
10288ce1c:     	mov	x21, x22
10288ce20:     	cbz	w8, 0x10288cec4
10288ce24:     	scvtf	d0, w21
10288ce28:     	str	d0, [x19, #0x28]
10288ce2c:     	add	x8, sp, #0x10
10288ce30:     	add	x21, x8, #0x8
10288ce34:     	ldp	x9, x8, [x20]
10288ce38:     	stp	x9, x8, [sp, #0x10]
10288ce3c:     	cbz	x8, 0x10288ce4c
10288ce40:     	add	x8, x8, #0x8
10288ce44:     	mov	w9, #0x1                ; =1
10288ce48:     	ldadd	w9, w8, [x8]
10288ce4c:     	add	x0, sp, #0x10
10288ce50:     	bl	0x102992eb8
10288ce54:     	mov	x22, x0
10288ce58:     	mov	x0, x21
10288ce5c:     	bl	0x10001022c
10288ce60:     	cbz	w22, 0x10288ce78
10288ce64:     	ldr	d0, [x19, #0x28]
10288ce68:     	adrp	x8, 0x1042f3000
10288ce6c:     	ldr	d1, [x8, #0xb8]
10288ce70:     	fsub	d0, d1, d0
10288ce74:     	str	d0, [x19, #0x28]
10288ce78:     	mov	x8, sp
10288ce7c:     	add	x21, x8, #0x8
10288ce80:     	ldp	x9, x8, [x20]
10288ce84:     	stp	x9, x8, [sp]
10288ce88:     	cbz	x8, 0x10288ce98
10288ce8c:     	add	x8, x8, #0x8
10288ce90:     	mov	w9, #0x1                ; =1
10288ce94:     	ldadd	w9, w8, [x8]
10288ce98:     	mov	x0, sp
10288ce9c:     	bl	0x102992f64
10288cea0:     	mov	x20, x0
10288cea4:     	mov	x0, x21
10288cea8:     	bl	0x10001022c
10288ceac:     	cbz	w20, 0x10288cec4
10288ceb0:     	ldr	d0, [x19, #0x28]
10288ceb4:     	adrp	x8, 0x1042ef000
10288ceb8:     	ldr	d1, [x8, #0x18]
10288cebc:     	fsub	d0, d1, d0
10288cec0:     	str	d0, [x19, #0x28]
10288cec4:     	ldp	x29, x30, [sp, #0x60]
10288cec8:     	ldp	x20, x19, [sp, #0x50]
10288cecc:     	ldp	x22, x21, [sp, #0x40]
10288ced0:     	ldp	x24, x23, [sp, #0x30]
10288ced4:     	ldp	d9, d8, [sp, #0x20]
10288ced8:     	add	sp, sp, #0x70
10288cedc:     	ret
10288cee0:     	b	0x10288cee4
10288cee4:     	mov	x19, x0
10288cee8:     	mov	x0, x21
10288ceec:     	bl	0x10001022c
10288cef0:     	mov	x0, x19
10288cef4:     	bl	0x103bda970


FUNCTION 0x102e1ca68 size 2844
102e1ca68:     	stp	d9, d8, [sp, #-0x70]!
102e1ca6c:     	stp	x28, x27, [sp, #0x10]
102e1ca70:     	stp	x26, x25, [sp, #0x20]
102e1ca74:     	stp	x24, x23, [sp, #0x30]
102e1ca78:     	stp	x22, x21, [sp, #0x40]
102e1ca7c:     	stp	x20, x19, [sp, #0x50]
102e1ca80:     	stp	x29, x30, [sp, #0x60]
102e1ca84:     	add	x29, sp, #0x60
102e1ca88:     	sub	sp, sp, #0x2c0
102e1ca8c:     	ldr	x8, [x0, #0x78]
102e1ca90:     	cbz	x8, 0x102e1cb5c
102e1ca94:     	mov	x19, x0
102e1ca98:     	ldr	x8, [x0, #0x88]
102e1ca9c:     	cbz	x8, 0x102e1cb5c
102e1caa0:     	mov	x26, x6
102e1caa4:     	mov	x21, x5
102e1caa8:     	mov	x22, x4
102e1caac:     	mov	x23, x3
102e1cab0:     	mov	x24, x2
102e1cab4:     	mov	x25, x1
102e1cab8:     	ldp	x9, x8, [x2]
102e1cabc:     	stp	x9, x8, [x29, #-0x90]
102e1cac0:     	cbz	x8, 0x102e1cad0
102e1cac4:     	add	x8, x8, #0x8
102e1cac8:     	mov	w9, #0x1                ; =1
102e1cacc:     	ldadd	w9, w8, [x8]
102e1cad0:     	sub	x27, x29, #0x90
102e1cad4:     	sub	x0, x29, #0x90
102e1cad8:     	bl	0x1021bb57c
102e1cadc:     	mov	x20, x0
102e1cae0:     	add	x0, x27, #0x8
102e1cae4:     	bl	0x10001022c
102e1cae8:     	cbz	w20, 0x102e1cb5c
102e1caec:     	ldp	x9, x8, [x23]
102e1caf0:     	stp	x9, x8, [x29, #-0xa0]
102e1caf4:     	cbz	x8, 0x102e1cb04
102e1caf8:     	add	x8, x8, #0x8
102e1cafc:     	mov	w9, #0x1                ; =1
102e1cb00:     	ldadd	w9, w8, [x8]
102e1cb04:     	sub	x27, x29, #0xa0
102e1cb08:     	sub	x0, x29, #0xa0
102e1cb0c:     	bl	0x1021252b8
102e1cb10:     	mov	x20, x0
102e1cb14:     	add	x0, x27, #0x8
102e1cb18:     	bl	0x10001022c
102e1cb1c:     	cbz	w20, 0x102e1cb5c
102e1cb20:     	ldr	w8, [x19, #0x1dc]
102e1cb24:     	ldr	w9, [x19, #0x1e4]
102e1cb28:     	cmp	w8, w9
102e1cb2c:     	b.ge	0x102e1cb54
102e1cb30:     	ldr	w8, [x19, #0x1e0]
102e1cb34:     	ldr	w9, [x19, #0x1e8]
102e1cb38:     	cmp	w8, w9
102e1cb3c:     	b.ge	0x102e1cb54
102e1cb40:     	add	x20, x19, #0x1dc
102e1cb44:     	ldr	x0, [x24]
102e1cb48:     	mov	x1, x20
102e1cb4c:     	bl	0x1021c157c
102e1cb50:     	stp	xzr, xzr, [x20]
102e1cb54:     	ldr	w8, [x19, #0x200]
102e1cb58:     	cbz	w8, 0x102e1cb88
102e1cb5c:     	mov	w21, #0x0               ; =0
102e1cb60:     	mov	x0, x21
102e1cb64:     	add	sp, sp, #0x2c0
102e1cb68:     	ldp	x29, x30, [sp, #0x60]
102e1cb6c:     	ldp	x20, x19, [sp, #0x50]
102e1cb70:     	ldp	x22, x21, [sp, #0x40]
102e1cb74:     	ldp	x24, x23, [sp, #0x30]
102e1cb78:     	ldp	x26, x25, [sp, #0x20]
102e1cb7c:     	ldp	x28, x27, [sp, #0x10]
102e1cb80:     	ldp	d9, d8, [sp], #0x70
102e1cb84:     	ret
102e1cb88:     	add	x20, sp, #0xd0
102e1cb8c:     	mov	x0, x25
102e1cb90:     	bl	0x1020cc3a4
102e1cb94:     	str	w0, [sp, #0x44]
102e1cb98:     	add	x0, sp, #0x1a8
102e1cb9c:     	mov	x1, x25
102e1cba0:     	bl	0x10212830c
102e1cba4:     	movi.2d	v0, #0000000000000000
102e1cba8:     	stp	q0, q0, [x20, #0x40]
102e1cbac:     	stp	q0, q0, [x20, #0x20]
102e1cbb0:     	stp	q0, q0, [x20]
102e1cbb4:     	add	x27, sp, #0xc0
102e1cbb8:     	ldr	x8, [x19, #0x20]
102e1cbbc:     	stp	xzr, x8, [sp, #0xc0]
102e1cbc0:     	cbz	x8, 0x102e1cbf8
102e1cbc4:     	ldr	w9, [x8, #0x8]
102e1cbc8:     	cbz	w9, 0x102e1cbf4
102e1cbcc:     	add	w10, w9, #0x1
102e1cbd0:     	add	x11, x8, #0x8
102e1cbd4:     	mov	x12, x9
102e1cbd8:     	cas	w12, w10, [x11]
102e1cbdc:     	cmp	w12, w9
102e1cbe0:     	mov	x9, x12
102e1cbe4:     	b.ne	0x102e1cbc8
102e1cbe8:     	ldr	x9, [x19, #0x18]
102e1cbec:     	ldr	x8, [sp, #0xc8]
102e1cbf0:     	b	0x102e1cbfc
102e1cbf4:     	mov	x8, #0x0                ; =0
102e1cbf8:     	mov	x9, #0x0                ; =0
102e1cbfc:     	sub	x28, x29, #0x80
102e1cc00:     	stp	xzr, xzr, [sp, #0xc0]
102e1cc04:     	ldr	x10, [sp, #0xd8]
102e1cc08:     	stp	x9, x8, [sp, #0xd0]
102e1cc0c:     	stp	xzr, x10, [x29, #-0x80]
102e1cc10:     	add	x0, x28, #0x8
102e1cc14:     	bl	0x10001022c
102e1cc18:     	add	x0, x27, #0x8
102e1cc1c:     	bl	0x10001022c
102e1cc20:     	ldp	x9, x8, [x24]
102e1cc24:     	cbz	x8, 0x102e1cc34
102e1cc28:     	add	x10, x8, #0x8
102e1cc2c:     	mov	w11, #0x1               ; =1
102e1cc30:     	ldadd	w11, w10, [x10]
102e1cc34:     	ldr	q0, [x20, #0x10]
102e1cc38:     	stp	x9, x8, [sp, #0xe0]
102e1cc3c:     	str	q0, [x20, #0x1d0]
102e1cc40:     	orr	x0, x28, #0x8
102e1cc44:     	bl	0x10001022c
102e1cc48:     	ldp	x9, x8, [x23]
102e1cc4c:     	cbz	x8, 0x102e1cc5c
102e1cc50:     	add	x10, x8, #0x8
102e1cc54:     	mov	w11, #0x1               ; =1
102e1cc58:     	ldadd	w11, w10, [x10]
102e1cc5c:     	sub	x27, x29, #0x80
102e1cc60:     	ldr	q0, [x20, #0x20]
102e1cc64:     	stp	x9, x8, [sp, #0xf0]
102e1cc68:     	str	q0, [x20, #0x1d0]
102e1cc6c:     	orr	x0, x27, #0x8
102e1cc70:     	bl	0x10001022c
102e1cc74:     	ldp	x9, x8, [x22]
102e1cc78:     	cbz	x8, 0x102e1cc88
102e1cc7c:     	add	x10, x8, #0x8
102e1cc80:     	mov	w11, #0x1               ; =1
102e1cc84:     	ldadd	w11, w10, [x10]
102e1cc88:     	ldr	q0, [x20, #0x30]
102e1cc8c:     	stp	x9, x8, [sp, #0x100]
102e1cc90:     	str	q0, [x20, #0x1d0]
102e1cc94:     	orr	x0, x27, #0x8
102e1cc98:     	bl	0x10001022c
102e1cc9c:     	ldp	x9, x8, [x26]
102e1cca0:     	cbz	x8, 0x102e1ccb0
102e1cca4:     	add	x10, x8, #0x8
102e1cca8:     	mov	w11, #0x1               ; =1
102e1ccac:     	ldadd	w11, w10, [x10]
102e1ccb0:     	ldr	q0, [x20, #0x40]
102e1ccb4:     	stp	x9, x8, [sp, #0x110]
102e1ccb8:     	str	q0, [x20, #0x1d0]
102e1ccbc:     	orr	x0, x27, #0x8
102e1ccc0:     	bl	0x10001022c
102e1ccc4:     	ldp	x9, x8, [x26, #0x10]
102e1ccc8:     	cbz	x8, 0x102e1ccd8
102e1cccc:     	add	x10, x8, #0x8
102e1ccd0:     	mov	w11, #0x1               ; =1
102e1ccd4:     	ldadd	w11, w10, [x10]
102e1ccd8:     	ldr	q0, [x20, #0x50]
102e1ccdc:     	stp	x9, x8, [sp, #0x120]
102e1cce0:     	str	q0, [x20, #0x1d0]
102e1cce4:     	orr	x0, x27, #0x8
102e1cce8:     	bl	0x10001022c
102e1ccec:     	add	x0, sp, #0x1a8
102e1ccf0:     	bl	0x1021288f0
102e1ccf4:     	str	d0, [sp, #0x170]
102e1ccf8:     	add	x0, sp, #0x1a8
102e1ccfc:     	bl	0x102128848
102e1cd00:     	str	w0, [sp, #0x178]
102e1cd04:     	add	x0, sp, #0x1a8
102e1cd08:     	bl	0x102128858
102e1cd0c:     	str	w0, [sp, #0x17c]
102e1cd10:     	add	x0, sp, #0x1a8
102e1cd14:     	bl	0x102128868
102e1cd18:     	str	w0, [sp, #0x180]
102e1cd1c:     	add	x0, sp, #0x1a8
102e1cd20:     	bl	0x102128878
102e1cd24:     	str	w0, [sp, #0x18c]
102e1cd28:     	add	x0, sp, #0x1a8
102e1cd2c:     	bl	0x102128888
102e1cd30:     	str	w0, [sp, #0x190]
102e1cd34:     	add	x0, sp, #0x1a8
102e1cd38:     	bl	0x102128898
102e1cd3c:     	str	w0, [sp, #0x194]
102e1cd40:     	add	x0, sp, #0x1a8
102e1cd44:     	bl	0x1021288a8
102e1cd48:     	str	w0, [sp, #0x184]
102e1cd4c:     	add	x0, sp, #0x1a8
102e1cd50:     	bl	0x1021288b8
102e1cd54:     	str	w0, [sp, #0x188]
102e1cd58:     	str	wzr, [sp, #0x198]
102e1cd5c:     	ldr	w8, [x19, #0x138]
102e1cd60:     	ldr	w9, [x19, #0x160]
102e1cd64:     	bic	w8, w8, w9
102e1cd68:     	str	w8, [sp, #0x19c]
102e1cd6c:     	add	x0, sp, #0x1a8
102e1cd70:     	bl	0x102128838
102e1cd74:     	str	x0, [sp, #0x1a0]
102e1cd78:     	add	x26, sp, #0xd0
102e1cd7c:     	add	x0, sp, #0x1a8
102e1cd80:     	add	x1, x26, #0x60
102e1cd84:     	bl	0x1021288dc
102e1cd88:     	add	x0, sp, #0x1a8
102e1cd8c:     	add	x1, x26, #0x70
102e1cd90:     	bl	0x102128734
102e1cd94:     	adrp	x0, 0x104d65000
102e1cd98:     	add	x0, x0, #0x210
102e1cd9c:     	bl	0x10214de74
102e1cda0:     	ldr	w8, [sp, #0x44]
102e1cda4:     	cmp	w8, w0
102e1cda8:     	b.ne	0x102e1cdc8
102e1cdac:     	mov	w8, #0x1                ; =1
102e1cdb0:     	str	w8, [x19, #0x128]
102e1cdb4:     	add	x0, x19, #0x2d8
102e1cdb8:     	bl	0x102e1d584
102e1cdbc:     	mov	x0, x19
102e1cdc0:     	bl	0x102e18d58
102e1cdc4:     	b	0x102e1cdfc
102e1cdc8:     	adrp	x0, 0x104d65000
102e1cdcc:     	add	x0, x0, #0x3d0
102e1cdd0:     	bl	0x10214de74
102e1cdd4:     	ldr	w8, [sp, #0x44]
102e1cdd8:     	cmp	w8, w0
102e1cddc:     	b.ne	0x102e1cdfc
102e1cde0:     	ldr	w8, [x19, #0x27c]
102e1cde4:     	ldr	d0, [x19, #0x268]
102e1cde8:     	ldr	d1, [x19, #0x270]
102e1cdec:     	stp	d0, d1, [sp, #0x170]
102e1cdf0:     	ldr	w9, [x19, #0x278]
102e1cdf4:     	str	w8, [sp, #0x188]
102e1cdf8:     	str	w9, [sp, #0x180]
102e1cdfc:     	bl	0x102194e64
102e1ce00:     	cmp	w0, #0x1
102e1ce04:     	b.ne	0x102e1cebc
102e1ce08:     	adrp	x0, 0x104d65000
102e1ce0c:     	add	x0, x0, #0x250
102e1ce10:     	bl	0x10214de74
102e1ce14:     	ldr	w8, [sp, #0x44]
102e1ce18:     	cmp	w8, w0
102e1ce1c:     	b.eq	0x102e1ce98
102e1ce20:     	adrp	x0, 0x104d65000
102e1ce24:     	add	x0, x0, #0x2b0
102e1ce28:     	bl	0x10214de74
102e1ce2c:     	ldr	w8, [sp, #0x44]
102e1ce30:     	cmp	w8, w0
102e1ce34:     	b.eq	0x102e1ce98
102e1ce38:     	adrp	x0, 0x104d65000
102e1ce3c:     	add	x0, x0, #0x310
102e1ce40:     	bl	0x10214de74
102e1ce44:     	ldr	w8, [sp, #0x44]
102e1ce48:     	cmp	w8, w0
102e1ce4c:     	b.eq	0x102e1ce98
102e1ce50:     	adrp	x0, 0x104d65000
102e1ce54:     	add	x0, x0, #0x270
102e1ce58:     	bl	0x10214de74
102e1ce5c:     	ldr	w8, [sp, #0x44]
102e1ce60:     	cmp	w8, w0
102e1ce64:     	b.eq	0x102e1ce98
102e1ce68:     	adrp	x0, 0x104d65000
102e1ce6c:     	add	x0, x0, #0x2d0
102e1ce70:     	bl	0x10214de74
102e1ce74:     	ldr	w8, [sp, #0x44]
102e1ce78:     	cmp	w8, w0
102e1ce7c:     	b.eq	0x102e1ce98
102e1ce80:     	adrp	x0, 0x104d65000
102e1ce84:     	add	x0, x0, #0x330
102e1ce88:     	bl	0x10214de74
102e1ce8c:     	ldr	w8, [sp, #0x44]
102e1ce90:     	cmp	w8, w0
102e1ce94:     	b.ne	0x102e1d3dc
102e1ce98:     	adrp	x8, 0x104cd4000
102e1ce9c:     	ldr	w27, [x8, #0x388]
102e1cea0:     	ldr	x0, [x19, #0x48]
102e1cea4:     	bl	0x102e4c884
102e1cea8:     	cmp	w27, w0
102e1ceac:     	b.eq	0x102e1cebc
102e1ceb0:     	mov	w8, #0x1                ; =1
102e1ceb4:     	adrp	x9, 0x104cd4000
102e1ceb8:     	strb	w8, [x9, #0x38c]
102e1cebc:     	add	x0, sp, #0x1a8
102e1cec0:     	bl	0x1021287d8
102e1cec4:     	fmov	d8, d0
102e1cec8:     	add	x0, sp, #0x1a8
102e1cecc:     	bl	0x1021287e8
102e1ced0:     	ldr	w8, [x19, #0x1d8]
102e1ced4:     	cbnz	w8, 0x102e1cf60
102e1ced8:     	fmov	d9, d0
102e1cedc:     	fabs	d1, d0
102e1cee0:     	adrp	x8, 0x1042e3000
102e1cee4:     	ldr	d0, [x8, #0x690]
102e1cee8:     	fcmp	d1, d0
102e1ceec:     	b.hi	0x102e1cefc
102e1cef0:     	fabs	d1, d8
102e1cef4:     	fcmp	d1, d0
102e1cef8:     	b.ls	0x102e1cf60
102e1cefc:     	ldp	x9, x8, [x24]
102e1cf00:     	stp	x9, x8, [sp, #0xb0]
102e1cf04:     	cbz	x8, 0x102e1cf14
102e1cf08:     	add	x8, x8, #0x8
102e1cf0c:     	mov	w9, #0x1                ; =1
102e1cf10:     	ldadd	w9, w8, [x8]
102e1cf14:     	add	x27, sp, #0xb0
102e1cf18:     	add	x0, sp, #0xb0
102e1cf1c:     	add	x1, x26, #0x60
102e1cf20:     	bl	0x1029915fc
102e1cf24:     	stp	d0, d1, [sp, #0x150]
102e1cf28:     	add	x0, x27, #0x8
102e1cf2c:     	bl	0x10001022c
102e1cf30:     	add	x1, sp, #0xd0
102e1cf34:     	mov	x0, x19
102e1cf38:     	mov	x2, x25
102e1cf3c:     	fmov	d0, d8
102e1cf40:     	fmov	d1, d9
102e1cf44:     	bl	0x102e1d5fc
102e1cf48:     	cbz	w0, 0x102e1cf60
102e1cf4c:     	mov	w9, #0x1                ; =1
102e1cf50:     	mov	w8, #0x1                ; =1
102e1cf54:     	str	w8, [sp, #0x40]
102e1cf58:     	str	w9, [sp, #0x198]
102e1cf5c:     	b	0x102e1cf64
102e1cf60:     	str	wzr, [sp, #0x40]
102e1cf64:     	add	x0, sp, #0x1a8
102e1cf68:     	bl	0x1021288b8
102e1cf6c:     	mov	x27, x0
102e1cf70:     	add	x0, sp, #0x1a8
102e1cf74:     	bl	0x102128808
102e1cf78:     	str	w0, [sp, #0x3c]
102e1cf7c:     	add	x0, sp, #0x1a8
102e1cf80:     	bl	0x102128788
102e1cf84:     	str	w0, [sp, #0x38]
102e1cf88:     	cmp	w27, #0x4
102e1cf8c:     	b.ne	0x102e1d008
102e1cf90:     	ldr	w8, [x19, #0x210]
102e1cf94:     	cbz	w8, 0x102e1cfa0
102e1cf98:     	mov	w21, #0x1               ; =1
102e1cf9c:     	b	0x102e1d394
102e1cfa0:     	ldr	w8, [x19, #0x20c]
102e1cfa4:     	cbz	w8, 0x102e1d004
102e1cfa8:     	ldr	x0, [x23]
102e1cfac:     	sub	x8, x29, #0x80
102e1cfb0:     	bl	0x10290e8e8
102e1cfb4:     	ldp	x9, x8, [x29, #-0x80]
102e1cfb8:     	stp	x9, x8, [sp, #0xa0]
102e1cfbc:     	cbz	x8, 0x102e1cfcc
102e1cfc0:     	add	x8, x8, #0x8
102e1cfc4:     	mov	w9, #0x1                ; =1
102e1cfc8:     	ldadd	w9, w8, [x8]
102e1cfcc:     	add	x27, sp, #0xa0
102e1cfd0:     	add	x0, sp, #0xa0
102e1cfd4:     	bl	0x10270ea10
102e1cfd8:     	mov	x25, x0
102e1cfdc:     	add	x0, x27, #0x8
102e1cfe0:     	bl	0x10001022c
102e1cfe4:     	and	w8, w21, #0x8
102e1cfe8:     	orr	w8, w8, w25
102e1cfec:     	cmp	w8, #0x0
102e1cff0:     	mov	w8, #0x4                ; =4
102e1cff4:     	csinc	w27, w8, wzr, eq
102e1cff8:     	add	x0, x28, #0x8
102e1cffc:     	bl	0x10001022c
102e1d000:     	b	0x102e1d008
102e1d004:     	mov	w27, #0x1               ; =1
102e1d008:     	adrp	x0, 0x104d65000
102e1d00c:     	add	x0, x0, #0x250
102e1d010:     	bl	0x10214de74
102e1d014:     	ldr	w8, [sp, #0x44]
102e1d018:     	cmp	w8, w0
102e1d01c:     	b.ne	0x102e1d054
102e1d020:     	str	w27, [x19, #0x290]
102e1d024:     	str	w21, [x19, #0x294]
102e1d028:     	movi.2d	v0, #0000000000000000
102e1d02c:     	stp	q0, q0, [x19, #0x2a0]
102e1d030:     	add	x0, x26, #0x60
102e1d034:     	add	x1, x26, #0x60
102e1d038:     	bl	0x10221b370
102e1d03c:     	str	wzr, [sp, #0x34]
102e1d040:     	str	d0, [x19, #0x2a0]
102e1d044:     	str	d1, [x19, #0x2a8]
102e1d048:     	str	d2, [x19, #0x2b0]
102e1d04c:     	str	d3, [x19, #0x2b8]
102e1d050:     	b	0x102e1d220
102e1d054:     	adrp	x0, 0x104d65000
102e1d058:     	add	x0, x0, #0x270
102e1d05c:     	bl	0x10214de74
102e1d060:     	ldr	w8, [x19, #0x290]
102e1d064:     	cmp	w8, #0x4
102e1d068:     	ccmp	w27, #0x4, #0x4, ne
102e1d06c:     	cset	w9, eq
102e1d070:     	ldr	w10, [sp, #0x44]
102e1d074:     	cmp	w10, w0
102e1d078:     	b.ne	0x102e1d094
102e1d07c:     	cbz	w9, 0x102e1d1f0
102e1d080:     	mov	w27, #0x4               ; =4
102e1d084:     	str	w27, [x19, #0x27c]
102e1d088:     	mov	w8, #0x1                ; =1
102e1d08c:     	str	w8, [sp, #0x34]
102e1d090:     	b	0x102e1d1fc
102e1d094:     	cmp	w9, #0x0
102e1d098:     	csel	w27, w8, w27, ne
102e1d09c:     	adrp	x0, 0x104d65000
102e1d0a0:     	add	x0, x0, #0x290
102e1d0a4:     	bl	0x10214de74
102e1d0a8:     	ldr	w8, [sp, #0x44]
102e1d0ac:     	cmp	w8, w0
102e1d0b0:     	b.ne	0x102e1d0b8
102e1d0b4:     	str	wzr, [x19, #0x290]
102e1d0b8:     	add	x0, sp, #0x1a8
102e1d0bc:     	bl	0x102128888
102e1d0c0:     	cbnz	w0, 0x102e1d0f4
102e1d0c4:     	adrp	x0, 0x104d65000
102e1d0c8:     	add	x0, x0, #0x1f0
102e1d0cc:     	bl	0x10214de74
102e1d0d0:     	ldr	w8, [sp, #0x44]
102e1d0d4:     	cmp	w8, w0
102e1d0d8:     	b.ne	0x102e1d0f4
102e1d0dc:     	add	x0, sp, #0x1a8
102e1d0e0:     	bl	0x102128788
102e1d0e4:     	tbz	w0, #0x0, 0x102e1d0f4
102e1d0e8:     	add	x0, x19, #0x2a0
102e1d0ec:     	add	x1, x26, #0x60
102e1d0f0:     	bl	0x10221b72c
102e1d0f4:     	adrp	x0, 0x104d65000
102e1d0f8:     	add	x0, x0, #0x2b0
102e1d0fc:     	bl	0x10214de74
102e1d100:     	ldr	w8, [sp, #0x44]
102e1d104:     	cmp	w8, w0
102e1d108:     	b.eq	0x102e1d124
102e1d10c:     	adrp	x0, 0x104d65000
102e1d110:     	add	x0, x0, #0x310
102e1d114:     	bl	0x10214de74
102e1d118:     	ldr	w8, [sp, #0x44]
102e1d11c:     	cmp	w8, w0
102e1d120:     	b.ne	0x102e1d128
102e1d124:     	str	w21, [x19, #0x294]
102e1d128:     	adrp	x0, 0x104d65000
102e1d12c:     	add	x0, x0, #0x290
102e1d130:     	bl	0x10214de74
102e1d134:     	ldr	w8, [sp, #0x44]
102e1d138:     	cmp	w8, w0
102e1d13c:     	b.ne	0x102e1d20c
102e1d140:     	ldp	q0, q1, [x19, #0x2a0]
102e1d144:     	fsub.2d	v0, v1, v0
102e1d148:     	fmov.2d	v1, #2.00000000
102e1d14c:     	fcmgt.2d	v0, v1, v0
102e1d150:     	xtn.2s	v0, v0
102e1d154:     	mov.s	w8, v0[1]
102e1d158:     	fmov	w9, s0
102e1d15c:     	and	w8, w9, w8
102e1d160:     	tbz	w8, #0x0, 0x102e1d214
102e1d164:     	ldp	x9, x8, [sp, #0xe0]
102e1d168:     	stp	x9, x8, [sp, #0x90]
102e1d16c:     	cbz	x8, 0x102e1d17c
102e1d170:     	add	x8, x8, #0x8
102e1d174:     	mov	w9, #0x1                ; =1
102e1d178:     	ldadd	w9, w8, [x8]
102e1d17c:     	ldp	x9, x8, [sp, #0xf0]
102e1d180:     	stp	x9, x8, [sp, #0x80]
102e1d184:     	cbz	x8, 0x102e1d194
102e1d188:     	add	x8, x8, #0x8
102e1d18c:     	mov	w9, #0x1                ; =1
102e1d190:     	ldadd	w9, w8, [x8]
102e1d194:     	add	x28, sp, #0x80
102e1d198:     	add	x1, sp, #0x90
102e1d19c:     	add	x2, sp, #0x80
102e1d1a0:     	mov	x0, x19
102e1d1a4:     	bl	0x102e1bab8
102e1d1a8:     	mov	x25, x0
102e1d1ac:     	add	x0, x28, #0x8
102e1d1b0:     	bl	0x10001022c
102e1d1b4:     	add	x8, sp, #0x90
102e1d1b8:     	add	x0, x8, #0x8
102e1d1bc:     	bl	0x10001022c
102e1d1c0:     	str	wzr, [sp, #0x34]
102e1d1c4:     	cbz	w25, 0x102e1d218
102e1d1c8:     	cmp	w27, #0x4
102e1d1cc:     	b.ne	0x102e1d218
102e1d1d0:     	sub	x1, x29, #0x80
102e1d1d4:     	add	x2, sp, #0xc0
102e1d1d8:     	add	x3, sp, #0x7c
102e1d1dc:     	mov	x0, x19
102e1d1e0:     	bl	0x102e18294
102e1d1e4:     	mov	w8, #0x1                ; =1
102e1d1e8:     	str	w8, [sp, #0x34]
102e1d1ec:     	b	0x102e1d218
102e1d1f0:     	str	wzr, [sp, #0x34]
102e1d1f4:     	ldr	w27, [x19, #0x28c]
102e1d1f8:     	str	w27, [x19, #0x290]
102e1d1fc:     	add	x0, x19, #0x2a0
102e1d200:     	add	x1, x26, #0x60
102e1d204:     	bl	0x10221b72c
102e1d208:     	b	0x102e1d220
102e1d20c:     	str	wzr, [sp, #0x34]
102e1d210:     	b	0x102e1d220
102e1d214:     	str	wzr, [sp, #0x34]
102e1d218:     	movi.2d	v0, #0000000000000000
102e1d21c:     	stp	q0, q0, [x19, #0x2a0]
102e1d220:     	add	x0, sp, #0x1a8
102e1d224:     	sub	x1, x29, #0x80
102e1d228:     	bl	0x102128760
102e1d22c:     	ldr	x0, [x19, #0xd0]
102e1d230:     	sub	x1, x29, #0x80
102e1d234:     	add	x2, x26, #0x60
102e1d238:     	bl	0x102e10e90
102e1d23c:     	stp	d0, d1, [sp, #0x160]
102e1d240:     	add	x0, sp, #0x1a8
102e1d244:     	bl	0x1021288c8
102e1d248:     	mov	x28, x0
102e1d24c:     	add	x0, sp, #0x1a8
102e1d250:     	bl	0x102128aa0
102e1d254:     	mov	x25, x0
102e1d258:     	add	x0, sp, #0x1a8
102e1d25c:     	bl	0x102128ab0
102e1d260:     	mov	x26, x0
102e1d264:     	add	x0, sp, #0x1a8
102e1d268:     	bl	0x102128828
102e1d26c:     	ldp	x9, x8, [x24]
102e1d270:     	stp	x9, x8, [sp, #0x68]
102e1d274:     	cbz	x8, 0x102e1d284
102e1d278:     	add	x8, x8, #0x8
102e1d27c:     	mov	w9, #0x1                ; =1
102e1d280:     	ldadd	w9, w8, [x8]
102e1d284:     	ldp	x9, x8, [x23]
102e1d288:     	stp	x9, x8, [sp, #0x58]
102e1d28c:     	cbz	x8, 0x102e1d29c
102e1d290:     	add	x8, x8, #0x8
102e1d294:     	mov	w9, #0x1                ; =1
102e1d298:     	ldadd	w9, w8, [x8]
102e1d29c:     	ldp	x9, x8, [x22]
102e1d2a0:     	stp	x9, x8, [sp, #0x48]
102e1d2a4:     	cbz	x8, 0x102e1d2b4
102e1d2a8:     	add	x8, x8, #0x8
102e1d2ac:     	mov	w9, #0x1                ; =1
102e1d2b0:     	ldadd	w9, w8, [x8]
102e1d2b4:     	add	x22, sp, #0x68
102e1d2b8:     	add	x23, sp, #0x58
102e1d2bc:     	add	x24, sp, #0x48
102e1d2c0:     	sub	x8, x29, #0x80
102e1d2c4:     	str	x8, [sp, #0x28]
102e1d2c8:     	stp	w25, w26, [sp, #0x1c]
102e1d2cc:     	stp	w21, wzr, [sp, #0x14]
102e1d2d0:     	stp	w28, wzr, [sp, #0xc]
102e1d2d4:     	add	x1, sp, #0x68
102e1d2d8:     	add	x2, sp, #0x58
102e1d2dc:     	ldp	w8, w5, [sp, #0x40]
102e1d2e0:     	stp	w8, wzr, [sp, #0x4]
102e1d2e4:     	ldp	w8, w6, [sp, #0x38]
102e1d2e8:     	str	w8, [sp]
102e1d2ec:     	add	x3, sp, #0x48
102e1d2f0:     	add	x4, sp, #0xd0
102e1d2f4:     	mov	x0, x19
102e1d2f8:     	mov	x7, x27
102e1d2fc:     	bl	0x102e1dad0
102e1d300:     	mov	x21, x0
102e1d304:     	add	x0, x24, #0x8
102e1d308:     	bl	0x10001022c
102e1d30c:     	add	x0, x23, #0x8
102e1d310:     	bl	0x10001022c
102e1d314:     	add	x0, x22, #0x8
102e1d318:     	bl	0x10001022c
102e1d31c:     	cbz	w21, 0x102e1d32c
102e1d320:     	add	x8, x19, #0x248
102e1d324:     	ldr	q0, [x20, #0x1d0]
102e1d328:     	str	q0, [x8]
102e1d32c:     	ldr	w8, [sp, #0x34]
102e1d330:     	cbz	w8, 0x102e1d348
102e1d334:     	ldr	w8, [x19, #0x134]
102e1d338:     	cmp	w8, #0x2
102e1d33c:     	b.ne	0x102e1d348
102e1d340:     	mov	x0, x19
102e1d344:     	bl	0x102e28290
102e1d348:     	adrp	x0, 0x104d65000
102e1d34c:     	add	x0, x0, #0x290
102e1d350:     	bl	0x10214de74
102e1d354:     	ldr	w8, [sp, #0x44]
102e1d358:     	cmp	w8, w0
102e1d35c:     	b.eq	0x102e1d390
102e1d360:     	adrp	x0, 0x104d65000
102e1d364:     	add	x0, x0, #0x2f0
102e1d368:     	bl	0x10214de74
102e1d36c:     	ldr	w8, [sp, #0x44]
102e1d370:     	cmp	w8, w0
102e1d374:     	b.eq	0x102e1d390
102e1d378:     	adrp	x0, 0x104d65000
102e1d37c:     	add	x0, x0, #0x350
102e1d380:     	bl	0x10214de74
102e1d384:     	ldr	w8, [sp, #0x44]
102e1d388:     	cmp	w8, w0
102e1d38c:     	b.ne	0x102e1d394
102e1d390:     	str	wzr, [x19, #0x294]
102e1d394:     	add	x19, sp, #0xd0
102e1d398:     	add	x20, sp, #0xd0
102e1d39c:     	add	x22, sp, #0xd0
102e1d3a0:     	add	x0, x22, #0x58
102e1d3a4:     	bl	0x10001022c
102e1d3a8:     	add	x0, x22, #0x48
102e1d3ac:     	bl	0x10001022c
102e1d3b0:     	add	x0, x20, #0x38
102e1d3b4:     	bl	0x10001022c
102e1d3b8:     	add	x0, x20, #0x28
102e1d3bc:     	bl	0x10001022c
102e1d3c0:     	add	x0, x19, #0x18
102e1d3c4:     	bl	0x10001022c
102e1d3c8:     	orr	x0, x19, #0x8
102e1d3cc:     	bl	0x10001022c
102e1d3d0:     	add	x0, sp, #0x1a8
102e1d3d4:     	bl	0x1021285a4
102e1d3d8:     	b	0x102e1cb60
102e1d3dc:     	adrp	x0, 0x104d65000
102e1d3e0:     	add	x0, x0, #0x1f0
102e1d3e4:     	bl	0x10214de74
102e1d3e8:     	ldr	w8, [sp, #0x44]
102e1d3ec:     	cmp	w8, w0
102e1d3f0:     	b.ne	0x102e1d424
102e1d3f4:     	adrp	x8, 0x104cd4000
102e1d3f8:     	ldr	w27, [x8, #0x388]
102e1d3fc:     	ldr	x0, [x19, #0x48]
102e1d400:     	bl	0x102e4c884
102e1d404:     	cmp	w27, w0
102e1d408:     	b.eq	0x102e1cebc
102e1d40c:     	adrp	x8, 0x104cd4000
102e1d410:     	ldrb	w8, [x8, #0x38c]
102e1d414:     	tbnz	w8, #0x0, 0x102e1cebc
102e1d418:     	mov	x0, x19
102e1d41c:     	bl	0x102e18d58
102e1d420:     	b	0x102e1cebc
102e1d424:     	adrp	x0, 0x104d65000
102e1d428:     	add	x0, x0, #0x290
102e1d42c:     	bl	0x10214de74
102e1d430:     	ldr	w8, [sp, #0x44]
102e1d434:     	cmp	w8, w0
102e1d438:     	b.eq	0x102e1d4b4
102e1d43c:     	adrp	x0, 0x104d65000
102e1d440:     	add	x0, x0, #0x2f0
102e1d444:     	bl	0x10214de74
102e1d448:     	ldr	w8, [sp, #0x44]
102e1d44c:     	cmp	w8, w0
102e1d450:     	b.eq	0x102e1d4b4
102e1d454:     	adrp	x0, 0x104d65000
102e1d458:     	add	x0, x0, #0x350
102e1d45c:     	bl	0x10214de74
102e1d460:     	ldr	w8, [sp, #0x44]
102e1d464:     	cmp	w8, w0
102e1d468:     	b.eq	0x102e1d4b4
102e1d46c:     	adrp	x0, 0x104d65000
102e1d470:     	add	x0, x0, #0x210
102e1d474:     	bl	0x10214de74
102e1d478:     	ldr	w8, [sp, #0x44]
102e1d47c:     	cmp	w8, w0
102e1d480:     	b.eq	0x102e1d4b4
102e1d484:     	adrp	x0, 0x104d65000
102e1d488:     	add	x0, x0, #0x230
102e1d48c:     	bl	0x10214de74
102e1d490:     	ldr	w8, [sp, #0x44]
102e1d494:     	cmp	w8, w0
102e1d498:     	b.eq	0x102e1d4b4
102e1d49c:     	adrp	x0, 0x104d65000
102e1d4a0:     	add	x0, x0, #0x3d0
102e1d4a4:     	bl	0x10214de74
102e1d4a8:     	ldr	w8, [sp, #0x44]
102e1d4ac:     	cmp	w8, w0
102e1d4b0:     	b.ne	0x102e1cebc
102e1d4b4:     	mov	w8, #0x0                ; =0
102e1d4b8:     	b	0x102e1ceb4
102e1d4bc:     	b	0x102e1d568
102e1d4c0:     	mov	x19, x0
102e1d4c4:     	add	x0, x28, #0x8
102e1d4c8:     	bl	0x10001022c
102e1d4cc:     	add	x8, sp, #0x90
102e1d4d0:     	add	x0, x8, #0x8
102e1d4d4:     	b	0x102e1d518
102e1d4d8:     	mov	x19, x0
102e1d4dc:     	add	x0, x27, #0x8
102e1d4e0:     	bl	0x10001022c
102e1d4e4:     	add	x0, x28, #0x8
102e1d4e8:     	b	0x102e1d518
102e1d4ec:     	b	0x102e1d568
102e1d4f0:     	mov	x19, x0
102e1d4f4:     	add	x0, x27, #0x8
102e1d4f8:     	b	0x102e1d518
102e1d4fc:     	b	0x102e1d568
102e1d500:     	mov	x19, x0
102e1d504:     	add	x0, x24, #0x8
102e1d508:     	bl	0x10001022c
102e1d50c:     	add	x0, x23, #0x8
102e1d510:     	bl	0x10001022c
102e1d514:     	add	x0, x22, #0x8
102e1d518:     	bl	0x10001022c
102e1d51c:     	b	0x102e1d56c
102e1d520:     	b	0x102e1d568
102e1d524:     	b	0x102e1d568
102e1d528:     	b	0x102e1d568
102e1d52c:     	b	0x102e1d568
102e1d530:     	b	0x102e1d568
102e1d534:     	b	0x102e1d568
102e1d538:     	b	0x102e1d568
102e1d53c:     	b	0x102e1d568
102e1d540:     	b	0x102e1d568
102e1d544:     	b	0x102e1d568
102e1d548:     	b	0x102e1d568
102e1d54c:     	b	0x102e1d568
102e1d550:     	b	0x102e1d568
102e1d554:     	b	0x102e1d558
102e1d558:     	mov	x19, x0
102e1d55c:     	add	x0, x27, #0x8
102e1d560:     	bl	0x10001022c
102e1d564:     	b	0x102e1d57c
102e1d568:     	mov	x19, x0
102e1d56c:     	add	x0, sp, #0xd0
102e1d570:     	bl	0x1005ee6bc
102e1d574:     	add	x0, sp, #0x1a8
102e1d578:     	bl	0x1021285a4
102e1d57c:     	mov	x0, x19
102e1d580:     	bl	0x103bda970

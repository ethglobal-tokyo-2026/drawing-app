
FUNCTION 0x10288d8ac size 4420
10288d8ac:     	stp	d15, d14, [sp, #-0xa0]!
10288d8b0:     	stp	d13, d12, [sp, #0x10]
10288d8b4:     	stp	d11, d10, [sp, #0x20]
10288d8b8:     	stp	d9, d8, [sp, #0x30]
10288d8bc:     	stp	x28, x27, [sp, #0x40]
10288d8c0:     	stp	x26, x25, [sp, #0x50]
10288d8c4:     	stp	x24, x23, [sp, #0x60]
10288d8c8:     	stp	x22, x21, [sp, #0x70]
10288d8cc:     	stp	x20, x19, [sp, #0x80]
10288d8d0:     	stp	x29, x30, [sp, #0x90]
10288d8d4:     	add	x29, sp, #0x90
10288d8d8:     	sub	sp, sp, #0x3b0
10288d8dc:     	ldr	x9, [x1, #0x10]
10288d8e0:     	ldr	x8, [x1]
10288d8e4:     	cmp	x9, #0x0
10288d8e8:     	ccmp	x8, #0x0, #0x4, ne
10288d8ec:     	b.eq	0x10288e874
10288d8f0:     	mov	x20, x1
10288d8f4:     	mov	x19, x0
10288d8f8:     	ldr	w10, [x1, #0xc0]
10288d8fc:     	cbz	w10, 0x10288d908
10288d900:     	ldr	w10, [x19, #0x1a0]
10288d904:     	cbz	w10, 0x10288e874
10288d908:     	ldr	q0, [x20, #0x80]
10288d90c:     	stur	q0, [x29, #-0xb0]
10288d910:     	ldr	w23, [x19, #0x15c]
10288d914:     	cbz	w23, 0x10288d94c
10288d918:     	ldr	x8, [x20, #0x18]
10288d91c:     	stp	x9, x8, [x29, #-0xc0]
10288d920:     	cbz	x8, 0x10288d930
10288d924:     	add	x8, x8, #0x8
10288d928:     	mov	w9, #0x1                ; =1
10288d92c:     	ldadd	w9, w8, [x8]
10288d930:     	sub	x21, x29, #0xc0
10288d934:     	sub	x0, x29, #0xc0
10288d938:     	bl	0x102996d64
10288d93c:     	add	x0, x21, #0x8
10288d940:     	bl	0x10001022c
10288d944:     	str	wzr, [x19, #0x15c]
10288d948:     	ldr	x8, [x20]
10288d94c:     	ldr	x9, [x20, #0x8]
10288d950:     	stp	x8, x9, [x29, #-0xd0]
10288d954:     	cbz	x9, 0x10288d964
10288d958:     	add	x8, x9, #0x8
10288d95c:     	mov	w9, #0x1                ; =1
10288d960:     	ldadd	w9, w8, [x8]
10288d964:     	sub	x22, x29, #0xd0
10288d968:     	add	x0, x19, #0x268
10288d96c:     	sub	x1, x29, #0xd0
10288d970:     	bl	0x102c70688
10288d974:     	mov	x21, x0
10288d978:     	add	x0, x22, #0x8
10288d97c:     	bl	0x10001022c
10288d980:     	cbz	w21, 0x10288dae0
10288d984:     	add	x0, x19, #0x268
10288d988:     	bl	0x102c709e4
10288d98c:     	cbz	w0, 0x10288d9d8
10288d990:     	ldp	x9, x8, [x20, #0x10]
10288d994:     	stp	x9, x8, [x29, #-0xe0]
10288d998:     	cbz	x8, 0x10288d9a8
10288d99c:     	add	x8, x8, #0x8
10288d9a0:     	mov	w9, #0x1                ; =1
10288d9a4:     	ldadd	w9, w8, [x8]
10288d9a8:     	sub	x21, x29, #0xe0
10288d9ac:     	sub	x0, x29, #0xe0
10288d9b0:     	bl	0x102996e2c
10288d9b4:     	add	x0, x21, #0x8
10288d9b8:     	bl	0x10001022c
10288d9bc:     	add	x0, x19, #0x268
10288d9c0:     	bl	0x102c7094c
10288d9c4:     	cbz	w0, 0x10288e72c
10288d9c8:     	mov	x0, x19
10288d9cc:     	mov	x1, x20
10288d9d0:     	bl	0x10288e9f0
10288d9d4:     	b	0x10288e874
10288d9d8:     	ldr	w8, [x20, #0xc0]
10288d9dc:     	cbnz	w8, 0x10288dae0
10288d9e0:     	ldr	x0, [x19, #0x2a8]
10288d9e4:     	cbz	x0, 0x10288dae0
10288d9e8:     	ldr	w8, [x20, #0xc4]
10288d9ec:     	cbz	w8, 0x10288d9f8
10288d9f0:     	bl	0x1028f27f0
10288d9f4:     	ldr	x0, [x19, #0x2a8]
10288d9f8:     	ldp	d0, d1, [x20, #0x80]
10288d9fc:     	ldr	x1, [x20, #0xd0]
10288da00:     	bl	0x1028f25b0
10288da04:     	fmov	d8, d0
10288da08:     	ldr	d0, [x19, #0x1a8]
10288da0c:     	fcmp	d8, d0
10288da10:     	b.lt	0x10288dad8
10288da14:     	ldp	x9, x8, [x20, #0x10]
10288da18:     	stp	x9, x8, [x29, #-0xf0]
10288da1c:     	cbz	x8, 0x10288da2c
10288da20:     	add	x8, x8, #0x8
10288da24:     	mov	w9, #0x1                ; =1
10288da28:     	ldadd	w9, w8, [x8]
10288da2c:     	sub	x21, x29, #0xf0
10288da30:     	sub	x0, x29, #0xf0
10288da34:     	bl	0x102996e2c
10288da38:     	add	x0, x21, #0x8
10288da3c:     	bl	0x10001022c
10288da40:     	adrp	x8, 0x1042f8000
10288da44:     	ldr	d0, [x8, #0x1e0]
10288da48:     	fcmp	d8, d0
10288da4c:     	b.hi	0x10288dad8
10288da50:     	add	x0, sp, #0x200
10288da54:     	bl	0x1031210f4
10288da58:     	sub	x8, x29, #0x100
10288da5c:     	add	x21, x8, #0x8
10288da60:     	ldp	x9, x8, [x20]
10288da64:     	stp	x9, x8, [x29, #-0x100]
10288da68:     	cbz	x8, 0x10288da78
10288da6c:     	add	x8, x8, #0x8
10288da70:     	mov	w9, #0x1                ; =1
10288da74:     	ldadd	w9, w8, [x8]
10288da78:     	add	x0, x19, #0x268
10288da7c:     	sub	x1, x29, #0x100
10288da80:     	bl	0x102c707ac
10288da84:     	sxtw	x1, w0
10288da88:     	add	x0, sp, #0x200
10288da8c:     	bl	0x10312115c
10288da90:     	mov	x0, x21
10288da94:     	bl	0x10001022c
10288da98:     	add	x8, sp, #0x330
10288da9c:     	add	x21, x8, #0x8
10288daa0:     	ldp	x9, x8, [x20, #0x10]
10288daa4:     	str	x9, [sp, #0x330]
10288daa8:     	str	x8, [sp, #0x338]
10288daac:     	cbz	x8, 0x10288dabc
10288dab0:     	add	x8, x8, #0x8
10288dab4:     	mov	w9, #0x1                ; =1
10288dab8:     	ldadd	w9, w8, [x8]
10288dabc:     	add	x0, sp, #0x330
10288dac0:     	add	x1, sp, #0x200
10288dac4:     	bl	0x102996d94
10288dac8:     	mov	x0, x21
10288dacc:     	bl	0x10001022c
10288dad0:     	add	x0, sp, #0x200
10288dad4:     	bl	0x103121130
10288dad8:     	ldur	q0, [x20, #0x80]
10288dadc:     	str	q0, [x19, #0x1c0]
10288dae0:     	ldp	x9, x8, [x20, #0x10]
10288dae4:     	str	x9, [sp, #0x320]
10288dae8:     	str	x8, [sp, #0x328]
10288daec:     	cbz	x8, 0x10288dafc
10288daf0:     	add	x8, x8, #0x8
10288daf4:     	mov	w9, #0x1                ; =1
10288daf8:     	ldadd	w9, w8, [x8]
10288dafc:     	str	w23, [sp, #0x5c]
10288db00:     	add	x21, sp, #0x320
10288db04:     	add	x0, sp, #0x320
10288db08:     	bl	0x102992930
10288db0c:     	fmov	d8, d0
10288db10:     	add	x0, x21, #0x8
10288db14:     	bl	0x10001022c
10288db18:     	ldr	x0, [x19, #0x78]
10288db1c:     	cbz	x0, 0x10288db40
10288db20:     	ldr	w8, [x20, #0xc0]
10288db24:     	cbnz	w8, 0x10288db40
10288db28:     	ldr	x8, [x0]
10288db2c:     	ldr	x8, [x8, #0x18]
10288db30:     	mov	x1, x20
10288db34:     	mov	w2, #0x0                ; =0
10288db38:     	blr	x8
10288db3c:     	cbz	w0, 0x10288e73c
10288db40:     	adrp	x25, 0x104d6e000
10288db44:     	ldr	x8, [x25, #0xf0]
10288db48:     	ldp	x8, x9, [x8]
10288db4c:     	sub	x8, x9, x8
10288db50:     	lsr	x9, x8, #4
10288db54:     	cmp	w9, #0x1
10288db58:     	b.lt	0x10288e7d0
10288db5c:     	mov	x21, #0x0               ; =0
10288db60:     	add	x28, sp, #0x298
10288db64:     	adrp	x9, 0x1042ee000
10288db68:     	ldr	d0, [x9, #0x828]
10288db6c:     	fmul	d8, d8, d0
10288db70:     	add	x24, sp, #0x278
10288db74:     	add	x27, sp, #0x268
10288db78:     	ubfx	x8, x8, #4, #31
10288db7c:     	str	x8, [sp, #0x70]
10288db80:     	mov	w26, #0x1               ; =1
10288db84:     	fmov.2d	v1, #0.50000000
10288db88:     	fmov	d10, #0.50000000
10288db8c:     	mov	x8, #0x3d71             ; =15729
10288db90:     	movk	x8, #0xd70a, lsl #16
10288db94:     	movk	x8, #0x70a3, lsl #32
10288db98:     	movk	x8, #0x3fe5, lsl #48
10288db9c:     	dup.2d	v0, x8
10288dba0:     	stp	q0, q1, [sp, #0x10]
10288dba4:     	ldr	x8, [x25, #0xf0]
10288dba8:     	ldr	x8, [x8]
10288dbac:     	lsl	x9, x21, #4
10288dbb0:     	str	x9, [sp, #0x78]
10288dbb4:     	ldr	x22, [x8, x9]
10288dbb8:     	str	xzr, [sp, #0x2b0]
10288dbbc:     	str	xzr, [sp, #0x2a8]
10288dbc0:     	str	xzr, [sp, #0x2a0]
10288dbc4:     	str	xzr, [sp, #0x298]
10288dbc8:     	str	xzr, [sp, #0x290]
10288dbcc:     	str	xzr, [sp, #0x288]
10288dbd0:     	adrp	x8, 0x104d6e000
10288dbd4:     	ldr	x8, [x8, #0x100]
10288dbd8:     	ldr	x8, [x8]
10288dbdc:     	add	x8, x8, x21, lsl #4
10288dbe0:     	ldr	x0, [x8]
10288dbe4:     	str	x0, [sp, #0x278]
10288dbe8:     	ldr	x8, [x8, #0x8]
10288dbec:     	str	x8, [sp, #0x280]
10288dbf0:     	cbz	x8, 0x10288dbfc
10288dbf4:     	add	x8, x8, #0x8
10288dbf8:     	ldadd	w26, w8, [x8]
10288dbfc:     	ldp	w8, w9, [x20, #0xc0]
10288dc00:     	cbz	w9, 0x10288dc1c
10288dc04:     	cbnz	w8, 0x10288dc1c
10288dc08:     	cbz	x0, 0x10288dc18
10288dc0c:     	bl	0x1028f27f0
10288dc10:     	ldr	w8, [x20, #0xc0]
10288dc14:     	b	0x10288dc1c
10288dc18:     	mov	w8, #0x0                ; =0
10288dc1c:     	ldr	x0, [x19, #0x78]
10288dc20:     	cbz	x0, 0x10288ddbc
10288dc24:     	cbnz	w8, 0x10288ddbc
10288dc28:     	bl	0x102ce8894
10288dc2c:     	mov	x23, x0
10288dc30:     	ldr	x0, [x19, #0x78]
10288dc34:     	bl	0x102ce8cb8
10288dc38:     	mov	x24, x0
10288dc3c:     	mov	x28, x25
10288dc40:     	str	xzr, [sp, #0x150]
10288dc44:     	str	xzr, [sp, #0xd0]
10288dc48:     	cmp	w23, #0x1e
10288dc4c:     	b.eq	0x10288dcb0
10288dc50:     	ldr	x0, [x19, #0x78]
10288dc54:     	add	x1, sp, #0x200
10288dc58:     	bl	0x102ce8cf4
10288dc5c:     	cbz	w0, 0x10288dcb0
10288dc60:     	cbnz	x21, 0x10288dc6c
10288dc64:     	ldr	q0, [sp, #0x200]
10288dc68:     	stur	q0, [x29, #-0xb0]
10288dc6c:     	ldr	x0, [x19, #0x88]
10288dc70:     	cbz	x0, 0x10288dc80
10288dc74:     	add	x1, sp, #0x200
10288dc78:     	mov	x2, x21
10288dc7c:     	bl	0x102cf9834
10288dc80:     	ldr	d0, [x19, #0x128]
10288dc84:     	sshll.2d	v0, v0, #0x0
10288dc88:     	scvtf.2d	v0, v0
10288dc8c:     	ldr	q1, [sp, #0x200]
10288dc90:     	fadd.2d	v0, v1, v0
10288dc94:     	ldr	x0, [sp, #0x278]
10288dc98:     	ldr	x1, [sp, #0x228]
10288dc9c:     	mov	d1, v0[1]
10288dca0:     	add	x3, sp, #0x150
10288dca4:     	add	x4, sp, #0xd0
10288dca8:     	mov	x2, x24
10288dcac:     	bl	0x1028f2798
10288dcb0:     	cmp	w24, #0x1
10288dcb4:     	b.lt	0x10288ddac
10288dcb8:     	mov	w25, #0x0               ; =0
10288dcbc:     	ucvtf	d9, w24
10288dcc0:     	ldr	x0, [x19, #0x78]
10288dcc4:     	add	x8, sp, #0x200
10288dcc8:     	mov	x1, x25
10288dccc:     	bl	0x102ce8cd4
10288dcd0:     	ldr	x0, [x19, #0x88]
10288dcd4:     	cbz	x0, 0x10288dce4
10288dcd8:     	add	x1, sp, #0x200
10288dcdc:     	mov	x2, x21
10288dce0:     	bl	0x102cf9834
10288dce4:     	ldr	w8, [x19, #0x194]
10288dce8:     	ldr	d0, [sp, #0x210]
10288dcec:     	ldr	w2, [sp, #0x21c]
10288dcf0:     	ldr	w3, [sp, #0x218]
10288dcf4:     	ldr	w4, [sp, #0x220]
10288dcf8:     	ldr	w5, [x20, #0xc0]
10288dcfc:     	ldp	x10, x9, [x20, #0x10]
10288dd00:     	str	x10, [sp, #0x268]
10288dd04:     	str	x9, [sp, #0x270]
10288dd08:     	cbz	x9, 0x10288dd14
10288dd0c:     	add	x9, x9, #0x8
10288dd10:     	ldadd	w26, w9, [x9]
10288dd14:     	scvtf	d1, w8
10288dd18:     	ucvtf	d2, w25
10288dd1c:     	fdiv	d2, d2, d9
10288dd20:     	fadd	d1, d2, d1
10288dd24:     	add	x1, sp, #0x200
10288dd28:     	add	x6, sp, #0x268
10288dd2c:     	add	x7, sp, #0x2c8
10288dd30:     	mov	x0, x19
10288dd34:     	bl	0x10288cd3c
10288dd38:     	add	x0, x27, #0x8
10288dd3c:     	bl	0x10001022c
10288dd40:     	ldr	w8, [sp, #0x224]
10288dd44:     	cbz	w8, 0x10288dd54
10288dd48:     	ldr	w8, [sp, #0x318]
10288dd4c:     	orr	w8, w8, #0x10
10288dd50:     	str	w8, [sp, #0x318]
10288dd54:     	cmp	w23, #0x1e
10288dd58:     	b.ne	0x10288dd78
10288dd5c:     	ldr	x0, [sp, #0x278]
10288dd60:     	ldr	d0, [sp, #0x2c8]
10288dd64:     	ldr	d1, [sp, #0x2d0]
10288dd68:     	ldr	x1, [sp, #0x228]
10288dd6c:     	bl	0x1028f25b0
10288dd70:     	str	d0, [sp, #0x2e8]
10288dd74:     	b	0x10288dd8c
10288dd78:     	ldr	d0, [sp, #0x150]
10288dd7c:     	str	d0, [sp, #0x2e8]
10288dd80:     	ldr	d1, [sp, #0xd0]
10288dd84:     	fadd	d0, d0, d1
10288dd88:     	str	d0, [sp, #0x150]
10288dd8c:     	add	x1, sp, #0x2c8
10288dd90:     	add	x2, sp, #0x2a8
10288dd94:     	mov	x0, x22
10288dd98:     	fmov	d0, d8
10288dd9c:     	bl	0x1028ec548
10288dda0:     	add	w25, w25, #0x1
10288dda4:     	cmp	w24, w25
10288dda8:     	b.ne	0x10288dcc0
10288ddac:     	add	x24, sp, #0x278
10288ddb0:     	mov	x25, x28
10288ddb4:     	add	x28, sp, #0x298
10288ddb8:     	b	0x10288ddc0
10288ddbc:     	cbz	x0, 0x10288de44
10288ddc0:     	ldr	w8, [x20, #0xc0]
10288ddc4:     	cbnz	w8, 0x10288dde4
10288ddc8:     	ldr	x8, [x19]
10288ddcc:     	ldr	x8, [x8, #0x200]
10288ddd0:     	mov	x0, x19
10288ddd4:     	mov	x1, x20
10288ddd8:     	mov	w2, #0x1                ; =1
10288dddc:     	mov	w3, #0x1                ; =1
10288dde0:     	blr	x8
10288dde4:     	ldr	w8, [sp, #0x298]
10288dde8:     	ldr	w9, [sp, #0x2a0]
10288ddec:     	cmp	w8, w9
10288ddf0:     	b.ge	0x10288dff8
10288ddf4:     	ldr	w8, [sp, #0x29c]
10288ddf8:     	ldr	w9, [sp, #0x2a4]
10288ddfc:     	cmp	w8, w9
10288de00:     	b.ge	0x10288dff8
10288de04:     	ldr	q0, [x28]
10288de08:     	str	q0, [sp, #0x200]
10288de0c:     	ldr	w8, [x19, #0x128]
10288de10:     	ldr	w9, [x19, #0x120]
10288de14:     	sub	w1, w9, w8
10288de18:     	ldr	w8, [x19, #0x12c]
10288de1c:     	ldr	w9, [x19, #0x124]
10288de20:     	sub	w2, w9, w8
10288de24:     	add	x0, sp, #0x200
10288de28:     	bl	0x10221b4d4
10288de2c:     	ldr	w8, [x19, #0x130]
10288de30:     	ldr	x0, [x19, #0x100]
10288de34:     	cbz	w8, 0x10288df8c
10288de38:     	add	x1, sp, #0x200
10288de3c:     	bl	0x1036a53d8
10288de40:     	b	0x10288dfb8
10288de44:     	cbz	w8, 0x10288e19c
10288de48:     	str	xzr, [sp, #0x260]
10288de4c:     	movi.2d	v0, #0000000000000000
10288de50:     	stp	q0, q0, [sp, #0x240]
10288de54:     	stp	q0, q0, [sp, #0x220]
10288de58:     	stp	q0, q0, [sp, #0x200]
10288de5c:     	ldr	x0, [x20]
10288de60:     	add	x1, sp, #0x200
10288de64:     	bl	0x102e1b4fc
10288de68:     	ldr	w8, [x19, #0x1a0]
10288de6c:     	cbz	w8, 0x10288ddc0
10288de70:     	ldr	w8, [sp, #0x21c]
10288de74:     	cmp	w8, #0x2
10288de78:     	b.eq	0x10288ddc0
10288de7c:     	adrp	x8, 0x104d6e000
10288de80:     	ldr	x8, [x8, #0xf8]
10288de84:     	cbz	x8, 0x10288ddc0
10288de88:     	ldp	x8, x9, [x8]
10288de8c:     	sub	x9, x9, x8
10288de90:     	lsr	x9, x9, #4
10288de94:     	cmp	x21, w9, sxtw
10288de98:     	b.ge	0x10288ddc0
10288de9c:     	ldr	x9, [sp, #0x78]
10288dea0:     	ldr	x23, [x8, x9]
10288dea4:     	cbz	x23, 0x10288ddc0
10288dea8:     	ldur	q0, [x29, #-0xb0]
10288deac:     	str	q0, [sp, #0x150]
10288deb0:     	ldr	x0, [x19, #0x88]
10288deb4:     	cbz	x0, 0x10288dec4
10288deb8:     	add	x1, sp, #0x150
10288debc:     	mov	x2, x21
10288dec0:     	bl	0x102cf9834
10288dec4:     	ldr	d0, [x20, #0xa0]
10288dec8:     	ldp	w3, w2, [x20, #0xa8]
10288decc:     	ldr	w4, [x20, #0xb0]
10288ded0:     	ldr	w8, [x19, #0x194]
10288ded4:     	ldr	w5, [x20, #0xc0]
10288ded8:     	ldp	x10, x9, [x20, #0x10]
10288dedc:     	stp	x10, x9, [sp, #0x1f0]
10288dee0:     	cbz	x9, 0x10288deec
10288dee4:     	add	x9, x9, #0x8
10288dee8:     	ldadd	w26, w9, [x9]
10288deec:     	scvtf	d1, w8
10288def0:     	add	x1, sp, #0x150
10288def4:     	add	x6, sp, #0x1f0
10288def8:     	add	x7, sp, #0x2c8
10288defc:     	mov	x0, x19
10288df00:     	bl	0x10288cd3c
10288df04:     	add	x8, sp, #0x1f0
10288df08:     	add	x0, x8, #0x8
10288df0c:     	bl	0x10001022c
10288df10:     	adrp	x8, 0x104d6e000
10288df14:     	ldr	x8, [x8, #0x108]
10288df18:     	cbz	x8, 0x10288df74
10288df1c:     	ldp	x8, x9, [x8]
10288df20:     	sub	x9, x9, x8
10288df24:     	lsr	x9, x9, #4
10288df28:     	cmp	x21, w9, sxtw
10288df2c:     	b.ge	0x10288df74
10288df30:     	add	x8, x8, x21, lsl #4
10288df34:     	ldr	x0, [x8]
10288df38:     	str	x0, [sp, #0xd0]
10288df3c:     	ldr	x8, [x8, #0x8]
10288df40:     	str	x8, [sp, #0xd8]
10288df44:     	cbz	x8, 0x10288df50
10288df48:     	add	x8, x8, #0x8
10288df4c:     	ldadd	w26, w8, [x8]
10288df50:     	cbz	x0, 0x10288df68
10288df54:     	ldr	d0, [sp, #0x2c8]
10288df58:     	ldr	d1, [sp, #0x2d0]
10288df5c:     	ldr	x1, [x20, #0xd0]
10288df60:     	bl	0x1028f25b0
10288df64:     	str	d0, [sp, #0x2e8]
10288df68:     	add	x8, sp, #0xd0
10288df6c:     	add	x0, x8, #0x8
10288df70:     	bl	0x10001022c
10288df74:     	add	x1, sp, #0x2c8
10288df78:     	add	x2, sp, #0x288
10288df7c:     	mov	x0, x23
10288df80:     	fmov	d0, d8
10288df84:     	bl	0x1028ec548
10288df88:     	b	0x10288ddc0
10288df8c:     	ldr	w1, [sp, #0x200]
10288df90:     	ldr	w2, [sp, #0x204]
10288df94:     	ldr	w8, [sp, #0x208]
10288df98:     	ldr	w9, [sp, #0x20c]
10288df9c:     	sub	w3, w8, w1
10288dfa0:     	sub	w4, w9, w2
10288dfa4:     	ldr	x5, [x19, #0x110]
10288dfa8:     	str	wzr, [sp]
10288dfac:     	mov	x6, x1
10288dfb0:     	mov	x7, x2
10288dfb4:     	bl	0x1036a5d24
10288dfb8:     	add	x1, sp, #0x200
10288dfbc:     	mov	x0, x19
10288dfc0:     	bl	0x10288cef8
10288dfc4:     	str	x0, [sp, #0x200]
10288dfc8:     	str	x1, [sp, #0x208]
10288dfcc:     	ldp	x9, x8, [x20, #0x10]
10288dfd0:     	stp	x9, x8, [sp, #0xc0]
10288dfd4:     	cbz	x8, 0x10288dfe0
10288dfd8:     	add	x8, x8, #0x8
10288dfdc:     	ldadd	w26, w8, [x8]
10288dfe0:     	add	x0, sp, #0xc0
10288dfe4:     	add	x1, sp, #0x200
10288dfe8:     	bl	0x1029a0280
10288dfec:     	add	x8, sp, #0xc0
10288dff0:     	add	x0, x8, #0x8
10288dff4:     	bl	0x10001022c
10288dff8:     	ldr	w8, [sp, #0x2a8]
10288dffc:     	ldr	w9, [sp, #0x2b0]
10288e000:     	cmp	w8, w9
10288e004:     	b.ge	0x10288e024
10288e008:     	ldr	w8, [sp, #0x2ac]
10288e00c:     	ldr	w9, [sp, #0x2b4]
10288e010:     	cmp	w8, w9
10288e014:     	b.ge	0x10288e024
10288e018:     	add	x1, sp, #0x2a8
10288e01c:     	mov	x0, x22
10288e020:     	bl	0x1028ec7c4
10288e024:     	ldr	q0, [x28, #0x10]
10288e028:     	str	q0, [sp, #0x200]
10288e02c:     	ldr	w8, [sp, #0x288]
10288e030:     	ldr	w9, [sp, #0x290]
10288e034:     	cmp	w8, w9
10288e038:     	b.ge	0x10288e074
10288e03c:     	ldr	w8, [sp, #0x28c]
10288e040:     	ldr	w9, [sp, #0x294]
10288e044:     	cmp	w8, w9
10288e048:     	b.ge	0x10288e074
10288e04c:     	adrp	x8, 0x104d6e000
10288e050:     	ldr	x8, [x8, #0xf8]
10288e054:     	ldr	x8, [x8]
10288e058:     	ldr	x9, [sp, #0x78]
10288e05c:     	ldr	x0, [x8, x9]
10288e060:     	add	x1, sp, #0x288
10288e064:     	bl	0x1028ec7c4
10288e068:     	add	x0, sp, #0x200
10288e06c:     	add	x1, sp, #0x288
10288e070:     	bl	0x10221b5e4
10288e074:     	ldr	w8, [sp, #0x200]
10288e078:     	ldr	w9, [sp, #0x208]
10288e07c:     	cmp	w8, w9
10288e080:     	b.ge	0x10288e11c
10288e084:     	ldr	w8, [sp, #0x204]
10288e088:     	ldr	w9, [sp, #0x20c]
10288e08c:     	cmp	w8, w9
10288e090:     	b.ge	0x10288e11c
10288e094:     	add	x1, sp, #0x200
10288e098:     	mov	x0, x19
10288e09c:     	bl	0x10288cef8
10288e0a0:     	str	x0, [sp, #0x200]
10288e0a4:     	str	x1, [sp, #0x208]
10288e0a8:     	ldr	w8, [x19, #0x120]
10288e0ac:     	neg	w1, w8
10288e0b0:     	ldr	w8, [x19, #0x124]
10288e0b4:     	neg	w2, w8
10288e0b8:     	add	x0, sp, #0x200
10288e0bc:     	bl	0x10221b4d4
10288e0c0:     	ldp	x9, x8, [x20, #0x10]
10288e0c4:     	stp	x9, x8, [sp, #0xb0]
10288e0c8:     	cbz	x8, 0x10288e0d4
10288e0cc:     	add	x8, x8, #0x8
10288e0d0:     	ldadd	w26, w8, [x8]
10288e0d4:     	add	x0, sp, #0xb0
10288e0d8:     	add	x1, sp, #0x200
10288e0dc:     	bl	0x1029a0280
10288e0e0:     	add	x8, sp, #0xb0
10288e0e4:     	add	x0, x8, #0x8
10288e0e8:     	bl	0x10001022c
10288e0ec:     	bl	0x10310f644
10288e0f0:     	mov	x22, x0
10288e0f4:     	ldr	x8, [x19, #0x150]
10288e0f8:     	sub	x8, x0, x8
10288e0fc:     	cmp	x8, #0x65
10288e100:     	b.lt	0x10288e11c
10288e104:     	ldr	x0, [x19, #0x2d8]
10288e108:     	cbz	x0, 0x10288e110
10288e10c:     	bl	0x1028a5a68
10288e110:     	ldr	x0, [x20, #0x10]
10288e114:     	bl	0x1021c1658
10288e118:     	str	x22, [x19, #0x150]
10288e11c:     	ldp	x9, x8, [x20]
10288e120:     	stp	x9, x8, [sp, #0xa0]
10288e124:     	cbz	x8, 0x10288e130
10288e128:     	add	x8, x8, #0x8
10288e12c:     	ldadd	w26, w8, [x8]
10288e130:     	add	x0, x19, #0x268
10288e134:     	add	x1, sp, #0xa0
10288e138:     	bl	0x102c70688
10288e13c:     	cbz	w0, 0x10288e174
10288e140:     	ldr	w22, [x20, #0xc0]
10288e144:     	add	x8, sp, #0xa0
10288e148:     	add	x0, x8, #0x8
10288e14c:     	bl	0x10001022c
10288e150:     	cbnz	w22, 0x10288e180
10288e154:     	ldr	x8, [x19, #0x300]
10288e158:     	mov	w9, #0x18               ; =24
10288e15c:     	madd	x0, x21, x9, x8
10288e160:     	add	x1, sp, #0x2c8
10288e164:     	bl	0x10288fb28
10288e168:     	ldur	q0, [x20, #0x80]
10288e16c:     	str	q0, [x19, #0x330]
10288e170:     	b	0x10288e180
10288e174:     	add	x8, sp, #0xa0
10288e178:     	add	x0, x8, #0x8
10288e17c:     	bl	0x10001022c
10288e180:     	add	x0, x24, #0x8
10288e184:     	bl	0x10001022c
10288e188:     	add	x21, x21, #0x1
10288e18c:     	ldr	x8, [sp, #0x70]
10288e190:     	cmp	x21, x8
10288e194:     	b.ne	0x10288dba4
10288e198:     	b	0x10288e7d0
10288e19c:     	ldr	w8, [x19, #0x1a0]
10288e1a0:     	cbz	w8, 0x10288e244
10288e1a4:     	adrp	x8, 0x104d6e000
10288e1a8:     	ldr	x8, [x8, #0xf8]
10288e1ac:     	cbz	x8, 0x10288e244
10288e1b0:     	ldp	x8, x9, [x8]
10288e1b4:     	sub	x9, x9, x8
10288e1b8:     	lsr	x9, x9, #4
10288e1bc:     	cmp	x21, w9, sxtw
10288e1c0:     	b.ge	0x10288e244
10288e1c4:     	ldr	x9, [sp, #0x78]
10288e1c8:     	ldr	x0, [x8, x9]
10288e1cc:     	cbz	x0, 0x10288e244
10288e1d0:     	bl	0x1028eccbc
10288e1d4:     	str	x0, [sp, #0x200]
10288e1d8:     	str	x1, [sp, #0x208]
10288e1dc:     	lsr	x8, x0, #32
10288e1e0:     	lsr	x9, x1, #32
10288e1e4:     	cmp	w0, w1
10288e1e8:     	ccmp	w8, w9, #0x0, lt
10288e1ec:     	b.ge	0x10288e244
10288e1f0:     	add	x0, sp, #0x298
10288e1f4:     	add	x1, sp, #0x200
10288e1f8:     	bl	0x10221b5e4
10288e1fc:     	add	x0, sp, #0x200
10288e200:     	mov	w1, #0x1                ; =1
10288e204:     	mov	w2, #0x1                ; =1
10288e208:     	bl	0x10221b508
10288e20c:     	ldr	w8, [x19, #0x128]
10288e210:     	ldr	w9, [x19, #0x120]
10288e214:     	sub	w1, w9, w8
10288e218:     	ldr	w8, [x19, #0x12c]
10288e21c:     	ldr	w9, [x19, #0x124]
10288e220:     	sub	w2, w9, w8
10288e224:     	add	x0, sp, #0x200
10288e228:     	bl	0x10221b4d4
10288e22c:     	add	x0, sp, #0x288
10288e230:     	add	x1, sp, #0x200
10288e234:     	bl	0x10221b5e4
10288e238:     	add	x0, sp, #0x2a8
10288e23c:     	add	x1, sp, #0x200
10288e240:     	bl	0x10221b5e4
10288e244:     	ldur	q0, [x29, #-0xb0]
10288e248:     	str	q0, [sp, #0x1e0]
10288e24c:     	ldr	x0, [x19, #0x88]
10288e250:     	cbz	x0, 0x10288e260
10288e254:     	add	x1, sp, #0x1e0
10288e258:     	mov	x2, x21
10288e25c:     	bl	0x102cf9834
10288e260:     	ldr	d0, [x20, #0xa0]
10288e264:     	ldp	w3, w2, [x20, #0xa8]
10288e268:     	ldr	w4, [x20, #0xb0]
10288e26c:     	ldr	w8, [x19, #0x194]
10288e270:     	ldr	w5, [x20, #0xc0]
10288e274:     	ldp	x10, x9, [x20, #0x10]
10288e278:     	stp	x10, x9, [sp, #0x1d0]
10288e27c:     	cbz	x9, 0x10288e288
10288e280:     	add	x9, x9, #0x8
10288e284:     	ldadd	w26, w9, [x9]
10288e288:     	scvtf	d1, w8
10288e28c:     	add	x1, sp, #0x1e0
10288e290:     	add	x6, sp, #0x1d0
10288e294:     	add	x7, sp, #0x2c8
10288e298:     	mov	x0, x19
10288e29c:     	bl	0x10288cd3c
10288e2a0:     	add	x8, sp, #0x1d0
10288e2a4:     	add	x0, x8, #0x8
10288e2a8:     	bl	0x10001022c
10288e2ac:     	ldr	x0, [sp, #0x278]
10288e2b0:     	ldr	d0, [sp, #0x2c8]
10288e2b4:     	ldr	d1, [sp, #0x2d0]
10288e2b8:     	ldr	x1, [x20, #0xd0]
10288e2bc:     	bl	0x1028f25b0
10288e2c0:     	str	d0, [sp, #0x2e8]
10288e2c4:     	add	x1, sp, #0x2c8
10288e2c8:     	add	x2, sp, #0x2a8
10288e2cc:     	mov	x0, x22
10288e2d0:     	fmov	d0, d8
10288e2d4:     	bl	0x1028ec548
10288e2d8:     	ldr	w8, [x19, #0x1a0]
10288e2dc:     	cbz	w8, 0x10288ddc0
10288e2e0:     	adrp	x8, 0x104d6e000
10288e2e4:     	ldr	x8, [x8, #0xf8]
10288e2e8:     	cbz	x8, 0x10288ddc0
10288e2ec:     	ldp	x8, x9, [x8]
10288e2f0:     	sub	x9, x9, x8
10288e2f4:     	lsr	x9, x9, #4
10288e2f8:     	cmp	x21, w9, sxtw
10288e2fc:     	b.ge	0x10288ddc0
10288e300:     	ldr	x9, [sp, #0x78]
10288e304:     	ldr	x0, [x8, x9]
10288e308:     	cbz	x0, 0x10288ddc0
10288e30c:     	ldr	w8, [x19, #0x128]
10288e310:     	str	w8, [sp, #0x60]
10288e314:     	ldr	w24, [x19, #0x120]
10288e318:     	ldr	w25, [x19, #0x12c]
10288e31c:     	ldr	w23, [x19, #0x124]
10288e320:     	str	x0, [sp, #0x38]
10288e324:     	bl	0x1028eccbc
10288e328:     	sub	w2, w23, w25
10288e32c:     	ldr	w8, [sp, #0x60]
10288e330:     	sub	w8, w24, w8
10288e334:     	stp	x0, x1, [sp, #0x1c0]
10288e338:     	add	x0, sp, #0x1c0
10288e33c:     	mov	x1, x8
10288e340:     	bl	0x10221b4d4
10288e344:     	add	x1, sp, #0x1c0
10288e348:     	ldr	x0, [sp, #0x38]
10288e34c:     	bl	0x1028ec9c4
10288e350:     	adrp	x8, 0x104d6e000
10288e354:     	ldr	x8, [x8, #0x108]
10288e358:     	ldr	x23, [sp, #0x38]
10288e35c:     	cbz	x8, 0x10288e3ac
10288e360:     	ldp	x8, x9, [x8]
10288e364:     	sub	x9, x9, x8
10288e368:     	lsr	x9, x9, #4
10288e36c:     	cmp	x21, w9, sxtw
10288e370:     	b.ge	0x10288e3ac
10288e374:     	add	x8, x8, x21, lsl #4
10288e378:     	ldr	x0, [x8]
10288e37c:     	str	x0, [sp, #0x200]
10288e380:     	ldr	x8, [x8, #0x8]
10288e384:     	str	x8, [sp, #0x208]
10288e388:     	cbz	x8, 0x10288e394
10288e38c:     	add	x8, x8, #0x8
10288e390:     	ldadd	w26, w8, [x8]
10288e394:     	cbz	x0, 0x10288e3a0
10288e398:     	ldr	x1, [sp, #0x278]
10288e39c:     	bl	0x1028f2804
10288e3a0:     	add	x8, sp, #0x200
10288e3a4:     	add	x0, x8, #0x8
10288e3a8:     	bl	0x10001022c
10288e3ac:     	mov	x0, x23
10288e3b0:     	mov	x1, x22
10288e3b4:     	bl	0x1028ed76c
10288e3b8:     	stp	xzr, xzr, [sp, #0x1b0]
10288e3bc:     	add	x8, sp, #0x200
10288e3c0:     	mov	x0, x22
10288e3c4:     	bl	0x1028ed748
10288e3c8:     	add	x8, sp, #0x150
10288e3cc:     	mov	x0, x22
10288e3d0:     	bl	0x1028ed71c
10288e3d4:     	ldr	x23, [sp, #0x38]
10288e3d8:     	ldp	q0, q1, [sp, #0x200]
10288e3dc:     	ldp	q2, q3, [sp, #0x150]
10288e3e0:     	fadd.2d	v0, v0, v2
10288e3e4:     	ldr	q2, [sp, #0x20]
10288e3e8:     	fmul.2d	v0, v0, v2
10288e3ec:     	fadd.2d	v1, v1, v3
10288e3f0:     	fmul.2d	v1, v1, v2
10288e3f4:     	stp	q0, q1, [sp, #0x200]
10288e3f8:     	ldr	d2, [sp, #0x220]
10288e3fc:     	ldr	d0, [sp, #0x228]
10288e400:     	ldp	d3, d1, [sp, #0x170]
10288e404:     	fadd	d2, d2, d3
10288e408:     	fmul	d2, d2, d10
10288e40c:     	str	d2, [sp, #0x220]
10288e410:     	fmov	d2, #0.50000000
10288e414:     	bl	0x102217f00
10288e418:     	str	d0, [sp, #0x228]
10288e41c:     	str	w26, [sp, #0x254]
10288e420:     	add	x1, sp, #0x200
10288e424:     	add	x2, sp, #0x1b0
10288e428:     	mov	x0, x23
10288e42c:     	fmov	d0, d8
10288e430:     	bl	0x1028ec548
10288e434:     	str	w26, [sp, #0x1a4]
10288e438:     	add	x1, sp, #0x150
10288e43c:     	add	x2, sp, #0x1b0
10288e440:     	mov	x0, x23
10288e444:     	fmov	d0, d8
10288e448:     	bl	0x1028ec548
10288e44c:     	ldr	x0, [x20]
10288e450:     	bl	0x102e259f0
10288e454:     	mov	x24, x0
10288e458:     	ldr	w8, [x20, #0xb8]
10288e45c:     	sub	w9, w8, #0x2
10288e460:     	cmp	w9, #0x2
10288e464:     	b.hs	0x10288e4b8
10288e468:     	bl	0x1020bdaa4
10288e46c:     	cbz	x0, 0x10288e714
10288e470:     	bl	0x102136770
10288e474:     	cmp	w24, #0x1
10288e478:     	b.lt	0x10288e714
10288e47c:     	mov	w25, #0x0               ; =0
10288e480:     	ldr	x8, [x20, #0xd0]
10288e484:     	sub	x8, x8, x0
10288e488:     	add	x8, x8, x8, lsr #63
10288e48c:     	add	x23, x0, x8, asr #1
10288e490:     	ldr	x0, [x20]
10288e494:     	mov	x1, x25
10288e498:     	bl	0x102e25a8c
10288e49c:     	cmp	x0, x23
10288e4a0:     	b.lt	0x10288e4f4
10288e4a4:     	add	w25, w25, #0x1
10288e4a8:     	cmp	w24, w25
10288e4ac:     	b.ne	0x10288e490
10288e4b0:     	mov	x25, x24
10288e4b4:     	b	0x10288e4f4
10288e4b8:     	cmp	w8, #0x4
10288e4bc:     	b.ne	0x10288e714
10288e4c0:     	bl	0x1020d9264
10288e4c4:     	cbz	x0, 0x10288e714
10288e4c8:     	bl	0x102136780
10288e4cc:     	fmul	d0, d0, d10
10288e4d0:     	fcmp	d0, #0.0
10288e4d4:     	cset	w8, mi
10288e4d8:     	adrp	x9, 0x1042e2000
10288e4dc:     	add	x9, x9, #0x3a0
10288e4e0:     	ldr	d1, [x9, w8, uxtw #3]
10288e4e4:     	fadd	d0, d0, d1
10288e4e8:     	fcvtzs	w8, d0
10288e4ec:     	cmp	w24, w8
10288e4f0:     	csel	w25, w24, w8, lt
10288e4f4:     	cmp	w25, #0x1
10288e4f8:     	b.lt	0x10288e714
10288e4fc:     	ldr	x0, [x20]
10288e500:     	mov	w1, #0x0                ; =0
10288e504:     	bl	0x102e259f8
10288e508:     	stp	d0, d1, [sp, #0x140]
10288e50c:     	ldr	x0, [x19, #0x88]
10288e510:     	cbz	x0, 0x10288e524
10288e514:     	add	x1, sp, #0x140
10288e518:     	mov	x2, x21
10288e51c:     	bl	0x102cf9834
10288e520:     	ldp	d0, d1, [sp, #0x140]
10288e524:     	mov	w23, w25
10288e528:     	ldr	w8, [x19, #0x128]
10288e52c:     	scvtf	d13, w8
10288e530:     	ldr	w8, [x19, #0x12c]
10288e534:     	scvtf	d14, w8
10288e538:     	fadd	d0, d0, d13
10288e53c:     	fadd	d1, d1, d14
10288e540:     	stp	d0, d1, [sp, #0x140]
10288e544:     	add	x0, x19, #0xb8
10288e548:     	mov	x1, x23
10288e54c:     	bl	0x100089d48
10288e550:     	add	x0, x19, #0xd0
10288e554:     	mov	x1, x23
10288e558:     	bl	0x10008c428
10288e55c:     	mov	x8, x23
10288e560:     	mov	x25, #0x0               ; =0
10288e564:     	lsl	x23, x23, #4
10288e568:     	str	x8, [sp, #0x50]
10288e56c:     	lsl	x8, x8, #3
10288e570:     	sub	x24, x8, #0x8
10288e574:     	movi	d15, #0000000000000000
10288e578:     	movi	d11, #0000000000000000
10288e57c:     	movi	d12, #0000000000000000
10288e580:     	ldr	x0, [x20]
10288e584:     	mov	x1, x25
10288e588:     	bl	0x102e259f8
10288e58c:     	fmov	d9, d0
10288e590:     	fmov	d10, d1
10288e594:     	stp	d0, d1, [sp, #0xd0]
10288e598:     	ldr	x0, [x19, #0x88]
10288e59c:     	cbz	x0, 0x10288e5b0
10288e5a0:     	add	x1, sp, #0xd0
10288e5a4:     	mov	x2, x21
10288e5a8:     	bl	0x102cf9834
10288e5ac:     	ldp	d9, d10, [sp, #0xd0]
10288e5b0:     	ldr	x0, [x20]
10288e5b4:     	mov	x1, x25
10288e5b8:     	bl	0x102e25a48
10288e5bc:     	fadd	d11, d11, d10
10288e5c0:     	fadd	d12, d12, d9
10288e5c4:     	fadd	d15, d15, d0
10288e5c8:     	add	x25, x25, #0x1
10288e5cc:     	ucvtf	d0, w25
10288e5d0:     	fdiv	d1, d12, d0
10288e5d4:     	fdiv	d2, d11, d0
10288e5d8:     	fadd	d1, d1, d13
10288e5dc:     	fadd	d2, d2, d14
10288e5e0:     	ldur	x8, [x19, #0xb8]
10288e5e4:     	add	x8, x8, x23
10288e5e8:     	stp	d1, d2, [x8, #-0x10]
10288e5ec:     	fdiv	d0, d15, d0
10288e5f0:     	ldur	x8, [x19, #0xd0]
10288e5f4:     	str	d0, [x8, x24]
10288e5f8:     	sub	x23, x23, #0x10
10288e5fc:     	sub	x24, x24, #0x8
10288e600:     	ldr	x8, [sp, #0x50]
10288e604:     	cmp	x8, x25
10288e608:     	b.ne	0x10288e580
10288e60c:     	ldr	q0, [sp, #0x140]
10288e610:     	str	q0, [sp, #0x40]
10288e614:     	stp	xzr, xzr, [sp, #0x130]
10288e618:     	ldr	d0, [sp, #0x200]
10288e61c:     	ldr	d1, [sp, #0x208]
10288e620:     	ldp	d2, d3, [sp, #0x150]
10288e624:     	add	x0, sp, #0x130
10288e628:     	bl	0x1021939b4
10288e62c:     	fmov	d10, #0.50000000
10288e630:     	fmov	d11, #1.00000000
10288e634:     	ldr	x24, [sp, #0x38]
10288e638:     	ldr	x25, [sp, #0x50]
10288e63c:     	cbz	w0, 0x10288e67c
10288e640:     	ldp	d1, d2, [sp, #0x140]
10288e644:     	ldr	q0, [sp, #0x150]
10288e648:     	fsub	d3, d1, d0
10288e64c:     	mov	d1, v0[1]
10288e650:     	fsub	d2, d2, d1
10288e654:     	ldr	q1, [sp, #0x130]
10288e658:     	fmul.d	d2, d2, v1[1]
10288e65c:     	fmadd	d2, d1, d3, d2
10288e660:     	fcmp	d2, #0.0
10288e664:     	b.le	0x10288e67c
10288e668:     	fmul.2d	v1, v1, v2[0]
10288e66c:     	ldr	q2, [sp, #0x10]
10288e670:     	fmul.2d	v1, v1, v2
10288e674:     	fadd.2d	v0, v0, v1
10288e678:     	str	q0, [sp, #0x40]
10288e67c:     	mov	x23, #0x0               ; =0
10288e680:     	ldr	x8, [sp, #0x1a0]
10288e684:     	str	x8, [sp, #0x120]
10288e688:     	ldp	q0, q1, [sp, #0x170]
10288e68c:     	stp	q0, q1, [sp, #0xf0]
10288e690:     	ldr	q0, [sp, #0x190]
10288e694:     	str	q0, [sp, #0x110]
10288e698:     	ldp	q0, q1, [sp, #0x150]
10288e69c:     	stp	q0, q1, [sp, #0xd0]
10288e6a0:     	ucvtf	d0, w25
10288e6a4:     	fdiv	d9, d11, d0
10288e6a8:     	fmov	d3, d9
10288e6ac:     	fsub	d0, d11, d3
10288e6b0:     	ldr	q1, [sp, #0x40]
10288e6b4:     	fmul.2d	v1, v1, v3[0]
10288e6b8:     	ldur	x8, [x19, #0xb8]
10288e6bc:     	ldr	q2, [sp, #0x150]
10288e6c0:     	fmul.2d	v2, v2, v0[0]
10288e6c4:     	fadd.2d	v1, v1, v2
10288e6c8:     	ldr	q2, [x8, x23, lsl #4]
10288e6cc:     	str	q3, [sp, #0x60]
10288e6d0:     	fmul.2d	v2, v2, v3[0]
10288e6d4:     	fmul.2d	v0, v1, v0[0]
10288e6d8:     	fadd.2d	v0, v0, v2
10288e6dc:     	str	q0, [sp, #0xd0]
10288e6e0:     	ldur	x8, [x19, #0xd0]
10288e6e4:     	ldr	d0, [x8, x23, lsl #3]
10288e6e8:     	str	d0, [sp, #0xe0]
10288e6ec:     	add	x1, sp, #0xd0
10288e6f0:     	add	x2, sp, #0x1b0
10288e6f4:     	mov	x0, x24
10288e6f8:     	fmov	d0, d8
10288e6fc:     	bl	0x1028ec548
10288e700:     	ldr	q3, [sp, #0x60]
10288e704:     	fadd	d3, d9, d3
10288e708:     	add	x23, x23, #0x1
10288e70c:     	cmp	x25, x23
10288e710:     	b.ne	0x10288e6ac
10288e714:     	add	x0, sp, #0x288
10288e718:     	add	x1, sp, #0x1b0
10288e71c:     	bl	0x10221b5e4
10288e720:     	add	x24, sp, #0x278
10288e724:     	adrp	x25, 0x104d6e000
10288e728:     	b	0x10288ddc0
10288e72c:     	mov	x0, x19
10288e730:     	mov	x1, x20
10288e734:     	bl	0x10288f220
10288e738:     	b	0x10288e874
10288e73c:     	str	xzr, [sp, #0x208]
10288e740:     	str	xzr, [sp, #0x200]
10288e744:     	add	x1, sp, #0x200
10288e748:     	mov	x0, x19
10288e74c:     	bl	0x10288f710
10288e750:     	ldr	w8, [sp, #0x200]
10288e754:     	ldr	w9, [sp, #0x208]
10288e758:     	cmp	w8, w9
10288e75c:     	b.ge	0x10288e7d0
10288e760:     	ldr	w8, [sp, #0x204]
10288e764:     	ldr	w9, [sp, #0x20c]
10288e768:     	cmp	w8, w9
10288e76c:     	b.ge	0x10288e7d0
10288e770:     	add	x1, sp, #0x200
10288e774:     	mov	x0, x19
10288e778:     	bl	0x10288cef8
10288e77c:     	str	x0, [sp, #0x200]
10288e780:     	str	x1, [sp, #0x208]
10288e784:     	ldr	w8, [x19, #0x120]
10288e788:     	neg	w1, w8
10288e78c:     	ldr	w8, [x19, #0x124]
10288e790:     	neg	w2, w8
10288e794:     	add	x0, sp, #0x200
10288e798:     	bl	0x10221b4d4
10288e79c:     	ldp	x9, x8, [x20, #0x10]
10288e7a0:     	str	x9, [sp, #0x2b8]
10288e7a4:     	str	x8, [sp, #0x2c0]
10288e7a8:     	cbz	x8, 0x10288e7b8
10288e7ac:     	add	x8, x8, #0x8
10288e7b0:     	mov	w9, #0x1                ; =1
10288e7b4:     	ldadd	w9, w8, [x8]
10288e7b8:     	add	x21, sp, #0x2b8
10288e7bc:     	add	x0, sp, #0x2b8
10288e7c0:     	add	x1, sp, #0x200
10288e7c4:     	bl	0x1029a0280
10288e7c8:     	add	x0, x21, #0x8
10288e7cc:     	bl	0x10001022c
10288e7d0:     	ldp	x9, x8, [x20, #0x10]
10288e7d4:     	stp	x9, x8, [sp, #0x90]
10288e7d8:     	cbz	x8, 0x10288e7e8
10288e7dc:     	add	x8, x8, #0x8
10288e7e0:     	mov	w9, #0x1                ; =1
10288e7e4:     	ldadd	w9, w8, [x8]
10288e7e8:     	add	x21, sp, #0x90
10288e7ec:     	ldr	x8, [x19]
10288e7f0:     	ldr	x8, [x8, #0x288]
10288e7f4:     	add	x1, sp, #0x90
10288e7f8:     	sub	x2, x29, #0xb0
10288e7fc:     	mov	x0, x19
10288e800:     	blr	x8
10288e804:     	ldr	w22, [sp, #0x5c]
10288e808:     	add	x0, x21, #0x8
10288e80c:     	bl	0x10001022c
10288e810:     	cbz	w22, 0x10288e848
10288e814:     	ldp	x9, x8, [x20, #0x10]
10288e818:     	stp	x9, x8, [sp, #0x80]
10288e81c:     	cbz	x8, 0x10288e82c
10288e820:     	add	x8, x8, #0x8
10288e824:     	mov	w9, #0x1                ; =1
10288e828:     	ldadd	w9, w8, [x8]
10288e82c:     	add	x21, sp, #0x80
10288e830:     	add	x0, sp, #0x80
10288e834:     	bl	0x102996ca8
10288e838:     	add	x0, x21, #0x8
10288e83c:     	bl	0x10001022c
10288e840:     	mov	w8, #0x1                ; =1
10288e844:     	str	w8, [x19, #0x15c]
10288e848:     	ldr	w8, [x19, #0x194]
10288e84c:     	add	w8, w8, #0x1
10288e850:     	str	w8, [x19, #0x194]
10288e854:     	ldr	d1, [x19, #0x198]
10288e858:     	ldr	d0, [x20, #0xa0]
10288e85c:     	fcmp	d1, d0
10288e860:     	b.pl	0x10288e868
10288e864:     	str	d0, [x19, #0x198]
10288e868:     	ldr	x0, [x19, #0x2d8]
10288e86c:     	cbz	x0, 0x10288e874
10288e870:     	bl	0x1028a5a68
10288e874:     	add	sp, sp, #0x3b0
10288e878:     	ldp	x29, x30, [sp, #0x90]
10288e87c:     	ldp	x20, x19, [sp, #0x80]
10288e880:     	ldp	x22, x21, [sp, #0x70]
10288e884:     	ldp	x24, x23, [sp, #0x60]
10288e888:     	ldp	x26, x25, [sp, #0x50]
10288e88c:     	ldp	x28, x27, [sp, #0x40]
10288e890:     	ldp	d9, d8, [sp, #0x30]
10288e894:     	ldp	d11, d10, [sp, #0x20]
10288e898:     	ldp	d13, d12, [sp, #0x10]
10288e89c:     	ldp	d15, d14, [sp], #0xa0
10288e8a0:     	ret
10288e8a4:     	b	0x10288e8c0
10288e8a8:     	b	0x10288e9d8
10288e8ac:     	mov	x19, x0
10288e8b0:     	add	x8, sp, #0x200
10288e8b4:     	b	0x10288e9b0
10288e8b8:     	b	0x10288e9d8
10288e8bc:     	b	0x10288e9d8
10288e8c0:     	mov	x19, x0
10288e8c4:     	mov	x0, x21
10288e8c8:     	bl	0x10001022c
10288e8cc:     	add	x0, sp, #0x200
10288e8d0:     	bl	0x103121130
10288e8d4:     	b	0x10288e9e8
10288e8d8:     	b	0x10288e93c
10288e8dc:     	b	0x10288e9d8
10288e8e0:     	mov	x19, x0
10288e8e4:     	add	x8, sp, #0xd0
10288e8e8:     	b	0x10288e9b0
10288e8ec:     	b	0x10288e9d8
10288e8f0:     	b	0x10288e9d8
10288e8f4:     	b	0x10288e9d8
10288e8f8:     	b	0x10288e93c
10288e8fc:     	b	0x10288e9d8
10288e900:     	b	0x10288e9d8
10288e904:     	b	0x10288e9d8
10288e908:     	b	0x10288e9d8
10288e90c:     	mov	x19, x0
10288e910:     	add	x8, sp, #0x1f0
10288e914:     	b	0x10288e9b0
10288e918:     	b	0x10288e9d8
10288e91c:     	b	0x10288e9d8
10288e920:     	b	0x10288e9d8
10288e924:     	b	0x10288e93c
10288e928:     	b	0x10288e93c
10288e92c:     	b	0x10288e9d8
10288e930:     	b	0x10288e9d8
10288e934:     	b	0x10288e93c
10288e938:     	b	0x10288e93c
10288e93c:     	mov	x19, x0
10288e940:     	add	x0, x21, #0x8
10288e944:     	b	0x10288e9e4
10288e948:     	mov	x19, x0
10288e94c:     	add	x8, sp, #0x1d0
10288e950:     	b	0x10288e9b0
10288e954:     	b	0x10288e9d8
10288e958:     	mov	x19, x0
10288e95c:     	add	x0, x22, #0x8
10288e960:     	b	0x10288e9e4
10288e964:     	b	0x10288e9d8
10288e968:     	b	0x10288e9d8
10288e96c:     	b	0x10288e9d8
10288e970:     	b	0x10288e9d8
10288e974:     	b	0x10288e9d8
10288e978:     	mov	x19, x0
10288e97c:     	add	x8, sp, #0xb0
10288e980:     	b	0x10288e9b0
10288e984:     	mov	x19, x0
10288e988:     	add	x8, sp, #0xc0
10288e98c:     	b	0x10288e9b0
10288e990:     	b	0x10288e9d8
10288e994:     	b	0x10288e9d8
10288e998:     	b	0x10288e9d8
10288e99c:     	b	0x10288e9d8
10288e9a0:     	b	0x10288e9d8
10288e9a4:     	b	0x10288e9d8
10288e9a8:     	mov	x19, x0
10288e9ac:     	add	x8, sp, #0xa0
10288e9b0:     	add	x0, x8, #0x8
10288e9b4:     	b	0x10288e9cc
10288e9b8:     	b	0x10288e9d8
10288e9bc:     	b	0x10288e9d8
10288e9c0:     	b	0x10288e9d8
10288e9c4:     	mov	x19, x0
10288e9c8:     	add	x0, x27, #0x8
10288e9cc:     	bl	0x10001022c
10288e9d0:     	b	0x10288e9dc
10288e9d4:     	b	0x10288e9d8
10288e9d8:     	mov	x19, x0
10288e9dc:     	add	x8, sp, #0x278
10288e9e0:     	add	x0, x8, #0x8
10288e9e4:     	bl	0x10001022c
10288e9e8:     	mov	x0, x19
10288e9ec:     	bl	0x103bda970

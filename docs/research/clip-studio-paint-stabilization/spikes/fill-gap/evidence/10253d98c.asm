; CSP 5.1.4 ARM64, unslid range 0x10253d98c:0x10253e284
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
10253d98c:     	sub	sp, sp, #0x100
10253d990:     	stp	x28, x27, [sp, #0xa0]
10253d994:     	stp	x26, x25, [sp, #0xb0]
10253d998:     	stp	x24, x23, [sp, #0xc0]
10253d99c:     	stp	x22, x21, [sp, #0xd0]
10253d9a0:     	stp	x20, x19, [sp, #0xe0]
10253d9a4:     	stp	x29, x30, [sp, #0xf0]
10253d9a8:     	add	x29, sp, #0xf0
10253d9ac:     	mov	x20, x7
10253d9b0:     	mov	x21, x6
10253d9b4:     	mov	x25, x5
10253d9b8:     	mov	x28, x4
10253d9bc:     	mov	x24, x3
10253d9c0:     	mov	x23, x2
10253d9c4:     	mov	x22, x1
10253d9c8:     	mov	x19, x0
10253d9cc:     	ldr	x27, [x29, #0x20]
10253d9d0:     	str	wzr, [x27]
10253d9d4:     	ldp	x8, x9, [x0, #0x50]
10253d9d8:     	str	xzr, [x0, #0x70]
10253d9dc:     	sub	x9, x9, x8
10253d9e0:     	asr	x9, x9, #3
10253d9e4:     	cmp	x9, #0x3
10253d9e8:     	b.lo	0x10253da10
10253d9ec:     	ldr	x0, [x8]
10253d9f0:     	bl	0x103bdd34c
10253d9f4:     	ldp	x8, x9, [x19, #0x50]
10253d9f8:     	add	x8, x8, #0x8
10253d9fc:     	str	x8, [x19, #0x50]
10253da00:     	sub	x9, x9, x8
10253da04:     	asr	x9, x9, #3
10253da08:     	cmp	x9, #0x2
10253da0c:     	b.hi	0x10253d9ec
10253da10:     	cmp	x9, #0x1
10253da14:     	b.eq	0x10253da28
10253da18:     	cmp	x9, #0x2
10253da1c:     	b.ne	0x10253da30
10253da20:     	mov	w8, #0x100              ; =256
10253da24:     	b	0x10253da2c
10253da28:     	mov	w8, #0x80               ; =128
10253da2c:     	str	x8, [x19, #0x68]
10253da30:     	mov	x0, x23
10253da34:     	bl	0x10208fef0
10253da38:     	mov	x26, x0
10253da3c:     	mov	x0, x23
10253da40:     	bl	0x10208fef8
10253da44:     	tbnz	w24, #0x1f, 0x10253e250
10253da48:     	mov	x8, x0
10253da4c:     	mov	w0, #0x0                ; =0
10253da50:     	tbnz	x24, #0x3f, 0x10253e254
10253da54:     	cmp	w26, w24
10253da58:     	b.le	0x10253e254
10253da5c:     	str	x27, [sp, #0x70]
10253da60:     	lsr	x27, x24, #32
10253da64:     	cmp	w8, w27
10253da68:     	b.le	0x10253e254
10253da6c:     	str	w8, [sp, #0x64]
10253da70:     	ldr	x5, [x29, #0x10]
10253da74:     	mov	x0, x19
10253da78:     	mov	x1, x24
10253da7c:     	mov	x2, x27
10253da80:     	mov	x3, x21
10253da84:     	mov	x4, x20
10253da88:     	str	x5, [sp, #0x78]
10253da8c:     	bl	0x102541b0c
10253da90:     	cbz	w0, 0x10253e254
10253da94:     	ldr	x8, [x22, #0x28]
10253da98:     	ldr	w9, [x22, #0x10]
10253da9c:     	mul	w9, w9, w27
10253daa0:     	add	x10, x8, x9
10253daa4:     	ubfx	x8, x24, #3, #28
10253daa8:     	and	w9, w24, #0x7
10253daac:     	mov	w11, #0x80              ; =128
10253dab0:     	lsr	w9, w11, w9
10253dab4:     	ldrb	w10, [x10, x8]
10253dab8:     	ands	w10, w9, w10
10253dabc:     	ccmp	w28, #0x0, #0x4, ne
10253dac0:     	orr	w10, w10, w28
10253dac4:     	ccmp	w10, #0x0, #0x4, eq
10253dac8:     	b.eq	0x10253e250
10253dacc:     	str	x22, [sp, #0x20]
10253dad0:     	ldr	x10, [x23, #0x28]
10253dad4:     	ldr	w11, [x23, #0x10]
10253dad8:     	mul	w11, w11, w27
10253dadc:     	add	x10, x10, x11
10253dae0:     	ldrb	w8, [x10, x8]
10253dae4:     	and	w22, w9, w8
10253dae8:     	cmp	w22, #0x0
10253daec:     	ccmp	w25, #0x0, #0x4, ne
10253daf0:     	orr	w8, w22, w25
10253daf4:     	ccmp	w8, #0x0, #0x4, eq
10253daf8:     	b.ne	0x10253e250
10253dafc:     	str	w28, [sp, #0x68]
10253db00:     	ldr	x9, [x29, #0x18]
10253db04:     	str	w24, [x9, #0x8]
10253db08:     	mov	x8, x9
10253db0c:     	str	w27, [x8, #0xc]!
10253db10:     	str	x8, [sp, #0x30]
10253db14:     	mov	x8, x9
10253db18:     	str	w27, [x8, #0x4]!
10253db1c:     	str	x8, [sp, #0x40]
10253db20:     	str	x9, [sp, #0x18]
10253db24:     	str	w24, [x9]
10253db28:     	stp	w27, w24, [x29, #-0x68]
10253db2c:     	mov	w8, #0x1                ; =1
10253db30:     	stp	w24, w8, [x29, #-0x60]
10253db34:     	add	x0, x19, #0x48
10253db38:     	sub	x1, x29, #0x68
10253db3c:     	bl	0x102541c0c
10253db40:     	add	w8, w27, #0x1
10253db44:     	stp	w8, w24, [x29, #-0x68]
10253db48:     	mov	w8, #-0x1               ; =-1
10253db4c:     	stp	w24, w8, [x29, #-0x60]
10253db50:     	add	x0, x19, #0x48
10253db54:     	sub	x1, x29, #0x68
10253db58:     	bl	0x102541c0c
10253db5c:     	ldr	x8, [x19, #0x70]
10253db60:     	ldr	x27, [sp, #0x78]
10253db64:     	cbz	x8, 0x10253e1bc
10253db68:     	mov	w24, #0x0               ; =0
10253db6c:     	ldr	w9, [sp, #0x68]
10253db70:     	cmp	w9, #0x0
10253db74:     	cset	w9, eq
10253db78:     	str	w9, [sp, #0x2c]
10253db7c:     	cmp	w25, #0x0
10253db80:     	cset	w9, eq
10253db84:     	str	w9, [sp, #0x54]
10253db88:     	str	w21, [sp, #0xc]
10253db8c:     	ldr	x9, [x19, #0x68]
10253db90:     	sub	x8, x8, #0x1
10253db94:     	add	x9, x9, x8
10253db98:     	ldr	x10, [x19, #0x50]
10253db9c:     	lsr	x11, x9, #5
10253dba0:     	and	x11, x11, #0x7fffffffffffff8
10253dba4:     	ldr	x10, [x10, x11]
10253dba8:     	add	x9, x10, w9, uxtb #4
10253dbac:     	ldp	w28, w25, [x9]
10253dbb0:     	ldp	w10, w21, [x9, #0x8]
10253dbb4:     	str	w10, [sp, #0x6c]
10253dbb8:     	str	x8, [x19, #0x70]
10253dbbc:     	add	x0, x19, #0x48
10253dbc0:     	mov	w1, #0x1                ; =1
10253dbc4:     	bl	0x10116d74c
10253dbc8:     	str	w28, [sp, #0x50]
10253dbcc:     	str	w21, [sp, #0x38]
10253dbd0:     	add	w28, w21, w28
10253dbd4:     	ldr	w8, [sp, #0x64]
10253dbd8:     	cmp	w28, w8
10253dbdc:     	b.ge	0x10253e1b4
10253dbe0:     	ldr	x9, [x23, #0x28]
10253dbe4:     	ldr	w11, [x23, #0x10]
10253dbe8:     	ldp	x13, x10, [sp, #0x18]
10253dbec:     	ldr	x8, [x10, #0x28]
10253dbf0:     	ldr	w10, [x10, #0x10]
10253dbf4:     	ldr	w12, [x13]
10253dbf8:     	cmp	w12, w25
10253dbfc:     	mov	x12, x13
10253dc00:     	ldr	w21, [sp, #0xc]
10253dc04:     	b.le	0x10253dc0c
10253dc08:     	str	w25, [x12]
10253dc0c:     	ldr	w12, [x12, #0x8]
10253dc10:     	ldr	w13, [sp, #0x6c]
10253dc14:     	cmp	w12, w13
10253dc18:     	b.ge	0x10253dc28
10253dc1c:     	ldr	x12, [sp, #0x18]
10253dc20:     	ldr	w13, [sp, #0x6c]
10253dc24:     	str	w13, [x12, #0x8]
10253dc28:     	mul	w11, w11, w28
10253dc2c:     	add	x9, x9, x11
10253dc30:     	stur	x9, [x29, #-0x70]
10253dc34:     	mul	w9, w10, w28
10253dc38:     	add	x8, x8, x9
10253dc3c:     	str	x8, [sp, #0x58]
10253dc40:     	tbnz	w25, #0x1f, 0x10253dcbc
10253dc44:     	mov	x0, x19
10253dc48:     	mov	x1, x25
10253dc4c:     	mov	x2, x28
10253dc50:     	mov	x3, x21
10253dc54:     	mov	x4, x20
10253dc58:     	mov	x5, x27
10253dc5c:     	bl	0x102541b0c
10253dc60:     	cbz	w0, 0x10253dc90
10253dc64:     	lsr	x8, x25, #3
10253dc68:     	ldr	x9, [sp, #0x58]
10253dc6c:     	ldrb	w9, [x9, x8]
10253dc70:     	and	w10, w25, #0x7
10253dc74:     	mov	w11, #0x80              ; =128
10253dc78:     	lsr	w10, w11, w10
10253dc7c:     	and	w9, w10, w9
10253dc80:     	ldur	x11, [x29, #-0x70]
10253dc84:     	ldrb	w8, [x11, x8]
10253dc88:     	and	w8, w10, w8
10253dc8c:     	b	0x10253dca4
10253dc90:     	cbnz	w20, 0x10253e250
10253dc94:     	ldr	w10, [x19, #0x1fc]
10253dc98:     	ldr	w9, [sp, #0x2c]
10253dc9c:     	ldr	w8, [sp, #0x54]
10253dca0:     	cbnz	w10, 0x10253e250
10253dca4:     	cmp	w9, #0x0
10253dca8:     	ldr	w10, [sp, #0x68]
10253dcac:     	ccmp	w10, #0x0, #0x4, ne
10253dcb0:     	orr	w9, w9, w10
10253dcb4:     	ccmp	w9, #0x0, #0x4, eq
10253dcb8:     	b.ne	0x10253dcc8
10253dcbc:     	mov	w8, #0x0                ; =0
10253dcc0:     	str	wzr, [sp, #0x4c]
10253dcc4:     	b	0x10253de40
10253dcc8:     	cmp	w8, #0x0
10253dccc:     	ccmp	w22, #0x0, #0x4, ne
10253dcd0:     	orr	w8, w8, w22
10253dcd4:     	ccmp	w8, #0x0, #0x4, eq
10253dcd8:     	b.ne	0x10253ddc4
10253dcdc:     	mov	x27, x25
10253dce0:     	and	w8, w27, #0x7
10253dce4:     	mov	w9, w27
10253dce8:     	lsr	x9, x9, #3
10253dcec:     	ldr	x13, [sp, #0x58]
10253dcf0:     	ldrb	w10, [x13, x9]
10253dcf4:     	mov	w11, #-0x81             ; =-129
10253dcf8:     	asr	w11, w11, w8
10253dcfc:     	and	w11, w10, w11
10253dd00:     	mov	w12, #0x80              ; =128
10253dd04:     	lsr	w8, w12, w8
10253dd08:     	orr	w8, w10, w8
10253dd0c:     	ldr	w10, [sp, #0x68]
10253dd10:     	cmp	w10, #0x0
10253dd14:     	csel	w8, w11, w8, eq
10253dd18:     	strb	w8, [x13, x9]
10253dd1c:     	ldr	x9, [sp, #0x70]
10253dd20:     	ldr	w8, [x9]
10253dd24:     	add	w8, w8, #0x1
10253dd28:     	str	w8, [x9]
10253dd2c:     	subs	w27, w27, #0x1
10253dd30:     	b.lt	0x10253ddd0
10253dd34:     	mov	x0, x19
10253dd38:     	mov	x1, x27
10253dd3c:     	mov	x2, x28
10253dd40:     	mov	x3, x21
10253dd44:     	mov	x4, x20
10253dd48:     	ldr	x5, [sp, #0x78]
10253dd4c:     	bl	0x102541b0c
10253dd50:     	cbz	w0, 0x10253dd80
10253dd54:     	lsr	x8, x27, #3
10253dd58:     	ldr	x9, [sp, #0x58]
10253dd5c:     	ldrb	w9, [x9, x8]
10253dd60:     	and	w10, w27, #0x7
10253dd64:     	mov	w11, #0x80              ; =128
10253dd68:     	lsr	w10, w11, w10
10253dd6c:     	and	w9, w10, w9
10253dd70:     	ldur	x11, [x29, #-0x70]
10253dd74:     	ldrb	w8, [x11, x8]
10253dd78:     	and	w8, w10, w8
10253dd7c:     	b	0x10253dd94
10253dd80:     	cbnz	w20, 0x10253e250
10253dd84:     	ldr	w10, [x19, #0x1fc]
10253dd88:     	ldr	w9, [sp, #0x2c]
10253dd8c:     	ldr	w8, [sp, #0x54]
10253dd90:     	cbnz	w10, 0x10253e250
10253dd94:     	cmp	w9, #0x0
10253dd98:     	ldr	w10, [sp, #0x68]
10253dd9c:     	ccmp	w10, #0x0, #0x4, ne
10253dda0:     	orr	w9, w9, w10
10253dda4:     	ccmp	w9, #0x0, #0x4, eq
10253dda8:     	b.eq	0x10253ddd4
10253ddac:     	cmp	w8, #0x0
10253ddb0:     	ccmp	w22, #0x0, #0x4, ne
10253ddb4:     	b.ne	0x10253dce0
10253ddb8:     	orr	w8, w8, w22
10253ddbc:     	cbz	w8, 0x10253dce0
10253ddc0:     	b	0x10253ddd4
10253ddc4:     	str	wzr, [sp, #0x4c]
10253ddc8:     	mov	x27, x25
10253ddcc:     	b	0x10253dddc
10253ddd0:     	mov	w27, #-0x1              ; =-1
10253ddd4:     	mov	w8, #0x1                ; =1
10253ddd8:     	str	w8, [sp, #0x4c]
10253dddc:     	cmp	w27, w25
10253dde0:     	b.ge	0x10253de34
10253dde4:     	add	w24, w27, #0x1
10253dde8:     	ldr	w8, [sp, #0x50]
10253ddec:     	tbnz	w8, #0x1f, 0x10253de28
10253ddf0:     	cmp	w24, w25
10253ddf4:     	b.hs	0x10253de28
10253ddf8:     	ldr	w8, [sp, #0x64]
10253ddfc:     	ldr	w9, [sp, #0x50]
10253de00:     	cmp	w9, w8
10253de04:     	b.ge	0x10253de28
10253de08:     	sub	w8, w25, #0x1
10253de0c:     	ldr	w9, [sp, #0x38]
10253de10:     	neg	w9, w9
10253de14:     	stp	w28, w24, [x29, #-0x68]
10253de18:     	stp	w8, w9, [x29, #-0x60]
10253de1c:     	add	x0, x19, #0x48
10253de20:     	sub	x1, x29, #0x68
10253de24:     	bl	0x102541c0c
10253de28:     	add	w25, w25, #0x1
10253de2c:     	mov	w8, #0x1                ; =1
10253de30:     	b	0x10253de3c
10253de34:     	mov	w8, #0x0                ; =0
10253de38:     	mov	x25, x27
10253de3c:     	ldr	x27, [sp, #0x78]
10253de40:     	ldr	w11, [sp, #0x38]
10253de44:     	add	w9, w28, w11
10253de48:     	cmp	w9, #0x0
10253de4c:     	ldr	w10, [sp, #0x64]
10253de50:     	ccmp	w9, w10, #0x0, ge
10253de54:     	cset	w9, lt
10253de58:     	str	w9, [sp, #0x3c]
10253de5c:     	ldr	w9, [sp, #0x6c]
10253de60:     	add	w10, w9, #0x1
10253de64:     	str	w10, [sp, #0x48]
10253de68:     	neg	w10, w11
10253de6c:     	neg	w9, w9
10253de70:     	stp	w9, w10, [sp, #0x10]
10253de74:     	tbz	w8, #0x0, 0x10253e068
10253de78:     	cmp	w25, w26
10253de7c:     	b.ge	0x10253dffc
10253de80:     	mov	x0, x19
10253de84:     	mov	x1, x25
10253de88:     	mov	x2, x28
10253de8c:     	mov	x3, x21
10253de90:     	mov	x4, x20
10253de94:     	mov	x5, x27
10253de98:     	bl	0x102541b0c
10253de9c:     	cbz	w0, 0x10253decc
10253dea0:     	asr	w8, w25, #3
10253dea4:     	ldr	x9, [sp, #0x58]
10253dea8:     	ldrb	w9, [x9, w8, sxtw]
10253deac:     	and	w10, w25, #0x7
10253deb0:     	mov	w11, #0x80              ; =128
10253deb4:     	lsr	w10, w11, w10
10253deb8:     	and	w9, w10, w9
10253debc:     	ldur	x11, [x29, #-0x70]
10253dec0:     	ldrb	w8, [x11, w8, sxtw]
10253dec4:     	and	w8, w10, w8
10253dec8:     	b	0x10253dee0
10253decc:     	cbnz	w20, 0x10253e250
10253ded0:     	ldr	w10, [x19, #0x1fc]
10253ded4:     	ldr	w9, [sp, #0x2c]
10253ded8:     	ldr	w8, [sp, #0x54]
10253dedc:     	cbnz	w10, 0x10253e250
10253dee0:     	cmp	w9, #0x0
10253dee4:     	ldr	w10, [sp, #0x68]
10253dee8:     	ccmp	w10, #0x0, #0x4, ne
10253deec:     	orr	w9, w9, w10
10253def0:     	ccmp	w9, #0x0, #0x4, eq
10253def4:     	b.eq	0x10253dffc
10253def8:     	cmp	w8, #0x0
10253defc:     	ccmp	w22, #0x0, #0x4, ne
10253df00:     	orr	w8, w8, w22
10253df04:     	ccmp	w8, #0x0, #0x4, eq
10253df08:     	b.ne	0x10253dffc
10253df0c:     	and	w8, w25, #0x7
10253df10:     	asr	w9, w25, #3
10253df14:     	ldr	x13, [sp, #0x58]
10253df18:     	ldrb	w10, [x13, w9, sxtw]
10253df1c:     	mov	w11, #-0x81             ; =-129
10253df20:     	asr	w11, w11, w8
10253df24:     	and	w11, w10, w11
10253df28:     	mov	w12, #0x80              ; =128
10253df2c:     	lsr	w8, w12, w8
10253df30:     	orr	w8, w10, w8
10253df34:     	ldr	w10, [sp, #0x68]
10253df38:     	cmp	w10, #0x0
10253df3c:     	csel	w8, w11, w8, eq
10253df40:     	strb	w8, [x13, w9, sxtw]
10253df44:     	ldr	x9, [sp, #0x70]
10253df48:     	ldr	w8, [x9]
10253df4c:     	add	w8, w8, #0x1
10253df50:     	str	w8, [x9]
10253df54:     	add	w27, w25, #0x1
10253df58:     	cmp	w27, w26
10253df5c:     	b.ge	0x10253dff0
10253df60:     	mov	x0, x19
10253df64:     	mov	x1, x27
10253df68:     	mov	x2, x28
10253df6c:     	mov	x3, x21
10253df70:     	mov	x4, x20
10253df74:     	ldr	x5, [sp, #0x78]
10253df78:     	bl	0x102541b0c
10253df7c:     	cbz	w0, 0x10253dfac
10253df80:     	asr	w8, w27, #3
10253df84:     	ldr	x9, [sp, #0x58]
10253df88:     	ldrb	w9, [x9, w8, sxtw]
10253df8c:     	and	w10, w27, #0x7
10253df90:     	mov	w11, #0x80              ; =128
10253df94:     	lsr	w10, w11, w10
10253df98:     	and	w9, w10, w9
10253df9c:     	ldur	x11, [x29, #-0x70]
10253dfa0:     	ldrb	w8, [x11, w8, sxtw]
10253dfa4:     	and	w8, w10, w8
10253dfa8:     	b	0x10253dfc0
10253dfac:     	cbnz	w20, 0x10253e250
10253dfb0:     	ldr	w10, [x19, #0x1fc]
10253dfb4:     	ldr	w9, [sp, #0x2c]
10253dfb8:     	ldr	w8, [sp, #0x54]
10253dfbc:     	cbnz	w10, 0x10253e250
10253dfc0:     	cmp	w9, #0x0
10253dfc4:     	ldr	w10, [sp, #0x68]
10253dfc8:     	ccmp	w10, #0x0, #0x4, ne
10253dfcc:     	orr	w9, w9, w10
10253dfd0:     	ccmp	w9, #0x0, #0x4, eq
10253dfd4:     	b.eq	0x10253dff0
10253dfd8:     	cmp	w8, #0x0
10253dfdc:     	ccmp	w22, #0x0, #0x4, ne
10253dfe0:     	add	w25, w25, #0x1
10253dfe4:     	b.ne	0x10253df0c
10253dfe8:     	orr	w8, w8, w22
10253dfec:     	cbz	w8, 0x10253df0c
10253dff0:     	mov	w8, #0x1                ; =1
10253dff4:     	str	w8, [sp, #0x4c]
10253dff8:     	mov	x25, x27
10253dffc:     	ldr	w8, [sp, #0x3c]
10253e000:     	cbz	w8, 0x10253e020
10253e004:     	sub	w9, w25, #0x1
10253e008:     	stp	w28, w24, [x29, #-0x68]
10253e00c:     	ldr	w8, [sp, #0x38]
10253e010:     	stp	w9, w8, [x29, #-0x60]
10253e014:     	add	x0, x19, #0x48
10253e018:     	sub	x1, x29, #0x68
10253e01c:     	bl	0x102541c0c
10253e020:     	ldr	x27, [sp, #0x78]
10253e024:     	ldr	w8, [sp, #0x50]
10253e028:     	tbnz	w8, #0x1f, 0x10253e068
10253e02c:     	ldr	w8, [sp, #0x48]
10253e030:     	cmp	w25, w8
10253e034:     	b.le	0x10253e068
10253e038:     	ldr	w8, [sp, #0x64]
10253e03c:     	ldr	w9, [sp, #0x50]
10253e040:     	cmp	w9, w8
10253e044:     	b.ge	0x10253e068
10253e048:     	sub	w10, w25, #0x1
10253e04c:     	ldr	w9, [sp, #0x48]
10253e050:     	stp	w28, w9, [x29, #-0x68]
10253e054:     	ldr	w8, [sp, #0x14]
10253e058:     	stp	w10, w8, [x29, #-0x60]
10253e05c:     	add	x0, x19, #0x48
10253e060:     	sub	x1, x29, #0x68
10253e064:     	bl	0x102541c0c
10253e068:     	add	w24, w25, #0x1
10253e06c:     	cmp	w24, w26
10253e070:     	b.ge	0x10253e168
10253e074:     	mov	x0, x19
10253e078:     	mov	x1, x24
10253e07c:     	mov	x2, x28
10253e080:     	mov	x3, x21
10253e084:     	mov	x4, x20
10253e088:     	mov	x5, x27
10253e08c:     	bl	0x102541b0c
10253e090:     	cbz	w0, 0x10253e0b4
10253e094:     	asr	w8, w24, #3
10253e098:     	ldur	x9, [x29, #-0x70]
10253e09c:     	ldrb	w8, [x9, w8, sxtw]
10253e0a0:     	and	w9, w24, #0x7
10253e0a4:     	mov	w10, #0x80              ; =128
10253e0a8:     	lsr	w9, w10, w9
10253e0ac:     	and	w8, w9, w8
10253e0b0:     	b	0x10253e0c4
10253e0b4:     	cbnz	w20, 0x10253e250
10253e0b8:     	ldr	w9, [x19, #0x1fc]
10253e0bc:     	ldr	w8, [sp, #0x54]
10253e0c0:     	cbnz	w9, 0x10253e250
10253e0c4:     	ldr	w9, [sp, #0x6c]
10253e0c8:     	cmp	w25, w9
10253e0cc:     	b.ge	0x10253e168
10253e0d0:     	add	w24, w25, #0x2
10253e0d4:     	ldr	w25, [sp, #0x10]
10253e0d8:     	cmp	w8, #0x0
10253e0dc:     	ccmp	w22, #0x0, #0x4, ne
10253e0e0:     	orr	w8, w8, w22
10253e0e4:     	ccmp	w8, #0x0, #0x4, eq
10253e0e8:     	b.eq	0x10253e15c
10253e0ec:     	cmp	w26, w24
10253e0f0:     	b.eq	0x10253e164
10253e0f4:     	mov	x0, x19
10253e0f8:     	mov	x1, x24
10253e0fc:     	mov	x2, x28
10253e100:     	mov	x3, x21
10253e104:     	mov	x4, x20
10253e108:     	mov	x5, x27
10253e10c:     	bl	0x102541b0c
10253e110:     	cbz	w0, 0x10253e134
10253e114:     	asr	w8, w24, #3
10253e118:     	ldur	x9, [x29, #-0x70]
10253e11c:     	ldrb	w8, [x9, w8, sxtw]
10253e120:     	and	w9, w24, #0x7
10253e124:     	mov	w10, #0x80              ; =128
10253e128:     	lsr	w9, w10, w9
10253e12c:     	and	w8, w9, w8
10253e130:     	b	0x10253e144
10253e134:     	cbnz	w20, 0x10253e250
10253e138:     	ldr	w9, [x19, #0x1fc]
10253e13c:     	ldr	w8, [sp, #0x54]
10253e140:     	cbnz	w9, 0x10253e250
10253e144:     	add	w24, w24, #0x1
10253e148:     	add	w9, w25, w24
10253e14c:     	cmp	w9, #0x2
10253e150:     	b.ne	0x10253e0d8
10253e154:     	ldr	w24, [sp, #0x48]
10253e158:     	b	0x10253e168
10253e15c:     	sub	w24, w24, #0x1
10253e160:     	b	0x10253e168
10253e164:     	mov	x24, x26
10253e168:     	ldr	w8, [sp, #0x4c]
10253e16c:     	cbz	w8, 0x10253e194
10253e170:     	ldr	x8, [sp, #0x40]
10253e174:     	ldr	w9, [x8]
10253e178:     	cmp	w9, w28
10253e17c:     	b.gt	0x10253e190
10253e180:     	ldr	x8, [sp, #0x30]
10253e184:     	ldr	w9, [x8]
10253e188:     	cmp	w9, w28
10253e18c:     	b.ge	0x10253e194
10253e190:     	str	w28, [x8]
10253e194:     	mov	w8, #0x1                ; =1
10253e198:     	mov	x25, x24
10253e19c:     	ldr	w9, [sp, #0x6c]
10253e1a0:     	cmp	w24, w9
10253e1a4:     	b.le	0x10253de74
10253e1a8:     	mov	x0, x19
10253e1ac:     	bl	0x10253d750
10253e1b0:     	cbnz	w0, 0x10253e1fc
10253e1b4:     	ldr	x8, [x19, #0x70]
10253e1b8:     	cbnz	x8, 0x10253db8c
10253e1bc:     	ldr	x12, [sp, #0x18]
10253e1c0:     	ldp	w9, w8, [x12, #0x8]
10253e1c4:     	add	w10, w9, #0x1
10253e1c8:     	add	w11, w8, #0x1
10253e1cc:     	stp	w10, w11, [x12, #0x8]
10253e1d0:     	cmp	w9, w26
10253e1d4:     	b.lt	0x10253e1dc
10253e1d8:     	str	w26, [x12, #0x8]
10253e1dc:     	ldr	w9, [sp, #0x64]
10253e1e0:     	cmp	w8, w9
10253e1e4:     	b.lt	0x10253e1f4
10253e1e8:     	mov	x8, x9
10253e1ec:     	ldr	x9, [sp, #0x30]
10253e1f0:     	str	w8, [x9]
10253e1f4:     	mov	w0, #0x1                ; =1
10253e1f8:     	b	0x10253e254
10253e1fc:     	ldp	x8, x9, [x19, #0x50]
10253e200:     	str	xzr, [x19, #0x70]
10253e204:     	sub	x9, x9, x8
10253e208:     	asr	x9, x9, #3
10253e20c:     	cmp	x9, #0x3
10253e210:     	b.lo	0x10253e238
10253e214:     	ldr	x0, [x8]
10253e218:     	bl	0x103bdd34c
10253e21c:     	ldp	x8, x9, [x19, #0x50]
10253e220:     	add	x8, x8, #0x8
10253e224:     	str	x8, [x19, #0x50]
10253e228:     	sub	x9, x9, x8
10253e22c:     	asr	x9, x9, #3
10253e230:     	cmp	x9, #0x2
10253e234:     	b.hi	0x10253e214
10253e238:     	cmp	x9, #0x1
10253e23c:     	b.eq	0x10253e274
10253e240:     	cmp	x9, #0x2
10253e244:     	b.ne	0x10253e250
10253e248:     	mov	w8, #0x100              ; =256
10253e24c:     	b	0x10253e278
10253e250:     	mov	w0, #0x0                ; =0
10253e254:     	ldp	x29, x30, [sp, #0xf0]
10253e258:     	ldp	x20, x19, [sp, #0xe0]
10253e25c:     	ldp	x22, x21, [sp, #0xd0]
10253e260:     	ldp	x24, x23, [sp, #0xc0]
10253e264:     	ldp	x26, x25, [sp, #0xb0]
10253e268:     	ldp	x28, x27, [sp, #0xa0]
10253e26c:     	add	sp, sp, #0x100
10253e270:     	ret
10253e274:     	mov	w8, #0x80               ; =128
10253e278:     	mov	w0, #0x0                ; =0
10253e27c:     	str	x8, [x19, #0x68]
10253e280:     	b	0x10253e254

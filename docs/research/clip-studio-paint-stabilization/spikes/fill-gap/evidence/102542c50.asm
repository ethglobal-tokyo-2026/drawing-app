; CSP 5.1.4 ARM64, unslid range 0x102542c50:0x102543078
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102542c50:     	sub	sp, sp, #0x120
102542c54:     	stp	x28, x27, [sp, #0xc0]
102542c58:     	stp	x26, x25, [sp, #0xd0]
102542c5c:     	stp	x24, x23, [sp, #0xe0]
102542c60:     	stp	x22, x21, [sp, #0xf0]
102542c64:     	stp	x20, x19, [sp, #0x100]
102542c68:     	stp	x29, x30, [sp, #0x110]
102542c6c:     	add	x29, sp, #0x110
102542c70:     	mov	x19, x5
102542c74:     	str	w4, [sp, #0x4c]
102542c78:     	mov	x24, x3
102542c7c:     	mov	x20, x2
102542c80:     	mov	x26, x1
102542c84:     	str	x0, [sp, #0x60]
102542c88:     	mov	w0, #0x30               ; =48
102542c8c:     	bl	0x103bdd37c
102542c90:     	mov	x27, x0
102542c94:     	bl	0x10208fe44
102542c98:     	lsr	x22, x20, #32
102542c9c:     	lsr	x8, x24, #32
102542ca0:     	sub	w24, w24, w20
102542ca4:     	sub	w21, w8, w22
102542ca8:     	sub	x0, x29, #0x68
102542cac:     	mov	x1, x27
102542cb0:     	bl	0x1024fea24
102542cb4:     	ldur	x0, [x29, #-0x68]
102542cb8:     	mov	x1, x24
102542cbc:     	str	x21, [sp, #0x50]
102542cc0:     	mov	x2, x21
102542cc4:     	bl	0x10208ff08
102542cc8:     	stp	x19, x20, [sp, #0x18]
102542ccc:     	ldr	x9, [sp, #0x60]
102542cd0:     	ldr	x28, [x9, #0x190]
102542cd4:     	ldr	x26, [x26]
102542cd8:     	ldur	x27, [x29, #-0x68]
102542cdc:     	stp	xzr, xzr, [x29, #-0x78]
102542ce0:     	ldr	q0, [x9, #0x140]
102542ce4:     	str	q0, [sp, #0x80]
102542ce8:     	ldr	w8, [x9, #0x1d0]
102542cec:     	neg	w1, w8
102542cf0:     	ldr	w8, [x9, #0x1d4]
102542cf4:     	neg	w2, w8
102542cf8:     	add	x0, sp, #0x80
102542cfc:     	bl	0x10221b4d4
102542d00:     	ldr	x8, [sp, #0x50]
102542d04:     	subs	w8, w8, #0x1
102542d08:     	str	x8, [sp, #0x28]
102542d0c:     	b.lt	0x102542fcc
102542d10:     	mov	x12, #0x0               ; =0
102542d14:     	ldr	x9, [sp, #0x20]
102542d18:     	asr	w8, w9, #3
102542d1c:     	str	w8, [sp, #0x48]
102542d20:     	sub	w8, w24, #0x1
102542d24:     	mov	w9, w9
102542d28:     	str	x9, [sp, #0x58]
102542d2c:     	sxtw	x8, w8
102542d30:     	str	x8, [sp, #0x30]
102542d34:     	add	w9, w12, w22
102542d38:     	ldr	w10, [x28, #0x10]
102542d3c:     	mul	w8, w10, w9
102542d40:     	sub	w9, w9, #0x1
102542d44:     	mul	w11, w10, w9
102542d48:     	ldr	x9, [x28, #0x28]
102542d4c:     	add	x11, x9, x11
102542d50:     	cmp	x12, #0x0
102542d54:     	csel	x21, xzr, x11, eq
102542d58:     	add	w10, w10, w8
102542d5c:     	add	x10, x9, x10
102542d60:     	ldr	x11, [sp, #0x28]
102542d64:     	str	x12, [sp, #0x38]
102542d68:     	cmp	x12, x11
102542d6c:     	csel	x25, x10, xzr, lo
102542d70:     	cmp	w24, #0x1
102542d74:     	b.lt	0x102542fb8
102542d78:     	mov	x20, #0x0               ; =0
102542d7c:     	add	x8, x9, x8
102542d80:     	str	x8, [sp, #0x40]
102542d84:     	ldr	x8, [x26, #0x28]
102542d88:     	ldr	w9, [x26, #0x10]
102542d8c:     	ldr	x10, [sp, #0x38]
102542d90:     	mul	w9, w9, w10
102542d94:     	add	x19, x8, x9
102542d98:     	lsl	x23, x10, #32
102542d9c:     	ubfx	x8, x20, #3, #29
102542da0:     	ldrb	w8, [x19, x8]
102542da4:     	and	w9, w20, #0x7
102542da8:     	lsl	w8, w8, w9
102542dac:     	tbz	w8, #0x7, 0x102542fac
102542db0:     	ldr	x8, [sp, #0x58]
102542db4:     	add	x8, x20, x8
102542db8:     	cbz	x21, 0x102542dd0
102542dbc:     	asr	w9, w8, #3
102542dc0:     	ldrb	w9, [x21, w9, sxtw]
102542dc4:     	and	w10, w8, #0x7
102542dc8:     	lsl	w9, w9, w10
102542dcc:     	tbnz	w9, #0x7, 0x102542e30
102542dd0:     	cbz	x25, 0x102542de8
102542dd4:     	asr	w9, w8, #3
102542dd8:     	ldrb	w9, [x25, w9, sxtw]
102542ddc:     	and	w10, w8, #0x7
102542de0:     	lsl	w9, w9, w10
102542de4:     	tbnz	w9, #0x7, 0x102542e30
102542de8:     	cbz	x20, 0x102542e08
102542dec:     	sub	w9, w8, #0x1
102542df0:     	asr	w10, w9, #3
102542df4:     	ldr	x11, [sp, #0x40]
102542df8:     	ldrb	w10, [x11, w10, sxtw]
102542dfc:     	and	w9, w9, #0x7
102542e00:     	lsl	w9, w10, w9
102542e04:     	tbnz	w9, #0x7, 0x102542e30
102542e08:     	ldr	x9, [sp, #0x30]
102542e0c:     	cmp	x20, x9
102542e10:     	b.ge	0x102542fac
102542e14:     	add	w8, w8, #0x1
102542e18:     	asr	w9, w8, #3
102542e1c:     	ldr	x10, [sp, #0x40]
102542e20:     	ldrb	w9, [x10, w9, sxtw]
102542e24:     	and	w8, w8, #0x7
102542e28:     	lsl	w8, w9, w8
102542e2c:     	tbz	w8, #0x7, 0x102542fac
102542e30:     	stp	xzr, xzr, [sp, #0x70]
102542e34:     	str	wzr, [sp, #0x6c]
102542e38:     	add	x8, sp, #0x6c
102542e3c:     	str	x8, [sp, #0x10]
102542e40:     	orr	x3, x23, x20
102542e44:     	add	x8, sp, #0x70
102542e48:     	str	x8, [sp, #0x8]
102542e4c:     	add	x8, sp, #0x80
102542e50:     	str	x8, [sp]
102542e54:     	ldr	x0, [sp, #0x60]
102542e58:     	mov	x1, x27
102542e5c:     	mov	x2, x26
102542e60:     	mov	w4, #0x1                ; =1
102542e64:     	mov	w5, #0x1                ; =1
102542e68:     	mov	w6, #0x0                ; =0
102542e6c:     	mov	w7, #0x1                ; =1
102542e70:     	bl	0x10253d98c
102542e74:     	cbz	w0, 0x102542eb4
102542e78:     	ldp	w9, w13, [sp, #0x6c]
102542e7c:     	ldp	w8, w10, [sp, #0x74]
102542e80:     	ldr	w14, [sp, #0x7c]
102542e84:     	cmp	w10, w24
102542e88:     	ldr	x11, [sp, #0x50]
102542e8c:     	ccmp	w14, w11, #0x0, lt
102542e90:     	ccmp	w8, #0x1, #0x8, lt
102542e94:     	cset	w11, lt
102542e98:     	cmp	w13, #0x1
102542e9c:     	mov	w15, #0x1               ; =1
102542ea0:     	csel	w11, w15, w11, lt
102542ea4:     	ldr	w12, [sp, #0x4c]
102542ea8:     	cmp	w9, w12
102542eac:     	csel	w9, w15, w11, gt
102542eb0:     	b	0x102542ecc
102542eb4:     	ldr	x8, [sp, #0x60]
102542eb8:     	ldr	w8, [x8, #0x1fc]
102542ebc:     	cbnz	w8, 0x102543010
102542ec0:     	ldp	w13, w8, [sp, #0x70]
102542ec4:     	mov	w9, #0x1                ; =1
102542ec8:     	ldp	w10, w14, [sp, #0x78]
102542ecc:     	cmp	w13, w10
102542ed0:     	b.ge	0x102542fac
102542ed4:     	cmp	w8, w14
102542ed8:     	b.ge	0x102542fac
102542edc:     	asr	w15, w13, #3
102542ee0:     	sub	w16, w10, #0x1
102542ee4:     	asr	w10, w16, #3
102542ee8:     	sbfx	x11, x13, #3, #29
102542eec:     	ldr	w12, [sp, #0x48]
102542ef0:     	add	x12, x11, w12, sxtw
102542ef4:     	cmp	w15, w16, asr #3
102542ef8:     	csel	w15, w15, w10, gt
102542efc:     	sub	w13, w15, w13, asr #3
102542f00:     	add	w13, w13, #0x1
102542f04:     	tbz	w9, #0x0, 0x102542f10
102542f08:     	mov	x15, #0x0               ; =0
102542f0c:     	b	0x102542f28
102542f10:     	add	w15, w8, w22
102542f14:     	ldr	x16, [x28, #0x28]
102542f18:     	ldr	w17, [x28, #0x10]
102542f1c:     	mul	w15, w17, w15
102542f20:     	add	x16, x16, x12
102542f24:     	add	x15, x16, x15
102542f28:     	cmp	w11, w10
102542f2c:     	b.gt	0x102542f90
102542f30:     	ldr	x14, [x27, #0x28]
102542f34:     	ldr	w16, [x27, #0x10]
102542f38:     	mul	w16, w16, w8
102542f3c:     	add	x14, x14, x11
102542f40:     	add	x14, x14, x16
102542f44:     	ldr	x16, [x26, #0x28]
102542f48:     	ldr	w17, [x26, #0x10]
102542f4c:     	mul	w17, w17, w8
102542f50:     	add	x16, x16, x11
102542f54:     	add	x16, x16, x17
102542f58:     	mov	x17, x13
102542f5c:     	tbnz	w9, #0x0, 0x102542f70
102542f60:     	ldrb	w0, [x14]
102542f64:     	ldrb	w1, [x15]
102542f68:     	orr	w0, w1, w0
102542f6c:     	strb	w0, [x15], #0x1
102542f70:     	ldrb	w0, [x14]
102542f74:     	ldrb	w1, [x16]
102542f78:     	bic	w0, w1, w0
102542f7c:     	strb	w0, [x16], #0x1
102542f80:     	strb	wzr, [x14], #0x1
102542f84:     	subs	w17, w17, #0x1
102542f88:     	b.ne	0x102542f5c
102542f8c:     	ldr	w14, [sp, #0x7c]
102542f90:     	add	w8, w8, #0x1
102542f94:     	cmp	w8, w14
102542f98:     	b.lt	0x102542f04
102542f9c:     	tbnz	w9, #0x0, 0x102542fac
102542fa0:     	sub	x0, x29, #0x78
102542fa4:     	add	x1, sp, #0x70
102542fa8:     	bl	0x10221b5e4
102542fac:     	add	x20, x20, #0x1
102542fb0:     	cmp	x20, x24
102542fb4:     	b.ne	0x102542d9c
102542fb8:     	ldr	x12, [sp, #0x38]
102542fbc:     	add	x12, x12, #0x1
102542fc0:     	ldr	x8, [sp, #0x50]
102542fc4:     	cmp	x12, x8
102542fc8:     	b.ne	0x102542d34
102542fcc:     	ldur	w8, [x29, #-0x78]
102542fd0:     	ldur	w9, [x29, #-0x70]
102542fd4:     	mov	w21, #0x1               ; =1
102542fd8:     	cmp	w8, w9
102542fdc:     	b.ge	0x102543014
102542fe0:     	ldur	w8, [x29, #-0x74]
102542fe4:     	ldur	w9, [x29, #-0x6c]
102542fe8:     	cmp	w8, w9
102542fec:     	b.ge	0x102543014
102542ff0:     	sub	x0, x29, #0x78
102542ff4:     	ldr	x1, [sp, #0x20]
102542ff8:     	mov	x2, x22
102542ffc:     	bl	0x10221b4d4
102543000:     	sub	x1, x29, #0x78
102543004:     	ldr	x0, [sp, #0x18]
102543008:     	bl	0x10221b5e4
10254300c:     	b	0x102543014
102543010:     	mov	w21, #0x0               ; =0
102543014:     	sub	x8, x29, #0x68
102543018:     	add	x0, x8, #0x8
10254301c:     	bl	0x10001022c
102543020:     	mov	x0, x21
102543024:     	ldp	x29, x30, [sp, #0x110]
102543028:     	ldp	x20, x19, [sp, #0x100]
10254302c:     	ldp	x22, x21, [sp, #0xf0]
102543030:     	ldp	x24, x23, [sp, #0xe0]
102543034:     	ldp	x26, x25, [sp, #0xd0]
102543038:     	ldp	x28, x27, [sp, #0xc0]
10254303c:     	add	sp, sp, #0x120
102543040:     	ret
102543044:     	b	0x102543060
102543048:     	mov	x19, x0
10254304c:     	mov	x0, x27
102543050:     	bl	0x103bdd34c
102543054:     	b	0x102543070
102543058:     	b	0x102543060
10254305c:     	b	0x102543060
102543060:     	mov	x19, x0
102543064:     	sub	x8, x29, #0x68
102543068:     	add	x0, x8, #0x8
10254306c:     	bl	0x10001022c
102543070:     	mov	x0, x19
102543074:     	bl	0x103bda970

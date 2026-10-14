; CSP 5.1.4 ARM64, unslid range 0x102546a64:0x102546ed0
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102546a64:     	sub	sp, sp, #0xb0
102546a68:     	stp	x28, x27, [sp, #0x50]
102546a6c:     	stp	x26, x25, [sp, #0x60]
102546a70:     	stp	x24, x23, [sp, #0x70]
102546a74:     	stp	x22, x21, [sp, #0x80]
102546a78:     	stp	x20, x19, [sp, #0x90]
102546a7c:     	stp	x29, x30, [sp, #0xa0]
102546a80:     	add	x29, sp, #0xa0
102546a84:     	str	x6, [sp, #0x20]
102546a88:     	lsr	x26, x4, #32
102546a8c:     	lsr	x27, x5, #32
102546a90:     	cmp	w26, w27
102546a94:     	b.ge	0x102546e8c
102546a98:     	mov	x20, x5
102546a9c:     	mov	x21, x4
102546aa0:     	mov	x22, x3
102546aa4:     	str	wzr, [sp, #0x28]
102546aa8:     	ldr	x23, [x2]
102546aac:     	ldr	x24, [x1]
102546ab0:     	sub	w11, w27, #0x1
102546ab4:     	sub	w9, w20, #0x1
102546ab8:     	add	x8, sp, #0x40
102546abc:     	add	x8, x8, #0x8
102546ac0:     	str	x8, [sp, #0x8]
102546ac4:     	add	x8, sp, #0x30
102546ac8:     	ldr	x10, [x0]
102546acc:     	str	x10, [sp, #0x10]
102546ad0:     	add	x8, x8, #0x8
102546ad4:     	str	x8, [sp]
102546ad8:     	stp	w9, w11, [sp, #0x18]
102546adc:     	sub	w28, w9, w21
102546ae0:     	mov	w19, #0x80              ; =128
102546ae4:     	mov	x8, x26
102546ae8:     	ldr	x9, [sp, #0x10]
102546aec:     	ldr	x11, [x9, #0x28]
102546af0:     	ldr	w12, [x9, #0x10]
102546af4:     	sub	w9, w8, #0x1
102546af8:     	mul	w9, w12, w9
102546afc:     	add	x9, x11, x9
102546b00:     	cmp	w8, w26
102546b04:     	csel	x9, x9, xzr, gt
102546b08:     	add	w10, w8, #0x1
102546b0c:     	str	w10, [sp, #0x2c]
102546b10:     	mul	w10, w12, w10
102546b14:     	add	x10, x11, x10
102546b18:     	ldp	w25, w13, [sp, #0x18]
102546b1c:     	cmp	w8, w13
102546b20:     	csel	x10, x10, xzr, lt
102546b24:     	cmp	w21, w20
102546b28:     	b.ge	0x102546df8
102546b2c:     	mul	w12, w12, w8
102546b30:     	add	x11, x11, x12
102546b34:     	mov	w12, #-0x1              ; =-1
102546b38:     	mov	w13, #0x1               ; =1
102546b3c:     	mov	x14, x21
102546b40:     	asr	w15, w14, #3
102546b44:     	ldrb	w15, [x11, w15, sxtw]
102546b48:     	and	w16, w14, #0x7
102546b4c:     	lsr	w17, w19, w16
102546b50:     	tst	w17, w15
102546b54:     	b.eq	0x102546d70
102546b58:     	sbfx	x0, x14, #3, #29
102546b5c:     	mov	x15, x8
102546b60:     	cbz	x10, 0x102546bf8
102546b64:     	ldrb	w15, [x10, x0]
102546b68:     	and	w15, w17, w15
102546b6c:     	cmp	w15, #0x0
102546b70:     	ccmp	w22, #0x1, #0x8, eq
102546b74:     	mov	x15, x8
102546b78:     	b.lt	0x102546bf8
102546b7c:     	ldr	x15, [x23, #0x28]
102546b80:     	ldr	w16, [x23, #0x10]
102546b84:     	ldr	w1, [sp, #0x2c]
102546b88:     	mul	w16, w16, w1
102546b8c:     	add	x15, x15, x16
102546b90:     	ldrb	w16, [x15, x0]
102546b94:     	mov	x15, x8
102546b98:     	tst	w17, w16
102546b9c:     	b.eq	0x102546bf8
102546ba0:     	mov	w16, #0x1               ; =1
102546ba4:     	add	w15, w8, w16
102546ba8:     	ldr	x1, [x24, #0x28]
102546bac:     	ldr	w2, [x24, #0x10]
102546bb0:     	mul	w2, w2, w15
102546bb4:     	add	x1, x1, x2
102546bb8:     	ldrb	w2, [x1, x0]
102546bbc:     	orr	w2, w2, w17
102546bc0:     	strb	w2, [x1, x0]
102546bc4:     	add	w1, w15, #0x1
102546bc8:     	cmp	w1, w27
102546bcc:     	b.ge	0x102546bf8
102546bd0:     	cmp	w16, w22
102546bd4:     	b.ge	0x102546bf8
102546bd8:     	ldr	x2, [x23, #0x28]
102546bdc:     	ldr	w3, [x23, #0x10]
102546be0:     	mul	w1, w3, w1
102546be4:     	add	x1, x2, x1
102546be8:     	ldrb	w1, [x1, x0]
102546bec:     	add	w16, w16, #0x1
102546bf0:     	tst	w17, w1
102546bf4:     	b.ne	0x102546ba4
102546bf8:     	mov	x16, x8
102546bfc:     	cbz	x9, 0x102546c18
102546c00:     	ldrb	w16, [x9, x0]
102546c04:     	and	w16, w17, w16
102546c08:     	cmp	w16, #0x0
102546c0c:     	ccmp	w22, #0x1, #0x8, eq
102546c10:     	mov	x16, x8
102546c14:     	b.ge	0x102546d88
102546c18:     	cmp	w14, w25
102546c1c:     	b.ge	0x102546cc8
102546c20:     	add	w17, w14, #0x1
102546c24:     	asr	w0, w17, #3
102546c28:     	ldrb	w0, [x11, w0, sxtw]
102546c2c:     	and	w17, w17, #0x7
102546c30:     	lsl	w17, w0, w17
102546c34:     	tbnz	w17, #0x7, 0x102546cc8
102546c38:     	cmp	w16, w15
102546c3c:     	b.gt	0x102546cc8
102546c40:     	mov	x17, x16
102546c44:     	cmp	w22, #0x1
102546c48:     	b.lt	0x102546cb8
102546c4c:     	ldr	x0, [x23, #0x28]
102546c50:     	ldr	w1, [x23, #0x10]
102546c54:     	mul	w1, w1, w17
102546c58:     	add	x0, x0, x1
102546c5c:     	ldr	x1, [x24, #0x28]
102546c60:     	ldr	w2, [x24, #0x10]
102546c64:     	mul	w2, w2, w17
102546c68:     	add	x1, x1, x2
102546c6c:     	mov	w2, #0x1                ; =1
102546c70:     	add	w3, w14, w2
102546c74:     	asr	w4, w3, #3
102546c78:     	ldrb	w5, [x0, w4, sxtw]
102546c7c:     	and	w4, w3, #0x7
102546c80:     	lsr	w4, w19, w4
102546c84:     	tst	w4, w5
102546c88:     	b.eq	0x102546cb8
102546c8c:     	sbfx	x3, x3, #3, #29
102546c90:     	ldrb	w5, [x1, x3]
102546c94:     	orr	w4, w5, w4
102546c98:     	strb	w4, [x1, x3]
102546c9c:     	add	w3, w2, #0x1
102546ca0:     	add	w4, w3, w14
102546ca4:     	cmp	w4, w20
102546ca8:     	b.ge	0x102546cb8
102546cac:     	cmp	w2, w22
102546cb0:     	mov	x2, x3
102546cb4:     	b.lt	0x102546c70
102546cb8:     	add	w0, w17, #0x1
102546cbc:     	cmp	w17, w15
102546cc0:     	mov	x17, x0
102546cc4:     	b.ne	0x102546c44
102546cc8:     	cmp	w14, w21
102546ccc:     	b.le	0x102546d70
102546cd0:     	sub	w17, w14, #0x1
102546cd4:     	asr	w0, w17, #3
102546cd8:     	ldrb	w0, [x11, w0, sxtw]
102546cdc:     	and	w1, w17, #0x7
102546ce0:     	lsl	w0, w0, w1
102546ce4:     	tbnz	w0, #0x7, 0x102546d70
102546ce8:     	cmp	w16, w15
102546cec:     	b.gt	0x102546d70
102546cf0:     	cmp	w22, #0x1
102546cf4:     	b.lt	0x102546d60
102546cf8:     	ldr	x0, [x23, #0x28]
102546cfc:     	ldr	w1, [x23, #0x10]
102546d00:     	mul	w1, w1, w16
102546d04:     	add	x0, x0, x1
102546d08:     	ldr	w1, [x24, #0x10]
102546d0c:     	mul	w1, w1, w16
102546d10:     	ldr	x2, [x24, #0x28]
102546d14:     	add	x1, x2, x1
102546d18:     	mov	x2, x22
102546d1c:     	mov	x3, x13
102546d20:     	mov	x4, x17
102546d24:     	asr	w5, w4, #3
102546d28:     	ldrb	w6, [x0, w5, sxtw]
102546d2c:     	and	w5, w4, #0x7
102546d30:     	lsr	w5, w19, w5
102546d34:     	tst	w5, w6
102546d38:     	b.eq	0x102546d60
102546d3c:     	sbfx	x6, x4, #3, #29
102546d40:     	ldrb	w7, [x1, x6]
102546d44:     	orr	w5, w7, w5
102546d48:     	strb	w5, [x1, x6]
102546d4c:     	cbz	w3, 0x102546d60
102546d50:     	sub	w4, w4, #0x1
102546d54:     	add	w3, w3, #0x1
102546d58:     	subs	w2, w2, #0x1
102546d5c:     	b.ne	0x102546d24
102546d60:     	add	w0, w16, #0x1
102546d64:     	cmp	w16, w15
102546d68:     	mov	x16, x0
102546d6c:     	b.ne	0x102546cf0
102546d70:     	add	w14, w14, #0x1
102546d74:     	add	w12, w12, #0x1
102546d78:     	sub	w13, w13, #0x1
102546d7c:     	cmp	w12, w28
102546d80:     	b.ne	0x102546b40
102546d84:     	b	0x102546df8
102546d88:     	mov	w1, #0x1                ; =1
102546d8c:     	mov	x2, x8
102546d90:     	mov	x16, x2
102546d94:     	sub	w2, w2, #0x1
102546d98:     	ldr	x3, [x23, #0x28]
102546d9c:     	ldr	w4, [x23, #0x10]
102546da0:     	mul	w4, w4, w2
102546da4:     	add	x3, x3, x4
102546da8:     	ldrb	w3, [x3, x0]
102546dac:     	tst	w17, w3
102546db0:     	b.eq	0x102546c18
102546db4:     	ldr	x16, [x24, #0x28]
102546db8:     	ldr	w3, [x24, #0x10]
102546dbc:     	mul	w3, w3, w2
102546dc0:     	add	x16, x16, x3
102546dc4:     	ldrb	w3, [x16, x0]
102546dc8:     	orr	w3, w3, w17
102546dcc:     	strb	w3, [x16, x0]
102546dd0:     	cmp	w2, w26
102546dd4:     	b.le	0x102546df0
102546dd8:     	add	w3, w1, #0x1
102546ddc:     	mov	x16, x2
102546de0:     	cmp	w1, w22
102546de4:     	mov	x1, x3
102546de8:     	b.lt	0x102546d90
102546dec:     	b	0x102546c18
102546df0:     	mov	x16, x2
102546df4:     	b	0x102546c18
102546df8:     	ldr	w9, [sp, #0x28]
102546dfc:     	cmp	w8, w9
102546e00:     	b.lt	0x102546e7c
102546e04:     	ldr	x8, [sp, #0x20]
102546e08:     	ldr	x9, [x8]
102546e0c:     	cbz	x9, 0x102546e70
102546e10:     	ldr	x8, [sp, #0x20]
102546e14:     	ldr	x8, [x8, #0x8]
102546e18:     	stp	x9, x8, [sp, #0x40]
102546e1c:     	cbz	x8, 0x102546e2c
102546e20:     	add	x8, x8, #0x8
102546e24:     	mov	w9, #0x1                ; =1
102546e28:     	ldadd	w9, w8, [x8]
102546e2c:     	add	x0, sp, #0x40
102546e30:     	bl	0x10214ff74
102546e34:     	ldr	x0, [sp, #0x8]
102546e38:     	bl	0x10001022c
102546e3c:     	ldr	x8, [sp, #0x20]
102546e40:     	ldp	x9, x8, [x8]
102546e44:     	stp	x9, x8, [sp, #0x30]
102546e48:     	cbz	x8, 0x102546e58
102546e4c:     	add	x8, x8, #0x8
102546e50:     	mov	w9, #0x1                ; =1
102546e54:     	ldadd	w9, w8, [x8]
102546e58:     	add	x0, sp, #0x30
102546e5c:     	bl	0x10214ff2c
102546e60:     	mov	x25, x0
102546e64:     	ldr	x0, [sp]
102546e68:     	bl	0x10001022c
102546e6c:     	cbnz	w25, 0x102546e8c
102546e70:     	ldr	w8, [sp, #0x28]
102546e74:     	add	w8, w8, #0x20
102546e78:     	str	w8, [sp, #0x28]
102546e7c:     	ldr	w9, [sp, #0x2c]
102546e80:     	mov	x8, x9
102546e84:     	cmp	w9, w27
102546e88:     	b.ne	0x102546ae8
102546e8c:     	ldp	x29, x30, [sp, #0xa0]
102546e90:     	ldp	x20, x19, [sp, #0x90]
102546e94:     	ldp	x22, x21, [sp, #0x80]
102546e98:     	ldp	x24, x23, [sp, #0x70]
102546e9c:     	ldp	x26, x25, [sp, #0x60]
102546ea0:     	ldp	x28, x27, [sp, #0x50]
102546ea4:     	add	sp, sp, #0xb0
102546ea8:     	ret
102546eac:     	mov	x19, x0
102546eb0:     	ldr	x8, [sp]
102546eb4:     	str	x8, [sp, #0x8]
102546eb8:     	b	0x102546ec0
102546ebc:     	mov	x19, x0
102546ec0:     	ldr	x0, [sp, #0x8]
102546ec4:     	bl	0x10001022c
102546ec8:     	mov	x0, x19
102546ecc:     	bl	0x103bda970

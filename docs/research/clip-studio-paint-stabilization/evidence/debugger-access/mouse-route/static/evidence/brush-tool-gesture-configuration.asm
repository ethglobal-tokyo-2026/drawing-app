
FUNCTION 0x102e229a8 size 4744
102e229a8:     	stp	d9, d8, [sp, #-0x70]!
102e229ac:     	stp	x28, x27, [sp, #0x10]
102e229b0:     	stp	x26, x25, [sp, #0x20]
102e229b4:     	stp	x24, x23, [sp, #0x30]
102e229b8:     	stp	x22, x21, [sp, #0x40]
102e229bc:     	stp	x20, x19, [sp, #0x50]
102e229c0:     	stp	x29, x30, [sp, #0x60]
102e229c4:     	add	x29, sp, #0x60
102e229c8:     	sub	sp, sp, #0x480
102e229cc:     	ldr	x8, [x0, #0x78]
102e229d0:     	cbz	x8, 0x102e22b24
102e229d4:     	mov	x19, x0
102e229d8:     	ldr	x8, [x0, #0x88]
102e229dc:     	cbz	x8, 0x102e22b24
102e229e0:     	mov	x27, x6
102e229e4:     	mov	x24, x5
102e229e8:     	mov	x22, x4
102e229ec:     	mov	x23, x3
102e229f0:     	mov	x21, x2
102e229f4:     	mov	x25, x1
102e229f8:     	ldp	x9, x8, [x2]
102e229fc:     	stp	x9, x8, [x29, #-0x80]
102e22a00:     	cbz	x8, 0x102e22a10
102e22a04:     	add	x8, x8, #0x8
102e22a08:     	mov	w9, #0x1                ; =1
102e22a0c:     	ldadd	w9, w8, [x8]
102e22a10:     	sub	x26, x29, #0x80
102e22a14:     	sub	x0, x29, #0x80
102e22a18:     	bl	0x1021bb57c
102e22a1c:     	mov	x20, x0
102e22a20:     	add	x0, x26, #0x8
102e22a24:     	bl	0x10001022c
102e22a28:     	cbz	w20, 0x102e22b24
102e22a2c:     	ldp	x9, x8, [x23]
102e22a30:     	stp	x9, x8, [x29, #-0x90]
102e22a34:     	cbz	x8, 0x102e22a44
102e22a38:     	add	x8, x8, #0x8
102e22a3c:     	mov	w9, #0x1                ; =1
102e22a40:     	ldadd	w9, w8, [x8]
102e22a44:     	sub	x26, x29, #0x90
102e22a48:     	sub	x0, x29, #0x90
102e22a4c:     	bl	0x1021252b8
102e22a50:     	mov	x20, x0
102e22a54:     	add	x0, x26, #0x8
102e22a58:     	bl	0x10001022c
102e22a5c:     	cbz	w20, 0x102e22b24
102e22a60:     	ldr	w8, [x19, #0x1dc]
102e22a64:     	ldr	w9, [x19, #0x1e4]
102e22a68:     	cmp	w8, w9
102e22a6c:     	b.ge	0x102e22a94
102e22a70:     	ldr	w8, [x19, #0x1e0]
102e22a74:     	ldr	w9, [x19, #0x1e8]
102e22a78:     	cmp	w8, w9
102e22a7c:     	b.ge	0x102e22a94
102e22a80:     	add	x20, x19, #0x1dc
102e22a84:     	ldr	x0, [x21]
102e22a88:     	mov	x1, x20
102e22a8c:     	bl	0x1021c157c
102e22a90:     	stp	xzr, xzr, [x20]
102e22a94:     	add	x20, sp, #0x350
102e22a98:     	add	x8, sp, #0x350
102e22a9c:     	mov	x0, x19
102e22aa0:     	bl	0x102e1b69c
102e22aa4:     	ldr	x28, [sp, #0x350]
102e22aa8:     	add	x0, x20, #0x8
102e22aac:     	bl	0x10001022c
102e22ab0:     	cbz	x28, 0x102e22b24
102e22ab4:     	add	x0, sp, #0x350
102e22ab8:     	mov	x1, x25
102e22abc:     	bl	0x1020d7b0c
102e22ac0:     	add	x0, sp, #0x350
102e22ac4:     	bl	0x1020d80a8
102e22ac8:     	mov	x20, x0
102e22acc:     	bl	0x102194e64
102e22ad0:     	cmp	w0, #0x1
102e22ad4:     	b.ne	0x102e22b9c
102e22ad8:     	adrp	x0, 0x104d64000
102e22adc:     	add	x0, x0, #0x3a8
102e22ae0:     	bl	0x10214de74
102e22ae4:     	cmp	w20, w0
102e22ae8:     	b.ne	0x102e22b50
102e22aec:     	adrp	x8, 0x104cd4000
102e22af0:     	ldr	w26, [x8, #0x388]
102e22af4:     	ldr	x0, [x19, #0x48]
102e22af8:     	bl	0x102e4c884
102e22afc:     	cmp	w26, w0
102e22b00:     	b.eq	0x102e22b70
102e22b04:     	adrp	x8, 0x104cd4000
102e22b08:     	ldr	w8, [x8, #0x390]
102e22b0c:     	cbz	w8, 0x102e22b70
102e22b10:     	mov	w9, #0x1                ; =1
102e22b14:     	mov	w8, #0x1                ; =1
102e22b18:     	str	w8, [sp, #0x34]
102e22b1c:     	str	w9, [x19, #0x214]
102e22b20:     	b	0x102e22ba0
102e22b24:     	mov	w22, #0x0               ; =0
102e22b28:     	mov	x0, x22
102e22b2c:     	add	sp, sp, #0x480
102e22b30:     	ldp	x29, x30, [sp, #0x60]
102e22b34:     	ldp	x20, x19, [sp, #0x50]
102e22b38:     	ldp	x22, x21, [sp, #0x40]
102e22b3c:     	ldp	x24, x23, [sp, #0x30]
102e22b40:     	ldp	x26, x25, [sp, #0x20]
102e22b44:     	ldp	x28, x27, [sp, #0x10]
102e22b48:     	ldp	d9, d8, [sp], #0x70
102e22b4c:     	ret
102e22b50:     	adrp	x0, 0x104d64000
102e22b54:     	add	x0, x0, #0x3c8
102e22b58:     	bl	0x10214de74
102e22b5c:     	cmp	w20, w0
102e22b60:     	b.ne	0x102e22b78
102e22b64:     	ldr	w8, [x19, #0x214]
102e22b68:     	str	w8, [sp, #0x34]
102e22b6c:     	b	0x102e22ba0
102e22b70:     	str	wzr, [sp, #0x34]
102e22b74:     	b	0x102e22b94
102e22b78:     	adrp	x0, 0x104d64000
102e22b7c:     	add	x0, x0, #0x3e8
102e22b80:     	bl	0x10214de74
102e22b84:     	cmp	w20, w0
102e22b88:     	b.ne	0x102e22b9c
102e22b8c:     	ldr	w8, [x19, #0x214]
102e22b90:     	str	w8, [sp, #0x34]
102e22b94:     	str	wzr, [x19, #0x214]
102e22b98:     	b	0x102e22ba0
102e22b9c:     	str	wzr, [sp, #0x34]
102e22ba0:     	adrp	x0, 0x104d64000
102e22ba4:     	add	x0, x0, #0x3a8
102e22ba8:     	bl	0x10214de74
102e22bac:     	cmp	w20, w0
102e22bb0:     	b.eq	0x102e22bdc
102e22bb4:     	adrp	x0, 0x104d64000
102e22bb8:     	add	x0, x0, #0x408
102e22bbc:     	bl	0x10214de74
102e22bc0:     	cmp	w20, w0
102e22bc4:     	b.eq	0x102e22bdc
102e22bc8:     	adrp	x0, 0x104d64000
102e22bcc:     	add	x0, x0, #0x468
102e22bd0:     	bl	0x10214de74
102e22bd4:     	cmp	w20, w0
102e22bd8:     	b.ne	0x102e22c08
102e22bdc:     	ldr	w8, [x19, #0xa8]
102e22be0:     	cbnz	w8, 0x102e22c08
102e22be4:     	str	wzr, [x19, #0x11c]
102e22be8:     	movi.2d	v0, #0000000000000000
102e22bec:     	str	d0, [x19, #0x200]
102e22bf0:     	str	d0, [x19, #0x290]
102e22bf4:     	ldr	w8, [x19, #0x134]
102e22bf8:     	cmp	w8, #0x2
102e22bfc:     	b.ne	0x102e22c08
102e22c00:     	mov	x0, x19
102e22c04:     	bl	0x102e28290
102e22c08:     	ldr	w8, [x19, #0x290]
102e22c0c:     	sub	w8, w8, #0x1
102e22c10:     	cmp	w8, #0x2
102e22c14:     	b.hi	0x102e22c20
102e22c18:     	ldr	w8, [x19, #0x200]
102e22c1c:     	cbz	w8, 0x102e22f18
102e22c20:     	str	x28, [sp, #0x38]
102e22c24:     	movi.2d	v0, #0000000000000000
102e22c28:     	stp	q0, q0, [sp, #0x2b0]
102e22c2c:     	stp	q0, q0, [sp, #0x290]
102e22c30:     	stp	q0, q0, [sp, #0x270]
102e22c34:     	add	x28, sp, #0x260
102e22c38:     	ldr	x8, [x19, #0x20]
102e22c3c:     	str	xzr, [sp, #0x260]
102e22c40:     	str	x8, [sp, #0x268]
102e22c44:     	cbz	x8, 0x102e22c7c
102e22c48:     	ldr	w9, [x8, #0x8]
102e22c4c:     	cbz	w9, 0x102e22c78
102e22c50:     	add	w10, w9, #0x1
102e22c54:     	add	x11, x8, #0x8
102e22c58:     	mov	x12, x9
102e22c5c:     	cas	w12, w10, [x11]
102e22c60:     	cmp	w12, w9
102e22c64:     	mov	x9, x12
102e22c68:     	b.ne	0x102e22c4c
102e22c6c:     	ldr	x9, [x19, #0x18]
102e22c70:     	ldr	x8, [sp, #0x268]
102e22c74:     	b	0x102e22c80
102e22c78:     	mov	x8, #0x0                ; =0
102e22c7c:     	mov	x9, #0x0                ; =0
102e22c80:     	add	x26, sp, #0xc0
102e22c84:     	str	xzr, [sp, #0x268]
102e22c88:     	str	xzr, [sp, #0x260]
102e22c8c:     	ldr	x10, [sp, #0x278]
102e22c90:     	str	x9, [sp, #0x270]
102e22c94:     	str	x8, [sp, #0x278]
102e22c98:     	stp	xzr, x10, [sp, #0xc0]
102e22c9c:     	add	x0, x26, #0x8
102e22ca0:     	bl	0x10001022c
102e22ca4:     	add	x0, x28, #0x8
102e22ca8:     	bl	0x10001022c
102e22cac:     	ldp	x9, x8, [x21]
102e22cb0:     	cbz	x8, 0x102e22cc0
102e22cb4:     	add	x10, x8, #0x8
102e22cb8:     	mov	w11, #0x1               ; =1
102e22cbc:     	ldadd	w11, w10, [x10]
102e22cc0:     	ldr	q0, [sp, #0x280]
102e22cc4:     	str	x9, [sp, #0x280]
102e22cc8:     	str	x8, [sp, #0x288]
102e22ccc:     	str	q0, [sp, #0xc0]
102e22cd0:     	orr	x0, x26, #0x8
102e22cd4:     	bl	0x10001022c
102e22cd8:     	ldp	x9, x8, [x23]
102e22cdc:     	ldr	x28, [sp, #0x38]
102e22ce0:     	cbz	x8, 0x102e22cf0
102e22ce4:     	add	x10, x8, #0x8
102e22ce8:     	mov	w11, #0x1               ; =1
102e22cec:     	ldadd	w11, w10, [x10]
102e22cf0:     	add	x26, sp, #0xc0
102e22cf4:     	ldr	q0, [sp, #0x290]
102e22cf8:     	str	x9, [sp, #0x290]
102e22cfc:     	str	x8, [sp, #0x298]
102e22d00:     	str	q0, [sp, #0xc0]
102e22d04:     	orr	x0, x26, #0x8
102e22d08:     	bl	0x10001022c
102e22d0c:     	ldp	x9, x8, [x22]
102e22d10:     	cbz	x8, 0x102e22d20
102e22d14:     	add	x10, x8, #0x8
102e22d18:     	mov	w11, #0x1               ; =1
102e22d1c:     	ldadd	w11, w10, [x10]
102e22d20:     	ldr	q0, [sp, #0x2a0]
102e22d24:     	str	x9, [sp, #0x2a0]
102e22d28:     	str	x8, [sp, #0x2a8]
102e22d2c:     	str	q0, [sp, #0xc0]
102e22d30:     	orr	x0, x26, #0x8
102e22d34:     	bl	0x10001022c
102e22d38:     	ldp	x9, x8, [x27]
102e22d3c:     	cbz	x8, 0x102e22d4c
102e22d40:     	add	x10, x8, #0x8
102e22d44:     	mov	w11, #0x1               ; =1
102e22d48:     	ldadd	w11, w10, [x10]
102e22d4c:     	add	x26, sp, #0xc0
102e22d50:     	ldr	q0, [sp, #0x2b0]
102e22d54:     	str	x9, [sp, #0x2b0]
102e22d58:     	str	x8, [sp, #0x2b8]
102e22d5c:     	str	q0, [sp, #0xc0]
102e22d60:     	orr	x0, x26, #0x8
102e22d64:     	bl	0x10001022c
102e22d68:     	ldp	x9, x8, [x27, #0x10]
102e22d6c:     	cbz	x8, 0x102e22d7c
102e22d70:     	add	x10, x8, #0x8
102e22d74:     	mov	w11, #0x1               ; =1
102e22d78:     	ldadd	w11, w10, [x10]
102e22d7c:     	ldr	q0, [sp, #0x2c0]
102e22d80:     	str	x9, [sp, #0x2c0]
102e22d84:     	str	x8, [sp, #0x2c8]
102e22d88:     	str	q0, [sp, #0xc0]
102e22d8c:     	orr	x0, x26, #0x8
102e22d90:     	bl	0x10001022c
102e22d94:     	adrp	x8, 0x104484000
102e22d98:     	ldr	d0, [x8, #0xf30]
102e22d9c:     	str	d0, [sp, #0x318]
102e22da0:     	str	wzr, [sp, #0x330]
102e22da4:     	str	wzr, [sp, #0x320]
102e22da8:     	str	wzr, [sp, #0x32c]
102e22dac:     	add	x0, sp, #0x350
102e22db0:     	bl	0x1020d81d8
102e22db4:     	add	x9, sp, #0x248
102e22db8:     	adrp	x8, 0x104322000
102e22dbc:     	ldr	d0, [x8, #0x340]
102e22dc0:     	stur	d0, [x9, #0xdc]
102e22dc4:     	str	w0, [sp, #0x334]
102e22dc8:     	str	wzr, [sp, #0x338]
102e22dcc:     	ldr	w8, [x19, #0x138]
102e22dd0:     	ldr	w9, [x19, #0x160]
102e22dd4:     	bic	w8, w8, w9
102e22dd8:     	str	w8, [sp, #0x33c]
102e22ddc:     	add	x0, sp, #0x350
102e22de0:     	bl	0x1020d8310
102e22de4:     	str	x0, [sp, #0x340]
102e22de8:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
102e22dec:     	str	x8, [sp, #0x258]
102e22df0:     	add	x0, sp, #0x350
102e22df4:     	add	x1, sp, #0x258
102e22df8:     	bl	0x1020d82dc
102e22dfc:     	adrp	x0, 0x104d64000
102e22e00:     	add	x0, x0, #0x3a8
102e22e04:     	bl	0x10214de74
102e22e08:     	cmp	w20, w0
102e22e0c:     	b.eq	0x102e22e38
102e22e10:     	adrp	x0, 0x104d64000
102e22e14:     	add	x0, x0, #0x3c8
102e22e18:     	bl	0x10214de74
102e22e1c:     	cmp	w20, w0
102e22e20:     	b.eq	0x102e22e38
102e22e24:     	adrp	x0, 0x104d64000
102e22e28:     	add	x0, x0, #0x3e8
102e22e2c:     	bl	0x10214de74
102e22e30:     	cmp	w20, w0
102e22e34:     	b.ne	0x102e23164
102e22e38:     	add	x0, sp, #0x350
102e22e3c:     	add	x1, sp, #0x260
102e22e40:     	bl	0x1020d8184
102e22e44:     	add	x0, sp, #0x350
102e22e48:     	bl	0x1020d8198
102e22e4c:     	str	d0, [sp, #0x310]
102e22e50:     	add	x26, sp, #0x270
102e22e54:     	ldr	q0, [sp, #0x260]
102e22e58:     	str	q0, [sp, #0x2d0]
102e22e5c:     	add	x0, sp, #0x350
102e22e60:     	add	x1, x26, #0x70
102e22e64:     	bl	0x1020d8114
102e22e68:     	add	x0, sp, #0x350
102e22e6c:     	add	x1, sp, #0x248
102e22e70:     	bl	0x1020d8140
102e22e74:     	ldr	x0, [x19, #0xd0]
102e22e78:     	add	x1, sp, #0x248
102e22e7c:     	add	x2, x26, #0x60
102e22e80:     	bl	0x102e10e90
102e22e84:     	str	d0, [sp, #0x300]
102e22e88:     	str	d1, [sp, #0x308]
102e22e8c:     	ldr	w8, [x19, #0x1d8]
102e22e90:     	cbnz	w8, 0x102e22ed0
102e22e94:     	ldp	x9, x8, [x21]
102e22e98:     	str	x9, [sp, #0x238]
102e22e9c:     	str	x8, [sp, #0x240]
102e22ea0:     	cbz	x8, 0x102e22eb0
102e22ea4:     	add	x8, x8, #0x8
102e22ea8:     	mov	w9, #0x1                ; =1
102e22eac:     	ldadd	w9, w8, [x8]
102e22eb0:     	add	x26, sp, #0x238
102e22eb4:     	add	x0, sp, #0x238
102e22eb8:     	add	x1, sp, #0x260
102e22ebc:     	bl	0x1029915fc
102e22ec0:     	str	d0, [sp, #0x2f0]
102e22ec4:     	str	d1, [sp, #0x2f8]
102e22ec8:     	add	x0, x26, #0x8
102e22ecc:     	bl	0x10001022c
102e22ed0:     	ldr	w8, [x19, #0x218]
102e22ed4:     	cbz	w8, 0x102e22f4c
102e22ed8:     	adrp	x0, 0x104d64000
102e22edc:     	add	x0, x0, #0x588
102e22ee0:     	bl	0x10214de74
102e22ee4:     	cmp	w20, w0
102e22ee8:     	b.ne	0x102e22ef8
102e22eec:     	adrp	x0, 0x104d64000
102e22ef0:     	add	x0, x0, #0x3a8
102e22ef4:     	b	0x102e22f3c
102e22ef8:     	adrp	x0, 0x104d64000
102e22efc:     	add	x0, x0, #0x5a8
102e22f00:     	bl	0x10214de74
102e22f04:     	cmp	w20, w0
102e22f08:     	b.ne	0x102e22f20
102e22f0c:     	adrp	x0, 0x104d64000
102e22f10:     	add	x0, x0, #0x3c8
102e22f14:     	b	0x102e22f3c
102e22f18:     	mov	w22, #0x1               ; =1
102e22f1c:     	b	0x102e23aa4
102e22f20:     	adrp	x0, 0x104d64000
102e22f24:     	add	x0, x0, #0x5c8
102e22f28:     	bl	0x10214de74
102e22f2c:     	cmp	w20, w0
102e22f30:     	b.ne	0x102e22f4c
102e22f34:     	adrp	x0, 0x104d64000
102e22f38:     	add	x0, x0, #0x3e8
102e22f3c:     	bl	0x10214de74
102e22f40:     	mov	x20, x0
102e22f44:     	mov	w27, #0x1               ; =1
102e22f48:     	b	0x102e22f50
102e22f4c:     	mov	w27, #0x0               ; =0
102e22f50:     	bl	0x102194e64
102e22f54:     	cmp	w0, #0x1
102e22f58:     	b.ne	0x102e22f98
102e22f5c:     	ldp	x9, x8, [x21]
102e22f60:     	str	x9, [sp, #0x228]
102e22f64:     	str	x8, [sp, #0x230]
102e22f68:     	cbz	x8, 0x102e22f78
102e22f6c:     	add	x8, x8, #0x8
102e22f70:     	mov	w9, #0x1                ; =1
102e22f74:     	ldadd	w9, w8, [x8]
102e22f78:     	add	x26, sp, #0x228
102e22f7c:     	ldr	x8, [x19]
102e22f80:     	ldr	x8, [x8, #0x80]
102e22f84:     	add	x1, sp, #0x228
102e22f88:     	mov	x0, x19
102e22f8c:     	blr	x8
102e22f90:     	add	x0, x26, #0x8
102e22f94:     	bl	0x10001022c
102e22f98:     	adrp	x0, 0x104d64000
102e22f9c:     	add	x0, x0, #0x3a8
102e22fa0:     	bl	0x10214de74
102e22fa4:     	cmp	w20, w0
102e22fa8:     	b.eq	0x102e22fd4
102e22fac:     	adrp	x0, 0x104d64000
102e22fb0:     	add	x0, x0, #0x3c8
102e22fb4:     	bl	0x10214de74
102e22fb8:     	cmp	w20, w0
102e22fbc:     	b.eq	0x102e22fd4
102e22fc0:     	adrp	x0, 0x104d64000
102e22fc4:     	add	x0, x0, #0x3e8
102e22fc8:     	bl	0x10214de74
102e22fcc:     	cmp	w20, w0
102e22fd0:     	b.ne	0x102e23178
102e22fd4:     	ldr	w8, [x19, #0x200]
102e22fd8:     	cbnz	w8, 0x102e22ff4
102e22fdc:     	mov	x0, x25
102e22fe0:     	bl	0x102e17488
102e22fe4:     	cmp	w0, #0x0
102e22fe8:     	cset	w8, eq
102e22fec:     	bic	w8, w8, w27
102e22ff0:     	tbnz	w8, #0x0, 0x102e23144
102e22ff4:     	ldr	w8, [x19, #0x210]
102e22ff8:     	ldr	w9, [sp, #0x34]
102e22ffc:     	orr	w8, w8, w9
102e23000:     	cbz	w8, 0x102e23024
102e23004:     	adrp	x0, 0x104d64000
102e23008:     	add	x0, x0, #0x3a8
102e2300c:     	bl	0x10214de74
102e23010:     	cmp	w20, w0
102e23014:     	b.ne	0x102e230dc
102e23018:     	mov	w22, #0x1               ; =1
102e2301c:     	str	w22, [x19, #0x200]
102e23020:     	b	0x102e23a68
102e23024:     	adrp	x0, 0x104d64000
102e23028:     	add	x0, x0, #0x3a8
102e2302c:     	bl	0x10214de74
102e23030:     	cmp	w20, w0
102e23034:     	b.ne	0x102e23114
102e23038:     	mov	x0, x19
102e2303c:     	bl	0x102e18d58
102e23040:     	add	x0, x19, #0x2d8
102e23044:     	bl	0x102e1d584
102e23048:     	adrp	x0, 0x104d65000
102e2304c:     	add	x0, x0, #0x250
102e23050:     	bl	0x10214de74
102e23054:     	str	w0, [sp, #0x38]
102e23058:     	ldr	x0, [x23]
102e2305c:     	add	x28, sp, #0xc0
102e23060:     	add	x8, sp, #0xc0
102e23064:     	bl	0x10290e8e8
102e23068:     	ldp	x9, x8, [sp, #0xc0]
102e2306c:     	str	x9, [sp, #0x218]
102e23070:     	str	x8, [sp, #0x220]
102e23074:     	cbz	x8, 0x102e23084
102e23078:     	add	x8, x8, #0x8
102e2307c:     	mov	w9, #0x1                ; =1
102e23080:     	ldadd	w9, w8, [x8]
102e23084:     	add	x26, sp, #0x218
102e23088:     	add	x0, sp, #0x218
102e2308c:     	bl	0x10270ea10
102e23090:     	mov	x27, x0
102e23094:     	add	x0, x26, #0x8
102e23098:     	bl	0x10001022c
102e2309c:     	mov	w9, #0x1                ; =1
102e230a0:     	mov	w8, #0x1                ; =1
102e230a4:     	cbnz	w27, 0x102e230b8
102e230a8:     	ldr	w8, [x19, #0x20c]
102e230ac:     	cmp	w8, #0x0
102e230b0:     	mov	w8, #0x4                ; =4
102e230b4:     	csinc	w8, w8, wzr, ne
102e230b8:     	str	w8, [x19, #0x290]
102e230bc:     	mov	w8, #0x1                ; =1
102e230c0:     	str	w8, [sp, #0x34]
102e230c4:     	str	w9, [x19, #0x200]
102e230c8:     	str	wzr, [x19, #0x208]
102e230cc:     	str	w24, [x19, #0x294]
102e230d0:     	add	x0, x28, #0x8
102e230d4:     	bl	0x10001022c
102e230d8:     	b	0x102e232b8
102e230dc:     	adrp	x0, 0x104d64000
102e230e0:     	add	x0, x0, #0x3c8
102e230e4:     	bl	0x10214de74
102e230e8:     	cmp	w20, w0
102e230ec:     	b.eq	0x102e2310c
102e230f0:     	adrp	x0, 0x104d64000
102e230f4:     	add	x0, x0, #0x3e8
102e230f8:     	bl	0x10214de74
102e230fc:     	cmp	w20, w0
102e23100:     	b.ne	0x102e2310c
102e23104:     	movi.2d	v0, #0000000000000000
102e23108:     	str	d0, [x19, #0x200]
102e2310c:     	mov	w22, #0x1               ; =1
102e23110:     	b	0x102e23a68
102e23114:     	adrp	x0, 0x104d64000
102e23118:     	add	x0, x0, #0x3c8
102e2311c:     	bl	0x10214de74
102e23120:     	cmp	w20, w0
102e23124:     	b.ne	0x102e2327c
102e23128:     	adrp	x0, 0x104d65000
102e2312c:     	add	x0, x0, #0x1f0
102e23130:     	bl	0x10214de74
102e23134:     	str	w0, [sp, #0x38]
102e23138:     	mov	w8, #0x1                ; =1
102e2313c:     	str	w8, [sp, #0x34]
102e23140:     	b	0x102e232b8
102e23144:     	tbnz	w24, #0xc, 0x102e23a64
102e23148:     	adrp	x0, 0x104d64000
102e2314c:     	add	x0, x0, #0x3a8
102e23150:     	bl	0x10214de74
102e23154:     	cmp	w20, w0
102e23158:     	b.ne	0x102e234f0
102e2315c:     	mov	w8, #0xe8               ; =232
102e23160:     	b	0x102e2356c
102e23164:     	add	x0, sp, #0x350
102e23168:     	add	x1, sp, #0x260
102e2316c:     	bl	0x1020d8140
102e23170:     	ldr	d0, [sp, #0x258]
102e23174:     	b	0x102e22e4c
102e23178:     	adrp	x0, 0x104d64000
102e2317c:     	add	x0, x0, #0x588
102e23180:     	bl	0x10214de74
102e23184:     	cmp	w20, w0
102e23188:     	b.eq	0x102e231b4
102e2318c:     	adrp	x0, 0x104d64000
102e23190:     	add	x0, x0, #0x5a8
102e23194:     	bl	0x10214de74
102e23198:     	cmp	w20, w0
102e2319c:     	b.eq	0x102e231b4
102e231a0:     	adrp	x0, 0x104d64000
102e231a4:     	add	x0, x0, #0x5c8
102e231a8:     	bl	0x10214de74
102e231ac:     	cmp	w20, w0
102e231b0:     	b.ne	0x102e23588
102e231b4:     	bl	0x102194e64
102e231b8:     	cmp	w0, #0x3
102e231bc:     	b.eq	0x102e231cc
102e231c0:     	bl	0x102194e64
102e231c4:     	cmp	w0, #0x4
102e231c8:     	b.ne	0x102e2350c
102e231cc:     	add	x0, sp, #0x350
102e231d0:     	bl	0x1020d8300
102e231d4:     	ldr	w8, [x19, #0x200]
102e231d8:     	cbnz	w8, 0x102e231e4
102e231dc:     	cmp	w0, #0x1
102e231e0:     	b.ne	0x102e23a64
102e231e4:     	adrp	x0, 0x104d64000
102e231e8:     	add	x0, x0, #0x588
102e231ec:     	bl	0x10214de74
102e231f0:     	cmp	w20, w0
102e231f4:     	b.ne	0x102e23528
102e231f8:     	adrp	x0, 0x104d65000
102e231fc:     	add	x0, x0, #0x250
102e23200:     	bl	0x10214de74
102e23204:     	mov	x25, x0
102e23208:     	ldr	x0, [x23]
102e2320c:     	add	x27, sp, #0xc0
102e23210:     	add	x8, sp, #0xc0
102e23214:     	bl	0x10290e8e8
102e23218:     	ldp	x9, x8, [sp, #0xc0]
102e2321c:     	stp	x9, x8, [sp, #0xb0]
102e23220:     	cbz	x8, 0x102e23230
102e23224:     	add	x8, x8, #0x8
102e23228:     	mov	w9, #0x1                ; =1
102e2322c:     	ldadd	w9, w8, [x8]
102e23230:     	add	x28, sp, #0xb0
102e23234:     	add	x0, sp, #0xb0
102e23238:     	bl	0x10270ea10
102e2323c:     	mov	x26, x0
102e23240:     	add	x0, x28, #0x8
102e23244:     	bl	0x10001022c
102e23248:     	cmp	w26, #0x0
102e2324c:     	mov	w8, #0x4                ; =4
102e23250:     	csinc	w8, w8, wzr, eq
102e23254:     	str	w8, [x19, #0x290]
102e23258:     	add	x0, x19, #0x2d8
102e2325c:     	bl	0x102e1d584
102e23260:     	mov	w28, #0x1               ; =1
102e23264:     	str	w28, [x19, #0x200]
102e23268:     	str	wzr, [x19, #0x208]
102e2326c:     	str	w24, [x19, #0x294]
102e23270:     	add	x0, x27, #0x8
102e23274:     	bl	0x10001022c
102e23278:     	b	0x102e23688
102e2327c:     	adrp	x0, 0x104d64000
102e23280:     	add	x0, x0, #0x3e8
102e23284:     	bl	0x10214de74
102e23288:     	cmp	w20, w0
102e2328c:     	b.ne	0x102e232b4
102e23290:     	adrp	x0, 0x104d65000
102e23294:     	add	x0, x0, #0x290
102e23298:     	bl	0x10214de74
102e2329c:     	str	w0, [sp, #0x38]
102e232a0:     	str	wzr, [sp, #0x34]
102e232a4:     	movi.2d	v0, #0000000000000000
102e232a8:     	str	d0, [x19, #0x200]
102e232ac:     	str	d0, [x19, #0x290]
102e232b0:     	b	0x102e232b8
102e232b4:     	stp	wzr, wzr, [sp, #0x34]
102e232b8:     	ldr	w8, [x19, #0x208]
102e232bc:     	cbz	w8, 0x102e232c8
102e232c0:     	mov	w22, #0x1               ; =1
102e232c4:     	b	0x102e234c4
102e232c8:     	add	x0, sp, #0x350
102e232cc:     	bl	0x1020d82f0
102e232d0:     	str	w0, [sp, #0x30]
102e232d4:     	ldr	w8, [x19, #0x20c]
102e232d8:     	cmp	w8, #0x0
102e232dc:     	mov	w8, #0x4                ; =4
102e232e0:     	csinc	w28, w8, wzr, ne
102e232e4:     	ldr	x0, [x23]
102e232e8:     	add	x8, sp, #0x208
102e232ec:     	bl	0x10290e8e8
102e232f0:     	ldr	x9, [sp, #0x208]
102e232f4:     	ldr	x8, [sp, #0x210]
102e232f8:     	stp	x9, x8, [sp, #0x1f8]
102e232fc:     	cbz	x8, 0x102e2330c
102e23300:     	add	x8, x8, #0x8
102e23304:     	mov	w9, #0x1                ; =1
102e23308:     	ldadd	w9, w8, [x8]
102e2330c:     	add	x26, sp, #0x1f8
102e23310:     	add	x0, sp, #0x1f8
102e23314:     	bl	0x10270ea10
102e23318:     	mov	x27, x0
102e2331c:     	add	x0, x26, #0x8
102e23320:     	bl	0x10001022c
102e23324:     	and	w8, w24, #0x8
102e23328:     	orr	w8, w27, w8
102e2332c:     	cmp	w8, #0x0
102e23330:     	csinc	w28, w28, wzr, eq
102e23334:     	add	x0, sp, #0x350
102e23338:     	bl	0x1020d81ac
102e2333c:     	cbz	w0, 0x102e23350
102e23340:     	add	x0, sp, #0x350
102e23344:     	bl	0x1020d81b4
102e23348:     	mov	x27, x0
102e2334c:     	b	0x102e23354
102e23350:     	mov	w27, #0x0               ; =0
102e23354:     	add	x0, sp, #0x350
102e23358:     	bl	0x1020d8370
102e2335c:     	ldp	x9, x8, [x21]
102e23360:     	stp	x9, x8, [sp, #0x1e8]
102e23364:     	cbz	x8, 0x102e23374
102e23368:     	add	x8, x8, #0x8
102e2336c:     	mov	w9, #0x1                ; =1
102e23370:     	ldadd	w9, w8, [x8]
102e23374:     	ldp	x9, x8, [x23]
102e23378:     	stp	x9, x8, [sp, #0x1d8]
102e2337c:     	cbz	x8, 0x102e2338c
102e23380:     	add	x8, x8, #0x8
102e23384:     	mov	w9, #0x1                ; =1
102e23388:     	ldadd	w9, w8, [x8]
102e2338c:     	ldp	x9, x8, [x22]
102e23390:     	stp	x9, x8, [sp, #0x1c8]
102e23394:     	cbz	x8, 0x102e233a4
102e23398:     	add	x8, x8, #0x8
102e2339c:     	mov	w9, #0x1                ; =1
102e233a0:     	ldadd	w9, w8, [x8]
102e233a4:     	add	x26, sp, #0x1e8
102e233a8:     	add	x23, sp, #0x1d8
102e233ac:     	add	x21, sp, #0x1c8
102e233b0:     	ldr	d0, [sp, #0x258]
102e233b4:     	add	x8, sp, #0x248
102e233b8:     	str	x8, [sp, #0x28]
102e233bc:     	str	w0, [sp, #0x20]
102e233c0:     	mov	w8, #0x1                ; =1
102e233c4:     	str	x8, [sp, #0x18]
102e233c8:     	stp	w27, w24, [sp, #0x10]
102e233cc:     	add	x1, sp, #0x1e8
102e233d0:     	add	x2, sp, #0x1d8
102e233d4:     	str	wzr, [sp, #0xc]
102e233d8:     	stur	xzr, [sp, #0x4]
102e233dc:     	ldp	w8, w5, [sp, #0x34]
102e233e0:     	str	w8, [sp]
102e233e4:     	add	x3, sp, #0x1c8
102e233e8:     	add	x4, sp, #0x270
102e233ec:     	mov	x0, x19
102e233f0:     	ldr	w6, [sp, #0x30]
102e233f4:     	mov	x7, x28
102e233f8:     	bl	0x102e1dad0
102e233fc:     	mov	x22, x0
102e23400:     	add	x0, x21, #0x8
102e23404:     	bl	0x10001022c
102e23408:     	add	x0, x23, #0x8
102e2340c:     	bl	0x10001022c
102e23410:     	add	x0, x26, #0x8
102e23414:     	bl	0x10001022c
102e23418:     	cbz	w22, 0x102e2342c
102e2341c:     	add	x8, x19, #0x248
102e23420:     	add	x9, sp, #0x248
102e23424:     	ldr	q0, [x9]
102e23428:     	str	q0, [x8]
102e2342c:     	add	x23, sp, #0xc0
102e23430:     	add	x8, sp, #0xc0
102e23434:     	mov	x0, x19
102e23438:     	bl	0x102e1b69c
102e2343c:     	ldr	x21, [sp, #0xc0]
102e23440:     	add	x0, x23, #0x8
102e23444:     	bl	0x10001022c
102e23448:     	cbz	x21, 0x102e234b8
102e2344c:     	ldr	x8, [x21]
102e23450:     	ldr	x8, [x8, #0x260]
102e23454:     	mov	x0, x21
102e23458:     	blr	x8
102e2345c:     	mov	x21, x0
102e23460:     	adrp	x0, 0x104d64000
102e23464:     	add	x0, x0, #0x3a8
102e23468:     	bl	0x10214de74
102e2346c:     	cmp	w20, w0
102e23470:     	b.ne	0x102e23484
102e23474:     	bl	0x1020d9264
102e23478:     	cbz	x0, 0x102e23484
102e2347c:     	mov	x1, x21
102e23480:     	bl	0x1020d9300
102e23484:     	cbz	w27, 0x102e234b8
102e23488:     	cbnz	w21, 0x102e234b8
102e2348c:     	add	x0, sp, #0xc0
102e23490:     	mov	x1, x25
102e23494:     	bl	0x1020d7b0c
102e23498:     	add	x0, sp, #0xc0
102e2349c:     	bl	0x1020d81bc
102e234a0:     	add	x0, sp, #0xc0
102e234a4:     	mov	x1, x25
102e234a8:     	bl	0x1020d861c
102e234ac:     	add	x0, sp, #0xc0
102e234b0:     	bl	0x1020d7dc8
102e234b4:     	mov	w22, #0x1               ; =1
102e234b8:     	add	x8, sp, #0x208
102e234bc:     	add	x0, x8, #0x8
102e234c0:     	bl	0x10001022c
102e234c4:     	adrp	x0, 0x104d64000
102e234c8:     	add	x0, x0, #0x3e8
102e234cc:     	bl	0x10214de74
102e234d0:     	cmp	w20, w0
102e234d4:     	b.ne	0x102e23a68
102e234d8:     	ldr	w8, [x19, #0x134]
102e234dc:     	cmp	w8, #0x2
102e234e0:     	b.ne	0x102e23a68
102e234e4:     	mov	x0, x19
102e234e8:     	bl	0x102e28290
102e234ec:     	b	0x102e23a68
102e234f0:     	adrp	x0, 0x104d64000
102e234f4:     	add	x0, x0, #0x3c8
102e234f8:     	bl	0x10214de74
102e234fc:     	cmp	w20, w0
102e23500:     	b.ne	0x102e23554
102e23504:     	mov	w8, #0xf0               ; =240
102e23508:     	b	0x102e2356c
102e2350c:     	bl	0x102194e64
102e23510:     	cmp	w0, #0x1
102e23514:     	b.ne	0x102e23a64
102e23518:     	ldr	w8, [x19, #0x21c]
102e2351c:     	cmp	w8, #0x1
102e23520:     	b.eq	0x102e231cc
102e23524:     	b	0x102e23a64
102e23528:     	adrp	x0, 0x104d64000
102e2352c:     	add	x0, x0, #0x5a8
102e23530:     	bl	0x10214de74
102e23534:     	cmp	w20, w0
102e23538:     	b.ne	0x102e23648
102e2353c:     	adrp	x0, 0x104d65000
102e23540:     	add	x0, x0, #0x1f0
102e23544:     	bl	0x10214de74
102e23548:     	mov	x25, x0
102e2354c:     	mov	w28, #0x1               ; =1
102e23550:     	b	0x102e23688
102e23554:     	adrp	x0, 0x104d64000
102e23558:     	add	x0, x0, #0x3e8
102e2355c:     	bl	0x10214de74
102e23560:     	cmp	w20, w0
102e23564:     	b.ne	0x102e23a64
102e23568:     	mov	w8, #0xf8               ; =248
102e2356c:     	ldr	x9, [x28]
102e23570:     	ldr	x8, [x9, x8]
102e23574:     	add	x1, sp, #0x270
102e23578:     	mov	x0, x28
102e2357c:     	blr	x8
102e23580:     	mov	x22, x0
102e23584:     	b	0x102e23a68
102e23588:     	adrp	x0, 0x104d64000
102e2358c:     	add	x0, x0, #0x408
102e23590:     	bl	0x10214de74
102e23594:     	cmp	w20, w0
102e23598:     	b.eq	0x102e235c4
102e2359c:     	adrp	x0, 0x104d64000
102e235a0:     	add	x0, x0, #0x428
102e235a4:     	bl	0x10214de74
102e235a8:     	cmp	w20, w0
102e235ac:     	b.eq	0x102e235c4
102e235b0:     	adrp	x0, 0x104d64000
102e235b4:     	add	x0, x0, #0x448
102e235b8:     	bl	0x10214de74
102e235bc:     	cmp	w20, w0
102e235c0:     	b.ne	0x102e23820
102e235c4:     	ldr	w8, [x19, #0x200]
102e235c8:     	cbz	w8, 0x102e235d4
102e235cc:     	ldr	w8, [x19, #0x204]
102e235d0:     	cbz	w8, 0x102e2310c
102e235d4:     	tbnz	w24, #0xd, 0x102e23a64
102e235d8:     	str	xzr, [sp, #0x208]
102e235dc:     	add	x0, sp, #0x350
102e235e0:     	add	x1, sp, #0x208
102e235e4:     	bl	0x1020d8260
102e235e8:     	add	x0, sp, #0x350
102e235ec:     	add	x1, sp, #0xc0
102e235f0:     	bl	0x1020d80e8
102e235f4:     	ldp	x9, x8, [x21]
102e235f8:     	stp	x9, x8, [sp, #0x60]
102e235fc:     	cbz	x8, 0x102e2360c
102e23600:     	add	x8, x8, #0x8
102e23604:     	mov	w9, #0x1                ; =1
102e23608:     	ldadd	w9, w8, [x8]
102e2360c:     	add	x21, sp, #0x60
102e23610:     	add	x0, sp, #0x60
102e23614:     	add	x1, sp, #0xc0
102e23618:     	bl	0x1029915fc
102e2361c:     	fmov	d8, d0
102e23620:     	fmov	d9, d1
102e23624:     	add	x0, x21, #0x8
102e23628:     	bl	0x10001022c
102e2362c:     	adrp	x0, 0x104d64000
102e23630:     	add	x0, x0, #0x408
102e23634:     	bl	0x10214de74
102e23638:     	cmp	w20, w0
102e2363c:     	b.ne	0x102e23804
102e23640:     	mov	w8, #0x100              ; =256
102e23644:     	b	0x102e238f8
102e23648:     	adrp	x0, 0x104d64000
102e2364c:     	add	x0, x0, #0x5c8
102e23650:     	bl	0x10214de74
102e23654:     	cmp	w20, w0
102e23658:     	b.ne	0x102e23680
102e2365c:     	adrp	x0, 0x104d65000
102e23660:     	add	x0, x0, #0x290
102e23664:     	bl	0x10214de74
102e23668:     	mov	x25, x0
102e2366c:     	mov	w28, #0x0               ; =0
102e23670:     	movi.2d	v0, #0000000000000000
102e23674:     	str	d0, [x19, #0x200]
102e23678:     	str	d0, [x19, #0x290]
102e2367c:     	b	0x102e23688
102e23680:     	mov	w25, #0x0               ; =0
102e23684:     	mov	w28, #0x0               ; =0
102e23688:     	ldr	w8, [x19, #0x208]
102e2368c:     	cbz	w8, 0x102e23698
102e23690:     	mov	w22, #0x1               ; =1
102e23694:     	b	0x102e237d8
102e23698:     	add	x0, sp, #0x350
102e2369c:     	bl	0x1020d82f0
102e236a0:     	mov	x24, x0
102e236a4:     	ldr	x0, [x23]
102e236a8:     	add	x8, sp, #0xc0
102e236ac:     	bl	0x10290e8e8
102e236b0:     	ldp	x9, x8, [sp, #0xc0]
102e236b4:     	stp	x9, x8, [sp, #0xa0]
102e236b8:     	cbz	x8, 0x102e236c8
102e236bc:     	add	x8, x8, #0x8
102e236c0:     	mov	w9, #0x1                ; =1
102e236c4:     	ldadd	w9, w8, [x8]
102e236c8:     	add	x27, sp, #0xa0
102e236cc:     	add	x0, sp, #0xa0
102e236d0:     	bl	0x10270ea10
102e236d4:     	mov	x26, x0
102e236d8:     	add	x0, x27, #0x8
102e236dc:     	bl	0x10001022c
102e236e0:     	cmp	w26, #0x0
102e236e4:     	mov	w8, #0x4                ; =4
102e236e8:     	csinc	w26, w8, wzr, eq
102e236ec:     	add	x0, sp, #0x350
102e236f0:     	bl	0x1020d81ac
102e236f4:     	cbz	w0, 0x102e23700
102e236f8:     	add	x0, sp, #0x350
102e236fc:     	bl	0x1020d81b4
102e23700:     	ldp	x9, x8, [x21]
102e23704:     	stp	x9, x8, [sp, #0x90]
102e23708:     	cbz	x8, 0x102e23718
102e2370c:     	add	x8, x8, #0x8
102e23710:     	mov	w9, #0x1                ; =1
102e23714:     	ldadd	w9, w8, [x8]
102e23718:     	ldp	x9, x8, [x23]
102e2371c:     	stp	x9, x8, [sp, #0x80]
102e23720:     	cbz	x8, 0x102e23730
102e23724:     	add	x8, x8, #0x8
102e23728:     	mov	w9, #0x1                ; =1
102e2372c:     	ldadd	w9, w8, [x8]
102e23730:     	ldp	x9, x8, [x22]
102e23734:     	stp	x9, x8, [sp, #0x70]
102e23738:     	cbz	x8, 0x102e23748
102e2373c:     	add	x8, x8, #0x8
102e23740:     	mov	w9, #0x1                ; =1
102e23744:     	ldadd	w9, w8, [x8]
102e23748:     	add	x21, sp, #0x90
102e2374c:     	add	x23, sp, #0x80
102e23750:     	add	x27, sp, #0x70
102e23754:     	ldr	d0, [sp, #0x258]
102e23758:     	add	x8, sp, #0x248
102e2375c:     	str	x8, [sp, #0x28]
102e23760:     	stur	xzr, [sp, #0x1c]
102e23764:     	mov	x8, #0x100000000        ; =4294967296
102e23768:     	stur	x8, [sp, #0x14]
102e2376c:     	add	x1, sp, #0x90
102e23770:     	add	x2, sp, #0x80
102e23774:     	stp	wzr, w0, [sp, #0xc]
102e23778:     	stur	x8, [sp, #0x4]
102e2377c:     	str	w28, [sp]
102e23780:     	add	x3, sp, #0x70
102e23784:     	add	x4, sp, #0x270
102e23788:     	mov	x0, x19
102e2378c:     	mov	x5, x25
102e23790:     	mov	x6, x24
102e23794:     	mov	x7, x26
102e23798:     	bl	0x102e1dad0
102e2379c:     	mov	x22, x0
102e237a0:     	add	x0, x27, #0x8
102e237a4:     	bl	0x10001022c
102e237a8:     	add	x0, x23, #0x8
102e237ac:     	bl	0x10001022c
102e237b0:     	add	x0, x21, #0x8
102e237b4:     	bl	0x10001022c
102e237b8:     	cbz	w22, 0x102e237cc
102e237bc:     	add	x8, x19, #0x248
102e237c0:     	add	x9, sp, #0x248
102e237c4:     	ldr	q0, [x9]
102e237c8:     	str	q0, [x8]
102e237cc:     	add	x8, sp, #0xc0
102e237d0:     	add	x0, x8, #0x8
102e237d4:     	bl	0x10001022c
102e237d8:     	adrp	x0, 0x104d64000
102e237dc:     	add	x0, x0, #0x5c8
102e237e0:     	bl	0x10214de74
102e237e4:     	cmp	w20, w0
102e237e8:     	b.ne	0x102e23a68
102e237ec:     	ldr	w8, [x19, #0x134]
102e237f0:     	cmp	w8, #0x2
102e237f4:     	b.ne	0x102e23a68
102e237f8:     	mov	x0, x19
102e237fc:     	bl	0x102e28290
102e23800:     	b	0x102e23a68
102e23804:     	adrp	x0, 0x104d64000
102e23808:     	add	x0, x0, #0x428
102e2380c:     	bl	0x10214de74
102e23810:     	cmp	w20, w0
102e23814:     	b.ne	0x102e238e0
102e23818:     	mov	w8, #0x108              ; =264
102e2381c:     	b	0x102e238f8
102e23820:     	adrp	x0, 0x104d64000
102e23824:     	add	x0, x0, #0x468
102e23828:     	bl	0x10214de74
102e2382c:     	cmp	w20, w0
102e23830:     	b.eq	0x102e2385c
102e23834:     	adrp	x0, 0x104d64000
102e23838:     	add	x0, x0, #0x488
102e2383c:     	bl	0x10214de74
102e23840:     	cmp	w20, w0
102e23844:     	b.eq	0x102e2385c
102e23848:     	adrp	x0, 0x104d64000
102e2384c:     	add	x0, x0, #0x4a8
102e23850:     	bl	0x10214de74
102e23854:     	cmp	w20, w0
102e23858:     	b.ne	0x102e23938
102e2385c:     	ldr	w8, [x19, #0x200]
102e23860:     	cbz	w8, 0x102e2386c
102e23864:     	ldr	w8, [x19, #0x204]
102e23868:     	cbz	w8, 0x102e2310c
102e2386c:     	tbnz	w24, #0xe, 0x102e23a64
102e23870:     	str	xzr, [sp, #0x208]
102e23874:     	add	x0, sp, #0x350
102e23878:     	add	x1, sp, #0x208
102e2387c:     	bl	0x1020d8288
102e23880:     	add	x0, sp, #0x350
102e23884:     	add	x1, sp, #0xc0
102e23888:     	bl	0x1020d80e8
102e2388c:     	ldp	x9, x8, [x21]
102e23890:     	stp	x9, x8, [sp, #0x50]
102e23894:     	cbz	x8, 0x102e238a4
102e23898:     	add	x8, x8, #0x8
102e2389c:     	mov	w9, #0x1                ; =1
102e238a0:     	ldadd	w9, w8, [x8]
102e238a4:     	add	x21, sp, #0x50
102e238a8:     	add	x0, sp, #0x50
102e238ac:     	add	x1, sp, #0xc0
102e238b0:     	bl	0x1029915fc
102e238b4:     	fmov	d8, d0
102e238b8:     	fmov	d9, d1
102e238bc:     	add	x0, x21, #0x8
102e238c0:     	bl	0x10001022c
102e238c4:     	adrp	x0, 0x104d64000
102e238c8:     	add	x0, x0, #0x468
102e238cc:     	bl	0x10214de74
102e238d0:     	cmp	w20, w0
102e238d4:     	b.ne	0x102e2391c
102e238d8:     	mov	w8, #0x118              ; =280
102e238dc:     	b	0x102e239dc
102e238e0:     	adrp	x0, 0x104d64000
102e238e4:     	add	x0, x0, #0x448
102e238e8:     	bl	0x10214de74
102e238ec:     	cmp	w20, w0
102e238f0:     	b.ne	0x102e23a64
102e238f4:     	mov	w8, #0x110              ; =272
102e238f8:     	ldr	d2, [sp, #0x208]
102e238fc:     	ldr	x9, [x28]
102e23900:     	ldr	x8, [x9, x8]
102e23904:     	add	x1, sp, #0x270
102e23908:     	mov	x0, x28
102e2390c:     	fmov	d0, d8
102e23910:     	fmov	d1, d9
102e23914:     	blr	x8
102e23918:     	b	0x102e23580
102e2391c:     	adrp	x0, 0x104d64000
102e23920:     	add	x0, x0, #0x488
102e23924:     	bl	0x10214de74
102e23928:     	cmp	w20, w0
102e2392c:     	b.ne	0x102e239c4
102e23930:     	mov	w8, #0x120              ; =288
102e23934:     	b	0x102e239dc
102e23938:     	adrp	x0, 0x104d64000
102e2393c:     	add	x0, x0, #0x4e8
102e23940:     	bl	0x10214de74
102e23944:     	cmp	w20, w0
102e23948:     	b.ne	0x102e23a00
102e2394c:     	ldr	w8, [x19, #0xa8]
102e23950:     	cmp	w8, #0x1
102e23954:     	b.ne	0x102e23a64
102e23958:     	str	wzr, [sp, #0x208]
102e2395c:     	ldr	x0, [sp, #0x38]
102e23960:     	ldr	x8, [x0]
102e23964:     	ldr	x8, [x8, #0x130]
102e23968:     	add	x1, sp, #0x270
102e2396c:     	add	x2, sp, #0x208
102e23970:     	blr	x8
102e23974:     	mov	x22, x0
102e23978:     	ldr	w8, [sp, #0x208]
102e2397c:     	cbz	w8, 0x102e23a68
102e23980:     	ldr	x0, [x21]
102e23984:     	bl	0x1021c39cc
102e23988:     	add	x8, x19, #0x4b8
102e2398c:     	add	x9, sp, #0xc0
102e23990:     	ldr	q0, [x8]
102e23994:     	movi.2d	v1, #0000000000000000
102e23998:     	str	q1, [x8]
102e2399c:     	str	q0, [sp, #0xc0]
102e239a0:     	orr	x0, x9, #0x8
102e239a4:     	bl	0x100015a60
102e239a8:     	str	wzr, [x19, #0xa8]
102e239ac:     	adrp	x8, 0x104cd4000
102e239b0:     	str	wzr, [x8, #0x390]
102e239b4:     	add	x1, sp, #0x270
102e239b8:     	mov	x0, x19
102e239bc:     	bl	0x102e21cfc
102e239c0:     	b	0x102e23a68
102e239c4:     	adrp	x0, 0x104d64000
102e239c8:     	add	x0, x0, #0x4a8
102e239cc:     	bl	0x10214de74
102e239d0:     	cmp	w20, w0
102e239d4:     	b.ne	0x102e23a64
102e239d8:     	mov	w8, #0x128              ; =296
102e239dc:     	ldr	d2, [sp, #0x208]
102e239e0:     	ldr	x0, [sp, #0x38]
102e239e4:     	ldr	x9, [x0]
102e239e8:     	ldr	x8, [x9, x8]
102e239ec:     	add	x1, sp, #0x270
102e239f0:     	fmov	d0, d8
102e239f4:     	fmov	d1, d9
102e239f8:     	blr	x8
102e239fc:     	b	0x102e23580
102e23a00:     	adrp	x0, 0x104d64000
102e23a04:     	add	x0, x0, #0x388
102e23a08:     	bl	0x10214de74
102e23a0c:     	cmp	w20, w0
102e23a10:     	b.ne	0x102e23a64
102e23a14:     	bl	0x102194e64
102e23a18:     	cmp	w0, #0x4
102e23a1c:     	b.ne	0x102e23a64
102e23a20:     	ldr	x0, [x19, #0x350]
102e23a24:     	cbz	x0, 0x102e23a64
102e23a28:     	bl	0x1029ff614
102e23a2c:     	cbz	w0, 0x102e23a64
102e23a30:     	ldr	x0, [x19, #0x350]
102e23a34:     	ldp	x9, x8, [x21]
102e23a38:     	stp	x9, x8, [sp, #0x40]
102e23a3c:     	cbz	x8, 0x102e23a4c
102e23a40:     	add	x8, x8, #0x8
102e23a44:     	mov	w9, #0x1                ; =1
102e23a48:     	ldadd	w9, w8, [x8]
102e23a4c:     	add	x20, sp, #0x40
102e23a50:     	add	x1, sp, #0x40
102e23a54:     	mov	w2, #0x0                ; =0
102e23a58:     	bl	0x1029fbabc
102e23a5c:     	add	x0, x20, #0x8
102e23a60:     	bl	0x10001022c
102e23a64:     	mov	w22, #0x0               ; =0
102e23a68:     	add	x19, sp, #0x270
102e23a6c:     	add	x20, sp, #0x270
102e23a70:     	add	x21, sp, #0x270
102e23a74:     	add	x0, x21, #0x58
102e23a78:     	bl	0x10001022c
102e23a7c:     	add	x0, x21, #0x48
102e23a80:     	bl	0x10001022c
102e23a84:     	add	x0, x20, #0x38
102e23a88:     	bl	0x10001022c
102e23a8c:     	add	x0, x20, #0x28
102e23a90:     	bl	0x10001022c
102e23a94:     	add	x0, x19, #0x18
102e23a98:     	bl	0x10001022c
102e23a9c:     	orr	x0, x19, #0x8
102e23aa0:     	bl	0x10001022c
102e23aa4:     	add	x0, sp, #0x350
102e23aa8:     	bl	0x1020d7dc8
102e23aac:     	b	0x102e22b28
102e23ab0:     	mov	x19, x0
102e23ab4:     	add	x0, x20, #0x8
102e23ab8:     	b	0x102e23bd0
102e23abc:     	b	0x102e23bfc
102e23ac0:     	b	0x102e23bfc
102e23ac4:     	b	0x102e23ad4
102e23ac8:     	b	0x102e23bfc
102e23acc:     	b	0x102e23bfc
102e23ad0:     	b	0x102e23bfc
102e23ad4:     	mov	x19, x0
102e23ad8:     	add	x0, x21, #0x8
102e23adc:     	b	0x102e23bd0
102e23ae0:     	b	0x102e23bfc
102e23ae4:     	b	0x102e23bfc
102e23ae8:     	b	0x102e23bfc
102e23aec:     	mov	x19, x0
102e23af0:     	add	x0, x27, #0x8
102e23af4:     	bl	0x10001022c
102e23af8:     	add	x0, x23, #0x8
102e23afc:     	bl	0x10001022c
102e23b00:     	add	x0, x21, #0x8
102e23b04:     	b	0x102e23b10
102e23b08:     	mov	x19, x0
102e23b0c:     	add	x0, x27, #0x8
102e23b10:     	bl	0x10001022c
102e23b14:     	b	0x102e23b3c
102e23b18:     	b	0x102e23bfc
102e23b1c:     	b	0x102e23bfc
102e23b20:     	mov	x19, x0
102e23b24:     	add	x0, x28, #0x8
102e23b28:     	bl	0x10001022c
102e23b2c:     	add	x0, x27, #0x8
102e23b30:     	b	0x102e23bd0
102e23b34:     	b	0x102e23bfc
102e23b38:     	mov	x19, x0
102e23b3c:     	add	x8, sp, #0xc0
102e23b40:     	b	0x102e23bbc
102e23b44:     	b	0x102e23bb4
102e23b48:     	b	0x102e23bb4
102e23b4c:     	mov	x19, x0
102e23b50:     	add	x0, sp, #0xc0
102e23b54:     	bl	0x1020d7dc8
102e23b58:     	b	0x102e23bb8
102e23b5c:     	b	0x102e23bfc
102e23b60:     	mov	x19, x0
102e23b64:     	add	x0, x21, #0x8
102e23b68:     	bl	0x10001022c
102e23b6c:     	add	x0, x23, #0x8
102e23b70:     	bl	0x10001022c
102e23b74:     	b	0x102e23b80
102e23b78:     	b	0x102e23bb4
102e23b7c:     	mov	x19, x0
102e23b80:     	add	x0, x26, #0x8
102e23b84:     	bl	0x10001022c
102e23b88:     	b	0x102e23bb8
102e23b8c:     	b	0x102e23bfc
102e23b90:     	b	0x102e23bfc
102e23b94:     	b	0x102e23bb4
102e23b98:     	b	0x102e23bfc
102e23b9c:     	mov	x19, x0
102e23ba0:     	add	x0, x26, #0x8
102e23ba4:     	bl	0x10001022c
102e23ba8:     	add	x0, x28, #0x8
102e23bac:     	b	0x102e23bd0
102e23bb0:     	b	0x102e23bfc
102e23bb4:     	mov	x19, x0
102e23bb8:     	add	x8, sp, #0x208
102e23bbc:     	add	x0, x8, #0x8
102e23bc0:     	b	0x102e23bd0
102e23bc4:     	b	0x102e23bc8
102e23bc8:     	mov	x19, x0
102e23bcc:     	add	x0, x26, #0x8
102e23bd0:     	bl	0x10001022c
102e23bd4:     	b	0x102e23c00
102e23bd8:     	b	0x102e23bfc
102e23bdc:     	b	0x102e23bfc
102e23be0:     	b	0x102e23bfc
102e23be4:     	b	0x102e23c0c
102e23be8:     	b	0x102e23bfc
102e23bec:     	b	0x102e23bfc
102e23bf0:     	b	0x102e23bfc
102e23bf4:     	b	0x102e23c1c
102e23bf8:     	b	0x102e23bfc
102e23bfc:     	mov	x19, x0
102e23c00:     	add	x0, sp, #0x270
102e23c04:     	bl	0x1005ee6bc
102e23c08:     	b	0x102e23c10
102e23c0c:     	mov	x19, x0
102e23c10:     	add	x0, sp, #0x350
102e23c14:     	bl	0x1020d7dc8
102e23c18:     	b	0x102e23c28
102e23c1c:     	mov	x19, x0
102e23c20:     	add	x0, x26, #0x8
102e23c24:     	bl	0x10001022c
102e23c28:     	mov	x0, x19
102e23c2c:     	bl	0x103bda970

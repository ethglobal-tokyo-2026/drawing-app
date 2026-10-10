
FUNCTION 0x102e18d58 size 568
102e18d58:     	sub	sp, sp, #0x80
102e18d5c:     	stp	x22, x21, [sp, #0x50]
102e18d60:     	stp	x20, x19, [sp, #0x60]
102e18d64:     	stp	x29, x30, [sp, #0x70]
102e18d68:     	add	x29, sp, #0x70
102e18d6c:     	mov	x20, x0
102e18d70:     	str	wzr, [x0, #0x234]
102e18d74:     	ldr	x0, [x0, #0x48]
102e18d78:     	bl	0x102e4c884
102e18d7c:     	adrp	x8, 0x104cd4000
102e18d80:     	str	w0, [x8, #0x388]
102e18d84:     	ldr	x8, [x20, #0x20]
102e18d88:     	stp	xzr, x8, [x29, #-0x30]
102e18d8c:     	cbz	x8, 0x102e18dc4
102e18d90:     	ldr	w9, [x8, #0x8]
102e18d94:     	cbz	w9, 0x102e18dc0
102e18d98:     	add	w10, w9, #0x1
102e18d9c:     	add	x11, x8, #0x8
102e18da0:     	mov	x12, x9
102e18da4:     	cas	w12, w10, [x11]
102e18da8:     	cmp	w12, w9
102e18dac:     	mov	x9, x12
102e18db0:     	b.ne	0x102e18d94
102e18db4:     	ldr	x8, [x20, #0x18]
102e18db8:     	stur	x8, [x29, #-0x30]
102e18dbc:     	b	0x102e18dc4
102e18dc0:     	stur	xzr, [x29, #-0x28]
102e18dc4:     	sub	x21, x29, #0x30
102e18dc8:     	bl	0x102194e64
102e18dcc:     	mov	x19, x0
102e18dd0:     	stur	wzr, [x29, #-0x34]
102e18dd4:     	str	wzr, [sp, #0x38]
102e18dd8:     	str	xzr, [sp, #0x30]
102e18ddc:     	str	wzr, [sp, #0x2c]
102e18de0:     	ldr	w8, [x20, #0x370]
102e18de4:     	cbz	w8, 0x102e18df0
102e18de8:     	mov	w0, #0x1                ; =1
102e18dec:     	b	0x102e18e5c
102e18df0:     	ldr	x0, [x20, #0x78]
102e18df4:     	ldr	x8, [x0]
102e18df8:     	ldr	x8, [x8, #0x248]
102e18dfc:     	blr	x8
102e18e00:     	cbz	w0, 0x102e18de8
102e18e04:     	ldp	x9, x8, [x29, #-0x30]
102e18e08:     	stp	x9, x8, [sp, #0x18]
102e18e0c:     	cbz	x8, 0x102e18e1c
102e18e10:     	add	x8, x8, #0x8
102e18e14:     	mov	w9, #0x1                ; =1
102e18e18:     	ldadd	w9, w8, [x8]
102e18e1c:     	add	x20, sp, #0x18
102e18e20:     	stp	xzr, xzr, [sp, #0x8]
102e18e24:     	add	x22, sp, #0x8
102e18e28:     	add	x0, sp, #0x18
102e18e2c:     	add	x1, sp, #0x8
102e18e30:     	sub	x2, x29, #0x34
102e18e34:     	add	x3, sp, #0x34
102e18e38:     	add	x4, sp, #0x30
102e18e3c:     	add	x5, sp, #0x38
102e18e40:     	add	x6, sp, #0x2c
102e18e44:     	bl	0x102ad8018
102e18e48:     	add	x0, x22, #0x8
102e18e4c:     	bl	0x10001022c
102e18e50:     	add	x0, x20, #0x8
102e18e54:     	bl	0x10001022c
102e18e58:     	mov	w0, #0x0                ; =0
102e18e5c:     	bl	0x1020be3e8
102e18e60:     	bl	0x1020bdaa4
102e18e64:     	cbz	x0, 0x102e18ec8
102e18e68:     	ldur	w1, [x29, #-0x34]
102e18e6c:     	ldr	w2, [sp, #0x38]
102e18e70:     	cmp	w19, #0x4
102e18e74:     	b.ne	0x102e18ec0
102e18e78:     	scvtf	d0, w1
102e18e7c:     	adrp	x8, 0x104520000
102e18e80:     	ldr	d1, [x8, #0xf48]
102e18e84:     	fmul	d0, d0, d1
102e18e88:     	fcmp	d0, #0.0
102e18e8c:     	adrp	x8, 0x1042e3000
102e18e90:     	ldr	d2, [x8, #0x678]
102e18e94:     	adrp	x8, 0x1042e3000
102e18e98:     	ldr	d3, [x8, #0x680]
102e18e9c:     	fcsel	d4, d3, d2, mi
102e18ea0:     	fadd	d0, d0, d4
102e18ea4:     	fcvtzs	w1, d0
102e18ea8:     	scvtf	d0, w2
102e18eac:     	fmul	d0, d0, d1
102e18eb0:     	fcmp	d0, #0.0
102e18eb4:     	fcsel	d1, d3, d2, mi
102e18eb8:     	fadd	d0, d0, d1
102e18ebc:     	fcvtzs	w2, d0
102e18ec0:     	ldp	w4, w3, [sp, #0x30]
102e18ec4:     	bl	0x1021366bc
102e18ec8:     	bl	0x1020d9264
102e18ecc:     	cbz	x0, 0x102e18f34
102e18ed0:     	ldur	w1, [x29, #-0x34]
102e18ed4:     	ldr	w2, [sp, #0x38]
102e18ed8:     	cmp	w19, #0x4
102e18edc:     	b.ne	0x102e18f28
102e18ee0:     	scvtf	d0, w1
102e18ee4:     	adrp	x8, 0x10433f000
102e18ee8:     	ldr	d1, [x8, #0xa0]
102e18eec:     	fmul	d0, d0, d1
102e18ef0:     	fcmp	d0, #0.0
102e18ef4:     	adrp	x8, 0x1042e3000
102e18ef8:     	ldr	d2, [x8, #0x678]
102e18efc:     	adrp	x8, 0x1042e3000
102e18f00:     	ldr	d3, [x8, #0x680]
102e18f04:     	fcsel	d4, d3, d2, mi
102e18f08:     	fadd	d0, d0, d4
102e18f0c:     	fcvtzs	w1, d0
102e18f10:     	scvtf	d0, w2
102e18f14:     	fmul	d0, d0, d1
102e18f18:     	fcmp	d0, #0.0
102e18f1c:     	fcsel	d1, d3, d2, mi
102e18f20:     	fadd	d0, d0, d1
102e18f24:     	fcvtzs	w2, d0
102e18f28:     	ldr	w3, [sp, #0x34]
102e18f2c:     	mov	w4, #0x0                ; =0
102e18f30:     	bl	0x1021366bc
102e18f34:     	add	x0, x21, #0x8
102e18f38:     	bl	0x10001022c
102e18f3c:     	ldp	x29, x30, [sp, #0x70]
102e18f40:     	ldp	x20, x19, [sp, #0x60]
102e18f44:     	ldp	x22, x21, [sp, #0x50]
102e18f48:     	add	sp, sp, #0x80
102e18f4c:     	ret
102e18f50:     	mov	x19, x0
102e18f54:     	add	x0, x22, #0x8
102e18f58:     	bl	0x10001022c
102e18f5c:     	add	x0, x20, #0x8
102e18f60:     	bl	0x10001022c
102e18f64:     	b	0x102e18f80
102e18f68:     	b	0x102e18f7c
102e18f6c:     	b	0x102e18f7c
102e18f70:     	b	0x102e18f7c
102e18f74:     	b	0x102e18f7c
102e18f78:     	b	0x102e18f7c
102e18f7c:     	mov	x19, x0
102e18f80:     	add	x0, x21, #0x8
102e18f84:     	bl	0x10001022c
102e18f88:     	mov	x0, x19
102e18f8c:     	bl	0x103bda970

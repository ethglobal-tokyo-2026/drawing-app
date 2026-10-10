
FUNCTION 0x1021f0b90 size 2132
1021f0b90:     	stp	x28, x27, [sp, #-0x60]!
1021f0b94:     	stp	x26, x25, [sp, #0x10]
1021f0b98:     	stp	x24, x23, [sp, #0x20]
1021f0b9c:     	stp	x22, x21, [sp, #0x30]
1021f0ba0:     	stp	x20, x19, [sp, #0x40]
1021f0ba4:     	stp	x29, x30, [sp, #0x50]
1021f0ba8:     	add	x29, sp, #0x50
1021f0bac:     	sub	sp, sp, #0x220
1021f0bb0:     	adrp	x8, 0x104c93000
1021f0bb4:     	ldr	x8, [x8, #0x5d8]
1021f0bb8:     	cbz	x8, 0x1021f12e4
1021f0bbc:     	mov	x20, x2
1021f0bc0:     	mov	x21, x1
1021f0bc4:     	mov	x22, x0
1021f0bc8:     	cmp	w0, #0x4
1021f0bcc:     	b.le	0x1021f0bf4
1021f0bd0:     	cmp	w22, #0x6
1021f0bd4:     	b.le	0x1021f0c30
1021f0bd8:     	cmp	w22, #0x7
1021f0bdc:     	b.eq	0x1021f0c24
1021f0be0:     	cmp	w22, #0x8
1021f0be4:     	b.eq	0x1021f0c4c
1021f0be8:     	cmp	w22, #0x9
1021f0bec:     	b.eq	0x1021f0c40
1021f0bf0:     	b	0x1021f12e4
1021f0bf4:     	cmp	w22, #0x2
1021f0bf8:     	b.gt	0x1021f0c14
1021f0bfc:     	cmp	w22, #0x1
1021f0c00:     	b.eq	0x1021f0c58
1021f0c04:     	cmp	w22, #0x2
1021f0c08:     	b.ne	0x1021f12e4
1021f0c0c:     	mov	w0, #0x1                ; =1
1021f0c10:     	b	0x1021f0cc8
1021f0c14:     	cmp	w22, #0x3
1021f0c18:     	b.eq	0x1021f0cc4
1021f0c1c:     	cmp	w22, #0x4
1021f0c20:     	b.ne	0x1021f12e4
1021f0c24:     	adrp	x0, 0x104d65000
1021f0c28:     	add	x0, x0, #0x250
1021f0c2c:     	b	0x1021f0c60
1021f0c30:     	cmp	w22, #0x5
1021f0c34:     	b.eq	0x1021f0c4c
1021f0c38:     	cmp	w22, #0x6
1021f0c3c:     	b.ne	0x1021f12e4
1021f0c40:     	adrp	x0, 0x104d65000
1021f0c44:     	add	x0, x0, #0x290
1021f0c48:     	b	0x1021f0c60
1021f0c4c:     	adrp	x0, 0x104d65000
1021f0c50:     	add	x0, x0, #0x270
1021f0c54:     	b	0x1021f0c60
1021f0c58:     	adrp	x0, 0x104d65000
1021f0c5c:     	add	x0, x0, #0x1f0
1021f0c60:     	bl	0x10214de74
1021f0c64:     	cbz	w0, 0x1021f12e4
1021f0c68:     	mov	x19, x0
1021f0c6c:     	bl	0x1020b5738
1021f0c70:     	cbnz	w0, 0x1021f12e4
1021f0c74:     	bl	0x1020c22e8
1021f0c78:     	cbnz	w0, 0x1021f12e4
1021f0c7c:     	bl	0x10207a668
1021f0c80:     	sub	x25, x29, #0x68
1021f0c84:     	sub	x8, x29, #0x68
1021f0c88:     	bl	0x1021e2638
1021f0c8c:     	ldp	x23, x8, [x29, #-0x68]
1021f0c90:     	stp	x23, x8, [x29, #-0x80]
1021f0c94:     	cbz	x8, 0x1021f0ce8
1021f0c98:     	add	x9, x8, #0x8
1021f0c9c:     	mov	w8, #0x1                ; =1
1021f0ca0:     	ldadd	w8, w9, [x9]
1021f0ca4:     	ldur	x9, [x29, #-0x78]
1021f0ca8:     	sub	x10, x29, #0x90
1021f0cac:     	add	x0, x10, #0x8
1021f0cb0:     	stp	x23, x9, [x29, #-0x90]
1021f0cb4:     	cbz	x9, 0x1021f0cf4
1021f0cb8:     	add	x9, x9, #0x8
1021f0cbc:     	ldadd	w8, w8, [x9]
1021f0cc0:     	b	0x1021f0cf4
1021f0cc4:     	mov	w0, #0x0                ; =0
1021f0cc8:     	add	sp, sp, #0x220
1021f0ccc:     	ldp	x29, x30, [sp, #0x50]
1021f0cd0:     	ldp	x20, x19, [sp, #0x40]
1021f0cd4:     	ldp	x22, x21, [sp, #0x30]
1021f0cd8:     	ldp	x24, x23, [sp, #0x20]
1021f0cdc:     	ldp	x26, x25, [sp, #0x10]
1021f0ce0:     	ldp	x28, x27, [sp], #0x60
1021f0ce4:     	b	0x1020be4c0
1021f0ce8:     	sub	x8, x29, #0x90
1021f0cec:     	add	x0, x8, #0x8
1021f0cf0:     	stp	x23, xzr, [x29, #-0x90]
1021f0cf4:     	sub	x26, x29, #0x80
1021f0cf8:     	bl	0x10001022c
1021f0cfc:     	cbnz	x23, 0x1021f0d38
1021f0d00:     	add	x23, sp, #0x20
1021f0d04:     	add	x8, sp, #0x20
1021f0d08:     	add	x0, x21, #0x4
1021f0d0c:     	bl	0x1021e9150
1021f0d10:     	add	x8, sp, #0x60
1021f0d14:     	ldr	q0, [sp, #0x20]
1021f0d18:     	stp	xzr, xzr, [sp, #0x20]
1021f0d1c:     	ldur	q1, [x29, #-0x80]
1021f0d20:     	stur	q0, [x29, #-0x80]
1021f0d24:     	str	q1, [sp, #0x60]
1021f0d28:     	orr	x0, x8, #0x8
1021f0d2c:     	bl	0x10001022c
1021f0d30:     	orr	x0, x23, #0x8
1021f0d34:     	bl	0x10001022c
1021f0d38:     	sub	x8, x29, #0xa0
1021f0d3c:     	ldp	x23, x9, [x29, #-0x80]
1021f0d40:     	stp	x23, x9, [x29, #-0xa0]
1021f0d44:     	cbz	x9, 0x1021f0d54
1021f0d48:     	add	x9, x9, #0x8
1021f0d4c:     	mov	w10, #0x1               ; =1
1021f0d50:     	ldadd	w10, w9, [x9]
1021f0d54:     	add	x0, x8, #0x8
1021f0d58:     	bl	0x10001022c
1021f0d5c:     	cbz	x23, 0x1021f12d4
1021f0d60:     	ldur	x8, [x29, #-0x80]
1021f0d64:     	ldr	x0, [x8, #0x20]
1021f0d68:     	bl	0x102079e94
1021f0d6c:     	cbz	w0, 0x1021f12d4
1021f0d70:     	ldur	x0, [x29, #-0x80]
1021f0d74:     	bl	0x1021e52f8
1021f0d78:     	cbnz	w0, 0x1021f12d4
1021f0d7c:     	ldur	x9, [x29, #-0x80]
1021f0d80:     	ldr	x8, [x9, #0x260]
1021f0d84:     	ldr	x9, [x9, #0x268]
1021f0d88:     	stp	x8, x9, [x29, #-0xb0]
1021f0d8c:     	cbz	x9, 0x1021f0dbc
1021f0d90:     	add	x10, x9, #0x8
1021f0d94:     	mov	w9, #0x1                ; =1
1021f0d98:     	ldadd	w9, w10, [x10]
1021f0d9c:     	ldur	x10, [x29, #-0xa8]
1021f0da0:     	sub	x11, x29, #0xc0
1021f0da4:     	add	x23, x11, #0x8
1021f0da8:     	stp	x8, x10, [x29, #-0xc0]
1021f0dac:     	cbz	x10, 0x1021f0dc8
1021f0db0:     	add	x8, x10, #0x8
1021f0db4:     	ldadd	w9, w8, [x8]
1021f0db8:     	b	0x1021f0dc8
1021f0dbc:     	sub	x9, x29, #0xc0
1021f0dc0:     	add	x23, x9, #0x8
1021f0dc4:     	stp	x8, xzr, [x29, #-0xc0]
1021f0dc8:     	sub	x27, x29, #0xb0
1021f0dcc:     	sub	x0, x29, #0xc0
1021f0dd0:     	bl	0x1021bb57c
1021f0dd4:     	mov	x24, x0
1021f0dd8:     	mov	x0, x23
1021f0ddc:     	bl	0x10001022c
1021f0de0:     	cbz	w24, 0x1021f12cc
1021f0de4:     	ldp	x9, x8, [x29, #-0xb0]
1021f0de8:     	stp	x9, x8, [x29, #-0xd0]
1021f0dec:     	cbz	x8, 0x1021f0dfc
1021f0df0:     	add	x8, x8, #0x8
1021f0df4:     	mov	w9, #0x1                ; =1
1021f0df8:     	ldadd	w9, w8, [x8]
1021f0dfc:     	sub	x24, x29, #0xd0
1021f0e00:     	sub	x0, x29, #0xd0
1021f0e04:     	bl	0x1020be73c
1021f0e08:     	mov	x23, x0
1021f0e0c:     	add	x0, x24, #0x8
1021f0e10:     	bl	0x10001022c
1021f0e14:     	cbz	w23, 0x1021f0f6c
1021f0e18:     	ldur	x0, [x29, #-0xb0]
1021f0e1c:     	ldr	x8, [x0]
1021f0e20:     	ldr	x8, [x8, #0xd8]
1021f0e24:     	add	x1, sp, #0x158
1021f0e28:     	add	x2, x21, #0x4
1021f0e2c:     	blr	x8
1021f0e30:     	ldr	q0, [x21, #0x10]
1021f0e34:     	stur	q0, [x29, #-0xf0]
1021f0e38:     	ldr	d0, [sp, #0x158]
1021f0e3c:     	ldur	d1, [x21, #0x4]
1021f0e40:     	sub.2s	v0, v0, v1
1021f0e44:     	sshll.2d	v0, v0, #0x0
1021f0e48:     	scvtf.2d	v0, v0
1021f0e4c:     	ldur	q1, [x29, #-0xf0]
1021f0e50:     	fadd.2d	v0, v1, v0
1021f0e54:     	stur	q0, [x29, #-0xf0]
1021f0e58:     	cmp	w22, #0x8
1021f0e5c:     	b.hi	0x1021f106c
1021f0e60:     	mov	w8, #0x1                ; =1
1021f0e64:     	lsl	w8, w8, w22
1021f0e68:     	mov	w9, #0x1b0              ; =432
1021f0e6c:     	tst	w8, w9
1021f0e70:     	b.eq	0x1021f106c
1021f0e74:     	adrp	x0, 0x104d66000
1021f0e78:     	add	x0, x0, #0x1e8
1021f0e7c:     	bl	0x10214de74
1021f0e80:     	mov	x1, x0
1021f0e84:     	add	x0, sp, #0x60
1021f0e88:     	bl	0x1020cc240
1021f0e8c:     	ldp	x9, x8, [x29, #-0x80]
1021f0e90:     	stp	x9, x8, [sp, #0x148]
1021f0e94:     	cbz	x8, 0x1021f0ea4
1021f0e98:     	add	x8, x8, #0x8
1021f0e9c:     	mov	w9, #0x1                ; =1
1021f0ea0:     	ldadd	w9, w8, [x8]
1021f0ea4:     	add	x22, sp, #0x148
1021f0ea8:     	add	x0, sp, #0x60
1021f0eac:     	add	x1, sp, #0x148
1021f0eb0:     	bl	0x1021fdf8c
1021f0eb4:     	add	x0, x22, #0x8
1021f0eb8:     	bl	0x10001022c
1021f0ebc:     	add	x0, sp, #0x60
1021f0ec0:     	bl	0x1021fde94
1021f0ec4:     	bl	0x102167034
1021f0ec8:     	cbz	w0, 0x1021f1064
1021f0ecc:     	bl	0x102194e64
1021f0ed0:     	cmp	w0, #0x3
1021f0ed4:     	b.eq	0x1021f0ee4
1021f0ed8:     	bl	0x102194e64
1021f0edc:     	cmp	w0, #0x4
1021f0ee0:     	b.ne	0x1021f0eec
1021f0ee4:     	bl	0x1020be3f4
1021f0ee8:     	cbnz	w0, 0x1021f0f60
1021f0eec:     	ldp	x9, x8, [x29, #-0x80]
1021f0ef0:     	stp	x9, x8, [sp, #0x138]
1021f0ef4:     	cbz	x8, 0x1021f0f04
1021f0ef8:     	add	x8, x8, #0x8
1021f0efc:     	mov	w9, #0x1                ; =1
1021f0f00:     	ldadd	w9, w8, [x8]
1021f0f04:     	ldp	d0, d1, [x29, #-0xf0]
1021f0f08:     	fcmp	d0, #0.0
1021f0f0c:     	adrp	x8, 0x1042e3000
1021f0f10:     	ldr	d2, [x8, #0x690]
1021f0f14:     	adrp	x8, 0x1042fe000
1021f0f18:     	ldr	d3, [x8, #0xd20]
1021f0f1c:     	fcsel	d4, d3, d2, mi
1021f0f20:     	fadd	d0, d0, d4
1021f0f24:     	add	x23, sp, #0x138
1021f0f28:     	fcvtzs	w8, d0
1021f0f2c:     	fcmp	d1, #0.0
1021f0f30:     	fcsel	d0, d3, d2, mi
1021f0f34:     	fadd	d0, d1, d0
1021f0f38:     	fcvtzs	w9, d0
1021f0f3c:     	orr	x8, x8, x9, lsl #32
1021f0f40:     	str	x8, [sp, #0x20]
1021f0f44:     	add	x0, sp, #0x138
1021f0f48:     	add	x1, sp, #0x20
1021f0f4c:     	bl	0x10216775c
1021f0f50:     	mov	x22, x0
1021f0f54:     	add	x0, x23, #0x8
1021f0f58:     	bl	0x10001022c
1021f0f5c:     	cbz	w22, 0x1021f1064
1021f0f60:     	add	x0, sp, #0x60
1021f0f64:     	bl	0x1020cc308
1021f0f68:     	b	0x1021f12cc
1021f0f6c:     	ldur	x0, [x29, #-0xb0]
1021f0f70:     	ldr	x8, [x0]
1021f0f74:     	ldr	x9, [x8, #0x20]
1021f0f78:     	add	x24, sp, #0x20
1021f0f7c:     	add	x8, sp, #0x20
1021f0f80:     	blr	x9
1021f0f84:     	ldp	x9, x8, [sp, #0x20]
1021f0f88:     	stp	x9, x8, [x29, #-0xe0]
1021f0f8c:     	cbz	x8, 0x1021f0f9c
1021f0f90:     	add	x8, x8, #0x8
1021f0f94:     	mov	w9, #0x1                ; =1
1021f0f98:     	ldadd	w9, w8, [x8]
1021f0f9c:     	sub	x28, x29, #0xe0
1021f0fa0:     	sub	x0, x29, #0xe0
1021f0fa4:     	bl	0x1021bb57c
1021f0fa8:     	mov	x23, x0
1021f0fac:     	add	x0, x28, #0x8
1021f0fb0:     	bl	0x10001022c
1021f0fb4:     	cbnz	w23, 0x1021f0ff0
1021f0fb8:     	sub	x23, x29, #0xf0
1021f0fbc:     	sub	x8, x29, #0xf0
1021f0fc0:     	add	x0, x21, #0x4
1021f0fc4:     	bl	0x1021e91c0
1021f0fc8:     	add	x8, sp, #0x60
1021f0fcc:     	ldur	q0, [x29, #-0xf0]
1021f0fd0:     	stp	xzr, xzr, [x29, #-0xf0]
1021f0fd4:     	ldr	q1, [sp, #0x20]
1021f0fd8:     	str	q0, [sp, #0x20]
1021f0fdc:     	str	q1, [sp, #0x60]
1021f0fe0:     	orr	x0, x8, #0x8
1021f0fe4:     	bl	0x10001022c
1021f0fe8:     	orr	x0, x23, #0x8
1021f0fec:     	bl	0x10001022c
1021f0ff0:     	ldp	x9, x8, [sp, #0x20]
1021f0ff4:     	stp	x9, x8, [x29, #-0x100]
1021f0ff8:     	cbz	x8, 0x1021f1008
1021f0ffc:     	add	x8, x8, #0x8
1021f1000:     	mov	w9, #0x1                ; =1
1021f1004:     	ldadd	w9, w8, [x8]
1021f1008:     	sub	x28, x29, #0x100
1021f100c:     	sub	x0, x29, #0x100
1021f1010:     	bl	0x1021bb57c
1021f1014:     	mov	x23, x0
1021f1018:     	add	x0, x28, #0x8
1021f101c:     	bl	0x10001022c
1021f1020:     	cbz	w23, 0x1021f12c4
1021f1024:     	ldp	x9, x8, [sp, #0x20]
1021f1028:     	stp	x9, x8, [sp, #0x160]
1021f102c:     	cbz	x8, 0x1021f103c
1021f1030:     	add	x8, x8, #0x8
1021f1034:     	mov	w9, #0x1                ; =1
1021f1038:     	ldadd	w9, w8, [x8]
1021f103c:     	add	x28, sp, #0x160
1021f1040:     	add	x0, sp, #0x160
1021f1044:     	bl	0x1020be73c
1021f1048:     	mov	x23, x0
1021f104c:     	add	x0, x28, #0x8
1021f1050:     	bl	0x10001022c
1021f1054:     	orr	x0, x24, #0x8
1021f1058:     	bl	0x10001022c
1021f105c:     	cbnz	w23, 0x1021f0e18
1021f1060:     	b	0x1021f12cc
1021f1064:     	add	x0, sp, #0x60
1021f1068:     	bl	0x1020cc308
1021f106c:     	add	x0, sp, #0x60
1021f1070:     	mov	x1, x19
1021f1074:     	bl	0x1021281c8
1021f1078:     	add	x0, sp, #0x60
1021f107c:     	sub	x1, x29, #0xf0
1021f1080:     	bl	0x102128728
1021f1084:     	add	x0, sp, #0x60
1021f1088:     	sub	x1, x29, #0xf0
1021f108c:     	bl	0x102128754
1021f1090:     	ldr	d0, [x21, #0x20]
1021f1094:     	fcmp	d0, #0.0
1021f1098:     	cset	w1, gt
1021f109c:     	add	x0, sp, #0x60
1021f10a0:     	bl	0x102128780
1021f10a4:     	ldr	w1, [x21, #0x50]
1021f10a8:     	add	x0, sp, #0x60
1021f10ac:     	bl	0x102128800
1021f10b0:     	add	x0, sp, #0x60
1021f10b4:     	mov	w1, #0x0                ; =0
1021f10b8:     	bl	0x102128790
1021f10bc:     	add	x0, sp, #0x60
1021f10c0:     	movi	d0, #0000000000000000
1021f10c4:     	bl	0x1021287d0
1021f10c8:     	add	x0, sp, #0x60
1021f10cc:     	movi	d0, #0000000000000000
1021f10d0:     	bl	0x1021287e0
1021f10d4:     	add	x0, sp, #0x60
1021f10d8:     	movi	d0, #0000000000000000
1021f10dc:     	bl	0x1021287f0
1021f10e0:     	ldr	d0, [x21, #0x20]
1021f10e4:     	add	x0, sp, #0x60
1021f10e8:     	bl	0x102128820
1021f10ec:     	ldr	x1, [x21, #0x48]
1021f10f0:     	add	x0, sp, #0x60
1021f10f4:     	bl	0x102128830
1021f10f8:     	ldr	w1, [x21, #0x28]
1021f10fc:     	add	x0, sp, #0x60
1021f1100:     	bl	0x102128840
1021f1104:     	ldr	w1, [x21, #0x2c]
1021f1108:     	add	x0, sp, #0x60
1021f110c:     	bl	0x102128850
1021f1110:     	ldr	w1, [x21, #0x30]
1021f1114:     	add	x0, sp, #0x60
1021f1118:     	bl	0x102128860
1021f111c:     	ldr	w1, [x21, #0x34]
1021f1120:     	add	x0, sp, #0x60
1021f1124:     	bl	0x102128870
1021f1128:     	ldr	w1, [x21, #0x38]
1021f112c:     	add	x0, sp, #0x60
1021f1130:     	bl	0x102128880
1021f1134:     	ldr	w1, [x21, #0x3c]
1021f1138:     	add	x0, sp, #0x60
1021f113c:     	bl	0x1021288a0
1021f1140:     	ldr	w1, [x21, #0x40]
1021f1144:     	add	x0, sp, #0x60
1021f1148:     	bl	0x1021288b0
1021f114c:     	ldr	w1, [x21, #0x44]
1021f1150:     	add	x0, sp, #0x60
1021f1154:     	bl	0x1021288c0
1021f1158:     	ldr	w1, [x21, #0x54]
1021f115c:     	add	x0, sp, #0x60
1021f1160:     	bl	0x102128a98
1021f1164:     	ldr	w1, [x21, #0x58]
1021f1168:     	add	x0, sp, #0x60
1021f116c:     	bl	0x102128aa8
1021f1170:     	mov	x0, x20
1021f1174:     	bl	0x10213653c
1021f1178:     	stp	q1, q0, [sp]
1021f117c:     	fcvtzs	w8, d0
1021f1180:     	fcvtzs	w9, d1
1021f1184:     	orr	x8, x8, x9, lsl #32
1021f1188:     	str	x8, [sp, #0x58]
1021f118c:     	ldur	x0, [x29, #-0xb0]
1021f1190:     	ldr	x8, [x0]
1021f1194:     	ldr	x8, [x8, #0xd8]
1021f1198:     	add	x1, sp, #0x158
1021f119c:     	add	x2, sp, #0x58
1021f11a0:     	blr	x8
1021f11a4:     	ldr	d0, [sp, #0x158]
1021f11a8:     	ldr	d1, [sp, #0x58]
1021f11ac:     	sub.2s	v0, v0, v1
1021f11b0:     	sshll.2d	v0, v0, #0x0
1021f11b4:     	scvtf.2d	v0, v0
1021f11b8:     	ldp	q2, q1, [sp]
1021f11bc:     	mov.d	v1[1], v2[0]
1021f11c0:     	fadd.2d	v0, v1, v0
1021f11c4:     	stur	q0, [x29, #-0xf0]
1021f11c8:     	add	x0, sp, #0x60
1021f11cc:     	sub	x1, x29, #0xf0
1021f11d0:     	bl	0x1021288d0
1021f11d4:     	mov	x0, x20
1021f11d8:     	bl	0x102136544
1021f11dc:     	add	x0, sp, #0x60
1021f11e0:     	bl	0x1021288e8
1021f11e4:     	mov	x0, x20
1021f11e8:     	bl	0x102136554
1021f11ec:     	mov	x1, x0
1021f11f0:     	add	x0, sp, #0x60
1021f11f4:     	bl	0x102128890
1021f11f8:     	ldur	x0, [x29, #-0x80]
1021f11fc:     	bl	0x1021e2cc4
1021f1200:     	mov	x1, x0
1021f1204:     	add	x0, sp, #0x60
1021f1208:     	bl	0x1021288f8
1021f120c:     	ldur	x0, [x29, #-0x80]
1021f1210:     	bl	0x1021e2e1c
1021f1214:     	mov	x1, x0
1021f1218:     	add	x0, sp, #0x60
1021f121c:     	bl	0x102128908
1021f1220:     	ldur	x0, [x29, #-0x80]
1021f1224:     	bl	0x1021e2f20
1021f1228:     	mov	x1, x0
1021f122c:     	add	x0, sp, #0x60
1021f1230:     	bl	0x102128918
1021f1234:     	add	x0, sp, #0x20
1021f1238:     	bl	0x1020cc1d4
1021f123c:     	add	x0, sp, #0x60
1021f1240:     	add	x1, sp, #0x20
1021f1244:     	bl	0x102128d20
1021f1248:     	bl	0x1021b2994
1021f124c:     	cbz	w0, 0x1021f12a4
1021f1250:     	adrp	x0, 0x104d65000
1021f1254:     	add	x0, x0, #0x250
1021f1258:     	bl	0x10214de74
1021f125c:     	cmp	w19, w0
1021f1260:     	b.eq	0x1021f128c
1021f1264:     	adrp	x0, 0x104d65000
1021f1268:     	add	x0, x0, #0x270
1021f126c:     	bl	0x10214de74
1021f1270:     	cmp	w19, w0
1021f1274:     	b.eq	0x1021f128c
1021f1278:     	adrp	x0, 0x104d65000
1021f127c:     	add	x0, x0, #0x290
1021f1280:     	bl	0x10214de74
1021f1284:     	cmp	w19, w0
1021f1288:     	b.ne	0x1021f12b0
1021f128c:     	adrp	x0, 0x104c93000
1021f1290:     	add	x0, x0, #0x570
1021f1294:     	bl	0x10214de74
1021f1298:     	add	x1, sp, #0x20
1021f129c:     	bl	0x1021b2a34
1021f12a0:     	b	0x1021f12b0
1021f12a4:     	ldur	x0, [x29, #-0xb0]
1021f12a8:     	add	x1, sp, #0x20
1021f12ac:     	bl	0x1021bb9a4
1021f12b0:     	add	x0, sp, #0x20
1021f12b4:     	bl	0x1020cc308
1021f12b8:     	add	x0, sp, #0x60
1021f12bc:     	bl	0x1021285a4
1021f12c0:     	b	0x1021f12cc
1021f12c4:     	orr	x0, x24, #0x8
1021f12c8:     	bl	0x10001022c
1021f12cc:     	add	x0, x27, #0x8
1021f12d0:     	bl	0x10001022c
1021f12d4:     	orr	x0, x26, #0x8
1021f12d8:     	bl	0x10001022c
1021f12dc:     	add	x0, x25, #0x8
1021f12e0:     	bl	0x10001022c
1021f12e4:     	add	sp, sp, #0x220
1021f12e8:     	ldp	x29, x30, [sp, #0x50]
1021f12ec:     	ldp	x20, x19, [sp, #0x40]
1021f12f0:     	ldp	x22, x21, [sp, #0x30]
1021f12f4:     	ldp	x24, x23, [sp, #0x20]
1021f12f8:     	ldp	x26, x25, [sp, #0x10]
1021f12fc:     	ldp	x28, x27, [sp], #0x60
1021f1300:     	ret
1021f1304:     	mov	x19, x0
1021f1308:     	b	0x1021f132c
1021f130c:     	mov	x19, x0
1021f1310:     	add	x0, x23, #0x8
1021f1314:     	b	0x1021f134c
1021f1318:     	b	0x1021f1320
1021f131c:     	b	0x1021f1320
1021f1320:     	mov	x19, x0
1021f1324:     	add	x0, x28, #0x8
1021f1328:     	bl	0x10001022c
1021f132c:     	orr	x0, x24, #0x8
1021f1330:     	b	0x1021f1380
1021f1334:     	b	0x1021f1370
1021f1338:     	b	0x1021f13b0
1021f133c:     	b	0x1021f13b0
1021f1340:     	b	0x1021f1370
1021f1344:     	mov	x19, x0
1021f1348:     	add	x0, x22, #0x8
1021f134c:     	bl	0x10001022c
1021f1350:     	b	0x1021f138c
1021f1354:     	b	0x1021f1370
1021f1358:     	b	0x1021f13b0
1021f135c:     	b	0x1021f13b0
1021f1360:     	b	0x1021f13b0
1021f1364:     	mov	x19, x0
1021f1368:     	add	x0, x24, #0x8
1021f136c:     	b	0x1021f1380
1021f1370:     	mov	x19, x0
1021f1374:     	b	0x1021f13bc
1021f1378:     	mov	x19, x0
1021f137c:     	mov	x0, x23
1021f1380:     	bl	0x10001022c
1021f1384:     	b	0x1021f13bc
1021f1388:     	mov	x19, x0
1021f138c:     	add	x0, sp, #0x60
1021f1390:     	bl	0x1020cc308
1021f1394:     	b	0x1021f13bc
1021f1398:     	mov	x19, x0
1021f139c:     	add	x0, sp, #0x20
1021f13a0:     	bl	0x1020cc308
1021f13a4:     	b	0x1021f13b4
1021f13a8:     	b	0x1021f13b0
1021f13ac:     	b	0x1021f13c8
1021f13b0:     	mov	x19, x0
1021f13b4:     	add	x0, sp, #0x60
1021f13b8:     	bl	0x1021285a4
1021f13bc:     	add	x0, x27, #0x8
1021f13c0:     	bl	0x10001022c
1021f13c4:     	b	0x1021f13cc
1021f13c8:     	mov	x19, x0
1021f13cc:     	orr	x0, x26, #0x8
1021f13d0:     	bl	0x10001022c
1021f13d4:     	add	x0, x25, #0x8
1021f13d8:     	bl	0x10001022c
1021f13dc:     	mov	x0, x19
1021f13e0:     	bl	0x103bda970

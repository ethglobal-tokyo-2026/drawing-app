
FUNCTION 0x102789f24 size 552
102789f24:     	sub	sp, sp, #0xa0
102789f28:     	stp	x26, x25, [sp, #0x50]
102789f2c:     	stp	x24, x23, [sp, #0x60]
102789f30:     	stp	x22, x21, [sp, #0x70]
102789f34:     	stp	x20, x19, [sp, #0x80]
102789f38:     	stp	x29, x30, [sp, #0x90]
102789f3c:     	add	x29, sp, #0x90
102789f40:     	cbz	x1, 0x10278a10c
102789f44:     	mov	x22, x2
102789f48:     	mov	x24, x1
102789f4c:     	mov	x19, x0
102789f50:     	adrp	x1, 0x104a53000
102789f54:     	add	x1, x1, #0x618
102789f58:     	adrp	x2, 0x104a53000
102789f5c:     	add	x2, x2, #0xb98
102789f60:     	mov	x0, x24
102789f64:     	mov	x3, #0x0                ; =0
102789f68:     	bl	0x103bdd454
102789f6c:     	cbz	x0, 0x10278a10c
102789f70:     	mov	x20, x0
102789f74:     	ldr	x9, [x19, #0x18]
102789f78:     	add	x8, sp, #0x40
102789f7c:     	ldp	x23, x9, [x9, #0x50]
102789f80:     	stp	x23, x9, [sp, #0x40]
102789f84:     	cbz	x9, 0x102789fcc
102789f88:     	add	x10, x9, #0xc
102789f8c:     	mov	w11, #0x1               ; =1
102789f90:     	ldadd	w11, w10, [x10]
102789f94:     	add	x10, sp, #0x30
102789f98:     	add	x21, x10, #0x8
102789f9c:     	stp	xzr, x9, [sp, #0x30]
102789fa0:     	ldr	w10, [x9, #0x8]
102789fa4:     	cbz	w10, 0x102789fe0
102789fa8:     	add	w11, w10, #0x1
102789fac:     	add	x12, x9, #0x8
102789fb0:     	mov	x13, x10
102789fb4:     	cas	w13, w11, [x12]
102789fb8:     	cmp	w13, w10
102789fbc:     	mov	x10, x13
102789fc0:     	b.ne	0x102789fa4
102789fc4:     	str	x23, [sp, #0x30]
102789fc8:     	b	0x102789fe8
102789fcc:     	mov	x23, #0x0               ; =0
102789fd0:     	add	x9, sp, #0x30
102789fd4:     	add	x21, x9, #0x8
102789fd8:     	stp	xzr, xzr, [sp, #0x30]
102789fdc:     	b	0x102789fe8
102789fe0:     	mov	x23, #0x0               ; =0
102789fe4:     	str	xzr, [sp, #0x38]
102789fe8:     	add	x0, x8, #0x8
102789fec:     	bl	0x100015a60
102789ff0:     	ldr	x9, [x24, #0x18]
102789ff4:     	add	x8, sp, #0x40
102789ff8:     	ldp	x25, x9, [x9, #0x50]
102789ffc:     	stp	x25, x9, [sp, #0x40]
10278a000:     	cbz	x9, 0x10278a048
10278a004:     	add	x10, x9, #0xc
10278a008:     	mov	w11, #0x1               ; =1
10278a00c:     	ldadd	w11, w10, [x10]
10278a010:     	add	x10, sp, #0x20
10278a014:     	add	x24, x10, #0x8
10278a018:     	stp	xzr, x9, [sp, #0x20]
10278a01c:     	ldr	w10, [x9, #0x8]
10278a020:     	cbz	w10, 0x10278a05c
10278a024:     	add	w11, w10, #0x1
10278a028:     	add	x12, x9, #0x8
10278a02c:     	mov	x13, x10
10278a030:     	cas	w13, w11, [x12]
10278a034:     	cmp	w13, w10
10278a038:     	mov	x10, x13
10278a03c:     	b.ne	0x10278a020
10278a040:     	str	x25, [sp, #0x20]
10278a044:     	b	0x10278a064
10278a048:     	mov	x25, #0x0               ; =0
10278a04c:     	add	x9, sp, #0x20
10278a050:     	add	x24, x9, #0x8
10278a054:     	stp	xzr, xzr, [sp, #0x20]
10278a058:     	b	0x10278a064
10278a05c:     	mov	x25, #0x0               ; =0
10278a060:     	str	xzr, [sp, #0x28]
10278a064:     	add	x0, x8, #0x8
10278a068:     	bl	0x100015a60
10278a06c:     	cmp	x23, x25
10278a070:     	b.eq	0x10278a0e0
10278a074:     	cmp	w22, #0x0
10278a078:     	cset	w2, eq
10278a07c:     	ldp	x9, x8, [x20, #0x88]
10278a080:     	stp	x9, x8, [sp]
10278a084:     	cbz	x8, 0x10278a094
10278a088:     	add	x8, x8, #0x8
10278a08c:     	mov	w9, #0x1                ; =1
10278a090:     	ldadd	w9, w8, [x8]
10278a094:     	mov	x22, sp
10278a098:     	add	x25, sp, #0x10
10278a09c:     	add	x8, sp, #0x10
10278a0a0:     	mov	x1, sp
10278a0a4:     	mov	x0, x23
10278a0a8:     	bl	0x1024cc404
10278a0ac:     	add	x8, sp, #0x40
10278a0b0:     	ldr	q0, [sp, #0x10]
10278a0b4:     	stp	xzr, xzr, [sp, #0x10]
10278a0b8:     	ldur	q1, [x19, #0x88]
10278a0bc:     	stur	q0, [x19, #0x88]
10278a0c0:     	str	q1, [sp, #0x40]
10278a0c4:     	orr	x0, x8, #0x8
10278a0c8:     	bl	0x10001022c
10278a0cc:     	orr	x0, x25, #0x8
10278a0d0:     	bl	0x10001022c
10278a0d4:     	add	x0, x22, #0x8
10278a0d8:     	bl	0x10001022c
10278a0dc:     	b	0x10278a0ec
10278a0e0:     	add	x0, x19, #0x88
10278a0e4:     	add	x1, x20, #0x88
10278a0e8:     	bl	0x100023be4
10278a0ec:     	ldr	d0, [x20, #0x98]
10278a0f0:     	str	d0, [x19, #0x98]
10278a0f4:     	ldr	w8, [x20, #0xa0]
10278a0f8:     	str	w8, [x19, #0xa0]
10278a0fc:     	mov	x0, x24
10278a100:     	bl	0x10001022c
10278a104:     	mov	x0, x21
10278a108:     	bl	0x10001022c
10278a10c:     	ldp	x29, x30, [sp, #0x90]
10278a110:     	ldp	x20, x19, [sp, #0x80]
10278a114:     	ldp	x22, x21, [sp, #0x70]
10278a118:     	ldp	x24, x23, [sp, #0x60]
10278a11c:     	ldp	x26, x25, [sp, #0x50]
10278a120:     	add	sp, sp, #0xa0
10278a124:     	ret
10278a128:     	mov	x19, x0
10278a12c:     	add	x0, x22, #0x8
10278a130:     	bl	0x10001022c
10278a134:     	mov	x0, x24
10278a138:     	bl	0x10001022c
10278a13c:     	mov	x0, x21
10278a140:     	bl	0x10001022c
10278a144:     	mov	x0, x19
10278a148:     	bl	0x103bda970

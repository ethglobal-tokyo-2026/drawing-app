1028c6e40:     	add	x0, x22, #0x8
1028c6e44:     	b	0x1028ca8f4
1028c6e48:     	cmp	w8, #0x47f
1028c6e4c:     	b.eq	0x1028c78b0
1028c6e50:     	cmp	w8, #0x480
1028c6e54:     	b.ne	0x1028ca924
1028c6e58:     	adrp	x8, 0x104309000
1028c6e5c:     	ldr	d0, [x8, #0x160]
1028c6e60:     	stur	d0, [x19, #0x4]
1028c6e64:     	mov	w21, #0x7               ; =7
1028c6e68:     	movk	w21, #0x18, lsl #16
1028c6e6c:     	add	x22, sp, #0x310
1028c6e70:     	add	x8, sp, #0x310
1028c6e74:     	add	w1, w21, #0x7f
1028c6e78:     	mov	x0, x20
1028c6e7c:     	bl	0x102e10fb0
1028c6e80:     	add	x23, sp, #0x490
1028c6e84:     	ldr	q0, [sp, #0x310]
1028c6e88:     	str	xzr, [sp, #0x310]
1028c6e8c:     	str	xzr, [sp, #0x318]
1028c6e90:     	ldur	q1, [x19, #0x18]
1028c6e94:     	stur	q0, [x19, #0x18]
1028c6e98:     	str	q1, [sp, #0x490]
1028c6e9c:     	orr	x0, x23, #0x8
1028c6ea0:     	bl	0x10001022c
1028c6ea4:     	orr	x0, x22, #0x8
1028c6ea8:     	bl	0x10001022c
1028c6eac:     	add	x8, sp, #0x310
1028c6eb0:     	orr	w1, w21, #0x80
1028c6eb4:     	b	0x1028c8e64
1028c6eb8:     	cmp	w8, #0x4b2

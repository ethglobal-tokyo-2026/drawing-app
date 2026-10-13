1028c769c:     	adrp	x8, 0x104309000
1028c76a0:     	ldr	d0, [x8, #0x160]
1028c76a4:     	stur	d0, [x19, #0x4]
1028c76a8:     	mov	w21, #0x7               ; =7
1028c76ac:     	movk	w21, #0x18, lsl #16
1028c76b0:     	add	x22, sp, #0x310
1028c76b4:     	add	x8, sp, #0x310
1028c76b8:     	add	w1, w21, #0x83
1028c76bc:     	mov	x0, x20
1028c76c0:     	bl	0x102e10fb0
1028c76c4:     	add	x23, sp, #0x490
1028c76c8:     	ldr	q0, [sp, #0x310]
1028c76cc:     	str	xzr, [sp, #0x310]
1028c76d0:     	str	xzr, [sp, #0x318]
1028c76d4:     	ldur	q1, [x19, #0x18]
1028c76d8:     	stur	q0, [x19, #0x18]
1028c76dc:     	str	q1, [sp, #0x490]
1028c76e0:     	orr	x0, x23, #0x8
1028c76e4:     	bl	0x10001022c
1028c76e8:     	orr	x0, x22, #0x8
1028c76ec:     	bl	0x10001022c
1028c76f0:     	add	x8, sp, #0x310
1028c76f4:     	add	w1, w21, #0x84
1028c76f8:     	b	0x1028c8e64
1028c76fc:     	adrp	x8, 0x104552000

1028c7450:     	adrp	x8, 0x104309000
1028c7454:     	ldr	d0, [x8, #0x160]
1028c7458:     	stur	d0, [x19, #0x4]
1028c745c:     	mov	w21, #0x7               ; =7
1028c7460:     	movk	w21, #0x18, lsl #16
1028c7464:     	add	x22, sp, #0x310
1028c7468:     	add	x8, sp, #0x310
1028c746c:     	add	w1, w21, #0x81
1028c7470:     	mov	x0, x20
1028c7474:     	bl	0x102e10fb0
1028c7478:     	add	x23, sp, #0x490
1028c747c:     	ldr	q0, [sp, #0x310]
1028c7480:     	str	xzr, [sp, #0x310]
1028c7484:     	str	xzr, [sp, #0x318]
1028c7488:     	ldur	q1, [x19, #0x18]
1028c748c:     	stur	q0, [x19, #0x18]
1028c7490:     	str	q1, [sp, #0x490]
1028c7494:     	orr	x0, x23, #0x8
1028c7498:     	bl	0x10001022c
1028c749c:     	orr	x0, x22, #0x8
1028c74a0:     	bl	0x10001022c
1028c74a4:     	add	x8, sp, #0x310
1028c74a8:     	add	w1, w21, #0x82
1028c74ac:     	b	0x1028c8e64
1028c74b0:     	adrp	x8, 0x104314000

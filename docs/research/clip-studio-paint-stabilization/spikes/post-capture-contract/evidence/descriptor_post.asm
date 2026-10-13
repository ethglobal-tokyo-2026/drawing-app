1028c78b0:     	adrp	x8, 0x104552000
1028c78b4:     	ldr	d0, [x8, #0xec8]
1028c78b8:     	stur	d0, [x19, #0x4]
1028c78bc:     	add	w8, w22, #0x47e
1028c78c0:     	str	w8, [x19, #0x10]
1028c78c4:     	mov	w21, #0x7               ; =7
1028c78c8:     	movk	w21, #0x18, lsl #16
1028c78cc:     	add	x22, sp, #0x310
1028c78d0:     	add	x8, sp, #0x310
1028c78d4:     	add	w1, w21, #0x7d
1028c78d8:     	mov	x0, x20
1028c78dc:     	bl	0x102e10fb0
1028c78e0:     	add	x23, sp, #0x490
1028c78e4:     	ldr	q0, [sp, #0x310]
1028c78e8:     	str	xzr, [sp, #0x310]
1028c78ec:     	str	xzr, [sp, #0x318]
1028c78f0:     	ldur	q1, [x19, #0x18]
1028c78f4:     	stur	q0, [x19, #0x18]
1028c78f8:     	str	q1, [sp, #0x490]
1028c78fc:     	orr	x0, x23, #0x8
1028c7900:     	bl	0x10001022c
1028c7904:     	orr	x0, x22, #0x8
1028c7908:     	bl	0x10001022c
1028c790c:     	add	x8, sp, #0x310
1028c7910:     	add	w1, w21, #0x7e
1028c7914:     	mov	x0, x20
1028c7918:     	bl	0x102e10fb0
1028c791c:     	ldr	q0, [sp, #0x310]
1028c7920:     	str	xzr, [sp, #0x310]
1028c7924:     	str	xzr, [sp, #0x318]
1028c7928:     	ldur	q1, [x19, #0x28]
1028c792c:     	stur	q0, [x19, #0x28]
1028c7930:     	str	q1, [sp, #0x490]
1028c7934:     	orr	x0, x23, #0x8
1028c7938:     	bl	0x10001022c
1028c793c:     	orr	x0, x22, #0x8
1028c7940:     	bl	0x10001022c
1028c7944:     	adrp	x8, 0x104309000
1028c7948:     	ldr	q0, [x8, #0x290]
1028c794c:     	str	q0, [x19, #0x50]
1028c7950:     	mov	w8, #0x480              ; =1152
1028c7954:     	str	w8, [sp, #0x490]
1028c7958:     	add	x0, x19, #0x68
1028c795c:     	add	x1, sp, #0x490
1028c7960:     	bl	0x100012414
1028c7964:     	mov	w8, #0x481              ; =1153
1028c7968:     	str	w8, [sp, #0x490]
1028c796c:     	add	x0, x19, #0x68
1028c7970:     	add	x1, sp, #0x490
1028c7974:     	bl	0x100012414
1028c7978:     	mov	w8, #0x482              ; =1154
1028c797c:     	b	0x1028ca914


FUNCTION 0x102765694 size 104
102765694:     	sub	sp, sp, #0x50
102765698:     	stp	x20, x19, [sp, #0x30]
10276569c:     	stp	x29, x30, [sp, #0x40]
1027656a0:     	add	x29, sp, #0x40
1027656a4:     	fmov	d6, d0
1027656a8:     	mov	x19, x1
1027656ac:     	mov	x20, x0
1027656b0:     	ldp	d0, d1, [x0, #0x8]
1027656b4:     	ldp	d2, d3, [x0, #0x78]
1027656b8:     	ldp	d4, d5, [x2, #0x8]
1027656bc:     	add	x0, sp, #0x20
1027656c0:     	add	x1, sp, #0x10
1027656c4:     	mov	x2, sp
1027656c8:     	bl	0x10359d408
1027656cc:     	ldr	q0, [sp, #0x20]
1027656d0:     	stur	q0, [x20, #0x78]
1027656d4:     	ldp	d0, d1, [sp]
1027656d8:     	ldr	x8, [x19]
1027656dc:     	ldr	x8, [x8, #0x18]
1027656e0:     	mov	x0, x19
1027656e4:     	mov	w1, #0x0                ; =0
1027656e8:     	blr	x8
1027656ec:     	ldp	x29, x30, [sp, #0x40]
1027656f0:     	ldp	x20, x19, [sp, #0x30]
1027656f4:     	add	sp, sp, #0x50
1027656f8:     	ret

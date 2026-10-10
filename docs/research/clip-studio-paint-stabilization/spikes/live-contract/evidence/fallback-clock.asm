
FUNCTION 0x1031088a4 size 56
1031088a4:     	stp	x20, x19, [sp, #-0x20]!
1031088a8:     	stp	x29, x30, [sp, #0x10]
1031088ac:     	add	x29, sp, #0x10
1031088b0:     	mov	x19, x0
1031088b4:     	bl	0x103bdf4e8
1031088b8:     	adrp	x8, 0x104ceb000
1031088bc:     	add	x8, x8, #0x224
1031088c0:     	ldp	w9, w8, [x8]
1031088c4:     	mul	x9, x0, x9
1031088c8:     	udiv	x1, x9, x8
1031088cc:     	mov	x0, x19
1031088d0:     	ldp	x29, x30, [sp, #0x10]
1031088d4:     	ldp	x20, x19, [sp], #0x20
1031088d8:     	b	0x103121170

FUNCTION 0x103121190 size 64
103121190:     	mov	w8, #0x423f             ; =16959
103121194:     	movk	w8, #0xf, lsl #16
103121198:     	ldr	x9, [x0, #0x8]
10312119c:     	sub	x10, x8, x9
1031211a0:     	mov	x11, #0x34db            ; =13531
1031211a4:     	movk	x11, #0xd7b6, lsl #16
1031211a8:     	movk	x11, #0xde82, lsl #32
1031211ac:     	movk	x11, #0x431b, lsl #48
1031211b0:     	umulh	x10, x10, x11
1031211b4:     	neg	x10, x10, lsr #18
1031211b8:     	add	x8, x9, x8
1031211bc:     	umulh	x8, x8, x11
1031211c0:     	lsr	x8, x8, #18
1031211c4:     	cmp	x9, #0x1
1031211c8:     	csel	x0, x10, x8, lt
1031211cc:     	ret

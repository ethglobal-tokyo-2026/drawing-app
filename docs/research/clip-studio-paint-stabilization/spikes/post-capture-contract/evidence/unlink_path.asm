
FUNCTION 0x102784098 size 88
102784098:     	stp	x20, x19, [sp, #-0x20]!
10278409c:     	stp	x29, x30, [sp, #0x10]
1027840a0:     	add	x29, sp, #0x10
1027840a4:     	mov	x19, x0
1027840a8:     	add	x8, x0, #0x68
1027840ac:     	ldp	x10, x9, [x1, #0x8]
1027840b0:     	cmp	x9, #0x0
1027840b4:     	csel	x11, x8, x9, eq
1027840b8:     	str	x10, [x11, #0x8]
1027840bc:     	cmp	x10, #0x0
1027840c0:     	csel	x8, x8, x10, eq
1027840c4:     	str	x9, [x8, #0x10]
1027840c8:     	ldr	x0, [x0, #0x88]
1027840cc:     	ldr	x8, [x0]
1027840d0:     	ldr	x8, [x8, #0x18]
1027840d4:     	blr	x8
1027840d8:     	ldr	w8, [x19, #0x80]
1027840dc:     	sub	w8, w8, #0x1
1027840e0:     	str	w8, [x19, #0x80]
1027840e4:     	ldp	x29, x30, [sp, #0x10]
1027840e8:     	ldp	x20, x19, [sp], #0x20
1027840ec:     	ret

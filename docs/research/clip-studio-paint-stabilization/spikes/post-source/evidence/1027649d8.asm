
FUNCTION 0x1027649d8 size 108
1027649d8:     	stp	x20, x19, [sp, #-0x20]!
1027649dc:     	stp	x29, x30, [sp, #0x10]
1027649e0:     	add	x29, sp, #0x10
1027649e4:     	mov	x19, x1
1027649e8:     	mov	x20, x0
1027649ec:     	bl	0x10276b190
1027649f0:     	ldr	w8, [x20, #0x40]
1027649f4:     	orr	w8, w8, #0x1
1027649f8:     	str	w8, [x20, #0x40]
1027649fc:     	ldr	x0, [x20, #0x30]
102764a00:     	cbz	x0, 0x102764a38
102764a04:     	adrp	x1, 0x104a52000
102764a08:     	add	x1, x1, #0xc98
102764a0c:     	adrp	x2, 0x104a52000
102764a10:     	add	x2, x2, #0x8e8
102764a14:     	mov	x3, #0x0                ; =0
102764a18:     	bl	0x103bdd454
102764a1c:     	cbz	x0, 0x102764a38
102764a20:     	ldur	q0, [x0, #0x8]
102764a24:     	ldr	q1, [x19]
102764a28:     	fadd.2d	v0, v0, v1
102764a2c:     	fmov.2d	v1, #0.50000000
102764a30:     	fmul.2d	v0, v0, v1
102764a34:     	stur	q0, [x0, #0x78]
102764a38:     	ldp	x29, x30, [sp, #0x10]
102764a3c:     	ldp	x20, x19, [sp], #0x20
102764a40:     	ret

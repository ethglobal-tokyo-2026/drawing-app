
FUNCTION 0x10277f2bc size 48
10277f2bc:     	mov	x8, x0
10277f2c0:     	ldr	x0, [x8, #0x8]!
10277f2c4:     	cbz	x0, 0x10277f2d4
10277f2c8:     	ldr	x9, [x0]
10277f2cc:     	str	x9, [x8]
10277f2d0:     	b	0x102788840
10277f2d4:     	stp	x29, x30, [sp, #-0x10]!
10277f2d8:     	mov	x29, sp
10277f2dc:     	mov	x0, x8
10277f2e0:     	bl	0x10277ef38
10277f2e4:     	ldp	x29, x30, [sp], #0x10
10277f2e8:     	b	0x102788840

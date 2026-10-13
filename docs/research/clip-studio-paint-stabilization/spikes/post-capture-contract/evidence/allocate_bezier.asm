
FUNCTION 0x10277f17c size 48
10277f17c:     	mov	x8, x0
10277f180:     	ldr	x0, [x8, #0x8]!
10277f184:     	cbz	x0, 0x10277f194
10277f188:     	ldr	x9, [x0]
10277f18c:     	str	x9, [x8]
10277f190:     	b	0x1027647c0
10277f194:     	stp	x29, x30, [sp, #-0x10]!
10277f198:     	mov	x29, sp
10277f19c:     	mov	x0, x8
10277f1a0:     	bl	0x10277ef38
10277f1a4:     	ldp	x29, x30, [sp], #0x10
10277f1a8:     	b	0x1027647c0

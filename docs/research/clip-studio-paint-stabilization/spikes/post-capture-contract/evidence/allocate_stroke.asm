
FUNCTION 0x10277f35c size 48
10277f35c:     	mov	x8, x0
10277f360:     	ldr	x0, [x8, #0x8]!
10277f364:     	cbz	x0, 0x10277f374
10277f368:     	ldr	x9, [x0]
10277f36c:     	str	x9, [x8]
10277f370:     	b	0x1027896dc
10277f374:     	stp	x29, x30, [sp, #-0x10]!
10277f378:     	mov	x29, sp
10277f37c:     	mov	x0, x8
10277f380:     	bl	0x10277ef38
10277f384:     	ldp	x29, x30, [sp], #0x10
10277f388:     	b	0x1027896dc

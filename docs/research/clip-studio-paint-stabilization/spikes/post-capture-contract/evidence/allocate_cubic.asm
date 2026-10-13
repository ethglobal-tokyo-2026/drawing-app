
FUNCTION 0x10277f21c size 48
10277f21c:     	mov	x8, x0
10277f220:     	ldr	x0, [x8, #0x8]!
10277f224:     	cbz	x0, 0x10277f234
10277f228:     	ldr	x9, [x0]
10277f22c:     	str	x9, [x8]
10277f230:     	b	0x102769914
10277f234:     	stp	x29, x30, [sp, #-0x10]!
10277f238:     	mov	x29, sp
10277f23c:     	mov	x0, x8
10277f240:     	bl	0x10277ef38
10277f244:     	ldp	x29, x30, [sp], #0x10
10277f248:     	b	0x102769914

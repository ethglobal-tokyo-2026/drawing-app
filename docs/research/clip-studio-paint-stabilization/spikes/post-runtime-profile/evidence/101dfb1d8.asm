
FUNCTION 0x101dfb1d8 size 116
101dfb1d8:     	sub	sp, sp, #0x30
101dfb1dc:     	stp	x20, x19, [sp, #0x10]
101dfb1e0:     	stp	x29, x30, [sp, #0x20]
101dfb1e4:     	add	x29, sp, #0x20
101dfb1e8:     	ldr	x8, [x0]
101dfb1ec:     	cbz	x8, 0x101dfb20c
101dfb1f0:     	and	x8, x8, #0xfffffffffffffffe
101dfb1f4:     	ldr	x2, [x8, #0x8]
101dfb1f8:     	add	x0, x0, #0x8
101dfb1fc:     	ldp	x29, x30, [sp, #0x20]
101dfb200:     	ldp	x20, x19, [sp, #0x10]
101dfb204:     	add	sp, sp, #0x30
101dfb208:     	br	x2
101dfb20c:     	adrp	x1, 0x1045e2000
101dfb210:     	add	x1, x1, #0x326
101dfb214:     	mov	x0, sp
101dfb218:     	bl	0x103bdcc98
101dfb21c:     	adrp	x8, 0x1048e8000
101dfb220:     	add	x8, x8, #0xbb8
101dfb224:     	add	x8, x8, #0x10
101dfb228:     	str	x8, [sp]
101dfb22c:     	mov	x0, sp
101dfb230:     	bl	0x1001ffce4
101dfb234:     	brk	#0x1
101dfb238:     	mov	x19, x0
101dfb23c:     	mov	x0, sp
101dfb240:     	bl	0x103bdccc8
101dfb244:     	mov	x0, x19
101dfb248:     	bl	0x103bda970

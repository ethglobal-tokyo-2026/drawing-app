
FUNCTION 0x1027819bc size 80
1027819bc:     	ldr	x8, [x0, #0x38]
1027819c0:     	cbz	x8, 0x102781a08
1027819c4:     	sub	sp, sp, #0x30
1027819c8:     	stp	x20, x19, [sp, #0x10]
1027819cc:     	stp	x29, x30, [sp, #0x20]
1027819d0:     	add	x29, sp, #0x20
1027819d4:     	ldr	x20, [x8, #0x30]
1027819d8:     	cbz	x20, 0x1027819fc
1027819dc:     	mov	x19, x0
1027819e0:     	mov	x0, x20
1027819e4:     	bl	0x10276b2c4
1027819e8:     	ldur	q0, [x20, #0x18]
1027819ec:     	str	q0, [sp]
1027819f0:     	add	x0, x19, #0x50
1027819f4:     	mov	x1, sp
1027819f8:     	bl	0x10221b5e4
1027819fc:     	ldp	x29, x30, [sp, #0x20]
102781a00:     	ldp	x20, x19, [sp, #0x10]
102781a04:     	add	sp, sp, #0x30
102781a08:     	ret

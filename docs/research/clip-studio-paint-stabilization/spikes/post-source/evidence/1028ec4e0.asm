
FUNCTION 0x1028ec4e0 size 104
1028ec4e0:     	ldr	w8, [x0, #0x11c]
1028ec4e4:     	cbz	w8, 0x1028ec544
1028ec4e8:     	stp	x20, x19, [sp, #-0x20]!
1028ec4ec:     	stp	x29, x30, [sp, #0x10]
1028ec4f0:     	add	x29, sp, #0x10
1028ec4f4:     	mov	x19, x1
1028ec4f8:     	mov	x20, x0
1028ec4fc:     	add	x1, x0, #0x68
1028ec500:     	mov	x0, x19
1028ec504:     	bl	0x102193618
1028ec508:     	ldp	d1, d2, [x20, #0x120]
1028ec50c:     	fadd	d0, d0, d2
1028ec510:     	str	d0, [x20, #0x128]
1028ec514:     	fcmp	d0, d1
1028ec518:     	b.ge	0x1028ec538
1028ec51c:     	fdiv	d0, d0, d1
1028ec520:     	fmov	d1, #1.00000000
1028ec524:     	fsub	d0, d1, d0
1028ec528:     	ldr	d1, [x19, #0x30]
1028ec52c:     	fmul	d0, d0, d1
1028ec530:     	str	d0, [x19, #0x30]
1028ec534:     	b	0x1028ec53c
1028ec538:     	str	xzr, [x19, #0x30]
1028ec53c:     	ldp	x29, x30, [sp, #0x10]
1028ec540:     	ldp	x20, x19, [sp], #0x20
1028ec544:     	ret

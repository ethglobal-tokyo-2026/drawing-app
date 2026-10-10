10276b5e4:     	stp	x20, x19, [sp, #-0x20]!
10276b5e8:     	stp	x29, x30, [sp, #0x10]
10276b5ec:     	add	x29, sp, #0x10
10276b5f0:     	mov	x19, x0
10276b5f4:     	ldr	x1, [x19, #0x28]
10276b5f8:     	cbz	x1, 0x10276b614
10276b5fc:     	ldr	x8, [x19]
10276b600:     	ldr	x8, [x8, #0x80]
10276b604:     	mov	x0, x19
10276b608:     	blr	x8
10276b60c:     	fmov	d2, d0
10276b610:     	b	0x10276b630
10276b614:     	ldr	x8, [x19, #0x38]
10276b618:     	movi	d2, #0000000000000000
10276b61c:     	ldrb	w9, [x8, #0x21]
10276b620:     	movi	d1, #0000000000000000
10276b624:     	tbz	w9, #0x0, 0x10276b630
10276b628:     	ldr	x1, [x8, #0x30]
10276b62c:     	cbnz	x1, 0x10276b5fc
10276b630:     	fcmp	d2, #0.0
10276b634:     	b.ne	0x10276b64c
10276b638:     	fcmp	d1, #0.0
10276b63c:     	b.ne	0x10276b64c
10276b640:     	ldr	x19, [x19, #0x30]
10276b644:     	fmov	d0, #1.00000000
10276b648:     	cbnz	x19, 0x10276b5f4
10276b64c:     	fmov	d0, d2
10276b650:     	ldp	x29, x30, [sp, #0x10]
10276b654:     	ldp	x20, x19, [sp], #0x20
10276b658:     	ret
10276b65c:     	ldr	x1, [x0, #0x28]
10276b660:     	cbz	x1, 0x10276b674
10276b664:     	ldr	x8, [x0]
10276b668:     	ldr	x3, [x8, #0x60]
10276b66c:     	mov	w2, #0x1                ; =1
10276b670:     	br	x3
10276b674:     	ldr	x8, [x0, #0x38]
10276b678:     	ldrb	w9, [x8, #0x21]
10276b67c:     	tbz	w9, #0x0, 0x10276b688
10276b680:     	ldr	x1, [x8, #0x30]
10276b684:     	cbnz	x1, 0x10276b664
10276b688:     	ldp	d0, d1, [x0, #0x8]
10276b68c:     	fmov	d2, d0
10276b690:     	fmov	d3, d1
10276b694:     	ret
10276b698:     	ldr	x1, [x0, #0x28]
10276b69c:     	cbz	x1, 0x10276b6b0
10276b6a0:     	ldr	x8, [x0]
10276b6a4:     	ldr	x3, [x8, #0x60]
10276b6a8:     	mov	w2, #0x0                ; =0
10276b6ac:     	br	x3
10276b6b0:     	ldr	x8, [x0, #0x38]
10276b6b4:     	ldrb	w9, [x8, #0x21]
10276b6b8:     	tbz	w9, #0x0, 0x10276b6c4
10276b6bc:     	ldr	x1, [x8, #0x30]
10276b6c0:     	cbnz	x1, 0x10276b6a0
10276b6c4:     	ldp	d0, d1, [x0, #0x8]
10276b6c8:     	fmov	d2, d0
10276b6cc:     	fmov	d3, d1
10276b6d0:     	ret
10276b6d4:     	ldr	x1, [x0, #0x28]
10276b6d8:     	cbz	x1, 0x10276b6f8
10276b6dc:     	stp	x29, x30, [sp, #-0x10]!
10276b6e0:     	mov	x29, sp
10276b6e4:     	ldr	x8, [x0]
10276b6e8:     	ldr	x8, [x8, #0x68]
10276b6ec:     	blr	x8
10276b6f0:     	ldp	x29, x30, [sp], #0x10
10276b6f4:     	ret
10276b6f8:     	ldr	x8, [x0, #0x38]
10276b6fc:     	ldrb	w9, [x8, #0x21]

FUNCTION 0x1020be418 size 132
1020be418:     	stp	x20, x19, [sp, #-0x20]!
1020be41c:     	stp	x29, x30, [sp, #0x10]
1020be420:     	add	x29, sp, #0x10
1020be424:     	mov	x19, x0
1020be428:     	bl	0x102194e64
1020be42c:     	adrp	x8, 0x104d63000
1020be430:     	cmp	w0, #0x3
1020be434:     	b.eq	0x1020be47c
1020be438:     	cmp	w0, #0x2
1020be43c:     	b.eq	0x1020be45c
1020be440:     	cmp	w0, #0x1
1020be444:     	b.ne	0x1020be488
1020be448:     	str	w19, [x8, #0xfb0]
1020be44c:     	cmp	w19, #0x3
1020be450:     	mov	w8, #0xa                ; =10
1020be454:     	csel	x0, xzr, x8, eq
1020be458:     	b	0x1020be490
1020be45c:     	str	w19, [x8, #0xfb0]
1020be460:     	sub	w8, w19, #0x1
1020be464:     	cmp	w8, #0x3
1020be468:     	b.hs	0x1020be48c
1020be46c:     	adrp	x9, 0x104513000
1020be470:     	add	x9, x9, #0xb28
1020be474:     	ldr	x0, [x9, w8, uxtw #3]
1020be478:     	b	0x1020be490
1020be47c:     	str	wzr, [x8, #0xfb0]
1020be480:     	mov	w0, #0xf                ; =15
1020be484:     	b	0x1020be490
1020be488:     	str	wzr, [x8, #0xfb0]
1020be48c:     	mov	w0, #0xa                ; =10
1020be490:     	ldp	x29, x30, [sp, #0x10]
1020be494:     	ldp	x20, x19, [sp], #0x20
1020be498:     	b	0x1020bdb48

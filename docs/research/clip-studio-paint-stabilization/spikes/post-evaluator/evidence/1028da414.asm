
FUNCTION 0x1028da414 size 376
1028da414:     	sub	sp, sp, #0xa0
1028da418:     	stp	d9, d8, [sp, #0x50]
1028da41c:     	stp	x24, x23, [sp, #0x60]
1028da420:     	stp	x22, x21, [sp, #0x70]
1028da424:     	stp	x20, x19, [sp, #0x80]
1028da428:     	stp	x29, x30, [sp, #0x90]
1028da42c:     	add	x29, sp, #0x90
1028da430:     	fmov	d8, d0
1028da434:     	mov	x19, x2
1028da438:     	mov	x20, x1
1028da43c:     	mov	x21, x0
1028da440:     	ldr	x0, [x0]
1028da444:     	mov	w9, #0xc738             ; =51000
1028da448:     	ldp	x10, x8, [x1]
1028da44c:     	mov	w11, #0x3e8             ; =1000
1028da450:     	cmp	w3, #0x0
1028da454:     	csel	w1, w11, w9, eq
1028da458:     	stp	x10, x8, [sp, #0x30]
1028da45c:     	cbz	x8, 0x1028da46c
1028da460:     	add	x8, x8, #0x8
1028da464:     	mov	w9, #0x1                ; =1
1028da468:     	ldadd	w9, w8, [x8]
1028da46c:     	add	x23, sp, #0x30
1028da470:     	add	x2, sp, #0x30
1028da474:     	add	x3, sp, #0x40
1028da478:     	bl	0x1002a6fd0
1028da47c:     	mov	x22, x0
1028da480:     	add	x0, x23, #0x8
1028da484:     	bl	0x10001022c
1028da488:     	cbz	w22, 0x1028da544
1028da48c:     	ldp	x0, x1, [sp, #0x40]
1028da490:     	bl	0x10339dc98
1028da494:     	stp	x0, x1, [sp, #0x40]
1028da498:     	mov	w2, #0x0                ; =0
1028da49c:     	fmov	d0, d8
1028da4a0:     	bl	0x1022180a0
1028da4a4:     	fmov	d1, #0.50000000
1028da4a8:     	fmul	d8, d0, d1
1028da4ac:     	ldr	x8, [x19]
1028da4b0:     	cbz	x8, 0x1028da548
1028da4b4:     	ldr	x0, [x21]
1028da4b8:     	add	x8, sp, #0x18
1028da4bc:     	add	x21, x8, #0x8
1028da4c0:     	ldp	x9, x8, [x20]
1028da4c4:     	stp	x9, x8, [sp, #0x18]
1028da4c8:     	cbz	x8, 0x1028da4d8
1028da4cc:     	add	x8, x8, #0x8
1028da4d0:     	mov	w9, #0x1                ; =1
1028da4d4:     	ldadd	w9, w8, [x8]
1028da4d8:     	add	x2, sp, #0x18
1028da4dc:     	add	x3, sp, #0x2c
1028da4e0:     	mov	w1, #0x3ea              ; =1002
1028da4e4:     	bl	0x100f0f7cc
1028da4e8:     	mov	x20, x0
1028da4ec:     	mov	x0, x21
1028da4f0:     	bl	0x10001022c
1028da4f4:     	cbz	w20, 0x1028da548
1028da4f8:     	ldr	w8, [sp, #0x2c]
1028da4fc:     	cbz	w8, 0x1028da548
1028da500:     	add	x8, sp, #0x8
1028da504:     	add	x21, x8, #0x8
1028da508:     	ldp	x9, x8, [x19]
1028da50c:     	stp	x9, x8, [sp, #0x8]
1028da510:     	cbz	x8, 0x1028da520
1028da514:     	add	x8, x8, #0x8
1028da518:     	mov	w9, #0x1                ; =1
1028da51c:     	ldadd	w9, w8, [x8]
1028da520:     	add	x0, sp, #0x8
1028da524:     	bl	0x102992930
1028da528:     	adrp	x8, 0x1042ee000
1028da52c:     	ldr	d1, [x8, #0x828]
1028da530:     	fmul	d9, d0, d1
1028da534:     	mov	x0, x21
1028da538:     	bl	0x10001022c
1028da53c:     	fdiv	d8, d8, d9
1028da540:     	b	0x1028da548
1028da544:     	movi	d8, #0000000000000000
1028da548:     	fmov	d0, d8
1028da54c:     	ldp	x29, x30, [sp, #0x90]
1028da550:     	ldp	x20, x19, [sp, #0x80]
1028da554:     	ldp	x22, x21, [sp, #0x70]
1028da558:     	ldp	x24, x23, [sp, #0x60]
1028da55c:     	ldp	d9, d8, [sp, #0x50]
1028da560:     	add	sp, sp, #0xa0
1028da564:     	ret
1028da568:     	b	0x1028da56c
1028da56c:     	mov	x19, x0
1028da570:     	mov	x0, x21
1028da574:     	b	0x1028da580
1028da578:     	mov	x19, x0
1028da57c:     	add	x0, x23, #0x8
1028da580:     	bl	0x10001022c
1028da584:     	mov	x0, x19
1028da588:     	bl	0x103bda970

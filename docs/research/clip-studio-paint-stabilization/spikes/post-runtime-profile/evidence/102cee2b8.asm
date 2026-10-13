
FUNCTION 0x102cee2b8 size 660
102cee2b8:     	sub	sp, sp, #0xc0
102cee2bc:     	stp	d11, d10, [sp, #0x60]
102cee2c0:     	stp	d9, d8, [sp, #0x70]
102cee2c4:     	stp	x24, x23, [sp, #0x80]
102cee2c8:     	stp	x22, x21, [sp, #0x90]
102cee2cc:     	stp	x20, x19, [sp, #0xa0]
102cee2d0:     	stp	x29, x30, [sp, #0xb0]
102cee2d4:     	add	x29, sp, #0xb0
102cee2d8:     	mov	x19, x8
102cee2dc:     	ldr	x9, [x0, #0x10]
102cee2e0:     	cbz	x9, 0x102cee334
102cee2e4:     	mov	x20, x1
102cee2e8:     	mov	x22, x0
102cee2ec:     	ldr	x8, [x0, #0x18]
102cee2f0:     	stp	x9, x8, [sp, #0x50]
102cee2f4:     	cbz	x8, 0x102cee304
102cee2f8:     	add	x8, x8, #0x8
102cee2fc:     	mov	w9, #0x1                ; =1
102cee300:     	ldadd	w9, w8, [x8]
102cee304:     	add	x21, sp, #0x50
102cee308:     	add	x0, sp, #0x50
102cee30c:     	bl	0x102992930
102cee310:     	adrp	x8, 0x1042ee000
102cee314:     	ldr	d1, [x8, #0x828]
102cee318:     	fmul	d9, d0, d1
102cee31c:     	add	x0, x21, #0x8
102cee320:     	bl	0x10001022c
102cee324:     	adrp	x8, 0x1042e3000
102cee328:     	ldr	d0, [x8, #0x690]
102cee32c:     	fcmp	d9, d0
102cee330:     	b.pl	0x102cee33c
102cee334:     	stp	xzr, xzr, [x19]
102cee338:     	b	0x102cee4dc
102cee33c:     	mov	w0, #0x60               ; =96
102cee340:     	bl	0x103bdd37c
102cee344:     	mov	x21, x0
102cee348:     	bl	0x102ce87a8
102cee34c:     	adrp	x8, 0x104a71000
102cee350:     	add	x8, x8, #0x378
102cee354:     	str	x8, [x21]
102cee358:     	stp	xzr, xzr, [x21, #0x50]
102cee35c:     	mov	w8, #0x28               ; =40
102cee360:     	str	w8, [x21, #0x20]
102cee364:     	mov	x23, x21
102cee368:     	str	xzr, [x23, #0x28]!
102cee36c:     	stp	xzr, xzr, [x21, #0x40]
102cee370:     	str	xzr, [x21, #0x30]
102cee374:     	add	x0, sp, #0x40
102cee378:     	mov	x1, x21
102cee37c:     	bl	0x102ceebd4
102cee380:     	ldr	w8, [x20, #0x14]
102cee384:     	str	w8, [x21, #0x24]
102cee388:     	ldp	x9, x8, [x22, #0x20]
102cee38c:     	stp	x9, x8, [sp, #0x30]
102cee390:     	cbz	x8, 0x102cee3a0
102cee394:     	add	x8, x8, #0x8
102cee398:     	mov	w9, #0x1                ; =1
102cee39c:     	ldadd	w9, w8, [x8]
102cee3a0:     	add	x24, sp, #0x30
102cee3a4:     	add	x1, sp, #0x30
102cee3a8:     	mov	x0, x21
102cee3ac:     	bl	0x102cee54c
102cee3b0:     	add	x0, x24, #0x8
102cee3b4:     	bl	0x10001022c
102cee3b8:     	ldp	x8, x9, [x21, #0x48]
102cee3bc:     	cmp	x8, x9
102cee3c0:     	b.eq	0x102cee460
102cee3c4:     	ldr	x0, [x22, #0x10]
102cee3c8:     	bl	0x1021c7320
102cee3cc:     	fmov	d8, d0
102cee3d0:     	add	x24, sp, #0x10
102cee3d4:     	add	x0, sp, #0x10
102cee3d8:     	bl	0x1031163b8
102cee3dc:     	add	x0, x24, #0x10
102cee3e0:     	bl	0x1031163b8
102cee3e4:     	ldr	x0, [x22, #0x10]
102cee3e8:     	add	x1, sp, #0x10
102cee3ec:     	bl	0x1021bca90
102cee3f0:     	add	x1, sp, #0x10
102cee3f4:     	mov	w0, #0x20               ; =32
102cee3f8:     	bl	0x1020c0b64
102cee3fc:     	scvtf	d0, w0
102cee400:     	fmul	d0, d8, d0
102cee404:     	fdiv	d0, d0, d9
102cee408:     	str	d0, [x21, #0x40]
102cee40c:     	ldr	w8, [x20, #0x14]
102cee410:     	ldp	d8, d9, [x20]
102cee414:     	cbz	w8, 0x102cee468
102cee418:     	add	x4, x21, #0x38
102cee41c:     	mov	x0, x21
102cee420:     	fmov	d0, d8
102cee424:     	fmov	d1, d9
102cee428:     	mov	w1, #0x0                ; =0
102cee42c:     	mov	w2, #0x0                ; =0
102cee430:     	mov	x3, x23
102cee434:     	bl	0x102cee79c
102cee438:     	cbz	w0, 0x102cee460
102cee43c:     	ldr	w8, [x21, #0x38]
102cee440:     	cmp	w8, #0x0
102cee444:     	cset	w8, ne
102cee448:     	mov	w9, #0x30               ; =48
102cee44c:     	mov	w10, #0x28              ; =40
102cee450:     	csel	x9, x10, x9, eq
102cee454:     	ldr	d0, [x21, x9]
102cee458:     	str	d0, [x20, w8, uxtw #3]
102cee45c:     	b	0x102cee4c4
102cee460:     	stp	xzr, xzr, [x19]
102cee464:     	b	0x102cee4d0
102cee468:     	ldp	d0, d1, [x22, #0x80]
102cee46c:     	mov	x3, sp
102cee470:     	add	x4, x21, #0x38
102cee474:     	mov	x0, x21
102cee478:     	mov	w2, #0x0                ; =0
102cee47c:     	mov	w1, #0x1                ; =1
102cee480:     	bl	0x102cee79c
102cee484:     	mov	x23, x0
102cee488:     	ldr	d10, [sp, #0x8]
102cee48c:     	ldp	d0, d1, [x22, #0x80]
102cee490:     	mov	x3, sp
102cee494:     	add	x4, x21, #0x38
102cee498:     	mov	x0, x21
102cee49c:     	mov	w1, #0x0                ; =0
102cee4a0:     	mov	w2, #0x1                ; =1
102cee4a4:     	bl	0x102cee79c
102cee4a8:     	cmp	w23, #0x0
102cee4ac:     	fcsel	d0, d9, d10, eq
102cee4b0:     	ldr	d1, [sp]
102cee4b4:     	cmp	w0, #0x0
102cee4b8:     	fcsel	d1, d8, d1, eq
102cee4bc:     	stp	d1, d0, [x21, #0x28]
102cee4c0:     	stp	d1, d0, [x20]
102cee4c4:     	ldr	q0, [sp, #0x40]
102cee4c8:     	str	q0, [x19]
102cee4cc:     	stp	xzr, xzr, [sp, #0x40]
102cee4d0:     	add	x8, sp, #0x40
102cee4d4:     	orr	x0, x8, #0x8
102cee4d8:     	bl	0x10001022c
102cee4dc:     	ldp	x29, x30, [sp, #0xb0]
102cee4e0:     	ldp	x20, x19, [sp, #0xa0]
102cee4e4:     	ldp	x22, x21, [sp, #0x90]
102cee4e8:     	ldp	x24, x23, [sp, #0x80]
102cee4ec:     	ldp	d9, d8, [sp, #0x70]
102cee4f0:     	ldp	d11, d10, [sp, #0x60]
102cee4f4:     	add	sp, sp, #0xc0
102cee4f8:     	ret
102cee4fc:     	b	0x102cee528
102cee500:     	b	0x102cee528
102cee504:     	mov	x19, x0
102cee508:     	add	x0, x24, #0x8
102cee50c:     	bl	0x10001022c
102cee510:     	b	0x102cee52c
102cee514:     	mov	x19, x0
102cee518:     	mov	x0, x21
102cee51c:     	bl	0x103bdd34c
102cee520:     	b	0x102cee544
102cee524:     	b	0x102cee528
102cee528:     	mov	x19, x0
102cee52c:     	add	x8, sp, #0x40
102cee530:     	orr	x0, x8, #0x8
102cee534:     	b	0x102cee540
102cee538:     	mov	x19, x0
102cee53c:     	add	x0, x21, #0x8
102cee540:     	bl	0x10001022c
102cee544:     	mov	x0, x19
102cee548:     	bl	0x103bda970

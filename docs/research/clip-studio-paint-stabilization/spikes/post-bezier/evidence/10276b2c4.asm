
FUNCTION 0x10276b2c4 size 800
10276b2c4:     	sub	sp, sp, #0x190
10276b2c8:     	stp	d11, d10, [sp, #0x130]
10276b2cc:     	stp	d9, d8, [sp, #0x140]
10276b2d0:     	stp	x24, x23, [sp, #0x150]
10276b2d4:     	stp	x22, x21, [sp, #0x160]
10276b2d8:     	stp	x20, x19, [sp, #0x170]
10276b2dc:     	stp	x29, x30, [sp, #0x180]
10276b2e0:     	add	x29, sp, #0x180
10276b2e4:     	mov	x19, x0
10276b2e8:     	ldur	q0, [x0, #0x8]
10276b2ec:     	stp	q0, q0, [x29, #-0x70]
10276b2f0:     	ldr	x20, [x0, #0x28]
10276b2f4:     	cbz	x20, 0x10276b328
10276b2f8:     	ldr	x8, [x19]
10276b2fc:     	ldr	x8, [x8, #0x60]
10276b300:     	mov	x0, x19
10276b304:     	mov	x1, x20
10276b308:     	mov	w2, #0x1                ; =1
10276b30c:     	blr	x8
10276b310:     	stp	d0, d1, [x29, #-0x70]
10276b314:     	stp	d2, d3, [x29, #-0x60]
10276b318:     	ldr	x0, [x19, #0x38]
10276b31c:     	cbz	x0, 0x10276b570
10276b320:     	mov	w22, #0x0               ; =0
10276b324:     	b	0x10276b348
10276b328:     	ldr	x0, [x19, #0x38]
10276b32c:     	ldrb	w8, [x0, #0x21]
10276b330:     	tbnz	w8, #0x0, 0x10276b33c
10276b334:     	mov	x20, #0x0               ; =0
10276b338:     	b	0x10276b344
10276b33c:     	ldr	x20, [x0, #0x30]
10276b340:     	cbnz	x20, 0x10276b2f8
10276b344:     	mov	w22, #0x1               ; =1
10276b348:     	ldr	x8, [x0]
10276b34c:     	ldr	x9, [x8, #0x98]
10276b350:     	sub	x21, x29, #0x80
10276b354:     	sub	x8, x29, #0x80
10276b358:     	blr	x9
10276b35c:     	ldur	x0, [x29, #-0x80]
10276b360:     	cbz	x0, 0x10276b568
10276b364:     	sub	x8, x29, #0x90
10276b368:     	bl	0x1024c1e3c
10276b36c:     	ldr	x0, [x19, #0x38]
10276b370:     	ldr	x8, [x0]
10276b374:     	ldr	x8, [x8, #0x88]
10276b378:     	blr	x8
10276b37c:     	fmov	d8, d0
10276b380:     	ldur	x8, [x29, #-0x80]
10276b384:     	ldrb	w8, [x8, #0x278]
10276b388:     	tbnz	w8, #0x6, 0x10276b3c0
10276b38c:     	ldur	x8, [x29, #-0x90]
10276b390:     	cbz	x8, 0x10276b43c
10276b394:     	ldr	w23, [x8, #0x278]
10276b398:     	str	xzr, [sp, #0xe0]
10276b39c:     	movi.2d	v0, #0000000000000000
10276b3a0:     	stp	q0, q0, [sp, #0xc0]
10276b3a4:     	stp	q0, q0, [sp, #0xa0]
10276b3a8:     	str	q0, [sp, #0x90]
10276b3ac:     	add	x1, sp, #0x90
10276b3b0:     	mov	x0, x19
10276b3b4:     	bl	0x10276b138
10276b3b8:     	tbnz	w23, #0x6, 0x10276b3e0
10276b3bc:     	b	0x10276b45c
10276b3c0:     	str	xzr, [sp, #0xe0]
10276b3c4:     	movi.2d	v0, #0000000000000000
10276b3c8:     	stp	q0, q0, [sp, #0xc0]
10276b3cc:     	stp	q0, q0, [sp, #0xa0]
10276b3d0:     	str	q0, [sp, #0x90]
10276b3d4:     	add	x1, sp, #0x90
10276b3d8:     	mov	x0, x19
10276b3dc:     	bl	0x10276b138
10276b3e0:     	movi	d0, #0000000000000000
10276b3e4:     	mov	x0, x19
10276b3e8:     	bl	0x10276b5e4
10276b3ec:     	bl	0x1021947ac
10276b3f0:     	str	d0, [sp, #0xd8]
10276b3f4:     	ldp	q0, q1, [sp, #0xb0]
10276b3f8:     	stp	q0, q1, [sp, #0x50]
10276b3fc:     	ldr	q0, [sp, #0xd0]
10276b400:     	str	q0, [sp, #0x70]
10276b404:     	ldr	x8, [sp, #0xe0]
10276b408:     	str	x8, [sp, #0x80]
10276b40c:     	ldp	q0, q1, [sp, #0x90]
10276b410:     	stp	q0, q1, [sp, #0x30]
10276b414:     	tbnz	w22, #0x0, 0x10276b48c
10276b418:     	add	x1, sp, #0x30
10276b41c:     	mov	x0, x20
10276b420:     	bl	0x10276b138
10276b424:     	fmov	d0, #1.00000000
10276b428:     	mov	x0, x19
10276b42c:     	bl	0x10276b5e4
10276b430:     	bl	0x1021947ac
10276b434:     	str	d0, [sp, #0x78]
10276b438:     	b	0x10276b48c
10276b43c:     	str	xzr, [sp, #0xe0]
10276b440:     	movi.2d	v0, #0000000000000000
10276b444:     	stp	q0, q0, [sp, #0xc0]
10276b448:     	stp	q0, q0, [sp, #0xa0]
10276b44c:     	str	q0, [sp, #0x90]
10276b450:     	add	x1, sp, #0x90
10276b454:     	mov	x0, x19
10276b458:     	bl	0x10276b138
10276b45c:     	ldp	q0, q1, [sp, #0xb0]
10276b460:     	stp	q0, q1, [sp, #0x50]
10276b464:     	ldr	q0, [sp, #0xd0]
10276b468:     	str	q0, [sp, #0x70]
10276b46c:     	ldr	x8, [sp, #0xe0]
10276b470:     	str	x8, [sp, #0x80]
10276b474:     	ldp	q0, q1, [sp, #0x90]
10276b478:     	stp	q0, q1, [sp, #0x30]
10276b47c:     	tbnz	w22, #0x0, 0x10276b48c
10276b480:     	add	x1, sp, #0x30
10276b484:     	mov	x0, x20
10276b488:     	bl	0x10276b138
10276b48c:     	ldur	x0, [x29, #-0x80]
10276b490:     	add	x1, sp, #0x90
10276b494:     	add	x2, sp, #0x30
10276b498:     	fmov	d0, d8
10276b49c:     	bl	0x1024c4b04
10276b4a0:     	fmov	d9, d0
10276b4a4:     	sub	x0, x29, #0x70
10276b4a8:     	fmov	d1, d0
10276b4ac:     	bl	0x10221b52c
10276b4b0:     	ldrb	w8, [x19, #0x40]
10276b4b4:     	tbz	w8, #0x1, 0x10276b55c
10276b4b8:     	ldr	s0, [x19, #0x60]
10276b4bc:     	fcvt	d0, s0
10276b4c0:     	str	q0, [sp]
10276b4c4:     	ldur	x0, [x29, #-0x90]
10276b4c8:     	cbz	x0, 0x10276b520
10276b4cc:     	bl	0x1024c28b0
10276b4d0:     	fmov	d10, d0
10276b4d4:     	ldur	x0, [x29, #-0x80]
10276b4d8:     	add	x1, sp, #0x90
10276b4dc:     	fmov	d0, d8
10276b4e0:     	bl	0x1024c497c
10276b4e4:     	fmov	d8, d0
10276b4e8:     	ldur	x0, [x29, #-0x90]
10276b4ec:     	add	x1, sp, #0x90
10276b4f0:     	fmov	d0, d10
10276b4f4:     	bl	0x1024c497c
10276b4f8:     	adrp	x8, 0x1042e3000
10276b4fc:     	ldr	d1, [x8, #0x690]
10276b500:     	fcmp	d8, d1
10276b504:     	b.le	0x10276b520
10276b508:     	fcmp	d0, d8
10276b50c:     	b.le	0x10276b520
10276b510:     	fdiv	d0, d0, d8
10276b514:     	ldr	q3, [sp]
10276b518:     	fmul	d3, d0, d3
10276b51c:     	b	0x10276b524
10276b520:     	ldr	q3, [sp]
10276b524:     	adrp	x8, 0x104302000
10276b528:     	ldr	d0, [x8, #0xfd8]
10276b52c:     	fmul	d0, d9, d0
10276b530:     	ldur	q1, [x19, #0x8]
10276b534:     	ldur	d2, [x19, #0x64]
10276b538:     	fcvtl	v2.2d, v2.2s
10276b53c:     	fmla.2d	v1, v2, v3[0]
10276b540:     	dup.2d	v0, v0[0]
10276b544:     	fsub.2d	v2, v1, v0
10276b548:     	fadd.2d	v0, v0, v1
10276b54c:     	stp	q2, q0, [sp, #0x10]
10276b550:     	sub	x0, x29, #0x70
10276b554:     	add	x1, sp, #0x10
10276b558:     	bl	0x10221b64c
10276b55c:     	sub	x8, x29, #0x90
10276b560:     	add	x0, x8, #0x8
10276b564:     	bl	0x10001022c
10276b568:     	add	x0, x21, #0x8
10276b56c:     	bl	0x10001022c
10276b570:     	sub	x0, x29, #0x70
10276b574:     	bl	0x10221bbfc
10276b578:     	stp	x0, x1, [x19, #0x18]
10276b57c:     	ldp	x29, x30, [sp, #0x180]
10276b580:     	ldp	x20, x19, [sp, #0x170]
10276b584:     	ldp	x22, x21, [sp, #0x160]
10276b588:     	ldp	x24, x23, [sp, #0x150]
10276b58c:     	ldp	d9, d8, [sp, #0x140]
10276b590:     	ldp	d11, d10, [sp, #0x130]
10276b594:     	add	sp, sp, #0x190
10276b598:     	ret
10276b59c:     	b	0x10276b5c0
10276b5a0:     	b	0x10276b5c0
10276b5a4:     	b	0x10276b5c0
10276b5a8:     	b	0x10276b5c0
10276b5ac:     	b	0x10276b5c0
10276b5b0:     	b	0x10276b5c0
10276b5b4:     	mov	x19, x0
10276b5b8:     	b	0x10276b5d0
10276b5bc:     	b	0x10276b5c0
10276b5c0:     	mov	x19, x0
10276b5c4:     	sub	x8, x29, #0x90
10276b5c8:     	add	x0, x8, #0x8
10276b5cc:     	bl	0x10001022c
10276b5d0:     	sub	x8, x29, #0x80
10276b5d4:     	add	x0, x8, #0x8
10276b5d8:     	bl	0x10001022c
10276b5dc:     	mov	x0, x19
10276b5e0:     	bl	0x103bda970

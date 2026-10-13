
FUNCTION 0x1024cc404 size 792
1024cc404:     	sub	sp, sp, #0xf0
1024cc408:     	stp	x28, x27, [sp, #0x90]
1024cc40c:     	stp	x26, x25, [sp, #0xa0]
1024cc410:     	stp	x24, x23, [sp, #0xb0]
1024cc414:     	stp	x22, x21, [sp, #0xc0]
1024cc418:     	stp	x20, x19, [sp, #0xd0]
1024cc41c:     	stp	x29, x30, [sp, #0xe0]
1024cc420:     	add	x29, sp, #0xe0
1024cc424:     	mov	x22, x2
1024cc428:     	mov	x23, x1
1024cc42c:     	mov	x20, x0
1024cc430:     	mov	x19, x8
1024cc434:     	add	x0, sp, #0x58
1024cc438:     	add	x1, x20, #0x70
1024cc43c:     	bl	0x10310d72c
1024cc440:     	mov	x21, x20
1024cc444:     	ldp	x24, x8, [x21, #0xb0]!
1024cc448:     	cmp	x24, x8
1024cc44c:     	b.eq	0x1024cc4c0
1024cc450:     	str	xzr, [x19]
1024cc454:     	ldr	x8, [x24, #0x8]
1024cc458:     	str	x8, [x19, #0x8]
1024cc45c:     	cbz	x8, 0x1024cc4ac
1024cc460:     	ldr	w9, [x8, #0x8]
1024cc464:     	cbz	w9, 0x1024cc494
1024cc468:     	add	w10, w9, #0x1
1024cc46c:     	add	x11, x8, #0x8
1024cc470:     	mov	x12, x9
1024cc474:     	cas	w12, w10, [x11]
1024cc478:     	cmp	w12, w9
1024cc47c:     	mov	x9, x12
1024cc480:     	b.ne	0x1024cc464
1024cc484:     	ldr	x0, [x24]
1024cc488:     	str	x0, [x19]
1024cc48c:     	cbnz	x0, 0x1024cc4a0
1024cc490:     	b	0x1024cc4ac
1024cc494:     	str	xzr, [x19, #0x8]
1024cc498:     	ldr	x0, [x19]
1024cc49c:     	cbz	x0, 0x1024cc4ac
1024cc4a0:     	ldr	x1, [x23]
1024cc4a4:     	bl	0x1024c37f4
1024cc4a8:     	cbnz	w0, 0x1024cc688
1024cc4ac:     	add	x0, x19, #0x8
1024cc4b0:     	bl	0x10001022c
1024cc4b4:     	add	x24, x24, #0x10
1024cc4b8:     	ldr	x8, [x20, #0xb8]
1024cc4bc:     	b	0x1024cc448
1024cc4c0:     	ldr	x8, [x20, #0x60]
1024cc4c4:     	stp	xzr, x8, [sp, #0x48]
1024cc4c8:     	cbz	x8, 0x1024cc500
1024cc4cc:     	ldr	w9, [x8, #0x8]
1024cc4d0:     	cbz	w9, 0x1024cc4fc
1024cc4d4:     	add	w10, w9, #0x1
1024cc4d8:     	add	x11, x8, #0x8
1024cc4dc:     	mov	x12, x9
1024cc4e0:     	cas	w12, w10, [x11]
1024cc4e4:     	cmp	w12, w9
1024cc4e8:     	mov	x9, x12
1024cc4ec:     	b.ne	0x1024cc4d0
1024cc4f0:     	ldr	x8, [x20, #0x58]
1024cc4f4:     	str	x8, [sp, #0x48]
1024cc4f8:     	b	0x1024cc500
1024cc4fc:     	str	xzr, [sp, #0x50]
1024cc500:     	add	x24, sp, #0x48
1024cc504:     	add	x25, sp, #0x38
1024cc508:     	add	x8, sp, #0x38
1024cc50c:     	mov	x0, x20
1024cc510:     	bl	0x103671930
1024cc514:     	ldp	x9, x8, [sp, #0x38]
1024cc518:     	stp	x9, x8, [sp, #0x28]
1024cc51c:     	cbz	x8, 0x1024cc52c
1024cc520:     	add	x8, x8, #0x8
1024cc524:     	mov	w9, #0x1                ; =1
1024cc528:     	ldadd	w9, w8, [x8]
1024cc52c:     	add	x8, sp, #0x28
1024cc530:     	ldp	x10, x9, [x23]
1024cc534:     	stp	x10, x9, [sp, #0x18]
1024cc538:     	cbz	x9, 0x1024cc548
1024cc53c:     	add	x9, x9, #0x8
1024cc540:     	mov	w10, #0x1               ; =1
1024cc544:     	ldadd	w10, w9, [x9]
1024cc548:     	add	x23, x8, #0x8
1024cc54c:     	ldp	x9, x8, [sp, #0x48]
1024cc550:     	stp	x9, x8, [sp, #0x8]
1024cc554:     	cbz	x8, 0x1024cc564
1024cc558:     	add	x8, x8, #0x8
1024cc55c:     	mov	w9, #0x1                ; =1
1024cc560:     	ldadd	w9, w8, [x8]
1024cc564:     	add	x26, sp, #0x18
1024cc568:     	add	x27, sp, #0x8
1024cc56c:     	add	x0, sp, #0x28
1024cc570:     	add	x1, sp, #0x18
1024cc574:     	add	x2, sp, #0x8
1024cc578:     	mov	x8, x19
1024cc57c:     	mov	w3, #0x0                ; =0
1024cc580:     	mov	x4, x22
1024cc584:     	bl	0x1024c1398
1024cc588:     	add	x0, x27, #0x8
1024cc58c:     	bl	0x10001022c
1024cc590:     	add	x0, x26, #0x8
1024cc594:     	bl	0x10001022c
1024cc598:     	mov	x0, x23
1024cc59c:     	bl	0x10001022c
1024cc5a0:     	ldr	x8, [x19]
1024cc5a4:     	cbz	x8, 0x1024cc678
1024cc5a8:     	ldp	x10, x9, [x20, #0xb0]
1024cc5ac:     	sub	x9, x9, x10
1024cc5b0:     	lsr	x10, x9, #4
1024cc5b4:     	cmp	w10, #0x1
1024cc5b8:     	b.lt	0x1024cc5f0
1024cc5bc:     	mov	x8, #0x0                ; =0
1024cc5c0:     	ubfx	x9, x9, #4, #31
1024cc5c4:     	ldr	x10, [x21]
1024cc5c8:     	add	x10, x10, x8
1024cc5cc:     	ldr	x10, [x10, #0x8]
1024cc5d0:     	cbz	x10, 0x1024cc61c
1024cc5d4:     	add	x10, x10, #0x8
1024cc5d8:     	ldapr	w10, [x10]
1024cc5dc:     	cbz	w10, 0x1024cc61c
1024cc5e0:     	add	x8, x8, #0x10
1024cc5e4:     	subs	x9, x9, #0x1
1024cc5e8:     	b.ne	0x1024cc5c4
1024cc5ec:     	ldr	x8, [x19]
1024cc5f0:     	ldr	x9, [x19, #0x8]
1024cc5f4:     	stp	x8, x9, [x29, #-0x60]
1024cc5f8:     	cbz	x9, 0x1024cc608
1024cc5fc:     	add	x8, x9, #0xc
1024cc600:     	mov	w9, #0x1                ; =1
1024cc604:     	ldadd	w9, w8, [x8]
1024cc608:     	sub	x22, x29, #0x60
1024cc60c:     	sub	x1, x29, #0x60
1024cc610:     	mov	x0, x21
1024cc614:     	bl	0x1024cfcac
1024cc618:     	b	0x1024cc660
1024cc61c:     	add	x22, sp, #0x70
1024cc620:     	ldp	x10, x9, [x19]
1024cc624:     	cbz	x9, 0x1024cc634
1024cc628:     	add	x11, x9, #0xc
1024cc62c:     	mov	w12, #0x1               ; =1
1024cc630:     	ldadd	w12, w11, [x11]
1024cc634:     	ldr	x11, [x21]
1024cc638:     	add	x8, x11, x8
1024cc63c:     	sub	x11, x29, #0x60
1024cc640:     	stp	xzr, xzr, [sp, #0x70]
1024cc644:     	ldr	x12, [x8]
1024cc648:     	stur	x12, [x29, #-0x60]
1024cc64c:     	ldr	x12, [x8, #0x8]
1024cc650:     	stp	x10, x9, [x8]
1024cc654:     	stur	x12, [x29, #-0x58]
1024cc658:     	add	x0, x11, #0x8
1024cc65c:     	bl	0x100015a60
1024cc660:     	add	x0, x22, #0x8
1024cc664:     	bl	0x100015a60
1024cc668:     	ldr	x8, [x20]
1024cc66c:     	ldr	x8, [x8, #0x28]
1024cc670:     	mov	x0, x20
1024cc674:     	blr	x8
1024cc678:     	add	x0, x25, #0x8
1024cc67c:     	bl	0x10001022c
1024cc680:     	add	x0, x24, #0x8
1024cc684:     	bl	0x10001022c
1024cc688:     	add	x0, sp, #0x58
1024cc68c:     	bl	0x10310d7c8
1024cc690:     	ldp	x29, x30, [sp, #0xe0]
1024cc694:     	ldp	x20, x19, [sp, #0xd0]
1024cc698:     	ldp	x22, x21, [sp, #0xc0]
1024cc69c:     	ldp	x24, x23, [sp, #0xb0]
1024cc6a0:     	ldp	x26, x25, [sp, #0xa0]
1024cc6a4:     	ldp	x28, x27, [sp, #0x90]
1024cc6a8:     	add	sp, sp, #0xf0
1024cc6ac:     	ret
1024cc6b0:     	mov	x20, x0
1024cc6b4:     	add	x0, x22, #0x8
1024cc6b8:     	bl	0x100015a60
1024cc6bc:     	b	0x1024cc6c4
1024cc6c0:     	mov	x20, x0
1024cc6c4:     	add	x23, x19, #0x8
1024cc6c8:     	b	0x1024cc6e0
1024cc6cc:     	mov	x20, x0
1024cc6d0:     	add	x0, x27, #0x8
1024cc6d4:     	bl	0x10001022c
1024cc6d8:     	add	x0, x26, #0x8
1024cc6dc:     	bl	0x10001022c
1024cc6e0:     	mov	x0, x23
1024cc6e4:     	bl	0x10001022c
1024cc6e8:     	add	x0, x25, #0x8
1024cc6ec:     	bl	0x10001022c
1024cc6f0:     	b	0x1024cc6f8
1024cc6f4:     	mov	x20, x0
1024cc6f8:     	add	x0, x24, #0x8
1024cc6fc:     	b	0x1024cc708
1024cc700:     	mov	x20, x0
1024cc704:     	add	x0, x19, #0x8
1024cc708:     	bl	0x10001022c
1024cc70c:     	add	x0, sp, #0x58
1024cc710:     	bl	0x10310d7c8
1024cc714:     	mov	x0, x20
1024cc718:     	bl	0x103bda970

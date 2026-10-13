
FUNCTION 0x1002fe2c8 size 2200
1002fe2c8:     	stp	x28, x27, [sp, #-0x60]!
1002fe2cc:     	stp	x26, x25, [sp, #0x10]
1002fe2d0:     	stp	x24, x23, [sp, #0x20]
1002fe2d4:     	stp	x22, x21, [sp, #0x30]
1002fe2d8:     	stp	x20, x19, [sp, #0x40]
1002fe2dc:     	stp	x29, x30, [sp, #0x50]
1002fe2e0:     	add	x29, sp, #0x50
1002fe2e4:     	sub	sp, sp, #0x200
1002fe2e8:     	mov	x19, x1
1002fe2ec:     	mov	x22, x0
1002fe2f0:     	mov	x0, x1
1002fe2f4:     	bl	0x1020cc3a4
1002fe2f8:     	mov	x20, x0
1002fe2fc:     	bl	0x1020b34f8
1002fe300:     	cbz	w0, 0x1002fe9a8
1002fe304:     	sub	x0, x29, #0xc0
1002fe308:     	mov	x1, x19
1002fe30c:     	bl	0x1020b3360
1002fe310:     	adrp	x0, 0x104d63000
1002fe314:     	add	x0, x0, #0xb78
1002fe318:     	bl	0x10214de74
1002fe31c:     	cmp	w20, w0
1002fe320:     	b.ne	0x1002fe360
1002fe324:     	ldr	x8, [x22, #0x110]
1002fe328:     	stp	xzr, x8, [x29, #-0xd0]
1002fe32c:     	cbz	x8, 0x1002fe408
1002fe330:     	ldr	w9, [x8, #0x8]
1002fe334:     	cbz	w9, 0x1002fe404
1002fe338:     	add	w10, w9, #0x1
1002fe33c:     	add	x11, x8, #0x8
1002fe340:     	mov	x12, x9
1002fe344:     	cas	w12, w10, [x11]
1002fe348:     	cmp	w12, w9
1002fe34c:     	mov	x9, x12
1002fe350:     	b.ne	0x1002fe334
1002fe354:     	ldr	x8, [x22, #0x108]
1002fe358:     	stur	x8, [x29, #-0xd0]
1002fe35c:     	b	0x1002fe408
1002fe360:     	adrp	x0, 0x104d63000
1002fe364:     	add	x0, x0, #0xb58
1002fe368:     	bl	0x10214de74
1002fe36c:     	cmp	w20, w0
1002fe370:     	b.ne	0x1002fe3f4
1002fe374:     	add	x0, sp, #0x138
1002fe378:     	bl	0x1031f9dcc
1002fe37c:     	add	x1, sp, #0x138
1002fe380:     	mov	x0, x19
1002fe384:     	bl	0x1028204a0
1002fe388:     	mov	x20, x0
1002fe38c:     	mov	x0, x19
1002fe390:     	bl	0x1028204d8
1002fe394:     	mov	x21, x0
1002fe398:     	ldr	x8, [x22, #0x110]
1002fe39c:     	stp	xzr, x8, [sp, #0x128]
1002fe3a0:     	cbz	x8, 0x1002fe444
1002fe3a4:     	ldr	w9, [x8, #0x8]
1002fe3a8:     	cbz	w9, 0x1002fe440
1002fe3ac:     	add	w10, w9, #0x1
1002fe3b0:     	add	x11, x8, #0x8
1002fe3b4:     	mov	x12, x9
1002fe3b8:     	cas	w12, w10, [x11]
1002fe3bc:     	cmp	w12, w9
1002fe3c0:     	mov	x9, x12
1002fe3c4:     	b.ne	0x1002fe3a8
1002fe3c8:     	ldr	x9, [x22, #0x108]
1002fe3cc:     	ldr	x8, [sp, #0x130]
1002fe3d0:     	add	x10, sp, #0x118
1002fe3d4:     	add	x22, x10, #0x8
1002fe3d8:     	str	x9, [sp, #0x118]
1002fe3dc:     	stp	x8, x9, [sp, #0x120]
1002fe3e0:     	cbz	x8, 0x1002fe450
1002fe3e4:     	add	x8, x8, #0x8
1002fe3e8:     	mov	w9, #0x1                ; =1
1002fe3ec:     	ldadd	w9, w8, [x8]
1002fe3f0:     	b	0x1002fe450
1002fe3f4:     	sub	x0, x29, #0xc0
1002fe3f8:     	bl	0x1020b3498
1002fe3fc:     	mov	w0, #0x0                ; =0
1002fe400:     	b	0x1002fe9a8
1002fe404:     	stur	xzr, [x29, #-0xc8]
1002fe408:     	sub	x21, x29, #0xd0
1002fe40c:     	sub	x0, x29, #0xd0
1002fe410:     	bl	0x1003cf220
1002fe414:     	mov	x20, x0
1002fe418:     	add	x0, x21, #0x8
1002fe41c:     	bl	0x10001022c
1002fe420:     	cbz	w20, 0x1002fe99c
1002fe424:     	sub	x0, x29, #0xc0
1002fe428:     	mov	w1, #0x1                ; =1
1002fe42c:     	bl	0x1020b356c
1002fe430:     	sub	x0, x29, #0xc0
1002fe434:     	mov	x1, x19
1002fe438:     	bl	0x1020b3694
1002fe43c:     	b	0x1002fe99c
1002fe440:     	str	xzr, [sp, #0x130]
1002fe444:     	add	x8, sp, #0x118
1002fe448:     	add	x22, x8, #0x8
1002fe44c:     	stp	xzr, xzr, [sp, #0x118]
1002fe450:     	add	x25, sp, #0x128
1002fe454:     	add	x0, sp, #0x118
1002fe458:     	bl	0x1021252b8
1002fe45c:     	mov	x23, x0
1002fe460:     	mov	x0, x22
1002fe464:     	bl	0x10001022c
1002fe468:     	cbz	w23, 0x1002fe98c
1002fe46c:     	ldr	x0, [sp, #0x128]
1002fe470:     	add	x8, sp, #0x108
1002fe474:     	bl	0x10290e8e8
1002fe478:     	stp	xzr, xzr, [sp, #0xf0]
1002fe47c:     	ldr	x0, [sp, #0x108]
1002fe480:     	bl	0x102572c1c
1002fe484:     	cbnz	w0, 0x1002fe4d0
1002fe488:     	ldr	x0, [sp, #0x108]
1002fe48c:     	mov	w1, #0x1                ; =1
1002fe490:     	bl	0x102573eec
1002fe494:     	cbz	w0, 0x1002fe4f8
1002fe498:     	ldr	x0, [sp, #0x108]
1002fe49c:     	add	x22, sp, #0x80
1002fe4a0:     	add	x8, sp, #0x80
1002fe4a4:     	bl	0x102572968
1002fe4a8:     	mov	x8, sp
1002fe4ac:     	ldr	q0, [sp, #0x80]
1002fe4b0:     	stp	xzr, xzr, [sp, #0x80]
1002fe4b4:     	ldr	q1, [sp, #0xf0]
1002fe4b8:     	str	q0, [sp, #0xf0]
1002fe4bc:     	str	q1, [sp]
1002fe4c0:     	orr	x0, x8, #0x8
1002fe4c4:     	bl	0x10001022c
1002fe4c8:     	orr	x0, x22, #0x8
1002fe4cc:     	bl	0x10001022c
1002fe4d0:     	ldr	x0, [sp, #0xf0]
1002fe4d4:     	cbz	x0, 0x1002fe4e0
1002fe4d8:     	mov	w23, #0x0               ; =0
1002fe4dc:     	b	0x1002fe55c
1002fe4e0:     	ldr	x0, [sp, #0x108]
1002fe4e4:     	bl	0x102572c0c
1002fe4e8:     	cbz	w0, 0x1002fe710
1002fe4ec:     	mov	w23, #0x0               ; =0
1002fe4f0:     	mov	w22, #0x0               ; =0
1002fe4f4:     	b	0x1002fe554
1002fe4f8:     	ldp	x9, x8, [sp, #0x108]
1002fe4fc:     	stp	x9, x8, [sp, #0xe0]
1002fe500:     	cbz	x8, 0x1002fe510
1002fe504:     	add	x8, x8, #0x8
1002fe508:     	mov	w9, #0x1                ; =1
1002fe50c:     	ldadd	w9, w8, [x8]
1002fe510:     	add	x23, sp, #0xe0
1002fe514:     	add	x0, sp, #0xe0
1002fe518:     	bl	0x1027765ec
1002fe51c:     	mov	x22, x0
1002fe520:     	add	x0, x23, #0x8
1002fe524:     	bl	0x10001022c
1002fe528:     	cbz	w22, 0x1002fe4d0
1002fe52c:     	ldr	x0, [sp, #0x108]
1002fe530:     	mov	x8, sp
1002fe534:     	bl	0x102572968
1002fe538:     	ldr	x0, [sp]
1002fe53c:     	bl	0x10368b4e0
1002fe540:     	mov	x22, x0
1002fe544:     	mov	x8, sp
1002fe548:     	add	x0, x8, #0x8
1002fe54c:     	bl	0x10001022c
1002fe550:     	mov	w23, #0x1               ; =1
1002fe554:     	ldr	x0, [sp, #0xf0]
1002fe558:     	cbz	x0, 0x1002fe704
1002fe55c:     	bl	0x10368b4e0
1002fe560:     	mov	x22, x0
1002fe564:     	ldr	x8, [sp, #0xf0]
1002fe568:     	cmp	x8, #0x0
1002fe56c:     	cset	w8, ne
1002fe570:     	tbnz	w23, #0x0, 0x1002fe578
1002fe574:     	cbz	w8, 0x1002fe974
1002fe578:     	str	wzr, [sp, #0xd8]
1002fe57c:     	mov	x8, #0x4024000000000000 ; =4621819117588971520
1002fe580:     	str	x8, [sp, #0xd0]
1002fe584:     	cmp	w22, #0x0
1002fe588:     	cset	w8, eq
1002fe58c:     	lsl	w8, w8, #1
1002fe590:     	str	w8, [sp, #0xcc]
1002fe594:     	adrp	x0, 0x104d13000
1002fe598:     	add	x0, x0, #0x568
1002fe59c:     	bl	0x10214de74
1002fe5a0:     	mov	x23, x0
1002fe5a4:     	adrp	x1, 0x1045de000
1002fe5a8:     	add	x1, x1, #0xdc1 STRING 'dialogbox'
1002fe5ac:     	mov	x0, sp
1002fe5b0:     	bl	0x10311cb20
1002fe5b4:     	add	x8, sp, #0xb8
1002fe5b8:     	mov	x1, sp
1002fe5bc:     	mov	x0, x23
1002fe5c0:     	bl	0x1032f6944
1002fe5c4:     	mov	x0, sp
1002fe5c8:     	bl	0x10311cb54
1002fe5cc:     	bl	0x10339db98
1002fe5d0:     	adrp	x26, 0x104afb000
1002fe5d4:     	add	x26, x26, #0xb10
1002fe5d8:     	cbz	w20, 0x1002fe610
1002fe5dc:     	ldr	x1, [x26]
1002fe5e0:     	mov	x0, sp
1002fe5e4:     	bl	0x10311cb20
1002fe5e8:     	add	x0, sp, #0xd0
1002fe5ec:     	add	x1, sp, #0x138
1002fe5f0:     	mov	x2, sp
1002fe5f4:     	bl	0x1031fd32c
1002fe5f8:     	mov	x23, x0
1002fe5fc:     	mov	x0, sp
1002fe600:     	bl	0x10311cb54
1002fe604:     	cbz	w23, 0x1002fe768
1002fe608:     	mov	w23, #0x1               ; =1
1002fe60c:     	b	0x1002fe774
1002fe610:     	mov	x23, x0
1002fe614:     	ldr	x24, [sp, #0xb8]
1002fe618:     	cbz	x24, 0x1002fe6d4
1002fe61c:     	adrp	x1, 0x1045e3000
1002fe620:     	add	x1, x1, #0x394 STRING 'drawonrulerdialogbox'
1002fe624:     	mov	x0, sp
1002fe628:     	bl	0x10311cb20
1002fe62c:     	adrp	x1, 0x1045e3000
1002fe630:     	add	x1, x1, #0x3a9 STRING 'brushSize'
1002fe634:     	add	x0, sp, #0x80
1002fe638:     	bl	0x10311cb20
1002fe63c:     	mov	x1, sp
1002fe640:     	add	x2, sp, #0x80
1002fe644:     	add	x3, sp, #0xd0
1002fe648:     	mov	x0, x24
1002fe64c:     	bl	0x1032f9c04
1002fe650:     	add	x0, sp, #0x80
1002fe654:     	bl	0x10311cb54
1002fe658:     	mov	x0, sp
1002fe65c:     	bl	0x10311cb54
1002fe660:     	cbnz	w22, 0x1002fe6d4
1002fe664:     	ldr	x24, [sp, #0xb8]
1002fe668:     	adrp	x1, 0x1045e3000
1002fe66c:     	add	x1, x1, #0x394 STRING 'drawonrulerdialogbox'
1002fe670:     	mov	x0, sp
1002fe674:     	bl	0x10311cb20
1002fe678:     	adrp	x1, 0x1045e3000
1002fe67c:     	add	x1, x1, #0x3b3 STRING 'antiAlias'
1002fe680:     	add	x0, sp, #0x80
1002fe684:     	bl	0x10311cb20
1002fe688:     	add	x8, sp, #0xcc
1002fe68c:     	str	x8, [sp, #0x68]
1002fe690:     	add	x0, sp, #0x70
1002fe694:     	add	x1, sp, #0x68
1002fe698:     	bl	0x10366ec8c
1002fe69c:     	mov	x1, sp
1002fe6a0:     	add	x2, sp, #0x80
1002fe6a4:     	add	x3, sp, #0x70
1002fe6a8:     	mov	x0, x24
1002fe6ac:     	bl	0x1032f7918
1002fe6b0:     	ldr	x0, [sp, #0x78]
1002fe6b4:     	cbz	x0, 0x1002fe6c4
1002fe6b8:     	ldr	x8, [x0]
1002fe6bc:     	ldr	x8, [x8, #0x8]
1002fe6c0:     	blr	x8
1002fe6c4:     	add	x0, sp, #0x80
1002fe6c8:     	bl	0x10311cb54
1002fe6cc:     	mov	x0, sp
1002fe6d0:     	bl	0x10311cb54
1002fe6d4:     	ldr	w8, [sp, #0xd8]
1002fe6d8:     	cmp	w8, w23
1002fe6dc:     	b.eq	0x1002fe6fc
1002fe6e0:     	ldr	x0, [sp, #0x128]
1002fe6e4:     	bl	0x102915430
1002fe6e8:     	ldp	x0, x1, [sp, #0xd0]
1002fe6ec:     	mov	x2, x23
1002fe6f0:     	bl	0x1022180a0
1002fe6f4:     	str	d0, [sp, #0xd0]
1002fe6f8:     	str	w23, [sp, #0xd8]
1002fe6fc:     	mov	w23, #0x1               ; =1
1002fe700:     	b	0x1002fe7b0
1002fe704:     	mov	w8, #0x0                ; =0
1002fe708:     	tbz	w23, #0x0, 0x1002fe574
1002fe70c:     	b	0x1002fe578
1002fe710:     	ldr	x0, [sp, #0x108]
1002fe714:     	mov	w1, #0x2                ; =2
1002fe718:     	bl	0x102573eec
1002fe71c:     	cbz	w0, 0x1002fe4ec
1002fe720:     	ldr	x0, [sp, #0x108]
1002fe724:     	bl	0x102575634
1002fe728:     	cbz	w0, 0x1002fe4ec
1002fe72c:     	ldr	x0, [sp, #0x108]
1002fe730:     	add	x22, sp, #0x80
1002fe734:     	add	x8, sp, #0x80
1002fe738:     	bl	0x102572984
1002fe73c:     	mov	x8, sp
1002fe740:     	ldr	q0, [sp, #0x80]
1002fe744:     	stp	xzr, xzr, [sp, #0x80]
1002fe748:     	ldr	q1, [sp, #0xf0]
1002fe74c:     	str	q0, [sp, #0xf0]
1002fe750:     	str	q1, [sp]
1002fe754:     	orr	x0, x8, #0x8
1002fe758:     	bl	0x10001022c
1002fe75c:     	orr	x0, x22, #0x8
1002fe760:     	bl	0x10001022c
1002fe764:     	b	0x1002fe4ec
1002fe768:     	mov	x0, x19
1002fe76c:     	bl	0x102820570
1002fe770:     	mov	w23, #0x0               ; =0
1002fe774:     	cbnz	w22, 0x1002fe7b0
1002fe778:     	adrp	x8, 0x104afb000
1002fe77c:     	add	x8, x8, #0xb18
1002fe780:     	ldr	x1, [x8]
1002fe784:     	mov	x0, sp
1002fe788:     	bl	0x10311cb20
1002fe78c:     	add	x0, sp, #0x138
1002fe790:     	add	x1, sp, #0x80
1002fe794:     	mov	x2, sp
1002fe798:     	bl	0x1031fa6c4
1002fe79c:     	cbz	w0, 0x1002fe7a8
1002fe7a0:     	ldr	x8, [sp, #0x80]
1002fe7a4:     	str	w8, [sp, #0xcc]
1002fe7a8:     	mov	x0, sp
1002fe7ac:     	bl	0x10311cb54
1002fe7b0:     	cbz	w21, 0x1002fe890
1002fe7b4:     	cbz	w23, 0x1002fe890
1002fe7b8:     	cmp	w22, #0x0
1002fe7bc:     	cset	w0, eq
1002fe7c0:     	add	x1, sp, #0xd0
1002fe7c4:     	add	x2, sp, #0xcc
1002fe7c8:     	bl	0x1005ef16c
1002fe7cc:     	cbz	w0, 0x1002fe960
1002fe7d0:     	cbnz	w20, 0x1002fe894
1002fe7d4:     	ldr	x19, [sp, #0xb8]
1002fe7d8:     	cbz	x19, 0x1002fe894
1002fe7dc:     	adrp	x1, 0x1045e3000
1002fe7e0:     	add	x1, x1, #0x394 STRING 'drawonrulerdialogbox'
1002fe7e4:     	mov	x0, sp
1002fe7e8:     	bl	0x10311cb20
1002fe7ec:     	adrp	x1, 0x1045e3000
1002fe7f0:     	add	x1, x1, #0x3a9 STRING 'brushSize'
1002fe7f4:     	add	x0, sp, #0x80
1002fe7f8:     	bl	0x10311cb20
1002fe7fc:     	mov	x1, sp
1002fe800:     	add	x2, sp, #0x80
1002fe804:     	add	x3, sp, #0xd0
1002fe808:     	mov	x0, x19
1002fe80c:     	bl	0x1032f9a98
1002fe810:     	add	x0, sp, #0x80
1002fe814:     	bl	0x10311cb54
1002fe818:     	mov	x0, sp
1002fe81c:     	bl	0x10311cb54
1002fe820:     	cbnz	w22, 0x1002fe894
1002fe824:     	ldr	x19, [sp, #0xb8]
1002fe828:     	adrp	x1, 0x1045e3000
1002fe82c:     	add	x1, x1, #0x394 STRING 'drawonrulerdialogbox'
1002fe830:     	mov	x0, sp
1002fe834:     	bl	0x10311cb20
1002fe838:     	adrp	x1, 0x1045e3000
1002fe83c:     	add	x1, x1, #0x3b3 STRING 'antiAlias'
1002fe840:     	add	x0, sp, #0x80
1002fe844:     	bl	0x10311cb20
1002fe848:     	ldr	w1, [sp, #0xcc]
1002fe84c:     	add	x0, sp, #0x58
1002fe850:     	bl	0x10366d99c
1002fe854:     	mov	x1, sp
1002fe858:     	add	x2, sp, #0x80
1002fe85c:     	add	x3, sp, #0x58
1002fe860:     	mov	x0, x19
1002fe864:     	bl	0x1032f7bfc
1002fe868:     	ldr	x0, [sp, #0x60]
1002fe86c:     	cbz	x0, 0x1002fe87c
1002fe870:     	ldr	x8, [x0]
1002fe874:     	ldr	x8, [x8, #0x8]
1002fe878:     	blr	x8
1002fe87c:     	add	x0, sp, #0x80
1002fe880:     	bl	0x10311cb54
1002fe884:     	mov	x0, sp
1002fe888:     	bl	0x10311cb54
1002fe88c:     	b	0x1002fe894
1002fe890:     	cbz	w23, 0x1002fe968
1002fe894:     	ldp	x9, x8, [sp, #0x128]
1002fe898:     	stp	x9, x8, [sp, #0x48]
1002fe89c:     	cbz	x8, 0x1002fe8ac
1002fe8a0:     	add	x8, x8, #0x8
1002fe8a4:     	mov	w9, #0x1                ; =1
1002fe8a8:     	ldadd	w9, w8, [x8]
1002fe8ac:     	add	x20, sp, #0x48
1002fe8b0:     	ldp	x1, x2, [sp, #0xd0]
1002fe8b4:     	ldr	w3, [sp, #0xcc]
1002fe8b8:     	add	x0, sp, #0x48
1002fe8bc:     	bl	0x1003cf288
1002fe8c0:     	add	x0, x20, #0x8
1002fe8c4:     	bl	0x10001022c
1002fe8c8:     	bl	0x102821f24
1002fe8cc:     	cbz	w0, 0x1002fe968
1002fe8d0:     	mov	x0, sp
1002fe8d4:     	bl	0x1031f9dcc
1002fe8d8:     	ldr	x1, [x26]
1002fe8dc:     	add	x0, sp, #0x80
1002fe8e0:     	bl	0x10311cb20
1002fe8e4:     	mov	x0, sp
1002fe8e8:     	add	x1, sp, #0x80
1002fe8ec:     	add	x2, sp, #0xd0
1002fe8f0:     	bl	0x1031fd2b8
1002fe8f4:     	add	x0, sp, #0x80
1002fe8f8:     	bl	0x10311cb54
1002fe8fc:     	cbnz	w22, 0x1002fe92c
1002fe900:     	adrp	x8, 0x104afb000
1002fe904:     	add	x8, x8, #0xb18
1002fe908:     	ldr	x1, [x8]
1002fe90c:     	add	x0, sp, #0x80
1002fe910:     	bl	0x10311cb20
1002fe914:     	ldrsw	x2, [sp, #0xcc]
1002fe918:     	mov	x0, sp
1002fe91c:     	add	x1, sp, #0x80
1002fe920:     	bl	0x1031fa218
1002fe924:     	add	x0, sp, #0x80
1002fe928:     	bl	0x10311cb54
1002fe92c:     	adrp	x8, 0x104afb000
1002fe930:     	add	x8, x8, #0x488
1002fe934:     	ldr	x1, [x8]
1002fe938:     	add	x0, sp, #0x80
1002fe93c:     	bl	0x10311cb20
1002fe940:     	add	x0, sp, #0x80
1002fe944:     	mov	x1, sp
1002fe948:     	bl	0x1028224a0
1002fe94c:     	add	x0, sp, #0x80
1002fe950:     	bl	0x10311cb54
1002fe954:     	mov	x0, sp
1002fe958:     	bl	0x1031f9ec0
1002fe95c:     	b	0x1002fe968
1002fe960:     	mov	x0, x19
1002fe964:     	bl	0x102820528
1002fe968:     	add	x8, sp, #0xb8
1002fe96c:     	add	x0, x8, #0x8
1002fe970:     	bl	0x10001022c
1002fe974:     	add	x8, sp, #0xf0
1002fe978:     	orr	x0, x8, #0x8
1002fe97c:     	bl	0x10001022c
1002fe980:     	add	x8, sp, #0x108
1002fe984:     	add	x0, x8, #0x8
1002fe988:     	bl	0x10001022c
1002fe98c:     	add	x0, x25, #0x8
1002fe990:     	bl	0x10001022c
1002fe994:     	add	x0, sp, #0x138
1002fe998:     	bl	0x1031f9ec0
1002fe99c:     	sub	x0, x29, #0xc0
1002fe9a0:     	bl	0x1020b3498
1002fe9a4:     	mov	w0, #0x1                ; =1
1002fe9a8:     	add	sp, sp, #0x200
1002fe9ac:     	ldp	x29, x30, [sp, #0x50]
1002fe9b0:     	ldp	x20, x19, [sp, #0x40]
1002fe9b4:     	ldp	x22, x21, [sp, #0x30]
1002fe9b8:     	ldp	x24, x23, [sp, #0x20]
1002fe9bc:     	ldp	x26, x25, [sp, #0x10]
1002fe9c0:     	ldp	x28, x27, [sp], #0x60
1002fe9c4:     	ret
1002fe9c8:     	mov	x19, x0
1002fe9cc:     	ldr	x0, [sp, #0x60]
1002fe9d0:     	cbnz	x0, 0x1002fe9fc
1002fe9d4:     	b	0x1002fea40
1002fe9d8:     	b	0x1002fea3c
1002fe9dc:     	b	0x1002feaa4
1002fe9e0:     	b	0x1002fead4
1002fe9e4:     	b	0x1002fea3c
1002fe9e8:     	b	0x1002feaa4
1002fe9ec:     	b	0x1002fead4
1002fe9f0:     	mov	x19, x0
1002fe9f4:     	ldr	x0, [sp, #0x78]
1002fe9f8:     	cbz	x0, 0x1002fea40
1002fe9fc:     	ldr	x8, [x0]
1002fea00:     	ldr	x8, [x8, #0x8]
1002fea04:     	blr	x8
1002fea08:     	b	0x1002fea40
1002fea0c:     	b	0x1002fea3c
1002fea10:     	b	0x1002feaa4
1002fea14:     	b	0x1002fead4
1002fea18:     	b	0x1002feb0c
1002fea1c:     	b	0x1002fea6c
1002fea20:     	b	0x1002fea7c
1002fea24:     	mov	x19, x0
1002fea28:     	mov	x8, sp
1002fea2c:     	b	0x1002feadc
1002fea30:     	b	0x1002feb0c
1002fea34:     	b	0x1002feaa4
1002fea38:     	b	0x1002fead4
1002fea3c:     	mov	x19, x0
1002fea40:     	add	x0, sp, #0x80
1002fea44:     	bl	0x10311cb54
1002fea48:     	b	0x1002feaa8
1002fea4c:     	b	0x1002feaa4
1002fea50:     	b	0x1002fead4
1002fea54:     	mov	x19, x0
1002fea58:     	add	x0, x23, #0x8
1002fea5c:     	b	0x1002feae0
1002fea60:     	b	0x1002fead4
1002fea64:     	b	0x1002fea6c
1002fea68:     	b	0x1002fea7c
1002fea6c:     	mov	x19, x0
1002fea70:     	add	x0, sp, #0x80
1002fea74:     	bl	0x10311cb54
1002fea78:     	b	0x1002fea80
1002fea7c:     	mov	x19, x0
1002fea80:     	mov	x0, sp
1002fea84:     	bl	0x1031f9ec0
1002fea88:     	b	0x1002fead8
1002fea8c:     	b	0x1002fead4
1002fea90:     	b	0x1002feb0c
1002fea94:     	mov	x19, x0
1002fea98:     	add	x0, x20, #0x8
1002fea9c:     	bl	0x10001022c
1002feaa0:     	b	0x1002fead8
1002feaa4:     	mov	x19, x0
1002feaa8:     	mov	x0, sp
1002feaac:     	bl	0x10311cb54
1002feab0:     	b	0x1002fead8
1002feab4:     	b	0x1002fead4
1002feab8:     	b	0x1002fead4
1002feabc:     	mov	x19, x0
1002feac0:     	mov	x0, sp
1002feac4:     	bl	0x10311cb54
1002feac8:     	b	0x1002feb10
1002feacc:     	b	0x1002feb0c
1002fead0:     	b	0x1002feb0c
1002fead4:     	mov	x19, x0
1002fead8:     	add	x8, sp, #0xb8
1002feadc:     	add	x0, x8, #0x8
1002feae0:     	bl	0x10001022c
1002feae4:     	b	0x1002feb10
1002feae8:     	mov	x19, x0
1002feaec:     	b	0x1002feb28
1002feaf0:     	mov	x19, x0
1002feaf4:     	mov	x0, x22
1002feaf8:     	b	0x1002feb24
1002feafc:     	b	0x1002feb00
1002feb00:     	mov	x19, x0
1002feb04:     	b	0x1002feb30
1002feb08:     	b	0x1002feb4c
1002feb0c:     	mov	x19, x0
1002feb10:     	add	x8, sp, #0xf0
1002feb14:     	orr	x0, x8, #0x8
1002feb18:     	bl	0x10001022c
1002feb1c:     	add	x8, sp, #0x108
1002feb20:     	add	x0, x8, #0x8
1002feb24:     	bl	0x10001022c
1002feb28:     	add	x0, x25, #0x8
1002feb2c:     	bl	0x10001022c
1002feb30:     	add	x0, sp, #0x138
1002feb34:     	bl	0x1031f9ec0
1002feb38:     	b	0x1002feb50
1002feb3c:     	mov	x19, x0
1002feb40:     	add	x0, x21, #0x8
1002feb44:     	bl	0x10001022c
1002feb48:     	b	0x1002feb50
1002feb4c:     	mov	x19, x0
1002feb50:     	sub	x0, x29, #0xc0
1002feb54:     	bl	0x1020b3498
1002feb58:     	mov	x0, x19
1002feb5c:     	bl	0x103bda970

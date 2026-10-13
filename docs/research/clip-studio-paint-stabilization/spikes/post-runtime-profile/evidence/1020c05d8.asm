
FUNCTION 0x1020c05d8 size 592
1020c05d8:     	sub	sp, sp, #0xe0
1020c05dc:     	stp	x24, x23, [sp, #0xa0]
1020c05e0:     	stp	x22, x21, [sp, #0xb0]
1020c05e4:     	stp	x20, x19, [sp, #0xc0]
1020c05e8:     	stp	x29, x30, [sp, #0xd0]
1020c05ec:     	add	x29, sp, #0xd0
1020c05f0:     	mov	x20, x0
1020c05f4:     	mov	x19, x8
1020c05f8:     	mov	x0, x8
1020c05fc:     	mov	x1, x20
1020c0600:     	bl	0x10311643c
1020c0604:     	add	x0, x19, #0x10
1020c0608:     	add	x1, x20, #0x10
1020c060c:     	bl	0x10311643c
1020c0610:     	bl	0x102194e64
1020c0614:     	cmp	w0, #0x1
1020c0618:     	b.ne	0x1020c0740
1020c061c:     	adrp	x8, 0x104b22000
1020c0620:     	ldr	w20, [x8, #0x80]
1020c0624:     	adrp	x8, 0x104c8f000
1020c0628:     	add	x8, x8, #0xf28
1020c062c:     	ldaprb	w8, [x8]
1020c0630:     	tbz	w8, #0x0, 0x1020c0804
1020c0634:     	adrp	x21, 0x104c8f000
1020c0638:     	add	x21, x21, #0xf30
1020c063c:     	ldrb	w8, [x21]
1020c0640:     	ldr	w9, [x21, #0x8]
1020c0644:     	cmp	w8, #0x1
1020c0648:     	ccmp	w9, w20, #0x0, eq
1020c064c:     	b.eq	0x1020c0718
1020c0650:     	add	x22, sp, #0x8
1020c0654:     	add	x0, x22, #0x8
1020c0658:     	bl	0x1031163b8
1020c065c:     	sub	x0, x29, #0x60
1020c0660:     	bl	0x10311c5e8
1020c0664:     	add	x1, sp, #0x68
1020c0668:     	add	x2, sp, #0x64
1020c066c:     	mov	x3, x20
1020c0670:     	bl	0x1020d2d64
1020c0674:     	ldr	d0, [sp, #0x68]
1020c0678:     	fcvtzs	x1, d0, #0x8
1020c067c:     	add	x0, sp, #0x50
1020c0680:     	mov	w2, #0x900              ; =2304
1020c0684:     	bl	0x103116408
1020c0688:     	str	w20, [sp, #0x8]
1020c068c:     	add	x0, sp, #0x30
1020c0690:     	add	x1, sp, #0x50
1020c0694:     	bl	0x10311643c
1020c0698:     	add	x20, sp, #0x20
1020c069c:     	add	x0, sp, #0x20
1020c06a0:     	mov	w1, #0x1                ; =1
1020c06a4:     	bl	0x1031163d4
1020c06a8:     	add	x23, sp, #0x30
1020c06ac:     	add	x0, sp, #0x20
1020c06b0:     	add	x1, sp, #0x30
1020c06b4:     	bl	0x1004dfec0
1020c06b8:     	cmp	w0, #0x0
1020c06bc:     	csel	x1, x23, x20, ne
1020c06c0:     	add	x0, sp, #0x40
1020c06c4:     	bl	0x10311643c
1020c06c8:     	add	x0, x22, #0x8
1020c06cc:     	add	x1, sp, #0x40
1020c06d0:     	bl	0x103116448
1020c06d4:     	sub	x0, x29, #0x60
1020c06d8:     	bl	0x10311cb54
1020c06dc:     	ldrb	w8, [x21]
1020c06e0:     	ldr	w9, [sp, #0x8]
1020c06e4:     	str	w9, [x21, #0x8]
1020c06e8:     	cmp	w8, #0x1
1020c06ec:     	b.ne	0x1020c0704
1020c06f0:     	adrp	x0, 0x104c8f000
1020c06f4:     	add	x0, x0, #0xf40
1020c06f8:     	add	x1, x22, #0x8
1020c06fc:     	bl	0x103116448
1020c0700:     	b	0x1020c0718
1020c0704:     	add	x0, x21, #0x10
1020c0708:     	add	x1, x22, #0x8
1020c070c:     	bl	0x10311643c
1020c0710:     	mov	w8, #0x1                ; =1
1020c0714:     	strb	w8, [x21]
1020c0718:     	adrp	x1, 0x104c8f000
1020c071c:     	add	x1, x1, #0xf40
1020c0720:     	sub	x0, x29, #0x60
1020c0724:     	bl	0x10311643c
1020c0728:     	sub	x1, x29, #0x60
1020c072c:     	mov	x0, x19
1020c0730:     	bl	0x100652310
1020c0734:     	add	x0, x19, #0x10
1020c0738:     	sub	x1, x29, #0x60
1020c073c:     	bl	0x100652310
1020c0740:     	adrp	x9, 0x104c8f000
1020c0744:     	add	x9, x9, #0xef0
1020c0748:     	ldp	x10, x8, [x9]
1020c074c:     	cmp	x8, #0x1
1020c0750:     	ccmp	x10, #0x0, #0x0, eq
1020c0754:     	b.eq	0x1020c07ec
1020c0758:     	sdiv	x9, x10, x8
1020c075c:     	msub	x10, x9, x8, x10
1020c0760:     	tbz	x10, #0x3f, 0x1020c07c8
1020c0764:     	add	x10, x8, x10
1020c0768:     	bic	x11, x10, x10, asr #63
1020c076c:     	add	x12, x10, x10, lsr #63
1020c0770:     	sub	x11, x11, x12
1020c0774:     	udiv	x8, x11, x8
1020c0778:     	add	x10, x8, x10, lsr #63
1020c077c:     	and	x8, x10, #0xfffffffffffffffe
1020c0780:     	movi.2d	v0, #0000000000000000
1020c0784:     	mov.d	v0[0], x9
1020c0788:     	dup.2d	v1, x10
1020c078c:     	mov	x9, #-0x2               ; =-2
1020c0790:     	movi.2d	v3, #0xffffffffffffffff
1020c0794:     	mov.16b	v2, v0
1020c0798:     	add.2d	v0, v0, v3
1020c079c:     	add	x9, x9, #0x2
1020c07a0:     	cmp	x8, x9
1020c07a4:     	b.ne	0x1020c0794
1020c07a8:     	dup.2d	v3, x9
1020c07ac:     	adrp	x8, 0x1042e7000
1020c07b0:     	ldr	q4, [x8, #0xcc0]
1020c07b4:     	orr.16b	v3, v3, v4
1020c07b8:     	cmhi.2d	v1, v3, v1
1020c07bc:     	bit.16b	v0, v2, v1
1020c07c0:     	addp.2d	d0, v0
1020c07c4:     	fmov	x9, d0
1020c07c8:     	tbnz	x9, #0x3f, 0x1020c07ec
1020c07cc:     	adrp	x20, 0x104c8f000
1020c07d0:     	add	x20, x20, #0xef0
1020c07d4:     	mov	x0, x19
1020c07d8:     	mov	x1, x20
1020c07dc:     	bl	0x100652310
1020c07e0:     	add	x0, x19, #0x10
1020c07e4:     	mov	x1, x20
1020c07e8:     	bl	0x100652310
1020c07ec:     	ldp	x29, x30, [sp, #0xd0]
1020c07f0:     	ldp	x20, x19, [sp, #0xc0]
1020c07f4:     	ldp	x22, x21, [sp, #0xb0]
1020c07f8:     	ldp	x24, x23, [sp, #0xa0]
1020c07fc:     	add	sp, sp, #0xe0
1020c0800:     	ret
1020c0804:     	bl	0x103bd5fc8
1020c0808:     	b	0x1020c0634
1020c080c:     	b	0x1020c0814
1020c0810:     	b	0x1020c0814
1020c0814:     	mov	x19, x0
1020c0818:     	sub	x0, x29, #0x60
1020c081c:     	bl	0x10311cb54
1020c0820:     	mov	x0, x19
1020c0824:     	bl	0x103bda970


FUNCTION 0x1028da58c size 1260
1028da58c:     	sub	sp, sp, #0x1c0
1028da590:     	stp	d11, d10, [sp, #0x140]
1028da594:     	stp	d9, d8, [sp, #0x150]
1028da598:     	stp	x28, x27, [sp, #0x160]
1028da59c:     	stp	x26, x25, [sp, #0x170]
1028da5a0:     	stp	x24, x23, [sp, #0x180]
1028da5a4:     	stp	x22, x21, [sp, #0x190]
1028da5a8:     	stp	x20, x19, [sp, #0x1a0]
1028da5ac:     	stp	x29, x30, [sp, #0x1b0]
1028da5b0:     	add	x29, sp, #0x1b0
1028da5b4:     	str	x3, [sp, #0x8]
1028da5b8:     	mov	x20, x2
1028da5bc:     	mov	x21, x1
1028da5c0:     	fmov	d8, d0
1028da5c4:     	mov	x22, x0
1028da5c8:     	mov	x24, x8
1028da5cc:     	ldp	w9, w8, [x29, #0x10]
1028da5d0:     	cmp	w4, #0x0
1028da5d4:     	cset	w10, ne
1028da5d8:     	mov	w11, #0x2               ; =2
1028da5dc:     	cinc	w11, w11, ne
1028da5e0:     	cmp	w5, #0x0
1028da5e4:     	csel	w10, w10, w11, eq
1028da5e8:     	orr	w11, w10, #0x4
1028da5ec:     	cmp	w6, #0x0
1028da5f0:     	csel	w10, w10, w11, eq
1028da5f4:     	orr	w11, w10, #0x8
1028da5f8:     	cmp	w7, #0x0
1028da5fc:     	csel	w10, w11, w10, eq
1028da600:     	orr	w11, w10, #0x10
1028da604:     	cmp	w9, #0x0
1028da608:     	csel	w9, w10, w11, eq
1028da60c:     	orr	w10, w9, #0x20
1028da610:     	cmp	w8, #0x0
1028da614:     	csel	w26, w9, w10, eq
1028da618:     	stur	wzr, [x29, #-0x7c]
1028da61c:     	cbz	w7, 0x1028da66c
1028da620:     	ldr	x0, [x22]
1028da624:     	sub	x8, x29, #0x90
1028da628:     	add	x19, x8, #0x8
1028da62c:     	ldp	x9, x8, [x21]
1028da630:     	stp	x9, x8, [x29, #-0x90]
1028da634:     	cbz	x8, 0x1028da644
1028da638:     	add	x8, x8, #0x8
1028da63c:     	mov	w9, #0x1                ; =1
1028da640:     	ldadd	w9, w8, [x8]
1028da644:     	sub	x2, x29, #0x90
1028da648:     	sub	x3, x29, #0x7c
1028da64c:     	mov	w1, #0x776              ; =1910
1028da650:     	bl	0x100f0f7cc
1028da654:     	mov	x0, x19
1028da658:     	bl	0x10001022c
1028da65c:     	ldur	w8, [x29, #-0x7c]
1028da660:     	orr	w9, w26, #0x20000000
1028da664:     	cmp	w8, #0x0
1028da668:     	csel	w26, w26, w9, eq
1028da66c:     	sub	x8, x29, #0xa0
1028da670:     	add	x19, x8, #0x8
1028da674:     	ldp	x9, x8, [x20]
1028da678:     	stp	x9, x8, [x29, #-0xa0]
1028da67c:     	cbz	x8, 0x1028da68c
1028da680:     	add	x8, x8, #0x8
1028da684:     	mov	w9, #0x1                ; =1
1028da688:     	ldadd	w9, w8, [x8]
1028da68c:     	sub	x0, x29, #0xa0
1028da690:     	bl	0x102992930
1028da694:     	fmov	d10, d0
1028da698:     	mov	x0, x19
1028da69c:     	bl	0x10001022c
1028da6a0:     	sub	x8, x29, #0xb0
1028da6a4:     	add	x19, x8, #0x8
1028da6a8:     	ldp	x9, x8, [x20]
1028da6ac:     	stp	x9, x8, [x29, #-0xb0]
1028da6b0:     	cbz	x8, 0x1028da6c0
1028da6b4:     	add	x8, x8, #0x8
1028da6b8:     	mov	w9, #0x1                ; =1
1028da6bc:     	ldadd	w9, w8, [x8]
1028da6c0:     	sub	x0, x29, #0xb0
1028da6c4:     	bl	0x102992c38
1028da6c8:     	fmov	d9, d0
1028da6cc:     	mov	x0, x19
1028da6d0:     	bl	0x10001022c
1028da6d4:     	sub	x8, x29, #0xc0
1028da6d8:     	add	x19, x8, #0x8
1028da6dc:     	ldp	x9, x8, [x20]
1028da6e0:     	stp	x9, x8, [x29, #-0xc0]
1028da6e4:     	cbz	x8, 0x1028da6f4
1028da6e8:     	add	x8, x8, #0x8
1028da6ec:     	mov	w9, #0x1                ; =1
1028da6f0:     	ldadd	w9, w8, [x8]
1028da6f4:     	sub	x0, x29, #0xc0
1028da6f8:     	bl	0x102992eb8
1028da6fc:     	mov	x25, x0
1028da700:     	mov	x0, x19
1028da704:     	bl	0x10001022c
1028da708:     	orr	w8, w26, #0x1000000
1028da70c:     	cmp	w25, #0x0
1028da710:     	csel	w26, w26, w8, eq
1028da714:     	ldp	x9, x8, [x20]
1028da718:     	sub	x10, x29, #0xd0
1028da71c:     	add	x19, x10, #0x8
1028da720:     	stp	x9, x8, [x29, #-0xd0]
1028da724:     	cbz	x8, 0x1028da734
1028da728:     	add	x8, x8, #0x8
1028da72c:     	mov	w9, #0x1                ; =1
1028da730:     	ldadd	w9, w8, [x8]
1028da734:     	sub	x0, x29, #0xd0
1028da738:     	bl	0x102992f64
1028da73c:     	mov	x25, x0
1028da740:     	mov	x0, x19
1028da744:     	bl	0x10001022c
1028da748:     	orr	w8, w26, #0x2000000
1028da74c:     	cmp	w25, #0x0
1028da750:     	csel	w25, w26, w8, eq
1028da754:     	stp	xzr, xzr, [sp, #0xd0]
1028da758:     	add	x19, sp, #0xd0
1028da75c:     	add	x0, sp, #0xd0
1028da760:     	mov	x8, x24
1028da764:     	bl	0x1024c11e4
1028da768:     	add	x0, x19, #0x8
1028da76c:     	bl	0x10001022c
1028da770:     	ldr	x9, [x24]
1028da774:     	mov	x19, x24
1028da778:     	ldr	x8, [x19, #0x8]!
1028da77c:     	stp	x9, x8, [sp, #0xc0]
1028da780:     	cbz	x8, 0x1028da790
1028da784:     	add	x8, x8, #0x8
1028da788:     	mov	w9, #0x1                ; =1
1028da78c:     	ldadd	w9, w8, [x8]
1028da790:     	adrp	x8, 0x1042ee000
1028da794:     	ldp	x10, x9, [x22]
1028da798:     	stp	x10, x9, [sp, #0xb0]
1028da79c:     	cbz	x9, 0x1028da7ac
1028da7a0:     	add	x9, x9, #0x8
1028da7a4:     	mov	w10, #0x1               ; =1
1028da7a8:     	ldadd	w10, w9, [x9]
1028da7ac:     	ldr	d0, [x8, #0x828]
1028da7b0:     	ldp	x9, x8, [x21]
1028da7b4:     	stp	x9, x8, [sp, #0xa0]
1028da7b8:     	cbz	x8, 0x1028da7c8
1028da7bc:     	add	x8, x8, #0x8 STRING 'tItemENS1_9allocatorIS5_EEEEEE'
1028da7c0:     	mov	w9, #0x1                ; =1
1028da7c4:     	ldadd	w9, w8, [x8]
1028da7c8:     	fmul	d10, d10, d0
1028da7cc:     	ldr	x8, [sp, #0x8]
1028da7d0:     	ldp	x9, x8, [x8]
1028da7d4:     	stp	x9, x8, [sp, #0x90]
1028da7d8:     	cbz	x8, 0x1028da7e8
1028da7dc:     	add	x8, x8, #0x8 STRING 'tItemENS1_9allocatorIS5_EEEEEE'
1028da7e0:     	mov	w9, #0x1                ; =1
1028da7e4:     	ldadd	w9, w8, [x8]
1028da7e8:     	add	x26, sp, #0xc0
1028da7ec:     	add	x27, sp, #0xb0
1028da7f0:     	add	x28, sp, #0xa0
1028da7f4:     	add	x23, sp, #0x90
1028da7f8:     	add	x0, sp, #0xc0
1028da7fc:     	add	x1, sp, #0xb0
1028da800:     	add	x2, sp, #0xa0
1028da804:     	add	x3, sp, #0x90
1028da808:     	fmov	d3, #1.00000000
1028da80c:     	fmov	d0, d8
1028da810:     	mov	x4, x25
1028da814:     	fmov	d1, d9
1028da818:     	fmov	d2, d10
1028da81c:     	bl	0x1028daa78
1028da820:     	add	x0, x23, #0x8
1028da824:     	bl	0x10001022c
1028da828:     	add	x0, x28, #0x8
1028da82c:     	bl	0x10001022c
1028da830:     	add	x0, x27, #0x8
1028da834:     	bl	0x10001022c
1028da838:     	add	x0, x26, #0x8
1028da83c:     	bl	0x10001022c
1028da840:     	ldur	w8, [x29, #-0x7c]
1028da844:     	cbz	w8, 0x1028da9c0
1028da848:     	ldr	x0, [x24]
1028da84c:     	add	x28, sp, #0x80
1028da850:     	add	x8, sp, #0x80
1028da854:     	bl	0x1024c1e58
1028da858:     	ldp	x9, x8, [sp, #0x80]
1028da85c:     	stp	x9, x8, [sp, #0x70]
1028da860:     	cbz	x8, 0x1028da870
1028da864:     	add	x8, x8, #0x8 STRING 'tItemENS1_9allocatorIS5_EEEEEE'
1028da868:     	mov	w9, #0x1                ; =1
1028da86c:     	ldadd	w9, w8, [x8]
1028da870:     	ldp	x9, x8, [x22]
1028da874:     	stp	x9, x8, [sp, #0x60]
1028da878:     	cbz	x8, 0x1028da888
1028da87c:     	add	x8, x8, #0x8 STRING 'tItemENS1_9allocatorIS5_EEEEEE'
1028da880:     	mov	w9, #0x1                ; =1
1028da884:     	ldadd	w9, w8, [x8]
1028da888:     	add	x8, sp, #0x70
1028da88c:     	add	x9, sp, #0x60
1028da890:     	add	x10, sp, #0x50
1028da894:     	ldp	x12, x11, [x21]
1028da898:     	stp	x12, x11, [sp, #0x50]
1028da89c:     	cbz	x11, 0x1028da8ac
1028da8a0:     	add	x11, x11, #0x8
1028da8a4:     	mov	w12, #0x1               ; =1
1028da8a8:     	ldadd	w12, w11, [x11]
1028da8ac:     	add	x24, x8, #0x8 STRING 'tItemENS1_9allocatorIS5_EEEEEE'
1028da8b0:     	add	x26, x9, #0x8
1028da8b4:     	add	x27, x10, #0x8
1028da8b8:     	ldr	x8, [sp, #0x8]
1028da8bc:     	ldp	x9, x8, [x8]
1028da8c0:     	stp	x9, x8, [sp, #0x40]
1028da8c4:     	cbz	x8, 0x1028da8d4
1028da8c8:     	add	x8, x8, #0x8 STRING 'tItemENS1_9allocatorIS5_EEEEEE'
1028da8cc:     	mov	w9, #0x1                ; =1
1028da8d0:     	ldadd	w9, w8, [x8]
1028da8d4:     	add	x23, sp, #0x40
1028da8d8:     	add	x0, sp, #0x70
1028da8dc:     	add	x1, sp, #0x60
1028da8e0:     	add	x2, sp, #0x50
1028da8e4:     	add	x3, sp, #0x40
1028da8e8:     	orr	w4, w25, #0x10000000
1028da8ec:     	fmov	d3, #1.00000000
1028da8f0:     	fmov	d0, d8
1028da8f4:     	fmov	d1, d9
1028da8f8:     	fmov	d2, d10
1028da8fc:     	bl	0x1028daa78
1028da900:     	add	x0, x23, #0x8
1028da904:     	bl	0x10001022c
1028da908:     	mov	x0, x27
1028da90c:     	bl	0x10001022c
1028da910:     	mov	x0, x26
1028da914:     	bl	0x10001022c
1028da918:     	mov	x0, x24
1028da91c:     	bl	0x10001022c
1028da920:     	ldp	x9, x8, [x22]
1028da924:     	stp	x9, x8, [sp, #0x30]
1028da928:     	cbz	x8, 0x1028da938
1028da92c:     	add	x8, x8, #0x8 STRING 'tItemENS1_9allocatorIS5_EEEEEE'
1028da930:     	mov	w9, #0x1                ; =1
1028da934:     	ldadd	w9, w8, [x8]
1028da938:     	add	x8, sp, #0x30
1028da93c:     	add	x9, sp, #0x20
1028da940:     	ldp	x11, x10, [x21]
1028da944:     	stp	x11, x10, [sp, #0x20]
1028da948:     	cbz	x10, 0x1028da958
1028da94c:     	add	x10, x10, #0x8
1028da950:     	mov	w11, #0x1               ; =1
1028da954:     	ldadd	w11, w10, [x10]
1028da958:     	add	x24, x8, #0x8 STRING 'tItemENS1_9allocatorIS5_EEEEEE'
1028da95c:     	add	x26, x9, #0x8
1028da960:     	add	x9, sp, #0x10
1028da964:     	ldp	x10, x8, [x20]
1028da968:     	add	x27, x9, #0x8
1028da96c:     	stp	x10, x8, [sp, #0x10]
1028da970:     	cbz	x8, 0x1028da980
1028da974:     	add	x8, x8, #0x8 STRING 'tItemENS1_9allocatorIS5_EEEEEE'
1028da978:     	mov	w9, #0x1                ; =1
1028da97c:     	ldadd	w9, w8, [x8]
1028da980:     	add	x0, sp, #0x30
1028da984:     	add	x1, sp, #0x20
1028da988:     	add	x2, sp, #0x10
1028da98c:     	fmov	d0, d8
1028da990:     	mov	w3, #0x1                ; =1
1028da994:     	bl	0x1028da414
1028da998:     	ldr	x8, [sp, #0x80]
1028da99c:     	str	d0, [x8, #0x78]
1028da9a0:     	mov	x0, x27
1028da9a4:     	bl	0x10001022c
1028da9a8:     	mov	x0, x26
1028da9ac:     	bl	0x10001022c
1028da9b0:     	mov	x0, x24
1028da9b4:     	bl	0x10001022c
1028da9b8:     	add	x0, x28, #0x8
1028da9bc:     	bl	0x10001022c
1028da9c0:     	ldp	x29, x30, [sp, #0x1b0]
1028da9c4:     	ldp	x20, x19, [sp, #0x1a0]
1028da9c8:     	ldp	x22, x21, [sp, #0x190]
1028da9cc:     	ldp	x24, x23, [sp, #0x180]
1028da9d0:     	ldp	x26, x25, [sp, #0x170]
1028da9d4:     	ldp	x28, x27, [sp, #0x160]
1028da9d8:     	ldp	d9, d8, [sp, #0x150]
1028da9dc:     	ldp	d11, d10, [sp, #0x140]
1028da9e0:     	add	sp, sp, #0x1c0
1028da9e4:     	ret
1028da9e8:     	mov	x20, x0
1028da9ec:     	b	0x1028da9fc
1028da9f0:     	mov	x20, x0
1028da9f4:     	add	x0, x23, #0x8
1028da9f8:     	bl	0x10001022c
1028da9fc:     	mov	x0, x27
1028daa00:     	bl	0x10001022c
1028daa04:     	mov	x0, x26
1028daa08:     	bl	0x10001022c
1028daa0c:     	mov	x0, x24
1028daa10:     	bl	0x10001022c
1028daa14:     	add	x0, x28, #0x8
1028daa18:     	b	0x1028daa44
1028daa1c:     	b	0x1028daa64
1028daa20:     	b	0x1028daa64
1028daa24:     	mov	x20, x0
1028daa28:     	add	x0, x23, #0x8
1028daa2c:     	bl	0x10001022c
1028daa30:     	add	x0, x28, #0x8
1028daa34:     	bl	0x10001022c
1028daa38:     	add	x0, x27, #0x8
1028daa3c:     	bl	0x10001022c
1028daa40:     	add	x0, x26, #0x8
1028daa44:     	bl	0x10001022c
1028daa48:     	b	0x1028daa68
1028daa4c:     	mov	x20, x0
1028daa50:     	add	x19, x19, #0x8
1028daa54:     	b	0x1028daa68
1028daa58:     	b	0x1028daa64
1028daa5c:     	b	0x1028daa64
1028daa60:     	b	0x1028daa64
1028daa64:     	mov	x20, x0
1028daa68:     	mov	x0, x19
1028daa6c:     	bl	0x10001022c
1028daa70:     	mov	x0, x20
1028daa74:     	bl	0x103bda970

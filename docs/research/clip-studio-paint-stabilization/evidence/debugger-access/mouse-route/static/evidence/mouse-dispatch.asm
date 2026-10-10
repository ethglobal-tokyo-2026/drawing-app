
FUNCTION 0x1021ef5d0 size 4548
1021ef5d0:     	stp	x28, x27, [sp, #-0x50]!
1021ef5d4:     	stp	x24, x23, [sp, #0x10]
1021ef5d8:     	stp	x22, x21, [sp, #0x20]
1021ef5dc:     	stp	x20, x19, [sp, #0x30]
1021ef5e0:     	stp	x29, x30, [sp, #0x40]
1021ef5e4:     	add	x29, sp, #0x40
1021ef5e8:     	sub	sp, sp, #0x340
1021ef5ec:     	adrp	x21, 0x104c93000
1021ef5f0:     	ldr	x8, [x21, #0x5d8]
1021ef5f4:     	cbz	x8, 0x1021f02a4
1021ef5f8:     	mov	x20, x1
1021ef5fc:     	mov	x19, x0
1021ef600:     	sub	x1, x29, #0x44
1021ef604:     	mov	x0, x20
1021ef608:     	bl	0x10207c698
1021ef60c:     	cbz	w0, 0x1021f02a4
1021ef610:     	ldur	w8, [x29, #-0x44]
1021ef614:     	cmp	w8, #0xe
1021ef618:     	b.ne	0x1021ef638
1021ef61c:     	ldr	w8, [x19, #0x3a8]
1021ef620:     	subs	w8, w8, #0x1
1021ef624:     	b.lt	0x1021ef638
1021ef628:     	str	w8, [x19, #0x3a8]
1021ef62c:     	b.ne	0x1021ef638
1021ef630:     	mov	w0, #0x0                ; =0
1021ef634:     	bl	0x1020b2e4c
1021ef638:     	stur	wzr, [x29, #-0x48]
1021ef63c:     	sub	x1, x29, #0x48
1021ef640:     	mov	x0, x20
1021ef644:     	bl	0x10207c838
1021ef648:     	cbz	w0, 0x1021f02a4
1021ef64c:     	stp	xzr, xzr, [x29, #-0x58]
1021ef650:     	str	xzr, [sp, #0x50]
1021ef654:     	ldur	w2, [x29, #-0x48]
1021ef658:     	sub	x22, x29, #0x58
1021ef65c:     	sub	x0, x29, #0x58
1021ef660:     	add	x1, sp, #0x50
1021ef664:     	bl	0x1021f0794
1021ef668:     	add	x0, x22, #0x8
1021ef66c:     	bl	0x10001022c
1021ef670:     	sub	x1, x29, #0x70
1021ef674:     	mov	x0, x20
1021ef678:     	bl	0x10207c6ac
1021ef67c:     	cbz	w0, 0x1021f02a4
1021ef680:     	sub	x1, x29, #0x74
1021ef684:     	mov	x0, x20
1021ef688:     	bl	0x10207c6c0
1021ef68c:     	cbz	w0, 0x1021f02a4
1021ef690:     	sub	x1, x29, #0x78
1021ef694:     	mov	x0, x20
1021ef698:     	bl	0x10207c6d4
1021ef69c:     	cbz	w0, 0x1021f02a4
1021ef6a0:     	sub	x1, x29, #0x7c
1021ef6a4:     	mov	x0, x20
1021ef6a8:     	bl	0x10207c6e8
1021ef6ac:     	cbz	w0, 0x1021f02a4
1021ef6b0:     	sub	x1, x29, #0x80
1021ef6b4:     	mov	x0, x20
1021ef6b8:     	bl	0x10207c700
1021ef6bc:     	cbz	w0, 0x1021f02a4
1021ef6c0:     	sub	x1, x29, #0x84
1021ef6c4:     	mov	x0, x20
1021ef6c8:     	bl	0x10207c718
1021ef6cc:     	cbz	w0, 0x1021f02a4
1021ef6d0:     	sub	x1, x29, #0x90
1021ef6d4:     	mov	x0, x20
1021ef6d8:     	bl	0x10207c730
1021ef6dc:     	cbz	w0, 0x1021f02a4
1021ef6e0:     	sub	x1, x29, #0x98
1021ef6e4:     	mov	x0, x20
1021ef6e8:     	bl	0x10207c744
1021ef6ec:     	cbz	w0, 0x1021f02a4
1021ef6f0:     	sub	x1, x29, #0xa0
1021ef6f4:     	mov	x0, x20
1021ef6f8:     	bl	0x10207c758
1021ef6fc:     	cbz	w0, 0x1021f02a4
1021ef700:     	sub	x1, x29, #0xa4
1021ef704:     	mov	x0, x20
1021ef708:     	bl	0x10207c76c
1021ef70c:     	cbz	w0, 0x1021f02a4
1021ef710:     	bl	0x1021569cc
1021ef714:     	ldur	w8, [x29, #-0xa4]
1021ef718:     	orr	w8, w8, w0
1021ef71c:     	stur	w8, [x29, #-0xa4]
1021ef720:     	sub	x1, x29, #0xa8
1021ef724:     	mov	x0, x20
1021ef728:     	bl	0x10207c780
1021ef72c:     	cbz	w0, 0x1021f02a4
1021ef730:     	sub	x1, x29, #0xac
1021ef734:     	mov	x0, x20
1021ef738:     	bl	0x10207c790
1021ef73c:     	cbz	w0, 0x1021f02a4
1021ef740:     	sub	x1, x29, #0xb8
1021ef744:     	mov	x0, x20
1021ef748:     	bl	0x10207c7a4
1021ef74c:     	cbz	w0, 0x1021f02a4
1021ef750:     	sub	x1, x29, #0xc0
1021ef754:     	mov	x0, x20
1021ef758:     	bl	0x10207c7b8
1021ef75c:     	cbz	w0, 0x1021f02a4
1021ef760:     	sub	x1, x29, #0xc4
1021ef764:     	mov	x0, x20
1021ef768:     	bl	0x10207c7cc
1021ef76c:     	cbz	w0, 0x1021f02a4
1021ef770:     	sub	x1, x29, #0xc8
1021ef774:     	mov	x0, x20
1021ef778:     	bl	0x10207c7e0
1021ef77c:     	cbz	w0, 0x1021f02a4
1021ef780:     	sub	x1, x29, #0xcc
1021ef784:     	mov	x0, x20
1021ef788:     	bl	0x10207c7f4
1021ef78c:     	cbz	w0, 0x1021f02a4
1021ef790:     	sub	x1, x29, #0xd0
1021ef794:     	mov	x0, x20
1021ef798:     	bl	0x10207c808
1021ef79c:     	cbz	w0, 0x1021f02a4
1021ef7a0:     	sub	x1, x29, #0xd4
1021ef7a4:     	mov	x0, x20
1021ef7a8:     	bl	0x10207c818
1021ef7ac:     	cbz	w0, 0x1021f02a4
1021ef7b0:     	sub	x1, x29, #0xd8
1021ef7b4:     	mov	x0, x20
1021ef7b8:     	bl	0x10207c828
1021ef7bc:     	cbz	w0, 0x1021f02a4
1021ef7c0:     	sub	x1, x29, #0xdc
1021ef7c4:     	mov	x0, x20
1021ef7c8:     	bl	0x10207c84c
1021ef7cc:     	cbz	w0, 0x1021f02a4
1021ef7d0:     	sub	x1, x29, #0xf0
1021ef7d4:     	mov	x0, x20
1021ef7d8:     	bl	0x10207c860
1021ef7dc:     	cbz	w0, 0x1021f02a4
1021ef7e0:     	sub	x1, x29, #0xf8
1021ef7e4:     	mov	x0, x20
1021ef7e8:     	bl	0x10207c874
1021ef7ec:     	cbz	w0, 0x1021f02a4
1021ef7f0:     	sub	x1, x29, #0xfc
1021ef7f4:     	mov	x0, x20
1021ef7f8:     	bl	0x10207c888
1021ef7fc:     	cbz	w0, 0x1021f02a4
1021ef800:     	stur	wzr, [x29, #-0x100]
1021ef804:     	sub	x1, x29, #0x100
1021ef808:     	mov	x0, x20
1021ef80c:     	bl	0x10207c898
1021ef810:     	cbz	w0, 0x1021f02a4
1021ef814:     	str	wzr, [sp, #0x27c]
1021ef818:     	add	x1, sp, #0x27c
1021ef81c:     	mov	x0, x20
1021ef820:     	bl	0x10207c8a8
1021ef824:     	cbz	w0, 0x1021f02a4
1021ef828:     	ldur	w8, [x29, #-0x44]
1021ef82c:     	sub	w9, w8, #0x1
1021ef830:     	cmp	w9, #0xf
1021ef834:     	b.hi	0x1021efd44
1021ef838:     	adrp	x0, 0x104d65000
1021ef83c:     	add	x0, x0, #0x1f0
1021ef840:     	adrp	x8, 0x10451b000
1021ef844:     	add	x8, x8, #0x61d
1021ef848:     	adr	x10, 0x1021ef858
1021ef84c:     	ldrb	w11, [x8, x9]
1021ef850:     	add	x10, x10, x11, lsl #2
1021ef854:     	br	x10
1021ef858:     	adrp	x0, 0x104d65000
1021ef85c:     	add	x0, x0, #0x210
1021ef860:     	b	0x1021ef964
1021ef864:     	bl	0x1021b2994
1021ef868:     	cbz	w0, 0x1021f02c0
1021ef86c:     	adrp	x0, 0x104d63000
1021ef870:     	add	x0, x0, #0xc40
1021ef874:     	bl	0x10214de74
1021ef878:     	add	x20, sp, #0x268
1021ef87c:     	add	x8, sp, #0x268
1021ef880:     	bl	0x1020b86d8
1021ef884:     	add	x1, sp, #0x268
1021ef888:     	mov	x0, x19
1021ef88c:     	bl	0x1021dfbbc
1021ef890:     	add	x0, x20, #0x8
1021ef894:     	b	0x1021f02a0
1021ef898:     	adrp	x0, 0x104d65000
1021ef89c:     	add	x0, x0, #0x350
1021ef8a0:     	b	0x1021ef964
1021ef8a4:     	adrp	x0, 0x104d65000
1021ef8a8:     	add	x0, x0, #0x270
1021ef8ac:     	b	0x1021ef964
1021ef8b0:     	adrp	x0, 0x104d65000
1021ef8b4:     	add	x0, x0, #0x230
1021ef8b8:     	b	0x1021ef964
1021ef8bc:     	adrp	x0, 0x104d65000
1021ef8c0:     	add	x0, x0, #0x310
1021ef8c4:     	b	0x1021ef964
1021ef8c8:     	adrp	x0, 0x104d65000
1021ef8cc:     	add	x0, x0, #0x3b0
1021ef8d0:     	b	0x1021ef964
1021ef8d4:     	adrp	x0, 0x104d65000
1021ef8d8:     	add	x0, x0, #0x250
1021ef8dc:     	b	0x1021ef964
1021ef8e0:     	adrp	x0, 0x104d65000
1021ef8e4:     	add	x0, x0, #0x2d0
1021ef8e8:     	b	0x1021ef964
1021ef8ec:     	ldr	x8, [x19, #0x260]
1021ef8f0:     	ldr	x9, [x19, #0x268]
1021ef8f4:     	stp	x8, x9, [sp, #0x10]
1021ef8f8:     	cbz	x9, 0x1021f0300
1021ef8fc:     	add	x10, x9, #0x8
1021ef900:     	mov	w9, #0x1                ; =1
1021ef904:     	ldadd	w9, w10, [x10]
1021ef908:     	ldr	x10, [sp, #0x18]
1021ef90c:     	add	x11, sp, #0x228
1021ef910:     	add	x21, x11, #0x8
1021ef914:     	str	x8, [sp, #0x228]
1021ef918:     	str	x10, [sp, #0x230]
1021ef91c:     	cbz	x10, 0x1021f0310
1021ef920:     	add	x8, x10, #0x8
1021ef924:     	ldadd	w9, w8, [x8]
1021ef928:     	b	0x1021f0310
1021ef92c:     	adrp	x0, 0x104d65000
1021ef930:     	add	x0, x0, #0x290
1021ef934:     	b	0x1021ef964
1021ef938:     	adrp	x0, 0x104d65000
1021ef93c:     	add	x0, x0, #0x2b0
1021ef940:     	b	0x1021ef964
1021ef944:     	adrp	x0, 0x104d65000
1021ef948:     	add	x0, x0, #0x2f0
1021ef94c:     	b	0x1021ef964
1021ef950:     	adrp	x0, 0x104d65000
1021ef954:     	add	x0, x0, #0x330
1021ef958:     	b	0x1021ef964
1021ef95c:     	adrp	x0, 0x104d65000
1021ef960:     	add	x0, x0, #0x3d0
1021ef964:     	bl	0x10214de74
1021ef968:     	mov	x20, x0
1021ef96c:     	ldur	w8, [x29, #-0x44]
1021ef970:     	cmp	w8, #0xb
1021ef974:     	b.hi	0x1021ef9ac
1021ef978:     	mov	w9, #0x1                ; =1
1021ef97c:     	lsl	w8, w9, w8
1021ef980:     	mov	w9, #0xdb0              ; =3504
1021ef984:     	tst	w8, w9
1021ef988:     	b.eq	0x1021ef9ac
1021ef98c:     	ldr	x8, [x21, #0x5d8]
1021ef990:     	ldr	x8, [x8, #0xa8]
1021ef994:     	cbz	x8, 0x1021ef9a4
1021ef998:     	add	x8, x8, #0x8
1021ef99c:     	ldapr	w8, [x8]
1021ef9a0:     	cbnz	w8, 0x1021ef9ac
1021ef9a4:     	mov	w0, #0x1                ; =1
1021ef9a8:     	bl	0x1021f6400
1021ef9ac:     	ldr	x8, [x19, #0x260]
1021ef9b0:     	ldr	x9, [x19, #0x268]
1021ef9b4:     	str	x8, [sp, #0x210]
1021ef9b8:     	str	x9, [sp, #0x218]
1021ef9bc:     	cbz	x9, 0x1021ef9ec
1021ef9c0:     	add	x10, x9, #0x8
1021ef9c4:     	mov	w9, #0x1                ; =1
1021ef9c8:     	ldadd	w9, w10, [x10]
1021ef9cc:     	ldr	x10, [sp, #0x218]
1021ef9d0:     	add	x11, sp, #0x1c0
1021ef9d4:     	add	x21, x11, #0x8
1021ef9d8:     	stp	x8, x10, [sp, #0x1c0]
1021ef9dc:     	cbz	x10, 0x1021ef9f8
1021ef9e0:     	add	x8, x10, #0x8
1021ef9e4:     	ldadd	w9, w8, [x8]
1021ef9e8:     	b	0x1021ef9f8
1021ef9ec:     	add	x9, sp, #0x1c0
1021ef9f0:     	add	x21, x9, #0x8
1021ef9f4:     	stp	x8, xzr, [sp, #0x1c0]
1021ef9f8:     	add	x23, sp, #0x210
1021ef9fc:     	add	x0, sp, #0x1c0
1021efa00:     	bl	0x1021bb57c
1021efa04:     	mov	x22, x0
1021efa08:     	mov	x0, x21
1021efa0c:     	bl	0x10001022c
1021efa10:     	cbz	w22, 0x1021f0244
1021efa14:     	ldur	w8, [x29, #-0x44]
1021efa18:     	cmp	w8, #0x1
1021efa1c:     	b.ne	0x1021efb80
1021efa20:     	bl	0x102194e64
1021efa24:     	cmp	w0, #0x4
1021efa28:     	b.ne	0x1021efb80
1021efa2c:     	ldur	w8, [x29, #-0xfc]
1021efa30:     	cbz	w8, 0x1021efb80
1021efa34:     	ldr	x0, [sp, #0x210]
1021efa38:     	ldr	x8, [x0]
1021efa3c:     	ldr	x9, [x8, #0x20]
1021efa40:     	add	x22, sp, #0x10
1021efa44:     	add	x8, sp, #0x10
1021efa48:     	blr	x9
1021efa4c:     	ldp	x9, x8, [sp, #0x10]
1021efa50:     	stp	x9, x8, [sp, #0x1b0]
1021efa54:     	cbz	x8, 0x1021efa64
1021efa58:     	add	x8, x8, #0x8
1021efa5c:     	mov	w9, #0x1                ; =1
1021efa60:     	ldadd	w9, w8, [x8]
1021efa64:     	add	x24, sp, #0x1b0
1021efa68:     	add	x0, sp, #0x1b0
1021efa6c:     	bl	0x1021bb57c
1021efa70:     	mov	x21, x0
1021efa74:     	add	x0, x24, #0x8
1021efa78:     	bl	0x10001022c
1021efa7c:     	cbnz	w21, 0x1021efb10
1021efa80:     	ldp	d0, d1, [x29, #-0x70]
1021efa84:     	fcmp	d0, #0.0
1021efa88:     	adrp	x8, 0x1042e3000
1021efa8c:     	ldr	d2, [x8, #0x690]
1021efa90:     	adrp	x8, 0x1042fe000
1021efa94:     	ldr	d3, [x8, #0xd20]
1021efa98:     	fcsel	d4, d3, d2, mi
1021efa9c:     	fadd	d0, d0, d4
1021efaa0:     	ldr	x0, [sp, #0x210]
1021efaa4:     	fcvtzs	w8, d0
1021efaa8:     	fcmp	d1, #0.0
1021efaac:     	fcsel	d0, d3, d2, mi
1021efab0:     	fadd	d0, d1, d0
1021efab4:     	fcvtzs	w9, d0
1021efab8:     	orr	x8, x8, x9, lsl #32
1021efabc:     	str	x8, [sp, #0x50]
1021efac0:     	ldr	x8, [x0]
1021efac4:     	ldr	x8, [x8, #0xc8]
1021efac8:     	add	x1, sp, #0x220
1021efacc:     	add	x2, sp, #0x50
1021efad0:     	blr	x8
1021efad4:     	cbz	w0, 0x1021efb10
1021efad8:     	add	x21, sp, #0x1f0
1021efadc:     	add	x8, sp, #0x1f0
1021efae0:     	add	x0, sp, #0x220
1021efae4:     	bl	0x1021e91c0
1021efae8:     	add	x8, sp, #0x50
1021efaec:     	ldr	q0, [sp, #0x1f0]
1021efaf0:     	stp	xzr, xzr, [sp, #0x1f0]
1021efaf4:     	ldr	q1, [sp, #0x10]
1021efaf8:     	str	q0, [sp, #0x10]
1021efafc:     	str	q1, [sp, #0x50]
1021efb00:     	orr	x0, x8, #0x8
1021efb04:     	bl	0x10001022c
1021efb08:     	orr	x0, x21, #0x8
1021efb0c:     	bl	0x10001022c
1021efb10:     	ldp	x9, x8, [sp, #0x10]
1021efb14:     	stp	x9, x8, [sp, #0x1a0]
1021efb18:     	cbz	x8, 0x1021efb28
1021efb1c:     	add	x8, x8, #0x8
1021efb20:     	mov	w9, #0x1                ; =1
1021efb24:     	ldadd	w9, w8, [x8]
1021efb28:     	add	x24, sp, #0x1a0
1021efb2c:     	add	x0, sp, #0x1a0
1021efb30:     	bl	0x1021bb57c
1021efb34:     	mov	x21, x0
1021efb38:     	add	x0, x24, #0x8
1021efb3c:     	bl	0x10001022c
1021efb40:     	cbz	w21, 0x1021efd1c
1021efb44:     	ldp	x9, x8, [sp, #0x10]
1021efb48:     	stp	x9, x8, [sp, #0x190]
1021efb4c:     	cbz	x8, 0x1021efb5c
1021efb50:     	add	x8, x8, #0x8
1021efb54:     	mov	w9, #0x1                ; =1
1021efb58:     	ldadd	w9, w8, [x8]
1021efb5c:     	add	x24, sp, #0x190
1021efb60:     	add	x0, sp, #0x190
1021efb64:     	bl	0x1020be73c
1021efb68:     	mov	x21, x0
1021efb6c:     	add	x0, x24, #0x8
1021efb70:     	bl	0x10001022c
1021efb74:     	orr	x0, x22, #0x8
1021efb78:     	bl	0x10001022c
1021efb7c:     	cbz	w21, 0x1021f029c
1021efb80:     	mov	w0, #0x1                ; =1
1021efb84:     	bl	0x1020be4cc
1021efb88:     	cbnz	w0, 0x1021efb94
1021efb8c:     	bl	0x1020be504
1021efb90:     	cbz	w0, 0x1021efd24
1021efb94:     	bl	0x1020c22e8
1021efb98:     	cbz	w0, 0x1021efbbc
1021efb9c:     	mov	w0, #0x0                ; =0
1021efba0:     	bl	0x1020be4cc
1021efba4:     	cbz	w0, 0x1021efd64
1021efba8:     	mov	x0, x20
1021efbac:     	bl	0x1020be5bc
1021efbb0:     	cbz	w0, 0x1021efd64
1021efbb4:     	stur	xzr, [x29, #-0xb8]
1021efbb8:     	b	0x1021efd64
1021efbbc:     	bl	0x1020be504
1021efbc0:     	cbz	w0, 0x1021efbcc
1021efbc4:     	mov	w0, #0x0                ; =0
1021efbc8:     	bl	0x1020be4f8
1021efbcc:     	ldr	x0, [sp, #0x210]
1021efbd0:     	ldr	x8, [x0]
1021efbd4:     	ldr	x9, [x8, #0x20]
1021efbd8:     	add	x22, sp, #0x10
1021efbdc:     	add	x8, sp, #0x10
1021efbe0:     	blr	x9
1021efbe4:     	ldp	x9, x8, [sp, #0x10]
1021efbe8:     	stp	x9, x8, [sp, #0x180]
1021efbec:     	cbz	x8, 0x1021efbfc
1021efbf0:     	add	x8, x8, #0x8
1021efbf4:     	mov	w9, #0x1                ; =1
1021efbf8:     	ldadd	w9, w8, [x8]
1021efbfc:     	add	x24, sp, #0x180
1021efc00:     	add	x0, sp, #0x180
1021efc04:     	bl	0x1021bb57c
1021efc08:     	mov	x21, x0
1021efc0c:     	add	x0, x24, #0x8
1021efc10:     	bl	0x10001022c
1021efc14:     	cbnz	w21, 0x1021efca8
1021efc18:     	ldp	d0, d1, [x29, #-0x70]
1021efc1c:     	fcmp	d0, #0.0
1021efc20:     	adrp	x8, 0x1042e3000
1021efc24:     	ldr	d2, [x8, #0x690]
1021efc28:     	adrp	x8, 0x1042fe000
1021efc2c:     	ldr	d3, [x8, #0xd20]
1021efc30:     	fcsel	d4, d3, d2, mi
1021efc34:     	fadd	d0, d0, d4
1021efc38:     	ldr	x0, [sp, #0x210]
1021efc3c:     	fcvtzs	w8, d0
1021efc40:     	fcmp	d1, #0.0
1021efc44:     	fcsel	d0, d3, d2, mi
1021efc48:     	fadd	d0, d1, d0
1021efc4c:     	fcvtzs	w9, d0
1021efc50:     	orr	x8, x8, x9, lsl #32
1021efc54:     	str	x8, [sp, #0x50]
1021efc58:     	ldr	x8, [x0]
1021efc5c:     	ldr	x8, [x8, #0xc8]
1021efc60:     	add	x1, sp, #0x220
1021efc64:     	add	x2, sp, #0x50
1021efc68:     	blr	x8
1021efc6c:     	cbz	w0, 0x1021efca8
1021efc70:     	add	x21, sp, #0x1f0
1021efc74:     	add	x8, sp, #0x1f0
1021efc78:     	add	x0, sp, #0x220
1021efc7c:     	bl	0x1021e91c0
1021efc80:     	add	x8, sp, #0x50
1021efc84:     	ldr	q0, [sp, #0x1f0]
1021efc88:     	stp	xzr, xzr, [sp, #0x1f0]
1021efc8c:     	ldr	q1, [sp, #0x10]
1021efc90:     	str	q0, [sp, #0x10]
1021efc94:     	str	q1, [sp, #0x50]
1021efc98:     	orr	x0, x8, #0x8
1021efc9c:     	bl	0x10001022c
1021efca0:     	orr	x0, x21, #0x8
1021efca4:     	bl	0x10001022c
1021efca8:     	ldp	x9, x8, [sp, #0x10]
1021efcac:     	stp	x9, x8, [sp, #0x170]
1021efcb0:     	cbz	x8, 0x1021efcc0
1021efcb4:     	add	x8, x8, #0x8
1021efcb8:     	mov	w9, #0x1                ; =1
1021efcbc:     	ldadd	w9, w8, [x8]
1021efcc0:     	add	x24, sp, #0x170
1021efcc4:     	add	x0, sp, #0x170
1021efcc8:     	bl	0x1021bb57c
1021efccc:     	mov	x21, x0
1021efcd0:     	add	x0, x24, #0x8
1021efcd4:     	bl	0x10001022c
1021efcd8:     	cbz	w21, 0x1021efd5c
1021efcdc:     	ldp	x9, x8, [sp, #0x10]
1021efce0:     	stp	x9, x8, [sp, #0x160]
1021efce4:     	cbz	x8, 0x1021efcf4
1021efce8:     	add	x8, x8, #0x8
1021efcec:     	mov	w9, #0x1                ; =1
1021efcf0:     	ldadd	w9, w8, [x8]
1021efcf4:     	add	x24, sp, #0x160
1021efcf8:     	add	x0, sp, #0x160
1021efcfc:     	bl	0x1020be73c
1021efd00:     	mov	x21, x0
1021efd04:     	add	x0, x24, #0x8
1021efd08:     	bl	0x10001022c
1021efd0c:     	cbz	w21, 0x1021efd5c
1021efd10:     	mov	x0, x20
1021efd14:     	bl	0x1020be510
1021efd18:     	cbz	w0, 0x1021efd4c
1021efd1c:     	orr	x0, x22, #0x8
1021efd20:     	b	0x1021f0298
1021efd24:     	bl	0x1020be2d8
1021efd28:     	cbz	w0, 0x1021efb9c
1021efd2c:     	ldr	w0, [sp, #0x27c]
1021efd30:     	bl	0x1020be978
1021efd34:     	cbz	w0, 0x1021efb9c
1021efd38:     	bl	0x1020be3f4
1021efd3c:     	cbnz	w0, 0x1021efb9c
1021efd40:     	b	0x1021efb94
1021efd44:     	mov	w20, #0x0               ; =0
1021efd48:     	b	0x1021ef970
1021efd4c:     	mov	x0, x20
1021efd50:     	bl	0x1020be5bc
1021efd54:     	cbz	w0, 0x1021efd5c
1021efd58:     	stur	xzr, [x29, #-0xb8]
1021efd5c:     	orr	x0, x22, #0x8
1021efd60:     	bl	0x10001022c
1021efd64:     	ldur	w8, [x29, #-0x44]
1021efd68:     	cmp	w8, #0x1
1021efd6c:     	b.ne	0x1021efe68
1021efd70:     	bl	0x1020be2ec
1021efd74:     	cbnz	w0, 0x1021efd80
1021efd78:     	bl	0x1020be300
1021efd7c:     	cbz	w0, 0x1021efe64
1021efd80:     	ldr	x0, [x19, #0x20]
1021efd84:     	bl	0x10207abc0
1021efd88:     	cbnz	w0, 0x1021efe64
1021efd8c:     	bl	0x10207a668
1021efd90:     	cbnz	x0, 0x1021efe64
1021efd94:     	mov	x0, x19
1021efd98:     	bl	0x1021e2cc4
1021efd9c:     	cbnz	w0, 0x1021efe64
1021efda0:     	mov	x0, x19
1021efda4:     	bl	0x1021e2e1c
1021efda8:     	cbnz	w0, 0x1021efe64
1021efdac:     	mov	x0, x19
1021efdb0:     	bl	0x1021e2f20
1021efdb4:     	cbnz	w0, 0x1021efe64
1021efdb8:     	ldp	d0, d1, [x29, #-0x70]
1021efdbc:     	fcmp	d0, #0.0
1021efdc0:     	adrp	x8, 0x1042e3000
1021efdc4:     	ldr	d2, [x8, #0x690]
1021efdc8:     	adrp	x8, 0x1042fe000
1021efdcc:     	ldr	d3, [x8, #0xd20]
1021efdd0:     	fcsel	d4, d3, d2, mi
1021efdd4:     	fadd	d0, d0, d4
1021efdd8:     	ldr	x0, [sp, #0x210]
1021efddc:     	fcvtzs	w8, d0
1021efde0:     	fcmp	d1, #0.0
1021efde4:     	fcsel	d0, d3, d2, mi
1021efde8:     	fadd	d0, d1, d0
1021efdec:     	fcvtzs	w9, d0
1021efdf0:     	orr	x8, x8, x9, lsl #32
1021efdf4:     	str	x8, [sp, #0x50]
1021efdf8:     	ldr	x8, [x0]
1021efdfc:     	ldr	x8, [x8, #0xc8]
1021efe00:     	add	x1, sp, #0x10
1021efe04:     	add	x2, sp, #0x50
1021efe08:     	blr	x8
1021efe0c:     	cbz	w0, 0x1021efe64
1021efe10:     	add	x22, sp, #0x50
1021efe14:     	add	x8, sp, #0x50
1021efe18:     	add	x0, sp, #0x10
1021efe1c:     	bl	0x1021e91c0
1021efe20:     	ldp	x9, x8, [sp, #0x50]
1021efe24:     	stp	x9, x8, [sp, #0x150]
1021efe28:     	cbz	x8, 0x1021efe38
1021efe2c:     	add	x8, x8, #0x8
1021efe30:     	mov	w9, #0x1                ; =1
1021efe34:     	ldadd	w9, w8, [x8]
1021efe38:     	add	x24, sp, #0x150
1021efe3c:     	add	x0, sp, #0x150
1021efe40:     	bl	0x1020be73c
1021efe44:     	mov	x21, x0
1021efe48:     	add	x0, x24, #0x8
1021efe4c:     	bl	0x10001022c
1021efe50:     	cbz	w21, 0x1021efe5c
1021efe54:     	ldr	x0, [x19, #0x20]
1021efe58:     	bl	0x10207abc8
1021efe5c:     	add	x0, x22, #0x8
1021efe60:     	bl	0x10001022c
1021efe64:     	ldur	w8, [x29, #-0x44]
1021efe68:     	cmp	w8, #0xb
1021efe6c:     	b.hi	0x1021effb4
1021efe70:     	mov	w9, #0x1                ; =1
1021efe74:     	lsl	w8, w9, w8
1021efe78:     	mov	w9, #0xdb0              ; =3504
1021efe7c:     	tst	w8, w9
1021efe80:     	b.eq	0x1021effb4
1021efe84:     	adrp	x0, 0x104d66000
1021efe88:     	add	x0, x0, #0x1e8
1021efe8c:     	bl	0x10214de74
1021efe90:     	mov	x1, x0
1021efe94:     	add	x0, sp, #0x50
1021efe98:     	bl	0x1020cc240
1021efe9c:     	ldr	x8, [x19, #0x40]
1021efea0:     	stp	xzr, x8, [sp, #0x140]
1021efea4:     	cbz	x8, 0x1021efedc
1021efea8:     	ldr	w9, [x8, #0x8]
1021efeac:     	cbz	w9, 0x1021efed8
1021efeb0:     	add	w10, w9, #0x1
1021efeb4:     	add	x11, x8, #0x8
1021efeb8:     	mov	x12, x9
1021efebc:     	cas	w12, w10, [x11]
1021efec0:     	cmp	w12, w9
1021efec4:     	mov	x9, x12
1021efec8:     	b.ne	0x1021efeac
1021efecc:     	ldr	x8, [x19, #0x38]
1021efed0:     	str	x8, [sp, #0x140]
1021efed4:     	b	0x1021efedc
1021efed8:     	str	xzr, [sp, #0x148]
1021efedc:     	add	x21, sp, #0x140
1021efee0:     	add	x0, sp, #0x50
1021efee4:     	add	x1, sp, #0x140
1021efee8:     	bl	0x1021fdf8c
1021efeec:     	add	x0, x21, #0x8
1021efef0:     	bl	0x10001022c
1021efef4:     	add	x0, sp, #0x50
1021efef8:     	bl	0x1021fde94
1021efefc:     	bl	0x102167034
1021eff00:     	cbz	w0, 0x1021effac
1021eff04:     	ldr	x8, [x19, #0x40]
1021eff08:     	stp	xzr, x8, [sp, #0x130]
1021eff0c:     	cbz	x8, 0x1021eff44
1021eff10:     	ldr	w9, [x8, #0x8]
1021eff14:     	cbz	w9, 0x1021eff40
1021eff18:     	add	w10, w9, #0x1
1021eff1c:     	add	x11, x8, #0x8
1021eff20:     	mov	x12, x9
1021eff24:     	cas	w12, w10, [x11]
1021eff28:     	cmp	w12, w9
1021eff2c:     	mov	x9, x12
1021eff30:     	b.ne	0x1021eff14
1021eff34:     	ldr	x8, [x19, #0x38]
1021eff38:     	str	x8, [sp, #0x130]
1021eff3c:     	b	0x1021eff44
1021eff40:     	str	xzr, [sp, #0x138]
1021eff44:     	ldp	d0, d1, [x29, #-0x70]
1021eff48:     	fcmp	d0, #0.0
1021eff4c:     	adrp	x8, 0x1042e3000
1021eff50:     	ldr	d2, [x8, #0x690]
1021eff54:     	adrp	x8, 0x1042fe000
1021eff58:     	ldr	d3, [x8, #0xd20]
1021eff5c:     	fcsel	d4, d3, d2, mi
1021eff60:     	fadd	d0, d0, d4
1021eff64:     	add	x22, sp, #0x130
1021eff68:     	fcvtzs	w8, d0
1021eff6c:     	fcmp	d1, #0.0
1021eff70:     	fcsel	d0, d3, d2, mi
1021eff74:     	fadd	d0, d1, d0
1021eff78:     	fcvtzs	w9, d0
1021eff7c:     	orr	x8, x8, x9, lsl #32
1021eff80:     	str	x8, [sp, #0x10]
1021eff84:     	add	x0, sp, #0x130
1021eff88:     	add	x1, sp, #0x10
1021eff8c:     	bl	0x10216775c
1021eff90:     	mov	x21, x0
1021eff94:     	add	x0, x22, #0x8
1021eff98:     	bl	0x10001022c
1021eff9c:     	cbz	w21, 0x1021effac
1021effa0:     	add	x0, sp, #0x50
1021effa4:     	bl	0x1020cc308
1021effa8:     	b	0x1021f029c
1021effac:     	add	x0, sp, #0x50
1021effb0:     	bl	0x1020cc308
1021effb4:     	add	x0, sp, #0x50
1021effb8:     	mov	x1, x20
1021effbc:     	bl	0x1021281c8
1021effc0:     	add	x0, sp, #0x50
1021effc4:     	sub	x1, x29, #0x70
1021effc8:     	bl	0x102128728
1021effcc:     	add	x0, sp, #0x50
1021effd0:     	sub	x1, x29, #0x70
1021effd4:     	bl	0x102128754
1021effd8:     	ldur	w1, [x29, #-0x74]
1021effdc:     	add	x0, sp, #0x50
1021effe0:     	bl	0x102128780
1021effe4:     	ldur	w1, [x29, #-0x78]
1021effe8:     	add	x0, sp, #0x50
1021effec:     	bl	0x102128790
1021efff0:     	ldur	w1, [x29, #-0x7c]
1021efff4:     	add	x0, sp, #0x50
1021efff8:     	bl	0x1021287a0
1021efffc:     	ldur	w1, [x29, #-0x80]
1021f0000:     	add	x0, sp, #0x50
1021f0004:     	bl	0x1021287b0
1021f0008:     	ldur	w1, [x29, #-0x84]
1021f000c:     	add	x0, sp, #0x50
1021f0010:     	bl	0x1021287c0
1021f0014:     	ldur	d0, [x29, #-0x90]
1021f0018:     	add	x0, sp, #0x50
1021f001c:     	bl	0x1021287d0
1021f0020:     	ldur	d0, [x29, #-0x98]
1021f0024:     	add	x0, sp, #0x50
1021f0028:     	bl	0x1021287e0
1021f002c:     	ldur	d0, [x29, #-0xa0]
1021f0030:     	add	x0, sp, #0x50
1021f0034:     	bl	0x1021287f0
1021f0038:     	ldur	d0, [x29, #-0xb8]
1021f003c:     	add	x0, sp, #0x50
1021f0040:     	bl	0x102128820
1021f0044:     	ldur	x1, [x29, #-0xc0]
1021f0048:     	add	x0, sp, #0x50
1021f004c:     	bl	0x102128830
1021f0050:     	ldur	w1, [x29, #-0xc4]
1021f0054:     	add	x0, sp, #0x50
1021f0058:     	bl	0x102128840
1021f005c:     	ldur	w1, [x29, #-0xc8]
1021f0060:     	add	x0, sp, #0x50
1021f0064:     	bl	0x102128850
1021f0068:     	ldur	w1, [x29, #-0xcc]
1021f006c:     	add	x0, sp, #0x50
1021f0070:     	bl	0x102128860
1021f0074:     	ldur	w1, [x29, #-0xd0]
1021f0078:     	add	x0, sp, #0x50
1021f007c:     	bl	0x102128870
1021f0080:     	ldur	w1, [x29, #-0xd4]
1021f0084:     	add	x0, sp, #0x50
1021f0088:     	bl	0x102128880
1021f008c:     	add	x0, sp, #0x50
1021f0090:     	mov	w1, #0x0                ; =0
1021f0094:     	bl	0x102128890
1021f0098:     	ldur	w1, [x29, #-0xd8]
1021f009c:     	add	x0, sp, #0x50
1021f00a0:     	bl	0x1021288a0
1021f00a4:     	ldur	w1, [x29, #-0x48]
1021f00a8:     	add	x0, sp, #0x50
1021f00ac:     	bl	0x1021288b0
1021f00b0:     	ldur	w1, [x29, #-0xdc]
1021f00b4:     	add	x0, sp, #0x50
1021f00b8:     	bl	0x1021288c0
1021f00bc:     	ldur	w1, [x29, #-0xa4]
1021f00c0:     	add	x0, sp, #0x50
1021f00c4:     	bl	0x102128800
1021f00c8:     	ldur	w1, [x29, #-0xa8]
1021f00cc:     	add	x0, sp, #0x50
1021f00d0:     	bl	0x102128810
1021f00d4:     	add	x0, sp, #0x50
1021f00d8:     	sub	x1, x29, #0x70
1021f00dc:     	bl	0x1021288d0
1021f00e0:     	ldur	d0, [x29, #-0xb8]
1021f00e4:     	add	x0, sp, #0x50
1021f00e8:     	bl	0x1021288e8
1021f00ec:     	ldur	w1, [x29, #-0xfc]
1021f00f0:     	add	x0, sp, #0x50
1021f00f4:     	bl	0x102128a98
1021f00f8:     	ldur	w1, [x29, #-0x100]
1021f00fc:     	add	x0, sp, #0x50
1021f0100:     	bl	0x102128aa8
1021f0104:     	mov	x0, x19
1021f0108:     	bl	0x1021e2cc4
1021f010c:     	mov	x1, x0
1021f0110:     	add	x0, sp, #0x50
1021f0114:     	bl	0x1021288f8
1021f0118:     	mov	x0, x19
1021f011c:     	bl	0x1021e2e1c
1021f0120:     	mov	x1, x0
1021f0124:     	add	x0, sp, #0x50
1021f0128:     	bl	0x102128908
1021f012c:     	mov	x0, x19
1021f0130:     	bl	0x1021e2f20
1021f0134:     	mov	x1, x0
1021f0138:     	add	x0, sp, #0x50
1021f013c:     	bl	0x102128918
1021f0140:     	add	x0, sp, #0x10
1021f0144:     	bl	0x1020cc1d4
1021f0148:     	add	x0, sp, #0x50
1021f014c:     	add	x1, sp, #0x10
1021f0150:     	bl	0x102128d20
1021f0154:     	bl	0x1021b2994
1021f0158:     	cbz	w0, 0x1021f0228
1021f015c:     	adrp	x0, 0x104d65000
1021f0160:     	add	x0, x0, #0x250
1021f0164:     	bl	0x10214de74
1021f0168:     	cmp	w20, w0
1021f016c:     	b.eq	0x1021f0210
1021f0170:     	adrp	x0, 0x104d65000
1021f0174:     	add	x0, x0, #0x270
1021f0178:     	bl	0x10214de74
1021f017c:     	cmp	w20, w0
1021f0180:     	b.eq	0x1021f0210
1021f0184:     	adrp	x0, 0x104d65000
1021f0188:     	add	x0, x0, #0x290
1021f018c:     	bl	0x10214de74
1021f0190:     	cmp	w20, w0
1021f0194:     	b.eq	0x1021f0210
1021f0198:     	adrp	x0, 0x104d65000
1021f019c:     	add	x0, x0, #0x2b0
1021f01a0:     	bl	0x10214de74
1021f01a4:     	cmp	w20, w0
1021f01a8:     	b.eq	0x1021f0210
1021f01ac:     	adrp	x0, 0x104d65000
1021f01b0:     	add	x0, x0, #0x2d0
1021f01b4:     	bl	0x10214de74
1021f01b8:     	cmp	w20, w0
1021f01bc:     	b.eq	0x1021f0210
1021f01c0:     	adrp	x0, 0x104d65000
1021f01c4:     	add	x0, x0, #0x2f0
1021f01c8:     	bl	0x10214de74
1021f01cc:     	cmp	w20, w0
1021f01d0:     	b.eq	0x1021f0210
1021f01d4:     	adrp	x0, 0x104d65000
1021f01d8:     	add	x0, x0, #0x310
1021f01dc:     	bl	0x10214de74
1021f01e0:     	cmp	w20, w0
1021f01e4:     	b.eq	0x1021f0210
1021f01e8:     	adrp	x0, 0x104d65000
1021f01ec:     	add	x0, x0, #0x330
1021f01f0:     	bl	0x10214de74
1021f01f4:     	cmp	w20, w0
1021f01f8:     	b.eq	0x1021f0210
1021f01fc:     	adrp	x0, 0x104d65000
1021f0200:     	add	x0, x0, #0x350
1021f0204:     	bl	0x10214de74
1021f0208:     	cmp	w20, w0
1021f020c:     	b.ne	0x1021f0234
1021f0210:     	adrp	x0, 0x104c93000
1021f0214:     	add	x0, x0, #0x570
1021f0218:     	bl	0x10214de74
1021f021c:     	add	x1, sp, #0x10
1021f0220:     	bl	0x1021b2a34
1021f0224:     	b	0x1021f0234
1021f0228:     	ldr	x0, [sp, #0x210]
1021f022c:     	add	x1, sp, #0x10
1021f0230:     	bl	0x1021bb9a4
1021f0234:     	add	x0, sp, #0x10
1021f0238:     	bl	0x1020cc308
1021f023c:     	add	x0, sp, #0x50
1021f0240:     	bl	0x1021285a4
1021f0244:     	adrp	x0, 0x104d65000
1021f0248:     	add	x0, x0, #0x3d0
1021f024c:     	bl	0x10214de74
1021f0250:     	cmp	w20, w0
1021f0254:     	b.ne	0x1021f029c
1021f0258:     	add	x20, sp, #0x50
1021f025c:     	add	x8, sp, #0x50
1021f0260:     	mov	w0, #0x1                ; =1
1021f0264:     	bl	0x1021e8930
1021f0268:     	mov	x8, sp
1021f026c:     	ldp	x19, x9, [sp, #0x50]
1021f0270:     	stp	x19, x9, [sp]
1021f0274:     	cbz	x9, 0x1021f0284
1021f0278:     	add	x9, x9, #0x8
1021f027c:     	mov	w10, #0x1               ; =1
1021f0280:     	ldadd	w10, w9, [x9]
1021f0284:     	add	x0, x8, #0x8
1021f0288:     	bl	0x10001022c
1021f028c:     	cbnz	x19, 0x1021f0294
1021f0290:     	bl	0x1021e8c48
1021f0294:     	add	x0, x20, #0x8
1021f0298:     	bl	0x10001022c
1021f029c:     	add	x0, x23, #0x8
1021f02a0:     	bl	0x10001022c
1021f02a4:     	add	sp, sp, #0x340
1021f02a8:     	ldp	x29, x30, [sp, #0x40]
1021f02ac:     	ldp	x20, x19, [sp, #0x30]
1021f02b0:     	ldp	x22, x21, [sp, #0x20]
1021f02b4:     	ldp	x24, x23, [sp, #0x10]
1021f02b8:     	ldp	x28, x27, [sp], #0x50
1021f02bc:     	ret
1021f02c0:     	adrp	x0, 0x104d63000
1021f02c4:     	add	x0, x0, #0xbc0
1021f02c8:     	bl	0x10214de74
1021f02cc:     	mov	x20, x0
1021f02d0:     	ldur	w8, [x29, #-0xac]
1021f02d4:     	cmp	w8, #0x8
1021f02d8:     	b.le	0x1021f04a4
1021f02dc:     	cmp	w8, #0xa
1021f02e0:     	b.le	0x1021f04c8
1021f02e4:     	cmp	w8, #0xb
1021f02e8:     	b.eq	0x1021f04bc
1021f02ec:     	cmp	w8, #0xc
1021f02f0:     	b.eq	0x1021f04f4
1021f02f4:     	cmp	w8, #0xd
1021f02f8:     	b.eq	0x1021f0500
1021f02fc:     	b	0x1021f0510
1021f0300:     	add	x9, sp, #0x228
1021f0304:     	add	x21, x9, #0x8
1021f0308:     	str	x8, [sp, #0x228]
1021f030c:     	str	xzr, [sp, #0x230]
1021f0310:     	add	x22, sp, #0x10
1021f0314:     	add	x0, sp, #0x228
1021f0318:     	bl	0x1021bb57c
1021f031c:     	mov	x19, x0
1021f0320:     	mov	x0, x21
1021f0324:     	bl	0x10001022c
1021f0328:     	cbz	w19, 0x1021f0490
1021f032c:     	ldp	d0, d1, [x29, #-0x70]
1021f0330:     	fcmp	d0, #0.0
1021f0334:     	adrp	x8, 0x1042e3000
1021f0338:     	ldr	d2, [x8, #0x690]
1021f033c:     	adrp	x8, 0x1042fe000
1021f0340:     	ldr	d3, [x8, #0xd20]
1021f0344:     	fcsel	d4, d3, d2, mi
1021f0348:     	fadd	d0, d0, d4
1021f034c:     	ldr	x0, [sp, #0x10]
1021f0350:     	fcvtzs	w8, d0
1021f0354:     	fcmp	d1, #0.0
1021f0358:     	fcsel	d0, d3, d2, mi
1021f035c:     	fadd	d0, d1, d0
1021f0360:     	fcvtzs	w9, d0
1021f0364:     	orr	x8, x8, x9, lsl #32
1021f0368:     	str	x8, [sp, #0x50]
1021f036c:     	ldr	x8, [x0]
1021f0370:     	ldr	x8, [x8, #0xc8]
1021f0374:     	add	x1, sp, #0x220
1021f0378:     	add	x2, sp, #0x50
1021f037c:     	blr	x8
1021f0380:     	cbz	w0, 0x1021f048c
1021f0384:     	ldr	x0, [sp, #0x10]
1021f0388:     	ldr	x8, [x0]
1021f038c:     	ldr	x9, [x8, #0x20]
1021f0390:     	add	x21, sp, #0x210
1021f0394:     	add	x8, sp, #0x210
1021f0398:     	blr	x9
1021f039c:     	ldr	x9, [sp, #0x210]
1021f03a0:     	ldr	x8, [sp, #0x218]
1021f03a4:     	str	x9, [sp, #0x200]
1021f03a8:     	str	x8, [sp, #0x208]
1021f03ac:     	cbz	x8, 0x1021f03bc
1021f03b0:     	add	x8, x8, #0x8
1021f03b4:     	mov	w9, #0x1                ; =1
1021f03b8:     	ldadd	w9, w8, [x8]
1021f03bc:     	add	x23, sp, #0x200
1021f03c0:     	add	x0, sp, #0x200
1021f03c4:     	bl	0x1021bb57c
1021f03c8:     	mov	x19, x0
1021f03cc:     	add	x0, x23, #0x8
1021f03d0:     	bl	0x10001022c
1021f03d4:     	cbnz	w19, 0x1021f0410
1021f03d8:     	add	x19, sp, #0x1f0
1021f03dc:     	add	x8, sp, #0x1f0
1021f03e0:     	add	x0, sp, #0x220
1021f03e4:     	bl	0x1021e91c0
1021f03e8:     	add	x8, sp, #0x50
1021f03ec:     	ldr	q0, [sp, #0x1f0]
1021f03f0:     	stp	xzr, xzr, [sp, #0x1f0]
1021f03f4:     	ldr	q1, [sp, #0x210]
1021f03f8:     	str	q0, [sp, #0x210]
1021f03fc:     	str	q1, [sp, #0x50]
1021f0400:     	orr	x0, x8, #0x8
1021f0404:     	bl	0x10001022c
1021f0408:     	orr	x0, x19, #0x8
1021f040c:     	bl	0x10001022c
1021f0410:     	ldr	x9, [sp, #0x210]
1021f0414:     	ldr	x8, [sp, #0x218]
1021f0418:     	stp	x9, x8, [sp, #0x1e0]
1021f041c:     	cbz	x8, 0x1021f042c
1021f0420:     	add	x8, x8, #0x8
1021f0424:     	mov	w9, #0x1                ; =1
1021f0428:     	ldadd	w9, w8, [x8]
1021f042c:     	add	x23, sp, #0x1e0
1021f0430:     	add	x0, sp, #0x1e0
1021f0434:     	bl	0x1021bb57c
1021f0438:     	mov	x19, x0
1021f043c:     	add	x0, x23, #0x8
1021f0440:     	bl	0x10001022c
1021f0444:     	cbz	w19, 0x1021f0480
1021f0448:     	ldr	x9, [sp, #0x210]
1021f044c:     	ldr	x8, [sp, #0x218]
1021f0450:     	stp	x9, x8, [sp, #0x1d0]
1021f0454:     	cbz	x8, 0x1021f0464
1021f0458:     	add	x8, x8, #0x8
1021f045c:     	mov	w9, #0x1                ; =1
1021f0460:     	ldadd	w9, w8, [x8]
1021f0464:     	add	x23, sp, #0x1d0
1021f0468:     	add	x0, sp, #0x1d0
1021f046c:     	bl	0x1020be73c
1021f0470:     	cmp	w0, #0x0
1021f0474:     	cset	w19, ne
1021f0478:     	add	x0, x23, #0x8
1021f047c:     	bl	0x10001022c
1021f0480:     	orr	x0, x21, #0x8
1021f0484:     	bl	0x10001022c
1021f0488:     	b	0x1021f0490
1021f048c:     	mov	w19, #0x0               ; =0
1021f0490:     	mov	x0, x20
1021f0494:     	mov	x1, x19
1021f0498:     	bl	0x10207d630
1021f049c:     	add	x0, x22, #0x8
1021f04a0:     	b	0x1021f02a0
1021f04a4:     	cmp	w8, #0x6
1021f04a8:     	b.gt	0x1021f04e4
1021f04ac:     	cmp	w8, #0x1
1021f04b0:     	b.eq	0x1021f0534
1021f04b4:     	cmp	w8, #0x6
1021f04b8:     	b.ne	0x1021f0510
1021f04bc:     	adrp	x0, 0x104d63000
1021f04c0:     	add	x0, x0, #0xd00
1021f04c4:     	b	0x1021f0508
1021f04c8:     	cmp	w8, #0x9
1021f04cc:     	b.eq	0x1021f04d8
1021f04d0:     	cmp	w8, #0xa
1021f04d4:     	b.ne	0x1021f0510
1021f04d8:     	adrp	x0, 0x104d63000
1021f04dc:     	add	x0, x0, #0xd20
1021f04e0:     	b	0x1021f0508
1021f04e4:     	cmp	w8, #0x7
1021f04e8:     	b.eq	0x1021f0500
1021f04ec:     	cmp	w8, #0x8
1021f04f0:     	b.ne	0x1021f0510
1021f04f4:     	adrp	x0, 0x104d63000
1021f04f8:     	add	x0, x0, #0xd60
1021f04fc:     	b	0x1021f0508
1021f0500:     	adrp	x0, 0x104d63000
1021f0504:     	add	x0, x0, #0xd40
1021f0508:     	bl	0x10214de74
1021f050c:     	mov	x20, x0
1021f0510:     	add	x21, sp, #0x238
1021f0514:     	add	x8, sp, #0x238
1021f0518:     	mov	x0, x20
1021f051c:     	bl	0x1020b86d8
1021f0520:     	add	x1, sp, #0x238
1021f0524:     	mov	x0, x19
1021f0528:     	bl	0x1021dfbbc
1021f052c:     	add	x0, x21, #0x8
1021f0530:     	b	0x1021f02a0
1021f0534:     	ldr	x8, [x19, #0x260]
1021f0538:     	ldr	x9, [x19, #0x268]
1021f053c:     	stp	x8, x9, [sp, #0x50]
1021f0540:     	cbz	x9, 0x1021f0574
1021f0544:     	add	x10, x9, #0x8
1021f0548:     	mov	w9, #0x1                ; =1
1021f054c:     	ldadd	w9, w10, [x10]
1021f0550:     	ldr	x10, [sp, #0x58]
1021f0554:     	add	x11, sp, #0x258
1021f0558:     	add	x21, x11, #0x8
1021f055c:     	str	x8, [sp, #0x258]
1021f0560:     	str	x10, [sp, #0x260]
1021f0564:     	cbz	x10, 0x1021f0584
1021f0568:     	add	x8, x10, #0x8
1021f056c:     	ldadd	w9, w8, [x8]
1021f0570:     	b	0x1021f0584
1021f0574:     	add	x9, sp, #0x258
1021f0578:     	add	x21, x9, #0x8
1021f057c:     	str	x8, [sp, #0x258]
1021f0580:     	str	xzr, [sp, #0x260]
1021f0584:     	add	x23, sp, #0x50
1021f0588:     	add	x0, sp, #0x258
1021f058c:     	bl	0x1021bb57c
1021f0590:     	mov	x22, x0
1021f0594:     	mov	x0, x21
1021f0598:     	bl	0x10001022c
1021f059c:     	cbz	w22, 0x1021f0604
1021f05a0:     	ldur	q0, [x29, #-0x70]
1021f05a4:     	fcvtzs.2d	v0, v0
1021f05a8:     	xtn.2s	v0, v0
1021f05ac:     	str	d0, [sp, #0x210]
1021f05b0:     	ldr	x0, [sp, #0x50]
1021f05b4:     	ldr	x8, [x0]
1021f05b8:     	ldr	x9, [x8, #0x88]
1021f05bc:     	add	x20, sp, #0x10
1021f05c0:     	add	x8, sp, #0x10
1021f05c4:     	add	x1, sp, #0x210
1021f05c8:     	blr	x9
1021f05cc:     	ldp	x9, x8, [sp, #0x10]
1021f05d0:     	str	x9, [sp, #0x248]
1021f05d4:     	str	x8, [sp, #0x250]
1021f05d8:     	cbz	x8, 0x1021f05e8
1021f05dc:     	add	x8, x8, #0x8
1021f05e0:     	mov	w9, #0x1                ; =1
1021f05e4:     	ldadd	w9, w8, [x8]
1021f05e8:     	add	x21, sp, #0x248
1021f05ec:     	add	x1, sp, #0x248
1021f05f0:     	mov	x0, x19
1021f05f4:     	bl	0x1021dfbbc
1021f05f8:     	add	x0, x21, #0x8
1021f05fc:     	bl	0x10001022c
1021f0600:     	b	0x1021f0294
1021f0604:     	add	x0, x23, #0x8
1021f0608:     	bl	0x10001022c
1021f060c:     	b	0x1021f0510
1021f0610:     	mov	x19, x0
1021f0614:     	b	0x1021f0624
1021f0618:     	mov	x19, x0
1021f061c:     	add	x0, x24, #0x8
1021f0620:     	bl	0x10001022c
1021f0624:     	add	x0, x22, #0x8
1021f0628:     	b	0x1021f0740
1021f062c:     	b	0x1021f0774
1021f0630:     	mov	x19, x0
1021f0634:     	add	x0, x21, #0x8
1021f0638:     	bl	0x10001022c
1021f063c:     	b	0x1021f06c8
1021f0640:     	b	0x1021f0774
1021f0644:     	b	0x1021f0774
1021f0648:     	b	0x1021f0738
1021f064c:     	mov	x19, x0
1021f0650:     	b	0x1021f0674
1021f0654:     	b	0x1021f0668
1021f0658:     	mov	x19, x0
1021f065c:     	add	x0, x21, #0x8
1021f0660:     	b	0x1021f0788
1021f0664:     	b	0x1021f0668
1021f0668:     	mov	x19, x0
1021f066c:     	add	x0, x23, #0x8
1021f0670:     	bl	0x10001022c
1021f0674:     	orr	x0, x21, #0x8
1021f0678:     	b	0x1021f06ac
1021f067c:     	b	0x1021f0780
1021f0680:     	b	0x1021f06b4
1021f0684:     	b	0x1021f06b4
1021f0688:     	b	0x1021f0780
1021f068c:     	mov	x19, x0
1021f0690:     	add	x0, x20, #0x8
1021f0694:     	b	0x1021f0788
1021f0698:     	b	0x1021f06b4
1021f069c:     	b	0x1021f06b4
1021f06a0:     	b	0x1021f0780
1021f06a4:     	mov	x19, x0
1021f06a8:     	mov	x0, x21
1021f06ac:     	bl	0x10001022c
1021f06b0:     	b	0x1021f0784
1021f06b4:     	mov	x19, x0
1021f06b8:     	b	0x1021f06ec
1021f06bc:     	b	0x1021f06e0
1021f06c0:     	b	0x1021f06e0
1021f06c4:     	mov	x19, x0
1021f06c8:     	add	x0, x20, #0x8
1021f06cc:     	b	0x1021f0740
1021f06d0:     	b	0x1021f06e0
1021f06d4:     	b	0x1021f06e0
1021f06d8:     	b	0x1021f0774
1021f06dc:     	b	0x1021f06e0
1021f06e0:     	mov	x19, x0
1021f06e4:     	add	x0, x24, #0x8
1021f06e8:     	bl	0x10001022c
1021f06ec:     	orr	x0, x22, #0x8
1021f06f0:     	b	0x1021f0740
1021f06f4:     	b	0x1021f0774
1021f06f8:     	mov	x19, x0
1021f06fc:     	add	x0, x22, #0x8
1021f0700:     	b	0x1021f071c
1021f0704:     	b	0x1021f0758
1021f0708:     	mov	x19, x0
1021f070c:     	b	0x1021f0764
1021f0710:     	b	0x1021f0774
1021f0714:     	mov	x19, x0
1021f0718:     	add	x0, x21, #0x8
1021f071c:     	bl	0x10001022c
1021f0720:     	b	0x1021f0728
1021f0724:     	mov	x19, x0
1021f0728:     	add	x0, sp, #0x50
1021f072c:     	bl	0x1020cc308
1021f0730:     	b	0x1021f0778
1021f0734:     	b	0x1021f0774
1021f0738:     	mov	x19, x0
1021f073c:     	mov	x0, x21
1021f0740:     	bl	0x10001022c
1021f0744:     	b	0x1021f0778
1021f0748:     	mov	x19, x0
1021f074c:     	add	x0, sp, #0x10
1021f0750:     	bl	0x1020cc308
1021f0754:     	b	0x1021f075c
1021f0758:     	mov	x19, x0
1021f075c:     	add	x0, sp, #0x50
1021f0760:     	bl	0x1021285a4
1021f0764:     	mov	x0, x19
1021f0768:     	bl	0x103bdd3dc
1021f076c:     	bl	0x103bdd3f4
1021f0770:     	b	0x1021f0244
1021f0774:     	mov	x19, x0
1021f0778:     	add	x0, x23, #0x8
1021f077c:     	b	0x1021f0788
1021f0780:     	mov	x19, x0
1021f0784:     	add	x0, x22, #0x8
1021f0788:     	bl	0x10001022c
1021f078c:     	mov	x0, x19
1021f0790:     	bl	0x103bda970

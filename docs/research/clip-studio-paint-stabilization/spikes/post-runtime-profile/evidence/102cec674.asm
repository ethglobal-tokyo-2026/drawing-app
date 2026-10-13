
FUNCTION 0x102cec674 size 1596
102cec674:     	sub	sp, sp, #0x1c0
102cec678:     	stp	d9, d8, [sp, #0x150]
102cec67c:     	stp	x28, x27, [sp, #0x160]
102cec680:     	stp	x26, x25, [sp, #0x170]
102cec684:     	stp	x24, x23, [sp, #0x180]
102cec688:     	stp	x22, x21, [sp, #0x190]
102cec68c:     	stp	x20, x19, [sp, #0x1a0]
102cec690:     	stp	x29, x30, [sp, #0x1b0]
102cec694:     	add	x29, sp, #0x1b0
102cec698:     	mov	x21, x1
102cec69c:     	mov	x22, x0
102cec6a0:     	mov	x20, x8
102cec6a4:     	ldr	x0, [x0, #0x20]
102cec6a8:     	sub	x8, x29, #0x98
102cec6ac:     	bl	0x102925638
102cec6b0:     	ldr	x0, [x22, #0x20]
102cec6b4:     	sub	x8, x29, #0xa8
102cec6b8:     	bl	0x10290e8e8
102cec6bc:     	add	x8, sp, #0xb8
102cec6c0:     	stp	xzr, xzr, [x29, #-0xb8]
102cec6c4:     	add	x9, x8, #0x8
102cec6c8:     	add	x8, sp, #0xc8
102cec6cc:     	add	x25, x8, #0x8
102cec6d0:     	mov	w23, #0x18              ; =24
102cec6d4:     	mov	w19, #0x1               ; =1
102cec6d8:     	adrp	x28, 0x104a71000
102cec6dc:     	add	x28, x28, #0x218
102cec6e0:     	stp	x25, x9, [sp, #0x10]
102cec6e4:     	sub	x0, x29, #0x98
102cec6e8:     	sub	x1, x29, #0xb8
102cec6ec:     	bl	0x1025a92a8
102cec6f0:     	cbz	w0, 0x102cecad8
102cec6f4:     	ldp	x9, x8, [x29, #-0xb8]
102cec6f8:     	stp	x9, x8, [x29, #-0xc8]
102cec6fc:     	cbz	x8, 0x102cec708
102cec700:     	add	x8, x8, #0x8
102cec704:     	ldadd	w19, w8, [x8]
102cec708:     	ldp	x9, x8, [x29, #-0xa8]
102cec70c:     	stp	x9, x8, [sp, #0xd8]
102cec710:     	cbz	x8, 0x102cec71c
102cec714:     	add	x8, x8, #0x8
102cec718:     	ldadd	w19, w8, [x8]
102cec71c:     	sub	x0, x29, #0xc8
102cec720:     	add	x1, sp, #0xd8
102cec724:     	mov	w2, #0x0                ; =0
102cec728:     	bl	0x1026b18fc
102cec72c:     	mov	x24, x0
102cec730:     	add	x8, sp, #0xd8
102cec734:     	add	x0, x8, #0x8
102cec738:     	bl	0x10001022c
102cec73c:     	sub	x8, x29, #0xc8
102cec740:     	add	x0, x8, #0x8
102cec744:     	bl	0x10001022c
102cec748:     	cbz	w24, 0x102cec6e4
102cec74c:     	ldp	x9, x8, [x29, #-0xb8]
102cec750:     	stp	x9, x8, [sp, #0xb8]
102cec754:     	cbz	x8, 0x102cec760
102cec758:     	add	x8, x8, #0x8
102cec75c:     	ldadd	w19, w8, [x8]
102cec760:     	add	x8, sp, #0xc8
102cec764:     	add	x0, sp, #0xb8
102cec768:     	bl	0x1026b10f8
102cec76c:     	ldr	x0, [sp, #0x18]
102cec770:     	bl	0x10001022c
102cec774:     	ldr	x8, [sp, #0xc8]
102cec778:     	cbz	x8, 0x102cec9fc
102cec77c:     	ldur	x0, [x29, #-0xb8]
102cec780:     	bl	0x102576608
102cec784:     	lsr	x8, x0, #32
102cec788:     	scvtf	d8, w0
102cec78c:     	scvtf	d9, w8
102cec790:     	ldp	d0, d1, [x21]
102cec794:     	fsub	d0, d0, d8
102cec798:     	fsub	d1, d1, d9
102cec79c:     	stp	d0, d1, [sp, #0xa8]
102cec7a0:     	ldr	x0, [sp, #0xc8]
102cec7a4:     	bl	0x1026dd7d0
102cec7a8:     	mov	x25, x0
102cec7ac:     	cmp	w0, #0x1
102cec7b0:     	b.lt	0x102cec8c8
102cec7b4:     	mov	w26, #0x0               ; =0
102cec7b8:     	ldr	x0, [sp, #0xc8]
102cec7bc:     	add	x8, sp, #0x98
102cec7c0:     	mov	x1, x26
102cec7c4:     	bl	0x1026dd7d8
102cec7c8:     	ldr	x0, [sp, #0x98]
102cec7cc:     	bl	0x1026a9e88
102cec7d0:     	cbz	w0, 0x102cec8b0
102cec7d4:     	mov	w0, #0xd8               ; =216
102cec7d8:     	bl	0x103bdd37c
102cec7dc:     	mov	x24, x0
102cec7e0:     	bl	0x102ce983c
102cec7e4:     	str	x28, [x24]
102cec7e8:     	str	w23, [x24, #0x20]
102cec7ec:     	mov	x27, x24
102cec7f0:     	movi.2d	v0, #0000000000000000
102cec7f4:     	str	q0, [x27, #0xa8]!
102cec7f8:     	stur	q0, [x24, #0xb8]
102cec7fc:     	stur	q0, [x24, #0xc8]
102cec800:     	mov	x0, x20
102cec804:     	mov	x1, x24
102cec808:     	bl	0x102ced630
102cec80c:     	ldr	w8, [x21, #0x14]
102cec810:     	str	w8, [x24, #0x24]
102cec814:     	stp	d8, d9, [x24, #0x48]
102cec818:     	add	x1, x24, #0x78
102cec81c:     	mov	x0, x22
102cec820:     	bl	0x102ce8d3c
102cec824:     	add	x8, sp, #0x88
102cec828:     	bl	0x1026f1c00
102cec82c:     	ldp	x9, x8, [sp, #0x98]
102cec830:     	str	x9, [sp, #0x70]
102cec834:     	stp	x8, xzr, [sp, #0x78]
102cec838:     	cbz	x8, 0x102cec844
102cec83c:     	add	x8, x8, #0x8
102cec840:     	ldadd	w19, w8, [x8]
102cec844:     	ldp	x9, x8, [sp, #0x88]
102cec848:     	stp	x9, x8, [sp, #0x60]
102cec84c:     	cbz	x8, 0x102cec858
102cec850:     	add	x8, x8, #0x8
102cec854:     	ldadd	w19, w8, [x8]
102cec858:     	add	x0, sp, #0x70
102cec85c:     	add	x1, sp, #0x60
102cec860:     	add	x2, sp, #0xa8
102cec864:     	add	x4, x24, #0xb8
102cec868:     	add	x5, sp, #0x84
102cec86c:     	add	x6, sp, #0x80
102cec870:     	mov	x3, x27
102cec874:     	bl	0x102ceccb0
102cec878:     	str	x0, [x24, #0x28]
102cec87c:     	add	x8, sp, #0x60
102cec880:     	add	x0, x8, #0x8
102cec884:     	bl	0x10001022c
102cec888:     	add	x8, sp, #0x70
102cec88c:     	add	x0, x8, #0x8
102cec890:     	bl	0x10001022c
102cec894:     	ldr	x0, [x24, #0x28]
102cec898:     	cbnz	x0, 0x102ceca08
102cec89c:     	add	x8, sp, #0x88
102cec8a0:     	add	x0, x8, #0x8
102cec8a4:     	bl	0x10001022c
102cec8a8:     	add	x0, x20, #0x8
102cec8ac:     	bl	0x10001022c
102cec8b0:     	add	x8, sp, #0x98
102cec8b4:     	add	x0, x8, #0x8
102cec8b8:     	bl	0x10001022c
102cec8bc:     	add	w26, w26, #0x1
102cec8c0:     	cmp	w25, w26
102cec8c4:     	b.ne	0x102cec7b8
102cec8c8:     	ldr	x0, [sp, #0xc8]
102cec8cc:     	bl	0x1026dda54
102cec8d0:     	mov	x24, x0
102cec8d4:     	cmp	w0, #0x1
102cec8d8:     	b.lt	0x102cec9f8
102cec8dc:     	mov	w25, #0x0               ; =0
102cec8e0:     	ldr	x0, [sp, #0xc8]
102cec8e4:     	add	x8, sp, #0x98
102cec8e8:     	mov	x1, x25
102cec8ec:     	bl	0x1026dda5c
102cec8f0:     	ldr	x0, [sp, #0x98]
102cec8f4:     	bl	0x1026baaf8
102cec8f8:     	cbz	w0, 0x102cec9e0
102cec8fc:     	mov	w0, #0xd8               ; =216
102cec900:     	bl	0x103bdd37c
102cec904:     	mov	x26, x0
102cec908:     	bl	0x102ce983c
102cec90c:     	str	x28, [x26]
102cec910:     	str	w23, [x26, #0x20]
102cec914:     	mov	x27, x26
102cec918:     	movi.2d	v0, #0000000000000000
102cec91c:     	str	q0, [x27, #0xa8]!
102cec920:     	stur	q0, [x26, #0xb8]
102cec924:     	stur	q0, [x26, #0xc8]
102cec928:     	mov	x0, x20
102cec92c:     	mov	x1, x26
102cec930:     	bl	0x102ced630
102cec934:     	ldr	w8, [x21, #0x14]
102cec938:     	str	w8, [x26, #0x24]
102cec93c:     	stp	d8, d9, [x26, #0x48]
102cec940:     	add	x1, x26, #0x78
102cec944:     	mov	x0, x22
102cec948:     	bl	0x102ce8d3c
102cec94c:     	add	x8, sp, #0x88
102cec950:     	bl	0x1026f1c00
102cec954:     	ldp	x9, x8, [sp, #0x98]
102cec958:     	stp	x9, x8, [sp, #0x30]
102cec95c:     	cbz	x8, 0x102cec968
102cec960:     	add	x8, x8, #0x8
102cec964:     	ldadd	w19, w8, [x8]
102cec968:     	ldp	x9, x8, [sp, #0x88]
102cec96c:     	stp	x9, x8, [sp, #0x20]
102cec970:     	cbz	x8, 0x102cec97c
102cec974:     	add	x8, x8, #0x8
102cec978:     	ldadd	w19, w8, [x8]
102cec97c:     	add	x8, x26, #0xd0
102cec980:     	str	x8, [sp]
102cec984:     	add	x0, sp, #0x30
102cec988:     	add	x1, sp, #0x20
102cec98c:     	add	x2, sp, #0xa8
102cec990:     	add	x4, x26, #0xb8
102cec994:     	add	x5, x26, #0x30
102cec998:     	add	x6, x26, #0x38
102cec99c:     	add	x7, x26, #0xc8
102cec9a0:     	mov	x3, x27
102cec9a4:     	bl	0x102cecd98
102cec9a8:     	str	x0, [x26, #0x28]
102cec9ac:     	add	x8, sp, #0x20
102cec9b0:     	add	x0, x8, #0x8
102cec9b4:     	bl	0x10001022c
102cec9b8:     	add	x8, sp, #0x30
102cec9bc:     	add	x0, x8, #0x8
102cec9c0:     	bl	0x10001022c
102cec9c4:     	ldr	x0, [x26, #0x28]
102cec9c8:     	cbnz	x0, 0x102ceca60
102cec9cc:     	add	x8, sp, #0x88
102cec9d0:     	add	x0, x8, #0x8
102cec9d4:     	bl	0x10001022c
102cec9d8:     	add	x0, x20, #0x8
102cec9dc:     	bl	0x10001022c
102cec9e0:     	add	x8, sp, #0x98
102cec9e4:     	add	x0, x8, #0x8
102cec9e8:     	bl	0x10001022c
102cec9ec:     	add	w25, w25, #0x1
102cec9f0:     	cmp	w24, w25
102cec9f4:     	b.ne	0x102cec8e0
102cec9f8:     	ldr	x25, [sp, #0x10]
102cec9fc:     	mov	x0, x25
102ceca00:     	bl	0x10001022c
102ceca04:     	b	0x102cec6e4
102ceca08:     	mov	w1, #0x0                ; =0
102ceca0c:     	bl	0x102781e2c
102ceca10:     	str	d0, [x24, #0x40]
102ceca14:     	ldr	w8, [sp, #0x84]
102ceca18:     	ldr	x21, [sp, #0x10]
102ceca1c:     	cbz	w8, 0x102ceca90
102ceca20:     	ldr	x8, [x24, #0x28]
102ceca24:     	ldr	x8, [x8, #0x30]
102ceca28:     	cbz	x8, 0x102cecb10
102ceca2c:     	ldp	d0, d1, [x8, #0x8]
102ceca30:     	stp	d0, d1, [sp, #0x50]
102ceca34:     	ldp	d2, d3, [x24, #0xa8]
102ceca38:     	fadd	d2, d0, d2
102ceca3c:     	fadd	d3, d1, d3
102ceca40:     	ldp	d4, d5, [sp, #0xa8]
102ceca44:     	bl	0x102194410
102ceca48:     	stp	d0, d1, [sp, #0x40]
102ceca4c:     	add	x0, sp, #0x50
102ceca50:     	add	x1, sp, #0x40
102ceca54:     	bl	0x102193618
102ceca58:     	str	d0, [x24, #0xc8]
102ceca5c:     	b	0x102cecb10
102ceca60:     	mov	w1, #0x0                ; =0
102ceca64:     	bl	0x102781e2c
102ceca68:     	str	d0, [x26, #0x40]
102ceca6c:     	add	x8, sp, #0x88
102ceca70:     	add	x0, x8, #0x8
102ceca74:     	bl	0x10001022c
102ceca78:     	add	x8, sp, #0x98
102ceca7c:     	add	x0, x8, #0x8
102ceca80:     	bl	0x10001022c
102ceca84:     	sub	x19, x29, #0xb8
102ceca88:     	ldr	x21, [sp, #0x10]
102ceca8c:     	b	0x102cecb2c
102ceca90:     	ldr	w8, [sp, #0x80]
102ceca94:     	cbz	w8, 0x102cecae4
102ceca98:     	ldr	x8, [x24, #0x28]
102ceca9c:     	ldr	x8, [x8, #0x38]
102cecaa0:     	cbz	x8, 0x102cecb10
102cecaa4:     	ldp	d0, d1, [x8, #0x8]
102cecaa8:     	stp	d0, d1, [sp, #0x50]
102cecaac:     	ldp	d2, d3, [x24, #0xb8]
102cecab0:     	fadd	d2, d0, d2
102cecab4:     	fadd	d3, d1, d3
102cecab8:     	ldp	d4, d5, [sp, #0xa8]
102cecabc:     	bl	0x102194410
102cecac0:     	stp	d0, d1, [sp, #0x40]
102cecac4:     	add	x0, sp, #0x50
102cecac8:     	add	x1, sp, #0x40
102cecacc:     	bl	0x102193618
102cecad0:     	str	d0, [x24, #0xd0]
102cecad4:     	b	0x102cecb10
102cecad8:     	stp	xzr, xzr, [x20]
102cecadc:     	sub	x19, x29, #0xb8
102cecae0:     	b	0x102cecb34
102cecae4:     	mov	x8, #0x848000000000     ; =145685290680320
102cecae8:     	movk	x8, #0x412e, lsl #48
102cecaec:     	str	x8, [sp, #0x40]
102cecaf0:     	stp	xzr, xzr, [sp, #0x50]
102cecaf4:     	ldr	x0, [x24, #0x28]
102cecaf8:     	ldp	d0, d1, [sp, #0xa8]
102cecafc:     	add	x1, sp, #0x40
102cecb00:     	add	x2, sp, #0x50
102cecb04:     	add	x3, x24, #0x30
102cecb08:     	add	x4, x24, #0x38
102cecb0c:     	bl	0x102782054
102cecb10:     	add	x8, sp, #0x88
102cecb14:     	add	x0, x8, #0x8
102cecb18:     	bl	0x10001022c
102cecb1c:     	add	x8, sp, #0x98
102cecb20:     	add	x0, x8, #0x8
102cecb24:     	bl	0x10001022c
102cecb28:     	sub	x19, x29, #0xb8
102cecb2c:     	mov	x0, x21
102cecb30:     	bl	0x10001022c
102cecb34:     	add	x0, x19, #0x8
102cecb38:     	bl	0x10001022c
102cecb3c:     	sub	x8, x29, #0xa8
102cecb40:     	add	x0, x8, #0x8
102cecb44:     	bl	0x10001022c
102cecb48:     	sub	x0, x29, #0x98
102cecb4c:     	bl	0x1025a9228
102cecb50:     	ldp	x29, x30, [sp, #0x1b0]
102cecb54:     	ldp	x20, x19, [sp, #0x1a0]
102cecb58:     	ldp	x22, x21, [sp, #0x190]
102cecb5c:     	ldp	x24, x23, [sp, #0x180]
102cecb60:     	ldp	x26, x25, [sp, #0x170]
102cecb64:     	ldp	x28, x27, [sp, #0x160]
102cecb68:     	ldp	d9, d8, [sp, #0x150]
102cecb6c:     	add	sp, sp, #0x1c0
102cecb70:     	ret
102cecb74:     	b	0x102cecb84
102cecb78:     	b	0x102cecb84
102cecb7c:     	b	0x102cecb84
102cecb80:     	b	0x102cecb84
102cecb84:     	mov	x21, x0
102cecb88:     	b	0x102cecc30
102cecb8c:     	mov	x21, x0
102cecb90:     	b	0x102cecca0
102cecb94:     	b	0x102cecc68
102cecb98:     	b	0x102cecc68
102cecb9c:     	b	0x102cecc68
102cecba0:     	mov	x21, x0
102cecba4:     	ldr	x0, [sp, #0x18]
102cecba8:     	sub	x19, x29, #0xb8
102cecbac:     	b	0x102cecc88
102cecbb0:     	mov	x21, x0
102cecbb4:     	add	x8, sp, #0xd8
102cecbb8:     	add	x0, x8, #0x8
102cecbbc:     	bl	0x10001022c
102cecbc0:     	sub	x8, x29, #0xc8
102cecbc4:     	add	x0, x8, #0x8
102cecbc8:     	bl	0x10001022c
102cecbcc:     	b	0x102cecbd4
102cecbd0:     	mov	x21, x0
102cecbd4:     	sub	x19, x29, #0xb8
102cecbd8:     	b	0x102cecc8c
102cecbdc:     	b	0x102cecc0c
102cecbe0:     	mov	x21, x0
102cecbe4:     	mov	x0, x26
102cecbe8:     	b	0x102cecc50
102cecbec:     	b	0x102cecc0c
102cecbf0:     	mov	x21, x0
102cecbf4:     	add	x8, sp, #0x20
102cecbf8:     	add	x0, x8, #0x8
102cecbfc:     	bl	0x10001022c
102cecc00:     	add	x8, sp, #0x30
102cecc04:     	b	0x102cecc28
102cecc08:     	b	0x102cecc0c
102cecc0c:     	mov	x21, x0
102cecc10:     	b	0x102cecc3c
102cecc14:     	mov	x21, x0
102cecc18:     	add	x8, sp, #0x60
102cecc1c:     	add	x0, x8, #0x8
102cecc20:     	bl	0x10001022c
102cecc24:     	add	x8, sp, #0x70
102cecc28:     	add	x0, x8, #0x8
102cecc2c:     	bl	0x10001022c
102cecc30:     	add	x8, sp, #0x88
102cecc34:     	add	x0, x8, #0x8
102cecc38:     	bl	0x10001022c
102cecc3c:     	add	x0, x20, #0x8
102cecc40:     	bl	0x10001022c
102cecc44:     	b	0x102cecc74
102cecc48:     	mov	x21, x0
102cecc4c:     	mov	x0, x24
102cecc50:     	bl	0x103bdd34c
102cecc54:     	b	0x102cecc74
102cecc58:     	b	0x102cecc70
102cecc5c:     	b	0x102cecc68
102cecc60:     	b	0x102cecc70
102cecc64:     	b	0x102cecc70
102cecc68:     	mov	x21, x0
102cecc6c:     	b	0x102cecc80
102cecc70:     	mov	x21, x0
102cecc74:     	add	x8, sp, #0x98
102cecc78:     	add	x0, x8, #0x8
102cecc7c:     	bl	0x10001022c
102cecc80:     	sub	x19, x29, #0xb8
102cecc84:     	ldr	x0, [sp, #0x10]
102cecc88:     	bl	0x10001022c
102cecc8c:     	add	x0, x19, #0x8
102cecc90:     	bl	0x10001022c
102cecc94:     	sub	x8, x29, #0xa8
102cecc98:     	add	x0, x8, #0x8
102cecc9c:     	bl	0x10001022c
102cecca0:     	sub	x0, x29, #0x98
102cecca4:     	bl	0x1025a9228
102cecca8:     	mov	x0, x21
102ceccac:     	bl	0x103bda970

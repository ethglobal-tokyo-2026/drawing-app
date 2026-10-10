
FUNCTION 0x10205d658 size 4
10205d658:     	ret

FUNCTION 0x10205d65c size 4
10205d65c:     	ret

FUNCTION 0x10205d660 size 232
10205d660:     	stp	x22, x21, [sp, #-0x30]!
10205d664:     	stp	x20, x19, [sp, #0x10]
10205d668:     	stp	x29, x30, [sp, #0x20]
10205d66c:     	add	x29, sp, #0x20
10205d670:     	mov	x20, x2
10205d674:     	mov	x19, x0
10205d678:     	mov	x0, x2
10205d67c:     	mov	w2, #0x7                ; =7
10205d680:     	mov	x3, x19
10205d684:     	bl	0x103bee5a0
10205d688:     	bl	0x103be6780
10205d68c:     	cmp	x0, #0x2
10205d690:     	b.ne	0x10205d738
10205d694:     	mov	x0, x20
10205d698:     	mov	w2, #0x7                ; =7
10205d69c:     	mov	x3, x19
10205d6a0:     	bl	0x103bee5a0
10205d6a4:     	mov	x21, x0
10205d6a8:     	bl	0x103be6780
10205d6ac:     	cmp	x0, #0x2
10205d6b0:     	b.ne	0x10205d71c
10205d6b4:     	adrp	x8, 0x104af8000
10205d6b8:     	ldrsw	x8, [x8, #0xd78]
10205d6bc:     	str	xzr, [x19, x8]
10205d6c0:     	mov	x0, x20
10205d6c4:     	bl	0x103be97c0
10205d6c8:     	mov	x0, x19
10205d6cc:     	mov	x2, #0x0                ; =0
10205d6d0:     	bl	0x103be65e0
10205d6d4:     	adrp	x8, 0x104af8000
10205d6d8:     	ldrsw	x8, [x8, #0xd7c]
10205d6dc:     	add	x8, x19, x8
10205d6e0:     	stp	d0, d1, [x8]
10205d6e4:     	mov	x0, x21
10205d6e8:     	bl	0x10205d748
10205d6ec:     	adrp	x8, 0x104af8000
10205d6f0:     	ldrsw	x8, [x8, #0xd80]
10205d6f4:     	str	d0, [x19, x8]
10205d6f8:     	adrp	x8, 0x104af8000
10205d6fc:     	ldrsw	x8, [x8, #0xd84]
10205d700:     	str	d0, [x19, x8]
10205d704:     	adrp	x8, 0x104af8000
10205d708:     	ldrsw	x8, [x8, #0xd88]
10205d70c:     	mov	w9, #0x1                ; =1
10205d710:     	str	x9, [x19, x8]
10205d714:     	mov	w8, #0x2                ; =2
10205d718:     	b	0x10205d72c
10205d71c:     	adrp	x8, 0x104af8000
10205d720:     	ldrsw	x8, [x8, #0xd84]
10205d724:     	str	xzr, [x19, x8]
10205d728:     	mov	w8, #0x1                ; =1
10205d72c:     	adrp	x9, 0x104af8000
10205d730:     	ldrsw	x9, [x9, #0xd8c]
10205d734:     	str	x8, [x19, x9]
10205d738:     	ldp	x29, x30, [sp, #0x20]
10205d73c:     	ldp	x20, x19, [sp, #0x10]
10205d740:     	ldp	x22, x21, [sp], #0x30
10205d744:     	ret

FUNCTION 0x10205d748 size 184
10205d748:     	stp	d11, d10, [sp, #-0x40]!
10205d74c:     	stp	d9, d8, [sp, #0x10]
10205d750:     	stp	x20, x19, [sp, #0x20]
10205d754:     	stp	x29, x30, [sp, #0x30]
10205d758:     	add	x29, sp, #0x30
10205d75c:     	mov	x19, x0
10205d760:     	bl	0x103be6780
10205d764:     	cmp	x0, #0x2
10205d768:     	b.ne	0x10205d7e8
10205d76c:     	mov	x0, x19
10205d770:     	bl	0x103be5440
10205d774:     	mov	x19, x0
10205d778:     	mov	x2, #0x0                ; =0
10205d77c:     	bl	0x103bea300
10205d780:     	mov	x20, x0
10205d784:     	mov	x0, x19
10205d788:     	mov	w2, #0x1                ; =1
10205d78c:     	bl	0x103bea300
10205d790:     	mov	x19, x0
10205d794:     	mov	x0, x20
10205d798:     	bl	0x103bea0e0
10205d79c:     	fmov	d8, d0
10205d7a0:     	fmov	d9, d1
10205d7a4:     	mov	x0, x19
10205d7a8:     	bl	0x103bea0e0
10205d7ac:     	fmov	d10, d0
10205d7b0:     	fmov	d11, d1
10205d7b4:     	mov	x0, x20
10205d7b8:     	bl	0x103be6e60
10205d7bc:     	fsub	d2, d8, d10
10205d7c0:     	fmul	d0, d2, d0
10205d7c4:     	fadd	d0, d0, d0
10205d7c8:     	fsub	d2, d9, d11
10205d7cc:     	fmul	d1, d2, d1
10205d7d0:     	fadd	d1, d1, d1
10205d7d4:     	ldp	x29, x30, [sp, #0x30]
10205d7d8:     	ldp	x20, x19, [sp, #0x20]
10205d7dc:     	ldp	d9, d8, [sp, #0x10]
10205d7e0:     	ldp	d11, d10, [sp], #0x40
10205d7e4:     	b	0x103bdf290
10205d7e8:     	movi	d0, #0000000000000000
10205d7ec:     	ldp	x29, x30, [sp, #0x30]
10205d7f0:     	ldp	x20, x19, [sp, #0x20]
10205d7f4:     	ldp	d9, d8, [sp, #0x10]
10205d7f8:     	ldp	d11, d10, [sp], #0x40
10205d7fc:     	ret

FUNCTION 0x10205d800 size 124
10205d800:     	stp	x20, x19, [sp, #-0x20]!
10205d804:     	stp	x29, x30, [sp, #0x10]
10205d808:     	add	x29, sp, #0x10
10205d80c:     	mov	x19, x0
10205d810:     	mov	x0, x2
10205d814:     	mov	w2, #0x7                ; =7
10205d818:     	mov	x3, x19
10205d81c:     	bl	0x103bee5a0
10205d820:     	mov	x20, x0
10205d824:     	bl	0x103be6780
10205d828:     	cmp	x0, #0x2
10205d82c:     	b.ne	0x10205d858
10205d830:     	mov	x0, x20
10205d834:     	bl	0x10205d748
10205d838:     	adrp	x8, 0x104af8000
10205d83c:     	ldrsw	x8, [x8, #0xd84]
10205d840:     	str	d0, [x19, x8]
10205d844:     	adrp	x8, 0x104af8000
10205d848:     	ldrsw	x8, [x8, #0xd88]
10205d84c:     	mov	w9, #0x2                ; =2
10205d850:     	str	x9, [x19, x8]
10205d854:     	b	0x10205d870
10205d858:     	adrp	x8, 0x104af8000
10205d85c:     	ldrsw	x8, [x8, #0xd84]
10205d860:     	str	xzr, [x19, x8]
10205d864:     	adrp	x8, 0x104af8000
10205d868:     	ldrsw	x8, [x8, #0xd80]
10205d86c:     	str	xzr, [x19, x8]
10205d870:     	ldp	x29, x30, [sp, #0x10]
10205d874:     	ldp	x20, x19, [sp], #0x20
10205d878:     	ret

FUNCTION 0x10205d87c size 4
10205d87c:     	ret

FUNCTION 0x10205d880 size 132
10205d880:     	sub	sp, sp, #0x90
10205d884:     	stp	x20, x19, [sp, #0x70]
10205d888:     	stp	x29, x30, [sp, #0x80]
10205d88c:     	add	x29, sp, #0x80
10205d890:     	mov	x19, x0
10205d894:     	adrp	x8, 0x104af8000
10205d898:     	ldrsw	x8, [x8, #0xd88]
10205d89c:     	mov	w9, #0x1                ; =1
10205d8a0:     	str	x9, [x0, x8]
10205d8a4:     	bl	0x103beed00
10205d8a8:     	bl	0x103beed40
10205d8ac:     	bl	0x103be95e0
10205d8b0:     	cbz	x0, 0x10205d8f4
10205d8b4:     	ldr	x8, [x0, #0x70]
10205d8b8:     	cbz	x8, 0x10205d8f4
10205d8bc:     	mov	w9, #0x2                ; =2
10205d8c0:     	mov	w10, #0x4               ; =4
10205d8c4:     	str	w9, [sp, #0x8]
10205d8c8:     	str	w10, [sp, #0x68]
10205d8cc:     	add	x1, sp, #0x8
10205d8d0:     	blr	x8
10205d8d4:     	adrp	x8, 0x104c8e000
10205d8d8:     	ldr	x9, [x8, #0x500]
10205d8dc:     	add	x9, x9, #0x1
10205d8e0:     	str	x9, [x8, #0x500]
10205d8e4:     	adrp	x8, 0x104af8000
10205d8e8:     	ldrsw	x8, [x8, #0xd70]
10205d8ec:     	mov	w9, #0x1                ; =1
10205d8f0:     	strb	w9, [x19, x8]
10205d8f4:     	ldp	x29, x30, [sp, #0x80]
10205d8f8:     	ldp	x20, x19, [sp, #0x70]
10205d8fc:     	add	sp, sp, #0x90
10205d900:     	ret

FUNCTION 0x10205d904 size 156
10205d904:     	sub	sp, sp, #0x90
10205d908:     	stp	x20, x19, [sp, #0x70]
10205d90c:     	stp	x29, x30, [sp, #0x80]
10205d910:     	add	x29, sp, #0x80
10205d914:     	adrp	x20, 0x104c8e000
10205d918:     	ldr	x8, [x20, #0x500]
10205d91c:     	cmp	x8, #0x1
10205d920:     	b.lt	0x10205d990
10205d924:     	mov	x19, x0
10205d928:     	adrp	x8, 0x104af8000
10205d92c:     	ldrsw	x8, [x8, #0xd88]
10205d930:     	mov	w9, #0x3                ; =3
10205d934:     	str	x9, [x0, x8]
10205d938:     	bl	0x103beed00
10205d93c:     	bl	0x103beed40
10205d940:     	bl	0x103be95e0
10205d944:     	cbz	x0, 0x10205d990
10205d948:     	ldr	x8, [x0, #0x70]
10205d94c:     	cbz	x8, 0x10205d990
10205d950:     	mov	w9, #0x3                ; =3
10205d954:     	mov	w10, #0x4               ; =4
10205d958:     	str	w9, [sp, #0x8]
10205d95c:     	str	w10, [sp, #0x68]
10205d960:     	add	x1, sp, #0x8
10205d964:     	blr	x8
10205d968:     	ldr	x8, [x20, #0x500]
10205d96c:     	subs	x8, x8, #0x1
10205d970:     	str	x8, [x20, #0x500]
10205d974:     	b.ne	0x10205d990
10205d978:     	adrp	x8, 0x104af8000
10205d97c:     	ldrsw	x8, [x8, #0xd70]
10205d980:     	strb	wzr, [x19, x8]
10205d984:     	adrp	x8, 0x104af8000
10205d988:     	ldrsw	x8, [x8, #0xd90]
10205d98c:     	str	xzr, [x19, x8]
10205d990:     	ldp	x29, x30, [sp, #0x80]
10205d994:     	ldp	x20, x19, [sp, #0x70]
10205d998:     	add	sp, sp, #0x90
10205d99c:     	ret

FUNCTION 0x10205d9a0 size 308
10205d9a0:     	sub	sp, sp, #0x90
10205d9a4:     	stp	x20, x19, [sp, #0x70]
10205d9a8:     	stp	x29, x30, [sp, #0x80]
10205d9ac:     	add	x29, sp, #0x80
10205d9b0:     	mov	x19, x0
10205d9b4:     	bl	0x103beed00
10205d9b8:     	bl	0x103beed40
10205d9bc:     	bl	0x103be95e0
10205d9c0:     	cbz	x0, 0x10205daa8
10205d9c4:     	mov	x20, x0
10205d9c8:     	ldr	x8, [x0, #0x70]
10205d9cc:     	cbz	x8, 0x10205daa8
10205d9d0:     	adrp	x9, 0x104af8000
10205d9d4:     	ldrsw	x9, [x9, #0xd94]
10205d9d8:     	ldrb	w10, [x19, x9]
10205d9dc:     	cmp	w10, #0x1
10205d9e0:     	b.ne	0x10205da2c
10205d9e4:     	strb	wzr, [x19, x9]
10205d9e8:     	adrp	x9, 0x104c8e000
10205d9ec:     	add	x9, x9, #0x508
10205d9f0:     	mov	w10, #0x9               ; =9
10205d9f4:     	str	w10, [x9]
10205d9f8:     	mov	w10, #0x4               ; =4
10205d9fc:     	str	w10, [x9, #0x60]
10205da00:     	ldp	q0, q1, [x9, #0x40]
10205da04:     	stp	q0, q1, [sp, #0x40]
10205da08:     	ldr	x10, [x9, #0x60]
10205da0c:     	str	x10, [sp, #0x60]
10205da10:     	ldp	q0, q1, [x9]
10205da14:     	stp	q0, q1, [sp]
10205da18:     	ldp	q1, q0, [x9, #0x20]
10205da1c:     	stp	q1, q0, [sp, #0x20]
10205da20:     	mov	x1, sp
10205da24:     	mov	x0, x20
10205da28:     	blr	x8
10205da2c:     	adrp	x8, 0x104af8000
10205da30:     	ldrsw	x8, [x8, #0xd98]
10205da34:     	ldrb	w9, [x19, x8]
10205da38:     	cmp	w9, #0x1
10205da3c:     	b.ne	0x10205da8c
10205da40:     	strb	wzr, [x19, x8]
10205da44:     	adrp	x8, 0x104c8e000
10205da48:     	add	x8, x8, #0x570
10205da4c:     	mov	w9, #0xc                ; =12
10205da50:     	str	w9, [x8]
10205da54:     	mov	w9, #0x4                ; =4
10205da58:     	str	w9, [x8, #0x60]
10205da5c:     	ldp	q0, q1, [x8, #0x40]
10205da60:     	stp	q0, q1, [sp, #0x40]
10205da64:     	ldr	x9, [x8, #0x60]
10205da68:     	str	x9, [sp, #0x60]
10205da6c:     	ldp	q0, q1, [x8]
10205da70:     	stp	q0, q1, [sp]
10205da74:     	ldp	q1, q0, [x8, #0x20]
10205da78:     	stp	q1, q0, [sp, #0x20]
10205da7c:     	ldr	x8, [x20, #0x70]
10205da80:     	mov	x1, sp
10205da84:     	mov	x0, x20
10205da88:     	blr	x8
10205da8c:     	adrp	x8, 0x104af8000
10205da90:     	ldrsw	x8, [x8, #0xd9c]
10205da94:     	ldrb	w8, [x19, x8]
10205da98:     	cmp	w8, #0x1
10205da9c:     	b.ne	0x10205daa8
10205daa0:     	mov	x0, x19
10205daa4:     	bl	0x103be7b40
10205daa8:     	adrp	x8, 0x104af8000
10205daac:     	ldrsw	x8, [x8, #0xd88]
10205dab0:     	mov	w9, #0x3                ; =3
10205dab4:     	str	x9, [x19, x8]
10205dab8:     	adrp	x8, 0x104af8000
10205dabc:     	ldrsw	x8, [x8, #0xd90]
10205dac0:     	str	xzr, [x19, x8]
10205dac4:     	ldp	x29, x30, [sp, #0x80]
10205dac8:     	ldp	x20, x19, [sp, #0x70]
10205dacc:     	add	sp, sp, #0x90
10205dad0:     	ret

FUNCTION 0x10205dad4 size 40
10205dad4:     	adrp	x8, 0x104af8000
10205dad8:     	ldrsw	x8, [x8, #0xd88]
10205dadc:     	str	xzr, [x0, x8]

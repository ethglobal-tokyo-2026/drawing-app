
FUNCTION 0x10276b714 size 560
10276b714:     	sub	sp, sp, #0xd0
10276b718:     	stp	d9, d8, [sp, #0x90]
10276b71c:     	stp	x22, x21, [sp, #0xa0]
10276b720:     	stp	x20, x19, [sp, #0xb0]
10276b724:     	stp	x29, x30, [sp, #0xc0]
10276b728:     	add	x29, sp, #0xc0
10276b72c:     	mov	x19, x1
10276b730:     	mov	x20, x0
10276b734:     	ldr	x21, [x0, #0x28]
10276b738:     	cbz	x21, 0x10276b774
10276b73c:     	fmov	d8, #1.00000000
10276b740:     	ldr	x8, [x20]
10276b744:     	ldr	x8, [x8, #0x68]
10276b748:     	mov	x0, x20
10276b74c:     	str	q0, [sp, #0x20]
10276b750:     	mov	x1, x21
10276b754:     	blr	x8
10276b758:     	stp	d0, d1, [x19]
10276b75c:     	ldr	d9, [x21, #0x58]
10276b760:     	ldrb	w8, [x20, #0x40]
10276b764:     	tbnz	w8, #0x4, 0x10276b7a8
10276b768:     	ldr	d0, [x20, #0x58]
10276b76c:     	fcvtl	v3.2d, v0.2s
10276b770:     	b	0x10276b7cc
10276b774:     	ldr	x8, [x20, #0x38]
10276b778:     	ldrb	w9, [x8, #0x21]
10276b77c:     	tbz	w9, #0x0, 0x10276b788
10276b780:     	ldr	x21, [x8, #0x30]
10276b784:     	cbnz	x21, 0x10276b73c
10276b788:     	mov	x0, x20
10276b78c:     	mov	x1, x19
10276b790:     	ldp	x29, x30, [sp, #0xc0]
10276b794:     	ldp	x20, x19, [sp, #0xb0]
10276b798:     	ldp	x22, x21, [sp, #0xa0]
10276b79c:     	ldp	d9, d8, [sp, #0x90]
10276b7a0:     	add	sp, sp, #0xd0
10276b7a4:     	b	0x10276b138
10276b7a8:     	add	x1, sp, #0x38
10276b7ac:     	mov	x0, x21
10276b7b0:     	bl	0x10276b138
10276b7b4:     	ldr	x0, [x20, #0x38]
10276b7b8:     	ldr	x8, [x0]
10276b7bc:     	ldr	x8, [x8, #0xc0]
10276b7c0:     	add	x1, sp, #0x38
10276b7c4:     	blr	x8
10276b7c8:     	ldur	q3, [sp, #0x70]
10276b7cc:     	ldr	q2, [sp, #0x20]
10276b7d0:     	fsub	d5, d8, d2
10276b7d4:     	ldrb	w8, [x21, #0x40]
10276b7d8:     	str	q3, [sp, #0x10]
10276b7dc:     	tbnz	w8, #0x5, 0x10276b7e8
10276b7e0:     	fcvtl	v4.2d, v9.2s
10276b7e4:     	b	0x10276b818
10276b7e8:     	add	x1, sp, #0x38
10276b7ec:     	mov	x0, x20
10276b7f0:     	str	q5, [sp]
10276b7f4:     	bl	0x10276b138
10276b7f8:     	ldr	x0, [x20, #0x38]
10276b7fc:     	ldr	x8, [x0]
10276b800:     	ldr	x8, [x8, #0xc0]
10276b804:     	add	x1, sp, #0x38
10276b808:     	blr	x8
10276b80c:     	ldp	q5, q3, [sp]
10276b810:     	ldr	q2, [sp, #0x20]
10276b814:     	ldur	q4, [sp, #0x70]
10276b818:     	ldur	d0, [x20, #0x44]
10276b81c:     	fcvtl	v0.2d, v0.2s
10276b820:     	ldur	d1, [x21, #0x44]
10276b824:     	fcvtl	v1.2d, v1.2s
10276b828:     	fmul.2d	v1, v1, v2[0]
10276b82c:     	fmla.2d	v1, v0, v5[0]
10276b830:     	str	q1, [x19, #0x10]
10276b834:     	ldr	s0, [x20, #0x4c]
10276b838:     	fcvt	d0, s0
10276b83c:     	ldr	s1, [x21, #0x4c]
10276b840:     	fcvt	d1, s1
10276b844:     	fmul	d1, d1, d2
10276b848:     	fmadd	d0, d0, d5, d1
10276b84c:     	str	d0, [x19, #0x20]
10276b850:     	ldr	s0, [x20, #0x54]
10276b854:     	fcvt	d0, s0
10276b858:     	ldr	s1, [x21, #0x54]
10276b85c:     	fcvt	d1, s1
10276b860:     	fmul	d1, d1, d2
10276b864:     	fmadd	d0, d0, d5, d1
10276b868:     	str	d0, [x19, #0x30]
10276b86c:     	fmul.2d	v0, v4, v2[0]
10276b870:     	fmla.2d	v0, v3, v5[0]
10276b874:     	stur	q0, [x19, #0x38]
10276b878:     	str	xzr, [x19, #0x28]
10276b87c:     	ldr	s0, [x20, #0x50]
10276b880:     	ldr	s1, [x21, #0x50]
10276b884:     	fcmp	s0, #0.0
10276b888:     	b.ne	0x10276b894
10276b88c:     	fcmp	s1, #0.0
10276b890:     	b.eq	0x10276b8ac
10276b894:     	fcvt	d0, s0
10276b898:     	fcvt	d1, s1
10276b89c:     	str	q4, [sp, #0x20]
10276b8a0:     	bl	0x102217f00
10276b8a4:     	ldp	q3, q4, [sp, #0x10]
10276b8a8:     	str	d0, [x19, #0x28]
10276b8ac:     	str	wzr, [x19, #0x50]
10276b8b0:     	ldr	w8, [x20, #0x40]
10276b8b4:     	ldr	w9, [x21, #0x40]
10276b8b8:     	orr	w10, w8, w9
10276b8bc:     	tbz	w10, #0xc, 0x10276b8e0
10276b8c0:     	and	w11, w9, #0x1000
10276b8c4:     	tbz	w8, #0xc, 0x10276b8d4
10276b8c8:     	cbnz	w11, 0x10276b8d4
10276b8cc:     	str	d4, [x19, #0x38]
10276b8d0:     	b	0x10276b8e0
10276b8d4:     	tbnz	w8, #0xc, 0x10276b914
10276b8d8:     	cbz	w11, 0x10276b914
10276b8dc:     	str	d3, [x19, #0x38]
10276b8e0:     	mov	w11, #0x2               ; =2
10276b8e4:     	tbz	w10, #0xd, 0x10276b92c
10276b8e8:     	and	w9, w9, #0x2000
10276b8ec:     	tbz	w8, #0xd, 0x10276b900
10276b8f0:     	cbnz	w9, 0x10276b900
10276b8f4:     	add	x8, x19, #0x40
10276b8f8:     	st1.d	{ v4 }[1], [x8]
10276b8fc:     	b	0x10276b92c
10276b900:     	tbnz	w8, #0xd, 0x10276b928
10276b904:     	cbz	w9, 0x10276b928
10276b908:     	add	x8, x19, #0x40
10276b90c:     	st1.d	{ v3 }[1], [x8]
10276b910:     	b	0x10276b92c
10276b914:     	mov	w11, #0x1               ; =1
10276b918:     	str	w11, [x19, #0x50]
10276b91c:     	mov	w11, #0x3               ; =3
10276b920:     	tbnz	w10, #0xd, 0x10276b8e8
10276b924:     	b	0x10276b92c
10276b928:     	str	w11, [x19, #0x50]
10276b92c:     	ldp	x29, x30, [sp, #0xc0]
10276b930:     	ldp	x20, x19, [sp, #0xb0]
10276b934:     	ldp	x22, x21, [sp, #0xa0]
10276b938:     	ldp	d9, d8, [sp, #0x90]
10276b93c:     	add	sp, sp, #0xd0
10276b940:     	ret


FUNCTION 0x102ceb708 size 956
102ceb708:     	sub	sp, sp, #0x170
102ceb70c:     	stp	d9, d8, [sp, #0x100]
102ceb710:     	stp	x28, x27, [sp, #0x110]
102ceb714:     	stp	x26, x25, [sp, #0x120]
102ceb718:     	stp	x24, x23, [sp, #0x130]
102ceb71c:     	stp	x22, x21, [sp, #0x140]
102ceb720:     	stp	x20, x19, [sp, #0x150]
102ceb724:     	stp	x29, x30, [sp, #0x160]
102ceb728:     	add	x29, sp, #0x160
102ceb72c:     	mov	x21, x1
102ceb730:     	mov	x22, x0
102ceb734:     	mov	x20, x8
102ceb738:     	ldr	x0, [x0, #0x20]
102ceb73c:     	sub	x8, x29, #0x98
102ceb740:     	bl	0x102925638
102ceb744:     	ldr	x0, [x22, #0x20]
102ceb748:     	sub	x8, x29, #0xa8
102ceb74c:     	bl	0x10290e8e8
102ceb750:     	add	x8, sp, #0x68
102ceb754:     	stp	xzr, xzr, [sp, #0xa8]
102ceb758:     	add	x9, x8, #0x8
102ceb75c:     	add	x28, sp, #0x58
102ceb760:     	add	x8, sp, #0x78
102ceb764:     	add	x8, x8, #0x8
102ceb768:     	stp	x9, x8, [sp, #0x8]
102ceb76c:     	mov	w19, #0x1               ; =1
102ceb770:     	adrp	x23, 0x104a71000
102ceb774:     	add	x23, x23, #0x168
102ceb778:     	sub	x0, x29, #0x98
102ceb77c:     	add	x1, sp, #0xa8
102ceb780:     	bl	0x1025a92a8
102ceb784:     	cbz	w0, 0x102ceb984
102ceb788:     	ldp	x9, x8, [sp, #0xa8]
102ceb78c:     	stp	x9, x8, [sp, #0x98]
102ceb790:     	cbz	x8, 0x102ceb79c
102ceb794:     	add	x8, x8, #0x8
102ceb798:     	ldadd	w19, w8, [x8]
102ceb79c:     	ldp	x9, x8, [x29, #-0xa8]
102ceb7a0:     	stp	x9, x8, [sp, #0x88]
102ceb7a4:     	cbz	x8, 0x102ceb7b0
102ceb7a8:     	add	x8, x8, #0x8
102ceb7ac:     	ldadd	w19, w8, [x8]
102ceb7b0:     	add	x0, sp, #0x98
102ceb7b4:     	add	x1, sp, #0x88
102ceb7b8:     	mov	w2, #0x0                ; =0
102ceb7bc:     	bl	0x1026b18fc
102ceb7c0:     	mov	x24, x0
102ceb7c4:     	add	x8, sp, #0x88
102ceb7c8:     	add	x0, x8, #0x8
102ceb7cc:     	bl	0x10001022c
102ceb7d0:     	add	x8, sp, #0x98
102ceb7d4:     	add	x0, x8, #0x8
102ceb7d8:     	bl	0x10001022c
102ceb7dc:     	cbz	w24, 0x102ceb778
102ceb7e0:     	ldp	x9, x8, [sp, #0xa8]
102ceb7e4:     	stp	x9, x8, [sp, #0x68]
102ceb7e8:     	cbz	x8, 0x102ceb7f4
102ceb7ec:     	add	x8, x8, #0x8
102ceb7f0:     	ldadd	w19, w8, [x8]
102ceb7f4:     	add	x8, sp, #0x78
102ceb7f8:     	add	x0, sp, #0x68
102ceb7fc:     	bl	0x1026b10f8
102ceb800:     	ldr	x0, [sp, #0x8]
102ceb804:     	bl	0x10001022c
102ceb808:     	ldr	x0, [sp, #0x78]
102ceb80c:     	cbz	x0, 0x102ceb94c
102ceb810:     	bl	0x1026ddf5c
102ceb814:     	mov	x24, x0
102ceb818:     	cmp	w0, #0x1
102ceb81c:     	b.lt	0x102ceb94c
102ceb820:     	mov	w25, #0x0               ; =0
102ceb824:     	ldr	x0, [sp, #0x78]
102ceb828:     	add	x8, sp, #0x58
102ceb82c:     	mov	x1, x25
102ceb830:     	bl	0x1026ddf64
102ceb834:     	ldr	x0, [sp, #0x58]
102ceb838:     	bl	0x1026a8d58
102ceb83c:     	cbz	w0, 0x102ceb938
102ceb840:     	ldr	x0, [sp, #0xa8]
102ceb844:     	bl	0x102576608
102ceb848:     	lsr	x8, x0, #32
102ceb84c:     	scvtf	d8, w0
102ceb850:     	scvtf	d9, w8
102ceb854:     	ldp	d0, d1, [x21]
102ceb858:     	fsub	d0, d0, d8
102ceb85c:     	fsub	d1, d1, d9
102ceb860:     	stp	d0, d1, [sp, #0x48]
102ceb864:     	mov	w0, #0xc0               ; =192
102ceb868:     	bl	0x103bdd37c
102ceb86c:     	mov	x26, x0
102ceb870:     	bl	0x102ce983c
102ceb874:     	str	x23, [x26]
102ceb878:     	mov	w8, #0x16               ; =22
102ceb87c:     	str	w8, [x26, #0x20]
102ceb880:     	mov	x27, x26
102ceb884:     	str	xzr, [x27, #0xa8]!
102ceb888:     	stp	xzr, xzr, [x26, #0xb0]
102ceb88c:     	mov	x0, x20
102ceb890:     	mov	x1, x26
102ceb894:     	bl	0x102cec178
102ceb898:     	ldr	w8, [x21, #0x14]
102ceb89c:     	str	w8, [x26, #0x24]
102ceb8a0:     	stp	d8, d9, [x26, #0x48]
102ceb8a4:     	add	x1, x26, #0x78
102ceb8a8:     	mov	x0, x22
102ceb8ac:     	bl	0x102ce8d3c
102ceb8b0:     	add	x8, sp, #0x38
102ceb8b4:     	bl	0x1026f1c00
102ceb8b8:     	ldp	x9, x8, [sp, #0x58]
102ceb8bc:     	stp	x9, x8, [sp, #0x28]
102ceb8c0:     	cbz	x8, 0x102ceb8cc
102ceb8c4:     	add	x8, x8, #0x8
102ceb8c8:     	ldadd	w19, w8, [x8]
102ceb8cc:     	ldp	x9, x8, [sp, #0x38]
102ceb8d0:     	stp	x9, x8, [sp, #0x18]
102ceb8d4:     	cbz	x8, 0x102ceb8e0
102ceb8d8:     	add	x8, x8, #0x8
102ceb8dc:     	ldadd	w19, w8, [x8]
102ceb8e0:     	add	x0, sp, #0x28
102ceb8e4:     	add	x1, sp, #0x18
102ceb8e8:     	add	x2, sp, #0x48
102ceb8ec:     	add	x4, x26, #0x30
102ceb8f0:     	add	x5, x26, #0x38
102ceb8f4:     	add	x6, x26, #0xb8
102ceb8f8:     	mov	x3, x27
102ceb8fc:     	bl	0x102cebac4
102ceb900:     	str	x0, [x26, #0x28]
102ceb904:     	add	x8, sp, #0x18
102ceb908:     	add	x0, x8, #0x8
102ceb90c:     	bl	0x10001022c
102ceb910:     	add	x8, sp, #0x28
102ceb914:     	add	x0, x8, #0x8
102ceb918:     	bl	0x10001022c
102ceb91c:     	ldr	x0, [x26, #0x28]
102ceb920:     	cbnz	x0, 0x102ceb958
102ceb924:     	add	x8, sp, #0x38
102ceb928:     	add	x0, x8, #0x8
102ceb92c:     	bl	0x10001022c
102ceb930:     	add	x0, x20, #0x8
102ceb934:     	bl	0x10001022c
102ceb938:     	add	x0, x28, #0x8
102ceb93c:     	bl	0x10001022c
102ceb940:     	add	w25, w25, #0x1
102ceb944:     	cmp	w24, w25
102ceb948:     	b.ne	0x102ceb824
102ceb94c:     	ldr	x0, [sp, #0x10]
102ceb950:     	bl	0x10001022c
102ceb954:     	b	0x102ceb778
102ceb958:     	mov	w1, #0x0                ; =0
102ceb95c:     	bl	0x102781e2c
102ceb960:     	str	d0, [x26, #0x40]
102ceb964:     	add	x8, sp, #0x38
102ceb968:     	add	x0, x8, #0x8
102ceb96c:     	bl	0x10001022c
102ceb970:     	add	x0, x28, #0x8
102ceb974:     	bl	0x10001022c
102ceb978:     	ldr	x0, [sp, #0x10]
102ceb97c:     	bl	0x10001022c
102ceb980:     	b	0x102ceb988
102ceb984:     	stp	xzr, xzr, [x20]
102ceb988:     	sub	x19, x29, #0xa8
102ceb98c:     	add	x8, sp, #0xa8
102ceb990:     	add	x0, x8, #0x8
102ceb994:     	bl	0x10001022c
102ceb998:     	add	x0, x19, #0x8
102ceb99c:     	bl	0x10001022c
102ceb9a0:     	sub	x0, x29, #0x98
102ceb9a4:     	bl	0x1025a9228
102ceb9a8:     	ldp	x29, x30, [sp, #0x160]
102ceb9ac:     	ldp	x20, x19, [sp, #0x150]
102ceb9b0:     	ldp	x22, x21, [sp, #0x140]
102ceb9b4:     	ldp	x24, x23, [sp, #0x130]
102ceb9b8:     	ldp	x26, x25, [sp, #0x120]
102ceb9bc:     	ldp	x28, x27, [sp, #0x110]
102ceb9c0:     	ldp	d9, d8, [sp, #0x100]
102ceb9c4:     	add	sp, sp, #0x170
102ceb9c8:     	ret
102ceb9cc:     	mov	x21, x0
102ceb9d0:     	b	0x102ceba44
102ceb9d4:     	mov	x21, x0
102ceb9d8:     	b	0x102cebab4
102ceb9dc:     	b	0x102ceba74
102ceb9e0:     	mov	x21, x0
102ceb9e4:     	ldr	x8, [sp, #0x8]
102ceb9e8:     	str	x8, [sp, #0x10]
102ceb9ec:     	b	0x102ceba78
102ceb9f0:     	mov	x21, x0
102ceb9f4:     	add	x8, sp, #0x88
102ceb9f8:     	add	x0, x8, #0x8
102ceb9fc:     	bl	0x10001022c
102ceba00:     	add	x8, sp, #0x98
102ceba04:     	add	x0, x8, #0x8
102ceba08:     	bl	0x10001022c
102ceba0c:     	b	0x102ceba14
102ceba10:     	mov	x21, x0
102ceba14:     	sub	x19, x29, #0xa8
102ceba18:     	add	x20, sp, #0xa8
102ceba1c:     	b	0x102cebaa4
102ceba20:     	b	0x102ceba54
102ceba24:     	b	0x102ceba88
102ceba28:     	mov	x21, x0
102ceba2c:     	add	x8, sp, #0x18
102ceba30:     	add	x0, x8, #0x8
102ceba34:     	bl	0x10001022c
102ceba38:     	add	x8, sp, #0x28
102ceba3c:     	add	x0, x8, #0x8
102ceba40:     	bl	0x10001022c
102ceba44:     	add	x8, sp, #0x38
102ceba48:     	add	x0, x8, #0x8
102ceba4c:     	bl	0x10001022c
102ceba50:     	b	0x102ceba58
102ceba54:     	mov	x21, x0
102ceba58:     	add	x0, x20, #0x8
102ceba5c:     	bl	0x10001022c
102ceba60:     	b	0x102ceba8c
102ceba64:     	mov	x21, x0
102ceba68:     	mov	x0, x26
102ceba6c:     	bl	0x103bdd34c
102ceba70:     	b	0x102ceba8c
102ceba74:     	mov	x21, x0
102ceba78:     	sub	x19, x29, #0xa8
102ceba7c:     	add	x20, sp, #0xa8
102ceba80:     	b	0x102ceba9c
102ceba84:     	b	0x102ceba88
102ceba88:     	mov	x21, x0
102ceba8c:     	sub	x19, x29, #0xa8
102ceba90:     	add	x20, sp, #0xa8
102ceba94:     	add	x0, x28, #0x8
102ceba98:     	bl	0x10001022c
102ceba9c:     	ldr	x0, [sp, #0x10]
102cebaa0:     	bl	0x10001022c
102cebaa4:     	add	x0, x20, #0x8
102cebaa8:     	bl	0x10001022c
102cebaac:     	add	x0, x19, #0x8
102cebab0:     	bl	0x10001022c
102cebab4:     	sub	x0, x29, #0x98
102cebab8:     	bl	0x1025a9228
102cebabc:     	mov	x0, x21
102cebac0:     	bl	0x103bda970

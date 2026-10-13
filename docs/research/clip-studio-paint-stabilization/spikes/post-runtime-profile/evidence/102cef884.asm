
FUNCTION 0x102cef884 size 1476
102cef884:     	sub	sp, sp, #0x1d0
102cef888:     	stp	d9, d8, [sp, #0x160]
102cef88c:     	stp	x28, x27, [sp, #0x170]
102cef890:     	stp	x26, x25, [sp, #0x180]
102cef894:     	stp	x24, x23, [sp, #0x190]
102cef898:     	stp	x22, x21, [sp, #0x1a0]
102cef89c:     	stp	x20, x19, [sp, #0x1b0]
102cef8a0:     	stp	x29, x30, [sp, #0x1c0]
102cef8a4:     	add	x29, sp, #0x1c0
102cef8a8:     	mov	x20, x8
102cef8ac:     	ldr	x8, [x0, #0x10]
102cef8b0:     	cbz	x8, 0x102cefb84
102cef8b4:     	mov	x21, x1
102cef8b8:     	mov	x22, x0
102cef8bc:     	ldr	x0, [x0, #0x20]
102cef8c0:     	sub	x8, x29, #0x98
102cef8c4:     	bl	0x102925638
102cef8c8:     	ldr	x0, [x22, #0x20]
102cef8cc:     	sub	x8, x29, #0xa8
102cef8d0:     	bl	0x10290e8e8
102cef8d4:     	stp	xzr, xzr, [x29, #-0xb8]
102cef8d8:     	sub	x26, x29, #0xc8
102cef8dc:     	sub	x27, x29, #0xd8
102cef8e0:     	add	x8, sp, #0xc8
102cef8e4:     	add	x23, x8, #0x8
102cef8e8:     	add	x28, sp, #0xb8
102cef8ec:     	add	x8, sp, #0xd8
102cef8f0:     	add	x8, x8, #0x8
102cef8f4:     	str	x8, [sp, #0x8]
102cef8f8:     	mov	w19, #0x1               ; =1
102cef8fc:     	sub	x0, x29, #0x98
102cef900:     	sub	x1, x29, #0xb8
102cef904:     	bl	0x1025a92a8
102cef908:     	cbz	w0, 0x102cefcd8
102cef90c:     	ldp	x9, x8, [x29, #-0xb8]
102cef910:     	stp	x9, x8, [x29, #-0xc8]
102cef914:     	cbz	x8, 0x102cef920
102cef918:     	add	x8, x8, #0x8
102cef91c:     	ldadd	w19, w8, [x8]
102cef920:     	ldp	x9, x8, [x29, #-0xa8]
102cef924:     	stp	x9, x8, [x29, #-0xd8]
102cef928:     	cbz	x8, 0x102cef934
102cef92c:     	add	x8, x8, #0x8
102cef930:     	ldadd	w19, w8, [x8]
102cef934:     	sub	x0, x29, #0xc8
102cef938:     	sub	x1, x29, #0xd8
102cef93c:     	mov	w2, #0x0                ; =0
102cef940:     	bl	0x1026b18fc
102cef944:     	mov	x24, x0
102cef948:     	add	x0, x27, #0x8
102cef94c:     	bl	0x10001022c
102cef950:     	add	x0, x26, #0x8
102cef954:     	bl	0x10001022c
102cef958:     	cbz	w24, 0x102cef8fc
102cef95c:     	ldp	x9, x8, [x29, #-0xb8]
102cef960:     	stp	x9, x8, [sp, #0xc8]
102cef964:     	cbz	x8, 0x102cef970
102cef968:     	add	x8, x8, #0x8
102cef96c:     	ldadd	w19, w8, [x8]
102cef970:     	add	x8, sp, #0xd8
102cef974:     	add	x0, sp, #0xc8
102cef978:     	bl	0x1026b10f8
102cef97c:     	mov	x0, x23
102cef980:     	bl	0x10001022c
102cef984:     	ldr	x0, [sp, #0xd8]
102cef988:     	cbz	x0, 0x102cef9d0
102cef98c:     	bl	0x1026de6e8
102cef990:     	mov	x24, x0
102cef994:     	cmp	w0, #0x1
102cef998:     	b.lt	0x102cef9d0
102cef99c:     	mov	w25, #0x0               ; =0
102cef9a0:     	ldr	x0, [sp, #0xd8]
102cef9a4:     	add	x8, sp, #0xb8
102cef9a8:     	mov	x1, x25
102cef9ac:     	bl	0x1026de6f0
102cef9b0:     	ldr	x0, [sp, #0xb8]
102cef9b4:     	bl	0x1026bd518
102cef9b8:     	cbnz	w0, 0x102cef9dc
102cef9bc:     	add	x0, x28, #0x8
102cef9c0:     	bl	0x10001022c
102cef9c4:     	add	w25, w25, #0x1
102cef9c8:     	cmp	w24, w25
102cef9cc:     	b.ne	0x102cef9a0
102cef9d0:     	ldr	x0, [sp, #0x8]
102cef9d4:     	bl	0x10001022c
102cef9d8:     	b	0x102cef8fc
102cef9dc:     	mov	w0, #0x170              ; =368
102cef9e0:     	bl	0x103bdd37c
102cef9e4:     	mov	x23, x0
102cef9e8:     	bl	0x102ce87a8
102cef9ec:     	fmov	d0, xzr
102cef9f0:     	adrp	x8, 0x104a71000
102cef9f4:     	add	x8, x8, #0x4d8
102cef9f8:     	str	x8, [x23]
102cef9fc:     	mov	x24, x23
102cefa00:     	str	xzr, [x24, #0x28]!
102cefa04:     	stp	xzr, xzr, [x23, #0x30]
102cefa08:     	mov.d	v0[1], v0[0]
102cefa0c:     	str	q0, [x23, #0xa0]
102cefa10:     	add	x8, x23, #0x148
102cefa14:     	str	xzr, [x23, #0x168]
102cefa18:     	movi.2d	v0, #0000000000000000
102cefa1c:     	stp	q0, q0, [x8]
102cefa20:     	mov	w8, #0x1e               ; =30
102cefa24:     	str	w8, [x23, #0x20]
102cefa28:     	str	wzr, [x23, #0xb0]
102cefa2c:     	mov	x19, x23
102cefa30:     	str	q0, [x19, #0xc8]!
102cefa34:     	stur	q0, [x23, #0xd8]
102cefa38:     	stur	q0, [x23, #0xe8]
102cefa3c:     	adrp	x8, 0x1042e4000
102cefa40:     	ldr	d1, [x8, #0x790]
102cefa44:     	str	d1, [x23, #0xf8]
102cefa48:     	stp	xzr, xzr, [x23, #0x100]
102cefa4c:     	mov	x8, #0x100000000        ; =4294967296
102cefa50:     	str	x8, [x23, #0x110]
102cefa54:     	mov	x26, x23
102cefa58:     	str	q0, [x26, #0x70]!
102cefa5c:     	stp	q0, q0, [x23, #0x80]
102cefa60:     	add	x0, sp, #0xa0
102cefa64:     	mov	x1, x23
102cefa68:     	bl	0x102cf741c
102cefa6c:     	ldp	x9, x8, [sp, #0xb8]
102cefa70:     	cbz	x8, 0x102cefa80
102cefa74:     	add	x10, x8, #0x8
102cefa78:     	mov	w11, #0x1               ; =1
102cefa7c:     	ldadd	w11, w10, [x10]
102cefa80:     	add	x10, sp, #0x70
102cefa84:     	ldr	q0, [x23, #0xa0]
102cefa88:     	stp	x9, x8, [x23, #0xa0]
102cefa8c:     	str	q0, [sp, #0x70]
102cefa90:     	orr	x0, x10, #0x8
102cefa94:     	bl	0x10001022c
102cefa98:     	str	wzr, [x23, #0xf8]
102cefa9c:     	ldur	x0, [x29, #-0xb8]
102cefaa0:     	bl	0x102576608
102cefaa4:     	lsr	x8, x0, #32
102cefaa8:     	scvtf	d0, w0
102cefaac:     	scvtf	d1, w8
102cefab0:     	ldp	d2, d3, [x21]
102cefab4:     	fsub	d2, d2, d0
102cefab8:     	stp	d0, d1, [x23, #0xb8]
102cefabc:     	ldr	w8, [x21, #0x14]
102cefac0:     	str	w8, [x23, #0x24]
102cefac4:     	ldr	w8, [x21, #0x28]
102cefac8:     	str	w8, [x23, #0xfc]
102cefacc:     	fsub	d0, d3, d1
102cefad0:     	stp	d2, d0, [x23, #0xc8]
102cefad4:     	ldr	q0, [x19]
102cefad8:     	stur	q0, [x23, #0xd8]
102cefadc:     	str	wzr, [x23, #0xb0]
102cefae0:     	ldp	x9, x8, [x22, #0x10]
102cefae4:     	stp	x9, x8, [sp, #0x90]
102cefae8:     	cbz	x8, 0x102cefaf8
102cefaec:     	add	x8, x8, #0x8
102cefaf0:     	mov	w9, #0x1                ; =1
102cefaf4:     	ldadd	w9, w8, [x8]
102cefaf8:     	add	x19, sp, #0x90
102cefafc:     	add	x0, sp, #0x90
102cefb00:     	bl	0x102992930
102cefb04:     	fmov	d9, d0
102cefb08:     	add	x0, x19, #0x8
102cefb0c:     	bl	0x10001022c
102cefb10:     	ldr	x0, [x22, #0x10]
102cefb14:     	bl	0x1021c7320
102cefb18:     	fmov	d8, d0
102cefb1c:     	add	x19, sp, #0x70
102cefb20:     	add	x0, sp, #0x70
102cefb24:     	bl	0x1031163b8
102cefb28:     	add	x0, x19, #0x10
102cefb2c:     	bl	0x1031163b8
102cefb30:     	ldr	x0, [x22, #0x10]
102cefb34:     	add	x1, sp, #0x70
102cefb38:     	bl	0x1021bca90
102cefb3c:     	add	x8, sp, #0x50
102cefb40:     	add	x0, sp, #0x70
102cefb44:     	bl	0x1020c09dc
102cefb48:     	adrp	x8, 0x1042ee000
102cefb4c:     	ldr	d0, [x8, #0x828]
102cefb50:     	fmul	d9, d9, d0
102cefb54:     	adrp	x8, 0x1042e3000
102cefb58:     	ldr	d0, [x8, #0x690]
102cefb5c:     	fcmp	d9, d0
102cefb60:     	b.le	0x102cefb8c
102cefb64:     	add	x0, sp, #0x50
102cefb68:     	bl	0x103116810
102cefb6c:     	fmul	d0, d8, d0
102cefb70:     	fdiv	d0, d0, d9
102cefb74:     	mov	x8, #0x4040000000000000 ; =4629700416936869888
102cefb78:     	fmov	d1, x8
102cefb7c:     	fmul	d0, d0, d1
102cefb80:     	b	0x102cefb94
102cefb84:     	stp	xzr, xzr, [x20]
102cefb88:     	b	0x102cefcfc
102cefb8c:     	mov	x8, #0x4040000000000000 ; =4629700416936869888
102cefb90:     	fmov	d0, x8
102cefb94:     	fmul	d0, d0, d0
102cefb98:     	str	d0, [x23, #0x100]
102cefb9c:     	ldp	x9, x8, [x22, #0x10]
102cefba0:     	stp	x9, x8, [sp, #0x40]
102cefba4:     	cbz	x8, 0x102cefbb4
102cefba8:     	add	x8, x8, #0x8
102cefbac:     	mov	w9, #0x1                ; =1
102cefbb0:     	ldadd	w9, w8, [x8]
102cefbb4:     	add	x19, sp, #0x40
102cefbb8:     	add	x0, sp, #0x40
102cefbbc:     	bl	0x10298f350
102cefbc0:     	str	w0, [x23, #0x114]
102cefbc4:     	add	x0, x19, #0x8
102cefbc8:     	bl	0x10001022c
102cefbcc:     	str	wzr, [x23, #0x110]
102cefbd0:     	ldrb	w8, [x21, #0x11]
102cefbd4:     	tbz	w8, #0x1, 0x102cefc18
102cefbd8:     	ldp	x9, x8, [x22, #0x10]
102cefbdc:     	stp	x9, x8, [sp, #0x30]
102cefbe0:     	cbz	x8, 0x102cefbf0
102cefbe4:     	add	x8, x8, #0x8
102cefbe8:     	mov	w9, #0x1                ; =1
102cefbec:     	ldadd	w9, w8, [x8]
102cefbf0:     	add	x19, sp, #0x30
102cefbf4:     	add	x0, sp, #0x30
102cefbf8:     	bl	0x10298f450
102cefbfc:     	mov	x25, x0
102cefc00:     	add	x0, x19, #0x8
102cefc04:     	bl	0x10001022c
102cefc08:     	cbz	w25, 0x102cefc18
102cefc0c:     	ldr	x0, [sp, #0xb8]
102cefc10:     	bl	0x1026bd774
102cefc14:     	str	w0, [x23, #0x110]
102cefc18:     	ldr	w8, [x23, #0x114]
102cefc1c:     	cbnz	w8, 0x102cefc28
102cefc20:     	ldr	w8, [x23, #0x110]
102cefc24:     	cbz	w8, 0x102cefc70
102cefc28:     	add	x1, x23, #0x40
102cefc2c:     	mov	x0, x22
102cefc30:     	bl	0x102ce8d3c
102cefc34:     	add	x1, x23, #0x40
102cefc38:     	mov	x0, x24
102cefc3c:     	bl	0x100db7c24
102cefc40:     	ldr	w8, [x21, #0x14]
102cefc44:     	cbz	w8, 0x102cefc94
102cefc48:     	ldp	q0, q1, [x23, #0x40]
102cefc4c:     	stp	q0, q1, [x26]
102cefc50:     	ldur	q0, [x23, #0x60]
102cefc54:     	str	q0, [x26, #0x20]
102cefc58:     	bl	0x10310f644
102cefc5c:     	str	x0, [x23, #0x108]
102cefc60:     	str	wzr, [x21, #0x2c]
102cefc64:     	ldr	q0, [sp, #0xa0]
102cefc68:     	str	q0, [x20]
102cefc6c:     	add	x20, sp, #0xa0
102cefc70:     	stp	xzr, xzr, [x20]
102cefc74:     	add	x8, sp, #0xa0
102cefc78:     	orr	x0, x8, #0x8
102cefc7c:     	bl	0x10001022c
102cefc80:     	add	x0, x28, #0x8
102cefc84:     	bl	0x10001022c
102cefc88:     	ldr	x0, [sp, #0x8]
102cefc8c:     	bl	0x10001022c
102cefc90:     	b	0x102cefcdc
102cefc94:     	ldr	w8, [x21, #0x18]
102cefc98:     	cbz	w8, 0x102cefd20
102cefc9c:     	ldp	x9, x8, [x22, #0x10]
102cefca0:     	stp	x9, x8, [sp, #0x20]
102cefca4:     	cbz	x8, 0x102cefcb4
102cefca8:     	add	x8, x8, #0x8
102cefcac:     	mov	w9, #0x1                ; =1
102cefcb0:     	ldadd	w9, w8, [x8]
102cefcb4:     	add	x19, sp, #0x20
102cefcb8:     	add	x1, sp, #0x20
102cefcbc:     	mov	x0, x23
102cefcc0:     	bl	0x102cefe48
102cefcc4:     	mov	x21, x0
102cefcc8:     	add	x0, x19, #0x8
102cefccc:     	bl	0x10001022c
102cefcd0:     	cbnz	w21, 0x102cefc64
102cefcd4:     	b	0x102cefc70
102cefcd8:     	stp	xzr, xzr, [x20]
102cefcdc:     	sub	x8, x29, #0xb8
102cefce0:     	add	x0, x8, #0x8
102cefce4:     	bl	0x10001022c
102cefce8:     	sub	x8, x29, #0xa8
102cefcec:     	add	x0, x8, #0x8
102cefcf0:     	bl	0x10001022c
102cefcf4:     	sub	x0, x29, #0x98
102cefcf8:     	bl	0x1025a9228
102cefcfc:     	ldp	x29, x30, [sp, #0x1c0]
102cefd00:     	ldp	x20, x19, [sp, #0x1b0]
102cefd04:     	ldp	x22, x21, [sp, #0x1a0]
102cefd08:     	ldp	x24, x23, [sp, #0x190]
102cefd0c:     	ldp	x26, x25, [sp, #0x180]
102cefd10:     	ldp	x28, x27, [sp, #0x170]
102cefd14:     	ldp	d9, d8, [sp, #0x160]
102cefd18:     	add	sp, sp, #0x1d0
102cefd1c:     	ret
102cefd20:     	ldr	w8, [x23, #0x110]
102cefd24:     	cbz	w8, 0x102cefc64
102cefd28:     	ldp	x9, x8, [x22, #0x10]
102cefd2c:     	stp	x9, x8, [sp, #0x10]
102cefd30:     	cbz	x8, 0x102cefd40
102cefd34:     	add	x8, x8, #0x8
102cefd38:     	mov	w9, #0x1                ; =1
102cefd3c:     	ldadd	w9, w8, [x8]
102cefd40:     	add	x19, sp, #0x10
102cefd44:     	add	x1, sp, #0x10
102cefd48:     	mov	x0, x23
102cefd4c:     	bl	0x102cf01c8
102cefd50:     	mov	x22, x0
102cefd54:     	add	x0, x19, #0x8
102cefd58:     	bl	0x10001022c
102cefd5c:     	cbz	w22, 0x102cefc64
102cefd60:     	ldur	q0, [x23, #0xd8]
102cefd64:     	ldur	q1, [x23, #0xb8]
102cefd68:     	fadd.2d	v0, v0, v1
102cefd6c:     	str	q0, [x21]
102cefd70:     	b	0x102cefc64
102cefd74:     	b	0x102cefd8c
102cefd78:     	b	0x102cefd8c
102cefd7c:     	b	0x102cefd8c
102cefd80:     	b	0x102cefd8c
102cefd84:     	b	0x102cefdc4
102cefd88:     	b	0x102cefdc4
102cefd8c:     	mov	x20, x0
102cefd90:     	add	x0, x19, #0x8
102cefd94:     	bl	0x10001022c
102cefd98:     	b	0x102cefdc8
102cefd9c:     	b	0x102cefdc4
102cefda0:     	b	0x102cefe04
102cefda4:     	mov	x20, x0
102cefda8:     	mov	x0, x23
102cefdac:     	bl	0x103bdd34c
102cefdb0:     	b	0x102cefe08
102cefdb4:     	b	0x102cefe04
102cefdb8:     	mov	x20, x0
102cefdbc:     	b	0x102cefe38
102cefdc0:     	b	0x102cefdc4
102cefdc4:     	mov	x20, x0
102cefdc8:     	add	x8, sp, #0xa0
102cefdcc:     	orr	x0, x8, #0x8
102cefdd0:     	bl	0x10001022c
102cefdd4:     	b	0x102cefe08
102cefdd8:     	b	0x102cefe14
102cefddc:     	mov	x20, x0
102cefde0:     	str	x23, [sp, #0x8]
102cefde4:     	b	0x102cefe18
102cefde8:     	mov	x20, x0
102cefdec:     	add	x0, x27, #0x8
102cefdf0:     	bl	0x10001022c
102cefdf4:     	add	x0, x26, #0x8
102cefdf8:     	b	0x102cefe1c
102cefdfc:     	mov	x20, x0
102cefe00:     	b	0x102cefe20
102cefe04:     	mov	x20, x0
102cefe08:     	add	x0, x28, #0x8
102cefe0c:     	bl	0x10001022c
102cefe10:     	b	0x102cefe18
102cefe14:     	mov	x20, x0
102cefe18:     	ldr	x0, [sp, #0x8]
102cefe1c:     	bl	0x10001022c
102cefe20:     	sub	x8, x29, #0xb8
102cefe24:     	add	x0, x8, #0x8
102cefe28:     	bl	0x10001022c
102cefe2c:     	sub	x8, x29, #0xa8
102cefe30:     	add	x0, x8, #0x8
102cefe34:     	bl	0x10001022c
102cefe38:     	sub	x0, x29, #0x98
102cefe3c:     	bl	0x1025a9228
102cefe40:     	mov	x0, x20
102cefe44:     	bl	0x103bda970


FUNCTION 0x102ceda80 size 712
102ceda80:     	sub	sp, sp, #0x120
102ceda84:     	stp	d9, d8, [sp, #0xb0]
102ceda88:     	stp	x28, x27, [sp, #0xc0]
102ceda8c:     	stp	x26, x25, [sp, #0xd0]
102ceda90:     	stp	x24, x23, [sp, #0xe0]
102ceda94:     	stp	x22, x21, [sp, #0xf0]
102ceda98:     	stp	x20, x19, [sp, #0x100]
102ceda9c:     	stp	x29, x30, [sp, #0x110]
102cedaa0:     	add	x29, sp, #0x110
102cedaa4:     	mov	x21, x1
102cedaa8:     	mov	x19, x0
102cedaac:     	mov	x20, x8
102cedab0:     	ldr	x0, [x0, #0x20]
102cedab4:     	add	x8, sp, #0x78
102cedab8:     	bl	0x102925638
102cedabc:     	ldr	x0, [x19, #0x20]
102cedac0:     	add	x8, sp, #0x68
102cedac4:     	bl	0x10290e8e8
102cedac8:     	stp	xzr, xzr, [sp, #0x58]
102cedacc:     	add	x28, sp, #0x48
102cedad0:     	add	x25, sp, #0x38
102cedad4:     	add	x8, sp, #0x18
102cedad8:     	add	x22, x8, #0x8
102cedadc:     	add	x27, sp, #0x8
102cedae0:     	add	x8, sp, #0x28
102cedae4:     	add	x19, x8, #0x8
102cedae8:     	mov	w26, #0x1               ; =1
102cedaec:     	add	x0, sp, #0x78
102cedaf0:     	add	x1, sp, #0x58
102cedaf4:     	bl	0x1025a92a8
102cedaf8:     	cbz	w0, 0x102cedc60
102cedafc:     	ldp	x9, x8, [sp, #0x58]
102cedb00:     	stp	x9, x8, [sp, #0x48]
102cedb04:     	cbz	x8, 0x102cedb10
102cedb08:     	add	x8, x8, #0x8
102cedb0c:     	ldadd	w26, w8, [x8]
102cedb10:     	ldp	x9, x8, [sp, #0x68]
102cedb14:     	stp	x9, x8, [sp, #0x38]
102cedb18:     	cbz	x8, 0x102cedb24
102cedb1c:     	add	x8, x8, #0x8
102cedb20:     	ldadd	w26, w8, [x8]
102cedb24:     	add	x0, sp, #0x48
102cedb28:     	add	x1, sp, #0x38
102cedb2c:     	mov	w2, #0x0                ; =0
102cedb30:     	bl	0x1026b18fc
102cedb34:     	mov	x23, x0
102cedb38:     	add	x0, x25, #0x8
102cedb3c:     	bl	0x10001022c
102cedb40:     	add	x0, x28, #0x8
102cedb44:     	bl	0x10001022c
102cedb48:     	cbz	w23, 0x102cedaec
102cedb4c:     	ldp	x9, x8, [sp, #0x58]
102cedb50:     	stp	x9, x8, [sp, #0x18]
102cedb54:     	cbz	x8, 0x102cedb60
102cedb58:     	add	x8, x8, #0x8
102cedb5c:     	ldadd	w26, w8, [x8]
102cedb60:     	add	x8, sp, #0x28
102cedb64:     	add	x0, sp, #0x18
102cedb68:     	bl	0x1026b10f8
102cedb6c:     	mov	x0, x22
102cedb70:     	bl	0x10001022c
102cedb74:     	ldr	x0, [sp, #0x28]
102cedb78:     	cbz	x0, 0x102cedbc0
102cedb7c:     	bl	0x1026ddcd8
102cedb80:     	mov	x23, x0
102cedb84:     	cmp	w0, #0x1
102cedb88:     	b.lt	0x102cedbc0
102cedb8c:     	mov	w24, #0x0               ; =0
102cedb90:     	ldr	x0, [sp, #0x28]
102cedb94:     	add	x8, sp, #0x8
102cedb98:     	mov	x1, x24
102cedb9c:     	bl	0x1026ddce0
102cedba0:     	ldr	x0, [sp, #0x8]
102cedba4:     	bl	0x1026abc00
102cedba8:     	cbnz	w0, 0x102cedbcc
102cedbac:     	add	x0, x27, #0x8
102cedbb0:     	bl	0x10001022c
102cedbb4:     	add	w24, w24, #0x1
102cedbb8:     	cmp	w23, w24
102cedbbc:     	b.ne	0x102cedb90
102cedbc0:     	mov	x0, x19
102cedbc4:     	bl	0x10001022c
102cedbc8:     	b	0x102cedaec
102cedbcc:     	mov	w0, #0x48               ; =72
102cedbd0:     	bl	0x103bdd37c
102cedbd4:     	mov	x22, x0
102cedbd8:     	bl	0x102ce87a8
102cedbdc:     	adrp	x8, 0x104a71000
102cedbe0:     	add	x8, x8, #0x2c8
102cedbe4:     	str	x8, [x22]
102cedbe8:     	mov	w8, #0x15               ; =21
102cedbec:     	str	w8, [x22, #0x20]
102cedbf0:     	movi.2d	v0, #0000000000000000
102cedbf4:     	mov	x23, x22
102cedbf8:     	str	q0, [x23, #0x28]!
102cedbfc:     	stur	q0, [x22, #0x38]
102cedc00:     	mov	x0, x20
102cedc04:     	mov	x1, x22
102cedc08:     	bl	0x102cedda8
102cedc0c:     	ldr	x0, [sp, #0x8]
102cedc10:     	bl	0x1026abc20
102cedc14:     	fmov	d8, d0
102cedc18:     	fmov	d9, d1
102cedc1c:     	ldr	x0, [sp, #0x58]
102cedc20:     	bl	0x102576608
102cedc24:     	lsr	x8, x0, #32
102cedc28:     	scvtf	d0, w0
102cedc2c:     	scvtf	d1, w8
102cedc30:     	fadd	d0, d8, d0
102cedc34:     	fadd	d1, d9, d1
102cedc38:     	ldr	w8, [x21, #0x14]
102cedc3c:     	str	w8, [x22, #0x24]
102cedc40:     	ldr	q2, [x21]
102cedc44:     	str	q2, [x23]
102cedc48:     	stp	d0, d1, [x22, #0x38]
102cedc4c:     	add	x0, x27, #0x8
102cedc50:     	bl	0x10001022c
102cedc54:     	mov	x0, x19
102cedc58:     	bl	0x10001022c
102cedc5c:     	b	0x102cedc64
102cedc60:     	stp	xzr, xzr, [x20]
102cedc64:     	add	x8, sp, #0x58
102cedc68:     	add	x0, x8, #0x8
102cedc6c:     	bl	0x10001022c
102cedc70:     	add	x8, sp, #0x68
102cedc74:     	add	x0, x8, #0x8
102cedc78:     	bl	0x10001022c
102cedc7c:     	add	x0, sp, #0x78
102cedc80:     	bl	0x1025a9228
102cedc84:     	ldp	x29, x30, [sp, #0x110]
102cedc88:     	ldp	x20, x19, [sp, #0x100]
102cedc8c:     	ldp	x22, x21, [sp, #0xf0]
102cedc90:     	ldp	x24, x23, [sp, #0xe0]
102cedc94:     	ldp	x26, x25, [sp, #0xd0]
102cedc98:     	ldp	x28, x27, [sp, #0xc0]
102cedc9c:     	ldp	d9, d8, [sp, #0xb0]
102cedca0:     	add	sp, sp, #0x120
102cedca4:     	ret
102cedca8:     	b	0x102cedcac
102cedcac:     	mov	x21, x0
102cedcb0:     	add	x0, x20, #0x8
102cedcb4:     	bl	0x10001022c
102cedcb8:     	b	0x102cedd08
102cedcbc:     	mov	x21, x0
102cedcc0:     	mov	x0, x22
102cedcc4:     	bl	0x103bdd34c
102cedcc8:     	b	0x102cedd08
102cedccc:     	mov	x21, x0
102cedcd0:     	b	0x102cedd38
102cedcd4:     	b	0x102cedd04
102cedcd8:     	b	0x102cedd14
102cedcdc:     	mov	x21, x0
102cedce0:     	mov	x19, x22
102cedce4:     	b	0x102cedd18
102cedce8:     	mov	x21, x0
102cedcec:     	add	x0, x25, #0x8
102cedcf0:     	bl	0x10001022c
102cedcf4:     	add	x0, x28, #0x8
102cedcf8:     	b	0x102cedd1c
102cedcfc:     	mov	x21, x0
102cedd00:     	b	0x102cedd20
102cedd04:     	mov	x21, x0
102cedd08:     	add	x0, x27, #0x8
102cedd0c:     	bl	0x10001022c
102cedd10:     	b	0x102cedd18
102cedd14:     	mov	x21, x0
102cedd18:     	mov	x0, x19
102cedd1c:     	bl	0x10001022c
102cedd20:     	add	x8, sp, #0x58
102cedd24:     	add	x0, x8, #0x8
102cedd28:     	bl	0x10001022c
102cedd2c:     	add	x8, sp, #0x68
102cedd30:     	add	x0, x8, #0x8
102cedd34:     	bl	0x10001022c
102cedd38:     	add	x0, sp, #0x78
102cedd3c:     	bl	0x1025a9228
102cedd40:     	mov	x0, x21
102cedd44:     	bl	0x103bda970

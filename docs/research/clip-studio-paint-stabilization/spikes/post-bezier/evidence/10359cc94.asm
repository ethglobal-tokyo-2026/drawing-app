
FUNCTION 0x10359cc94 size 308
10359cc94:     	stp	x20, x19, [sp, #-0x20]!
10359cc98:     	stp	x29, x30, [sp, #0x10]
10359cc9c:     	add	x29, sp, #0x10
10359cca0:     	mov	w9, #0x1030             ; =4144
10359cca4:     	adrp	x16, 0x1048c8000
10359cca8:     	ldr	x16, [x16, #0x4c8]
10359ccac:     	blr	x16
10359ccb0:     	sub	sp, sp, #0x1, lsl #12   ; =0x1000
10359ccb4:     	sub	sp, sp, #0x30
10359ccb8:     	mov	x19, x0
10359ccbc:     	fmov	d16, d5
10359ccc0:     	fmov	d17, d4
10359ccc4:     	adrp	x8, 0x1048c8000
10359ccc8:     	ldr	x8, [x8, #0x4d0]
10359cccc:     	ldr	x8, [x8]
10359ccd0:     	stur	x8, [x29, #-0x18]
10359ccd4:     	stp	d6, d7, [sp, #0x18]
10359ccd8:     	fsub	d18, d6, d0
10359ccdc:     	fsub	d19, d7, d1
10359cce0:     	fsub	d20, d2, d0
10359cce4:     	fsub	d21, d3, d1
10359cce8:     	fsub	d4, d4, d0
10359ccec:     	fsub	d5, d5, d1
10359ccf0:     	fmul	d21, d21, d19
10359ccf4:     	fmadd	d20, d18, d20, d21
10359ccf8:     	fcmp	d20, #0.0
10359ccfc:     	b.hi	0x10359cd10
10359cd00:     	fmul	d19, d5, d19
10359cd04:     	fmadd	d18, d18, d4, d19
10359cd08:     	fcmp	d18, #0.0
10359cd0c:     	b.ls	0x10359cd84
10359cd10:     	fsub	d6, d6, d17
10359cd14:     	fsub	d7, d7, d16
10359cd18:     	fsub	d18, d2, d17
10359cd1c:     	fsub	d19, d3, d16
10359cd20:     	fmul	d19, d19, d7
10359cd24:     	fmadd	d18, d6, d18, d19
10359cd28:     	fcmp	d18, #0.0
10359cd2c:     	b.hi	0x10359cd40
10359cd30:     	fmul	d5, d5, d7
10359cd34:     	fmadd	d4, d6, d4, d5
10359cd38:     	fcmp	d4, #0.0
10359cd3c:     	b.ge	0x10359cd90
10359cd40:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
10359cd44:     	stp	xzr, x8, [sp, #0x8]
10359cd48:     	mov	x8, #0x4010000000000000 ; =4616189618054758400
10359cd4c:     	add	x1, sp, #0x28
10359cd50:     	str	x8, [sp]
10359cd54:     	fmov	d4, d2
10359cd58:     	fmov	d5, d3
10359cd5c:     	fmov	d6, d17
10359cd60:     	mov	w0, #0x0                ; =0
10359cd64:     	fmov	d7, d16
10359cd68:     	bl	0x10359c838
10359cd6c:     	mov	x1, x0
10359cd70:     	add	x0, sp, #0x28
10359cd74:     	add	x2, sp, #0x18
10359cd78:     	mov	x3, x19
10359cd7c:     	bl	0x10359b240
10359cd80:     	b	0x10359cd98
10359cd84:     	stp	d0, d1, [x19]
10359cd88:     	movi	d0, #0000000000000000
10359cd8c:     	b	0x10359cd98
10359cd90:     	stp	d17, d16, [x19]
10359cd94:     	fmov	d0, #1.00000000
10359cd98:     	ldur	x8, [x29, #-0x18]
10359cd9c:     	adrp	x9, 0x1048c8000
10359cda0:     	ldr	x9, [x9, #0x4d0]
10359cda4:     	ldr	x9, [x9]
10359cda8:     	cmp	x9, x8
10359cdac:     	b.ne	0x10359cdc4
10359cdb0:     	add	sp, sp, #0x1, lsl #12   ; =0x1000
10359cdb4:     	add	sp, sp, #0x30
10359cdb8:     	ldp	x29, x30, [sp, #0x10]
10359cdbc:     	ldp	x20, x19, [sp], #0x20
10359cdc0:     	ret
10359cdc4:     	bl	0x103bdd4d8

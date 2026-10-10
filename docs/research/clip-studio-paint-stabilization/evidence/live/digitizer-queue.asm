
FUNCTION 0x1020bda30 size 44
1020bda30:     	stp	x29, x30, [sp, #-0x10]!
1020bda34:     	mov	x29, sp
1020bda38:     	bl	0x10213655c
1020bda3c:     	adrp	x8, 0x104a2a000
1020bda40:     	add	x8, x8, #0xdf8
1020bda44:     	str	x8, [x0]
1020bda48:     	stur	xzr, [x0, #0xf4]
1020bda4c:     	stur	xzr, [x0, #0xec]
1020bda50:     	str	wzr, [x0, #0xfc]
1020bda54:     	ldp	x29, x30, [sp], #0x10
1020bda58:     	ret

FUNCTION 0x1020bda5c size 44
1020bda5c:     	stp	x29, x30, [sp, #-0x10]!
1020bda60:     	mov	x29, sp
1020bda64:     	bl	0x10213655c
1020bda68:     	adrp	x8, 0x104a2a000
1020bda6c:     	add	x8, x8, #0xdf8
1020bda70:     	str	x8, [x0]
1020bda74:     	stur	xzr, [x0, #0xf4]
1020bda78:     	stur	xzr, [x0, #0xec]
1020bda7c:     	str	wzr, [x0, #0xfc]
1020bda80:     	ldp	x29, x30, [sp], #0x10
1020bda84:     	ret

FUNCTION 0x1020bda88 size 4
1020bda88:     	b	0x10213662c

FUNCTION 0x1020bda8c size 4
1020bda8c:     	b	0x10213662c

FUNCTION 0x1020bda90 size 20
1020bda90:     	stp	x29, x30, [sp, #-0x10]!
1020bda94:     	mov	x29, sp
1020bda98:     	bl	0x10213662c
1020bda9c:     	ldp	x29, x30, [sp], #0x10
1020bdaa0:     	b	0x103bdd34c

FUNCTION 0x1020bdaa4 size 12
1020bdaa4:     	adrp	x8, 0x104d63000
1020bdaa8:     	ldr	x0, [x8, #0xf80]
1020bdaac:     	ret

FUNCTION 0x1020bdab0 size 100
1020bdab0:     	stp	x20, x19, [sp, #-0x20]!
1020bdab4:     	stp	x29, x30, [sp, #0x10]
1020bdab8:     	add	x29, sp, #0x10
1020bdabc:     	adrp	x20, 0x104d63000
1020bdac0:     	ldr	x8, [x20, #0xf80]
1020bdac4:     	cbnz	x8, 0x1020bdaf4
1020bdac8:     	mov	w0, #0x100              ; =256
1020bdacc:     	bl	0x103bdd37c
1020bdad0:     	mov	x19, x0
1020bdad4:     	bl	0x10213655c
1020bdad8:     	adrp	x8, 0x104a2a000
1020bdadc:     	add	x8, x8, #0xdf8
1020bdae0:     	str	x8, [x19]
1020bdae4:     	stur	xzr, [x19, #0xf4]
1020bdae8:     	stur	xzr, [x19, #0xec]
1020bdaec:     	str	wzr, [x19, #0xfc]
1020bdaf0:     	str	x19, [x20, #0xf80]
1020bdaf4:     	ldp	x29, x30, [sp, #0x10]
1020bdaf8:     	ldp	x20, x19, [sp], #0x20
1020bdafc:     	ret
1020bdb00:     	mov	x20, x0
1020bdb04:     	mov	x0, x19
1020bdb08:     	bl	0x103bdd34c
1020bdb0c:     	mov	x0, x20
1020bdb10:     	bl	0x103bda970

FUNCTION 0x1020bdb14 size 52
1020bdb14:     	stp	x20, x19, [sp, #-0x20]!
1020bdb18:     	stp	x29, x30, [sp, #0x10]
1020bdb1c:     	add	x29, sp, #0x10
1020bdb20:     	adrp	x19, 0x104d63000
1020bdb24:     	ldr	x0, [x19, #0xf80]
1020bdb28:     	cbz	x0, 0x1020bdb3c
1020bdb2c:     	ldr	x8, [x0]
1020bdb30:     	ldr	x8, [x8, #0x8]
1020bdb34:     	blr	x8
1020bdb38:     	str	xzr, [x19, #0xf80]
1020bdb3c:     	ldp	x29, x30, [sp, #0x10]
1020bdb40:     	ldp	x20, x19, [sp], #0x20
1020bdb44:     	ret

FUNCTION 0x1020bdb48 size 12
1020bdb48:     	adrp	x8, 0x104b22000
1020bdb4c:     	str	x0, [x8, #0x68]
1020bdb50:     	ret

FUNCTION 0x1020bdb54 size 12
1020bdb54:     	adrp	x8, 0x104b22000
1020bdb58:     	ldr	x0, [x8, #0x68]
1020bdb5c:     	ret

FUNCTION 0x1020bdb60 size 12
1020bdb60:     	adrp	x8, 0x104b22000
1020bdb64:     	str	w0, [x8, #0x70]
1020bdb68:     	ret

FUNCTION 0x1020bdb6c size 608
1020bdb6c:     	sub	sp, sp, #0xd0
1020bdb70:     	stp	x24, x23, [sp, #0x90]
1020bdb74:     	stp	x22, x21, [sp, #0xa0]
1020bdb78:     	stp	x20, x19, [sp, #0xb0]
1020bdb7c:     	stp	x29, x30, [sp, #0xc0]
1020bdb80:     	add	x29, sp, #0xc0
1020bdb84:     	mov	x19, x3
1020bdb88:     	mov	x21, x2
1020bdb8c:     	mov	x22, x1
1020bdb90:     	mov	x20, x0
1020bdb94:     	cmp	w1, #0x5
1020bdb98:     	b.gt	0x1020bdc44
1020bdb9c:     	cmp	w22, #0x2
1020bdba0:     	b.eq	0x1020bdd60
1020bdba4:     	cmp	w22, #0x3
1020bdba8:     	b.ne	0x1020bdce0
1020bdbac:     	mov	x0, x20
1020bdbb0:     	bl	0x102136790
1020bdbb4:     	cbz	w0, 0x1020bdc14
1020bdbb8:     	ldp	q0, q1, [x21, #0x20]
1020bdbbc:     	stp	q0, q1, [sp, #0x50]
1020bdbc0:     	ldp	q0, q1, [x21, #0x40]
1020bdbc4:     	stp	q0, q1, [sp, #0x70]
1020bdbc8:     	ldp	q0, q1, [x21]
1020bdbcc:     	stp	q0, q1, [sp, #0x30]
1020bdbd0:     	mov	x0, x20
1020bdbd4:     	bl	0x102136798
1020bdbd8:     	stp	d0, d1, [sp, #0x40]
1020bdbdc:     	str	xzr, [sp, #0x50]
1020bdbe0:     	ldur	d0, [x20, #0xec]
1020bdbe4:     	str	d0, [sp, #0x58]
1020bdbe8:     	ldr	w8, [x20, #0xf4]
1020bdbec:     	str	w8, [sp, #0x60]
1020bdbf0:     	ldr	x8, [sp, #0x78]
1020bdbf4:     	cmp	x8, #0x0
1020bdbf8:     	b.gt	0x1020bdc04
1020bdbfc:     	ldr	x8, [x20, #0xf8]
1020bdc00:     	str	x8, [sp, #0x78]
1020bdc04:     	add	x1, sp, #0x30
1020bdc08:     	mov	x0, x20
1020bdc0c:     	mov	x2, x19
1020bdc10:     	bl	0x1020bde40
1020bdc14:     	movi.2d	v0, #0000000000000000
1020bdc18:     	stp	q0, q0, [sp, #0x70]
1020bdc1c:     	stp	q0, q0, [sp, #0x50]
1020bdc20:     	stp	q0, q0, [sp, #0x30]
1020bdc24:     	add	x0, sp, #0x8
1020bdc28:     	bl	0x1021364f8
1020bdc2c:     	add	x2, sp, #0x30
1020bdc30:     	add	x3, sp, #0x8
1020bdc34:     	mov	x0, x19
1020bdc38:     	mov	w1, #0x3                ; =3
1020bdc3c:     	bl	0x1020bddcc
1020bdc40:     	b	0x1020bdd94
1020bdc44:     	cmp	w22, #0x6
1020bdc48:     	b.eq	0x1020bdc54
1020bdc4c:     	cmp	w22, #0x9
1020bdc50:     	b.ne	0x1020bdce0
1020bdc54:     	mov	x0, x20
1020bdc58:     	mov	w1, #0x0                ; =0
1020bdc5c:     	bl	0x1021367b8
1020bdc60:     	mov	x0, x20
1020bdc64:     	bl	0x102136780
1020bdc68:     	fcvtzs	w23, d0
1020bdc6c:     	mov	x0, x20
1020bdc70:     	bl	0x102136778
1020bdc74:     	subs	w23, w23, w0
1020bdc78:     	b.le	0x1020bdcb0
1020bdc7c:     	cmp	w23, #0x1
1020bdc80:     	b.lt	0x1020bdcb0
1020bdc84:     	mov	x0, x20
1020bdc88:     	mov	w1, #0x1                ; =1
1020bdc8c:     	mov	x2, x21
1020bdc90:     	mov	w3, #0x1                ; =1
1020bdc94:     	mov	x4, x19
1020bdc98:     	bl	0x1020bdf80
1020bdc9c:     	mov	x0, x20
1020bdca0:     	bl	0x102136790
1020bdca4:     	cbz	w0, 0x1020bdd9c
1020bdca8:     	subs	w23, w23, #0x1
1020bdcac:     	b.ne	0x1020bdc84
1020bdcb0:     	adrp	x8, 0x104b22000
1020bdcb4:     	ldr	w8, [x8, #0x70]
1020bdcb8:     	cbnz	w8, 0x1020bdd34
1020bdcbc:     	mov	x0, x20
1020bdcc0:     	mov	x1, x21
1020bdcc4:     	mov	x2, x19
1020bdcc8:     	ldp	x29, x30, [sp, #0xc0]
1020bdccc:     	ldp	x20, x19, [sp, #0xb0]
1020bdcd0:     	ldp	x22, x21, [sp, #0xa0]
1020bdcd4:     	ldp	x24, x23, [sp, #0x90]
1020bdcd8:     	add	sp, sp, #0xd0
1020bdcdc:     	b	0x1020bde40
1020bdce0:     	mov	x0, x20
1020bdce4:     	bl	0x102136790
1020bdce8:     	cmp	w0, #0x2
1020bdcec:     	b.ne	0x1020bdd1c
1020bdcf0:     	cmp	w22, #0x8
1020bdcf4:     	b.hi	0x1020bdd1c
1020bdcf8:     	mov	w8, #0x1                ; =1
1020bdcfc:     	lsl	w8, w8, w22
1020bdd00:     	mov	w9, #0x1b0              ; =432
1020bdd04:     	tst	w8, w9
1020bdd08:     	b.eq	0x1020bdd1c
1020bdd0c:     	mov	x0, x20
1020bdd10:     	mov	x1, x21
1020bdd14:     	mov	x2, x19
1020bdd18:     	bl	0x1020bde40
1020bdd1c:     	ldr	w8, [x21, #0x40]
1020bdd20:     	and	w8, w8, #0xfffffffe
1020bdd24:     	cmp	w8, #0x2
1020bdd28:     	cset	w1, eq
1020bdd2c:     	mov	x0, x20
1020bdd30:     	bl	0x1021367a0
1020bdd34:     	mov	x0, x20
1020bdd38:     	mov	x1, x22
1020bdd3c:     	mov	x2, x21
1020bdd40:     	mov	w3, #0x0                ; =0
1020bdd44:     	mov	x4, x19
1020bdd48:     	ldp	x29, x30, [sp, #0xc0]
1020bdd4c:     	ldp	x20, x19, [sp, #0xb0]
1020bdd50:     	ldp	x22, x21, [sp, #0xa0]
1020bdd54:     	ldp	x24, x23, [sp, #0x90]
1020bdd58:     	add	sp, sp, #0xd0
1020bdd5c:     	b	0x1020bdf80
1020bdd60:     	mov	x0, x20
1020bdd64:     	bl	0x102137210
1020bdd68:     	movi.2d	v0, #0000000000000000
1020bdd6c:     	stp	q0, q0, [sp, #0x70]
1020bdd70:     	stp	q0, q0, [sp, #0x50]
1020bdd74:     	stp	q0, q0, [sp, #0x30]
1020bdd78:     	add	x0, sp, #0x8
1020bdd7c:     	bl	0x1021364f8
1020bdd80:     	add	x2, sp, #0x30
1020bdd84:     	add	x3, sp, #0x8
1020bdd88:     	mov	x0, x19
1020bdd8c:     	mov	w1, #0x2                ; =2
1020bdd90:     	bl	0x1020bddcc
1020bdd94:     	add	x0, sp, #0x8
1020bdd98:     	bl	0x102136518
1020bdd9c:     	ldp	x29, x30, [sp, #0xc0]
1020bdda0:     	ldp	x20, x19, [sp, #0xb0]
1020bdda4:     	ldp	x22, x21, [sp, #0xa0]
1020bdda8:     	ldp	x24, x23, [sp, #0x90]
1020bddac:     	add	sp, sp, #0xd0
1020bddb0:     	ret
1020bddb4:     	b	0x1020bddb8
1020bddb8:     	mov	x19, x0
1020bddbc:     	add	x0, sp, #0x8
1020bddc0:     	bl	0x102136518
1020bddc4:     	mov	x0, x19
1020bddc8:     	bl	0x103bda970

FUNCTION 0x1020bddcc size 116
1020bddcc:     	sub	sp, sp, #0x30
1020bddd0:     	stp	x20, x19, [sp, #0x10]
1020bddd4:     	stp	x29, x30, [sp, #0x20]
1020bddd8:     	add	x29, sp, #0x20
1020bdddc:     	ldr	x8, [x0]
1020bdde0:     	cbz	x8, 0x1020bde00
1020bdde4:     	and	x8, x8, #0xfffffffffffffffe
1020bdde8:     	ldr	x4, [x8, #0x8]
1020bddec:     	add	x0, x0, #0x8
1020bddf0:     	ldp	x29, x30, [sp, #0x20]
1020bddf4:     	ldp	x20, x19, [sp, #0x10]
1020bddf8:     	add	sp, sp, #0x30
1020bddfc:     	br	x4
1020bde00:     	adrp	x1, 0x1045e2000
1020bde04:     	add	x1, x1, #0x326
1020bde08:     	mov	x0, sp
1020bde0c:     	bl	0x103bdcc98
1020bde10:     	adrp	x8, 0x1048e8000
1020bde14:     	add	x8, x8, #0xbb8
1020bde18:     	add	x8, x8, #0x10
1020bde1c:     	str	x8, [sp]
1020bde20:     	mov	x0, sp
1020bde24:     	bl	0x1001ffce4
1020bde28:     	brk	#0x1
1020bde2c:     	mov	x19, x0
1020bde30:     	mov	x0, sp
1020bde34:     	bl	0x103bdccc8
1020bde38:     	mov	x0, x19
1020bde3c:     	bl	0x103bda970

FUNCTION 0x1020bde40 size 320
1020bde40:     	sub	sp, sp, #0xa0
1020bde44:     	stp	d9, d8, [sp, #0x30]
1020bde48:     	stp	x28, x27, [sp, #0x40]
1020bde4c:     	stp	x26, x25, [sp, #0x50]
1020bde50:     	stp	x24, x23, [sp, #0x60]
1020bde54:     	stp	x22, x21, [sp, #0x70]
1020bde58:     	stp	x20, x19, [sp, #0x80]
1020bde5c:     	stp	x29, x30, [sp, #0x90]
1020bde60:     	add	x29, sp, #0x90
1020bde64:     	mov	x19, x2
1020bde68:     	mov	x20, x1
1020bde6c:     	mov	x21, x0
1020bde70:     	mov	w1, #0x2                ; =2
1020bde74:     	bl	0x1021367b0
1020bde78:     	mov	x0, x21
1020bde7c:     	mov	w1, #0x0                ; =0
1020bde80:     	bl	0x1021367b8
1020bde84:     	ldp	d8, d9, [x20, #0x10]
1020bde88:     	ldr	x22, [x20, #0x48]
1020bde8c:     	ldr	w23, [x20, #0x38]
1020bde90:     	add	x0, sp, #0x8
1020bde94:     	bl	0x1021364f8
1020bde98:     	mov	w24, #0x1               ; =1
1020bde9c:     	add	x0, sp, #0x8
1020bdea0:     	mov	w1, #0x1                ; =1
1020bdea4:     	bl	0x102136534
1020bdea8:     	adrp	x25, 0x104b22000
1020bdeac:     	str	w24, [sp, #0x4]
1020bdeb0:     	mov	w26, #0x6               ; =6
1020bdeb4:     	mov	w27, #0x9               ; =9
1020bdeb8:     	mov	w28, #0x4               ; =4
1020bdebc:     	mov	w24, #0x7               ; =7
1020bdec0:     	ldr	x5, [x25, #0x68]
1020bdec4:     	add	x1, sp, #0x4
1020bdec8:     	movi	d2, #0000000000000000
1020bdecc:     	add	x7, sp, #0x8
1020bded0:     	mov	x0, x21
1020bded4:     	fmov	d0, d8
1020bded8:     	fmov	d1, d9
1020bdedc:     	mov	x2, x22
1020bdee0:     	mov	w3, #0x0                ; =0
1020bdee4:     	mov	w4, #0x0                ; =0
1020bdee8:     	mov	x6, x23
1020bdeec:     	bl	0x1021367c0
1020bdef0:     	cbz	w0, 0x1020bdf2c
1020bdef4:     	ldr	w8, [sp, #0x4]
1020bdef8:     	ldr	w9, [x20, #0x40]
1020bdefc:     	cmp	w9, #0x3
1020bdf00:     	csel	w9, w27, w26, eq
1020bdf04:     	csel	w10, w24, w28, eq
1020bdf08:     	cmp	w8, #0x2
1020bdf0c:     	mov	w11, #0x1               ; =1
1020bdf10:     	csel	w10, w11, w10, ne
1020bdf14:     	cmp	w8, #0x3
1020bdf18:     	csel	w1, w9, w10, eq
1020bdf1c:     	add	x3, sp, #0x8
1020bdf20:     	mov	x0, x19
1020bdf24:     	mov	x2, x20
1020bdf28:     	bl	0x1020bddcc
1020bdf2c:     	ldr	w8, [sp, #0x4]
1020bdf30:     	cmp	w8, #0x1
1020bdf34:     	b.eq	0x1020bdec0
1020bdf38:     	add	x0, sp, #0x8
1020bdf3c:     	bl	0x102136518
1020bdf40:     	ldp	x29, x30, [sp, #0x90]
1020bdf44:     	ldp	x20, x19, [sp, #0x80]
1020bdf48:     	ldp	x22, x21, [sp, #0x70]
1020bdf4c:     	ldp	x24, x23, [sp, #0x60]
1020bdf50:     	ldp	x26, x25, [sp, #0x50]
1020bdf54:     	ldp	x28, x27, [sp, #0x40]
1020bdf58:     	ldp	d9, d8, [sp, #0x30]
1020bdf5c:     	add	sp, sp, #0xa0
1020bdf60:     	ret
1020bdf64:     	b	0x1020bdf6c
1020bdf68:     	b	0x1020bdf6c
1020bdf6c:     	mov	x19, x0
1020bdf70:     	add	x0, sp, #0x8
1020bdf74:     	bl	0x102136518
1020bdf78:     	mov	x0, x19
1020bdf7c:     	bl	0x103bda970

FUNCTION 0x1020bdf80 size 364
1020bdf80:     	sub	sp, sp, #0xa0
1020bdf84:     	stp	d11, d10, [sp, #0x30]
1020bdf88:     	stp	d9, d8, [sp, #0x40]
1020bdf8c:     	stp	x26, x25, [sp, #0x50]
1020bdf90:     	stp	x24, x23, [sp, #0x60]
1020bdf94:     	stp	x22, x21, [sp, #0x70]
1020bdf98:     	stp	x20, x19, [sp, #0x80]
1020bdf9c:     	stp	x29, x30, [sp, #0x90]
1020bdfa0:     	add	x29, sp, #0x90
1020bdfa4:     	mov	x21, x4
1020bdfa8:     	mov	x25, x3
1020bdfac:     	mov	x19, x2
1020bdfb0:     	mov	x22, x1
1020bdfb4:     	mov	x20, x0
1020bdfb8:     	sub	w8, w1, #0x4
1020bdfbc:     	cmp	w8, #0x5
1020bdfc0:     	b.hi	0x1020bdfd4
1020bdfc4:     	adrp	x9, 0x104513000
1020bdfc8:     	add	x9, x9, #0xb10
1020bdfcc:     	ldr	w26, [x9, w8, uxtw #2]
1020bdfd0:     	b	0x1020bdfd8
1020bdfd4:     	mov	w26, #0x1               ; =1
1020bdfd8:     	str	w26, [sp, #0x2c]
1020bdfdc:     	ldp	d9, d10, [x19, #0x10]
1020bdfe0:     	ldr	d8, [x19, #0x20]
1020bdfe4:     	ldr	x24, [x19, #0x48]
1020bdfe8:     	ldr	w23, [x19, #0x38]
1020bdfec:     	mov	x0, sp
1020bdff0:     	bl	0x1021364f8
1020bdff4:     	mov	x0, sp
1020bdff8:     	mov	x1, x25
1020bdffc:     	bl	0x102136534
1020be000:     	adrp	x8, 0x104b22000
1020be004:     	ldr	x5, [x8, #0x68]
1020be008:     	add	x1, sp, #0x2c
1020be00c:     	mov	x7, sp
1020be010:     	mov	x0, x20
1020be014:     	fmov	d0, d9
1020be018:     	fmov	d1, d10
1020be01c:     	mov	x2, x24
1020be020:     	fmov	d2, d8
1020be024:     	mov	w3, #0x0                ; =0
1020be028:     	mov	w4, #0x1                ; =1
1020be02c:     	mov	x6, x23
1020be030:     	bl	0x1021367c0
1020be034:     	cbz	w0, 0x1020be08c
1020be038:     	ldr	w8, [sp, #0x2c]
1020be03c:     	cmp	w8, w26
1020be040:     	b.eq	0x1020be078
1020be044:     	ldr	w9, [x19, #0x40]
1020be048:     	mov	w10, #0x1               ; =1
1020be04c:     	mov	w11, #0x6               ; =6
1020be050:     	mov	w12, #0x9               ; =9
1020be054:     	cmp	w9, #0x3
1020be058:     	csel	w9, w12, w11, eq
1020be05c:     	mov	w11, #0x4               ; =4
1020be060:     	mov	w12, #0x7               ; =7
1020be064:     	csel	w11, w12, w11, eq
1020be068:     	cmp	w8, #0x2
1020be06c:     	csel	w10, w10, w11, ne
1020be070:     	cmp	w8, #0x3
1020be074:     	csel	w22, w9, w10, eq
1020be078:     	mov	x3, sp
1020be07c:     	mov	x0, x21
1020be080:     	mov	x1, x22
1020be084:     	mov	x2, x19
1020be088:     	bl	0x1020bddcc
1020be08c:     	ldr	d0, [x19, #0x28]
1020be090:     	stur	d0, [x20, #0xec]
1020be094:     	ldr	w8, [x19, #0x30]
1020be098:     	str	w8, [x20, #0xf4]
1020be09c:     	ldr	x8, [x19, #0x48]
1020be0a0:     	str	x8, [x20, #0xf8]
1020be0a4:     	mov	x0, sp
1020be0a8:     	bl	0x102136518
1020be0ac:     	ldp	x29, x30, [sp, #0x90]
1020be0b0:     	ldp	x20, x19, [sp, #0x80]
1020be0b4:     	ldp	x22, x21, [sp, #0x70]
1020be0b8:     	ldp	x24, x23, [sp, #0x60]
1020be0bc:     	ldp	x26, x25, [sp, #0x50]
1020be0c0:     	ldp	d9, d8, [sp, #0x40]
1020be0c4:     	ldp	d11, d10, [sp, #0x30]
1020be0c8:     	add	sp, sp, #0xa0
1020be0cc:     	ret
1020be0d0:     	b	0x1020be0d8
1020be0d4:     	b	0x1020be0d8
1020be0d8:     	mov	x19, x0
1020be0dc:     	mov	x0, sp
1020be0e0:     	bl	0x102136518
1020be0e4:     	mov	x0, x19
1020be0e8:     	bl	0x103bda970

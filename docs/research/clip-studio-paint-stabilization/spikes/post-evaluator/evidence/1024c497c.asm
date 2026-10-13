
FUNCTION 0x1024c497c size 348
1024c497c:     	sub	sp, sp, #0x50
1024c4980:     	stp	d9, d8, [sp, #0x10]
1024c4984:     	stp	x22, x21, [sp, #0x20]
1024c4988:     	stp	x20, x19, [sp, #0x30]
1024c498c:     	stp	x29, x30, [sp, #0x40]
1024c4990:     	add	x29, sp, #0x40
1024c4994:     	fmov	d8, d0
1024c4998:     	mov	x20, x1
1024c499c:     	mov	x19, x0
1024c49a0:     	ldr	w8, [x0, #0x90]
1024c49a4:     	cmp	w8, #0x1
1024c49a8:     	b.eq	0x1024c4a04
1024c49ac:     	ldrb	w8, [x20, #0x50]
1024c49b0:     	tbnz	w8, #0x0, 0x1024c4a04
1024c49b4:     	str	wzr, [sp, #0xc]
1024c49b8:     	add	x0, x19, #0x88
1024c49bc:     	add	x3, sp, #0xc
1024c49c0:     	fmov	d0, d8
1024c49c4:     	mov	w1, #0x0                ; =0
1024c49c8:     	mov	x2, x20
1024c49cc:     	bl	0x1024aff24
1024c49d0:     	fmov	d8, d0
1024c49d4:     	ldrb	w8, [x19, #0x90]
1024c49d8:     	tbz	w8, #0x7, 0x1024c4a04
1024c49dc:     	add	x0, x19, #0x88
1024c49e0:     	mov	w1, #0x80               ; =128
1024c49e4:     	bl	0x1024af6f0
1024c49e8:     	fcvt	d0, s0
1024c49ec:     	fmov	d1, #1.00000000
1024c49f0:     	fsub	d0, d1, d0
1024c49f4:     	adrp	x8, 0x10433f000
1024c49f8:     	ldr	d2, [x8, #0xea0]
1024c49fc:     	fmadd	d0, d0, d2, d1
1024c4a00:     	fmul	d8, d8, d0
1024c4a04:     	ldr	d1, [x20, #0x38]
1024c4a08:     	fmul	d0, d8, d1
1024c4a0c:     	fmov	d2, #1.00000000
1024c4a10:     	fcmp	d0, d2
1024c4a14:     	fcsel	d8, d2, d0, mi
1024c4a18:     	ldr	w21, [x19, #0x624]
1024c4a1c:     	movi	d0, #0000000000000000
1024c4a20:     	tbz	w21, #0x0, 0x1024c4a68
1024c4a24:     	ldr	w8, [x19, #0x638]
1024c4a28:     	cmp	w8, #0x1
1024c4a2c:     	b.ne	0x1024c4a38
1024c4a30:     	ldr	d0, [x19, #0x628]
1024c4a34:     	b	0x1024c4a64
1024c4a38:     	str	wzr, [sp, #0x8]
1024c4a3c:     	ldr	d0, [x19, #0x628]
1024c4a40:     	add	x0, x19, #0x630
1024c4a44:     	add	x3, sp, #0x8
1024c4a48:     	mov	w1, #0x0                ; =0
1024c4a4c:     	mov	x2, x20
1024c4a50:     	bl	0x1024aff24
1024c4a54:     	adrp	x8, 0x1042e6000
1024c4a58:     	ldr	d1, [x8, #0xfc8]
1024c4a5c:     	fmul	d8, d8, d1
1024c4a60:     	ldr	d1, [x20, #0x38]
1024c4a64:     	fmul	d0, d0, d1
1024c4a68:     	ldr	w8, [x19, #0x198]
1024c4a6c:     	cbz	w8, 0x1024c4abc
1024c4a70:     	ldrb	w9, [x19, #0x80]
1024c4a74:     	tbz	w9, #0x4, 0x1024c4a90
1024c4a78:     	adrp	x9, 0x1042e6000
1024c4a7c:     	ldr	d1, [x9, #0xfc8]
1024c4a80:     	tbnz	w21, #0x0, 0x1024c4a8c
1024c4a84:     	fmul	d8, d8, d1
1024c4a88:     	b	0x1024c4a90
1024c4a8c:     	fmul	d0, d0, d1
1024c4a90:     	movi	d1, #0000000000000000
1024c4a94:     	cmp	w8, #0x3
1024c4a98:     	b.hi	0x1024c4ab4
1024c4a9c:     	adrp	x9, 0x10453a000
1024c4aa0:     	add	x9, x9, #0x878
1024c4aa4:     	add	x8, x9, w8, sxtw #3
1024c4aa8:     	ldur	d1, [x8, #-0x8]
1024c4aac:     	fcmp	d1, d8
1024c4ab0:     	fcsel	d1, d8, d1, gt
1024c4ab4:     	fmov	d2, #-0.25000000
1024c4ab8:     	fmadd	d8, d1, d2, d8
1024c4abc:     	fadd	d0, d0, d8
1024c4ac0:     	ldp	x29, x30, [sp, #0x40]
1024c4ac4:     	ldp	x20, x19, [sp, #0x30]
1024c4ac8:     	ldp	x22, x21, [sp, #0x20]
1024c4acc:     	ldp	d9, d8, [sp, #0x10]
1024c4ad0:     	add	sp, sp, #0x50
1024c4ad4:     	ret

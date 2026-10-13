
FUNCTION 0x10277f8c8 size 400
10277f8c8:     	sub	sp, sp, #0xe0
10277f8cc:     	stp	d11, d10, [sp, #0x90]
10277f8d0:     	stp	d9, d8, [sp, #0xa0]
10277f8d4:     	stp	x22, x21, [sp, #0xb0]
10277f8d8:     	stp	x20, x19, [sp, #0xc0]
10277f8dc:     	stp	x29, x30, [sp, #0xd0]
10277f8e0:     	add	x29, sp, #0xd0
10277f8e4:     	fmov	d8, d0
10277f8e8:     	mov	x19, x0
10277f8ec:     	ldr	x0, [x0]
10277f8f0:     	ldr	w8, [x0, #0x20]
10277f8f4:     	tbnz	w8, #0x7, 0x10277f964
10277f8f8:     	tbz	w8, #0x4, 0x10277f920
10277f8fc:     	mov	x0, sp
10277f900:     	bl	0x102786e10
10277f904:     	ldr	x1, [x19]
10277f908:     	mov	x0, sp
10277f90c:     	bl	0x1027874a8
10277f910:     	str	x0, [x19]
10277f914:     	mov	x0, sp
10277f918:     	bl	0x102786e94
10277f91c:     	ldr	x0, [x19]
10277f920:     	ldr	x19, [x0, #0x30]
10277f924:     	cbz	x19, 0x10277fa04
10277f928:     	mov	x0, x19
10277f92c:     	mov	w1, #0x1                ; =1
10277f930:     	bl	0x10276ba84
10277f934:     	fcmp	d0, d8
10277f938:     	b.le	0x10277f958
10277f93c:     	fmov	d0, #0.50000000
10277f940:     	fmov	d1, #0.50000000
10277f944:     	mov	x0, x19
10277f948:     	bl	0x10276dec8
10277f94c:     	cbz	x0, 0x10277f958
10277f950:     	cbnz	x19, 0x10277f928
10277f954:     	b	0x10277fa04
10277f958:     	ldr	x19, [x19, #0x28]
10277f95c:     	cbnz	x19, 0x10277f928
10277f960:     	b	0x10277fa04
10277f964:     	stp	xzr, xzr, [x29, #-0x58]
10277f968:     	stur	xzr, [x29, #-0x48]
10277f96c:     	ldr	x20, [x0, #0x30]
10277f970:     	cbz	x20, 0x10277f9e8
10277f974:     	fmov	d10, #1.00000000
10277f978:     	mov	x0, x20
10277f97c:     	mov	w1, #0x1                ; =1
10277f980:     	bl	0x10276ba84
10277f984:     	fcmp	d0, d8
10277f988:     	b.le	0x10277f9dc
10277f98c:     	fdiv	d0, d0, d8
10277f990:     	fcvtps	w8, d0
10277f994:     	cmp	w8, #0x2
10277f998:     	b.lt	0x10277f9dc
10277f99c:     	scvtf	d0, w8
10277f9a0:     	fdiv	d11, d10, d0
10277f9a4:     	sub	w21, w8, #0x1
10277f9a8:     	fmov	d9, d11
10277f9ac:     	str	x20, [sp]
10277f9b0:     	str	d9, [sp, #0x8]
10277f9b4:     	mov	x0, x20
10277f9b8:     	fmov	d0, d9
10277f9bc:     	bl	0x10276b6d4
10277f9c0:     	stp	d0, d1, [sp, #0x10]
10277f9c4:     	sub	x0, x29, #0x58
10277f9c8:     	mov	x1, sp
10277f9cc:     	bl	0x100d24a74
10277f9d0:     	fadd	d9, d11, d9
10277f9d4:     	subs	w21, w21, #0x1
10277f9d8:     	b.ne	0x10277f9ac
10277f9dc:     	ldr	x20, [x20, #0x28]
10277f9e0:     	cbnz	x20, 0x10277f978
10277f9e4:     	ldr	x0, [x19]
10277f9e8:     	sub	x1, x29, #0x58
10277f9ec:     	mov	w2, #0x0                ; =0
10277f9f0:     	bl	0x102762bac
10277f9f4:     	ldur	x0, [x29, #-0x58]
10277f9f8:     	cbz	x0, 0x10277fa04
10277f9fc:     	stur	x0, [x29, #-0x50]
10277fa00:     	bl	0x103bdd34c
10277fa04:     	ldp	x29, x30, [sp, #0xd0]
10277fa08:     	ldp	x20, x19, [sp, #0xc0]
10277fa0c:     	ldp	x22, x21, [sp, #0xb0]
10277fa10:     	ldp	d9, d8, [sp, #0xa0]
10277fa14:     	ldp	d11, d10, [sp, #0x90]
10277fa18:     	add	sp, sp, #0xe0
10277fa1c:     	ret
10277fa20:     	mov	x19, x0
10277fa24:     	mov	x0, sp
10277fa28:     	bl	0x102786e94
10277fa2c:     	b	0x10277fa50
10277fa30:     	b	0x10277fa3c
10277fa34:     	b	0x10277fa3c
10277fa38:     	b	0x10277fa3c
10277fa3c:     	mov	x19, x0
10277fa40:     	ldur	x0, [x29, #-0x58]
10277fa44:     	cbz	x0, 0x10277fa50
10277fa48:     	stur	x0, [x29, #-0x50]
10277fa4c:     	bl	0x103bdd34c
10277fa50:     	mov	x0, x19
10277fa54:     	bl	0x103bda970

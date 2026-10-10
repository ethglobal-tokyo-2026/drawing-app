102193940:     	fsub	d6, d2, d0
102193944:     	fsub	d7, d3, d1
102193948:     	fsub	d0, d4, d0
10219394c:     	fsub	d1, d5, d1
102193950:     	fmul	d16, d7, d1
102193954:     	fmadd	d17, d6, d0, d16
102193958:     	fcmp	d17, #0.0
10219395c:     	b.ls	0x102193998
102193960:     	fmul	d16, d7, d7
102193964:     	fmadd	d16, d6, d6, d16
102193968:     	fcmp	d17, d16
10219396c:     	b.ge	0x102193990
102193970:     	fnmul	d0, d0, d7
102193974:     	fmadd	d2, d1, d6, d0
102193978:     	fnmadd	d0, d1, d6, d0
10219397c:     	fcmp	d2, #0.0
102193980:     	fcsel	d0, d0, d2, mi
102193984:     	fsqrt	d1, d16
102193988:     	fdiv	d0, d0, d1
10219398c:     	ret
102193990:     	fsub	d0, d4, d2
102193994:     	fsub	d1, d5, d3
102193998:     	fmul	d1, d1, d1
10219399c:     	fmadd	d0, d0, d0, d1
1021939a0:     	fsqrt	d1, d0
1021939a4:     	fcmp	d0, #0.0
1021939a8:     	movi	d0, #0000000000000000
1021939ac:     	fcsel	d0, d1, d0, ne
1021939b0:     	ret
1021939b4:     	fsub	d2, d2, d0
1021939b8:     	fsub	d0, d3, d1
1021939bc:     	fmul	d1, d0, d0
1021939c0:     	fmadd	d1, d2, d2, d1
1021939c4:     	fcmp	d1, #0.0
1021939c8:     	b.eq	0x1021939e4
1021939cc:     	fsqrt	d1, d1
1021939d0:     	fdiv	d2, d2, d1
1021939d4:     	fdiv	d0, d0, d1
1021939d8:     	stp	d2, d0, [x0]
1021939dc:     	mov	w8, #0x1                ; =1
1021939e0:     	b	0x1021939ec
1021939e4:     	mov	w8, #0x0                ; =0
1021939e8:     	stp	xzr, xzr, [x0]
1021939ec:     	mov	x0, x8
1021939f0:     	ret
1021939f4:     	sub	sp, sp, #0x70
1021939f8:     	stp	d11, d10, [sp, #0x40]
1021939fc:     	stp	d9, d8, [sp, #0x50]
102193a00:     	stp	x29, x30, [sp, #0x60]
102193a04:     	add	x29, sp, #0x60
102193a08:     	stp	d0, d1, [sp, #0x30]
102193a0c:     	stp	d2, d3, [sp, #0x20]
102193a10:     	stp	d4, d5, [sp, #0x10]
102193a14:     	stp	d6, d7, [sp]
102193a18:     	add	x0, sp, #0x30
102193a1c:     	add	x1, sp, #0x20
102193a20:     	bl	0x10221b370
102193a24:     	fmov	d8, d0
102193a28:     	fmov	d9, d1
102193a2c:     	fmov	d10, d2
102193a30:     	fmov	d11, d3
102193a34:     	add	x0, sp, #0x10
102193a38:     	mov	x1, sp
102193a3c:     	bl	0x10221b370
102193a40:     	fcmp	d8, d2
102193a44:     	fccmp	d10, d0, #0x4, mi
102193a48:     	fccmp	d9, d3, #0x0, gt
102193a4c:     	fccmp	d11, d1, #0x4, mi
102193a50:     	b.gt	0x102193a6c
102193a54:     	mov	w0, #0x0                ; =0
102193a58:     	ldp	x29, x30, [sp, #0x60]
102193a5c:     	ldp	d9, d8, [sp, #0x50]
102193a60:     	ldp	d11, d10, [sp, #0x40]
102193a64:     	add	sp, sp, #0x70
102193a68:     	ret
102193a6c:     	ldr	d0, [sp, #0x20]
102193a70:     	ldr	d1, [sp, #0x30]
102193a74:     	fabd	d2, d0, d1
102193a78:     	adrp	x8, 0x1042e3000
102193a7c:     	ldr	d3, [x8, #0x690]
102193a80:     	fcmp	d2, d3
102193a84:     	b.ls	0x102193ae4
102193a88:     	fsub	d6, d0, d1
102193a8c:     	ldr	d2, [sp, #0x28]
102193a90:     	ldr	d7, [sp, #0x38]
102193a94:     	fsub	d16, d2, d7
102193a98:     	ldp	d2, d4, [sp, #0x10]
102193a9c:     	fsub	d4, d4, d7
102193aa0:     	fsub	d5, d2, d1
102193aa4:     	fnmul	d5, d5, d16
102193aa8:     	fmadd	d5, d4, d6, d5
102193aac:     	ldp	d4, d17, [sp]
102193ab0:     	fsub	d7, d17, d7
102193ab4:     	fsub	d17, d4, d1
102193ab8:     	fnmul	d16, d17, d16
102193abc:     	fmadd	d6, d7, d6, d16
102193ac0:     	fcmp	d5, #0.0
102193ac4:     	b.le	0x102193ad0
102193ac8:     	fcmp	d6, #0.0
102193acc:     	b.gt	0x102193a54
102193ad0:     	fcmp	d5, #0.0
102193ad4:     	b.pl	0x102193b00
102193ad8:     	fcmp	d6, #0.0
102193adc:     	b.mi	0x102193a54
102193ae0:     	b	0x102193b00
102193ae4:     	ldr	d2, [sp, #0x10]
102193ae8:     	fsub	d5, d2, d1
102193aec:     	ldr	d4, [sp]
102193af0:     	fsub	d6, d4, d1
102193af4:     	fmul	d5, d5, d6
102193af8:     	fcmp	d5, #0.0
102193afc:     	b.gt	0x102193a54
102193b00:     	fabd	d5, d4, d2
102193b04:     	fcmp	d5, d3
102193b08:     	b.ls	0x102193b68
102193b0c:     	fsub	d3, d4, d2
102193b10:     	ldr	d4, [sp, #0x8]
102193b14:     	ldr	d5, [sp, #0x18]
102193b18:     	fsub	d4, d4, d5
102193b1c:     	ldr	d6, [sp, #0x38]
102193b20:     	fsub	d6, d6, d5
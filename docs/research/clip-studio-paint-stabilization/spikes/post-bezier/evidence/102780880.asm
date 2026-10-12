
FUNCTION 0x102780880 size 1028
102780880:     	sub	sp, sp, #0x150
102780884:     	stp	d15, d14, [sp, #0xb0]
102780888:     	stp	d13, d12, [sp, #0xc0]
10278088c:     	stp	d11, d10, [sp, #0xd0]
102780890:     	stp	d9, d8, [sp, #0xe0]
102780894:     	stp	x28, x27, [sp, #0xf0]
102780898:     	stp	x26, x25, [sp, #0x100]
10278089c:     	stp	x24, x23, [sp, #0x110]
1027808a0:     	stp	x22, x21, [sp, #0x120]
1027808a4:     	stp	x20, x19, [sp, #0x130]
1027808a8:     	stp	x29, x30, [sp, #0x140]
1027808ac:     	add	x29, sp, #0x140
1027808b0:     	mov	x21, x1
1027808b4:     	mov	x19, x0
1027808b8:     	ldr	x22, [x0, #0x38]
1027808bc:     	bl	0x10276afac
1027808c0:     	ldr	w23, [x19, #0x40]
1027808c4:     	cmp	x22, #0x0
1027808c8:     	ccmp	x0, #0x0, #0x4, ne
1027808cc:     	b.ne	0x1027808d8
1027808d0:     	and	w8, w23, #0xfffffffc
1027808d4:     	b	0x102780c28
1027808d8:     	mov	x20, x0
1027808dc:     	orr	w8, w23, #0x1
1027808e0:     	str	w8, [x19, #0x40]
1027808e4:     	ldr	x8, [x22]
1027808e8:     	ldr	x8, [x8, #0x88]
1027808ec:     	mov	x0, x22
1027808f0:     	blr	x8
1027808f4:     	fmov	d8, d0
1027808f8:     	fmov	d0, #1.00000000
1027808fc:     	mov	x0, x20
102780900:     	bl	0x10276b5e4
102780904:     	fmov	d10, d0
102780908:     	fmov	d11, d1
10278090c:     	movi	d0, #0000000000000000
102780910:     	mov	x0, x19
102780914:     	bl	0x10276b5e4
102780918:     	fabs	d2, d8
10278091c:     	adrp	x8, 0x1042e3000
102780920:     	ldr	d9, [x8, #0x690]
102780924:     	fcmp	d2, d9
102780928:     	b.ls	0x102780c20
10278092c:     	fabs	d2, d10
102780930:     	fcmp	d2, d9
102780934:     	b.hi	0x102780944
102780938:     	fabs	d2, d11
10278093c:     	fcmp	d2, d9
102780940:     	b.ls	0x102780c20
102780944:     	fabs	d2, d0
102780948:     	fcmp	d2, d9
10278094c:     	b.hi	0x10278095c
102780950:     	fabs	d2, d1
102780954:     	fcmp	d2, d9
102780958:     	b.ls	0x102780c20
10278095c:     	fneg	d8, d0
102780960:     	fneg	d14, d1
102780964:     	cbz	w21, 0x102780998
102780968:     	fmul	d1, d11, d14
10278096c:     	fmadd	d1, d10, d8, d1
102780970:     	adrp	x8, 0x10454d000
102780974:     	ldr	d2, [x8, #0xd88]
102780978:     	fcmp	d1, d2
10278097c:     	ubfx	w8, w23, #2, #1
102780980:     	csinc	w8, w8, wzr, mi
102780984:     	adrp	x9, 0x10454d000
102780988:     	ldr	d2, [x9, #0xd90]
10278098c:     	fcmp	d1, d2
102780990:     	b.mi	0x102780c20
102780994:     	tbz	w8, #0x0, 0x102780c20
102780998:     	fmul	d0, d11, d0
10278099c:     	fmadd	d15, d10, d14, d0
1027809a0:     	fmov	d0, #1.00000000
1027809a4:     	mov	x0, x20
1027809a8:     	bl	0x10276b98c
1027809ac:     	add	x21, sp, #0x98
1027809b0:     	add	x22, x21, #0x8
1027809b4:     	stp	d0, d1, [sp, #0x98]
1027809b8:     	fneg	d0, d0
1027809bc:     	fneg	d1, d1
1027809c0:     	add	x23, sp, #0x88
1027809c4:     	add	x24, x23, #0x8
1027809c8:     	stp	d0, d1, [sp, #0x88]
1027809cc:     	movi	d0, #0000000000000000
1027809d0:     	mov	x0, x19
1027809d4:     	bl	0x10276b98c
1027809d8:     	add	x25, sp, #0x78
1027809dc:     	add	x26, x25, #0x8
1027809e0:     	stp	d0, d1, [sp, #0x78]
1027809e4:     	fneg	d0, d0
1027809e8:     	fneg	d1, d1
1027809ec:     	add	x27, sp, #0x68
1027809f0:     	add	x28, x27, #0x8
1027809f4:     	stp	d0, d1, [sp, #0x68]
1027809f8:     	add	x0, sp, #0x98
1027809fc:     	add	x1, sp, #0x88
102780a00:     	bl	0x102193618
102780a04:     	str	d0, [sp, #0x60]
102780a08:     	add	x0, sp, #0x78
102780a0c:     	add	x1, sp, #0x68
102780a10:     	bl	0x102193618
102780a14:     	fmov	d6, d0
102780a18:     	fcmp	d15, #0.0
102780a1c:     	fcsel	d12, d8, d10, mi
102780a20:     	fcsel	d13, d14, d11, mi
102780a24:     	fcsel	d10, d10, d8, mi
102780a28:     	fcsel	d11, d11, d14, mi
102780a2c:     	csel	x8, x22, x28, mi
102780a30:     	ldr	d16, [x8]
102780a34:     	csel	x8, x26, x24, mi
102780a38:     	ldr	d7, [x8]
102780a3c:     	csel	x8, x21, x27, mi
102780a40:     	ldr	d18, [x8]
102780a44:     	csel	x8, x25, x23, mi
102780a48:     	ldr	d17, [x8]
102780a4c:     	ldrb	w8, [x19, #0x40]
102780a50:     	adrp	x21, 0x1042ee000
102780a54:     	tbz	w8, #0x6, 0x102780bd8
102780a58:     	stp	d18, d17, [sp, #0x38]
102780a5c:     	stp	d16, d7, [sp, #0x48]
102780a60:     	str	d6, [sp, #0x58]
102780a64:     	ldp	d1, d0, [x19, #0x8]
102780a68:     	stp	d1, d0, [sp, #0x28]
102780a6c:     	adrp	x8, 0x10430e000
102780a70:     	ldr	d14, [x8, #0x440]
102780a74:     	mov	x0, x20
102780a78:     	fmov	d0, d14
102780a7c:     	bl	0x10276b98c
102780a80:     	stp	d0, d1, [sp, #0x18]
102780a84:     	ldr	d8, [x21, #0x828]
102780a88:     	mov	x0, x19
102780a8c:     	fmov	d0, d8
102780a90:     	bl	0x10276b98c
102780a94:     	stp	d0, d1, [sp, #0x8]
102780a98:     	mov	x0, x20
102780a9c:     	fmov	d0, d14
102780aa0:     	bl	0x10276b6d4
102780aa4:     	fmov	d14, d0
102780aa8:     	str	d1, [sp]
102780aac:     	mov	x0, x19
102780ab0:     	fmov	d0, d8
102780ab4:     	bl	0x10276b6d4
102780ab8:     	fcmp	d15, #0.0
102780abc:     	b.pl	0x102780b0c
102780ac0:     	ldp	d2, d3, [sp, #0x98]
102780ac4:     	ldp	d7, d6, [sp, #0x28]
102780ac8:     	fadd	d2, d7, d2
102780acc:     	fadd	d3, d6, d3
102780ad0:     	ldp	d4, d5, [sp, #0x18]
102780ad4:     	fadd	d4, d4, d14
102780ad8:     	ldr	d16, [sp]
102780adc:     	fadd	d5, d5, d16
102780ae0:     	fsub	d2, d2, d4
102780ae4:     	fsub	d3, d3, d5
102780ae8:     	ldp	d4, d5, [sp, #0x78]
102780aec:     	fadd	d4, d7, d4
102780af0:     	fadd	d5, d6, d5
102780af4:     	ldp	d7, d6, [sp, #0x8]
102780af8:     	fadd	d0, d7, d0
102780afc:     	fadd	d1, d6, d1
102780b00:     	fsub	d0, d4, d0
102780b04:     	fsub	d1, d5, d1
102780b08:     	b	0x102780b54
102780b0c:     	ldp	d2, d3, [sp, #0x68]
102780b10:     	ldp	d5, d4, [sp, #0x28]
102780b14:     	fadd	d2, d5, d2
102780b18:     	fadd	d3, d4, d3
102780b1c:     	ldp	d7, d6, [sp, #0x8]
102780b20:     	fsub	d0, d0, d7
102780b24:     	fsub	d1, d1, d6
102780b28:     	fsub	d2, d2, d0
102780b2c:     	fsub	d3, d3, d1
102780b30:     	ldp	d0, d1, [sp, #0x88]
102780b34:     	fadd	d0, d5, d0
102780b38:     	fadd	d1, d4, d1
102780b3c:     	ldp	d4, d5, [sp, #0x18]
102780b40:     	fsub	d4, d14, d4
102780b44:     	ldr	d6, [sp]
102780b48:     	fsub	d5, d6, d5
102780b4c:     	fsub	d0, d0, d4
102780b50:     	fsub	d1, d1, d5
102780b54:     	fmul	d4, d11, d3
102780b58:     	fmadd	d4, d10, d2, d4
102780b5c:     	fcmp	d4, d9
102780b60:     	fmov	d4, d10
102780b64:     	fmov	d5, d11
102780b68:     	ldp	d7, d6, [sp, #0x50]
102780b6c:     	ldp	d17, d16, [sp, #0x40]
102780b70:     	ldr	d18, [sp, #0x38]
102780b74:     	b.le	0x102780b8c
102780b78:     	fmul	d4, d3, d3
102780b7c:     	fmadd	d4, d2, d2, d4
102780b80:     	fsqrt	d5, d4
102780b84:     	fdiv	d4, d2, d5
102780b88:     	fdiv	d5, d3, d5
102780b8c:     	fmul	d2, d13, d1
102780b90:     	fmadd	d2, d12, d0, d2
102780b94:     	fcmp	d2, d9
102780b98:     	fmov	d2, d12
102780b9c:     	fmov	d3, d13
102780ba0:     	b.le	0x102780bb8
102780ba4:     	fmul	d2, d1, d1
102780ba8:     	fmadd	d2, d0, d0, d2
102780bac:     	fsqrt	d3, d2
102780bb0:     	fdiv	d2, d0, d3
102780bb4:     	fdiv	d3, d1, d3
102780bb8:     	fnmul	d0, d5, d2
102780bbc:     	fmadd	d0, d4, d3, d0
102780bc0:     	fcmp	d0, #0.0
102780bc4:     	b.pl	0x102780bd8
102780bc8:     	fmov	d12, d2
102780bcc:     	fmov	d13, d3
102780bd0:     	fmov	d10, d4
102780bd4:     	fmov	d11, d5
102780bd8:     	fnmul	d0, d11, d12
102780bdc:     	fmadd	d1, d10, d13, d0
102780be0:     	fabs	d2, d1
102780be4:     	ldr	d0, [x21, #0x828]
102780be8:     	fcmp	d2, d0
102780bec:     	b.mi	0x102780c20
102780bf0:     	fneg	d2, d11
102780bf4:     	fsub	d3, d16, d7
102780bf8:     	fsub	d4, d18, d17
102780bfc:     	fmul	d2, d4, d2
102780c00:     	fmadd	d2, d10, d3, d2
102780c04:     	fdiv	d2, d2, d1
102780c08:     	fmadd	d1, d2, d12, d17
102780c0c:     	fmadd	d2, d2, d13, d7
102780c10:     	fmul	d3, d2, d2
102780c14:     	fmadd	d3, d1, d1, d3
102780c18:     	fcmp	d3, d0
102780c1c:     	b.pl	0x102780c5c
102780c20:     	ldr	w8, [x19, #0x40]
102780c24:     	and	w8, w8, #0xfffffffd
102780c28:     	str	w8, [x19, #0x40]
102780c2c:     	ldp	x29, x30, [sp, #0x140]
102780c30:     	ldp	x20, x19, [sp, #0x130]
102780c34:     	ldp	x22, x21, [sp, #0x120]
102780c38:     	ldp	x24, x23, [sp, #0x110]
102780c3c:     	ldp	x26, x25, [sp, #0x100]
102780c40:     	ldp	x28, x27, [sp, #0xf0]
102780c44:     	ldp	d9, d8, [sp, #0xe0]
102780c48:     	ldp	d11, d10, [sp, #0xd0]
102780c4c:     	ldp	d13, d12, [sp, #0xc0]
102780c50:     	ldp	d15, d14, [sp, #0xb0]
102780c54:     	add	sp, sp, #0x150
102780c58:     	ret
102780c5c:     	fsqrt	d3, d3
102780c60:     	fdiv	d1, d1, d3
102780c64:     	ldr	d0, [sp, #0x60]
102780c68:     	fadd	d0, d0, d6
102780c6c:     	fcmp	d3, d0
102780c70:     	fcsel	d0, d0, d3, gt
102780c74:     	fdiv	d2, d2, d3
102780c78:     	mov	x0, x19
102780c7c:     	bl	0x10276b2a0
102780c80:     	b	0x102780c2c

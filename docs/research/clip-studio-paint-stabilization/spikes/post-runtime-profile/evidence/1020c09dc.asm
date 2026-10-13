
FUNCTION 0x1020c09dc size 212
1020c09dc:     	sub	sp, sp, #0x70
1020c09e0:     	stp	x24, x23, [sp, #0x30]
1020c09e4:     	stp	x22, x21, [sp, #0x40]
1020c09e8:     	stp	x20, x19, [sp, #0x50]
1020c09ec:     	stp	x29, x30, [sp, #0x60]
1020c09f0:     	add	x29, sp, #0x60
1020c09f4:     	mov	x20, x0
1020c09f8:     	mov	x19, x8
1020c09fc:     	bl	0x1020c05d8
1020c0a00:     	add	x22, sp, #0x10
1020c0a04:     	add	x0, sp, #0x10
1020c0a08:     	mov	x1, x19
1020c0a0c:     	bl	0x10311643c
1020c0a10:     	adrp	x21, 0x104c8f000
1020c0a14:     	add	x21, x21, #0xf00
1020c0a18:     	mov	x23, sp
1020c0a1c:     	mov	x8, sp
1020c0a20:     	mov	x0, x20
1020c0a24:     	mov	x1, x21
1020c0a28:     	bl	0x1031164a8
1020c0a2c:     	mov	x0, sp
1020c0a30:     	add	x1, sp, #0x10
1020c0a34:     	bl	0x1004dfec0
1020c0a38:     	cmp	w0, #0x0
1020c0a3c:     	csel	x1, x22, x23, ne
1020c0a40:     	add	x0, sp, #0x20
1020c0a44:     	bl	0x10311643c
1020c0a48:     	add	x1, sp, #0x20
1020c0a4c:     	mov	x0, x19
1020c0a50:     	bl	0x103116448
1020c0a54:     	add	x0, sp, #0x10
1020c0a58:     	add	x1, x19, #0x10
1020c0a5c:     	bl	0x10311643c
1020c0a60:     	mov	x8, sp
1020c0a64:     	add	x0, x20, #0x10
1020c0a68:     	add	x1, x21, #0x10
1020c0a6c:     	bl	0x1031164a8
1020c0a70:     	mov	x0, sp
1020c0a74:     	add	x1, sp, #0x10
1020c0a78:     	bl	0x1004dfec0
1020c0a7c:     	cmp	w0, #0x0
1020c0a80:     	csel	x1, x22, x23, ne
1020c0a84:     	add	x0, sp, #0x20
1020c0a88:     	bl	0x10311643c
1020c0a8c:     	add	x0, x19, #0x10
1020c0a90:     	add	x1, sp, #0x20
1020c0a94:     	bl	0x103116448
1020c0a98:     	ldp	x29, x30, [sp, #0x60]
1020c0a9c:     	ldp	x20, x19, [sp, #0x50]
1020c0aa0:     	ldp	x22, x21, [sp, #0x40]
1020c0aa4:     	ldp	x24, x23, [sp, #0x30]
1020c0aa8:     	add	sp, sp, #0x70
1020c0aac:     	ret

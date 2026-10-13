
FUNCTION 0x102ce88a4 size 1020
102ce88a4:     	sub	sp, sp, #0xb0
102ce88a8:     	stp	x28, x27, [sp, #0x50]
102ce88ac:     	stp	x26, x25, [sp, #0x60]
102ce88b0:     	stp	x24, x23, [sp, #0x70]
102ce88b4:     	stp	x22, x21, [sp, #0x80]
102ce88b8:     	stp	x20, x19, [sp, #0x90]
102ce88bc:     	stp	x29, x30, [sp, #0xa0]
102ce88c0:     	add	x29, sp, #0xa0
102ce88c4:     	mov	x20, x1
102ce88c8:     	mov	x21, x0
102ce88cc:     	mov	x19, x8
102ce88d0:     	stp	xzr, xzr, [x8]
102ce88d4:     	ldrb	w8, [x1, #0x10]
102ce88d8:     	tbz	w8, #0x0, 0x102ce8950
102ce88dc:     	ldp	x9, x8, [x21, #0x10]
102ce88e0:     	stp	x9, x8, [sp, #0x30]
102ce88e4:     	cbz	x8, 0x102ce88f4
102ce88e8:     	add	x8, x8, #0x8
102ce88ec:     	mov	w9, #0x1                ; =1
102ce88f0:     	ldadd	w9, w8, [x8]
102ce88f4:     	add	x23, sp, #0x30
102ce88f8:     	add	x0, sp, #0x30
102ce88fc:     	bl	0x10298f250
102ce8900:     	mov	x22, x0
102ce8904:     	add	x0, x23, #0x8
102ce8908:     	bl	0x10001022c
102ce890c:     	cbz	w22, 0x102ce8950
102ce8910:     	add	x22, sp, #0x20
102ce8914:     	add	x8, sp, #0x20
102ce8918:     	mov	x0, x21
102ce891c:     	mov	x1, x20
102ce8920:     	bl	0x102ce9998
102ce8924:     	add	x8, sp, #0x40
102ce8928:     	ldp	x23, x24, [sp, #0x20]
102ce892c:     	stp	xzr, xzr, [sp, #0x20]
102ce8930:     	stp	x23, x24, [x19]
102ce8934:     	stp	xzr, xzr, [sp, #0x40]
102ce8938:     	orr	x0, x8, #0x8
102ce893c:     	bl	0x10001022c
102ce8940:     	add	x0, x22, #0x8
102ce8944:     	bl	0x10001022c
102ce8948:     	cbnz	x23, 0x102ce8c18
102ce894c:     	b	0x102ce8954
102ce8950:     	mov	x24, #0x0               ; =0
102ce8954:     	ldp	x9, x8, [x21, #0x10]
102ce8958:     	stp	x9, x8, [sp, #0x10]
102ce895c:     	cbz	x8, 0x102ce896c
102ce8960:     	add	x8, x8, #0x8
102ce8964:     	mov	w9, #0x1                ; =1
102ce8968:     	ldadd	w9, w8, [x8]
102ce896c:     	add	x22, sp, #0x10
102ce8970:     	add	x0, sp, #0x10
102ce8974:     	bl	0x10298f350
102ce8978:     	mov	x23, x0
102ce897c:     	add	x0, x22, #0x8
102ce8980:     	bl	0x10001022c
102ce8984:     	ldp	x9, x8, [x21, #0x10]
102ce8988:     	stp	x9, x8, [sp]
102ce898c:     	cbz	x8, 0x102ce899c
102ce8990:     	add	x8, x8, #0x8
102ce8994:     	mov	w9, #0x1                ; =1
102ce8998:     	ldadd	w9, w8, [x8]
102ce899c:     	mov	x25, sp
102ce89a0:     	mov	x0, sp
102ce89a4:     	bl	0x10298f450
102ce89a8:     	mov	x22, x0
102ce89ac:     	add	x0, x25, #0x8
102ce89b0:     	bl	0x10001022c
102ce89b4:     	ldr	w8, [x20, #0x10]
102ce89b8:     	cbz	w23, 0x102ce8a08
102ce89bc:     	tbz	w8, #0x8, 0x102ce8a04
102ce89c0:     	add	x25, sp, #0x20
102ce89c4:     	add	x8, sp, #0x20
102ce89c8:     	mov	x0, x21
102ce89cc:     	mov	x1, x20
102ce89d0:     	bl	0x102cee2b8
102ce89d4:     	add	x8, sp, #0x40
102ce89d8:     	ldp	x27, x26, [sp, #0x20]
102ce89dc:     	stp	xzr, xzr, [sp, #0x20]
102ce89e0:     	stp	x27, x26, [x19]
102ce89e4:     	stp	xzr, x24, [sp, #0x40]
102ce89e8:     	add	x0, x8, #0x8
102ce89ec:     	bl	0x10001022c
102ce89f0:     	add	x0, x25, #0x8
102ce89f4:     	bl	0x10001022c
102ce89f8:     	cbnz	x27, 0x102ce8c18
102ce89fc:     	ldr	w8, [x20, #0x10]
102ce8a00:     	mov	x24, x26
102ce8a04:     	tbnz	w8, #0x4, 0x102ce8aec
102ce8a08:     	orr	w9, w23, w22
102ce8a0c:     	cmp	w9, #0x0
102ce8a10:     	cset	w9, ne
102ce8a14:     	tbz	w8, #0x5, 0x102ce8a60
102ce8a18:     	cbz	w9, 0x102ce8a60
102ce8a1c:     	add	x23, sp, #0x20
102ce8a20:     	add	x8, sp, #0x20
102ce8a24:     	mov	x0, x21
102ce8a28:     	mov	x1, x20
102ce8a2c:     	bl	0x102cef884
102ce8a30:     	add	x8, sp, #0x40
102ce8a34:     	ldp	x26, x25, [sp, #0x20]
102ce8a38:     	stp	xzr, xzr, [sp, #0x20]
102ce8a3c:     	stp	x26, x25, [x19]
102ce8a40:     	stp	xzr, x24, [sp, #0x40]
102ce8a44:     	add	x0, x8, #0x8
102ce8a48:     	bl	0x10001022c
102ce8a4c:     	add	x0, x23, #0x8
102ce8a50:     	bl	0x10001022c
102ce8a54:     	cbnz	x26, 0x102ce8c18
102ce8a58:     	ldr	w8, [x20, #0x10]
102ce8a5c:     	mov	x24, x25
102ce8a60:     	tbz	w8, #0x9, 0x102ce8aac
102ce8a64:     	cbz	w22, 0x102ce8aac
102ce8a68:     	add	x22, sp, #0x20
102ce8a6c:     	add	x8, sp, #0x20
102ce8a70:     	mov	x0, x21
102ce8a74:     	mov	x1, x20
102ce8a78:     	bl	0x102ce7078
102ce8a7c:     	add	x8, sp, #0x40
102ce8a80:     	ldp	x25, x23, [sp, #0x20]
102ce8a84:     	stp	xzr, xzr, [sp, #0x20]
102ce8a88:     	stp	x25, x23, [x19]
102ce8a8c:     	stp	xzr, x24, [sp, #0x40]
102ce8a90:     	add	x0, x8, #0x8
102ce8a94:     	bl	0x10001022c
102ce8a98:     	add	x0, x22, #0x8
102ce8a9c:     	bl	0x10001022c
102ce8aa0:     	cbnz	x25, 0x102ce8c18
102ce8aa4:     	ldr	w8, [x20, #0x10]
102ce8aa8:     	mov	x24, x23
102ce8aac:     	tbz	w8, #0xc, 0x102ce8c18
102ce8ab0:     	add	x22, sp, #0x20
102ce8ab4:     	add	x8, sp, #0x20
102ce8ab8:     	mov	x0, x21
102ce8abc:     	mov	x1, x20
102ce8ac0:     	bl	0x102cf9f70
102ce8ac4:     	add	x8, sp, #0x40
102ce8ac8:     	ldr	q0, [sp, #0x20]
102ce8acc:     	stp	xzr, xzr, [sp, #0x20]
102ce8ad0:     	str	q0, [x19]
102ce8ad4:     	stp	xzr, x24, [sp, #0x40]
102ce8ad8:     	add	x0, x8, #0x8
102ce8adc:     	bl	0x10001022c
102ce8ae0:     	orr	x0, x22, #0x8
102ce8ae4:     	bl	0x10001022c
102ce8ae8:     	b	0x102ce8c18
102ce8aec:     	add	x26, sp, #0x20
102ce8af0:     	add	x8, sp, #0x20
102ce8af4:     	mov	x0, x21
102ce8af8:     	mov	x1, x20
102ce8afc:     	bl	0x102cef024
102ce8b00:     	add	x8, sp, #0x40
102ce8b04:     	ldp	x27, x25, [sp, #0x20]
102ce8b08:     	stp	xzr, xzr, [sp, #0x20]
102ce8b0c:     	stp	x27, x25, [x19]
102ce8b10:     	stp	xzr, x24, [sp, #0x40]
102ce8b14:     	add	x0, x8, #0x8
102ce8b18:     	bl	0x10001022c
102ce8b1c:     	add	x0, x26, #0x8
102ce8b20:     	bl	0x10001022c
102ce8b24:     	cbnz	x27, 0x102ce8c18
102ce8b28:     	add	x26, sp, #0x20
102ce8b2c:     	add	x8, sp, #0x20
102ce8b30:     	mov	x0, x21
102ce8b34:     	mov	x1, x20
102ce8b38:     	bl	0x102cec674
102ce8b3c:     	add	x8, sp, #0x40
102ce8b40:     	ldp	x27, x24, [sp, #0x20]
102ce8b44:     	stp	xzr, xzr, [sp, #0x20]
102ce8b48:     	stp	x27, x24, [x19]
102ce8b4c:     	stp	xzr, x25, [sp, #0x40]
102ce8b50:     	add	x0, x8, #0x8
102ce8b54:     	bl	0x10001022c
102ce8b58:     	add	x0, x26, #0x8
102ce8b5c:     	bl	0x10001022c
102ce8b60:     	cbnz	x27, 0x102ce8c18
102ce8b64:     	add	x26, sp, #0x20
102ce8b68:     	add	x8, sp, #0x20
102ce8b6c:     	mov	x0, x21
102ce8b70:     	mov	x1, x20
102ce8b74:     	bl	0x102ceda80
102ce8b78:     	add	x8, sp, #0x40
102ce8b7c:     	ldp	x27, x25, [sp, #0x20]
102ce8b80:     	stp	xzr, xzr, [sp, #0x20]
102ce8b84:     	stp	x27, x25, [x19]
102ce8b88:     	stp	xzr, x24, [sp, #0x40]
102ce8b8c:     	add	x0, x8, #0x8
102ce8b90:     	bl	0x10001022c
102ce8b94:     	add	x0, x26, #0x8
102ce8b98:     	bl	0x10001022c
102ce8b9c:     	cbnz	x27, 0x102ce8c18
102ce8ba0:     	add	x24, sp, #0x20
102ce8ba4:     	add	x8, sp, #0x20
102ce8ba8:     	mov	x0, x21
102ce8bac:     	mov	x1, x20
102ce8bb0:     	bl	0x102ceb708
102ce8bb4:     	add	x8, sp, #0x40
102ce8bb8:     	ldp	x27, x26, [sp, #0x20]
102ce8bbc:     	stp	xzr, xzr, [sp, #0x20]
102ce8bc0:     	stp	x27, x26, [x19]
102ce8bc4:     	stp	xzr, x25, [sp, #0x40]
102ce8bc8:     	add	x0, x8, #0x8
102ce8bcc:     	bl	0x10001022c
102ce8bd0:     	add	x0, x24, #0x8
102ce8bd4:     	bl	0x10001022c
102ce8bd8:     	cbnz	x27, 0x102ce8c18
102ce8bdc:     	add	x25, sp, #0x20
102ce8be0:     	add	x8, sp, #0x20
102ce8be4:     	mov	x0, x21
102ce8be8:     	mov	x1, x20
102ce8bec:     	bl	0x102ceac70
102ce8bf0:     	add	x8, sp, #0x40
102ce8bf4:     	ldp	x27, x24, [sp, #0x20]
102ce8bf8:     	stp	xzr, xzr, [sp, #0x20]
102ce8bfc:     	stp	x27, x24, [x19]
102ce8c00:     	stp	xzr, x26, [sp, #0x40]
102ce8c04:     	add	x0, x8, #0x8
102ce8c08:     	bl	0x10001022c
102ce8c0c:     	add	x0, x25, #0x8
102ce8c10:     	bl	0x10001022c
102ce8c14:     	cbz	x27, 0x102ce8c38
102ce8c18:     	ldp	x29, x30, [sp, #0xa0]
102ce8c1c:     	ldp	x20, x19, [sp, #0x90]
102ce8c20:     	ldp	x22, x21, [sp, #0x80]
102ce8c24:     	ldp	x24, x23, [sp, #0x70]
102ce8c28:     	ldp	x26, x25, [sp, #0x60]
102ce8c2c:     	ldp	x28, x27, [sp, #0x50]
102ce8c30:     	add	sp, sp, #0xb0
102ce8c34:     	ret
102ce8c38:     	ldr	w8, [x20, #0x10]
102ce8c3c:     	b	0x102ce8a08
102ce8c40:     	b	0x102ce8c64
102ce8c44:     	b	0x102ce8c64
102ce8c48:     	b	0x102ce8c64
102ce8c4c:     	b	0x102ce8c64
102ce8c50:     	b	0x102ce8c64
102ce8c54:     	b	0x102ce8c64
102ce8c58:     	b	0x102ce8c64
102ce8c5c:     	b	0x102ce8c64
102ce8c60:     	b	0x102ce8c64
102ce8c64:     	mov	x20, x0
102ce8c68:     	b	0x102ce8c90
102ce8c6c:     	mov	x20, x0
102ce8c70:     	add	x0, x23, #0x8
102ce8c74:     	b	0x102ce8c8c
102ce8c78:     	mov	x20, x0
102ce8c7c:     	add	x0, x25, #0x8
102ce8c80:     	b	0x102ce8c8c
102ce8c84:     	mov	x20, x0
102ce8c88:     	add	x0, x22, #0x8
102ce8c8c:     	bl	0x10001022c
102ce8c90:     	add	x0, x19, #0x8
102ce8c94:     	bl	0x10001022c
102ce8c98:     	mov	x0, x20
102ce8c9c:     	bl	0x103bda970

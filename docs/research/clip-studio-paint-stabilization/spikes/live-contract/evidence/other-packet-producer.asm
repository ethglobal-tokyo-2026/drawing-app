
FUNCTION 0x103201a20 size 320
103201a20:     	sub	sp, sp, #0x80
103201a24:     	stp	x20, x19, [sp, #0x60]
103201a28:     	stp	x29, x30, [sp, #0x70]
103201a2c:     	add	x29, sp, #0x70
103201a30:     	mov	x20, x1
103201a34:     	mov	x19, x0
103201a38:     	ldr	w8, [x0, #0x4]
103201a3c:     	ldr	d0, [x1, #0x20]
103201a40:     	fcmp	d0, #0.0
103201a44:     	cbz	w8, 0x103201a7c
103201a48:     	b.gt	0x103201a84
103201a4c:     	str	wzr, [x19, #0x4]
103201a50:     	ldr	w8, [x20, #0x40]
103201a54:     	sub	w9, w8, #0x1
103201a58:     	cmp	w9, #0x2
103201a5c:     	b.hs	0x103201b20
103201a60:     	mov	x0, x19
103201a64:     	mov	w1, #0x6                ; =6
103201a68:     	mov	x2, x20
103201a6c:     	mov	w3, #0x0                ; =0
103201a70:     	bl	0x103201c34
103201a74:     	str	wzr, [x19, #0x8]
103201a78:     	b	0x103201b50
103201a7c:     	b.gt	0x103201aa4
103201a80:     	str	wzr, [x19, #0x10]
103201a84:     	mov	x0, x19
103201a88:     	mov	w1, #0x1                ; =1
103201a8c:     	mov	x2, x20
103201a90:     	mov	w3, #0x0                ; =0
103201a94:     	ldp	x29, x30, [sp, #0x70]
103201a98:     	ldp	x20, x19, [sp, #0x60]
103201a9c:     	add	sp, sp, #0x80
103201aa0:     	b	0x103201c34
103201aa4:     	ldr	w8, [x19, #0x10]
103201aa8:     	cbz	w8, 0x103201ae0
103201aac:     	bl	0x102194e64
103201ab0:     	cmp	w0, #0x1
103201ab4:     	b.ne	0x103201adc
103201ab8:     	ldp	q0, q1, [x20, #0x20]
103201abc:     	stp	q0, q1, [sp, #0x20]
103201ac0:     	ldp	q0, q1, [x20, #0x40]
103201ac4:     	stp	q0, q1, [sp, #0x40]
103201ac8:     	ldp	q0, q1, [x20]
103201acc:     	stp	q0, q1, [sp]
103201ad0:     	str	xzr, [sp, #0x20]
103201ad4:     	mov	x1, sp
103201ad8:     	bl	0x1021f0b1c
103201adc:     	str	wzr, [x19, #0x10]
103201ae0:     	mov	w8, #0x1                ; =1
103201ae4:     	str	w8, [x19, #0x4]
103201ae8:     	ldr	w8, [x20, #0x40]
103201aec:     	sub	w9, w8, #0x1
103201af0:     	cmp	w9, #0x2
103201af4:     	b.hs	0x103201b34
103201af8:     	mov	x0, x19
103201afc:     	mov	w1, #0x4                ; =4
103201b00:     	mov	x2, x20
103201b04:     	mov	w3, #0x0                ; =0
103201b08:     	bl	0x103201c34
103201b0c:     	bl	0x1020be3f4
103201b10:     	cmp	w0, #0x0
103201b14:     	cset	w8, eq
103201b18:     	str	w8, [x19, #0x8]
103201b1c:     	b	0x103201b50
103201b20:     	cmp	w8, #0x3
103201b24:     	b.ne	0x103201b50
103201b28:     	mov	x0, x19
103201b2c:     	mov	w1, #0x9                ; =9
103201b30:     	b	0x103201a8c
103201b34:     	cmp	w8, #0x3
103201b38:     	b.ne	0x103201b50
103201b3c:     	mov	x0, x19
103201b40:     	mov	w1, #0x7                ; =7
103201b44:     	mov	x2, x20
103201b48:     	mov	w3, #0x0                ; =0
103201b4c:     	bl	0x103201c34
103201b50:     	ldp	x29, x30, [sp, #0x70]
103201b54:     	ldp	x20, x19, [sp, #0x60]
103201b58:     	add	sp, sp, #0x80
103201b5c:     	ret

FUNCTION 0x103201b60 size 64
103201b60:     	ldr	w8, [x0]
103201b64:     	cbz	w8, 0x103201b6c
103201b68:     	ret
103201b6c:     	stp	x20, x19, [sp, #-0x20]!
103201b70:     	stp	x29, x30, [sp, #0x10]
103201b74:     	add	x29, sp, #0x10
103201b78:     	mov	x19, x1
103201b7c:     	mov	w8, #0x1                ; =1
103201b80:     	str	w8, [x0]
103201b84:     	str	w8, [x0, #0x10]
103201b88:     	bl	0x1020be3f4
103201b8c:     	mov	w0, #0x2                ; =2
103201b90:     	mov	x1, x19
103201b94:     	ldp	x29, x30, [sp, #0x10]
103201b98:     	ldp	x20, x19, [sp], #0x20
103201b9c:     	b	0x1021f0b1c

FUNCTION 0x103201ba0 size 92
103201ba0:     	ldr	w8, [x0]
103201ba4:     	cbz	w8, 0x103201bf0
103201ba8:     	stp	x20, x19, [sp, #-0x20]!
103201bac:     	stp	x29, x30, [sp, #0x10]
103201bb0:     	add	x29, sp, #0x10
103201bb4:     	mov	x19, x1
103201bb8:     	mov	x20, x0
103201bbc:     	bl	0x1020be2ec
103201bc0:     	cbnz	w0, 0x103201bcc
103201bc4:     	bl	0x1020be300
103201bc8:     	cbz	w0, 0x103201bf4
103201bcc:     	str	wzr, [x20, #0x4]
103201bd0:     	str	wzr, [x20]
103201bd4:     	str	wzr, [x20, #0x10]
103201bd8:     	bl	0x1020be3f4
103201bdc:     	mov	w0, #0x3                ; =3
103201be0:     	mov	x1, x19
103201be4:     	ldp	x29, x30, [sp, #0x10]
103201be8:     	ldp	x20, x19, [sp], #0x20
103201bec:     	b	0x1021f0b1c
103201bf0:     	ret
103201bf4:     	bl	0x1020be2d8
103201bf8:     	b	0x103201bd0

FUNCTION 0x103201bfc size 56
103201bfc:     	stp	x20, x19, [sp, #-0x20]!
103201c00:     	stp	x29, x30, [sp, #0x10]
103201c04:     	add	x29, sp, #0x10
103201c08:     	mov	x19, x1
103201c0c:     	bl	0x1020be2d8
103201c10:     	cbz	w0, 0x103201c28
103201c14:     	cmp	w19, #0x0
103201c18:     	cset	w0, ne
103201c1c:     	ldp	x29, x30, [sp, #0x10]
103201c20:     	ldp	x20, x19, [sp], #0x20
103201c24:     	b	0x1020be4f8
103201c28:     	ldp	x29, x30, [sp, #0x10]
103201c2c:     	ldp	x20, x19, [sp], #0x20
103201c30:     	ret

FUNCTION 0x103201c34 size 124
103201c34:     	stp	x22, x21, [sp, #-0x30]!
103201c38:     	stp	x20, x19, [sp, #0x10]
103201c3c:     	stp	x29, x30, [sp, #0x20]
103201c40:     	add	x29, sp, #0x20
103201c44:     	mov	x19, x2
103201c48:     	mov	x20, x1
103201c4c:     	cbz	w3, 0x103201c68
103201c50:     	mov	x0, x20
103201c54:     	mov	x1, x19
103201c58:     	ldp	x29, x30, [sp, #0x20]
103201c5c:     	ldp	x20, x19, [sp, #0x10]
103201c60:     	ldp	x22, x21, [sp], #0x30
103201c64:     	b	0x1021f0b1c
103201c68:     	mov	x21, x0
103201c6c:     	bl	0x1020be3f4

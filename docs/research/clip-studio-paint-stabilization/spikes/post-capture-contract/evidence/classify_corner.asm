
FUNCTION 0x102787bb0 size 236
102787bb0:     	sub	sp, sp, #0x70
102787bb4:     	stp	d9, d8, [sp, #0x30]
102787bb8:     	stp	x22, x21, [sp, #0x40]
102787bbc:     	stp	x20, x19, [sp, #0x50]
102787bc0:     	stp	x29, x30, [sp, #0x60]
102787bc4:     	add	x29, sp, #0x60
102787bc8:     	ldr	d0, [x0, #0x50]
102787bcc:     	ldr	x8, [x0, #0x40]
102787bd0:     	ldr	x8, [x8, #0x30]
102787bd4:     	ldur	q1, [x8, #0x8]
102787bd8:     	str	q1, [sp, #0x20]
102787bdc:     	ldr	x20, [x8, #0x28]
102787be0:     	cbz	x20, 0x102787c84
102787be4:     	ldur	q1, [x20, #0x8]
102787be8:     	str	q1, [sp, #0x10]
102787bec:     	ldr	x8, [x20, #0x28]
102787bf0:     	cbz	x8, 0x102787c84
102787bf4:     	mov	x19, x0
102787bf8:     	adrp	x9, 0x1042fd000
102787bfc:     	ldr	d1, [x9, #0xfd0]
102787c00:     	fmul	d8, d0, d1
102787c04:     	mov	w21, #-0x44             ; =-68
102787c08:     	mov	x22, x20
102787c0c:     	mov	x20, x8
102787c10:     	ldur	q0, [x8, #0x8]
102787c14:     	str	q0, [sp]
102787c18:     	ldrb	w8, [x22, #0x40]
102787c1c:     	tbnz	w8, #0x2, 0x102787c58
102787c20:     	ldr	w8, [x19, #0x30]
102787c24:     	cbz	w8, 0x102787c6c
102787c28:     	ldr	d1, [x19, #0x68]
102787c2c:     	add	x0, sp, #0x20
102787c30:     	add	x1, sp, #0x10
102787c34:     	mov	x2, sp
102787c38:     	fmov	d0, d8
102787c3c:     	bl	0x1027878ec
102787c40:     	ldr	w8, [x22, #0x40]
102787c44:     	and	w9, w8, w21
102787c48:     	orr	w8, w8, #0x1
102787c4c:     	cmp	w0, #0x0
102787c50:     	csel	w8, w9, w8, eq
102787c54:     	str	w8, [x22, #0x40]
102787c58:     	ldp	q0, q1, [sp]
102787c5c:     	stp	q0, q1, [sp, #0x10]
102787c60:     	ldr	x8, [x20, #0x28]
102787c64:     	cbnz	x8, 0x102787c08
102787c68:     	b	0x102787c84
102787c6c:     	ldr	x0, [x19, #0x20]
102787c70:     	cbz	x0, 0x102787c58
102787c74:     	add	x1, sp, #0x10
102787c78:     	bl	0x102770e78
102787c7c:     	cbnz	w0, 0x102787c28
102787c80:     	b	0x102787c58
102787c84:     	ldp	x29, x30, [sp, #0x60]
102787c88:     	ldp	x20, x19, [sp, #0x50]
102787c8c:     	ldp	x22, x21, [sp, #0x40]
102787c90:     	ldp	d9, d8, [sp, #0x30]
102787c94:     	add	sp, sp, #0x70
102787c98:     	ret

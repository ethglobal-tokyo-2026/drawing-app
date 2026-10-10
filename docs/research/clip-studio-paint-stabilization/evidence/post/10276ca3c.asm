10276ca3c:     	sub	sp, sp, #0x20
10276ca40:     	stp	x29, x30, [sp, #0x10]
10276ca44:     	add	x29, sp, #0x10
10276ca48:     	mov	x3, x2
10276ca4c:     	mov	x4, x1
10276ca50:     	mov	w8, #0x1                ; =1
10276ca54:     	stur	w8, [x29, #-0x4]
10276ca58:     	ldr	x1, [x0, #0x28]
10276ca5c:     	cbz	x1, 0x10276ca80
10276ca60:     	ldr	x8, [x0]
10276ca64:     	ldr	x8, [x8, #0xf8]
10276ca68:     	movi	d1, #0000000000000000
10276ca6c:     	fmov	d2, #1.00000000
10276ca70:     	sub	x5, x29, #0x4
10276ca74:     	mov	w2, #0x0                ; =0
10276ca78:     	blr	x8
10276ca7c:     	b	0x10276caa0
10276ca80:     	ldr	x8, [x0, #0x38]
10276ca84:     	ldrb	w9, [x8, #0x21]
10276ca88:     	tbz	w9, #0x0, 0x10276ca94
10276ca8c:     	ldr	x1, [x8, #0x30]
10276ca90:     	cbnz	x1, 0x10276ca60
10276ca94:     	ldur	q0, [x0, #0x8]
10276ca98:     	str	q0, [x4]
10276ca9c:     	mov	w0, #0x1                ; =1
10276caa0:     	ldp	x29, x30, [sp, #0x10]
10276caa4:     	add	sp, sp, #0x20
10276caa8:     	ret
10276caac:     	sub	sp, sp, #0x20
10276cab0:     	stp	x29, x30, [sp, #0x10]
10276cab4:     	add	x29, sp, #0x10
10276cab8:     	mov	x3, x2
10276cabc:     	mov	x4, x1
10276cac0:     	mov	w8, #0x1                ; =1
10276cac4:     	stur	w8, [x29, #-0x4]
10276cac8:     	ldr	x1, [x0, #0x28]
10276cacc:     	cbz	x1, 0x10276cae8
10276cad0:     	ldr	x8, [x0]
10276cad4:     	ldr	x8, [x8, #0xf8]
10276cad8:     	sub	x5, x29, #0x4
10276cadc:     	mov	w2, #0x0                ; =0
10276cae0:     	blr	x8
10276cae4:     	b	0x10276cb08
10276cae8:     	ldr	x8, [x0, #0x38]
10276caec:     	ldrb	w9, [x8, #0x21]
10276caf0:     	tbz	w9, #0x0, 0x10276cafc
10276caf4:     	ldr	x1, [x8, #0x30]
10276caf8:     	cbnz	x1, 0x10276cad0
10276cafc:     	ldur	q0, [x0, #0x8]
10276cb00:     	str	q0, [x4]
10276cb04:     	mov	w0, #0x1                ; =1
10276cb08:     	ldp	x29, x30, [sp, #0x10]
10276cb0c:     	add	sp, sp, #0x20
10276cb10:     	ret
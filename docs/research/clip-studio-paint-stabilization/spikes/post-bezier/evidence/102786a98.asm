
FUNCTION 0x102786a98 size 228
102786a98:     	sub	sp, sp, #0xa0
102786a9c:     	stp	x20, x19, [sp, #0x80]
102786aa0:     	stp	x29, x30, [sp, #0x90]
102786aa4:     	add	x29, sp, #0x90
102786aa8:     	mov	x19, x1
102786aac:     	ldp	d0, d1, [x1, #0x8]
102786ab0:     	stp	xzr, xzr, [x29, #-0x20]
102786ab4:     	ldr	d2, [x0, #0x18]
102786ab8:     	fmov	d3, #10.00000000
102786abc:     	fmul	d2, d2, d3
102786ac0:     	stur	d2, [x29, #-0x28]
102786ac4:     	stp	xzr, xzr, [x29, #-0x38]
102786ac8:     	ldr	x0, [x0, #0x8]
102786acc:     	sub	x1, x29, #0x28
102786ad0:     	sub	x2, x29, #0x20
102786ad4:     	sub	x3, x29, #0x30
102786ad8:     	sub	x4, x29, #0x38
102786adc:     	bl	0x102782054
102786ae0:     	cbz	w0, 0x102786b6c
102786ae4:     	ldur	x0, [x29, #-0x30]
102786ae8:     	ldur	d0, [x29, #-0x38]
102786aec:     	fmov	d1, #1.00000000
102786af0:     	bl	0x10276dec8
102786af4:     	cbz	x0, 0x102786b30
102786af8:     	mov	x20, x0
102786afc:     	mov	x1, sp
102786b00:     	mov	x0, x19
102786b04:     	bl	0x10276b138
102786b08:     	ldur	q0, [x20, #0x8]
102786b0c:     	str	q0, [sp]
102786b10:     	mov	x1, sp
102786b14:     	mov	x0, x20
102786b18:     	bl	0x10276b190
102786b1c:     	mov	x0, x20
102786b20:     	bl	0x10276b2c4
102786b24:     	ldur	x0, [x29, #-0x30]
102786b28:     	bl	0x10276b2c4
102786b2c:     	b	0x102786b68
102786b30:     	ldur	x8, [x29, #-0x30]
102786b34:     	ldr	x9, [x8, #0x28]
102786b38:     	ldur	d0, [x29, #-0x38]
102786b3c:     	fmov	d1, #0.50000000
102786b40:     	fcmp	d0, d1
102786b44:     	ccmp	x9, #0x0, #0x4, gt
102786b48:     	csel	x8, x9, x8, ne
102786b4c:     	ldr	s0, [x19, #0x44]
102786b50:     	ldr	s1, [x8, #0x44]
102786b54:     	fcmp	s0, s1
102786b58:     	b.gt	0x102786b64
102786b5c:     	mov	w0, #0x0                ; =0
102786b60:     	b	0x102786b6c
102786b64:     	str	s0, [x8, #0x44]
102786b68:     	mov	w0, #0x1                ; =1
102786b6c:     	ldp	x29, x30, [sp, #0x90]
102786b70:     	ldp	x20, x19, [sp, #0x80]
102786b74:     	add	sp, sp, #0xa0
102786b78:     	ret

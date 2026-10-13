
FUNCTION 0x10359de0c size 504
10359de0c:     	sub	sp, sp, #0x80
10359de10:     	stp	d11, d10, [sp, #0x50]
10359de14:     	stp	d9, d8, [sp, #0x60]
10359de18:     	stp	x29, x30, [sp, #0x70]
10359de1c:     	add	x29, sp, #0x70
10359de20:     	fmov	d8, d0
10359de24:     	adrp	x8, 0x1048c8000
10359de28:     	ldr	x8, [x8, #0x4d0]
10359de2c:     	ldr	x8, [x8]
10359de30:     	stur	x8, [x29, #-0x28]
10359de34:     	subs	w10, w0, #0x2
10359de38:     	b.ne	0x10359de74
10359de3c:     	ldp	d0, d1, [x1]
10359de40:     	ldp	d2, d3, [x1, #0x10]
10359de44:     	ldur	x8, [x29, #-0x28]
10359de48:     	adrp	x9, 0x1048c8000
10359de4c:     	ldr	x9, [x9, #0x4d0]
10359de50:     	ldr	x9, [x9]
10359de54:     	cmp	x9, x8
10359de58:     	b.ne	0x10359e000
10359de5c:     	fmov	d4, d8
10359de60:     	ldp	x29, x30, [sp, #0x70]
10359de64:     	ldp	d9, d8, [sp, #0x60]
10359de68:     	ldp	d11, d10, [sp, #0x50]
10359de6c:     	add	sp, sp, #0x80
10359de70:     	b	0x10219455c
10359de74:     	movi	d0, #0000000000000000
10359de78:     	b.lt	0x10359dfa4
10359de7c:     	subs	w8, w0, #0x3
10359de80:     	b.ne	0x10359de94
10359de84:     	ldr	q0, [x1]
10359de88:     	ldp	d2, d3, [x1, #0x10]
10359de8c:     	ldr	q4, [x1, #0x20]
10359de90:     	b	0x10359df60
10359de94:     	ldr	d2, [x1, #0x10]
10359de98:     	fcmp	d2, d8
10359de9c:     	b.le	0x10359dec4
10359dea0:     	ldr	q0, [x1]
10359dea4:     	ldr	d3, [x1, #0x18]
10359dea8:     	ldr	q4, [x1, #0x20]
10359deac:     	mov.16b	v1, v2
10359deb0:     	mov.d	v1[1], v3[0]
10359deb4:     	fadd.2d	v4, v1, v4
10359deb8:     	fmov.2d	v1, #0.50000000
10359debc:     	fmul.2d	v4, v4, v1
10359dec0:     	b	0x10359df60
10359dec4:     	add	x9, x1, w10, uxtw #4
10359dec8:     	ldr	d2, [x9]
10359decc:     	fcmp	d2, d8
10359ded0:     	b.ls	0x10359df3c
10359ded4:     	mov	x9, #0x0                ; =0
10359ded8:     	sub	x11, x10, #0x1
10359dedc:     	add	x10, x1, #0x20
10359dee0:     	cmp	x11, x9
10359dee4:     	b.eq	0x10359df60
10359dee8:     	ldr	d2, [x10], #0x10
10359deec:     	add	x9, x9, #0x1
10359def0:     	fcmp	d2, d8
10359def4:     	b.le	0x10359dee0
10359def8:     	add	x11, x1, w9, uxtw #4
10359defc:     	ldur	d3, [x10, #-0x8]
10359df00:     	ldr	q6, [x11]
10359df04:     	mov.16b	v4, v2
10359df08:     	mov.d	v4[1], v3[0]
10359df0c:     	fadd.2d	v5, v4, v6
10359df10:     	fmov.2d	v1, #0.50000000
10359df14:     	fmul.2d	v0, v5, v1
10359df18:     	fcmp	d0, d8
10359df1c:     	b.le	0x10359dfd0
10359df20:     	cmp	x9, #0x2
10359df24:     	b.lo	0x10359dfe4
10359df28:     	ldur	q2, [x11, #-0x10]
10359df2c:     	fadd.2d	v2, v6, v2
10359df30:     	mov.16b	v4, v0
10359df34:     	fmul.2d	v0, v2, v1
10359df38:     	b	0x10359dfec
10359df3c:     	add	x8, x1, w0, uxtw #4
10359df40:     	ldr	d3, [x9, #0x8]
10359df44:     	ldur	q0, [x8, #-0x30]
10359df48:     	mov.16b	v1, v2
10359df4c:     	mov.d	v1[1], v3[0]
10359df50:     	fadd.2d	v0, v1, v0
10359df54:     	fmov.2d	v1, #0.50000000
10359df58:     	fmul.2d	v0, v0, v1
10359df5c:     	ldur	q4, [x8, #-0x10]
10359df60:     	stp	q0, q4, [sp]
10359df64:     	mov	d9, v0[1]
10359df68:     	mov	d10, v4[1]
10359df6c:     	add	x0, sp, #0x38
10359df70:     	add	x1, sp, #0x28
10359df74:     	fmov	d1, d9
10359df78:     	fmov	d5, d10
10359df7c:     	fmov	d6, d8
10359df80:     	bl	0x10359cf18
10359df84:     	cbz	w0, 0x10359df90
10359df88:     	ldr	d0, [sp, #0x38]
10359df8c:     	b	0x10359dfa4
10359df90:     	ldp	q0, q2, [sp]
10359df94:     	fmov	d1, d9
10359df98:     	fmov	d3, d10
10359df9c:     	fmov	d4, d8
10359dfa0:     	bl	0x10219455c
10359dfa4:     	ldur	x8, [x29, #-0x28]
10359dfa8:     	adrp	x9, 0x1048c8000
10359dfac:     	ldr	x9, [x9, #0x4d0]
10359dfb0:     	ldr	x9, [x9]
10359dfb4:     	cmp	x9, x8
10359dfb8:     	b.ne	0x10359e000
10359dfbc:     	ldp	x29, x30, [sp, #0x70]
10359dfc0:     	ldp	d9, d8, [sp, #0x60]
10359dfc4:     	ldp	d11, d10, [sp, #0x50]
10359dfc8:     	add	sp, sp, #0x80
10359dfcc:     	ret
10359dfd0:     	cmp	w8, w9
10359dfd4:     	b.le	0x10359dff8
10359dfd8:     	ldr	q5, [x11, #0x20]
10359dfdc:     	fadd.2d	v4, v4, v5
10359dfe0:     	b	0x10359debc
10359dfe4:     	mov.16b	v4, v0
10359dfe8:     	ldr	q0, [x1]
10359dfec:     	mov	d3, v6[1]
10359dff0:     	fmov	d2, d6
10359dff4:     	b	0x10359df60
10359dff8:     	add	x8, x1, w0, uxtw #4
10359dffc:     	b	0x10359df5c
10359e000:     	bl	0x103bdd4d8

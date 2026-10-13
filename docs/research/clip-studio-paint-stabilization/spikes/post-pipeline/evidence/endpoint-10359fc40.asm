
FUNCTION 0x10359fc40 size 228
10359fc40:     	sub	sp, sp, #0xa0
10359fc44:     	stp	d15, d14, [sp, #0x40]
10359fc48:     	stp	d13, d12, [sp, #0x50]
10359fc4c:     	stp	d11, d10, [sp, #0x60]
10359fc50:     	stp	d9, d8, [sp, #0x70]
10359fc54:     	stp	x20, x19, [sp, #0x80]
10359fc58:     	stp	x29, x30, [sp, #0x90]
10359fc5c:     	add	x29, sp, #0x90
10359fc60:     	mov	x19, x0
10359fc64:     	fmov	d12, d3
10359fc68:     	fmov	d13, d2
10359fc6c:     	fmov	d14, d1
10359fc70:     	fmov	d15, d0
10359fc74:     	ldp	d10, d8, [x29, #0x20]
10359fc78:     	ldp	d11, d9, [x29, #0x10]
10359fc7c:     	stp	d10, d8, [sp, #0x10]
10359fc80:     	stp	d11, d9, [sp]
10359fc84:     	stp	d4, d5, [sp, #0x20]
10359fc88:     	stp	d6, d7, [sp, #0x30]
10359fc8c:     	bl	0x10359fd24
10359fc90:     	cmp	w19, #0x0
10359fc94:     	fmov	d1, #0.50000000
10359fc98:     	fmov	d2, #4.00000000
10359fc9c:     	fcsel	d1, d2, d1, eq
10359fca0:     	fdiv	d1, d0, d1
10359fca4:     	fcvtzs	w8, d1
10359fca8:     	cmp	w8, #0x5
10359fcac:     	b.ge	0x10359fcd0
10359fcb0:     	ldp	x29, x30, [sp, #0x90]
10359fcb4:     	ldp	x20, x19, [sp, #0x80]
10359fcb8:     	ldp	d9, d8, [sp, #0x70]
10359fcbc:     	ldp	d11, d10, [sp, #0x60]
10359fcc0:     	ldp	d13, d12, [sp, #0x50]
10359fcc4:     	ldp	d15, d14, [sp, #0x40]
10359fcc8:     	add	sp, sp, #0xa0
10359fccc:     	ret
10359fcd0:     	mov	w9, #0xff               ; =255
10359fcd4:     	cmp	w8, #0xff
10359fcd8:     	csel	w9, w8, w9, lo
10359fcdc:     	cmp	w19, #0x0
10359fce0:     	csel	w0, w9, w8, eq
10359fce4:     	stp	d10, d8, [x29, #0x20]
10359fce8:     	stp	d11, d9, [x29, #0x10]
10359fcec:     	fmov	d0, d15
10359fcf0:     	fmov	d1, d14
10359fcf4:     	fmov	d2, d13
10359fcf8:     	fmov	d3, d12
10359fcfc:     	ldp	d4, d5, [sp, #0x20]
10359fd00:     	ldp	d6, d7, [sp, #0x30]
10359fd04:     	ldp	x29, x30, [sp, #0x90]
10359fd08:     	ldp	x20, x19, [sp, #0x80]
10359fd0c:     	ldp	d9, d8, [sp, #0x70]
10359fd10:     	ldp	d11, d10, [sp, #0x60]
10359fd14:     	ldp	d13, d12, [sp, #0x50]
10359fd18:     	ldp	d15, d14, [sp, #0x40]
10359fd1c:     	add	sp, sp, #0xa0
10359fd20:     	b	0x10359fe88

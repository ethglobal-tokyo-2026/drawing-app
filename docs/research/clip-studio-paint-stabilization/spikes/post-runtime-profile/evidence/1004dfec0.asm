
FUNCTION 0x1004dfec0 size 188
1004dfec0:     	ldp	x8, x10, [x0]
1004dfec4:     	sdiv	x12, x8, x10
1004dfec8:     	msub	x8, x12, x10, x8
1004dfecc:     	ldp	x9, x11, [x1]
1004dfed0:     	sdiv	x13, x9, x11
1004dfed4:     	msub	x9, x13, x11, x9
1004dfed8:     	tbz	x8, #0x3f, 0x1004dfee8
1004dfedc:     	add	x8, x8, x10
1004dfee0:     	sub	x12, x12, #0x1
1004dfee4:     	tbnz	x8, #0x3f, 0x1004dfedc
1004dfee8:     	tbz	x9, #0x3f, 0x1004dfef8
1004dfeec:     	add	x9, x9, x11
1004dfef0:     	sub	x13, x13, #0x1
1004dfef4:     	tbnz	x9, #0x3f, 0x1004dfeec
1004dfef8:     	cmp	x12, x13
1004dfefc:     	b.ne	0x1004dff54
1004dff00:     	mov	w13, #0x0               ; =0
1004dff04:     	mov	x12, x13
1004dff08:     	cbz	x8, 0x1004dff5c
1004dff0c:     	cbz	x9, 0x1004dff5c
1004dff10:     	eor	w13, w12, #0x1
1004dff14:     	sdiv	x14, x10, x8
1004dff18:     	msub	x15, x14, x8, x10
1004dff1c:     	sdiv	x16, x11, x9
1004dff20:     	msub	x10, x16, x9, x11
1004dff24:     	mov	x11, x9
1004dff28:     	mov	x9, x10
1004dff2c:     	mov	x10, x8
1004dff30:     	mov	x8, x15
1004dff34:     	cmp	x14, x16
1004dff38:     	b.eq	0x1004dff04
1004dff3c:     	cset	w0, gt
1004dff40:     	cset	w8, lt
1004dff44:     	cmp	w12, #0x1
1004dff48:     	b.ne	0x1004dff78
1004dff4c:     	mov	x0, x8
1004dff50:     	ret
1004dff54:     	cset	w0, lt
1004dff58:     	ret
1004dff5c:     	cmp	x8, #0x0
1004dff60:     	cset	w10, ne
1004dff64:     	cmp	w12, #0x1
1004dff68:     	cset	w11, ne
1004dff6c:     	eor	w10, w10, w11
1004dff70:     	cmp	x8, x9
1004dff74:     	csel	w0, wzr, w10, eq
1004dff78:     	ret

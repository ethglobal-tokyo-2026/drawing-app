102217d1c:     	adrp	x8, 0x104488000
102217d20:     	ldr	s2, [x8, #0x3c4]
102217d24:     	fadd	s2, s1, s2
102217d28:     	adrp	x8, 0x104300000
102217d2c:     	ldr	s3, [x8, #0xe8]
102217d30:     	fadd	s3, s1, s3
102217d34:     	fcmp	s3, s0
102217d38:     	fccmp	s2, s0, #0x2, ge
102217d3c:     	cset	w8, ls
102217d40:     	fcmp	s0, s1
102217d44:     	cset	w9, gt
102217d48:     	orr	w0, w9, w8
102217d4c:     	ret
102217d50:     	adrp	x8, 0x104488000
102217d54:     	ldr	s2, [x8, #0x3c4]
102217d58:     	fadd	s2, s1, s2
102217d5c:     	adrp	x8, 0x104300000
102217d60:     	ldr	s3, [x8, #0xe8]
102217d64:     	fadd	s3, s1, s3
102217d68:     	fcmp	s3, s0
102217d6c:     	fccmp	s2, s0, #0x2, ge
102217d70:     	fccmp	s0, s1, #0x0, hi
102217d74:     	cset	w0, mi
102217d78:     	ret
102217d7c:     	adrp	x8, 0x104488000
102217d80:     	ldr	s2, [x8, #0x3c4]
102217d84:     	fadd	s2, s1, s2
102217d88:     	adrp	x8, 0x104300000
102217d8c:     	ldr	s3, [x8, #0xe8]
102217d90:     	fadd	s3, s1, s3
102217d94:     	fcmp	s3, s0
102217d98:     	fccmp	s2, s0, #0x2, ge
102217d9c:     	cset	w8, ls
102217da0:     	fcmp	s0, s1
102217da4:     	cset	w9, mi
102217da8:     	orr	w0, w9, w8
102217dac:     	ret
102217db0:     	ldr	d0, [x1]
102217db4:     	ldr	d1, [x2]
102217db8:     	adrp	x8, 0x1042e3000
102217dbc:     	ldr	d2, [x8, #0x688]
102217dc0:     	fadd	d2, d1, d2
102217dc4:     	fcmp	d2, d0
102217dc8:     	cset	w8, hi
102217dcc:     	adrp	x9, 0x1042e3000
102217dd0:     	ldr	d2, [x9, #0x690]
102217dd4:     	fadd	d2, d1, d2
102217dd8:     	fcmp	d2, d0
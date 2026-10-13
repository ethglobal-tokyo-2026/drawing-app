
FUNCTION 0x102e10fb0 size 92
102e10fb0:     	ldr	x10, [x0, #0x10]!
102e10fb4:     	cbz	x10, 0x102e10fe8
102e10fb8:     	mov	x9, x0
102e10fbc:     	ldr	w11, [x10, #0x20]
102e10fc0:     	cmp	w11, w1
102e10fc4:     	cset	w11, lo
102e10fc8:     	csel	x9, x9, x10, lo
102e10fcc:     	ldr	x10, [x10, w11, uxtw #3]
102e10fd0:     	cbnz	x10, 0x102e10fbc
102e10fd4:     	cmp	x9, x0
102e10fd8:     	b.eq	0x102e10fe8
102e10fdc:     	ldr	w10, [x9, #0x20]
102e10fe0:     	cmp	w10, w1
102e10fe4:     	b.ls	0x102e10ff0
102e10fe8:     	stp	xzr, xzr, [x8]
102e10fec:     	ret
102e10ff0:     	ldp	x10, x9, [x9, #0x28]
102e10ff4:     	stp	x10, x9, [x8]
102e10ff8:     	cbz	x9, 0x102e11008
102e10ffc:     	add	x8, x9, #0x8
102e11000:     	mov	w9, #0x1                ; =1
102e11004:     	ldadd	w9, w8, [x8]
102e11008:     	ret

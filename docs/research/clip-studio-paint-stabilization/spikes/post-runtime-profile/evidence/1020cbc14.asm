
FUNCTION 0x1020cbc14 size 76
1020cbc14:     	mov	x9, x0
1020cbc18:     	ldr	x10, [x9, #0x10]!
1020cbc1c:     	cbz	x10, 0x1020cbc50
1020cbc20:     	mov	x8, x9
1020cbc24:     	ldr	w11, [x10, #0x20]
1020cbc28:     	cmp	w11, w1
1020cbc2c:     	cset	w11, lo
1020cbc30:     	csel	x8, x8, x10, lo
1020cbc34:     	ldr	x10, [x10, w11, uxtw #3]
1020cbc38:     	cbnz	x10, 0x1020cbc24
1020cbc3c:     	cmp	x8, x9
1020cbc40:     	b.eq	0x1020cbc50
1020cbc44:     	ldr	w9, [x8, #0x20]
1020cbc48:     	cmp	w9, w1
1020cbc4c:     	b.ls	0x1020cbc58
1020cbc50:     	add	x0, x0, #0x20
1020cbc54:     	ret
1020cbc58:     	add	x0, x8, #0x28
1020cbc5c:     	ret

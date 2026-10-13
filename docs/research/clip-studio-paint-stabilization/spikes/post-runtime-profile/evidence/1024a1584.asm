
FUNCTION 0x1024a1584 size 172
1024a1584:     	mov	w9, #0x1                ; =1
1024a1588:     	fmov	d2, #1.00000000
1024a158c:     	adrp	x8, 0x1042e3000
1024a1590:     	ldr	d3, [x8, #0x690]
1024a1594:     	fcmp	d0, d3
1024a1598:     	adrp	x8, 0x1042e6000
1024a159c:     	b.le	0x1024a15d8
1024a15a0:     	ldr	d4, [x8, #0xfd0]
1024a15a4:     	fcmp	d0, d4
1024a15a8:     	fmov	d4, #1.00000000
1024a15ac:     	b.pl	0x1024a15dc
1024a15b0:     	fdiv	d4, d4, d0
1024a15b4:     	fcmp	d4, #0.0
1024a15b8:     	cset	w9, mi
1024a15bc:     	adrp	x10, 0x1042e4000
1024a15c0:     	add	x10, x10, #0x7a0
1024a15c4:     	ldr	d5, [x10, w9, uxtw #3]
1024a15c8:     	fadd	d4, d4, d5
1024a15cc:     	fcvtzs	w9, d4
1024a15d0:     	fmov	d4, d0
1024a15d4:     	b	0x1024a15dc
1024a15d8:     	fmov	d4, #1.00000000
1024a15dc:     	str	d4, [x0, #0x108]
1024a15e0:     	str	w9, [x0, #0x118]
1024a15e4:     	mov	w9, #0x1                ; =1
1024a15e8:     	fcmp	d1, d3
1024a15ec:     	b.le	0x1024a1624
1024a15f0:     	ldr	d0, [x8, #0xfd0]
1024a15f4:     	fcmp	d1, d0
1024a15f8:     	b.pl	0x1024a1624
1024a15fc:     	fmov	d0, #1.00000000
1024a1600:     	fdiv	d0, d0, d1
1024a1604:     	fcmp	d0, #0.0
1024a1608:     	cset	w8, mi
1024a160c:     	adrp	x9, 0x1042e4000
1024a1610:     	add	x9, x9, #0x7a0
1024a1614:     	ldr	d2, [x9, w8, uxtw #3]
1024a1618:     	fadd	d0, d0, d2
1024a161c:     	fcvtzs	w9, d0
1024a1620:     	fmov	d2, d1
1024a1624:     	str	d2, [x0, #0x110]
1024a1628:     	str	w9, [x0, #0x11c]
1024a162c:     	ret


FUNCTION 0x1021944a8 size 120
1021944a8:     	fsub	d6, d2, d0
1021944ac:     	fsub	d7, d3, d1
1021944b0:     	fsub	d4, d4, d0
1021944b4:     	fsub	d5, d5, d1
1021944b8:     	fmul	d5, d7, d5
1021944bc:     	fmadd	d4, d6, d4, d5
1021944c0:     	fcmp	d4, #0.0
1021944c4:     	b.ls	0x102194500
1021944c8:     	fmul	d5, d7, d7
1021944cc:     	fmadd	d5, d6, d6, d5
1021944d0:     	fcmp	d4, d5
1021944d4:     	b.ge	0x102194508
1021944d8:     	fdiv	d4, d4, d5
1021944dc:     	fmov	d5, #1.00000000
1021944e0:     	fsub	d5, d5, d4
1021944e4:     	fmul	d0, d0, d5
1021944e8:     	fmul	d1, d1, d5
1021944ec:     	fmul	d2, d2, d4
1021944f0:     	fmul	d3, d3, d4
1021944f4:     	fadd	d0, d2, d0
1021944f8:     	fadd	d1, d3, d1
1021944fc:     	b	0x102194514
102194500:     	movi	d4, #0000000000000000
102194504:     	b	0x102194514
102194508:     	fmov	d4, #1.00000000
10219450c:     	fmov	d0, d2
102194510:     	fmov	d1, d3
102194514:     	stp	d0, d1, [x0]
102194518:     	fmov	d0, d4
10219451c:     	ret

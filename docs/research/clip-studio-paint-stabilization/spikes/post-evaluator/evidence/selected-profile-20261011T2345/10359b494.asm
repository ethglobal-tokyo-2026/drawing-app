
FUNCTION 0x10359b494 size 164
10359b494:     	fabs	d4, d0
10359b498:     	adrp	x8, 0x1042e3000
10359b49c:     	ldr	d3, [x8, #0x690]
10359b4a0:     	fcmp	d4, d3
10359b4a4:     	b.ls	0x10359b4f4
10359b4a8:     	fmov	d4, #-4.00000000
10359b4ac:     	fmul	d4, d0, d4
10359b4b0:     	fmul	d2, d4, d2
10359b4b4:     	fmadd	d2, d1, d1, d2
10359b4b8:     	adrp	x8, 0x1042e3000
10359b4bc:     	ldr	d4, [x8, #0x688]
10359b4c0:     	fcmp	d2, d4
10359b4c4:     	b.mi	0x10359b514
10359b4c8:     	fcmp	d2, d3
10359b4cc:     	b.le	0x10359b51c
10359b4d0:     	fsqrt	d2, d2
10359b4d4:     	fmov	d3, #-0.50000000
10359b4d8:     	fdiv	d0, d3, d0
10359b4dc:     	fadd	d3, d2, d1
10359b4e0:     	fmul	d3, d0, d3
10359b4e4:     	fsub	d1, d1, d2
10359b4e8:     	fmul	d0, d0, d1
10359b4ec:     	str	d3, [x0]
10359b4f0:     	b	0x10359b52c
10359b4f4:     	fabs	d0, d1
10359b4f8:     	fcmp	d0, d3
10359b4fc:     	b.ls	0x10359b514
10359b500:     	fneg	d0, d2
10359b504:     	fdiv	d0, d0, d1
10359b508:     	str	d0, [x0]
10359b50c:     	mov	w0, #0x1                ; =1
10359b510:     	ret
10359b514:     	mov	w0, #0x0                ; =0
10359b518:     	ret
10359b51c:     	fneg	d1, d1
10359b520:     	fadd	d0, d0, d0
10359b524:     	fdiv	d0, d1, d0
10359b528:     	str	d0, [x0]
10359b52c:     	str	d0, [x0, #0x8]
10359b530:     	mov	w0, #0x2                ; =2
10359b534:     	ret


FUNCTION 0x10359f8d4 size 120
10359f8d4:     	ldp	d2, d4, [x2]
10359f8d8:     	ldp	d1, d0, [x0]
10359f8dc:     	fsub	d3, d2, d1
10359f8e0:     	fsub	d2, d4, d0
10359f8e4:     	fmul	d4, d2, d2
10359f8e8:     	fmadd	d4, d3, d3, d4
10359f8ec:     	mov	x8, #0x4059000000000000 ; =4636737291354636288
10359f8f0:     	fmov	d5, x8
10359f8f4:     	fcmp	d4, d5
10359f8f8:     	b.mi	0x10359f948
10359f8fc:     	ldp	d5, d6, [x1]
10359f900:     	fsub	d5, d1, d5
10359f904:     	fsub	d6, d0, d6
10359f908:     	fmul	d6, d6, d6
10359f90c:     	fmadd	d5, d5, d5, d6
10359f910:     	fmov	d6, #6.25000000
10359f914:     	fmul	d5, d5, d6
10359f918:     	fcmp	d4, d5
10359f91c:     	b.mi	0x10359f948
10359f920:     	fsqrt	d6, d5
10359f924:     	fmov	d7, x8
10359f928:     	fcmp	d5, d7
10359f92c:     	fmov	d5, #10.00000000
10359f930:     	fcsel	d5, d6, d5, gt
10359f934:     	fsqrt	d4, d4
10359f938:     	fdiv	d4, d5, d4
10359f93c:     	fmadd	d1, d3, d4, d1
10359f940:     	fmadd	d0, d2, d4, d0
10359f944:     	stp	d1, d0, [x2]
10359f948:     	ret

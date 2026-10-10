
FUNCTION 0x102193618 size 44
102193618:     	ldp	d0, d1, [x1]
10219361c:     	ldp	d2, d3, [x0]
102193620:     	fsub	d0, d0, d2
102193624:     	fsub	d1, d1, d3
102193628:     	fmul	d1, d1, d1
10219362c:     	fmadd	d0, d0, d0, d1
102193630:     	fsqrt	d1, d0
102193634:     	fcmp	d0, #0.0
102193638:     	movi	d0, #0000000000000000
10219363c:     	fcsel	d0, d1, d0, ne
102193640:     	ret

FUNCTION 0x10221b72c size 144
10221b72c:     	ldp	d4, d1, [x0]
10221b730:     	ldp	d3, d0, [x0, #0x10]
10221b734:     	ldr	d2, [x1]
10221b738:     	fcmp	d4, d3
10221b73c:     	fccmp	d1, d0, #0x0, mi
10221b740:     	b.mi	0x10221b768
10221b744:     	adrp	x8, 0x1042e3000
10221b748:     	ldr	d0, [x8, #0x690]
10221b74c:     	fadd	d1, d2, d0
10221b750:     	ldr	d3, [x1, #0x8]
10221b754:     	stp	d2, d3, [x0]
10221b758:     	fadd	d0, d3, d0
10221b75c:     	str	d1, [x0, #0x10]
10221b760:     	str	d0, [x0, #0x18]
10221b764:     	ret
10221b768:     	fcmp	d2, d4
10221b76c:     	b.pl	0x10221b778
10221b770:     	str	d2, [x0]
10221b774:     	b	0x10221b790
10221b778:     	fcmp	d2, d3
10221b77c:     	b.lt	0x10221b790
10221b780:     	adrp	x8, 0x1042e3000
10221b784:     	ldr	d3, [x8, #0x690]
10221b788:     	fadd	d2, d2, d3
10221b78c:     	str	d2, [x0, #0x10]
10221b790:     	ldr	d2, [x1, #0x8]
10221b794:     	fcmp	d2, d1
10221b798:     	b.pl	0x10221b7a4
10221b79c:     	str	d2, [x0, #0x8]
10221b7a0:     	ret
10221b7a4:     	fcmp	d2, d0
10221b7a8:     	b.lt	0x10221b764
10221b7ac:     	adrp	x8, 0x1042e3000
10221b7b0:     	ldr	d0, [x8, #0x690]
10221b7b4:     	fadd	d0, d2, d0
10221b7b8:     	b	0x10221b760

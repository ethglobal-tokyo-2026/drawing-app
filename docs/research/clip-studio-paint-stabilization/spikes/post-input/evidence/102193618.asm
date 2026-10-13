
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

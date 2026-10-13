
FUNCTION 0x102193940 size 116
102193940:     	fsub	d6, d2, d0
102193944:     	fsub	d7, d3, d1
102193948:     	fsub	d0, d4, d0
10219394c:     	fsub	d1, d5, d1
102193950:     	fmul	d16, d7, d1
102193954:     	fmadd	d17, d6, d0, d16
102193958:     	fcmp	d17, #0.0
10219395c:     	b.ls	0x102193998
102193960:     	fmul	d16, d7, d7
102193964:     	fmadd	d16, d6, d6, d16
102193968:     	fcmp	d17, d16
10219396c:     	b.ge	0x102193990
102193970:     	fnmul	d0, d0, d7
102193974:     	fmadd	d2, d1, d6, d0
102193978:     	fnmadd	d0, d1, d6, d0
10219397c:     	fcmp	d2, #0.0
102193980:     	fcsel	d0, d0, d2, mi
102193984:     	fsqrt	d1, d16
102193988:     	fdiv	d0, d0, d1
10219398c:     	ret
102193990:     	fsub	d0, d4, d2
102193994:     	fsub	d1, d5, d3
102193998:     	fmul	d1, d1, d1
10219399c:     	fmadd	d0, d0, d0, d1
1021939a0:     	fsqrt	d1, d0
1021939a4:     	fcmp	d0, #0.0
1021939a8:     	movi	d0, #0000000000000000
1021939ac:     	fcsel	d0, d1, d0, ne
1021939b0:     	ret

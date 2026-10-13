
FUNCTION 0x10359bc34 size 52
10359bc34:     	fmov	d7, #1.00000000
10359bc38:     	fsub	d7, d7, d6
10359bc3c:     	fmul	d16, d7, d7
10359bc40:     	fadd	d7, d7, d7
10359bc44:     	fmul	d7, d7, d6
10359bc48:     	fmul	d6, d6, d6
10359bc4c:     	fmul	d2, d2, d7
10359bc50:     	fmadd	d0, d16, d0, d2
10359bc54:     	fmadd	d0, d6, d4, d0
10359bc58:     	fmul	d2, d3, d7
10359bc5c:     	fmadd	d1, d16, d1, d2
10359bc60:     	fmadd	d1, d6, d5, d1
10359bc64:     	ret

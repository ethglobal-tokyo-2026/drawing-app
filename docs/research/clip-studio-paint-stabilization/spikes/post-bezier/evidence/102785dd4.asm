
FUNCTION 0x102785dd4 size 48
102785dd4:     	movi.2d	v0, #0000000000000000
102785dd8:     	stp	q0, q0, [x0, #0x30]
102785ddc:     	adrp	x8, 0x104a53000
102785de0:     	add	x8, x8, #0x8b8
102785de4:     	str	q0, [x0, #0x50]
102785de8:     	stp	x8, xzr, [x0]
102785dec:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
102785df0:     	stp	xzr, x8, [x0, #0x10]
102785df4:     	stp	xzr, x8, [x0, #0x20]
102785df8:     	stp	xzr, xzr, [x0, #0x68]
102785dfc:     	str	xzr, [x0, #0x60]
102785e00:     	ret

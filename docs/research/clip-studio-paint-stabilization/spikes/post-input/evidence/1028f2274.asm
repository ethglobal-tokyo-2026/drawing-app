
FUNCTION 0x1028f2274 size 64
1028f2274:     	adrp	x8, 0x104a5a000
1028f2278:     	add	x8, x8, #0x2f0
1028f227c:     	str	x8, [x0]
1028f2280:     	str	wzr, [x0, #0x8]
1028f2284:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
1028f2288:     	str	x8, [x0, #0x10]
1028f228c:     	movi.2d	v0, #0000000000000000
1028f2290:     	stur	q0, [x0, #0x18]
1028f2294:     	stur	q0, [x0, #0x28]
1028f2298:     	stur	q0, [x0, #0x38]
1028f229c:     	stur	q0, [x0, #0x48]
1028f22a0:     	stur	q0, [x0, #0x54]
1028f22a4:     	stur	q0, [x0, #0x68]
1028f22a8:     	stur	q0, [x0, #0x78]
1028f22ac:     	str	xzr, [x0, #0x88]
1028f22b0:     	ret

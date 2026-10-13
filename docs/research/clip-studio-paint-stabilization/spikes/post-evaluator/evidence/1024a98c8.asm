
FUNCTION 0x1024a98c8 size 52
1024a98c8:     	mov	w8, #0x3                ; =3
1024a98cc:     	str	w8, [x0, #0x168]
1024a98d0:     	mov	x8, #0x3fe8000000000000 ; =4604930618986332160
1024a98d4:     	stp	xzr, x8, [x0, #0x70]
1024a98d8:     	str	xzr, [x0, #0x68]
1024a98dc:     	fmov.2d	v0, #1.00000000
1024a98e0:     	str	q0, [x0, #0x80]
1024a98e4:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
1024a98e8:     	str	x8, [x0, #0x90]
1024a98ec:     	ldr	w8, [x0, #0x16c]
1024a98f0:     	add	w8, w8, #0x1
1024a98f4:     	str	w8, [x0, #0x16c]
1024a98f8:     	ret

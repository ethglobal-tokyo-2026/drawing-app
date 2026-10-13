
FUNCTION 0x1024af65c size 52
1024af65c:     	adrp	x8, 0x104a49000
1024af660:     	add	x8, x8, #0x3b0
1024af664:     	str	x8, [x0]
1024af668:     	str	wzr, [x0, #0x8]
1024af66c:     	movi.2d	v0, #0000000000000000
1024af670:     	stur	q0, [x0, #0x28]
1024af674:     	stur	q0, [x0, #0x38]
1024af678:     	stur	q0, [x0, #0x48]
1024af67c:     	adrp	x8, 0x104356000
1024af680:     	ldr	q0, [x8, #0x410]
1024af684:     	stur	q0, [x0, #0xc]
1024af688:     	stp	wzr, wzr, [x0, #0x1c]
1024af68c:     	ret

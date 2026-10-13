
FUNCTION 0x1024af628 size 52
1024af628:     	adrp	x8, 0x104a49000
1024af62c:     	add	x8, x8, #0x3b0
1024af630:     	str	x8, [x0]
1024af634:     	str	wzr, [x0, #0x8]
1024af638:     	movi.2d	v0, #0000000000000000
1024af63c:     	stur	q0, [x0, #0x28]
1024af640:     	stur	q0, [x0, #0x38]
1024af644:     	stur	q0, [x0, #0x48]
1024af648:     	adrp	x8, 0x104356000
1024af64c:     	ldr	q0, [x8, #0x410]
1024af650:     	stur	q0, [x0, #0xc]
1024af654:     	stp	wzr, wzr, [x0, #0x1c]
1024af658:     	ret

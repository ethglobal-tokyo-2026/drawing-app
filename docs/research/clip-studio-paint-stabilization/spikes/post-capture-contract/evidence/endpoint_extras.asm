
FUNCTION 0x10276b2a0 size 36
10276b2a0:     	fcvt	s0, d0
10276b2a4:     	fcvt	s1, d1
10276b2a8:     	stp	s0, s1, [x0, #0x60]
10276b2ac:     	fcvt	s0, d2
10276b2b0:     	str	s0, [x0, #0x68]
10276b2b4:     	ldr	w8, [x0, #0x40]
10276b2b8:     	orr	w8, w8, #0x3
10276b2bc:     	str	w8, [x0, #0x40]
10276b2c0:     	ret

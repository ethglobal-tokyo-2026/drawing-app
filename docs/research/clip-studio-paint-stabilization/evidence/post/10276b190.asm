10276b190:     	ldr	q0, [x1]
10276b194:     	stur	q0, [x0, #0x8]
10276b198:     	ldp	q1, q0, [x1, #0x10]
10276b19c:     	fcvtn	v1.2s, v1.2d
10276b1a0:     	fcvtn2	v1.4s, v0.2d
10276b1a4:     	stur	q1, [x0, #0x44]
10276b1a8:     	ldr	q0, [x1, #0x30]
10276b1ac:     	fcvtn	v0.2s, v0.2d
10276b1b0:     	stur	d0, [x0, #0x54]
10276b1b4:     	ldr	d0, [x1, #0x40]
10276b1b8:     	fcvt	s0, d0
10276b1bc:     	str	s0, [x0, #0x5c]
10276b1c0:     	ldr	w8, [x1, #0x50]
10276b1c4:     	ldr	w9, [x0, #0x40]
10276b1c8:     	bfi	w9, w8, #12, #2
10276b1cc:     	str	w9, [x0, #0x40]
10276b1d0:     	ret
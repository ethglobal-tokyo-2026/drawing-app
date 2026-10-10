10276b138:     	ldur	q0, [x0, #0x8]
10276b13c:     	str	q0, [x1]
10276b140:     	ldur	d0, [x0, #0x44]
10276b144:     	fcvtl	v0.2d, v0.2s
10276b148:     	ldur	d1, [x0, #0x4c]
10276b14c:     	fcvtl	v1.2d, v1.2s
10276b150:     	stp	q0, q1, [x1, #0x10]
10276b154:     	ldur	d0, [x0, #0x54]
10276b158:     	fcvtl	v0.2d, v0.2s
10276b15c:     	str	q0, [x1, #0x30]
10276b160:     	ldr	s0, [x0, #0x5c]
10276b164:     	fcvt	d0, s0
10276b168:     	str	d0, [x1, #0x40]
10276b16c:     	str	xzr, [x1, #0x48]
10276b170:     	ldr	w8, [x0, #0x40]
10276b174:     	ubfx	w8, w8, #12, #1
10276b178:     	str	w8, [x1, #0x50]
10276b17c:     	ldrb	w9, [x0, #0x41]
10276b180:     	tbz	w9, #0x5, 0x10276b18c
10276b184:     	orr	w8, w8, #0x2
10276b188:     	str	w8, [x1, #0x50]
10276b18c:     	ret
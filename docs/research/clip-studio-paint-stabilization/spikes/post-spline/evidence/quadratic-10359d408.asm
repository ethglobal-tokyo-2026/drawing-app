
FUNCTION 0x10359d408 size 84
10359d408:     	fmov	d7, #1.00000000
10359d40c:     	fsub	d7, d7, d6
10359d410:     	fmul	d0, d0, d7
10359d414:     	fmul	d1, d1, d7
10359d418:     	fmul	d16, d2, d6
10359d41c:     	fmul	d17, d3, d6
10359d420:     	fadd	d0, d16, d0
10359d424:     	fadd	d1, d17, d1
10359d428:     	mov.d	v2[1], v3[0]
10359d42c:     	stp	d0, d1, [x0]
10359d430:     	fmul.2d	v0, v2, v7[0]
10359d434:     	mov.d	v4[1], v5[0]
10359d438:     	fmul.2d	v1, v4, v6[0]
10359d43c:     	fadd.2d	v0, v1, v0
10359d440:     	str	q0, [x2]
10359d444:     	ldr	q1, [x0]
10359d448:     	fmul.2d	v1, v1, v7[0]
10359d44c:     	fmul.2d	v0, v0, v6[0]
10359d450:     	fadd.2d	v0, v0, v1
10359d454:     	str	q0, [x1]
10359d458:     	ret

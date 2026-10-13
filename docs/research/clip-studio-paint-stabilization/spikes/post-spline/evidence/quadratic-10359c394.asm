
FUNCTION 0x10359c394 size 216
10359c394:     	stp	d15, d14, [sp, #-0x60]!
10359c398:     	stp	d13, d12, [sp, #0x10]
10359c39c:     	stp	d11, d10, [sp, #0x20]
10359c3a0:     	stp	d9, d8, [sp, #0x30]
10359c3a4:     	stp	x20, x19, [sp, #0x40]
10359c3a8:     	stp	x29, x30, [sp, #0x50]
10359c3ac:     	add	x29, sp, #0x50
10359c3b0:     	mov	x20, x1
10359c3b4:     	mov	x19, x0
10359c3b8:     	fmov	d8, d7
10359c3bc:     	fmov	d9, d6
10359c3c0:     	fmov	d10, d5
10359c3c4:     	fmov	d11, d4
10359c3c8:     	fmov	d12, d3
10359c3cc:     	fmov	d13, d2
10359c3d0:     	fmov	d14, d1
10359c3d4:     	fmov	d15, d0
10359c3d8:     	bl	0x10359c490
10359c3dc:     	cmp	w20, #0x0
10359c3e0:     	fmov	d1, #0.50000000
10359c3e4:     	fmov	d2, #4.00000000
10359c3e8:     	fcsel	d1, d2, d1, eq
10359c3ec:     	fdiv	d1, d0, d1
10359c3f0:     	fcvtzs	w8, d1
10359c3f4:     	cmp	w8, #0x5
10359c3f8:     	b.ge	0x10359c418
10359c3fc:     	ldp	x29, x30, [sp, #0x50]
10359c400:     	ldp	x20, x19, [sp, #0x40]
10359c404:     	ldp	d9, d8, [sp, #0x30]
10359c408:     	ldp	d11, d10, [sp, #0x20]
10359c40c:     	ldp	d13, d12, [sp, #0x10]
10359c410:     	ldp	d15, d14, [sp], #0x60
10359c414:     	ret
10359c418:     	mov	w9, #0xff               ; =255
10359c41c:     	cmp	w8, #0xff
10359c420:     	csel	w9, w8, w9, lo
10359c424:     	cmp	w20, #0x0
10359c428:     	csel	w1, w9, w8, eq
10359c42c:     	fmov	d0, d15
10359c430:     	fmov	d1, d14
10359c434:     	fmov	d2, d13
10359c438:     	fmov	d3, d12
10359c43c:     	fmov	d4, d11
10359c440:     	fmov	d5, d10
10359c444:     	fmov	d6, d9
10359c448:     	fmov	d7, d8
10359c44c:     	mov	x0, x19
10359c450:     	ldp	x29, x30, [sp, #0x50]
10359c454:     	ldp	x20, x19, [sp, #0x40]
10359c458:     	ldp	d9, d8, [sp, #0x30]
10359c45c:     	ldp	d11, d10, [sp, #0x20]
10359c460:     	ldp	d13, d12, [sp, #0x10]
10359c464:     	ldp	d15, d14, [sp], #0x60
10359c468:     	b	0x10359c60c

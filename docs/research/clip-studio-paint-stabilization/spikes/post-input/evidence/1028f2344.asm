
FUNCTION 0x1028f2344 size 488
1028f2344:     	sub	sp, sp, #0x80
1028f2348:     	stp	d13, d12, [sp, #0x10]
1028f234c:     	stp	d11, d10, [sp, #0x20]
1028f2350:     	stp	d9, d8, [sp, #0x30]
1028f2354:     	stp	x24, x23, [sp, #0x40]
1028f2358:     	stp	x22, x21, [sp, #0x50]
1028f235c:     	stp	x20, x19, [sp, #0x60]
1028f2360:     	stp	x29, x30, [sp, #0x70]
1028f2364:     	add	x29, sp, #0x70
1028f2368:     	mov	x20, x4
1028f236c:     	fmov	d8, d4
1028f2370:     	fmov	d9, d3
1028f2374:     	fmov	d11, d2
1028f2378:     	fmov	d12, d1
1028f237c:     	fmov	d10, d0
1028f2380:     	mov	x21, x3
1028f2384:     	mov	x23, x2
1028f2388:     	mov	x22, x1
1028f238c:     	mov	x19, x0
1028f2390:     	str	x4, [sp, #0x8]
1028f2394:     	str	wzr, [x0, #0x8]
1028f2398:     	str	xzr, [x0, #0x58]
1028f239c:     	cbz	w1, 0x1028f2400
1028f23a0:     	cmp	w23, #0x1
1028f23a4:     	b.eq	0x1028f2400
1028f23a8:     	cbz	x20, 0x1028f2400
1028f23ac:     	mov	w8, #0x1                ; =1
1028f23b0:     	str	w8, [x19, #0x8]
1028f23b4:     	cmp	w23, #0x4
1028f23b8:     	b.ne	0x1028f23e4
1028f23bc:     	bl	0x102194e64
1028f23c0:     	cmp	w0, #0x1
1028f23c4:     	b.eq	0x1028f23f8
1028f23c8:     	cmp	w0, #0x4
1028f23cc:     	b.eq	0x1028f23f0
1028f23d0:     	cmp	w0, #0x3
1028f23d4:     	b.ne	0x1028f2400
1028f23d8:     	mov	w8, #0x1                ; =1
1028f23dc:     	str	w8, [x19, #0x58]
1028f23e0:     	b	0x1028f23fc
1028f23e4:     	mov	w8, #0x0                ; =0
1028f23e8:     	fmov	d0, #8.00000000
1028f23ec:     	b	0x1028f242c
1028f23f0:     	mov	w8, #0x3                ; =3
1028f23f4:     	b	0x1028f23fc
1028f23f8:     	mov	w8, #0x5                ; =5
1028f23fc:     	str	w8, [x19, #0x5c]
1028f2400:     	ldr	w8, [x19, #0x8]
1028f2404:     	cmp	w23, #0x4
1028f2408:     	ccmp	w23, #0x1, #0x4, ne
1028f240c:     	mov	x9, #0x4059000000000000 ; =4636737291354636288
1028f2410:     	fmov	d0, x9
1028f2414:     	fmov	d1, #20.00000000
1028f2418:     	fcsel	d0, d0, d1, eq
1028f241c:     	cmp	w8, #0x0
1028f2420:     	cset	w8, eq
1028f2424:     	fmov	d1, #8.00000000
1028f2428:     	fcsel	d0, d0, d1, eq
1028f242c:     	fmul	d2, d12, d11
1028f2430:     	cmp	w22, #0x0
1028f2434:     	fmov	d1, #1.00000000
1028f2438:     	fcsel	d2, d2, d1, ne
1028f243c:     	fmul	d0, d2, d0
1028f2440:     	fdiv	d2, d0, d10
1028f2444:     	adrp	x9, 0x1042e3000
1028f2448:     	ldr	d3, [x9, #0x690]
1028f244c:     	fcmp	d10, d3
1028f2450:     	fcsel	d0, d2, d0, gt
1028f2454:     	fcmp	d0, d3
1028f2458:     	b.le	0x1028f2464
1028f245c:     	fdiv	d0, d1, d0
1028f2460:     	str	d0, [x19, #0x10]
1028f2464:     	lsr	w9, w21, #1
1028f2468:     	cmp	w21, #0x4
1028f246c:     	csinc	w8, w8, wzr, ge
1028f2470:     	mov	w10, #0x2               ; =2
1028f2474:     	cmp	w8, #0x0
1028f2478:     	csel	w8, w10, w9, ne
1028f247c:     	stp	wzr, w8, [x19, #0x48]
1028f2480:     	ldp	x8, x9, [x19, #0x20]
1028f2484:     	str	xzr, [x19, #0x40]
1028f2488:     	sub	x9, x9, x8
1028f248c:     	asr	x9, x9, #3
1028f2490:     	cmp	x9, #0x3
1028f2494:     	b.lo	0x1028f24bc
1028f2498:     	ldr	x0, [x8]
1028f249c:     	bl	0x103bdd34c
1028f24a0:     	ldp	x8, x9, [x19, #0x20]
1028f24a4:     	add	x8, x8, #0x8
1028f24a8:     	str	x8, [x19, #0x20]
1028f24ac:     	sub	x9, x9, x8
1028f24b0:     	asr	x9, x9, #3
1028f24b4:     	cmp	x9, #0x2
1028f24b8:     	b.hi	0x1028f2498
1028f24bc:     	cmp	x9, #0x1
1028f24c0:     	b.eq	0x1028f24d4
1028f24c4:     	cmp	x9, #0x2
1028f24c8:     	b.ne	0x1028f24dc
1028f24cc:     	mov	w8, #0x200              ; =512
1028f24d0:     	b	0x1028f24d8
1028f24d4:     	mov	w8, #0x100              ; =256
1028f24d8:     	str	x8, [x19, #0x38]
1028f24dc:     	ldr	w8, [x19, #0x8]
1028f24e0:     	cbz	w8, 0x1028f24f4
1028f24e4:     	add	x0, x19, #0x18
1028f24e8:     	add	x1, sp, #0x8
1028f24ec:     	bl	0x1028f252c
1028f24f0:     	ldr	x20, [sp, #0x8]
1028f24f4:     	str	x20, [x19, #0x50]
1028f24f8:     	stp	d9, d8, [x19, #0x68]
1028f24fc:     	stp	d9, d8, [x19, #0x78]
1028f2500:     	str	xzr, [x19, #0x88]
1028f2504:     	str	wzr, [x19, #0x60]
1028f2508:     	ldp	x29, x30, [sp, #0x70]
1028f250c:     	ldp	x20, x19, [sp, #0x60]
1028f2510:     	ldp	x22, x21, [sp, #0x50]
1028f2514:     	ldp	x24, x23, [sp, #0x40]
1028f2518:     	ldp	d9, d8, [sp, #0x30]
1028f251c:     	ldp	d11, d10, [sp, #0x20]
1028f2520:     	ldp	d13, d12, [sp, #0x10]
1028f2524:     	add	sp, sp, #0x80
1028f2528:     	ret

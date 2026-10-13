
FUNCTION 0x10359b3b4 size 224
10359b3b4:     	stp	d9, d8, [sp, #-0x40]!
10359b3b8:     	stp	x22, x21, [sp, #0x10]
10359b3bc:     	stp	x20, x19, [sp, #0x20]
10359b3c0:     	stp	x29, x30, [sp, #0x30]
10359b3c4:     	add	x29, sp, #0x30
10359b3c8:     	mov	x19, x2
10359b3cc:     	mov	x20, x0
10359b3d0:     	subs	w8, w1, #0x1
10359b3d4:     	b.lt	0x10359b428
10359b3d8:     	mov	x9, #0x0                ; =0
10359b3dc:     	mov	w21, #0x0               ; =0
10359b3e0:     	ldp	d0, d1, [x19]
10359b3e4:     	mov	w10, w1
10359b3e8:     	add	x11, x20, #0x8
10359b3ec:     	mov	x12, #0x7fefffffffffffff ; =9218868437227405311
10359b3f0:     	fmov	d2, x12
10359b3f4:     	ldp	d3, d4, [x11, #-0x8]
10359b3f8:     	fsub	d3, d3, d0
10359b3fc:     	fsub	d4, d4, d1
10359b400:     	fmul	d4, d4, d4
10359b404:     	fmadd	d3, d3, d3, d4
10359b408:     	fcmp	d3, d2
10359b40c:     	csel	w21, w9, w21, mi
10359b410:     	fcsel	d2, d3, d2, mi
10359b414:     	add	x9, x9, #0x1
10359b418:     	add	x11, x11, #0x10
10359b41c:     	cmp	x10, x9
10359b420:     	b.ne	0x10359b3f4
10359b424:     	b	0x10359b42c
10359b428:     	mov	w21, #0x0               ; =0
10359b42c:     	cmp	w21, w8
10359b430:     	b.ge	0x10359b450
10359b434:     	add	x8, x20, w21, sxtw #4
10359b438:     	ldp	d0, d1, [x8]
10359b43c:     	ldp	d2, d3, [x8, #0x10]
10359b440:     	ldp	d4, d5, [x19]
10359b444:     	bl	0x102193940
10359b448:     	fmov	d8, d0
10359b44c:     	b	0x10359b458
10359b450:     	mov	x8, #0x7fefffffffffffff ; =9218868437227405311
10359b454:     	fmov	d8, x8
10359b458:     	cmp	w21, #0x1
10359b45c:     	b.lt	0x10359b47c
10359b460:     	add	x8, x20, w21, uxtw #4
10359b464:     	ldp	d0, d1, [x8, #-0x10]
10359b468:     	ldp	d2, d3, [x8]
10359b46c:     	ldp	d4, d5, [x19]
10359b470:     	bl	0x102193940
10359b474:     	fcmp	d0, d8
10359b478:     	fcsel	d8, d0, d8, mi
10359b47c:     	fmov	d0, d8
10359b480:     	ldp	x29, x30, [sp, #0x30]
10359b484:     	ldp	x20, x19, [sp, #0x20]
10359b488:     	ldp	x22, x21, [sp, #0x10]
10359b48c:     	ldp	d9, d8, [sp], #0x40
10359b490:     	ret

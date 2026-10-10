10359b240:     	sub	sp, sp, #0x70
10359b244:     	stp	d11, d10, [sp, #0x10]
10359b248:     	stp	d9, d8, [sp, #0x20]
10359b24c:     	stp	x24, x23, [sp, #0x30]
10359b250:     	stp	x22, x21, [sp, #0x40]
10359b254:     	stp	x20, x19, [sp, #0x50]
10359b258:     	stp	x29, x30, [sp, #0x60]
10359b25c:     	add	x29, sp, #0x60
10359b260:     	mov	x19, x3
10359b264:     	mov	x20, x2
10359b268:     	mov	x21, x0
10359b26c:     	subs	w8, w1, #0x1
10359b270:     	b.lt	0x10359b2c4
10359b274:     	mov	x9, #0x0                ; =0
10359b278:     	mov	w22, #0x0               ; =0
10359b27c:     	ldp	d0, d1, [x20]
10359b280:     	mov	w10, w1
10359b284:     	add	x11, x21, #0x8
10359b288:     	mov	x12, #0x7fefffffffffffff ; =9218868437227405311
10359b28c:     	fmov	d2, x12
10359b290:     	ldp	d3, d4, [x11, #-0x8]
10359b294:     	fsub	d3, d3, d0
10359b298:     	fsub	d4, d4, d1
10359b29c:     	fmul	d4, d4, d4
10359b2a0:     	fmadd	d3, d3, d3, d4
10359b2a4:     	fcmp	d3, d2
10359b2a8:     	csel	w22, w9, w22, mi
10359b2ac:     	fcsel	d2, d3, d2, mi
10359b2b0:     	add	x9, x9, #0x1
10359b2b4:     	add	x11, x11, #0x10
10359b2b8:     	cmp	x10, x9
10359b2bc:     	b.ne	0x10359b290
10359b2c0:     	b	0x10359b2c8
10359b2c4:     	mov	w22, #0x0               ; =0
10359b2c8:     	ldr	q0, [x21]
10359b2cc:     	str	q0, [x19]
10359b2d0:     	scvtf	d0, w8
10359b2d4:     	fmov	d1, #1.00000000
10359b2d8:     	fdiv	d8, d1, d0
10359b2dc:     	cmp	w22, w8
10359b2e0:     	b.ge	0x10359b324
10359b2e4:     	add	x8, x21, w22, sxtw #4
10359b2e8:     	ldp	d0, d1, [x8]
10359b2ec:     	ldp	d2, d3, [x8, #0x10]
10359b2f0:     	ldp	d4, d5, [x20]
10359b2f4:     	mov	x0, x19
10359b2f8:     	bl	0x1021944a8
10359b2fc:     	ldp	d1, d2, [x19]
10359b300:     	ldp	d3, d4, [x20]
10359b304:     	fsub	d1, d1, d3
10359b308:     	fsub	d2, d2, d4
10359b30c:     	fmul	d2, d2, d2
10359b310:     	fmadd	d10, d1, d1, d2
10359b314:     	scvtf	d1, w22
10359b318:     	fadd	d0, d0, d1
10359b31c:     	fmul	d9, d8, d0
10359b320:     	b	0x10359b330
10359b324:     	movi	d9, #0000000000000000
10359b328:     	mov	x8, #0x7fefffffffffffff ; =9218868437227405311
10359b32c:     	fmov	d10, x8
10359b330:     	subs	w23, w22, #0x1
10359b334:     	b.lt	0x10359b388
10359b338:     	add	x8, x21, w23, uxtw #4
10359b33c:     	ldp	d0, d1, [x8]
10359b340:     	add	x8, x21, w22, uxtw #4
10359b344:     	ldp	d2, d3, [x8]
10359b348:     	ldp	d4, d5, [x20]
10359b34c:     	mov	x0, sp
10359b350:     	bl	0x1021944a8
10359b354:     	ldp	d1, d2, [sp]
10359b358:     	ldp	d3, d4, [x20]
10359b35c:     	fsub	d1, d1, d3
10359b360:     	fsub	d2, d2, d4
10359b364:     	fmul	d2, d2, d2
10359b368:     	fmadd	d1, d1, d1, d2
10359b36c:     	fcmp	d1, d10
10359b370:     	b.pl	0x10359b388
10359b374:     	ldr	q1, [sp]
10359b378:     	str	q1, [x19]
10359b37c:     	ucvtf	d1, w23
10359b380:     	fadd	d0, d0, d1
10359b384:     	fmul	d9, d8, d0
10359b388:     	fmov	d0, #1.00000000
10359b38c:     	fcmp	d9, d0
10359b390:     	fcsel	d0, d0, d9, gt
10359b394:     	ldp	x29, x30, [sp, #0x60]
10359b398:     	ldp	x20, x19, [sp, #0x50]
10359b39c:     	ldp	x22, x21, [sp, #0x40]
10359b3a0:     	ldp	x24, x23, [sp, #0x30]
10359b3a4:     	ldp	d9, d8, [sp, #0x20]
10359b3a8:     	ldp	d11, d10, [sp, #0x10]
10359b3ac:     	add	sp, sp, #0x70
10359b3b0:     	ret
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
10359b494:     	fabs	d4, d0
10359b498:     	adrp	x8, 0x1042e3000
10359b49c:     	ldr	d3, [x8, #0x690]
10359b4a0:     	fcmp	d4, d3
10359b4a4:     	b.ls	0x10359b4f4
10359b4a8:     	fmov	d4, #-4.00000000
10359b4ac:     	fmul	d4, d0, d4
10359b4b0:     	fmul	d2, d4, d2
10359b4b4:     	fmadd	d2, d1, d1, d2
10359b4b8:     	adrp	x8, 0x1042e3000
10359b4bc:     	ldr	d4, [x8, #0x688]
10359b4c0:     	fcmp	d2, d4
10359b4c4:     	b.mi	0x10359b514
10359b4c8:     	fcmp	d2, d3
10359b4cc:     	b.le	0x10359b51c
10359b4d0:     	fsqrt	d2, d2
10359b4d4:     	fmov	d3, #-0.50000000
10359b4d8:     	fdiv	d0, d3, d0
10359b4dc:     	fadd	d3, d2, d1
10359b4e0:     	fmul	d3, d0, d3
10359b4e4:     	fsub	d1, d1, d2
10359b4e8:     	fmul	d0, d0, d1
10359b4ec:     	str	d3, [x0]
10359b4f0:     	b	0x10359b52c
10359b4f4:     	fabs	d0, d1
10359b4f8:     	fcmp	d0, d3
10359b4fc:     	b.ls	0x10359b514
10359b500:     	fneg	d0, d2
10359b504:     	fdiv	d0, d0, d1
10359b508:     	str	d0, [x0]
10359b50c:     	mov	w0, #0x1                ; =1
10359b510:     	ret
10359b514:     	mov	w0, #0x0                ; =0
10359b518:     	ret
10359b51c:     	fneg	d1, d1
10359b520:     	fadd	d0, d0, d0
10359b524:     	fdiv	d0, d1, d0
10359b528:     	str	d0, [x0]
10359b52c:     	str	d0, [x0, #0x8]
10359b530:     	mov	w0, #0x2                ; =2
10359b534:     	ret
10359b538:     	sub	sp, sp, #0xa0
10359b53c:     	stp	d15, d14, [sp, #0x40]
10359b540:     	stp	d13, d12, [sp, #0x50]
10359b544:     	stp	d11, d10, [sp, #0x60]
10359b548:     	stp	d9, d8, [sp, #0x70]
10359b54c:     	stp	x20, x19, [sp, #0x80]
10359b550:     	stp	x29, x30, [sp, #0x90]
10359b554:     	add	x29, sp, #0x90
10359b558:     	mov	x19, x0
10359b55c:     	fmov	d8, d2
10359b560:     	adrp	x8, 0x1048c8000
10359b564:     	ldr	x8, [x8, #0x4d0]
10359b568:     	ldr	x8, [x8]
10359b56c:     	str	x8, [sp, #0x38]

FUNCTION 0x1021e3298 size 772
1021e3298:     	sub	sp, sp, #0x170
1021e329c:     	stp	x28, x27, [sp, #0x110]
1021e32a0:     	stp	x26, x25, [sp, #0x120]
1021e32a4:     	stp	x24, x23, [sp, #0x130]
1021e32a8:     	stp	x22, x21, [sp, #0x140]
1021e32ac:     	stp	x20, x19, [sp, #0x150]
1021e32b0:     	stp	x29, x30, [sp, #0x160]
1021e32b4:     	add	x29, sp, #0x160
1021e32b8:     	ldr	w8, [x0, #0x18]
1021e32bc:     	cbnz	w8, 0x1021e3524
1021e32c0:     	mov	x23, x4
1021e32c4:     	mov	x20, x3
1021e32c8:     	mov	x21, x2
1021e32cc:     	mov	x22, x1
1021e32d0:     	mov	x19, x0
1021e32d4:     	add	x0, sp, #0x60
1021e32d8:     	bl	0x1020763f8
1021e32dc:     	adrp	x8, 0x1021e3000
1021e32e0:     	add	x8, x8, #0x59c
1021e32e4:     	adrp	x9, 0x1021e3000
1021e32e8:     	add	x9, x9, #0x5cc
1021e32ec:     	stp	x8, x9, [sp, #0x60]
1021e32f0:     	adrp	x8, 0x1021e3000
1021e32f4:     	add	x8, x8, #0x600
1021e32f8:     	adrp	x9, 0x1021e3000
1021e32fc:     	add	x9, x9, #0x634
1021e3300:     	stp	x8, x9, [sp, #0x70]
1021e3304:     	adrp	x8, 0x1021e3000
1021e3308:     	add	x8, x8, #0x668
1021e330c:     	adrp	x9, 0x1021e3000
1021e3310:     	add	x9, x9, #0x69c
1021e3314:     	stp	x8, x9, [sp, #0x80]
1021e3318:     	adrp	x8, 0x1021e3000
1021e331c:     	add	x8, x8, #0x6d0
1021e3320:     	adrp	x9, 0x1021e3000
1021e3324:     	add	x9, x9, #0x708
1021e3328:     	stp	x8, x9, [sp, #0x90]
1021e332c:     	adrp	x8, 0x1021e3000
1021e3330:     	add	x8, x8, #0x73c
1021e3334:     	adrp	x9, 0x1021e3000
1021e3338:     	add	x9, x9, #0x770
1021e333c:     	stp	x8, x9, [sp, #0xa0]
1021e3340:     	adrp	x8, 0x1021e3000
1021e3344:     	add	x8, x8, #0x7a4
1021e3348:     	adrp	x9, 0x1021e3000
1021e334c:     	add	x9, x9, #0xa60
1021e3350:     	stp	x8, x9, [sp, #0xb0]
1021e3354:     	adrp	x8, 0x1021e3000
1021e3358:     	add	x8, x8, #0xbe4
1021e335c:     	adrp	x9, 0x1021e3000
1021e3360:     	add	x9, x9, #0xd58
1021e3364:     	stp	x8, x9, [sp, #0xc0]
1021e3368:     	adrp	x8, 0x1021e3000
1021e336c:     	add	x8, x8, #0xd8c
1021e3370:     	adrp	x9, 0x1021e3000
1021e3374:     	add	x9, x9, #0xeac
1021e3378:     	stp	x8, x9, [sp, #0xd0]
1021e337c:     	adrp	x8, 0x1021e3000
1021e3380:     	add	x8, x8, #0xee0
1021e3384:     	adrp	x9, 0x1021e3000
1021e3388:     	add	x9, x9, #0xf14
1021e338c:     	stp	x8, x9, [sp, #0xe0]
1021e3390:     	adrp	x8, 0x1021e3000
1021e3394:     	add	x8, x8, #0xf48
1021e3398:     	adrp	x9, 0x1021e4000
1021e339c:     	add	x9, x9, #0x34
1021e33a0:     	stp	x8, x9, [sp, #0xf0]
1021e33a4:     	adrp	x8, 0x1021e4000
1021e33a8:     	add	x8, x8, #0x68
1021e33ac:     	str	x8, [sp, #0x100]
1021e33b0:     	sub	w27, w21, #0x3
1021e33b4:     	cmp	w27, #0x2
1021e33b8:     	b.hi	0x1021e33d4
1021e33bc:     	adrp	x8, 0x104c93000
1021e33c0:     	ldr	x8, [x8, #0x5d8]
1021e33c4:     	cbz	x8, 0x1021e33d4
1021e33c8:     	ldr	w9, [x8, #0x120]
1021e33cc:     	add	w9, w9, #0x1
1021e33d0:     	str	w9, [x8, #0x120]
1021e33d4:     	add	x8, sp, #0x50
1021e33d8:     	ldp	x24, x9, [x23]
1021e33dc:     	stp	x24, x9, [sp, #0x50]
1021e33e0:     	cbz	x9, 0x1021e33f0
1021e33e4:     	add	x9, x9, #0x8
1021e33e8:     	mov	w10, #0x1               ; =1
1021e33ec:     	ldadd	w10, w9, [x9]
1021e33f0:     	add	x0, x8, #0x8
1021e33f4:     	bl	0x10001022c
1021e33f8:     	cbz	x24, 0x1021e3428
1021e33fc:     	ldr	x24, [x23]
1021e3400:     	ldr	w9, [x24, #0x18]
1021e3404:     	cbz	w9, 0x1021e34a0
1021e3408:     	ldr	x0, [x24, #0x20]
1021e340c:     	cbz	x0, 0x1021e3430
1021e3410:     	bl	0x1020798e0
1021e3414:     	mov	x25, x0
1021e3418:     	ldr	x8, [x23]
1021e341c:     	ldr	w9, [x8, #0x18]
1021e3420:     	cbnz	w9, 0x1021e3438
1021e3424:     	b	0x1021e3458
1021e3428:     	mov	x23, #0x0               ; =0
1021e342c:     	b	0x1021e34a4
1021e3430:     	ldr	w25, [x24, #0x28]
1021e3434:     	mov	x8, x24
1021e3438:     	ldr	x0, [x8, #0x20]
1021e343c:     	cbz	x0, 0x1021e3458
1021e3440:     	bl	0x1020798ec
1021e3444:     	mov	x26, x0
1021e3448:     	ldr	x8, [x23]
1021e344c:     	ldr	w9, [x8, #0x18]
1021e3450:     	cbnz	w9, 0x1021e3460
1021e3454:     	b	0x1021e3474
1021e3458:     	ldr	w26, [x8, #0x30]
1021e345c:     	cbz	w9, 0x1021e3474
1021e3460:     	ldr	x0, [x8, #0x20]
1021e3464:     	cbz	x0, 0x1021e3474
1021e3468:     	bl	0x1020798f8
1021e346c:     	mov	x3, x0
1021e3470:     	b	0x1021e3478
1021e3474:     	ldr	w3, [x8, #0x34]
1021e3478:     	stp	xzr, xzr, [sp, #0x40]
1021e347c:     	add	x28, sp, #0x40
1021e3480:     	add	x4, sp, #0x40
1021e3484:     	mov	x0, x24
1021e3488:     	mov	x1, x25
1021e348c:     	mov	x2, x26
1021e3490:     	bl	0x1021e3298
1021e3494:     	add	x0, x28, #0x8
1021e3498:     	bl	0x10001022c
1021e349c:     	ldr	x24, [x23]
1021e34a0:     	ldr	x23, [x24, #0x20]
1021e34a4:     	ldr	w24, [x19, #0x2c]
1021e34a8:     	mov	x0, x19
1021e34ac:     	bl	0x1021dfe3c
1021e34b0:     	orr	w8, w24, #0x4
1021e34b4:     	mov	w9, #0x808              ; =2056
1021e34b8:     	tst	w24, w9
1021e34bc:     	csel	w8, w24, w8, eq
1021e34c0:     	mov	w9, #0x2300             ; =8960
1021e34c4:     	orr	w9, w8, w9
1021e34c8:     	cmp	w0, #0x0
1021e34cc:     	csel	w2, w8, w9, eq
1021e34d0:     	add	x0, sp, #0x60
1021e34d4:     	mov	x1, x22
1021e34d8:     	mov	x3, x21
1021e34dc:     	mov	x4, x20
1021e34e0:     	mov	x5, x23
1021e34e4:     	mov	x6, x19
1021e34e8:     	bl	0x102079238
1021e34ec:     	str	x0, [x19, #0x20]
1021e34f0:     	mov	w8, #0x1                ; =1
1021e34f4:     	str	w8, [x19, #0x18]
1021e34f8:     	adrp	x0, 0x104d66000
1021e34fc:     	add	x0, x0, #0x138
1021e3500:     	bl	0x10214de74
1021e3504:     	mov	x1, x0
1021e3508:     	add	x0, sp, #0x8
1021e350c:     	bl	0x1020cc240
1021e3510:     	add	x1, sp, #0x8
1021e3514:     	mov	x0, x19
1021e3518:     	bl	0x1021de8f8
1021e351c:     	add	x0, sp, #0x8
1021e3520:     	bl	0x1020cc308
1021e3524:     	ldp	x29, x30, [sp, #0x160]
1021e3528:     	ldp	x20, x19, [sp, #0x150]
1021e352c:     	ldp	x22, x21, [sp, #0x140]
1021e3530:     	ldp	x24, x23, [sp, #0x130]
1021e3534:     	ldp	x26, x25, [sp, #0x120]
1021e3538:     	ldp	x28, x27, [sp, #0x110]
1021e353c:     	add	sp, sp, #0x170
1021e3540:     	ret
1021e3544:     	mov	x19, x0
1021e3548:     	add	x0, x28, #0x8
1021e354c:     	bl	0x10001022c
1021e3550:     	b	0x1021e356c
1021e3554:     	b	0x1021e3568
1021e3558:     	mov	x19, x0
1021e355c:     	add	x0, sp, #0x8
1021e3560:     	bl	0x1020cc308
1021e3564:     	b	0x1021e3590
1021e3568:     	mov	x19, x0
1021e356c:     	mov	x0, x19
1021e3570:     	bl	0x103bdd3dc
1021e3574:     	cmp	w27, #0x2
1021e3578:     	b.hi	0x1021e3580
1021e357c:     	bl	0x1021deb5c
1021e3580:     	bl	0x103bdd43c
1021e3584:     	brk	#0x1
1021e3588:     	mov	x19, x0
1021e358c:     	bl	0x103bdd3f4
1021e3590:     	mov	x0, x19
1021e3594:     	bl	0x103bda970
1021e3598:     	bl	0x1000102a0


FUNCTION 0x1028f25b0 size 488
1028f25b0:     	sub	sp, sp, #0x60
1028f25b4:     	stp	d9, d8, [sp, #0x20]
1028f25b8:     	stp	x22, x21, [sp, #0x30]
1028f25bc:     	stp	x20, x19, [sp, #0x40]
1028f25c0:     	stp	x29, x30, [sp, #0x50]
1028f25c4:     	add	x29, sp, #0x50
1028f25c8:     	mov	x19, x0
1028f25cc:     	stp	d0, d1, [sp, #0x10]
1028f25d0:     	str	x1, [sp, #0x8]
1028f25d4:     	ldr	w8, [x0, #0x60]
1028f25d8:     	cbz	w8, 0x1028f25e4
1028f25dc:     	ldr	d0, [x19, #0x88]
1028f25e0:     	b	0x1028f26ac
1028f25e4:     	ldr	w8, [x19, #0x8]
1028f25e8:     	cbz	w8, 0x1028f261c
1028f25ec:     	mov	x20, x1
1028f25f0:     	add	x0, sp, #0x10
1028f25f4:     	add	x1, x19, #0x78
1028f25f8:     	bl	0x102193618
1028f25fc:     	fmov	d8, d0
1028f2600:     	ldr	w8, [x19, #0x58]
1028f2604:     	cbz	w8, 0x1028f2630
1028f2608:     	ldr	x8, [x19, #0x50]
1028f260c:     	add	x8, x8, #0x5
1028f2610:     	cmp	x8, x20
1028f2614:     	cset	w21, gt
1028f2618:     	b	0x1028f2634
1028f261c:     	add	x0, sp, #0x10
1028f2620:     	add	x1, x19, #0x68
1028f2624:     	bl	0x102193618
1028f2628:     	ldr	d1, [x19, #0x10]
1028f262c:     	b	0x1028f26a8
1028f2630:     	mov	w21, #0x0               ; =0
1028f2634:     	ldr	w8, [x19, #0x5c]
1028f2638:     	fmov	d0, #0.50000000
1028f263c:     	fmov	d1, #1.00000000
1028f2640:     	cmp	w8, #0x1
1028f2644:     	fcsel	d9, d1, d0, lt
1028f2648:     	b.lt	0x1028f2690
1028f264c:     	tbnz	w21, #0x0, 0x1028f2690
1028f2650:     	bl	0x102194e64
1028f2654:     	ldr	w8, [x19, #0x5c]
1028f2658:     	scvtf	d0, w8
1028f265c:     	adrp	x9, 0x1044b8000
1028f2660:     	ldr	d1, [x9, #0xa0]
1028f2664:     	fmov	d2, #1.00000000
1028f2668:     	fmadd	d1, d0, d1, d2
1028f266c:     	fmov	d3, #-0.25000000
1028f2670:     	fmadd	d0, d0, d3, d2
1028f2674:     	cmp	w0, #0x1
1028f2678:     	fcsel	d0, d1, d0, eq
1028f267c:     	fcmp	d0, #0.0
1028f2680:     	movi	d1, #0000000000000000
1028f2684:     	fcsel	d9, d1, d0, mi
1028f2688:     	sub	w8, w8, #0x1
1028f268c:     	str	w8, [x19, #0x5c]
1028f2690:     	tbz	w21, #0x0, 0x1028f26e4
1028f2694:     	ldr	d0, [x19, #0x10]
1028f2698:     	fmul	d0, d8, d0
1028f269c:     	fmul	d0, d9, d0
1028f26a0:     	adrp	x8, 0x1042ec000
1028f26a4:     	ldr	d1, [x8, #0xb78]
1028f26a8:     	fmul	d0, d0, d1
1028f26ac:     	ldur	q1, [x19, #0x68]
1028f26b0:     	stur	q1, [x19, #0x78]
1028f26b4:     	ldr	q1, [sp, #0x10]
1028f26b8:     	stur	q1, [x19, #0x68]
1028f26bc:     	fmov	d1, #1.00000000
1028f26c0:     	fcmp	d0, d1
1028f26c4:     	fcsel	d0, d1, d0, gt
1028f26c8:     	str	d0, [x19, #0x88]
1028f26cc:     	ldp	x29, x30, [sp, #0x50]
1028f26d0:     	ldp	x20, x19, [sp, #0x40]
1028f26d4:     	ldp	x22, x21, [sp, #0x30]
1028f26d8:     	ldp	d9, d8, [sp, #0x20]
1028f26dc:     	add	sp, sp, #0x60
1028f26e0:     	ret
1028f26e4:     	ldr	x10, [x19, #0x20]
1028f26e8:     	ldr	x8, [x19, #0x38]
1028f26ec:     	lsr	x9, x8, #6
1028f26f0:     	and	x9, x9, #0x3fffffffffffff8
1028f26f4:     	ldr	x9, [x10, x9]
1028f26f8:     	and	x11, x8, #0x1ff
1028f26fc:     	ldr	x21, [x9, x11, lsl #3]
1028f2700:     	movi	d0, #0000000000000000
1028f2704:     	cmp	x21, x20
1028f2708:     	b.ge	0x1028f26ac
1028f270c:     	ldr	x9, [x19, #0x40]
1028f2710:     	sub	x9, x9, #0x1
1028f2714:     	add	x11, x9, x8
1028f2718:     	lsr	x12, x11, #6
1028f271c:     	and	x12, x12, #0x3fffffffffffff8
1028f2720:     	ldr	x10, [x10, x12]
1028f2724:     	and	x11, x11, #0x1ff
1028f2728:     	ldr	x10, [x10, x11, lsl #3]
1028f272c:     	cmp	x10, x20
1028f2730:     	b.ge	0x1028f2770
1028f2734:     	ldp	w10, w11, [x19, #0x48]
1028f2738:     	cmp	w10, w11
1028f273c:     	b.ge	0x1028f274c
1028f2740:     	add	w8, w10, #0x1
1028f2744:     	str	w8, [x19, #0x48]
1028f2748:     	b	0x1028f2760
1028f274c:     	add	x8, x8, #0x1
1028f2750:     	stp	x8, x9, [x19, #0x38]
1028f2754:     	add	x0, x19, #0x18
1028f2758:     	mov	w1, #0x1                ; =1
1028f275c:     	bl	0x102786d30
1028f2760:     	add	x0, x19, #0x18
1028f2764:     	add	x1, sp, #0x8
1028f2768:     	bl	0x1028f252c
1028f276c:     	ldr	x20, [sp, #0x8]
1028f2770:     	ldr	d0, [x19, #0x10]
1028f2774:     	fmul	d0, d8, d0
1028f2778:     	ldr	w8, [x19, #0x48]
1028f277c:     	scvtf	d1, w8
1028f2780:     	fmul	d0, d9, d0
1028f2784:     	fmul	d0, d0, d1
1028f2788:     	sub	x8, x20, x21
1028f278c:     	scvtf	d1, x8
1028f2790:     	fdiv	d0, d0, d1
1028f2794:     	b	0x1028f26ac

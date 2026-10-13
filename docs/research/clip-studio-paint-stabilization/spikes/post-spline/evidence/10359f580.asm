
FUNCTION 0x10359f580 size 460
10359f580:     	ldp	d17, d16, [sp, #0x10]
10359f584:     	ldr	d18, [sp, #0x20]
10359f588:     	ldp	d20, d19, [sp]
10359f58c:     	dup.2d	v21, v18[0]
10359f590:     	fmov	d22, #0.50000000
10359f594:     	fcmp	d18, d22
10359f598:     	b.pl	0x10359f640
10359f59c:     	adrp	x8, 0x10458c000
10359f5a0:     	ldr	q22, [x8, #0x660]
10359f5a4:     	adrp	x8, 0x10458c000
10359f5a8:     	ldr	q23, [x8, #0x670]
10359f5ac:     	fmla.2d	v23, v22, v21
10359f5b0:     	adrp	x8, 0x10458c000
10359f5b4:     	ldr	d21, [x8, #0x690]
10359f5b8:     	fmul	d21, d18, d21
10359f5bc:     	adrp	x8, 0x10458c000
10359f5c0:     	ldr	d22, [x8, #0x6a8]
10359f5c4:     	fmadd	d21, d21, d18, d22
10359f5c8:     	mov	x8, #0x4051000000000000 ; =4634485491540951040
10359f5cc:     	fmov	d22, x8
10359f5d0:     	mov	x8, #0x4058000000000000 ; =4636455816377925632
10359f5d4:     	fmov	d24, x8
10359f5d8:     	fmadd	d22, d18, d24, d22
10359f5dc:     	fmul	d22, d22, d18
10359f5e0:     	fmov	d24, #-12.00000000
10359f5e4:     	fmov	d25, #-16.00000000
10359f5e8:     	fmadd	d24, d18, d25, d24
10359f5ec:     	fmul	d24, d24, d18
10359f5f0:     	fmul.2d	v23, v23, v18[0]
10359f5f4:     	mov.d	v1[1], v2[0]
10359f5f8:     	fmul.2d	v1, v1, v23
10359f5fc:     	mov.d	v0[1], v3[0]
10359f600:     	fmul.2d	v0, v0, v23
10359f604:     	ext.16b	v0, v0, v0, #0x8
10359f608:     	fadd.2d	v0, v1, v0
10359f60c:     	mov.d	v5[1], v4[0]
10359f610:     	fmul.2d	v1, v5, v21[0]
10359f614:     	fadd.2d	v0, v1, v0
10359f618:     	mov.d	v7[1], v6[0]
10359f61c:     	fmul.2d	v1, v7, v22[0]
10359f620:     	mov.d	v19[1], v20[0]
10359f624:     	fadd.2d	v0, v1, v0
10359f628:     	fmul.2d	v1, v19, v24[0]
10359f62c:     	fadd.2d	v0, v1, v0
10359f630:     	fmov	d1, #2.00000000
10359f634:     	fmadd	d1, d18, d1, d1
10359f638:     	fmul	d1, d1, d18
10359f63c:     	b	0x10359f728
10359f640:     	adrp	x8, 0x10458c000
10359f644:     	ldr	q22, [x8, #0x630]
10359f648:     	fmul.2d	v22, v22, v18[0]
10359f64c:     	adrp	x8, 0x10458c000
10359f650:     	ldr	q23, [x8, #0x640]
10359f654:     	fmul.2d	v23, v23, v18[0]
10359f658:     	mov	x8, #0x4058000000000000 ; =4636455816377925632
10359f65c:     	fmov	d24, x8
10359f660:     	fmul	d24, d18, d24
10359f664:     	adrp	x8, 0x10458c000
10359f668:     	ldr	d25, [x8, #0x680]
10359f66c:     	fmul	d25, d18, d25
10359f670:     	fmadd	d25, d24, d18, d25
10359f674:     	adrp	x8, 0x10458c000
10359f678:     	ldr	d26, [x8, #0x688]
10359f67c:     	fadd	d25, d25, d26
10359f680:     	adrp	x8, 0x10458c000
10359f684:     	ldr	d26, [x8, #0x690]
10359f688:     	fmul	d26, d18, d26
10359f68c:     	adrp	x8, 0x10458c000
10359f690:     	ldr	d27, [x8, #0x698]
10359f694:     	fmul	d27, d18, d27
10359f698:     	fmadd	d26, d26, d18, d27
10359f69c:     	adrp	x8, 0x10458c000
10359f6a0:     	ldr	d27, [x8, #0x6a0]
10359f6a4:     	fadd	d26, d26, d27
10359f6a8:     	mov	x8, #-0x3fa1000000000000 ; =-4584945895639875584
10359f6ac:     	fmov	d27, x8
10359f6b0:     	fmul	d27, d18, d27
10359f6b4:     	fmadd	d24, d24, d18, d27
10359f6b8:     	fmov	d27, #28.00000000
10359f6bc:     	fadd	d24, d24, d27
10359f6c0:     	fmla.2d	v23, v21, v22
10359f6c4:     	adrp	x8, 0x10458c000
10359f6c8:     	ldr	q21, [x8, #0x650]
10359f6cc:     	fadd.2d	v21, v23, v21
10359f6d0:     	mov.d	v1[1], v2[0]
10359f6d4:     	fmul.2d	v1, v1, v21
10359f6d8:     	mov.d	v0[1], v3[0]
10359f6dc:     	fmul.2d	v0, v0, v21
10359f6e0:     	ext.16b	v0, v0, v0, #0x8
10359f6e4:     	mov.d	v5[1], v4[0]
10359f6e8:     	fadd.2d	v0, v1, v0
10359f6ec:     	fmul.2d	v1, v5, v25[0]
10359f6f0:     	fadd.2d	v0, v1, v0
10359f6f4:     	mov.d	v7[1], v6[0]
10359f6f8:     	fmul.2d	v1, v7, v26[0]
10359f6fc:     	fadd.2d	v0, v1, v0
10359f700:     	mov.d	v19[1], v20[0]
10359f704:     	fmul.2d	v1, v19, v24[0]
10359f708:     	fadd.2d	v0, v1, v0
10359f70c:     	fmov	d1, #-14.00000000
10359f710:     	fmul	d1, d18, d1
10359f714:     	fmov	d2, #18.00000000
10359f718:     	fmul	d2, d18, d2
10359f71c:     	fmadd	d1, d1, d18, d2
10359f720:     	fmov	d2, #-4.00000000
10359f724:     	fadd	d1, d1, d2
10359f728:     	mov.d	v16[1], v17[0]
10359f72c:     	fmul.2d	v1, v16, v1[0]
10359f730:     	fadd.2d	v0, v1, v0
10359f734:     	mov	x8, #0xc00000000000     ; =211106232532992
10359f738:     	movk	x8, #0x4058, lsl #48
10359f73c:     	dup.2d	v1, x8
10359f740:     	fdiv.2d	v1, v0, v1
10359f744:     	mov	d0, v1[1]
10359f748:     	ret

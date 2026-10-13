
FUNCTION 0x10359c60c size 320
10359c60c:     	sub	sp, sp, #0xa0
10359c610:     	stp	d15, d14, [sp, #0x40]
10359c614:     	stp	d13, d12, [sp, #0x50]
10359c618:     	stp	d11, d10, [sp, #0x60]
10359c61c:     	stp	d9, d8, [sp, #0x70]
10359c620:     	stp	x20, x19, [sp, #0x80]
10359c624:     	stp	x29, x30, [sp, #0x90]
10359c628:     	add	x29, sp, #0x90
10359c62c:     	stp	d0, d1, [sp, #0x30]
10359c630:     	cmp	w1, #0x1
10359c634:     	b.lt	0x10359c724
10359c638:     	mov	x19, x1
10359c63c:     	mov	x20, x0
10359c640:     	fmov	d9, d7
10359c644:     	fmov	d12, d6
10359c648:     	fmov	d13, d4
10359c64c:     	fmov	d14, d3
10359c650:     	fmov	d15, d2
10359c654:     	fmov	d10, d1
10359c658:     	fmov	d8, d0
10359c65c:     	scvtf	d0, w1
10359c660:     	fmov	d16, #1.00000000
10359c664:     	fdiv	d11, d16, d0
10359c668:     	movi	d16, #0000000000000000
10359c66c:     	stp	d11, d5, [sp, #0x8]
10359c670:     	str	d16, [sp, #0x18]
10359c674:     	fmov	d0, #1.00000000
10359c678:     	fsub	d0, d0, d11
10359c67c:     	fmul	d21, d0, d0
10359c680:     	fadd	d16, d0, d0
10359c684:     	fmul	d19, d11, d16
10359c688:     	fmul	d17, d11, d11
10359c68c:     	fmul	d16, d15, d19
10359c690:     	fmadd	d16, d21, d8, d16
10359c694:     	fmadd	d18, d17, d12, d16
10359c698:     	fmul	d16, d14, d19
10359c69c:     	fmadd	d16, d21, d10, d16
10359c6a0:     	fmadd	d20, d17, d9, d16
10359c6a4:     	fmul	d21, d0, d21
10359c6a8:     	fmov	d16, #3.00000000
10359c6ac:     	fmul	d16, d0, d16
10359c6b0:     	fmul	d0, d0, d16
10359c6b4:     	fmul	d0, d11, d0
10359c6b8:     	fmul	d16, d11, d16
10359c6bc:     	fmul	d16, d11, d16
10359c6c0:     	fmul	d19, d11, d17
10359c6c4:     	fmul	d17, d15, d0
10359c6c8:     	fmadd	d17, d21, d8, d17
10359c6cc:     	fmadd	d17, d16, d13, d17
10359c6d0:     	fmadd	d17, d19, d12, d17
10359c6d4:     	fmul	d0, d14, d0
10359c6d8:     	fmadd	d0, d21, d10, d0
10359c6dc:     	fmadd	d0, d16, d5, d0
10359c6e0:     	fmadd	d0, d19, d9, d0
10359c6e4:     	cmp	w20, #0x0
10359c6e8:     	fcsel	d16, d18, d17, eq
10359c6ec:     	fcsel	d0, d20, d0, eq
10359c6f0:     	stp	d16, d0, [sp, #0x20]
10359c6f4:     	add	x0, sp, #0x30
10359c6f8:     	add	x1, sp, #0x20
10359c6fc:     	bl	0x102193618
10359c700:     	ldp	d5, d16, [sp, #0x10]
10359c704:     	fadd	d16, d16, d0
10359c708:     	ldr	q0, [sp, #0x20]
10359c70c:     	str	q0, [sp, #0x30]
10359c710:     	ldr	d0, [sp, #0x8]
10359c714:     	fadd	d11, d0, d11
10359c718:     	subs	w19, w19, #0x1
10359c71c:     	b.ne	0x10359c670
10359c720:     	b	0x10359c728
10359c724:     	movi	d16, #0000000000000000
10359c728:     	fmov	d0, d16
10359c72c:     	ldp	x29, x30, [sp, #0x90]
10359c730:     	ldp	x20, x19, [sp, #0x80]
10359c734:     	ldp	d9, d8, [sp, #0x70]
10359c738:     	ldp	d11, d10, [sp, #0x60]
10359c73c:     	ldp	d13, d12, [sp, #0x50]
10359c740:     	ldp	d15, d14, [sp, #0x40]
10359c744:     	add	sp, sp, #0xa0
10359c748:     	ret

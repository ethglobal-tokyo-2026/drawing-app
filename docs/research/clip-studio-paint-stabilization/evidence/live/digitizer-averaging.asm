
FUNCTION 0x10213655c size 104
10213655c:     	adrp	x8, 0x104a30000
102136560:     	add	x8, x8, #0x6a8
102136564:     	str	x8, [x0]
102136568:     	movi.2d	v0, #0000000000000000
10213656c:     	stur	q0, [x0, #0x8]
102136570:     	stur	q0, [x0, #0x18]
102136574:     	stur	q0, [x0, #0x28]
102136578:     	stur	q0, [x0, #0x38]
10213657c:     	adrp	x8, 0x104517000
102136580:     	ldr	d1, [x8, #0xf58]
102136584:     	str	d1, [x0, #0x48]
102136588:     	str	wzr, [x0, #0x50]
10213658c:     	stp	xzr, xzr, [x0, #0x58]
102136590:     	str	wzr, [x0, #0x68]
102136594:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
102136598:     	stp	xzr, xzr, [x0, #0x78]
10213659c:     	str	x8, [x0, #0x70]
1021365a0:     	str	wzr, [x0, #0x88]
1021365a4:     	stp	q0, q0, [x0, #0x90]
1021365a8:     	stp	q0, q0, [x0, #0xb0]
1021365ac:     	str	q0, [x0, #0xd0]
1021365b0:     	adrp	x8, 0x1042ed000
1021365b4:     	ldr	d0, [x8, #0x458]
1021365b8:     	str	d0, [x0, #0xe0]
1021365bc:     	str	wzr, [x0, #0xe8]
1021365c0:     	ret

FUNCTION 0x1021365c4 size 104
1021365c4:     	adrp	x8, 0x104a30000
1021365c8:     	add	x8, x8, #0x6a8
1021365cc:     	str	x8, [x0]
1021365d0:     	movi.2d	v0, #0000000000000000
1021365d4:     	stur	q0, [x0, #0x8]
1021365d8:     	stur	q0, [x0, #0x18]
1021365dc:     	stur	q0, [x0, #0x28]
1021365e0:     	stur	q0, [x0, #0x38]
1021365e4:     	adrp	x8, 0x104517000
1021365e8:     	ldr	d1, [x8, #0xf58]
1021365ec:     	str	d1, [x0, #0x48]
1021365f0:     	str	wzr, [x0, #0x50]
1021365f4:     	stp	xzr, xzr, [x0, #0x58]
1021365f8:     	str	wzr, [x0, #0x68]
1021365fc:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
102136600:     	stp	xzr, xzr, [x0, #0x78]
102136604:     	str	x8, [x0, #0x70]
102136608:     	str	wzr, [x0, #0x88]
10213660c:     	stp	q0, q0, [x0, #0x90]
102136610:     	stp	q0, q0, [x0, #0xb0]
102136614:     	str	q0, [x0, #0xd0]
102136618:     	adrp	x8, 0x1042ed000
10213661c:     	ldr	d0, [x8, #0x458]
102136620:     	str	d0, [x0, #0xe0]
102136624:     	str	wzr, [x0, #0xe8]
102136628:     	ret

FUNCTION 0x10213662c size 48
10213662c:     	stp	x20, x19, [sp, #-0x20]!
102136630:     	stp	x29, x30, [sp, #0x10]
102136634:     	add	x29, sp, #0x10
102136638:     	mov	x19, x0
10213663c:     	adrp	x8, 0x104a30000
102136640:     	add	x8, x8, #0x6a8
102136644:     	str	x8, [x0], #0x8
102136648:     	bl	0x1021372b0
10213664c:     	mov	x0, x19
102136650:     	ldp	x29, x30, [sp, #0x10]
102136654:     	ldp	x20, x19, [sp], #0x20
102136658:     	ret

FUNCTION 0x10213665c size 48
10213665c:     	stp	x20, x19, [sp, #-0x20]!
102136660:     	stp	x29, x30, [sp, #0x10]
102136664:     	add	x29, sp, #0x10
102136668:     	mov	x19, x0
10213666c:     	adrp	x8, 0x104a30000
102136670:     	add	x8, x8, #0x6a8
102136674:     	str	x8, [x0], #0x8
102136678:     	bl	0x1021372b0
10213667c:     	mov	x0, x19
102136680:     	ldp	x29, x30, [sp, #0x10]
102136684:     	ldp	x20, x19, [sp], #0x20
102136688:     	ret

FUNCTION 0x10213668c size 48
10213668c:     	stp	x20, x19, [sp, #-0x20]!
102136690:     	stp	x29, x30, [sp, #0x10]
102136694:     	add	x29, sp, #0x10
102136698:     	mov	x19, x0
10213669c:     	adrp	x8, 0x104a30000
1021366a0:     	add	x8, x8, #0x6a8
1021366a4:     	str	x8, [x0], #0x8
1021366a8:     	bl	0x1021372b0
1021366ac:     	mov	x0, x19
1021366b0:     	ldp	x29, x30, [sp, #0x10]
1021366b4:     	ldp	x20, x19, [sp], #0x20
1021366b8:     	b	0x103bdd34c

FUNCTION 0x1021366bc size 180
1021366bc:     	str	w1, [x0, #0x3c]
1021366c0:     	str	w2, [x0, #0x68]
1021366c4:     	str	w1, [x0, #0x50]
1021366c8:     	mov	x8, x1
1021366cc:     	cmp	w1, #0x3
1021366d0:     	b.lt	0x102136704
1021366d4:     	cmp	w1, w2
1021366d8:     	csel	w8, w1, w2, lt
1021366dc:     	asr	w8, w8, #1
1021366e0:     	str	w8, [x0, #0x50]
1021366e4:     	cmp	w8, #0xf
1021366e8:     	b.le	0x1021366f4
1021366ec:     	mov	w8, #0xf                ; =15
1021366f0:     	b	0x102136700
1021366f4:     	cmp	w8, #0x1
1021366f8:     	b.gt	0x102136704
1021366fc:     	mov	w8, #0x2                ; =2
102136700:     	str	w8, [x0, #0x50]
102136704:     	cbz	w2, 0x102136718
102136708:     	scvtf	d0, w2
10213670c:     	fmov	d1, #1.00000000
102136710:     	fdiv	d0, d1, d0
102136714:     	b	0x10213671c
102136718:     	fmov	d0, #1.00000000
10213671c:     	str	d0, [x0, #0x70]
102136720:     	cbz	w4, 0x102136734
102136724:     	adrp	x9, 0x1042e4000
102136728:     	ldr	d0, [x9, #0x790]
10213672c:     	str	d0, [x0, #0x40]
102136730:     	b	0x102136760
102136734:     	cmp	w1, #0x3
102136738:     	b.lt	0x10213675c
10213673c:     	cbz	w3, 0x10213675c
102136740:     	adrp	x9, 0x1042ed000
102136744:     	ldr	d0, [x9, #0x458]
102136748:     	str	d0, [x0, #0x40]
10213674c:     	lsl	w9, w1, #1
102136750:     	add	w9, w9, #0x64
102136754:     	ucvtf	d0, w9
102136758:     	b	0x102136764
10213675c:     	str	xzr, [x0, #0x40]
102136760:     	movi	d0, #0000000000000000
102136764:     	scvtf	d1, w8
102136768:     	stp	d1, d0, [x0, #0x58]
10213676c:     	ret

FUNCTION 0x102136770 size 8
102136770:     	ldr	x0, [x0, #0x80]
102136774:     	ret

FUNCTION 0x102136778 size 8
102136778:     	ldr	w0, [x0, #0x68]
10213677c:     	ret

FUNCTION 0x102136780 size 8
102136780:     	ldr	d0, [x0, #0x58]
102136784:     	ret

FUNCTION 0x102136788 size 8
102136788:     	ldr	w0, [x0, #0xd8]
10213678c:     	ret

FUNCTION 0x102136790 size 8
102136790:     	ldr	w0, [x0, #0x88]
102136794:     	ret

FUNCTION 0x102136798 size 8
102136798:     	ldp	d0, d1, [x0, #0xb8]
10213679c:     	ret

FUNCTION 0x1021367a0 size 8
1021367a0:     	str	w1, [x0, #0xd8]
1021367a4:     	ret

FUNCTION 0x1021367a8 size 8
1021367a8:     	str	w1, [x0, #0xdc]
1021367ac:     	ret

FUNCTION 0x1021367b0 size 8
1021367b0:     	str	w1, [x0, #0x88]
1021367b4:     	ret

FUNCTION 0x1021367b8 size 8
1021367b8:     	str	w1, [x0, #0xe0]
1021367bc:     	ret

FUNCTION 0x1021367c0 size 528
1021367c0:     	sub	sp, sp, #0xb0
1021367c4:     	stp	d11, d10, [sp, #0x40]
1021367c8:     	stp	d9, d8, [sp, #0x50]
1021367cc:     	stp	x26, x25, [sp, #0x60]
1021367d0:     	stp	x24, x23, [sp, #0x70]
1021367d4:     	stp	x22, x21, [sp, #0x80]
1021367d8:     	stp	x20, x19, [sp, #0x90]
1021367dc:     	stp	x29, x30, [sp, #0xa0]
1021367e0:     	add	x29, sp, #0xa0
1021367e4:     	mov	x20, x7
1021367e8:     	fmov	d10, d2
1021367ec:     	fmov	d9, d1
1021367f0:     	fmov	d8, d0
1021367f4:     	cbz	w6, 0x102136808
1021367f8:     	stp	d8, d9, [x20, #0x8]
1021367fc:     	mov	w0, #0x1                ; =1
102136800:     	str	d10, [x20, #0x18]
102136804:     	b	0x1021369ac
102136808:     	mov	x23, x5
10213680c:     	mov	x24, x4
102136810:     	mov	x25, x3
102136814:     	mov	x21, x2
102136818:     	mov	x22, x1
10213681c:     	mov	x19, x0
102136820:     	ldr	w8, [x0, #0x88]
102136824:     	fcmp	d10, #0.0
102136828:     	ccmp	w8, #0x0, #0x4, ls
10213682c:     	b.eq	0x102136870
102136830:     	ldp	d1, d0, [x19, #0xc8]
102136834:     	adrp	x8, 0x1042ee000
102136838:     	ldr	d2, [x8, #0x808]
10213683c:     	fadd	d2, d1, d2
102136840:     	fcmp	d0, d2
102136844:     	b.le	0x102136870
102136848:     	fsub	d0, d0, d1
10213684c:     	fsub	d0, d1, d0
102136850:     	adrp	x8, 0x104517000
102136854:     	ldr	d10, [x8, #0xf60]
102136858:     	fcmp	d0, d10
10213685c:     	b.mi	0x102136870
102136860:     	fcmp	d0, #0.0
102136864:     	fmov	d10, d0
102136868:     	b.le	0x102136870
10213686c:     	movi	d10, #0000000000000000
102136870:     	stp	d8, d9, [sp, #0x30]
102136874:     	str	d10, [sp, #0x28]
102136878:     	stp	d8, d9, [sp, #0x8]
10213687c:     	str	d10, [sp, #0x18]
102136880:     	str	x21, [sp, #0x20]
102136884:     	add	x0, x19, #0x8
102136888:     	add	x1, sp, #0x8
10213688c:     	bl	0x1021369d0
102136890:     	ldr	w8, [x19, #0x38]
102136894:     	cmp	w8, #0x3e8
102136898:     	b.lt	0x1021368c0
10213689c:     	ldur	q0, [x19, #0x28]
1021368a0:     	adrp	x8, 0x104303000
1021368a4:     	ldr	q1, [x8, #0xce0]
1021368a8:     	add.2d	v0, v0, v1
1021368ac:     	stur	q0, [x19, #0x28]
1021368b0:     	add	x0, x19, #0x8
1021368b4:     	mov	w1, #0x1                ; =1
1021368b8:     	bl	0x1021374fc
1021368bc:     	b	0x1021368c8
1021368c0:     	add	w8, w8, #0x1
1021368c4:     	str	w8, [x19, #0x38]
1021368c8:     	ldr	w8, [x19, #0x3c]
1021368cc:     	cmp	w8, #0x0
1021368d0:     	b.gt	0x1021368dc
1021368d4:     	ldr	w8, [x19, #0x44]
1021368d8:     	cbz	w8, 0x1021368f8
1021368dc:     	add	x1, sp, #0x30
1021368e0:     	add	x2, sp, #0x28
1021368e4:     	mov	x0, x19
1021368e8:     	mov	x3, x21
1021368ec:     	mov	x4, x25
1021368f0:     	bl	0x102136a5c
1021368f4:     	cbnz	w0, 0x102136900
1021368f8:     	ldr	x8, [sp, #0x20]
1021368fc:     	str	x8, [x19, #0x80]
102136900:     	ldr	w8, [x22]
102136904:     	str	w8, [sp, #0x4]
102136908:     	add	x1, sp, #0x30
10213690c:     	add	x2, sp, #0x28
102136910:     	add	x3, sp, #0x4
102136914:     	mov	x0, x19
102136918:     	bl	0x102137058
10213691c:     	ldr	w8, [sp, #0x4]
102136920:     	cbz	w24, 0x102136970
102136924:     	cmp	w8, #0x1
102136928:     	b.ne	0x102136970
10213692c:     	ldr	w9, [x19, #0xe0]
102136930:     	cbz	w9, 0x102136950
102136934:     	ldr	x10, [x19, #0x78]
102136938:     	ldr	w9, [x19, #0xe4]
10213693c:     	sub	x10, x21, x10
102136940:     	cmp	x10, x23
102136944:     	b.lt	0x10213695c
102136948:     	str	w9, [x19, #0xe8]
10213694c:     	b	0x102136970
102136950:     	ldp	w9, w10, [x19, #0xe4]
102136954:     	cmp	w9, w10
102136958:     	b.ge	0x102136970
10213695c:     	mov	w0, #0x0                ; =0
102136960:     	add	w8, w9, #0x1
102136964:     	str	w8, [x19, #0xe4]
102136968:     	ldr	d0, [sp, #0x28]
10213696c:     	b	0x102136990
102136970:     	str	wzr, [x19, #0xe4]
102136974:     	str	x21, [x19, #0x78]
102136978:     	str	w8, [x22]
10213697c:     	ldr	d0, [sp, #0x28]
102136980:     	ldr	q1, [sp, #0x30]
102136984:     	stur	q1, [x20, #0x8]
102136988:     	str	d0, [x20, #0x18]
10213698c:     	mov	w0, #0x1                ; =1
102136990:     	ldr	q1, [x19, #0x90]
102136994:     	ldr	q2, [sp, #0x30]
102136998:     	stp	q2, q1, [x19, #0x90]
10213699c:     	ldr	d1, [x19, #0xc8]
1021369a0:     	stp	d10, d1, [x19, #0xc8]
1021369a4:     	stp	d8, d9, [x19, #0xb8]
1021369a8:     	str	d0, [x19, #0xb0]
1021369ac:     	ldp	x29, x30, [sp, #0xa0]
1021369b0:     	ldp	x20, x19, [sp, #0x90]
1021369b4:     	ldp	x22, x21, [sp, #0x80]
1021369b8:     	ldp	x24, x23, [sp, #0x70]
1021369bc:     	ldp	x26, x25, [sp, #0x60]
1021369c0:     	ldp	d9, d8, [sp, #0x50]
1021369c4:     	ldp	d11, d10, [sp, #0x40]
1021369c8:     	add	sp, sp, #0xb0
1021369cc:     	ret

FUNCTION 0x1021369d0 size 140
1021369d0:     	stp	x20, x19, [sp, #-0x20]!
1021369d4:     	stp	x29, x30, [sp, #0x10]
1021369d8:     	add	x29, sp, #0x10
1021369dc:     	mov	x20, x1
1021369e0:     	mov	x19, x0
1021369e4:     	ldur	q0, [x0, #0x8]
1021369e8:     	mov.d	x9, v0[1]
1021369ec:     	fmov	x8, d0
1021369f0:     	subs	x10, x9, x8
1021369f4:     	lsl	x10, x10, #4
1021369f8:     	sub	x10, x10, #0x1
1021369fc:     	cmp	x9, x8
102136a00:     	csel	x10, xzr, x10, eq
102136a04:     	ldp	x9, x11, [x0, #0x20]
102136a08:     	add	x9, x11, x9
102136a0c:     	cmp	x10, x9
102136a10:     	b.ne	0x102136a28
102136a14:     	mov	x0, x19
102136a18:     	bl	0x102137348
102136a1c:     	ldr	x8, [x19, #0x8]
102136a20:     	ldp	x9, x10, [x19, #0x20]
102136a24:     	add	x9, x10, x9
102136a28:     	lsr	x10, x9, #4
102136a2c:     	and	x10, x10, #0xffffffffffffff8
102136a30:     	ldr	x8, [x8, x10]
102136a34:     	and	x9, x9, #0x7f
102136a38:     	add	x8, x8, x9, lsl #5
102136a3c:     	ldp	q0, q1, [x20]
102136a40:     	stp	q0, q1, [x8]
102136a44:     	ldr	x8, [x19, #0x28]
102136a48:     	add	x8, x8, #0x1
102136a4c:     	str	x8, [x19, #0x28]
102136a50:     	ldp	x29, x30, [sp, #0x10]
102136a54:     	ldp	x20, x19, [sp], #0x20
102136a58:     	ret

FUNCTION 0x102136a5c size 1532
102136a5c:     	sub	sp, sp, #0x110
102136a60:     	stp	d9, d8, [sp, #0xa0]
102136a64:     	stp	x28, x27, [sp, #0xb0]
102136a68:     	stp	x26, x25, [sp, #0xc0]
102136a6c:     	stp	x24, x23, [sp, #0xd0]
102136a70:     	stp	x22, x21, [sp, #0xe0]
102136a74:     	stp	x20, x19, [sp, #0xf0]
102136a78:     	stp	x29, x30, [sp, #0x100]
102136a7c:     	add	x29, sp, #0x100
102136a80:     	mov	x21, x3
102136a84:     	mov	x23, x2
102136a88:     	mov	x20, x1
102136a8c:     	mov	x22, x0
102136a90:     	ldp	w24, w8, [x0, #0x3c]
102136a94:     	cbz	w8, 0x102136b1c
102136a98:     	ldr	w8, [x22, #0x38]
102136a9c:     	subs	w8, w8, #0x2
102136aa0:     	b.lt	0x102136b1c
102136aa4:     	ldr	x9, [x22, #0x28]
102136aa8:     	add	x8, x9, x8
102136aac:     	ldr	x9, [x22, #0x10]
102136ab0:     	lsr	x10, x8, #4
102136ab4:     	and	x10, x10, #0xffffffffffffff8
102136ab8:     	ldr	x9, [x9, x10]
102136abc:     	and	x8, x8, #0x7f
102136ac0:     	add	x0, x9, x8, lsl #5
102136ac4:     	ldr	x8, [x0, #0x18]
102136ac8:     	sub	x8, x21, x8
102136acc:     	cmp	x8, #0x3e8
102136ad0:     	b.gt	0x102136f8c
102136ad4:     	mov	x1, x20
102136ad8:     	bl	0x102193618
102136adc:     	ldp	d2, d1, [x22, #0x58]
102136ae0:     	fsub	d0, d1, d0
102136ae4:     	fdiv	d0, d0, d1
102136ae8:     	fmov	d1, #0.50000000
102136aec:     	fmul	d1, d0, d1
102136af0:     	fcmp	d0, #0.0
102136af4:     	fcsel	d0, d1, d0, gt
102136af8:     	fadd	d0, d2, d0
102136afc:     	str	d0, [x22, #0x58]
102136b00:     	fmov	d1, #2.00000000
102136b04:     	fcmp	d0, d1
102136b08:     	b.mi	0x102136e24
102136b0c:     	ldr	w8, [x22, #0x88]
102136b10:     	cbz	w8, 0x102136e14
102136b14:     	ldr	w8, [x22, #0x3c]
102136b18:     	b	0x102136e18
102136b1c:     	ldr	w8, [x22, #0x44]
102136b20:     	cmp	w8, #0x0
102136b24:     	ccmp	w24, #0x1e, #0x0, ne
102136b28:     	b.le	0x102136b6c
102136b2c:     	ldr	w8, [x22, #0x88]
102136b30:     	cbz	w8, 0x102136cf8
102136b34:     	ldr	d0, [x22, #0x58]
102136b38:     	scvtf	d1, w24
102136b3c:     	fcmp	d0, d1
102136b40:     	b.pl	0x102136e20
102136b44:     	fsub	d2, d1, d0
102136b48:     	fmov	d3, #1.00000000
102136b4c:     	fadd	d2, d2, d3
102136b50:     	fdiv	d2, d2, d1
102136b54:     	fmov	d3, #0.50000000
102136b58:     	fcmp	d2, d3
102136b5c:     	fcsel	d2, d3, d2, gt
102136b60:     	fadd	d0, d0, d2
102136b64:     	str	d0, [x22, #0x58]
102136b68:     	b	0x102136e1c
102136b6c:     	ldr	x8, [x22, #0x30]
102136b70:     	cbz	x8, 0x102136f8c
102136b74:     	cbz	w4, 0x102136b94
102136b78:     	ldr	d0, [x22, #0x58]
102136b7c:     	scvtf	d1, w24
102136b80:     	fcmp	d0, d1
102136b84:     	b.pl	0x102136b94
102136b88:     	mov	w26, #0x0               ; =0
102136b8c:     	mov	w25, #0x1               ; =1
102136b90:     	b	0x102136b9c
102136b94:     	mov	w25, #0x0               ; =0
102136b98:     	mov	w26, #0x1               ; =1
102136b9c:     	ldr	w9, [x22, #0x38]
102136ba0:     	cmp	w9, w8
102136ba4:     	csel	w19, w9, w8, lt
102136ba8:     	ldp	w10, w11, [x22, #0x48]
102136bac:     	mov	w9, #0x1e               ; =30
102136bb0:     	cmp	w19, #0x1e
102136bb4:     	csel	w27, w19, w9, lt
102136bb8:     	movi.2d	v0, #0000000000000000
102136bbc:     	stp	q0, q0, [sp, #0x70]
102136bc0:     	sub	w9, w19, #0x1
102136bc4:     	cmp	x8, w9, sxtw
102136bc8:     	b.ls	0x10213704c
102136bcc:     	stp	w10, w11, [sp, #0x28]
102136bd0:     	sxtw	x28, w9
102136bd4:     	ldr	x8, [x22, #0x28]
102136bd8:     	add	x8, x8, x28
102136bdc:     	ldr	x9, [x22, #0x10]
102136be0:     	lsr	x10, x8, #4
102136be4:     	and	x10, x10, #0xffffffffffffff8
102136be8:     	ldr	x9, [x9, x10]
102136bec:     	and	x8, x8, #0x7f
102136bf0:     	add	x8, x9, x8, lsl #5
102136bf4:     	ldp	q1, q0, [x8]
102136bf8:     	stp	q1, q0, [sp, #0x50]
102136bfc:     	add	x0, sp, #0x70
102136c00:     	add	x1, sp, #0x50
102136c04:     	bl	0x10221b72c
102136c08:     	movi	d8, #0000000000000000
102136c0c:     	cmp	w19, #0x2
102136c10:     	b.lt	0x102136d08
102136c14:     	str	w26, [sp, #0xc]
102136c18:     	str	x28, [sp, #0x10]
102136c1c:     	str	w25, [sp, #0x1c]
102136c20:     	str	x23, [sp, #0x20]
102136c24:     	mov	w28, #0x0               ; =0
102136c28:     	mov	w23, #0x0               ; =0
102136c2c:     	mov	w26, #0x2               ; =2
102136c30:     	cmp	w27, #0x2
102136c34:     	csel	w8, w27, w26, gt
102136c38:     	sub	x25, x19, #0x2
102136c3c:     	sub	x19, x8, #0x1
102136c40:     	ldr	x8, [x22, #0x30]
102136c44:     	cmp	x8, x25
102136c48:     	b.ls	0x10213704c
102136c4c:     	ldr	x8, [x22, #0x28]
102136c50:     	add	x8, x25, x8
102136c54:     	ldr	x9, [x22, #0x10]
102136c58:     	lsr	x10, x8, #4
102136c5c:     	and	x10, x10, #0xffffffffffffff8
102136c60:     	ldr	x9, [x9, x10]
102136c64:     	and	x8, x8, #0x7f
102136c68:     	add	x8, x9, x8, lsl #5
102136c6c:     	ldp	q1, q0, [x8]
102136c70:     	stp	q1, q0, [sp, #0x30]
102136c74:     	ldp	d0, d1, [sp, #0x30]
102136c78:     	ldp	d2, d3, [sp, #0x50]
102136c7c:     	fsub	d0, d0, d2
102136c80:     	fsub	d1, d1, d3
102136c84:     	fmul	d1, d1, d1
102136c88:     	fmadd	d0, d0, d0, d1
102136c8c:     	fsqrt	d0, d0
102136c90:     	fcmp	d0, #0.0
102136c94:     	b.le	0x102136cac
102136c98:     	fadd	d8, d8, d0
102136c9c:     	add	w28, w28, #0x1
102136ca0:     	add	x0, sp, #0x70
102136ca4:     	add	x1, sp, #0x30
102136ca8:     	bl	0x10221b72c
102136cac:     	ldp	q0, q1, [sp, #0x30]
102136cb0:     	stp	q0, q1, [sp, #0x50]
102136cb4:     	ldr	d0, [sp, #0x40]
102136cb8:     	fcmp	d0, #0.0
102136cbc:     	b.ls	0x102136cc8
102136cc0:     	mov	w23, #0x1               ; =1
102136cc4:     	b	0x102136cd8
102136cc8:     	cbnz	w23, 0x102136d14
102136ccc:     	ldr	w8, [x22, #0x88]
102136cd0:     	cbz	w8, 0x102136d14
102136cd4:     	mov	w23, #0x0               ; =0
102136cd8:     	add	w26, w26, #0x1
102136cdc:     	sub	x25, x25, #0x1
102136ce0:     	subs	x19, x19, #0x1
102136ce4:     	b.ne	0x102136c40
102136ce8:     	mov	x26, x27
102136cec:     	ldr	x23, [sp, #0x20]
102136cf0:     	ldr	w25, [sp, #0x1c]
102136cf4:     	b	0x102136d3c
102136cf8:     	ldr	w8, [x22, #0x50]
102136cfc:     	scvtf	d0, w8
102136d00:     	str	d0, [x22, #0x58]
102136d04:     	b	0x102136e30
102136d08:     	mov	x26, x27
102136d0c:     	movi	d0, #0000000000000000
102136d10:     	b	0x102136d58
102136d14:     	cmp	w26, #0x2
102136d18:     	ldr	x23, [sp, #0x20]
102136d1c:     	ldr	w25, [sp, #0x1c]
102136d20:     	b.ne	0x102136d3c
102136d24:     	movi	d0, #0000000000000000
102136d28:     	ldr	w8, [sp, #0xc]
102136d2c:     	tbnz	w8, #0x0, 0x102136d38
102136d30:     	ldr	w8, [x22, #0x50]
102136d34:     	scvtf	d0, w8
102136d38:     	str	d0, [x22, #0x58]
102136d3c:     	cmp	w28, #0x1
102136d40:     	b.lt	0x102136d50
102136d44:     	ucvtf	d0, w28
102136d48:     	fdiv	d0, d8, d0
102136d4c:     	b	0x102136d54
102136d50:     	movi	d0, #0000000000000000
102136d54:     	ldr	x28, [sp, #0x10]
102136d58:     	fcmp	d0, #0.0
102136d5c:     	csinc	w8, w25, wzr, le
102136d60:     	tbz	w8, #0x0, 0x102136e0c
102136d64:     	fmov	d1, #10.00000000
102136d68:     	ldr	w8, [sp, #0x2c]
102136d6c:     	scvtf	d2, w8
102136d70:     	fdiv	d2, d2, d1
102136d74:     	fsub	d0, d2, d0
102136d78:     	fcmp	d0, #0.0
102136d7c:     	b.le	0x102136db8
102136d80:     	ldr	w8, [sp, #0x28]
102136d84:     	scvtf	d2, w8
102136d88:     	fdiv	d1, d2, d1
102136d8c:     	ldp	d2, d3, [sp, #0x80]
102136d90:     	ldp	d4, d5, [sp, #0x70]
102136d94:     	fsub	d2, d2, d4
102136d98:     	fsub	d3, d3, d5
102136d9c:     	fmul	d3, d3, d3
102136da0:     	fmadd	d2, d2, d2, d3
102136da4:     	fsqrt	d2, d2
102136da8:     	fdiv	d2, d2, d8
102136dac:     	fmul	d0, d1, d0
102136db0:     	fmul	d0, d0, d2
102136db4:     	fcvtzs	w24, d0
102136db8:     	ldr	w8, [x22, #0x88]
102136dbc:     	cmp	w8, #0x0
102136dc0:     	mov	w8, #0x3c               ; =60
102136dc4:     	mov	w9, #0x50               ; =80
102136dc8:     	csel	x8, x9, x8, eq
102136dcc:     	ldr	w8, [x22, x8]
102136dd0:     	cmp	w24, w8
102136dd4:     	csel	w8, w24, w8, gt
102136dd8:     	cmp	w25, #0x0
102136ddc:     	fmov	d0, #0.25000000
102136de0:     	fmov	d1, #0.50000000
102136de4:     	fcsel	d2, d1, d0, ne
102136de8:     	ldr	d0, [x22, #0x58]
102136dec:     	scvtf	d1, w8
102136df0:     	fabd	d3, d0, d1
102136df4:     	fcmp	d2, d3
102136df8:     	b.gt	0x102136e98
102136dfc:     	fcmp	d0, d1
102136e00:     	b.le	0x102136e90
102136e04:     	fsub	d1, d0, d2
102136e08:     	b	0x102136e98
102136e0c:     	ldr	d0, [x22, #0x58]
102136e10:     	b	0x102136ee4
102136e14:     	ldr	w8, [x22, #0x50]
102136e18:     	scvtf	d1, w8
102136e1c:     	fcmp	d0, d1
102136e20:     	b.le	0x102136e2c
102136e24:     	str	d1, [x22, #0x58]
102136e28:     	fmov	d0, d1
102136e2c:     	fcvtzs	w8, d0
102136e30:     	cmp	w8, #0x1
102136e34:     	b.ge	0x102136ef0
102136e38:     	ldr	w9, [x22, #0x38]
102136e3c:     	subs	w10, w9, #0x1
102136e40:     	b.lt	0x102136e7c
102136e44:     	mov	x9, #0x0                ; =0
102136e48:     	ldr	x11, [x22, #0x28]
102136e4c:     	add	x10, x11, x10
102136e50:     	ldr	x11, [x22, #0x10]
102136e54:     	lsr	x12, x10, #4
102136e58:     	and	x12, x12, #0xffffffffffffff8
102136e5c:     	ldr	x11, [x11, x12]
102136e60:     	and	x10, x10, #0x7f
102136e64:     	add	x10, x11, x10, lsl #5
102136e68:     	add	x11, x10, #0x18
102136e6c:     	movi.2d	v1, #0000000000000000
102136e70:     	movi	d2, #0000000000000000
102136e74:     	mov	w10, #0x1               ; =1
102136e78:     	b	0x102136f98
102136e7c:     	mov	x9, #0x0                ; =0
102136e80:     	movi.2d	v1, #0000000000000000
102136e84:     	movi	d2, #0000000000000000
102136e88:     	mov	w10, #0x1               ; =1
102136e8c:     	b	0x102136fa0
102136e90:     	b.pl	0x102136ea0
102136e94:     	fadd	d1, d2, d0
102136e98:     	str	d1, [x22, #0x58]
102136e9c:     	fmov	d0, d1
102136ea0:     	scvtf	d1, w26
102136ea4:     	fcmp	d0, d1
102136ea8:     	b.lt	0x102136eb4
102136eac:     	str	d1, [x22, #0x58]
102136eb0:     	fmov	d0, d1
102136eb4:     	tbnz	w25, #0x0, 0x102136ecc
102136eb8:     	scvtf	d1, w28
102136ebc:     	fcmp	d0, d1
102136ec0:     	b.lt	0x102136ecc
102136ec4:     	str	d1, [x22, #0x58]
102136ec8:     	fmov	d0, d1
102136ecc:     	mov	x8, #0x4059000000000000 ; =4636737291354636288
102136ed0:     	fmov	d1, x8
102136ed4:     	fcmp	d0, d1
102136ed8:     	b.lt	0x102136ee4
102136edc:     	str	x8, [x22, #0x58]
102136ee0:     	fmov	d0, x8
102136ee4:     	fcvtzs	w8, d0
102136ee8:     	cmp	w8, #0x0
102136eec:     	b.le	0x102136f8c
102136ef0:     	mov	w11, #0x0               ; =0
102136ef4:     	mov	x9, #0x0                ; =0
102136ef8:     	mov	w13, #0x0               ; =0
102136efc:     	movi.2d	v1, #0000000000000000
102136f00:     	movi	d2, #0000000000000000
102136f04:     	mov	w12, #-0x1              ; =-1
102136f08:     	cbnz	w13, 0x102136f4c
102136f0c:     	ldr	w10, [x22, #0x38]
102136f10:     	cmp	w11, w10
102136f14:     	b.ge	0x102136f4c
102136f18:     	add	w10, w12, w10
102136f1c:     	ldr	x13, [x22, #0x28]
102136f20:     	add	x10, x13, w10, sxtw
102136f24:     	ldr	x13, [x22, #0x10]
102136f28:     	lsr	x14, x10, #4
102136f2c:     	and	x14, x14, #0xffffffffffffff8
102136f30:     	ldr	x13, [x13, x14]
102136f34:     	and	x10, x10, #0x7f
102136f38:     	add	x14, x13, x10, lsl #5
102136f3c:     	ldr	x10, [x14, #0x18]
102136f40:     	sub	x10, x21, x10
102136f44:     	cmp	x10, #0x3e9
102136f48:     	b.lt	0x102136f7c
102136f4c:     	cbz	x9, 0x102136f8c
102136f50:     	mov	w10, #0x0               ; =0
102136f54:     	mov	w13, #0x1               ; =1
102136f58:     	ldr	q3, [x9]
102136f5c:     	fadd.2d	v1, v1, v3
102136f60:     	ldr	d3, [x9, #0x10]
102136f64:     	fadd	d2, d2, d3
102136f68:     	add	w11, w11, #0x1
102136f6c:     	sub	w12, w12, #0x1
102136f70:     	cmp	w8, w11
102136f74:     	b.ne	0x102136f08
102136f78:     	b	0x102136f94
102136f7c:     	mov	w13, #0x0               ; =0
102136f80:     	mov	w10, #0x1               ; =1
102136f84:     	mov	x9, x14
102136f88:     	b	0x102136f58
102136f8c:     	mov	w0, #0x0                ; =0
102136f90:     	b	0x102137028
102136f94:     	add	x11, x9, #0x18
102136f98:     	ldr	x11, [x11]
102136f9c:     	str	x11, [x22, #0x80]
102136fa0:     	scvtf	d3, w8
102136fa4:     	fsub	d0, d0, d3
102136fa8:     	fcmp	d0, #0.0
102136fac:     	b.eq	0x10213700c
102136fb0:     	cbz	w10, 0x102136ff8
102136fb4:     	ldr	w10, [x22, #0x38]
102136fb8:     	cmp	w8, w10
102136fbc:     	b.ge	0x102136ff8
102136fc0:     	mvn	w8, w8
102136fc4:     	add	w8, w10, w8
102136fc8:     	ldr	x10, [x22, #0x28]
102136fcc:     	add	x8, x10, w8, sxtw
102136fd0:     	ldr	x10, [x22, #0x10]
102136fd4:     	lsr	x11, x8, #4
102136fd8:     	and	x11, x11, #0xffffffffffffff8
102136fdc:     	ldr	x10, [x10, x11]
102136fe0:     	and	x8, x8, #0x7f
102136fe4:     	add	x8, x10, x8, lsl #5
102136fe8:     	ldr	x10, [x8, #0x18]
102136fec:     	sub	x10, x21, x10
102136ff0:     	cmp	x10, #0x3e8
102136ff4:     	csel	x9, x9, x8, gt
102136ff8:     	ldr	q4, [x9]
102136ffc:     	fmla.2d	v1, v4, v0[0]
102137000:     	ldr	d4, [x9, #0x10]
102137004:     	fmadd	d2, d4, d0, d2
102137008:     	fadd	d3, d0, d3
10213700c:     	fmov	d0, #1.00000000
102137010:     	fdiv	d0, d0, d3
102137014:     	fmul.2d	v1, v1, v0[0]
102137018:     	str	q1, [x20]
10213701c:     	fmul	d0, d2, d0
102137020:     	str	d0, [x23]
102137024:     	mov	w0, #0x1                ; =1
102137028:     	ldp	x29, x30, [sp, #0x100]
10213702c:     	ldp	x20, x19, [sp, #0xf0]
102137030:     	ldp	x22, x21, [sp, #0xe0]
102137034:     	ldp	x24, x23, [sp, #0xd0]
102137038:     	ldp	x26, x25, [sp, #0xc0]
10213703c:     	ldp	x28, x27, [sp, #0xb0]
102137040:     	ldp	d9, d8, [sp, #0xa0]
102137044:     	add	sp, sp, #0x110
102137048:     	ret
10213704c:     	adrp	x0, 0x104644000
102137050:     	add	x0, x0, #0x28e
102137054:     	bl	0x1000886b0

FUNCTION 0x102137058 size 440
102137058:     	ldr	w9, [x3]
10213705c:     	cmp	w9, #0x2
102137060:     	b.ne	0x102137080
102137064:     	ldr	w8, [x0, #0x88]
102137068:     	cbz	w8, 0x102137074
10213706c:     	mov	w8, #0x0                ; =0
102137070:     	b	0x1021370cc
102137074:     	mov	w8, #0x1                ; =1
102137078:     	str	w8, [x0, #0x88]
10213707c:     	ldr	w9, [x3]
102137080:     	cmp	w9, #0x3
102137084:     	cset	w8, eq
102137088:     	b.ne	0x1021370b0
10213708c:     	ldr	w9, [x0, #0x88]
102137090:     	cmp	w9, #0x1
102137094:     	b.eq	0x1021370bc
102137098:     	cbnz	w9, 0x1021370c8
10213709c:     	str	xzr, [x2]
1021370a0:     	str	wzr, [x0, #0x88]
1021370a4:     	mov	w9, #0x1                ; =1
1021370a8:     	str	w9, [x0, #0xe0]
1021370ac:     	ldr	w9, [x3]
1021370b0:     	cmp	w9, #0x1
1021370b4:     	b.eq	0x1021370d4
1021370b8:     	ret
1021370bc:     	mov	w8, #0x2                ; =2
1021370c0:     	str	w8, [x0, #0x88]
1021370c4:     	str	wzr, [x0, #0xe0]
1021370c8:     	mov	w8, #0x1                ; =1
1021370cc:     	mov	w9, #0x1                ; =1
1021370d0:     	str	w9, [x3]
1021370d4:     	ldr	w10, [x0, #0xd8]
1021370d8:     	ldr	w9, [x0, #0x88]
1021370dc:     	cbz	w10, 0x102137108
1021370e0:     	cbz	w9, 0x1021370b8
1021370e4:     	ldr	d0, [x0, #0xb0]
1021370e8:     	ldr	d1, [x2]
1021370ec:     	fsub	d2, d0, d1
1021370f0:     	ldr	d1, [x0, #0x70]
1021370f4:     	fcmp	d2, d1
1021370f8:     	b.le	0x10213710c
1021370fc:     	fsub	d0, d0, d1
102137100:     	str	d0, [x2]
102137104:     	b	0x10213710c
102137108:     	cbz	w9, 0x1021370b8
10213710c:     	ldr	d0, [x2]
102137110:     	fcmp	d0, #0.0
102137114:     	b.hi	0x102137124
102137118:     	ldr	w10, [x0, #0xdc]
10213711c:     	cbz	w10, 0x102137194
102137120:     	str	xzr, [x2]
102137124:     	cmp	w9, #0x2
102137128:     	csinc	w8, w8, wzr, eq
10213712c:     	tbnz	w8, #0x0, 0x1021370b8
102137130:     	ldp	d0, d1, [x1]
102137134:     	ldp	d2, d3, [x0, #0x90]
102137138:     	fsub	d0, d0, d2
10213713c:     	fsub	d1, d1, d3
102137140:     	ldp	d4, d5, [x0, #0xa0]
102137144:     	fsub	d2, d2, d4
102137148:     	fsub	d3, d3, d5
10213714c:     	fmul	d4, d1, d3
102137150:     	fmadd	d4, d0, d2, d4
102137154:     	fcmp	d4, #0.0
102137158:     	b.mi	0x1021371f8
10213715c:     	ldr	w8, [x0, #0x68]
102137160:     	cbz	w8, 0x1021371d4
102137164:     	scvtf	d4, w8
102137168:     	adrp	x8, 0x104517000
10213716c:     	ldr	d5, [x8, #0xf68]
102137170:     	fmov	d6, #2.00000000
102137174:     	fmsub	d4, d4, d5, d6
102137178:     	ldr	d6, [x0, #0x58]
10213717c:     	fmsub	d4, d6, d5, d4
102137180:     	fmov	d5, #0.50000000
102137184:     	fcmp	d4, d5
102137188:     	b.pl	0x1021371d8
10213718c:     	fmov	d4, #0.50000000
102137190:     	b	0x1021371d8
102137194:     	ldr	d1, [x0, #0xb0]
102137198:     	adrp	x8, 0x1042e3000
10213719c:     	ldr	d2, [x8, #0x690]
1021371a0:     	fadd	d2, d0, d2
1021371a4:     	fcmp	d1, d2
1021371a8:     	b.le	0x1021371cc
1021371ac:     	fsub	d0, d1, d0
1021371b0:     	fdiv	d0, d1, d0
1021371b4:     	ldr	q1, [x1]
1021371b8:     	ldr	q2, [x0, #0x90]
1021371bc:     	fsub.2d	v1, v1, v2
1021371c0:     	fmul.2d	v0, v1, v0[0]
1021371c4:     	fadd.2d	v0, v2, v0
1021371c8:     	str	q0, [x1]
1021371cc:     	str	xzr, [x2]
1021371d0:     	b	0x1021371f8
1021371d4:     	fmov	d4, #2.00000000
1021371d8:     	fmul	d1, d1, d1
1021371dc:     	fmadd	d0, d0, d0, d1
1021371e0:     	fmul	d1, d4, d4
1021371e4:     	fmul	d3, d3, d3
1021371e8:     	fmadd	d2, d2, d2, d3
1021371ec:     	fcmp	d0, d1
1021371f0:     	fccmp	d0, d2, #0x0, ls
1021371f4:     	b.pl	0x1021370b8
1021371f8:     	mov	w8, #0x3                ; =3
1021371fc:     	str	w8, [x3]
102137200:     	str	wzr, [x0, #0x88]
102137204:     	mov	w8, #0x1                ; =1
102137208:     	str	w8, [x0, #0xe0]
10213720c:     	ret

FUNCTION 0x102137210 size 160
102137210:     	stp	x20, x19, [sp, #-0x20]!
102137214:     	stp	x29, x30, [sp, #0x10]
102137218:     	add	x29, sp, #0x10
10213721c:     	mov	x19, x0
102137220:     	ldp	x8, x9, [x0, #0x10]
102137224:     	str	xzr, [x0, #0x30]
102137228:     	sub	x9, x9, x8
10213722c:     	asr	x9, x9, #3
102137230:     	cmp	x9, #0x3
102137234:     	b.lo	0x10213725c
102137238:     	ldr	x0, [x8]
10213723c:     	bl	0x103bdd34c
102137240:     	ldp	x8, x9, [x19, #0x10]
102137244:     	add	x8, x8, #0x8
102137248:     	str	x8, [x19, #0x10]
10213724c:     	sub	x9, x9, x8
102137250:     	asr	x9, x9, #3
102137254:     	cmp	x9, #0x2
102137258:     	b.hi	0x102137238
10213725c:     	cmp	x9, #0x1
102137260:     	b.eq	0x102137274
102137264:     	cmp	x9, #0x2
102137268:     	b.ne	0x10213727c
10213726c:     	mov	w8, #0x80               ; =128
102137270:     	b	0x102137278
102137274:     	mov	w8, #0x40               ; =64
102137278:     	str	x8, [x19, #0x28]
10213727c:     	str	wzr, [x19, #0x38]
102137280:     	movi.2d	v0, #0000000000000000
102137284:     	stp	q0, q0, [x19, #0x90]
102137288:     	stp	q0, q0, [x19, #0xb0]
10213728c:     	str	xzr, [x19, #0xd0]
102137290:     	adrp	x8, 0x1042ed000
102137294:     	ldr	d0, [x8, #0x458]
102137298:     	str	d0, [x19, #0xe0]
10213729c:     	str	wzr, [x19, #0xe8]
1021372a0:     	str	xzr, [x19, #0x80]
1021372a4:     	ldp	x29, x30, [sp, #0x10]
1021372a8:     	ldp	x20, x19, [sp], #0x20
1021372ac:     	ret

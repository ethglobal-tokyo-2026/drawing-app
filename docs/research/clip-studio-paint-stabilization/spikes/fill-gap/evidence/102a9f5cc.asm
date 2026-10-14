; CSP 5.1.4 ARM64, unslid range 0x102a9f5cc:0x102a9f8a8
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102a9f5cc:     	sub	sp, sp, #0xa0
102a9f5d0:     	stp	d9, d8, [sp, #0x30]
102a9f5d4:     	stp	x28, x27, [sp, #0x40]
102a9f5d8:     	stp	x26, x25, [sp, #0x50]
102a9f5dc:     	stp	x24, x23, [sp, #0x60]
102a9f5e0:     	stp	x22, x21, [sp, #0x70]
102a9f5e4:     	stp	x20, x19, [sp, #0x80]
102a9f5e8:     	stp	x29, x30, [sp, #0x90]
102a9f5ec:     	add	x29, sp, #0x90
102a9f5f0:     	mov	x23, x7
102a9f5f4:     	mov	x22, x6
102a9f5f8:     	mov	x24, x5
102a9f5fc:     	mov	x25, x4
102a9f600:     	mov	x19, x3
102a9f604:     	mov	x26, x2
102a9f608:     	mov	x21, x1
102a9f60c:     	fmov	d8, d0
102a9f610:     	mov	x20, x0
102a9f614:     	ldp	x9, x8, [x0]
102a9f618:     	stp	x9, x8, [sp, #0x20]
102a9f61c:     	cbz	x8, 0x102a9f62c
102a9f620:     	add	x8, x8, #0x8
102a9f624:     	mov	w9, #0x1                ; =1
102a9f628:     	ldadd	w9, w8, [x8]
102a9f62c:     	add	x27, sp, #0x20
102a9f630:     	add	x0, sp, #0x20
102a9f634:     	mov	x1, x26
102a9f638:     	mov	x2, x19
102a9f63c:     	mov	x3, x25
102a9f640:     	bl	0x102a9f410
102a9f644:     	add	x0, x27, #0x8
102a9f648:     	bl	0x10001022c
102a9f64c:     	cbz	w26, 0x102a9f778
102a9f650:     	str	wzr, [x24]
102a9f654:     	str	wzr, [sp, #0x1c]
102a9f658:     	ldr	x0, [x20]
102a9f65c:     	add	x2, sp, #0x1c
102a9f660:     	mov	w1, #0x13ec             ; =5100
102a9f664:     	bl	0x1000cb794
102a9f668:     	ldr	w8, [sp, #0x1c]
102a9f66c:     	cbz	w8, 0x102a9f6f0
102a9f670:     	ldr	x0, [x20]
102a9f674:     	add	x2, sp, #0x8
102a9f678:     	mov	w1, #0x13ed             ; =5101
102a9f67c:     	bl	0x102856cd4
102a9f680:     	cbz	w0, 0x102a9f6f0
102a9f684:     	ldp	x0, x1, [sp, #0x8]
102a9f688:     	bl	0x10339dc98
102a9f68c:     	stp	x0, x1, [sp, #0x8]
102a9f690:     	mov	w2, #0x0                ; =0
102a9f694:     	fmov	d0, d8
102a9f698:     	bl	0x1022180a0
102a9f69c:     	fcmp	d0, #0.0
102a9f6a0:     	adrp	x8, 0x1042e4000
102a9f6a4:     	add	x8, x8, #0x7a0
102a9f6a8:     	cset	w9, mi
102a9f6ac:     	ldr	d1, [x8, w9, uxtw #3]
102a9f6b0:     	fadd	d0, d0, d1
102a9f6b4:     	fcvtzs	w8, d0
102a9f6b8:     	cmp	w8, #0x1
102a9f6bc:     	csinc	w8, w8, wzr, hi
102a9f6c0:     	str	w8, [x24]
102a9f6c4:     	mov	w8, #0x1                ; =1
102a9f6c8:     	str	w8, [sp, #0x4]
102a9f6cc:     	ldr	x0, [x20]
102a9f6d0:     	add	x2, sp, #0x4
102a9f6d4:     	mov	w1, #0x13ee             ; =5102
102a9f6d8:     	bl	0x1000cb794
102a9f6dc:     	ldr	w8, [sp, #0x4]
102a9f6e0:     	cbz	w8, 0x102a9f6f0
102a9f6e4:     	ldr	w8, [x19]
102a9f6e8:     	orr	w8, w8, #0x400
102a9f6ec:     	str	w8, [x19]
102a9f6f0:     	str	wzr, [x23]
102a9f6f4:     	str	wzr, [sp, #0x4]
102a9f6f8:     	ldr	x0, [x20]
102a9f6fc:     	add	x2, sp, #0x4
102a9f700:     	mov	w1, #0x13f6             ; =5110
102a9f704:     	bl	0x1000cb794
102a9f708:     	ldr	w8, [sp, #0x4]
102a9f70c:     	cbz	w8, 0x102a9f830
102a9f710:     	ldr	x0, [x20]
102a9f714:     	add	x2, sp, #0x8
102a9f718:     	mov	w1, #0x13f7             ; =5111
102a9f71c:     	bl	0x102856cd4
102a9f720:     	cbz	w0, 0x102a9f830
102a9f724:     	ldp	x0, x1, [sp, #0x8]
102a9f728:     	bl	0x10339dc98
102a9f72c:     	stp	x0, x1, [sp, #0x8]
102a9f730:     	mov	w2, #0x0                ; =0
102a9f734:     	fmov	d0, d8
102a9f738:     	bl	0x1022180a0
102a9f73c:     	fcmp	d0, #0.0
102a9f740:     	cset	w8, mi
102a9f744:     	adrp	x9, 0x1042e4000
102a9f748:     	add	x9, x9, #0x7a0
102a9f74c:     	ldr	d1, [x9, w8, uxtw #3]
102a9f750:     	fadd	d1, d0, d1
102a9f754:     	fcvtzs	w8, d1
102a9f758:     	str	w8, [x23]
102a9f75c:     	cbnz	w8, 0x102a9f7f0
102a9f760:     	adrp	x8, 0x1042e3000
102a9f764:     	ldr	d1, [x8, #0x690]
102a9f768:     	fcmp	d0, d1
102a9f76c:     	b.le	0x102a9f7d8
102a9f770:     	mov	w8, #0x1                ; =1
102a9f774:     	b	0x102a9f7ec
102a9f778:     	str	wzr, [sp, #0x8]
102a9f77c:     	ldr	x0, [x20]
102a9f780:     	add	x2, sp, #0x8
102a9f784:     	mov	w1, #0x139c             ; =5020
102a9f788:     	bl	0x1000cb794
102a9f78c:     	ldr	w8, [sp, #0x8]
102a9f790:     	cbz	w8, 0x102a9f650
102a9f794:     	ldr	w8, [x19]
102a9f798:     	orr	w8, w8, #0x10
102a9f79c:     	str	w8, [x19]
102a9f7a0:     	ldr	w8, [x25]
102a9f7a4:     	orr	w8, w8, #0x1000
102a9f7a8:     	str	w8, [x25]
102a9f7ac:     	str	wzr, [sp, #0x1c]
102a9f7b0:     	ldr	x0, [x20]
102a9f7b4:     	add	x2, sp, #0x1c
102a9f7b8:     	mov	w1, #0x139d             ; =5021
102a9f7bc:     	bl	0x1000cb794
102a9f7c0:     	ldr	w8, [sp, #0x1c]
102a9f7c4:     	cbz	w8, 0x102a9f650
102a9f7c8:     	ldr	w8, [x19]
102a9f7cc:     	orr	w8, w8, #0x100000
102a9f7d0:     	str	w8, [x19]
102a9f7d4:     	b	0x102a9f650
102a9f7d8:     	adrp	x8, 0x1042e3000
102a9f7dc:     	ldr	d1, [x8, #0x688]
102a9f7e0:     	fcmp	d0, d1
102a9f7e4:     	b.pl	0x102a9f830
102a9f7e8:     	mov	w8, #-0x1               ; =-1
102a9f7ec:     	str	w8, [x23]
102a9f7f0:     	str	wzr, [sp]
102a9f7f4:     	ldr	x0, [x20]
102a9f7f8:     	mov	x2, sp
102a9f7fc:     	mov	w1, #0x13f8             ; =5112
102a9f800:     	bl	0x10131aa14
102a9f804:     	ldr	w8, [sp]
102a9f808:     	cmp	w8, #0x1
102a9f80c:     	b.eq	0x102a9f820
102a9f810:     	cmp	w8, #0x2
102a9f814:     	b.ne	0x102a9f830
102a9f818:     	mov	w8, #0x10000            ; =65536
102a9f81c:     	b	0x102a9f824
102a9f820:     	mov	w8, #0x20000            ; =131072
102a9f824:     	ldr	w9, [x19]
102a9f828:     	orr	w8, w9, w8
102a9f82c:     	str	w8, [x19]
102a9f830:     	str	xzr, [x22]
102a9f834:     	ldr	x0, [x20]
102a9f838:     	mov	w1, #0x1400             ; =5120
102a9f83c:     	mov	x2, x22
102a9f840:     	bl	0x1028a1b78
102a9f844:     	str	wzr, [sp, #0x8]
102a9f848:     	cbnz	w21, 0x102a9f870
102a9f84c:     	ldr	x0, [x20]
102a9f850:     	add	x2, sp, #0x8
102a9f854:     	mov	w1, #0x140a             ; =5130
102a9f858:     	bl	0x1000cb794
102a9f85c:     	ldr	w8, [sp, #0x8]
102a9f860:     	cbz	w8, 0x102a9f870
102a9f864:     	ldr	w8, [x19]
102a9f868:     	orr	w8, w8, #0x40
102a9f86c:     	str	w8, [x19]
102a9f870:     	ldp	x29, x30, [sp, #0x90]
102a9f874:     	ldp	x20, x19, [sp, #0x80]
102a9f878:     	ldp	x22, x21, [sp, #0x70]
102a9f87c:     	ldp	x24, x23, [sp, #0x60]
102a9f880:     	ldp	x26, x25, [sp, #0x50]
102a9f884:     	ldp	x28, x27, [sp, #0x40]
102a9f888:     	ldp	d9, d8, [sp, #0x30]
102a9f88c:     	add	sp, sp, #0xa0
102a9f890:     	ret
102a9f894:     	mov	x19, x0
102a9f898:     	add	x0, x27, #0x8
102a9f89c:     	bl	0x10001022c
102a9f8a0:     	mov	x0, x19
102a9f8a4:     	bl	0x103bda970

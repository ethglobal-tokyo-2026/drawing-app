; CSP 5.1.4 ARM64, unslid range 0x10253f5e4:0x10253ff10
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
10253f5e4:     	stp	x28, x27, [sp, #-0x60]!
10253f5e8:     	stp	x26, x25, [sp, #0x10]
10253f5ec:     	stp	x24, x23, [sp, #0x20]
10253f5f0:     	stp	x22, x21, [sp, #0x30]
10253f5f4:     	stp	x20, x19, [sp, #0x40]
10253f5f8:     	stp	x29, x30, [sp, #0x50]
10253f5fc:     	add	x29, sp, #0x50
10253f600:     	sub	sp, sp, #0x1b0
10253f604:     	mov	x20, x3
10253f608:     	mov	x22, x2
10253f60c:     	mov	x21, x1
10253f610:     	mov	x19, x0
10253f614:     	ldr	x0, [x0, #0x190]
10253f618:     	bl	0x10208fef0
10253f61c:     	mov	x23, x0
10253f620:     	ldr	x0, [x19, #0x190]
10253f624:     	bl	0x10208fef8
10253f628:     	mov	x24, x0
10253f62c:     	mov	w8, w23
10253f630:     	orr	x8, x8, x24, lsl #32
10253f634:     	stp	xzr, x8, [x29, #-0x80]
10253f638:     	mov	w0, #0x30               ; =48
10253f63c:     	bl	0x103bdd37c
10253f640:     	mov	x25, x0
10253f644:     	bl	0x10208fe44
10253f648:     	lsr	x26, x21, #32
10253f64c:     	add	x0, x19, #0x1b0
10253f650:     	mov	x1, x25
10253f654:     	bl	0x102541ac4
10253f658:     	ldr	x0, [x19, #0x1b0]
10253f65c:     	mov	x1, x23
10253f660:     	mov	x2, x24
10253f664:     	bl	0x10208ff08
10253f668:     	ldr	w8, [x19, #0x16c]
10253f66c:     	asr	w8, w8, #1
10253f670:     	add	w8, w8, #0x2
10253f674:     	sub	w9, w21, w8
10253f678:     	str	w9, [x19, #0x1e0]
10253f67c:     	add	w9, w8, w21
10253f680:     	str	w9, [x19, #0x1e8]
10253f684:     	sub	w9, w26, w8
10253f688:     	str	w9, [x19, #0x1e4]
10253f68c:     	add	w8, w8, w26
10253f690:     	str	w8, [x19, #0x1ec]
10253f694:     	add	x0, x19, #0x1e0
10253f698:     	sub	x1, x29, #0x80
10253f69c:     	bl	0x10221b7bc
10253f6a0:     	mov	w8, #0x1                ; =1
10253f6a4:     	str	w8, [x19, #0x1f0]
10253f6a8:     	stur	wzr, [x29, #-0x84]
10253f6ac:     	ldr	q0, [x19, #0x140]
10253f6b0:     	stur	q0, [x29, #-0xa0]
10253f6b4:     	ldr	w8, [x19, #0x1d0]
10253f6b8:     	neg	w1, w8
10253f6bc:     	ldr	w8, [x19, #0x1d4]
10253f6c0:     	neg	w2, w8
10253f6c4:     	sub	x23, x29, #0xa0
10253f6c8:     	sub	x0, x29, #0xa0
10253f6cc:     	bl	0x10221b4d4
10253f6d0:     	ldr	x1, [x19, #0x190]
10253f6d4:     	ldr	x2, [x19, #0x1b0]
10253f6d8:     	sub	x8, x29, #0x84
10253f6dc:     	stp	x20, x8, [sp, #0x8]
10253f6e0:     	str	x23, [sp]
10253f6e4:     	mov	x0, x19
10253f6e8:     	mov	x3, x21
10253f6ec:     	mov	w4, #0x1                ; =1
10253f6f0:     	mov	w5, #0x0                ; =0
10253f6f4:     	mov	w6, #0x1                ; =1
10253f6f8:     	mov	w7, #0x0                ; =0
10253f6fc:     	bl	0x10253d98c
10253f700:     	str	wzr, [x19, #0x1f0]
10253f704:     	cbz	w0, 0x10253fb18
10253f708:     	ldr	x0, [x19, #0x1b0]
10253f70c:     	bl	0x10208ffd0
10253f710:     	ldr	q0, [x20]
10253f714:     	stur	q0, [x29, #-0xb0]
10253f718:     	ldr	w8, [x19, #0x16c]
10253f71c:     	sub	x28, x29, #0xb0
10253f720:     	sub	x0, x29, #0xb0
10253f724:     	add	w1, w8, #0x2
10253f728:     	add	w2, w8, #0x2
10253f72c:     	bl	0x10221b508
10253f730:     	sub	x0, x29, #0xb0
10253f734:     	orr	x1, x28, #0x8
10253f738:     	bl	0x1020900d0
10253f73c:     	sub	x0, x29, #0xb0
10253f740:     	sub	x1, x29, #0x80
10253f744:     	bl	0x10221b7bc
10253f748:     	ldp	w8, w9, [x29, #-0xa8]
10253f74c:     	ldp	w10, w11, [x29, #-0xb0]
10253f750:     	subs	w8, w8, w10
10253f754:     	sub	w9, w9, w11
10253f758:     	stp	w9, w8, [x29, #-0xb8]
10253f75c:     	add	w9, w8, #0xff
10253f760:     	csel	w9, w9, w8, lt
10253f764:     	asr	w9, w9, #8
10253f768:     	tst	w8, #0xff
10253f76c:     	cinc	w23, w9, ne
10253f770:     	mov	w0, #0x20               ; =32
10253f774:     	bl	0x103bdd37c
10253f778:     	sub	x8, x29, #0xb4
10253f77c:     	stp	x8, x19, [x0]
10253f780:     	sub	x8, x29, #0xb8
10253f784:     	stp	x28, x8, [x0, #0x10]
10253f788:     	adrp	x8, 0x104a4b000
10253f78c:     	add	x8, x8, #0x810
10253f790:     	stp	x8, x0, [x29, #-0xe0]
10253f794:     	sub	x1, x29, #0xe0
10253f798:     	mov	x0, x23
10253f79c:     	bl	0x102f9048c
10253f7a0:     	sub	x24, x29, #0xe0
10253f7a4:     	sub	x0, x29, #0xe0
10253f7a8:     	bl	0x1006c5b98
10253f7ac:     	mov	x0, x19
10253f7b0:     	bl	0x10253d750
10253f7b4:     	cbz	w0, 0x10253f7cc
10253f7b8:     	ldr	q0, [x19, #0x1b0]
10253f7bc:     	stp	xzr, xzr, [x19, #0x1b0]
10253f7c0:     	stur	q0, [x29, #-0xe0]
10253f7c4:     	orr	x0, x24, #0x8
10253f7c8:     	b	0x10253fb2c
10253f7cc:     	ldp	x9, x8, [x19, #0x190]
10253f7d0:     	stp	x9, x8, [x29, #-0xf0]
10253f7d4:     	cbz	x8, 0x10253f7e4
10253f7d8:     	add	x8, x8, #0x8
10253f7dc:     	mov	w9, #0x1                ; =1
10253f7e0:     	ldadd	w9, w8, [x8]
10253f7e4:     	ldp	x9, x8, [x19, #0x1b0]
10253f7e8:     	stp	x9, x8, [sp, #0x100]
10253f7ec:     	cbz	x8, 0x10253f7fc
10253f7f0:     	add	x8, x8, #0x8
10253f7f4:     	mov	w9, #0x1                ; =1
10253f7f8:     	ldadd	w9, w8, [x8]
10253f7fc:     	ldp	x9, x8, [x19, #0x1a0]
10253f800:     	stp	x9, x8, [sp, #0xf0]
10253f804:     	cbz	x8, 0x10253f814
10253f808:     	add	x8, x8, #0x8
10253f80c:     	mov	w9, #0x1                ; =1
10253f810:     	ldadd	w9, w8, [x8]
10253f814:     	ldr	w3, [x19, #0x16c]
10253f818:     	ldp	x4, x5, [x29, #-0xb0]
10253f81c:     	ldp	x9, x8, [x19, #0x90]
10253f820:     	stp	x9, x8, [sp, #0xe0]
10253f824:     	cbz	x8, 0x10253f834
10253f828:     	add	x8, x8, #0x8
10253f82c:     	mov	w9, #0x1                ; =1
10253f830:     	ldadd	w9, w8, [x8]
10253f834:     	sub	x24, x29, #0xf0
10253f838:     	add	x25, sp, #0x100
10253f83c:     	add	x26, sp, #0xf0
10253f840:     	add	x27, sp, #0xe0
10253f844:     	sub	x0, x29, #0xf0
10253f848:     	add	x1, sp, #0x100
10253f84c:     	add	x2, sp, #0xf0
10253f850:     	add	x6, sp, #0xe0
10253f854:     	bl	0x102546a64
10253f858:     	add	x0, x27, #0x8
10253f85c:     	bl	0x10001022c
10253f860:     	add	x0, x26, #0x8
10253f864:     	bl	0x10001022c
10253f868:     	add	x0, x25, #0x8
10253f86c:     	bl	0x10001022c
10253f870:     	add	x0, x24, #0x8
10253f874:     	bl	0x10001022c
10253f878:     	mov	x0, x19
10253f87c:     	bl	0x10253d750
10253f880:     	cbnz	w0, 0x10253fb18
10253f884:     	mov	w0, #0x20               ; =32
10253f888:     	bl	0x103bdd37c
10253f88c:     	sub	x8, x29, #0xb4
10253f890:     	stp	x8, x19, [x0]
10253f894:     	sub	x8, x29, #0xb0
10253f898:     	sub	x9, x29, #0xb8
10253f89c:     	stp	x8, x9, [x0, #0x10]
10253f8a0:     	adrp	x8, 0x104a4b000
10253f8a4:     	add	x8, x8, #0x830
10253f8a8:     	stp	x8, x0, [x29, #-0xe0]
10253f8ac:     	sub	x1, x29, #0xe0
10253f8b0:     	mov	x0, x23
10253f8b4:     	bl	0x102f9048c
10253f8b8:     	sub	x0, x29, #0xe0
10253f8bc:     	bl	0x1006c5b98
10253f8c0:     	ldr	w8, [x19, #0x16c]
10253f8c4:     	cmp	w8, #0x2
10253f8c8:     	b.lt	0x10253fb0c
10253f8cc:     	ucvtf	d0, w8
10253f8d0:     	adrp	x9, 0x104511000
10253f8d4:     	ldr	d1, [x9, #0x1e0]
10253f8d8:     	fmul	d0, d0, d1
10253f8dc:     	adrp	x9, 0x1042e3000
10253f8e0:     	ldr	d1, [x9, #0x678]
10253f8e4:     	fadd	d0, d0, d1
10253f8e8:     	fcvtzs	w9, d0
10253f8ec:     	cmp	w9, #0x1
10253f8f0:     	csinc	w3, w9, wzr, hi
10253f8f4:     	cmp	w8, #0xa
10253f8f8:     	b.ls	0x10253fa78
10253f8fc:     	ldp	x10, x9, [x19, #0x1b0]
10253f900:     	stp	x10, x9, [sp, #0xd0]
10253f904:     	cbz	x9, 0x10253f914
10253f908:     	add	x9, x9, #0x8
10253f90c:     	mov	w10, #0x1               ; =1
10253f910:     	ldadd	w10, w9, [x9]
10253f914:     	ldp	x10, x9, [x19, #0x190]
10253f918:     	stp	x10, x9, [sp, #0xc0]
10253f91c:     	cbz	x9, 0x10253f92c
10253f920:     	add	x9, x9, #0x8
10253f924:     	mov	w10, #0x1               ; =1
10253f928:     	ldadd	w10, w9, [x9]
10253f92c:     	lsr	w24, w8, #2
10253f930:     	ldp	x9, x8, [x19, #0x1a0]
10253f934:     	stp	x9, x8, [sp, #0xb0]
10253f938:     	cbz	x8, 0x10253f948
10253f93c:     	add	x8, x8, #0x8
10253f940:     	mov	w9, #0x1                ; =1
10253f944:     	ldadd	w9, w8, [x8]
10253f948:     	add	x25, sp, #0xd0
10253f94c:     	add	x26, sp, #0xc0
10253f950:     	add	x27, sp, #0xb0
10253f954:     	ldp	x4, x5, [x29, #-0xb0]
10253f958:     	ldr	w8, [x19, #0x16c]
10253f95c:     	lsl	w6, w8, #1
10253f960:     	add	x0, sp, #0xd0
10253f964:     	add	x1, sp, #0xc0
10253f968:     	add	x2, sp, #0xb0
10253f96c:     	add	w3, w3, w24
10253f970:     	bl	0x102547380
10253f974:     	add	x0, x27, #0x8
10253f978:     	bl	0x10001022c
10253f97c:     	add	x0, x26, #0x8
10253f980:     	bl	0x10001022c
10253f984:     	add	x0, x25, #0x8
10253f988:     	bl	0x10001022c
10253f98c:     	mov	x0, x19
10253f990:     	bl	0x10253d750
10253f994:     	cbnz	w0, 0x10253fb18
10253f998:     	mov	w0, #0x20               ; =32
10253f99c:     	bl	0x103bdd37c
10253f9a0:     	sub	x8, x29, #0xb4
10253f9a4:     	stp	x8, x19, [x0]
10253f9a8:     	sub	x8, x29, #0xb0
10253f9ac:     	sub	x9, x29, #0xb8
10253f9b0:     	stp	x8, x9, [x0, #0x10]
10253f9b4:     	adrp	x8, 0x104a4b000
10253f9b8:     	add	x8, x8, #0x850
10253f9bc:     	stp	x8, x0, [x29, #-0xe0]
10253f9c0:     	sub	x1, x29, #0xe0
10253f9c4:     	mov	x0, x23
10253f9c8:     	bl	0x102f9048c
10253f9cc:     	sub	x0, x29, #0xe0
10253f9d0:     	bl	0x1006c5b98
10253f9d4:     	ldp	x9, x8, [x19, #0x1b0]
10253f9d8:     	stp	x9, x8, [sp, #0xa0]
10253f9dc:     	cbz	x8, 0x10253f9ec
10253f9e0:     	add	x8, x8, #0x8
10253f9e4:     	mov	w9, #0x1                ; =1
10253f9e8:     	ldadd	w9, w8, [x8]
10253f9ec:     	ldp	x9, x8, [x19, #0x190]
10253f9f0:     	stp	x9, x8, [sp, #0x90]
10253f9f4:     	cbz	x8, 0x10253fa04
10253f9f8:     	add	x8, x8, #0x8
10253f9fc:     	mov	w9, #0x1                ; =1
10253fa00:     	ldadd	w9, w8, [x8]
10253fa04:     	add	x8, sp, #0xa0
10253fa08:     	add	x9, sp, #0x90
10253fa0c:     	add	x10, sp, #0x80
10253fa10:     	ldp	x12, x11, [x19, #0x1a0]
10253fa14:     	stp	x12, x11, [sp, #0x80]
10253fa18:     	cbz	x11, 0x10253fa28
10253fa1c:     	add	x11, x11, #0x8
10253fa20:     	mov	w12, #0x1               ; =1
10253fa24:     	ldadd	w12, w11, [x11]
10253fa28:     	add	x25, x8, #0x8
10253fa2c:     	add	x26, x9, #0x8
10253fa30:     	add	x27, x10, #0x8
10253fa34:     	ldp	x4, x5, [x29, #-0xb0]
10253fa38:     	ldp	x9, x8, [x19, #0x90]
10253fa3c:     	stp	x9, x8, [sp, #0x70]
10253fa40:     	cbz	x8, 0x10253fa50
10253fa44:     	add	x8, x8, #0x8
10253fa48:     	mov	w9, #0x1                ; =1
10253fa4c:     	ldadd	w9, w8, [x8]
10253fa50:     	add	x0, sp, #0xa0
10253fa54:     	add	x1, sp, #0x90
10253fa58:     	add	x2, sp, #0x80
10253fa5c:     	add	x6, sp, #0x70
10253fa60:     	mov	x3, x24
10253fa64:     	bl	0x102546a64
10253fa68:     	add	x8, sp, #0x70
10253fa6c:     	add	x0, x8, #0x8
10253fa70:     	bl	0x10001022c
10253fa74:     	b	0x10253faf4
10253fa78:     	ldp	x9, x8, [x19, #0x1b0]
10253fa7c:     	stp	x9, x8, [sp, #0x60]
10253fa80:     	cbz	x8, 0x10253fa90
10253fa84:     	add	x8, x8, #0x8
10253fa88:     	mov	w9, #0x1                ; =1
10253fa8c:     	ldadd	w9, w8, [x8]
10253fa90:     	add	x8, sp, #0x60
10253fa94:     	add	x9, sp, #0x50
10253fa98:     	ldp	x11, x10, [x19, #0x190]
10253fa9c:     	stp	x11, x10, [sp, #0x50]
10253faa0:     	cbz	x10, 0x10253fab0
10253faa4:     	add	x10, x10, #0x8
10253faa8:     	mov	w11, #0x1               ; =1
10253faac:     	ldadd	w11, w10, [x10]
10253fab0:     	add	x25, x8, #0x8
10253fab4:     	add	x26, x9, #0x8
10253fab8:     	add	x9, sp, #0x40
10253fabc:     	ldp	x10, x8, [x19, #0x1a0]
10253fac0:     	add	x27, x9, #0x8
10253fac4:     	stp	x10, x8, [sp, #0x40]
10253fac8:     	cbz	x8, 0x10253fad8
10253facc:     	add	x8, x8, #0x8
10253fad0:     	mov	w9, #0x1                ; =1
10253fad4:     	ldadd	w9, w8, [x8]
10253fad8:     	ldp	x4, x5, [x29, #-0xb0]
10253fadc:     	ldr	w8, [x19, #0x16c]
10253fae0:     	lsl	w6, w8, #1
10253fae4:     	add	x0, sp, #0x60
10253fae8:     	add	x1, sp, #0x50
10253faec:     	add	x2, sp, #0x40
10253faf0:     	bl	0x102547380
10253faf4:     	mov	x0, x27
10253faf8:     	bl	0x10001022c
10253fafc:     	mov	x0, x26
10253fb00:     	bl	0x10001022c
10253fb04:     	mov	x0, x25
10253fb08:     	bl	0x10001022c
10253fb0c:     	mov	x0, x19
10253fb10:     	bl	0x10253d750
10253fb14:     	cbz	w0, 0x10253fb58
10253fb18:     	sub	x8, x29, #0xe0
10253fb1c:     	ldr	q0, [x19, #0x1b0]
10253fb20:     	stp	xzr, xzr, [x19, #0x1b0]
10253fb24:     	stur	q0, [x29, #-0xe0]
10253fb28:     	orr	x0, x8, #0x8
10253fb2c:     	bl	0x10001022c
10253fb30:     	mov	w19, #0x0               ; =0
10253fb34:     	mov	x0, x19
10253fb38:     	add	sp, sp, #0x1b0
10253fb3c:     	ldp	x29, x30, [sp, #0x50]
10253fb40:     	ldp	x20, x19, [sp, #0x40]
10253fb44:     	ldp	x22, x21, [sp, #0x30]
10253fb48:     	ldp	x24, x23, [sp, #0x20]
10253fb4c:     	ldp	x26, x25, [sp, #0x10]
10253fb50:     	ldp	x28, x27, [sp], #0x60
10253fb54:     	ret
10253fb58:     	cbz	w22, 0x10253fc34
10253fb5c:     	ldr	x0, [x19, #0x1b0]
10253fb60:     	ldp	x1, x2, [x29, #-0xb0]
10253fb64:     	bl	0x1020900f4
10253fb68:     	ldr	x1, [x19, #0x1b0]
10253fb6c:     	ldr	x2, [x19, #0x190]
10253fb70:     	sub	x8, x29, #0x84
10253fb74:     	str	x8, [sp, #0x10]
10253fb78:     	add	x8, sp, #0x30
10253fb7c:     	sub	x9, x29, #0xa0
10253fb80:     	stp	x9, x8, [sp]
10253fb84:     	mov	x0, x19
10253fb88:     	mov	x3, x21
10253fb8c:     	mov	w4, #0x1                ; =1
10253fb90:     	mov	w5, #0x1                ; =1
10253fb94:     	mov	w6, #0x0                ; =0
10253fb98:     	mov	w7, #0x0                ; =0
10253fb9c:     	bl	0x10253d98c
10253fba0:     	ldr	w8, [x19, #0x1fc]
10253fba4:     	cbnz	w8, 0x10253fb18
10253fba8:     	mov	w0, #0x20               ; =32
10253fbac:     	bl	0x103bdd37c
10253fbb0:     	sub	x8, x29, #0xb4
10253fbb4:     	stp	x8, x19, [x0]
10253fbb8:     	sub	x8, x29, #0xb0
10253fbbc:     	sub	x9, x29, #0xb8
10253fbc0:     	stp	x8, x9, [x0, #0x10]
10253fbc4:     	adrp	x8, 0x104a4b000
10253fbc8:     	add	x8, x8, #0x870
10253fbcc:     	stp	x8, x0, [x29, #-0xe0]
10253fbd0:     	sub	x1, x29, #0xe0
10253fbd4:     	mov	x0, x23
10253fbd8:     	bl	0x102f9048c
10253fbdc:     	sub	x0, x29, #0xe0
10253fbe0:     	bl	0x1006c5b98
10253fbe4:     	stp	xzr, xzr, [x29, #-0xe0]
10253fbe8:     	stur	xzr, [x29, #-0xd0]
10253fbec:     	sub	x22, x29, #0xe0
10253fbf0:     	sub	x1, x29, #0xb0
10253fbf4:     	sub	x2, x29, #0xe0
10253fbf8:     	mov	x0, x19
10253fbfc:     	bl	0x102541c94
10253fc00:     	ldr	w8, [x19, #0x1fc]
10253fc04:     	cbz	w8, 0x10253fde8
10253fc08:     	sub	x8, x29, #0x70
10253fc0c:     	ldr	q0, [x19, #0x1b0]
10253fc10:     	stp	xzr, xzr, [x19, #0x1b0]
10253fc14:     	stur	q0, [x29, #-0x70]
10253fc18:     	orr	x0, x8, #0x8
10253fc1c:     	bl	0x10001022c
10253fc20:     	sub	x8, x29, #0xe0
10253fc24:     	stur	x8, [x29, #-0x70]
10253fc28:     	sub	x0, x29, #0x70
10253fc2c:     	bl	0x1006351e0
10253fc30:     	b	0x10253fb30
10253fc34:     	ldur	q0, [x29, #-0xb0]
10253fc38:     	str	q0, [x20]
10253fc3c:     	sub	x8, x29, #0xe0
10253fc40:     	ldr	q0, [x19, #0x1b0]
10253fc44:     	stp	xzr, xzr, [x19, #0x1b0]
10253fc48:     	stur	q0, [x29, #-0xe0]
10253fc4c:     	orr	x0, x8, #0x8
10253fc50:     	bl	0x10001022c
10253fc54:     	ldr	q0, [x20]
10253fc58:     	stur	q0, [x29, #-0xb0]
10253fc5c:     	ldr	w8, [x19, #0x16c]
10253fc60:     	lsl	w1, w8, #2
10253fc64:     	sub	x0, x29, #0xb0
10253fc68:     	mov	x2, x1
10253fc6c:     	bl	0x10221b508
10253fc70:     	sub	x0, x29, #0xb0
10253fc74:     	orr	x1, x28, #0x8
10253fc78:     	bl	0x1020900d0
10253fc7c:     	sub	x0, x29, #0xb0
10253fc80:     	sub	x1, x29, #0x80
10253fc84:     	bl	0x10221b7bc
10253fc88:     	ldp	w8, w9, [x29, #-0xa8]
10253fc8c:     	ldp	w10, w11, [x29, #-0xb0]
10253fc90:     	sub	w8, w8, w10
10253fc94:     	stur	w8, [x29, #-0xb4]
10253fc98:     	sub	w8, w9, w11
10253fc9c:     	stur	w8, [x29, #-0xb8]
10253fca0:     	mov	w0, #0x30               ; =48
10253fca4:     	bl	0x103bdd37c
10253fca8:     	mov	x21, x0
10253fcac:     	bl	0x10208fe44
10253fcb0:     	sub	x0, x29, #0xe0
10253fcb4:     	mov	x1, x21
10253fcb8:     	bl	0x1024fea24
10253fcbc:     	ldur	x0, [x29, #-0xe0]
10253fcc0:     	ldp	w2, w1, [x29, #-0xb8]
10253fcc4:     	bl	0x10208ff08
10253fcc8:     	ldur	w8, [x29, #-0xb4]
10253fccc:     	asr	w9, w8, #3
10253fcd0:     	tst	w8, #0x7
10253fcd4:     	cinc	w9, w9, ne
10253fcd8:     	ldur	w10, [x29, #-0xac]
10253fcdc:     	ldur	w14, [x29, #-0xa4]
10253fce0:     	ldur	x8, [x29, #-0xe0]
10253fce4:     	cmp	w10, w14
10253fce8:     	b.ge	0x10253fd74
10253fcec:     	ldur	w13, [x29, #-0xb0]
10253fcf0:     	ldr	x11, [x19, #0x1a0]
10253fcf4:     	ldr	x12, [x19, #0x190]
10253fcf8:     	sbfx	x13, x13, #3, #29
10253fcfc:     	cmp	w9, #0x1
10253fd00:     	b.lt	0x10253fd64
10253fd04:     	ldr	x14, [x8, #0x28]
10253fd08:     	ldr	w15, [x8, #0x10]
10253fd0c:     	ldur	w16, [x29, #-0xac]
10253fd10:     	sub	w16, w10, w16
10253fd14:     	mul	w15, w15, w16
10253fd18:     	add	x14, x14, x15
10253fd1c:     	ldr	x15, [x11, #0x28]
10253fd20:     	ldr	w16, [x11, #0x10]
10253fd24:     	mul	w16, w16, w10
10253fd28:     	add	x15, x15, x13
10253fd2c:     	add	x15, x15, x16
10253fd30:     	ldr	x16, [x12, #0x28]
10253fd34:     	ldr	w17, [x12, #0x10]
10253fd38:     	mul	w17, w17, w10
10253fd3c:     	add	x16, x16, x13
10253fd40:     	add	x16, x16, x17
10253fd44:     	mov	x17, x9
10253fd48:     	ldrb	w0, [x15], #0x1
10253fd4c:     	ldrb	w1, [x16], #0x1
10253fd50:     	bic	w0, w0, w1
10253fd54:     	strb	w0, [x14], #0x1
10253fd58:     	subs	w17, w17, #0x1
10253fd5c:     	b.ne	0x10253fd48
10253fd60:     	ldur	w14, [x29, #-0xa4]
10253fd64:     	add	w10, w10, #0x1
10253fd68:     	cmp	w10, w14
10253fd6c:     	b.lt	0x10253fcfc
10253fd70:     	ldur	x8, [x29, #-0xe0]
10253fd74:     	ldr	w10, [x19, #0x16c]
10253fd78:     	ldur	x9, [x29, #-0xd8]
10253fd7c:     	mul	w10, w10, w10
10253fd80:     	lsl	w4, w10, #3
10253fd84:     	stp	x8, x9, [sp, #0x20]
10253fd88:     	cbz	x9, 0x10253fd98
10253fd8c:     	add	x8, x9, #0x8
10253fd90:     	mov	w9, #0x1                ; =1
10253fd94:     	ldadd	w9, w8, [x8]
10253fd98:     	add	x21, sp, #0x20
10253fd9c:     	ldp	x2, x3, [x29, #-0xb0]
10253fda0:     	add	x1, sp, #0x20
10253fda4:     	mov	x0, x19
10253fda8:     	mov	x5, x20
10253fdac:     	bl	0x102542c50
10253fdb0:     	mov	x20, x0
10253fdb4:     	add	x0, x21, #0x8
10253fdb8:     	bl	0x10001022c
10253fdbc:     	cbz	w20, 0x10253fdd4
10253fdc0:     	mov	x0, x19
10253fdc4:     	bl	0x10253d750
10253fdc8:     	cmp	w0, #0x0
10253fdcc:     	cset	w19, eq
10253fdd0:     	b	0x10253fdd8
10253fdd4:     	mov	w19, #0x0               ; =0
10253fdd8:     	sub	x8, x29, #0xe0
10253fddc:     	add	x0, x8, #0x8
10253fde0:     	bl	0x10001022c
10253fde4:     	b	0x10253fb34
10253fde8:     	cbz	w0, 0x10253fe0c
10253fdec:     	ldp	x2, x3, [x29, #-0xb0]
10253fdf0:     	sub	x4, x29, #0xe0
10253fdf4:     	mov	x0, x19
10253fdf8:     	mov	x1, x21
10253fdfc:     	mov	x5, x20
10253fe00:     	bl	0x102542720
10253fe04:     	cbnz	w0, 0x10253fe14
10253fe08:     	b	0x10253fc08
10253fe0c:     	ldur	q0, [x29, #-0xb0]
10253fe10:     	str	q0, [x20]
10253fe14:     	sub	x8, x29, #0xe0
10253fe18:     	stur	x8, [x29, #-0x70]
10253fe1c:     	sub	x0, x29, #0x70
10253fe20:     	bl	0x1006351e0
10253fe24:     	b	0x10253fc3c
10253fe28:     	b	0x10253feec
10253fe2c:     	b	0x10253fe6c
10253fe30:     	mov	x19, x0
10253fe34:     	stur	x22, [x29, #-0x70]
10253fe38:     	sub	x0, x29, #0x70
10253fe3c:     	bl	0x1006351e0
10253fe40:     	b	0x10253ff08
10253fe44:     	mov	x19, x0
10253fe48:     	add	x8, sp, #0x70
10253fe4c:     	add	x0, x8, #0x8
10253fe50:     	bl	0x10001022c
10253fe54:     	b	0x10253fe8c
10253fe58:     	b	0x10253feec
10253fe5c:     	mov	x19, x0
10253fe60:     	add	x0, x21, #0x8
10253fe64:     	bl	0x10001022c
10253fe68:     	b	0x10253fe70
10253fe6c:     	mov	x19, x0
10253fe70:     	sub	x8, x29, #0xe0
10253fe74:     	add	x0, x8, #0x8
10253fe78:     	b	0x10253fee4
10253fe7c:     	mov	x19, x0
10253fe80:     	mov	x0, x21
10253fe84:     	b	0x10253ff04
10253fe88:     	mov	x19, x0
10253fe8c:     	mov	x0, x27
10253fe90:     	bl	0x10001022c
10253fe94:     	mov	x0, x26
10253fe98:     	bl	0x10001022c
10253fe9c:     	mov	x0, x25
10253fea0:     	b	0x10253fee4
10253fea4:     	mov	x19, x0
10253fea8:     	add	x0, x27, #0x8
10253feac:     	bl	0x10001022c
10253feb0:     	add	x0, x26, #0x8
10253feb4:     	bl	0x10001022c
10253feb8:     	add	x0, x25, #0x8
10253febc:     	b	0x10253fee4
10253fec0:     	b	0x10253feec
10253fec4:     	mov	x19, x0
10253fec8:     	add	x0, x27, #0x8
10253fecc:     	bl	0x10001022c
10253fed0:     	add	x0, x26, #0x8
10253fed4:     	bl	0x10001022c
10253fed8:     	add	x0, x25, #0x8
10253fedc:     	bl	0x10001022c
10253fee0:     	add	x0, x24, #0x8
10253fee4:     	bl	0x10001022c
10253fee8:     	b	0x10253ff08
10253feec:     	mov	x19, x0
10253fef0:     	sub	x0, x29, #0xe0
10253fef4:     	bl	0x1006c5b98
10253fef8:     	b	0x10253ff08
10253fefc:     	mov	x19, x0
10253ff00:     	mov	x0, x25
10253ff04:     	bl	0x103bdd34c
10253ff08:     	mov	x0, x19
10253ff0c:     	bl	0x103bda970

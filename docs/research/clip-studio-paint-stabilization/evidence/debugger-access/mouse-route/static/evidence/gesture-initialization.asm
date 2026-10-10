103201650:     	mov	x19, x2
103201654:     	mov	x20, x1
103201658:     	mov	x21, x0
10320165c:     	ldr	x2, [x0, #0x8]
103201660:     	ldp	x22, x3, [x1, #0x8]
103201664:     	add	x0, x0, #0x10
103201668:     	mov	x1, x19
10320166c:     	bl	0x103201360
103201670:     	ldp	x9, x8, [x20, #0x8]
103201674:     	ldp	x1, x10, [x21]
103201678:     	sub	x10, x10, x19
10320167c:     	add	x8, x8, x10
103201680:     	str	x8, [x20, #0x10]
103201684:     	str	x19, [x21, #0x8]
103201688:     	sub	x8, x1, x19
10320168c:     	add	x23, x9, x8
103201690:     	add	x0, x21, #0x10
103201694:     	mov	x2, x19
103201698:     	mov	x3, x23
10320169c:     	bl	0x103201360
1032016a0:     	str	x23, [x20, #0x8]
1032016a4:     	ldr	x8, [x21]
1032016a8:     	str	x8, [x21, #0x8]
1032016ac:     	ldr	x9, [x20, #0x8]
1032016b0:     	str	x9, [x21]
1032016b4:     	str	x8, [x20, #0x8]
1032016b8:     	ldr	x8, [x21, #0x8]
1032016bc:     	ldr	x9, [x20, #0x10]
1032016c0:     	str	x9, [x21, #0x8]
1032016c4:     	str	x8, [x20, #0x10]
1032016c8:     	ldr	x8, [x21, #0x10]
1032016cc:     	ldr	x9, [x20, #0x18]
1032016d0:     	str	x9, [x21, #0x10]
1032016d4:     	str	x8, [x20, #0x18]
1032016d8:     	ldr	x8, [x20, #0x8]
1032016dc:     	str	x8, [x20]
1032016e0:     	mov	x0, x22
1032016e4:     	ldp	x29, x30, [sp, #0x30]
1032016e8:     	ldp	x20, x19, [sp, #0x20]
1032016ec:     	ldp	x22, x21, [sp, #0x10]
1032016f0:     	ldp	x24, x23, [sp], #0x40
1032016f4:     	ret

FUNCTION 0x1032016f8 size 60
1032016f8:     	stp	x20, x19, [sp, #-0x20]!
1032016fc:     	stp	x29, x30, [sp, #0x10]
103201700:     	add	x29, sp, #0x10
103201704:     	adrp	x19, 0x104ced000
103201708:     	add	x19, x19, #0x6d4
10320170c:     	mov	x0, x19
103201710:     	bl	0x10310cd44
103201714:     	adrp	x0, 0x10310c000
103201718:     	add	x0, x0, #0xd7c
10320171c:     	adrp	x2, 0x100000000
103201720:     	add	x2, x2, #0x0
103201724:     	mov	x1, x19
103201728:     	ldp	x29, x30, [sp, #0x10]
10320172c:     	ldp	x20, x19, [sp], #0x20
103201730:     	b	0x103bdd3c4

FUNCTION 0x103201734 size 4
103201734:     	ret

FUNCTION 0x103201738 size 4
103201738:     	ret

FUNCTION 0x10320173c size 4
10320173c:     	ret

FUNCTION 0x103201740 size 4
103201740:     	ret

FUNCTION 0x103201744 size 84
103201744:     	stp	x20, x19, [sp, #-0x20]!
103201748:     	stp	x29, x30, [sp, #0x10]
10320174c:     	add	x29, sp, #0x10
103201750:     	adrp	x19, 0x104d83000
103201754:     	ldr	x8, [x19, #0xad0]
103201758:     	cbz	x8, 0x103201768
10320175c:     	ldp	x29, x30, [sp, #0x10]
103201760:     	ldp	x20, x19, [sp], #0x20
103201764:     	ret
103201768:     	mov	w0, #0x1                ; =1
10320176c:     	bl	0x103bdd37c
103201770:     	str	x0, [x19, #0xad0]
103201774:     	bl	0x103121fb4
103201778:     	adrp	x8, 0x104d83000
10320177c:     	str	x0, [x8, #0xad8]
103201780:     	bl	0x103201990
103201784:     	bl	0x1020bdab0
103201788:     	bl	0x1020be240
10320178c:     	ldp	x29, x30, [sp, #0x10]
103201790:     	ldp	x20, x19, [sp], #0x20
103201794:     	b	0x1020d9270

FUNCTION 0x103201798 size 92
103201798:     	adrp	x8, 0x104d83000
10320179c:     	ldr	x8, [x8, #0xad0]
1032017a0:     	cbz	x8, 0x1032017f0
1032017a4:     	stp	x20, x19, [sp, #-0x20]!
1032017a8:     	stp	x29, x30, [sp, #0x10]
1032017ac:     	add	x29, sp, #0x10
1032017b0:     	mov	w0, #0x0                ; =0
1032017b4:     	bl	0x1020be3e8
1032017b8:     	mov	w0, #0x0                ; =0
1032017bc:     	bl	0x1020be4c0
1032017c0:     	adrp	x19, 0x104d83000
1032017c4:     	ldr	x0, [x19, #0xad8]
1032017c8:     	bl	0x10312208c
1032017cc:     	ldr	x0, [x19, #0xad8]
1032017d0:     	bl	0x103122014
1032017d4:     	bl	0x103121fb4
1032017d8:     	str	x0, [x19, #0xad8]
1032017dc:     	bl	0x1020bdaa4
1032017e0:     	ldp	x29, x30, [sp, #0x10]
1032017e4:     	ldp	x20, x19, [sp], #0x20
1032017e8:     	cbz	x0, 0x1032017f0
1032017ec:     	b	0x102137210
1032017f0:     	ret

FUNCTION 0x1032017f4 size 12
1032017f4:     	adrp	x8, 0x104d83000
1032017f8:     	ldr	x0, [x8, #0xad8]
1032017fc:     	b	0x10312208c

FUNCTION 0x103201800 size 20
103201800:     	adrp	x8, 0x104d83000
103201804:     	ldr	x8, [x8, #0xad0]
103201808:     	cmp	x8, #0x0
10320180c:     	cset	w0, ne
103201810:     	ret

FUNCTION 0x103201814 size 76
103201814:     	adrp	x8, 0x104d83000
103201818:     	ldr	x8, [x8, #0xad0]
10320181c:     	cbz	x8, 0x10320185c
103201820:     	stp	x20, x19, [sp, #-0x20]!
103201824:     	stp	x29, x30, [sp, #0x10]
103201828:     	add	x29, sp, #0x10
10320182c:     	mov	w0, #0x0                ; =0
103201830:     	bl	0x1020be3e8
103201834:     	mov	w0, #0x0                ; =0
103201838:     	bl	0x1020be4c0
10320183c:     	adrp	x19, 0x104d83000
103201840:     	ldr	x0, [x19, #0xad8]
103201844:     	bl	0x10312208c
103201848:     	ldr	x0, [x19, #0xad8]
10320184c:     	bl	0x103122014
103201850:     	str	xzr, [x19, #0xad8]
103201854:     	ldp	x29, x30, [sp, #0x10]
103201858:     	ldp	x20, x19, [sp], #0x20
10320185c:     	ret

FUNCTION 0x103201860 size 76
103201860:     	stp	x20, x19, [sp, #-0x20]!
103201864:     	stp	x29, x30, [sp, #0x10]
103201868:     	add	x29, sp, #0x10
10320186c:     	bl	0x1020be270
103201870:     	bl	0x1020bdb14
103201874:     	bl	0x1032019c8
103201878:     	bl	0x1020d92cc
10320187c:     	adrp	x19, 0x104d83000
103201880:     	ldr	x0, [x19, #0xad0]
103201884:     	cbz	x0, 0x103201890
103201888:     	bl	0x103bdd34c
10320188c:     	str	xzr, [x19, #0xad0]
103201890:     	adrp	x19, 0x104d83000
103201894:     	ldr	x0, [x19, #0xad8]
103201898:     	bl	0x103122014
10320189c:     	str	xzr, [x19, #0xad8]
1032018a0:     	ldp	x29, x30, [sp, #0x10]
1032018a4:     	ldp	x20, x19, [sp], #0x20
1032018a8:     	ret

FUNCTION 0x1032018ac size 12
1032018ac:     	adrp	x8, 0x104d83000
1032018b0:     	ldr	x0, [x8, #0xad8]
1032018b4:     	b	0x103122044

FUNCTION 0x1032018b8 size 12
1032018b8:     	adrp	x8, 0x104d83000
1032018bc:     	ldr	x0, [x8, #0xad8]
1032018c0:     	b	0x10312205c

FUNCTION 0x1032018c4 size 12
1032018c4:     	adrp	x8, 0x104d83000
1032018c8:     	ldr	x0, [x8, #0xad8]
1032018cc:     	b	0x103122070

FUNCTION 0x1032018d0 size 12
1032018d0:     	adrp	x8, 0x104d83000
1032018d4:     	ldr	x0, [x8, #0xad8]
1032018d8:     	b	0x10312207c

FUNCTION 0x1032018dc size 12
1032018dc:     	adrp	x8, 0x104d83000
1032018e0:     	ldr	x0, [x8, #0xad8]
1032018e4:     	b	0x103122084

FUNCTION 0x1032018e8 size 16
1032018e8:     	mov	x1, x0
1032018ec:     	adrp	x8, 0x104d83000
1032018f0:     	ldr	x0, [x8, #0xad8]
1032018f4:     	b	0x103122094

FUNCTION 0x1032018f8 size 16
1032018f8:     	mov	x1, x0
1032018fc:     	adrp	x8, 0x104d83000
103201900:     	ldr	x0, [x8, #0xad8]
103201904:     	b	0x10312209c

FUNCTION 0x103201908 size 16
103201908:     	mov	x1, x0
10320190c:     	adrp	x8, 0x104d83000
103201910:     	ldr	x0, [x8, #0xad8]
103201914:     	b	0x1031220b8

FUNCTION 0x103201918 size 4
103201918:     	b	0x1031220c0

FUNCTION 0x10320191c size 4
10320191c:     	b	0x1031220c8

FUNCTION 0x103201920 size 4
103201920:     	b	0x1031220d0

FUNCTION 0x103201924 size 4
103201924:     	b	0x1031220d8

FUNCTION 0x103201928 size 60
103201928:     	stp	x20, x19, [sp, #-0x20]!
10320192c:     	stp	x29, x30, [sp, #0x10]
103201930:     	add	x29, sp, #0x10
103201934:     	adrp	x19, 0x104ced000
103201938:     	add	x19, x19, #0x6d5
10320193c:     	mov	x0, x19
103201940:     	bl	0x10310cd44
103201944:     	adrp	x0, 0x10310c000
103201948:     	add	x0, x0, #0xd7c
10320194c:     	adrp	x2, 0x100000000
103201950:     	add	x2, x2, #0x0
103201954:     	mov	x1, x19
103201958:     	ldp	x29, x30, [sp, #0x10]
10320195c:     	ldp	x20, x19, [sp], #0x20
103201960:     	b	0x103bdd3c4

FUNCTION 0x103201964 size 12
103201964:     	stp	xzr, xzr, [x0]
103201968:     	str	wzr, [x0, #0x10]
10320196c:     	ret

FUNCTION 0x103201970 size 12
103201970:     	stp	xzr, xzr, [x0]
103201974:     	str	wzr, [x0, #0x10]
103201978:     	ret

FUNCTION 0x10320197c size 4
10320197c:     	ret

FUNCTION 0x103201980 size 4
103201980:     	ret

FUNCTION 0x103201984 size 12
103201984:     	adrp	x8, 0x104d83000
103201988:     	ldr	x0, [x8, #0xae0]
10320198c:     	ret

FUNCTION 0x103201990 size 56
103201990:     	stp	x20, x19, [sp, #-0x20]!
103201994:     	stp	x29, x30, [sp, #0x10]
103201998:     	add	x29, sp, #0x10
10320199c:     	adrp	x19, 0x104d83000
1032019a0:     	ldr	x8, [x19, #0xae0]
1032019a4:     	cbnz	x8, 0x1032019bc
1032019a8:     	mov	w0, #0x14               ; =20
1032019ac:     	bl	0x103bdd37c
1032019b0:     	stp	xzr, xzr, [x0]
1032019b4:     	str	wzr, [x0, #0x10]
1032019b8:     	str	x0, [x19, #0xae0]
1032019bc:     	ldp	x29, x30, [sp, #0x10]
1032019c0:     	ldp	x20, x19, [sp], #0x20
1032019c4:     	ret

FUNCTION 0x1032019c8 size 44
1032019c8:     	stp	x20, x19, [sp, #-0x20]!
1032019cc:     	stp	x29, x30, [sp, #0x10]
1032019d0:     	add	x29, sp, #0x10
1032019d4:     	adrp	x19, 0x104d83000
1032019d8:     	ldr	x0, [x19, #0xae0]
1032019dc:     	cbz	x0, 0x1032019e8
1032019e0:     	bl	0x103bdd34c
1032019e4:     	str	xzr, [x19, #0xae0]
1032019e8:     	ldp	x29, x30, [sp, #0x10]
1032019ec:     	ldp	x20, x19, [sp], #0x20
1032019f0:     	ret

FUNCTION 0x1032019f4 size 44
1032019f4:     	ldr	w8, [x1]
1032019f8:     	cmp	w8, #0x3
1032019fc:     	b.eq	0x103201a18
103201a00:     	cmp	w8, #0x2
103201a04:     	b.eq	0x103201a14
103201a08:     	cmp	w8, #0x1
103201a0c:     	b.ne	0x103201a1c
103201a10:     	b	0x103201a20
103201a14:     	b	0x103201b60
103201a18:     	b	0x103201ba0
103201a1c:     	ret

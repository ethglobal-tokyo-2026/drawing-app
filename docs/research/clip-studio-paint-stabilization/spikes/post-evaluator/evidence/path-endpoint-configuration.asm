
FUNCTION 0x102789798 size 8
102789798:     	str	d0, [x0, #0x98]
10278979c:     	ret

FUNCTION 0x1027897a0 size 348
1027897a0:     	sub	sp, sp, #0x80
1027897a4:     	stp	x24, x23, [sp, #0x40]
1027897a8:     	stp	x22, x21, [sp, #0x50]
1027897ac:     	stp	x20, x19, [sp, #0x60]
1027897b0:     	stp	x29, x30, [sp, #0x70]
1027897b4:     	add	x29, sp, #0x70
1027897b8:     	mov	x19, x0
1027897bc:     	ldr	x8, [x1]
1027897c0:     	cbz	x8, 0x102789820
1027897c4:     	mov	x22, x1
1027897c8:     	ldr	x9, [x19, #0x18]
1027897cc:     	add	x8, sp, #0x30
1027897d0:     	ldp	x21, x9, [x9, #0x50]
1027897d4:     	stp	x21, x9, [sp, #0x30]
1027897d8:     	cbz	x9, 0x102789838
1027897dc:     	add	x10, x9, #0xc
1027897e0:     	mov	w11, #0x1               ; =1
1027897e4:     	ldadd	w11, w10, [x10]
1027897e8:     	add	x10, sp, #0x20
1027897ec:     	add	x20, x10, #0x8
1027897f0:     	stp	xzr, x9, [sp, #0x20]
1027897f4:     	ldr	w10, [x9, #0x8]
1027897f8:     	cbz	w10, 0x10278984c
1027897fc:     	add	w11, w10, #0x1
102789800:     	add	x12, x9, #0x8
102789804:     	mov	x13, x10
102789808:     	cas	w13, w11, [x12]
10278980c:     	cmp	w13, w10
102789810:     	mov	x10, x13
102789814:     	b.ne	0x1027897f8
102789818:     	str	x21, [sp, #0x20]
10278981c:     	b	0x102789854
102789820:     	add	x8, sp, #0x30
102789824:     	ldur	q0, [x19, #0x88]
102789828:     	stp	xzr, xzr, [x19, #0x88]
10278982c:     	str	q0, [sp, #0x30]
102789830:     	orr	x0, x8, #0x8
102789834:     	b	0x1027898c4
102789838:     	mov	x21, #0x0               ; =0
10278983c:     	add	x9, sp, #0x20
102789840:     	add	x20, x9, #0x8
102789844:     	stp	xzr, xzr, [sp, #0x20]
102789848:     	b	0x102789854
10278984c:     	mov	x21, #0x0               ; =0
102789850:     	str	xzr, [sp, #0x28]
102789854:     	add	x0, x8, #0x8
102789858:     	bl	0x100015a60
10278985c:     	ldp	x9, x8, [x22]
102789860:     	stp	x9, x8, [sp]
102789864:     	cbz	x8, 0x102789874
102789868:     	add	x8, x8, #0x8
10278986c:     	mov	w9, #0x1                ; =1
102789870:     	ldadd	w9, w8, [x8]
102789874:     	mov	x22, sp
102789878:     	add	x23, sp, #0x10
10278987c:     	add	x8, sp, #0x10
102789880:     	mov	x1, sp
102789884:     	mov	x0, x21
102789888:     	mov	w2, #0x1                ; =1
10278988c:     	bl	0x1024cc404
102789890:     	add	x8, sp, #0x30
102789894:     	ldr	q0, [sp, #0x10]
102789898:     	stp	xzr, xzr, [sp, #0x10]
10278989c:     	ldur	q1, [x19, #0x88]
1027898a0:     	stur	q0, [x19, #0x88]
1027898a4:     	str	q1, [sp, #0x30]
1027898a8:     	orr	x0, x8, #0x8
1027898ac:     	bl	0x10001022c
1027898b0:     	orr	x0, x23, #0x8
1027898b4:     	bl	0x10001022c
1027898b8:     	add	x0, x22, #0x8
1027898bc:     	bl	0x10001022c
1027898c0:     	mov	x0, x20
1027898c4:     	bl	0x10001022c
1027898c8:     	ldp	x29, x30, [sp, #0x70]
1027898cc:     	ldp	x20, x19, [sp, #0x60]
1027898d0:     	ldp	x22, x21, [sp, #0x50]
1027898d4:     	ldp	x24, x23, [sp, #0x40]
1027898d8:     	add	sp, sp, #0x80
1027898dc:     	ret
1027898e0:     	mov	x19, x0
1027898e4:     	add	x0, x22, #0x8
1027898e8:     	bl	0x10001022c
1027898ec:     	mov	x0, x20
1027898f0:     	bl	0x10001022c
1027898f4:     	mov	x0, x19
1027898f8:     	bl	0x103bda970

FUNCTION 0x1027898fc size 8
1027898fc:     	ldr	w0, [x0, #0xa0]
102789900:     	ret

FUNCTION 0x102789904 size 8
102789904:     	str	w1, [x0, #0xa0]
102789908:     	ret

FUNCTION 0x10278990c size 60
10278990c:     	sub	sp, sp, #0x30
102789910:     	stp	x20, x19, [sp, #0x10]
102789914:     	stp	x29, x30, [sp, #0x20]
102789918:     	add	x29, sp, #0x20
10278991c:     	mov	x19, x1
102789920:     	ldr	x0, [x0, #0x88]
102789924:     	add	x2, sp, #0x8
102789928:     	mov	x3, sp
10278992c:     	bl	0x1024c48b8
102789930:     	ldp	d1, d0, [sp]
102789934:     	stp	d0, d1, [x19, #0x38]
102789938:     	ldp	x29, x30, [sp, #0x20]
10278993c:     	ldp	x20, x19, [sp, #0x10]
102789940:     	add	sp, sp, #0x30
102789944:     	ret

FUNCTION 0x102789948 size 48
102789948:     	sub	sp, sp, #0x30
10278994c:     	stp	x29, x30, [sp, #0x20]
102789950:     	add	x29, sp, #0x20
102789954:     	stp	d0, d1, [sp, #0x10]
102789958:     	str	xzr, [sp, #0x8]
10278995c:     	add	x1, sp, #0x10
102789960:     	add	x2, sp, #0x8
102789964:     	fmov	d0, d2
102789968:     	bl	0x1027823dc
10278996c:     	ldp	x29, x30, [sp, #0x20]
102789970:     	add	sp, sp, #0x30
102789974:     	ret

FUNCTION 0x102789978 size 532
102789978:     	sub	sp, sp, #0xb0
10278997c:     	stp	x28, x27, [sp, #0x50]
102789980:     	stp	x26, x25, [sp, #0x60]
102789984:     	stp	x24, x23, [sp, #0x70]
102789988:     	stp	x22, x21, [sp, #0x80]
10278998c:     	stp	x20, x19, [sp, #0x90]
102789990:     	stp	x29, x30, [sp, #0xa0]
102789994:     	add	x29, sp, #0xa0
102789998:     	mov	x19, x1
10278999c:     	mov	x20, x0
1027899a0:     	ldr	x21, [x0, #0x30]
1027899a4:     	ldr	x0, [x0, #0x88]
1027899a8:     	bl	0x1024c28c0
1027899ac:     	mov	x22, x0
1027899b0:     	ldr	x0, [x20, #0x88]
1027899b4:     	ldr	w23, [x0, #0x80]
1027899b8:     	stp	xzr, xzr, [sp, #0x30]
1027899bc:     	ldr	w8, [x20, #0xa0]
1027899c0:     	stp	w8, wzr, [sp, #0x20]
1027899c4:     	str	xzr, [sp, #0x28]
1027899c8:     	add	x1, sp, #0x20
1027899cc:     	bl	0x1024c3cdc
1027899d0:     	ldr	w8, [x20, #0x80]
1027899d4:     	cbnz	w8, 0x102789a40
1027899d8:     	ldr	x8, [x20, #0x88]
1027899dc:     	ldrb	w8, [x8, #0x80]
1027899e0:     	tbnz	w8, #0x5, 0x102789a40
1027899e4:     	cbz	x21, 0x102789a78
1027899e8:     	ldp	w24, w25, [x19, #0x10]
1027899ec:     	ldp	w26, w27, [x19, #0x8]
1027899f0:     	ldp	w9, w8, [x21, #0x18]
1027899f4:     	ldp	w11, w10, [x21, #0x20]
1027899f8:     	cmp	w9, w24
1027899fc:     	ccmp	w11, w26, #0x4, lt
102789a00:     	ccmp	w8, w25, #0x0, gt
102789a04:     	ccmp	w10, w27, #0x4, lt
102789a08:     	b.le	0x102789a34
102789a0c:     	str	xzr, [sp]
102789a10:     	and	w4, w23, #0x2
102789a14:     	and	w5, w23, #0x20
102789a18:     	add	x6, sp, #0x20
102789a1c:     	mov	x0, x21
102789a20:     	mov	x1, x19
102789a24:     	mov	w2, #0x0                ; =0
102789a28:     	mov	x3, x22
102789a2c:     	mov	w7, #0x0                ; =0
102789a30:     	bl	0x10276cbd4
102789a34:     	ldr	x21, [x21, #0x28]
102789a38:     	cbnz	x21, 0x1027899f0
102789a3c:     	b	0x102789a78
102789a40:     	cbz	x21, 0x102789a74
102789a44:     	str	xzr, [sp]
102789a48:     	and	w4, w23, #0x2
102789a4c:     	and	w5, w23, #0x20
102789a50:     	add	x6, sp, #0x20
102789a54:     	mov	x0, x21
102789a58:     	mov	x1, x19
102789a5c:     	mov	w2, #0x0                ; =0
102789a60:     	mov	x3, x22
102789a64:     	mov	w7, #0x1                ; =1
102789a68:     	bl	0x10276cbd4
102789a6c:     	ldr	x21, [x21, #0x28]
102789a70:     	cbnz	x21, 0x102789a44
102789a74:     	str	wzr, [x20, #0x80]
102789a78:     	ldr	x0, [x20, #0x88]
102789a7c:     	add	x8, sp, #0x10
102789a80:     	bl	0x1024c1e3c
102789a84:     	ldr	x0, [sp, #0x10]
102789a88:     	cbz	x0, 0x102789b18
102789a8c:     	bl	0x1024c28c0
102789a90:     	mov	x21, x0
102789a94:     	ldr	x8, [sp, #0x10]
102789a98:     	ldr	w22, [x8, #0x80]
102789a9c:     	ldr	w8, [x20, #0xa0]
102789aa0:     	mov	w9, #0x4e6d             ; =20077
102789aa4:     	movk	w9, #0x41c6, lsl #16
102789aa8:     	mov	w10, #0xd687            ; =54919
102789aac:     	movk	w10, #0x12, lsl #16
102789ab0:     	madd	w8, w8, w9, w10
102789ab4:     	stp	w8, wzr, [sp, #0x20]
102789ab8:     	add	x8, sp, #0x40
102789abc:     	ldr	q0, [sp, #0x30]
102789ac0:     	stp	xzr, xzr, [sp, #0x28]
102789ac4:     	str	xzr, [sp, #0x38]
102789ac8:     	str	q0, [sp, #0x40]
102789acc:     	orr	x0, x8, #0x8
102789ad0:     	bl	0x10001022c
102789ad4:     	ldr	x0, [sp, #0x10]
102789ad8:     	add	x1, sp, #0x20
102789adc:     	bl	0x1024c3cdc
102789ae0:     	ldr	x20, [x20, #0x30]
102789ae4:     	cbz	x20, 0x102789b18
102789ae8:     	str	xzr, [sp]
102789aec:     	and	w4, w22, #0x2
102789af0:     	and	w5, w22, #0x20
102789af4:     	add	x6, sp, #0x20
102789af8:     	mov	x0, x20
102789afc:     	mov	x1, x19

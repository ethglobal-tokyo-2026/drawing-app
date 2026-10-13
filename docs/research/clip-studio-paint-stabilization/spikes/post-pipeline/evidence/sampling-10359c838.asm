
FUNCTION 0x10359c838 size 504
10359c838:     	sub	sp, sp, #0x80
10359c83c:     	stp	d15, d14, [sp, #0x20]
10359c840:     	stp	d13, d12, [sp, #0x30]
10359c844:     	stp	d11, d10, [sp, #0x40]
10359c848:     	stp	d9, d8, [sp, #0x50]
10359c84c:     	stp	x20, x19, [sp, #0x60]
10359c850:     	stp	x29, x30, [sp, #0x70]
10359c854:     	add	x29, sp, #0x70
10359c858:     	mov	x19, x1
10359c85c:     	mov	x20, x0
10359c860:     	fmov	d8, d7
10359c864:     	fmov	d9, d6
10359c868:     	fmov	d11, d3
10359c86c:     	fmov	d14, d2
10359c870:     	fmov	d10, d1
10359c874:     	fmov	d13, d0
10359c878:     	ldr	d0, [x29, #0x20]
10359c87c:     	str	d0, [sp, #0x8]
10359c880:     	ldp	d0, d12, [x29, #0x10]
10359c884:     	stp	d0, d5, [sp, #0x10]
10359c888:     	fmov	d0, d13
10359c88c:     	fmov	d15, d4
10359c890:     	bl	0x10359c490
10359c894:     	ldr	d16, [sp, #0x8]
10359c898:     	mov	x9, #0x0                ; =0
10359c89c:     	fabd	d1, d16, d12
10359c8a0:     	fmul	d0, d1, d0
10359c8a4:     	ldr	d1, [sp, #0x10]
10359c8a8:     	fdiv	d0, d0, d1
10359c8ac:     	fcvtzs	w8, d0
10359c8b0:     	mov	w10, #0xff              ; =255
10359c8b4:     	cmp	w8, #0xff
10359c8b8:     	csel	w8, w8, w10, lt
10359c8bc:     	mov	w10, #0x4               ; =4
10359c8c0:     	cmp	w8, #0x4
10359c8c4:     	csel	w8, w8, w10, gt
10359c8c8:     	fsub	d0, d16, d12
10359c8cc:     	ucvtf	d1, w8
10359c8d0:     	fdiv	d0, d0, d1
10359c8d4:     	fmov	d1, #1.00000000
10359c8d8:     	fmov	d2, #3.00000000
10359c8dc:     	fsub	d5, d1, d12
10359c8e0:     	fmul	d4, d5, d5
10359c8e4:     	fmul	d3, d12, d12
10359c8e8:     	add	x10, x19, x9, lsl #4
10359c8ec:     	cbz	w20, 0x10359c944
10359c8f0:     	fmul	d4, d5, d4
10359c8f4:     	fmul	d6, d5, d2
10359c8f8:     	fmul	d5, d5, d6
10359c8fc:     	fmul	d5, d12, d5
10359c900:     	fmul	d6, d12, d6
10359c904:     	fmul	d6, d12, d6
10359c908:     	fmul	d3, d12, d3
10359c90c:     	fmul	d7, d14, d5
10359c910:     	fmadd	d7, d4, d13, d7
10359c914:     	fmadd	d7, d6, d15, d7
10359c918:     	fmadd	d7, d3, d9, d7
10359c91c:     	fmul	d5, d11, d5
10359c920:     	fmadd	d4, d4, d10, d5
10359c924:     	ldr	d5, [sp, #0x18]
10359c928:     	fmadd	d4, d6, d5, d4
10359c92c:     	fmadd	d3, d3, d8, d4
10359c930:     	stp	d7, d3, [x10]
10359c934:     	add	x9, x9, #0x1
10359c938:     	cmp	x9, x8
10359c93c:     	b.ne	0x10359c974
10359c940:     	b	0x10359c97c
10359c944:     	fadd	d5, d5, d5
10359c948:     	fmul	d5, d12, d5
10359c94c:     	fmul	d6, d14, d5
10359c950:     	fmadd	d6, d4, d13, d6
10359c954:     	fmadd	d6, d3, d9, d6
10359c958:     	fmul	d5, d11, d5
10359c95c:     	fmadd	d4, d4, d10, d5
10359c960:     	fmadd	d3, d3, d8, d4
10359c964:     	stp	d6, d3, [x10]
10359c968:     	add	x9, x9, #0x1
10359c96c:     	cmp	x9, x8
10359c970:     	b.eq	0x10359c9d4
10359c974:     	fadd	d12, d0, d12
10359c978:     	b	0x10359c8dc
10359c97c:     	fmov	d0, #1.00000000
10359c980:     	fsub	d0, d0, d16
10359c984:     	fmul	d1, d0, d0
10359c988:     	fmul	d1, d0, d1
10359c98c:     	fmov	d2, #3.00000000
10359c990:     	fmul	d2, d0, d2
10359c994:     	fmul	d0, d0, d2
10359c998:     	fmul	d3, d0, d16
10359c99c:     	fmul	d0, d2, d16
10359c9a0:     	fmul	d2, d0, d16
10359c9a4:     	fmul	d0, d16, d16
10359c9a8:     	fmul	d4, d0, d16
10359c9ac:     	fmul	d0, d14, d3
10359c9b0:     	fmadd	d0, d1, d13, d0
10359c9b4:     	fmadd	d0, d2, d15, d0
10359c9b8:     	fmadd	d0, d4, d9, d0
10359c9bc:     	fmul	d3, d11, d3
10359c9c0:     	fmadd	d1, d1, d10, d3
10359c9c4:     	ldr	d3, [sp, #0x18]
10359c9c8:     	fmadd	d1, d2, d3, d1
10359c9cc:     	fmadd	d1, d4, d8, d1
10359c9d0:     	b	0x10359ca04
10359c9d4:     	fmov	d0, #1.00000000
10359c9d8:     	fsub	d0, d0, d16
10359c9dc:     	fmul	d1, d0, d0
10359c9e0:     	fadd	d0, d0, d0
10359c9e4:     	fmul	d2, d0, d16
10359c9e8:     	fmul	d3, d16, d16
10359c9ec:     	fmul	d0, d14, d2
10359c9f0:     	fmadd	d0, d1, d13, d0
10359c9f4:     	fmadd	d0, d3, d9, d0
10359c9f8:     	fmul	d2, d11, d2
10359c9fc:     	fmadd	d1, d1, d10, d2
10359ca00:     	fmadd	d1, d3, d8, d1
10359ca04:     	add	x9, x19, x8, lsl #4
10359ca08:     	stp	d0, d1, [x9]
10359ca0c:     	add	w0, w8, #0x1
10359ca10:     	ldp	x29, x30, [sp, #0x70]
10359ca14:     	ldp	x20, x19, [sp, #0x60]
10359ca18:     	ldp	d9, d8, [sp, #0x50]
10359ca1c:     	ldp	d11, d10, [sp, #0x40]
10359ca20:     	ldp	d13, d12, [sp, #0x30]
10359ca24:     	ldp	d15, d14, [sp, #0x20]
10359ca28:     	add	sp, sp, #0x80
10359ca2c:     	ret

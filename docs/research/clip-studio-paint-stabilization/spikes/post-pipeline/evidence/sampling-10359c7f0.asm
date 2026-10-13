
FUNCTION 0x10359c7f0 size 72
10359c7f0:     	sub	sp, sp, #0x30
10359c7f4:     	stp	x29, x30, [sp, #0x20]
10359c7f8:     	add	x29, sp, #0x20
10359c7fc:     	mov	x1, x0
10359c800:     	fmov	d16, d5
10359c804:     	fmov	d17, d4
10359c808:     	ldr	d4, [x29, #0x10]
10359c80c:     	stp	d7, d4, [sp, #0x8]
10359c810:     	str	d6, [sp]
10359c814:     	fmov	d4, d2
10359c818:     	fmov	d5, d3
10359c81c:     	fmov	d6, d17
10359c820:     	fmov	d7, d16
10359c824:     	mov	w0, #0x0                ; =0
10359c828:     	bl	0x10359c838
10359c82c:     	ldp	x29, x30, [sp, #0x20]
10359c830:     	add	sp, sp, #0x30
10359c834:     	ret

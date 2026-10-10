102992930:     	sub	sp, sp, #0xd0
102992934:     	stp	d9, d8, [sp, #0xa0]
102992938:     	stp	x20, x19, [sp, #0xb0]
10299293c:     	stp	x29, x30, [sp, #0xc0]
102992940:     	add	x29, sp, #0xc0
102992944:     	ldp	x9, x8, [x0]
102992948:     	stp	x9, x8, [sp, #0x48]
10299294c:     	cbz	x8, 0x10299295c
102992950:     	add	x8, x8, #0x8
102992954:     	mov	w9, #0x1                ; =1
102992958:     	ldadd	w9, w8, [x8]
10299295c:     	add	x20, sp, #0x48
102992960:     	adrp	x0, 0x104cb6000
102992964:     	add	x0, x0, #0x90
102992968:     	bl	0x10214de74
10299296c:     	mov	x1, x0
102992970:     	fmov	d0, xzr
102992974:     	movi.2d	v1, #0000000000000000
102992978:     	stp	q1, q1, [sp]
10299297c:     	mov.d	v0[1], v0[0]
102992980:     	str	wzr, [sp, #0x40]
102992984:     	str	q0, [sp, #0x30]
102992988:     	movi.2d	v0, #0xffffffffffffffff
10299298c:     	str	d0, [sp, #0x20]
102992990:     	mov	w8, #-0x1               ; =-1
102992994:     	str	w8, [sp, #0x28]
102992998:     	add	x8, sp, #0x58
10299299c:     	add	x0, sp, #0x48
1029929a0:     	mov	x2, sp
1029929a4:     	bl	0x102991b84
1029929a8:     	ldr	d8, [sp, #0x58]
1029929ac:     	add	x0, x20, #0x8
1029929b0:     	bl	0x10001022c
1029929b4:     	fmov	d0, d8
1029929b8:     	ldp	x29, x30, [sp, #0xc0]
1029929bc:     	ldp	x20, x19, [sp, #0xb0]
1029929c0:     	ldp	d9, d8, [sp, #0xa0]
1029929c4:     	add	sp, sp, #0xd0
1029929c8:     	ret
1029929cc:     	b	0x1029929d0
1029929d0:     	mov	x19, x0
1029929d4:     	add	x0, x20, #0x8
1029929d8:     	bl	0x10001022c
1029929dc:     	mov	x0, x19
1029929e0:     	bl	0x103bda970
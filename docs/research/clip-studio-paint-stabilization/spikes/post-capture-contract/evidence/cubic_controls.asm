
FUNCTION 0x10276995c size 32
10276995c:     	cmp	w2, #0x0
102769960:     	mov	w8, #0x88               ; =136
102769964:     	mov	w9, #0x78               ; =120
102769968:     	csel	x8, x9, x8, eq
10276996c:     	ldr	q0, [x0, x8]
102769970:     	str	q0, [x1]
102769974:     	mov	w0, #0x1                ; =1
102769978:     	ret

FUNCTION 0x10276997c size 44
10276997c:     	cmp	w1, #0x0
102769980:     	mov	w8, #0x88               ; =136
102769984:     	mov	w9, #0x78               ; =120
102769988:     	csel	x8, x9, x8, eq
10276998c:     	mov	w9, #0x90               ; =144
102769990:     	mov	w10, #0x80              ; =128
102769994:     	csel	x9, x10, x9, eq
102769998:     	str	d0, [x0, x8]
10276999c:     	str	d1, [x0, x9]
1027699a0:     	mov	w0, #0x1                ; =1
1027699a4:     	ret

FUNCTION 0x1027699a8 size 272
1027699a8:     	sub	sp, sp, #0x60
1027699ac:     	stp	x22, x21, [sp, #0x30]
1027699b0:     	stp	x20, x19, [sp, #0x40]
1027699b4:     	stp	x29, x30, [sp, #0x50]
1027699b8:     	add	x29, sp, #0x50
1027699bc:     	mov	x19, x1
1027699c0:     	mov	x20, x0
1027699c4:     	ldr	w8, [x0, #0x40]
1027699c8:     	cbz	w2, 0x1027699d8
1027699cc:     	tbnz	w8, #0xb, 0x1027699e4
1027699d0:     	ldur	q0, [x20, #0x88]
1027699d4:     	b	0x102769a9c
1027699d8:     	tbnz	w8, #0xa, 0x102769a38
1027699dc:     	ldur	q0, [x20, #0x78]
1027699e0:     	b	0x102769a9c
1027699e4:     	mov	x0, x20
1027699e8:     	bl	0x10276af80
1027699ec:     	cbz	x0, 0x102769a98
1027699f0:     	mov	x21, x0
1027699f4:     	fmov	d0, #1.00000000
1027699f8:     	mov	x0, x20
1027699fc:     	bl	0x10276b5e4
102769a00:     	stp	q1, q0, [sp]
102769a04:     	ldur	q0, [x21, #0x8]
102769a08:     	str	q0, [sp, #0x20]
102769a0c:     	add	x0, x20, #0x8
102769a10:     	add	x1, sp, #0x20
102769a14:     	bl	0x102193618
102769a18:     	fmov	d1, #3.00000000
102769a1c:     	fdiv	d0, d0, d1
102769a20:     	ldp	q2, q1, [sp]
102769a24:     	mov.d	v1[1], v2[0]
102769a28:     	fmul.2d	v0, v1, v0[0]
102769a2c:     	ldr	q1, [sp, #0x20]
102769a30:     	fsub.2d	v0, v1, v0
102769a34:     	b	0x102769a9c
102769a38:     	movi	d0, #0000000000000000
102769a3c:     	mov	x0, x20
102769a40:     	bl	0x10276b5e4
102769a44:     	stp	q1, q0, [sp]
102769a48:     	ldur	q0, [x20, #0x8]
102769a4c:     	str	q0, [sp, #0x20]
102769a50:     	mov	x0, x20
102769a54:     	bl	0x10276af80
102769a58:     	cbnz	x0, 0x102769a64
102769a5c:     	ldr	x0, [x20, #0x30]
102769a60:     	cbz	x0, 0x102769a6c
102769a64:     	ldur	q0, [x0, #0x8]
102769a68:     	str	q0, [sp, #0x20]
102769a6c:     	add	x0, x20, #0x8
102769a70:     	add	x1, sp, #0x20
102769a74:     	bl	0x102193618
102769a78:     	fmov	d1, #3.00000000
102769a7c:     	fdiv	d0, d0, d1
102769a80:     	ldp	q2, q1, [sp]
102769a84:     	mov.d	v1[1], v2[0]
102769a88:     	fmul.2d	v0, v1, v0[0]
102769a8c:     	ldur	q1, [x20, #0x8]
102769a90:     	fadd.2d	v0, v1, v0
102769a94:     	b	0x102769a9c
102769a98:     	ldur	q0, [x20, #0x8]
102769a9c:     	str	q0, [x19]
102769aa0:     	mov	w0, #0x1                ; =1
102769aa4:     	ldp	x29, x30, [sp, #0x50]
102769aa8:     	ldp	x20, x19, [sp, #0x40]
102769aac:     	ldp	x22, x21, [sp, #0x30]
102769ab0:     	add	sp, sp, #0x60
102769ab4:     	ret


FUNCTION 0x10359fd24 size 356
10359fd24:     	sub	sp, sp, #0x70
10359fd28:     	stp	d9, d8, [sp, #0x50]
10359fd2c:     	stp	x29, x30, [sp, #0x60]
10359fd30:     	add	x29, sp, #0x60
10359fd34:     	ldr	d16, [x29, #0x20]
10359fd38:     	ldr	d17, [x29, #0x10]
10359fd3c:     	stp	d4, d5, [x29, #-0x20]
10359fd40:     	stp	d6, d7, [sp, #0x30]
10359fd44:     	mov.d	v0[1], v1[0]
10359fd48:     	fmov.2d	v1, #1.62500000
10359fd4c:     	fmul.2d	v18, v0, v1
10359fd50:     	mov.d	v2[1], v3[0]
10359fd54:     	fmov.2d	v3, #11.00000000
10359fd58:     	fmul.2d	v19, v2, v3
10359fd5c:     	fsub.2d	v18, v18, v19
10359fd60:     	mov.d	v4[1], v5[0]
10359fd64:     	mov	x8, #0x300000000000     ; =52776558133248
10359fd68:     	movk	x8, #0x4056, lsl #48
10359fd6c:     	dup.2d	v5, x8
10359fd70:     	fmul.2d	v19, v4, v5
10359fd74:     	fadd.2d	v18, v19, v18
10359fd78:     	mov.d	v6[1], v7[0]
10359fd7c:     	fmov.2d	v7, #23.00000000
10359fd80:     	fmul.2d	v19, v6, v7
10359fd84:     	fadd.2d	v18, v19, v18
10359fd88:     	add	x8, x29, #0x18
10359fd8c:     	ld1.d	{ v17 }[1], [x8]
10359fd90:     	fmov.2d	v19, #4.00000000
10359fd94:     	fmul.2d	v20, v17, v19
10359fd98:     	fsub.2d	v18, v18, v20
10359fd9c:     	add	x8, x29, #0x28
10359fda0:     	ld1.d	{ v16 }[1], [x8]
10359fda4:     	fmov.2d	v20, #0.62500000
10359fda8:     	fmul.2d	v21, v16, v20
10359fdac:     	fadd.2d	v18, v21, v18
10359fdb0:     	mov	x8, #0xc00000000000     ; =211106232532992
10359fdb4:     	movk	x8, #0x4058, lsl #48
10359fdb8:     	dup.2d	v21, x8
10359fdbc:     	fdiv.2d	v26, v18, v21
10359fdc0:     	fmov.2d	v18, #1.50000000
10359fdc4:     	fmul.2d	v22, v0, v18
10359fdc8:     	fmov.2d	v23, #10.00000000
10359fdcc:     	fmul.2d	v24, v2, v23
10359fdd0:     	mov	x8, #0x404d000000000000 ; =4633359591634108416
10359fdd4:     	dup.2d	v25, x8
10359fdd8:     	fsub.2d	v22, v22, v24
10359fddc:     	fmul.2d	v24, v4, v25
10359fde0:     	fadd.2d	v22, v24, v22
10359fde4:     	fmul.2d	v24, v6, v25
10359fde8:     	fadd.2d	v22, v24, v22
10359fdec:     	fmul.2d	v23, v17, v23
10359fdf0:     	fsub.2d	v22, v22, v23
10359fdf4:     	fmul.2d	v18, v16, v18
10359fdf8:     	fadd.2d	v18, v18, v22
10359fdfc:     	fdiv.2d	v18, v18, v21
10359fe00:     	stp	q18, q26, [sp, #0x10]
10359fe04:     	fmul.2d	v0, v0, v20
10359fe08:     	fmul.2d	v2, v2, v19
10359fe0c:     	fsub.2d	v0, v0, v2
10359fe10:     	fmul.2d	v2, v4, v7
10359fe14:     	fadd.2d	v0, v2, v0
10359fe18:     	fmul.2d	v2, v6, v5
10359fe1c:     	fadd.2d	v0, v2, v0
10359fe20:     	fmul.2d	v2, v17, v3
10359fe24:     	fsub.2d	v0, v0, v2
10359fe28:     	fmul.2d	v1, v16, v1
10359fe2c:     	fadd.2d	v0, v1, v0
10359fe30:     	fdiv.2d	v0, v0, v21
10359fe34:     	str	q0, [sp]
10359fe38:     	sub	x0, x29, #0x20
10359fe3c:     	add	x1, sp, #0x20
10359fe40:     	bl	0x102193618
10359fe44:     	fmov	d8, d0
10359fe48:     	add	x0, sp, #0x20
10359fe4c:     	add	x1, sp, #0x10
10359fe50:     	bl	0x102193618
10359fe54:     	fadd	d8, d8, d0
10359fe58:     	add	x0, sp, #0x10
10359fe5c:     	mov	x1, sp
10359fe60:     	bl	0x102193618
10359fe64:     	fadd	d8, d8, d0
10359fe68:     	mov	x0, sp
10359fe6c:     	add	x1, sp, #0x30
10359fe70:     	bl	0x102193618
10359fe74:     	fadd	d0, d8, d0
10359fe78:     	ldp	x29, x30, [sp, #0x60]
10359fe7c:     	ldp	d9, d8, [sp, #0x50]
10359fe80:     	add	sp, sp, #0x70
10359fe84:     	ret

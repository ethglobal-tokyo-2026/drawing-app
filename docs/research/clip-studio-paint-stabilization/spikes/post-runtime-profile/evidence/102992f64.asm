
FUNCTION 0x102992f64 size 172
102992f64:     	sub	sp, sp, #0xc0
102992f68:     	stp	x20, x19, [sp, #0xa0]
102992f6c:     	stp	x29, x30, [sp, #0xb0]
102992f70:     	add	x29, sp, #0xb0
102992f74:     	ldp	x9, x8, [x0]
102992f78:     	stp	x9, x8, [sp, #0x48]
102992f7c:     	cbz	x8, 0x102992f8c
102992f80:     	add	x8, x8, #0x8
102992f84:     	mov	w9, #0x1                ; =1
102992f88:     	ldadd	w9, w8, [x8]
102992f8c:     	add	x20, sp, #0x48
102992f90:     	adrp	x0, 0x104cb6000
102992f94:     	add	x0, x0, #0x90
102992f98:     	bl	0x10214de74
102992f9c:     	mov	x1, x0
102992fa0:     	fmov	d0, xzr
102992fa4:     	movi.2d	v1, #0000000000000000
102992fa8:     	stp	q1, q1, [sp]
102992fac:     	mov.d	v0[1], v0[0]
102992fb0:     	str	wzr, [sp, #0x40]
102992fb4:     	str	q0, [sp, #0x30]
102992fb8:     	movi.2d	v0, #0xffffffffffffffff
102992fbc:     	str	d0, [sp, #0x20]
102992fc0:     	mov	w8, #-0x1               ; =-1
102992fc4:     	str	w8, [sp, #0x28]
102992fc8:     	add	x8, sp, #0x58
102992fcc:     	add	x0, sp, #0x48
102992fd0:     	mov	x2, sp
102992fd4:     	bl	0x102991b84
102992fd8:     	ldr	w19, [sp, #0x6c]
102992fdc:     	add	x0, x20, #0x8
102992fe0:     	bl	0x10001022c
102992fe4:     	mov	x0, x19
102992fe8:     	ldp	x29, x30, [sp, #0xb0]
102992fec:     	ldp	x20, x19, [sp, #0xa0]
102992ff0:     	add	sp, sp, #0xc0
102992ff4:     	ret
102992ff8:     	b	0x102992ffc
102992ffc:     	mov	x19, x0
102993000:     	add	x0, x20, #0x8
102993004:     	bl	0x10001022c
102993008:     	mov	x0, x19
10299300c:     	bl	0x103bda970

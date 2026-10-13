
FUNCTION 0x102992eb8 size 172
102992eb8:     	sub	sp, sp, #0xc0
102992ebc:     	stp	x20, x19, [sp, #0xa0]
102992ec0:     	stp	x29, x30, [sp, #0xb0]
102992ec4:     	add	x29, sp, #0xb0
102992ec8:     	ldp	x9, x8, [x0]
102992ecc:     	stp	x9, x8, [sp, #0x48]
102992ed0:     	cbz	x8, 0x102992ee0
102992ed4:     	add	x8, x8, #0x8
102992ed8:     	mov	w9, #0x1                ; =1
102992edc:     	ldadd	w9, w8, [x8]
102992ee0:     	add	x20, sp, #0x48
102992ee4:     	adrp	x0, 0x104cb6000
102992ee8:     	add	x0, x0, #0x90
102992eec:     	bl	0x10214de74
102992ef0:     	mov	x1, x0
102992ef4:     	fmov	d0, xzr
102992ef8:     	movi.2d	v1, #0000000000000000
102992efc:     	stp	q1, q1, [sp]
102992f00:     	mov.d	v0[1], v0[0]
102992f04:     	str	wzr, [sp, #0x40]
102992f08:     	str	q0, [sp, #0x30]
102992f0c:     	movi.2d	v0, #0xffffffffffffffff
102992f10:     	str	d0, [sp, #0x20]
102992f14:     	mov	w8, #-0x1               ; =-1
102992f18:     	str	w8, [sp, #0x28]
102992f1c:     	add	x8, sp, #0x58
102992f20:     	add	x0, sp, #0x48
102992f24:     	mov	x2, sp
102992f28:     	bl	0x102991b84
102992f2c:     	ldr	w19, [sp, #0x68]
102992f30:     	add	x0, x20, #0x8
102992f34:     	bl	0x10001022c
102992f38:     	mov	x0, x19
102992f3c:     	ldp	x29, x30, [sp, #0xb0]
102992f40:     	ldp	x20, x19, [sp, #0xa0]
102992f44:     	add	sp, sp, #0xc0
102992f48:     	ret
102992f4c:     	b	0x102992f50
102992f50:     	mov	x19, x0
102992f54:     	add	x0, x20, #0x8
102992f58:     	bl	0x10001022c
102992f5c:     	mov	x0, x19
102992f60:     	bl	0x103bda970

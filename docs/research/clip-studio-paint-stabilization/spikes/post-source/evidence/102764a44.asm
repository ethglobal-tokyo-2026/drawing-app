
FUNCTION 0x102764a44 size 132
102764a44:     	sub	sp, sp, #0x30
102764a48:     	stp	x20, x19, [sp, #0x10]
102764a4c:     	stp	x29, x30, [sp, #0x20]
102764a50:     	add	x29, sp, #0x20
102764a54:     	mov	x20, x1
102764a58:     	mov	x19, x0
102764a5c:     	ldr	q0, [x1]
102764a60:     	ldr	q1, [x2]
102764a64:     	fadd.2d	v0, v0, v1
102764a68:     	fmov.2d	v1, #0.50000000
102764a6c:     	str	q1, [sp]
102764a70:     	fmul.2d	v0, v0, v1
102764a74:     	stur	q0, [x0, #0x8]
102764a78:     	bl	0x1027648e8
102764a7c:     	ldr	x0, [x19, #0x30]
102764a80:     	cbz	x0, 0x102764ab8
102764a84:     	adrp	x1, 0x104a52000
102764a88:     	add	x1, x1, #0xc98
102764a8c:     	adrp	x2, 0x104a52000
102764a90:     	add	x2, x2, #0x8e8
102764a94:     	mov	x3, #0x0                ; =0
102764a98:     	bl	0x103bdd454
102764a9c:     	cbz	x0, 0x102764ab8
102764aa0:     	ldr	q0, [x20]
102764aa4:     	ldur	q1, [x19, #0x8]
102764aa8:     	fadd.2d	v0, v0, v1
102764aac:     	ldr	q1, [sp]
102764ab0:     	fmul.2d	v0, v0, v1
102764ab4:     	stur	q0, [x0, #0x78]
102764ab8:     	ldp	x29, x30, [sp, #0x20]
102764abc:     	ldp	x20, x19, [sp, #0x10]
102764ac0:     	add	sp, sp, #0x30
102764ac4:     	ret

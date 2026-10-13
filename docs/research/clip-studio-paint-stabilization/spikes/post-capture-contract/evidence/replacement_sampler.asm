
FUNCTION 0x10276cb14 size 144
10276cb14:     	sub	sp, sp, #0x30
10276cb18:     	stp	x20, x19, [sp, #0x10]
10276cb1c:     	stp	x29, x30, [sp, #0x20]
10276cb20:     	add	x29, sp, #0x20
10276cb24:     	mov	x19, x3
10276cb28:     	mov	x4, x2
10276cb2c:     	mov	x2, x1
10276cb30:     	mov	w8, #0x1                ; =1
10276cb34:     	str	w8, [sp, #0xc]
10276cb38:     	ldr	x1, [x0, #0x28]
10276cb3c:     	cbz	x1, 0x10276cb6c
10276cb40:     	ldr	x8, [x0]
10276cb44:     	ldr	x8, [x8, #0xf8]
10276cb48:     	fmov	d0, #4.00000000
10276cb4c:     	movi	d1, #0000000000000000
10276cb50:     	fmov	d2, #1.00000000
10276cb54:     	add	x5, sp, #0xc
10276cb58:     	mov	w3, #0x0                ; =0
10276cb5c:     	blr	x8
10276cb60:     	mov	x8, x0
10276cb64:     	ldr	w0, [sp, #0xc]
10276cb68:     	b	0x10276cb90
10276cb6c:     	ldr	x8, [x0, #0x38]
10276cb70:     	ldrb	w9, [x8, #0x21]
10276cb74:     	tbz	w9, #0x0, 0x10276cb80
10276cb78:     	ldr	x1, [x8, #0x30]
10276cb7c:     	cbnz	x1, 0x10276cb40
10276cb80:     	ldur	q0, [x0, #0x8]
10276cb84:     	str	q0, [x4]
10276cb88:     	mov	w0, #0x1                ; =1
10276cb8c:     	mov	w8, #0x1                ; =1
10276cb90:     	str	w8, [x19]
10276cb94:     	ldp	x29, x30, [sp, #0x20]
10276cb98:     	ldp	x20, x19, [sp, #0x10]
10276cb9c:     	add	sp, sp, #0x30
10276cba0:     	ret

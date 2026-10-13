
FUNCTION 0x10277eca0 size 88
10277eca0:     	stp	x20, x19, [sp, #-0x20]!
10277eca4:     	stp	x29, x30, [sp, #0x10]
10277eca8:     	add	x29, sp, #0x10
10277ecac:     	mov	x19, x0
10277ecb0:     	ldr	x0, [x0, #0x28]
10277ecb4:     	cbnz	x0, 0x10277ecec
10277ecb8:     	mov	w0, #0x40               ; =64
10277ecbc:     	bl	0x103bdd37c
10277ecc0:     	adrp	x8, 0x104a53000
10277ecc4:     	add	x8, x8, #0x3c8
10277ecc8:     	add	x8, x8, #0x10
10277eccc:     	stp	x8, xzr, [x0]
10277ecd0:     	stp	xzr, xzr, [x0, #0x10]
10277ecd4:     	adrp	x8, 0x10454d000
10277ecd8:     	ldr	q0, [x8, #0xb20]
10277ecdc:     	adrp	x8, 0x10454d000
10277ece0:     	ldr	q1, [x8, #0xb30]
10277ece4:     	stp	q0, q1, [x0, #0x20]
10277ece8:     	str	x0, [x19, #0x28]
10277ecec:     	ldp	x29, x30, [sp, #0x10]
10277ecf0:     	ldp	x20, x19, [sp], #0x20
10277ecf4:     	ret

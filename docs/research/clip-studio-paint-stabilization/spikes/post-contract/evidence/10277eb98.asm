
FUNCTION 0x10277eb98 size 88
10277eb98:     	stp	x20, x19, [sp, #-0x20]!
10277eb9c:     	stp	x29, x30, [sp, #0x10]
10277eba0:     	add	x29, sp, #0x10
10277eba4:     	mov	x19, x0
10277eba8:     	ldr	x0, [x0, #0x10]
10277ebac:     	cbnz	x0, 0x10277ebe4
10277ebb0:     	mov	w0, #0x40               ; =64
10277ebb4:     	bl	0x103bdd37c
10277ebb8:     	adrp	x8, 0x104a53000
10277ebbc:     	add	x8, x8, #0x2f0
10277ebc0:     	add	x8, x8, #0x10
10277ebc4:     	stp	x8, xzr, [x0]
10277ebc8:     	stp	xzr, xzr, [x0, #0x10]
10277ebcc:     	adrp	x8, 0x10454d000
10277ebd0:     	ldr	q0, [x8, #0xaf0]
10277ebd4:     	adrp	x8, 0x10454d000
10277ebd8:     	ldr	q1, [x8, #0xb00]
10277ebdc:     	stp	q0, q1, [x0, #0x20]
10277ebe0:     	str	x0, [x19, #0x10]
10277ebe4:     	ldp	x29, x30, [sp, #0x10]
10277ebe8:     	ldp	x20, x19, [sp], #0x20
10277ebec:     	ret

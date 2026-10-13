
FUNCTION 0x10277eb40 size 88
10277eb40:     	stp	x20, x19, [sp, #-0x20]!
10277eb44:     	stp	x29, x30, [sp, #0x10]
10277eb48:     	add	x29, sp, #0x10
10277eb4c:     	mov	x19, x0
10277eb50:     	ldr	x0, [x0, #0x8]
10277eb54:     	cbnz	x0, 0x10277eb8c
10277eb58:     	mov	w0, #0x40               ; =64
10277eb5c:     	bl	0x103bdd37c
10277eb60:     	adrp	x8, 0x104a53000
10277eb64:     	add	x8, x8, #0x298
10277eb68:     	add	x8, x8, #0x10
10277eb6c:     	stp	x8, xzr, [x0]
10277eb70:     	stp	xzr, xzr, [x0, #0x10]
10277eb74:     	adrp	x8, 0x10454d000
10277eb78:     	ldr	q0, [x8, #0xae0]
10277eb7c:     	adrp	x8, 0x104484000
10277eb80:     	ldr	q1, [x8, #0xee0]
10277eb84:     	stp	q0, q1, [x0, #0x20]
10277eb88:     	str	x0, [x19, #0x8]
10277eb8c:     	ldp	x29, x30, [sp, #0x10]
10277eb90:     	ldp	x20, x19, [sp], #0x20
10277eb94:     	ret

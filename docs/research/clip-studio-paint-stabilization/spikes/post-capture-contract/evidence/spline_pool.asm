
FUNCTION 0x10277ec48 size 88
10277ec48:     	stp	x20, x19, [sp, #-0x20]!
10277ec4c:     	stp	x29, x30, [sp, #0x10]
10277ec50:     	add	x29, sp, #0x10
10277ec54:     	mov	x19, x0
10277ec58:     	ldr	x0, [x0, #0x20]
10277ec5c:     	cbnz	x0, 0x10277ec94
10277ec60:     	mov	w0, #0x40               ; =64
10277ec64:     	bl	0x103bdd37c
10277ec68:     	adrp	x8, 0x104a53000
10277ec6c:     	add	x8, x8, #0x380
10277ec70:     	add	x8, x8, #0x10
10277ec74:     	stp	x8, xzr, [x0]
10277ec78:     	stp	xzr, xzr, [x0, #0x10]
10277ec7c:     	adrp	x8, 0x10454d000
10277ec80:     	ldr	q0, [x8, #0xb10]
10277ec84:     	adrp	x8, 0x10454d000
10277ec88:     	ldr	q1, [x8, #0xb00]
10277ec8c:     	stp	q0, q1, [x0, #0x20]
10277ec90:     	str	x0, [x19, #0x20]
10277ec94:     	ldp	x29, x30, [sp, #0x10]
10277ec98:     	ldp	x20, x19, [sp], #0x20
10277ec9c:     	ret

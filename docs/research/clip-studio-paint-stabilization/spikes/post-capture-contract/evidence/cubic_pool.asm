
FUNCTION 0x10277ebf0 size 88
10277ebf0:     	stp	x20, x19, [sp, #-0x20]!
10277ebf4:     	stp	x29, x30, [sp, #0x10]
10277ebf8:     	add	x29, sp, #0x10
10277ebfc:     	mov	x19, x0
10277ec00:     	ldr	x0, [x0, #0x18]
10277ec04:     	cbnz	x0, 0x10277ec3c
10277ec08:     	mov	w0, #0x40               ; =64
10277ec0c:     	bl	0x103bdd37c
10277ec10:     	adrp	x8, 0x104a53000
10277ec14:     	add	x8, x8, #0x338
10277ec18:     	add	x8, x8, #0x10
10277ec1c:     	stp	x8, xzr, [x0]
10277ec20:     	stp	xzr, xzr, [x0, #0x10]
10277ec24:     	adrp	x8, 0x104484000
10277ec28:     	ldr	q0, [x8, #0xf90]
10277ec2c:     	adrp	x8, 0x104484000
10277ec30:     	ldr	q1, [x8, #0xee0]
10277ec34:     	stp	q0, q1, [x0, #0x20]
10277ec38:     	str	x0, [x19, #0x18]
10277ec3c:     	ldp	x29, x30, [sp, #0x10]
10277ec40:     	ldp	x20, x19, [sp], #0x20
10277ec44:     	ret

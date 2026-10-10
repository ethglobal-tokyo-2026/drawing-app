102786e10:     	mov	x8, x0
102786e14:     	str	xzr, [x8, #0x10]!
102786e18:     	adrp	x9, 0x104a53000
102786e1c:     	add	x9, x9, #0x8e8
102786e20:     	stp	x9, x8, [x0]
102786e24:     	stp	xzr, xzr, [x0, #0x20]
102786e28:     	str	xzr, [x0, #0x18]
102786e2c:     	adrp	x8, 0x10454d000
102786e30:     	ldr	q0, [x8, #0xee0]
102786e34:     	str	q0, [x0, #0x30]
102786e38:     	stp	xzr, xzr, [x0, #0x48]
102786e3c:     	str	xzr, [x0, #0x40]
102786e40:     	adrp	x8, 0x1042e6000
102786e44:     	ldr	d0, [x8, #0x2e0]
102786e48:     	stur	d0, [x0, #0x5c]
102786e4c:     	str	wzr, [x0, #0x58]
102786e50:     	str	wzr, [x0, #0x70]
102786e54:     	ret
102786e58:     	stp	x20, x19, [sp, #-0x20]!
102786e5c:     	stp	x29, x30, [sp, #0x10]
102786e60:     	add	x29, sp, #0x10
102786e64:     	mov	x19, x0
102786e68:     	adrp	x8, 0x104a53000
102786e6c:     	add	x8, x8, #0x8e8
102786e70:     	str	x8, [x0], #0x28
102786e74:     	bl	0x10001022c
102786e78:     	ldr	x1, [x19, #0x10]
102786e7c:     	add	x0, x19, #0x8
102786e80:     	bl	0x10002d4c0
102786e84:     	mov	x0, x19
102786e88:     	ldp	x29, x30, [sp, #0x10]
102786e8c:     	ldp	x20, x19, [sp], #0x20
102786e90:     	ret
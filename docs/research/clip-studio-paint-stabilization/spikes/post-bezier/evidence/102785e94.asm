
FUNCTION 0x102785e94 size 172
102785e94:     	stp	x20, x19, [sp, #-0x20]!
102785e98:     	stp	x29, x30, [sp, #0x10]
102785e9c:     	add	x29, sp, #0x10
102785ea0:     	ldr	w8, [x1, #0x20]
102785ea4:     	tbnz	w8, #0x5, 0x102785eb0
102785ea8:     	mov	x0, #0x0                ; =0
102785eac:     	b	0x102785f04
102785eb0:     	mov	x19, x0
102785eb4:     	str	d0, [x0, #0x18]
102785eb8:     	stp	w2, w3, [x0, #0x20]
102785ebc:     	str	d1, [x0, #0x28]
102785ec0:     	ldr	x20, [x1, #0x18]
102785ec4:     	orr	w9, w8, #0x1000
102785ec8:     	cmp	w3, #0x0
102785ecc:     	csel	w8, w8, w9, eq
102785ed0:     	stp	xzr, x1, [x0, #0x8]
102785ed4:     	mov	x0, x20
102785ed8:     	mov	x1, x8
102785edc:     	bl	0x10277a5a8
102785ee0:     	str	x0, [x19, #0x8]
102785ee4:     	ldr	x1, [x19, #0x10]
102785ee8:     	bl	0x102783068
102785eec:     	mov	x0, x19
102785ef0:     	bl	0x102785f40
102785ef4:     	ldr	x1, [x19, #0x10]
102785ef8:     	mov	x0, x20
102785efc:     	bl	0x10277a5f8
102785f00:     	ldr	x0, [x19, #0x8]
102785f04:     	ldp	x29, x30, [sp, #0x10]
102785f08:     	ldp	x20, x19, [sp], #0x20
102785f0c:     	ret
102785f10:     	bl	0x103bdd3dc
102785f14:     	ldr	x1, [x19, #0x8]
102785f18:     	cbz	x1, 0x102785f24
102785f1c:     	mov	x0, x20
102785f20:     	bl	0x10277a5f8
102785f24:     	bl	0x103bdd43c
102785f28:     	brk	#0x1
102785f2c:     	mov	x19, x0
102785f30:     	bl	0x103bdd3f4
102785f34:     	mov	x0, x19
102785f38:     	bl	0x103bda970
102785f3c:     	bl	0x1000102a0

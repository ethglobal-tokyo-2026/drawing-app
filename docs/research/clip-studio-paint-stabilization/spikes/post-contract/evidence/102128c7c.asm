
FUNCTION 0x102128c7c size 164
102128c7c:     	stp	x20, x19, [sp, #-0x20]!
102128c80:     	stp	x29, x30, [sp, #0x10]
102128c84:     	add	x29, sp, #0x10
102128c88:     	mov	x19, x2
102128c8c:     	add	x0, x0, #0x10
102128c90:     	bl	0x1020cbc14
102128c94:     	mov	x20, x0
102128c98:     	ldr	x0, [x0]
102128c9c:     	cbz	x0, 0x102128cb0
102128ca0:     	ldr	x8, [x0]
102128ca4:     	ldr	x8, [x8, #0x10]
102128ca8:     	blr	x8
102128cac:     	b	0x102128cb8
102128cb0:     	adrp	x0, 0x1048c8000
102128cb4:     	ldr	x0, [x0, #0x428]
102128cb8:     	adrp	x1, 0x104a2f000
102128cbc:     	add	x1, x1, #0xb38
102128cc0:     	bl	0x100016d30
102128cc4:     	cbz	w0, 0x102128d14
102128cc8:     	mov	x0, x20
102128ccc:     	bl	0x102128e60
102128cd0:     	ldr	q0, [x0]
102128cd4:     	str	q0, [x19]
102128cd8:     	ldp	q0, q1, [x0, #0x30]
102128cdc:     	ldp	q3, q2, [x0, #0x10]
102128ce0:     	stp	q0, q1, [x19, #0x30]
102128ce4:     	stp	q3, q2, [x19, #0x10]
102128ce8:     	ldp	q0, q1, [x0, #0x70]
102128cec:     	ldp	q3, q2, [x0, #0x50]
102128cf0:     	stp	q0, q1, [x19, #0x70]
102128cf4:     	stp	q3, q2, [x19, #0x50]
102128cf8:     	ldp	q1, q0, [x0, #0xa0]
102128cfc:     	ldr	x8, [x0, #0xc0]
102128d00:     	ldr	q2, [x0, #0x90]
102128d04:     	str	x8, [x19, #0xc0]
102128d08:     	stp	q1, q0, [x19, #0xa0]
102128d0c:     	str	q2, [x19, #0x90]
102128d10:     	mov	w0, #0x1                ; =1
102128d14:     	ldp	x29, x30, [sp, #0x10]
102128d18:     	ldp	x20, x19, [sp], #0x20
102128d1c:     	ret

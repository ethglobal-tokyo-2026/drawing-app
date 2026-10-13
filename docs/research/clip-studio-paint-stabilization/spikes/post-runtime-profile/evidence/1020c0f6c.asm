
FUNCTION 0x1020c0f6c size 152
1020c0f6c:     	sub	sp, sp, #0x40
1020c0f70:     	stp	x20, x19, [sp, #0x20]
1020c0f74:     	stp	x29, x30, [sp, #0x30]
1020c0f78:     	add	x29, sp, #0x30
1020c0f7c:     	adrp	x19, 0x104c8f000
1020c0f80:     	add	x19, x19, #0xee8
1020c0f84:     	mov	x0, x19
1020c0f88:     	bl	0x10310cd44
1020c0f8c:     	adrp	x0, 0x10310c000
1020c0f90:     	add	x0, x0, #0xd7c
1020c0f94:     	adrp	x2, 0x100000000
1020c0f98:     	add	x2, x2, #0x0
1020c0f9c:     	mov	x1, x19
1020c0fa0:     	bl	0x103bdd3c4
1020c0fa4:     	adrp	x0, 0x104c8f000
1020c0fa8:     	add	x0, x0, #0xef0
1020c0fac:     	mov	w1, #0x1                ; =1
1020c0fb0:     	mov	w2, #0x1                ; =1
1020c0fb4:     	bl	0x103116408
1020c0fb8:     	add	x0, sp, #0x10
1020c0fbc:     	mov	x1, #0x0                ; =0
1020c0fc0:     	bl	0x1031163d4
1020c0fc4:     	mov	x0, sp
1020c0fc8:     	mov	x1, #0x0                ; =0
1020c0fcc:     	bl	0x1031163d4
1020c0fd0:     	adrp	x8, 0x104c8f000
1020c0fd4:     	add	x8, x8, #0xf00
1020c0fd8:     	add	x0, sp, #0x10
1020c0fdc:     	mov	x1, sp
1020c0fe0:     	bl	0x1020bfc90
1020c0fe4:     	adrp	x8, 0x104c8f000
1020c0fe8:     	strb	wzr, [x8, #0xf20]
1020c0fec:     	adrp	x8, 0x104c8f000
1020c0ff0:     	str	wzr, [x8, #0xf24]
1020c0ff4:     	ldp	x29, x30, [sp, #0x30]
1020c0ff8:     	ldp	x20, x19, [sp, #0x20]
1020c0ffc:     	add	sp, sp, #0x40
1020c1000:     	ret


FUNCTION 0x102786d30 size 92
102786d30:     	stp	x20, x19, [sp, #-0x20]!
102786d34:     	stp	x29, x30, [sp, #0x10]
102786d38:     	add	x29, sp, #0x10
102786d3c:     	ldr	x8, [x0, #0x20]
102786d40:     	cmp	x8, #0x200
102786d44:     	csinc	w9, w1, wzr, hs
102786d48:     	cmp	x8, #0x400
102786d4c:     	csel	w20, wzr, w9, hs
102786d50:     	tbnz	w20, #0x0, 0x102786d7c
102786d54:     	mov	x19, x0
102786d58:     	ldr	x8, [x0, #0x8]
102786d5c:     	ldr	x0, [x8]
102786d60:     	bl	0x103bdd34c
102786d64:     	ldr	x8, [x19, #0x8]
102786d68:     	add	x8, x8, #0x8
102786d6c:     	str	x8, [x19, #0x8]
102786d70:     	ldr	x8, [x19, #0x20]
102786d74:     	sub	x8, x8, #0x200
102786d78:     	str	x8, [x19, #0x20]
102786d7c:     	eor	w0, w20, #0x1
102786d80:     	ldp	x29, x30, [sp, #0x10]
102786d84:     	ldp	x20, x19, [sp], #0x20
102786d88:     	ret

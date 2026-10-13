
FUNCTION 0x10214dcd8 size 136
10214dcd8:     	stp	x20, x19, [sp, #-0x20]!
10214dcdc:     	stp	x29, x30, [sp, #0x10]
10214dce0:     	add	x29, sp, #0x10
10214dce4:     	mov	x19, x0
10214dce8:     	add	x0, x0, #0x18
10214dcec:     	bl	0x103bdae2c
10214dcf0:     	cbz	w0, 0x10214dd28
10214dcf4:     	adrp	x8, 0x1045de000
10214dcf8:     	add	x8, x8, #0x43f
10214dcfc:     	ldp	x9, x10, [x19, #0x8]
10214dd00:     	cmp	x9, #0x0
10214dd04:     	csel	x0, x8, x9, eq
10214dd08:     	cmp	x10, #0x0
10214dd0c:     	csel	x1, x8, x10, eq
10214dd10:     	ldr	w2, [x19]
10214dd14:     	mov	w3, #0x1                ; =1
10214dd18:     	bl	0x10214e1c0
10214dd1c:     	str	w0, [x19, #0x1c]
10214dd20:     	add	x0, x19, #0x18
10214dd24:     	bl	0x103bdae38
10214dd28:     	ldr	w0, [x19, #0x1c]
10214dd2c:     	ldp	x29, x30, [sp, #0x10]
10214dd30:     	ldp	x20, x19, [sp], #0x20
10214dd34:     	ret
10214dd38:     	bl	0x103bdd3dc
10214dd3c:     	add	x0, x19, #0x18
10214dd40:     	bl	0x103bdae44
10214dd44:     	bl	0x103bdd43c
10214dd48:     	brk	#0x1
10214dd4c:     	mov	x19, x0
10214dd50:     	bl	0x103bdd3f4
10214dd54:     	mov	x0, x19
10214dd58:     	bl	0x103bda970
10214dd5c:     	bl	0x1000102a0

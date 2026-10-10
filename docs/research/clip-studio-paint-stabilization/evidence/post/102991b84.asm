102991b84:     	sub	sp, sp, #0x40
102991b88:     	stp	x22, x21, [sp, #0x10]
102991b8c:     	stp	x20, x19, [sp, #0x20]
102991b90:     	stp	x29, x30, [sp, #0x30]
102991b94:     	add	x29, sp, #0x30
102991b98:     	mov	x19, x2
102991b9c:     	mov	x20, x8
102991ba0:     	ldp	q0, q1, [x2, #0x20]
102991ba4:     	stp	q0, q1, [x8, #0x20]
102991ba8:     	ldr	x8, [x2, #0x40]
102991bac:     	str	x8, [x20, #0x40]
102991bb0:     	ldp	q1, q0, [x2]
102991bb4:     	stp	q1, q0, [x20]
102991bb8:     	ldp	x9, x8, [x0]
102991bbc:     	stp	x9, x8, [sp]
102991bc0:     	cbz	x8, 0x102991bd0
102991bc4:     	add	x8, x8, #0x8
102991bc8:     	mov	w9, #0x1                ; =1
102991bcc:     	ldadd	w9, w8, [x8]
102991bd0:     	mov	x22, sp
102991bd4:     	mov	x0, sp
102991bd8:     	mov	x2, x20
102991bdc:     	bl	0x1029981a0
102991be0:     	mov	x21, x0
102991be4:     	add	x0, x22, #0x8
102991be8:     	bl	0x10001022c
102991bec:     	cbnz	w21, 0x102991c08
102991bf0:     	ldp	q0, q1, [x19, #0x20]
102991bf4:     	stp	q0, q1, [x20, #0x20]
102991bf8:     	ldr	x8, [x19, #0x40]
102991bfc:     	str	x8, [x20, #0x40]
102991c00:     	ldp	q1, q0, [x19]
102991c04:     	stp	q1, q0, [x20]
102991c08:     	ldp	x29, x30, [sp, #0x30]
102991c0c:     	ldp	x20, x19, [sp, #0x20]
102991c10:     	ldp	x22, x21, [sp, #0x10]
102991c14:     	add	sp, sp, #0x40
102991c18:     	ret
102991c1c:     	mov	x19, x0
102991c20:     	add	x0, x22, #0x8
102991c24:     	bl	0x10001022c
102991c28:     	mov	x0, x19
102991c2c:     	bl	0x103bda970
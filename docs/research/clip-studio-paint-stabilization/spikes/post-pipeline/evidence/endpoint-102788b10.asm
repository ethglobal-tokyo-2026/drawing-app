
FUNCTION 0x102788b10 size 116
102788b10:     	sub	sp, sp, #0x90
102788b14:     	stp	x22, x21, [sp, #0x60]
102788b18:     	stp	x20, x19, [sp, #0x70]
102788b1c:     	stp	x29, x30, [sp, #0x80]
102788b20:     	add	x29, sp, #0x80
102788b24:     	mov	x19, x2
102788b28:     	mov	x20, x1
102788b2c:     	mov	x21, x0
102788b30:     	sub	x2, x29, #0x30
102788b34:     	add	x3, sp, #0x40
102788b38:     	add	x4, sp, #0x30
102788b3c:     	add	x5, sp, #0x20
102788b40:     	mov	x1, x19
102788b44:     	bl	0x1027888dc
102788b48:     	ldp	d0, d1, [x29, #-0x30]
102788b4c:     	ldp	d2, d3, [sp, #0x40]
102788b50:     	ldp	d4, d5, [x21, #0x8]
102788b54:     	ldp	d6, d7, [x19, #0x8]
102788b58:     	ldp	d16, d17, [sp, #0x30]
102788b5c:     	ldp	d18, d19, [sp, #0x20]
102788b60:     	stp	d18, d19, [sp, #0x10]
102788b64:     	stp	d16, d17, [sp]
102788b68:     	mov	x0, x20
102788b6c:     	bl	0x10359fc40
102788b70:     	ldp	x29, x30, [sp, #0x80]
102788b74:     	ldp	x20, x19, [sp, #0x70]
102788b78:     	ldp	x22, x21, [sp, #0x60]
102788b7c:     	add	sp, sp, #0x90
102788b80:     	ret

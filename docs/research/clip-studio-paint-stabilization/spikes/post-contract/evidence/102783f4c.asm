
FUNCTION 0x102783f4c size 140
102783f4c:     	stp	x22, x21, [sp, #-0x30]!
102783f50:     	stp	x20, x19, [sp, #0x10]
102783f54:     	stp	x29, x30, [sp, #0x20]
102783f58:     	add	x29, sp, #0x20
102783f5c:     	mov	x19, x2
102783f60:     	mov	x20, x1
102783f64:     	mov	x22, x0
102783f68:     	ldr	x0, [x0, #0x88]
102783f6c:     	ldr	x8, [x0]
102783f70:     	ldr	x8, [x8, #0x10]
102783f74:     	blr	x8
102783f78:     	mov	x21, x0
102783f7c:     	ldr	x8, [x22, #0x78]
102783f80:     	cbz	x8, 0x102783fa0
102783f84:     	str	x21, [x8, #0x8]
102783f88:     	str	x8, [x21, #0x10]
102783f8c:     	str	x21, [x22, #0x78]
102783f90:     	ldr	w8, [x22, #0x80]
102783f94:     	add	w8, w8, #0x1
102783f98:     	str	w8, [x22, #0x80]
102783f9c:     	b	0x102783fb4
102783fa0:     	stp	x21, x21, [x22, #0x70]
102783fa4:     	ldr	w8, [x22, #0x80]
102783fa8:     	add	w8, w8, #0x1
102783fac:     	str	w8, [x22, #0x80]
102783fb0:     	cbz	x21, 0x102783fc4
102783fb4:     	mov	x0, x21
102783fb8:     	mov	x1, x20
102783fbc:     	mov	x2, x19
102783fc0:     	bl	0x102781714
102783fc4:     	mov	x0, x21
102783fc8:     	ldp	x29, x30, [sp, #0x20]
102783fcc:     	ldp	x20, x19, [sp, #0x10]
102783fd0:     	ldp	x22, x21, [sp], #0x30
102783fd4:     	ret


FUNCTION 0x1002a7c28 size 640
1002a7c28:     	sub	sp, sp, #0xd0
1002a7c2c:     	stp	x26, x25, [sp, #0x80]
1002a7c30:     	stp	x24, x23, [sp, #0x90]
1002a7c34:     	stp	x22, x21, [sp, #0xa0]
1002a7c38:     	stp	x20, x19, [sp, #0xb0]
1002a7c3c:     	stp	x29, x30, [sp, #0xc0]
1002a7c40:     	add	x29, sp, #0xc0
1002a7c44:     	cbz	w1, 0x1002a7df0
1002a7c48:     	mov	x19, x0
1002a7c4c:     	ldr	w8, [x0, #0x8c]
1002a7c50:     	cbz	w8, 0x1002a7df0
1002a7c54:     	mov	x20, x2
1002a7c58:     	mov	x21, x1
1002a7c5c:     	mov	x0, x2
1002a7c60:     	bl	0x10311cc3c
1002a7c64:     	cbz	w0, 0x1002a7df0
1002a7c68:     	sub	x23, x29, #0x50
1002a7c6c:     	sub	x8, x29, #0x50
1002a7c70:     	mov	x0, x21
1002a7c74:     	mov	x1, x20
1002a7c78:     	bl	0x1032f6944
1002a7c7c:     	ldur	x8, [x29, #-0x50]
1002a7c80:     	cbz	x8, 0x1002a7de8
1002a7c84:     	add	x0, sp, #0x60
1002a7c88:     	bl	0x10366c4b8
1002a7c8c:     	ldur	x20, [x29, #-0x50]
1002a7c90:     	adrp	x1, 0x1045e3000
1002a7c94:     	add	x1, x1, #0x213 STRING 'brushsizepreset'
1002a7c98:     	add	x0, sp, #0x30
1002a7c9c:     	bl	0x10311cb20
1002a7ca0:     	add	x1, sp, #0x60
1002a7ca4:     	add	x2, sp, #0x30
1002a7ca8:     	mov	x0, x20
1002a7cac:     	mov	w3, #0x1                ; =1
1002a7cb0:     	bl	0x1032f8634
1002a7cb4:     	add	x0, sp, #0x30
1002a7cb8:     	bl	0x10311cb54
1002a7cbc:     	ldr	x8, [x19, #0x60]
1002a7cc0:     	cbz	x8, 0x1002a7de0
1002a7cc4:     	add	x0, sp, #0x60
1002a7cc8:     	bl	0x10366cefc
1002a7ccc:     	ldr	x24, [x19, #0x60]
1002a7cd0:     	ldr	x25, [x24], #0x8
1002a7cd4:     	cmp	x25, x24
1002a7cd8:     	b.eq	0x1002a7ddc
1002a7cdc:     	adrp	x20, 0x1045e3000
1002a7ce0:     	add	x20, x20, #0x223 STRING 'brushsizebrushsize'
1002a7ce4:     	adrp	x21, 0x1045e3000
1002a7ce8:     	add	x21, x21, #0x236 STRING 'brushsizeviewindex'
1002a7cec:     	add	x0, sp, #0x20
1002a7cf0:     	bl	0x10366cff4
1002a7cf4:     	add	x0, sp, #0x60
1002a7cf8:     	add	x1, sp, #0x20
1002a7cfc:     	bl	0x10366ca5c
1002a7d00:     	cbz	w0, 0x1002a7d9c
1002a7d04:     	ldr	w22, [x25, #0x1c]
1002a7d08:     	add	x0, sp, #0x30
1002a7d0c:     	mov	x1, x20
1002a7d10:     	bl	0x10311cb20
1002a7d14:     	add	x0, sp, #0x10
1002a7d18:     	mov	x1, x22
1002a7d1c:     	bl	0x10366d99c
1002a7d20:     	add	x0, sp, #0x20
1002a7d24:     	add	x1, sp, #0x30
1002a7d28:     	add	x2, sp, #0x10
1002a7d2c:     	bl	0x10366d1ec
1002a7d30:     	ldr	x0, [sp, #0x18]
1002a7d34:     	cbz	x0, 0x1002a7d44
1002a7d38:     	ldr	x8, [x0]
1002a7d3c:     	ldr	x8, [x8, #0x8]
1002a7d40:     	blr	x8
1002a7d44:     	add	x0, sp, #0x30
1002a7d48:     	bl	0x10311cb54
1002a7d4c:     	ldr	w22, [x25, #0x20]
1002a7d50:     	add	x0, sp, #0x30
1002a7d54:     	mov	x1, x21
1002a7d58:     	bl	0x10311cb20
1002a7d5c:     	mov	x0, sp
1002a7d60:     	mov	x1, x22
1002a7d64:     	bl	0x10366d99c
1002a7d68:     	add	x0, sp, #0x20
1002a7d6c:     	add	x1, sp, #0x30
1002a7d70:     	mov	x2, sp
1002a7d74:     	bl	0x10366d1ec
1002a7d78:     	ldr	x0, [sp, #0x8]
1002a7d7c:     	cbz	x0, 0x1002a7d8c
1002a7d80:     	ldr	x8, [x0]
1002a7d84:     	ldr	x8, [x8, #0x8]
1002a7d88:     	blr	x8
1002a7d8c:     	add	x0, sp, #0x30
1002a7d90:     	bl	0x10311cb54
1002a7d94:     	add	x0, sp, #0x20
1002a7d98:     	bl	0x10366d438
1002a7d9c:     	add	x0, sp, #0x20
1002a7da0:     	bl	0x10366d034
1002a7da4:     	ldr	x9, [x25, #0x8]
1002a7da8:     	cbz	x9, 0x1002a7dbc
1002a7dac:     	mov	x8, x9
1002a7db0:     	ldr	x9, [x9]
1002a7db4:     	cbnz	x9, 0x1002a7dac
1002a7db8:     	b	0x1002a7dd0
1002a7dbc:     	ldr	x8, [x25, #0x10]
1002a7dc0:     	ldr	x9, [x8]
1002a7dc4:     	cmp	x9, x25
1002a7dc8:     	mov	x25, x8
1002a7dcc:     	b.ne	0x1002a7dbc
1002a7dd0:     	mov	x25, x8
1002a7dd4:     	cmp	x8, x24
1002a7dd8:     	b.ne	0x1002a7cec
1002a7ddc:     	str	wzr, [x19, #0x8c]
1002a7de0:     	add	x0, sp, #0x60
1002a7de4:     	bl	0x10366c50c
1002a7de8:     	add	x0, x23, #0x8
1002a7dec:     	bl	0x10001022c
1002a7df0:     	ldp	x29, x30, [sp, #0xc0]
1002a7df4:     	ldp	x20, x19, [sp, #0xb0]
1002a7df8:     	ldp	x22, x21, [sp, #0xa0]
1002a7dfc:     	ldp	x24, x23, [sp, #0x90]
1002a7e00:     	ldp	x26, x25, [sp, #0x80]
1002a7e04:     	add	sp, sp, #0xd0
1002a7e08:     	ret
1002a7e0c:     	b	0x1002a7e78
1002a7e10:     	mov	x19, x0
1002a7e14:     	add	x0, sp, #0x30
1002a7e18:     	bl	0x10311cb54
1002a7e1c:     	b	0x1002a7e8c
1002a7e20:     	b	0x1002a7e78
1002a7e24:     	mov	x19, x0
1002a7e28:     	b	0x1002a7e94
1002a7e2c:     	b	0x1002a7e80
1002a7e30:     	mov	x19, x0
1002a7e34:     	ldr	x0, [sp, #0x18]
1002a7e38:     	cbnz	x0, 0x1002a7e58
1002a7e3c:     	b	0x1002a7e6c
1002a7e40:     	b	0x1002a7e80
1002a7e44:     	b	0x1002a7e68
1002a7e48:     	b	0x1002a7e80
1002a7e4c:     	mov	x19, x0
1002a7e50:     	ldr	x0, [sp, #0x8]
1002a7e54:     	cbz	x0, 0x1002a7e6c
1002a7e58:     	ldr	x8, [x0]
1002a7e5c:     	ldr	x8, [x8, #0x8]
1002a7e60:     	blr	x8
1002a7e64:     	b	0x1002a7e6c
1002a7e68:     	mov	x19, x0
1002a7e6c:     	add	x0, sp, #0x30
1002a7e70:     	bl	0x10311cb54
1002a7e74:     	b	0x1002a7e84
1002a7e78:     	mov	x19, x0
1002a7e7c:     	b	0x1002a7e8c
1002a7e80:     	mov	x19, x0
1002a7e84:     	add	x0, sp, #0x20
1002a7e88:     	bl	0x10366d034
1002a7e8c:     	add	x0, sp, #0x60
1002a7e90:     	bl	0x10366c50c
1002a7e94:     	sub	x8, x29, #0x50
1002a7e98:     	add	x0, x8, #0x8
1002a7e9c:     	bl	0x10001022c
1002a7ea0:     	mov	x0, x19
1002a7ea4:     	bl	0x103bda970

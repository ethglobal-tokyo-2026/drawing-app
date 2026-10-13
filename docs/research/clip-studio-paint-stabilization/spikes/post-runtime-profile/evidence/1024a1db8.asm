
FUNCTION 0x1024a1db8 size 332
1024a1db8:     	sub	sp, sp, #0x80
1024a1dbc:     	stp	x24, x23, [sp, #0x40]
1024a1dc0:     	stp	x22, x21, [sp, #0x50]
1024a1dc4:     	stp	x20, x19, [sp, #0x60]
1024a1dc8:     	stp	x29, x30, [sp, #0x70]
1024a1dcc:     	add	x29, sp, #0x70
1024a1dd0:     	mov	x21, x1
1024a1dd4:     	mov	x20, x0
1024a1dd8:     	mov	w0, #0x10               ; =16
1024a1ddc:     	bl	0x103bdd37c
1024a1de0:     	mov	x19, x0
1024a1de4:     	ldp	x9, x8, [x20, #0x140]
1024a1de8:     	stp	x9, x8, [sp, #0x10]
1024a1dec:     	cbz	x8, 0x1024a1dfc
1024a1df0:     	add	x8, x8, #0x8
1024a1df4:     	mov	w9, #0x1                ; =1
1024a1df8:     	ldadd	w9, w8, [x8]
1024a1dfc:     	add	x22, sp, #0x10
1024a1e00:     	adrp	x0, 0x1024a8000
1024a1e04:     	add	x0, x0, #0x170
1024a1e08:     	add	x8, sp, #0x20
1024a1e0c:     	add	x1, sp, #0x10
1024a1e10:     	mov	x2, x21
1024a1e14:     	bl	0x1024a5248
1024a1e18:     	add	x23, sp, #0x20
1024a1e1c:     	add	x1, sp, #0x20
1024a1e20:     	mov	x0, x19
1024a1e24:     	bl	0x1024a559c
1024a1e28:     	add	x0, x20, #0x168
1024a1e2c:     	mov	x1, x19
1024a1e30:     	bl	0x100c5db2c
1024a1e34:     	add	x0, x23, #0x10
1024a1e38:     	bl	0x10001022c
1024a1e3c:     	add	x0, x22, #0x8
1024a1e40:     	bl	0x10001022c
1024a1e44:     	mov	w0, #0x10               ; =16
1024a1e48:     	bl	0x103bdd37c
1024a1e4c:     	mov	x19, x0
1024a1e50:     	ldp	x9, x8, [x20, #0x150]
1024a1e54:     	stp	x9, x8, [sp]
1024a1e58:     	cbz	x8, 0x1024a1e68
1024a1e5c:     	add	x8, x8, #0x8
1024a1e60:     	mov	w9, #0x1                ; =1
1024a1e64:     	ldadd	w9, w8, [x8]
1024a1e68:     	mov	x22, sp
1024a1e6c:     	adrp	x0, 0x1024a8000
1024a1e70:     	add	x0, x0, #0x170
1024a1e74:     	add	x8, sp, #0x20
1024a1e78:     	mov	x1, sp
1024a1e7c:     	mov	x2, x21
1024a1e80:     	bl	0x1024a5248
1024a1e84:     	add	x21, sp, #0x20
1024a1e88:     	add	x1, sp, #0x20
1024a1e8c:     	mov	x0, x19
1024a1e90:     	bl	0x1024a559c
1024a1e94:     	add	x0, x20, #0x170
1024a1e98:     	mov	x1, x19
1024a1e9c:     	bl	0x100c5db2c
1024a1ea0:     	add	x0, x21, #0x10
1024a1ea4:     	bl	0x10001022c
1024a1ea8:     	add	x0, x22, #0x8
1024a1eac:     	bl	0x10001022c
1024a1eb0:     	ldp	x29, x30, [sp, #0x70]
1024a1eb4:     	ldp	x20, x19, [sp, #0x60]
1024a1eb8:     	ldp	x22, x21, [sp, #0x50]
1024a1ebc:     	ldp	x24, x23, [sp, #0x40]
1024a1ec0:     	add	sp, sp, #0x80
1024a1ec4:     	ret
1024a1ec8:     	mov	x20, x0
1024a1ecc:     	add	x0, x21, #0x10
1024a1ed0:     	b	0x1024a1ee0
1024a1ed4:     	b	0x1024a1ee8
1024a1ed8:     	mov	x20, x0
1024a1edc:     	add	x0, x23, #0x10
1024a1ee0:     	bl	0x10001022c
1024a1ee4:     	b	0x1024a1eec
1024a1ee8:     	mov	x20, x0
1024a1eec:     	add	x0, x22, #0x8
1024a1ef0:     	bl	0x10001022c
1024a1ef4:     	mov	x0, x19
1024a1ef8:     	bl	0x103bdd34c
1024a1efc:     	mov	x0, x20
1024a1f00:     	bl	0x103bda970

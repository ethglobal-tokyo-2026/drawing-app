
FUNCTION 0x1024a1cd0 size 232
1024a1cd0:     	sub	sp, sp, #0x60
1024a1cd4:     	stp	x24, x23, [sp, #0x20]
1024a1cd8:     	stp	x22, x21, [sp, #0x30]
1024a1cdc:     	stp	x20, x19, [sp, #0x40]
1024a1ce0:     	stp	x29, x30, [sp, #0x50]
1024a1ce4:     	add	x29, sp, #0x50
1024a1ce8:     	mov	x20, x2
1024a1cec:     	mov	x21, x1
1024a1cf0:     	mov	x22, x0
1024a1cf4:     	ldr	x0, [x0, #0x140]
1024a1cf8:     	add	x8, sp, #0x10
1024a1cfc:     	add	x19, x8, #0x8
1024a1d00:     	ldp	x9, x8, [x22, #0xe8]
1024a1d04:     	stp	x9, x8, [sp, #0x10]
1024a1d08:     	cbz	x8, 0x1024a1d18
1024a1d0c:     	add	x8, x8, #0x8
1024a1d10:     	mov	w9, #0x1                ; =1
1024a1d14:     	ldadd	w9, w8, [x8]
1024a1d18:     	add	x1, sp, #0x10
1024a1d1c:     	mov	x2, x21
1024a1d20:     	mov	x3, x20
1024a1d24:     	bl	0x1024a6610
1024a1d28:     	mov	x23, x0
1024a1d2c:     	mov	x0, x19
1024a1d30:     	bl	0x10001022c
1024a1d34:     	cbz	w23, 0x1024a1d80
1024a1d38:     	ldr	x0, [x22, #0x150]
1024a1d3c:     	mov	x8, sp
1024a1d40:     	add	x19, x8, #0x8
1024a1d44:     	ldp	x9, x8, [x22, #0xe8]
1024a1d48:     	stp	x9, x8, [sp]
1024a1d4c:     	cbz	x8, 0x1024a1d5c
1024a1d50:     	add	x8, x8, #0x8
1024a1d54:     	mov	w9, #0x1                ; =1
1024a1d58:     	ldadd	w9, w8, [x8]
1024a1d5c:     	mov	x1, sp
1024a1d60:     	mov	x2, x21
1024a1d64:     	mov	x3, x20
1024a1d68:     	bl	0x1024a6610
1024a1d6c:     	cmp	w0, #0x0
1024a1d70:     	cset	w20, ne
1024a1d74:     	mov	x0, x19
1024a1d78:     	bl	0x10001022c
1024a1d7c:     	b	0x1024a1d84
1024a1d80:     	mov	w20, #0x0               ; =0
1024a1d84:     	mov	x0, x20
1024a1d88:     	ldp	x29, x30, [sp, #0x50]
1024a1d8c:     	ldp	x20, x19, [sp, #0x40]
1024a1d90:     	ldp	x22, x21, [sp, #0x30]
1024a1d94:     	ldp	x24, x23, [sp, #0x20]
1024a1d98:     	add	sp, sp, #0x60
1024a1d9c:     	ret
1024a1da0:     	b	0x1024a1da4
1024a1da4:     	mov	x20, x0
1024a1da8:     	mov	x0, x19
1024a1dac:     	bl	0x10001022c
1024a1db0:     	mov	x0, x20
1024a1db4:     	bl	0x103bda970

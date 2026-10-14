; CSP 5.1.4 ARM64, unslid range 0x102856cd4:0x102856ed8
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102856cd4:     	sub	sp, sp, #0x80
102856cd8:     	stp	x24, x23, [sp, #0x40]
102856cdc:     	stp	x22, x21, [sp, #0x50]
102856ce0:     	stp	x20, x19, [sp, #0x60]
102856ce4:     	stp	x29, x30, [sp, #0x70]
102856ce8:     	add	x29, sp, #0x70
102856cec:     	mov	x19, x2
102856cf0:     	mov	x20, x1
102856cf4:     	mov	x21, x0
102856cf8:     	ldr	x0, [x0, #0x48]
102856cfc:     	add	x23, sp, #0x30
102856d00:     	add	x8, sp, #0x30
102856d04:     	bl	0x102e4c968
102856d08:     	ldr	x8, [sp, #0x30]
102856d0c:     	cbz	x8, 0x102856d74
102856d10:     	ldr	x0, [x21, #0x48]
102856d14:     	add	x8, sp, #0x20
102856d18:     	bl	0x102e4c94c
102856d1c:     	ldr	x8, [sp, #0x20]
102856d20:     	cbz	x8, 0x102856de4
102856d24:     	ldr	x9, [x8, #0x10]!
102856d28:     	cbz	x9, 0x102856de4
102856d2c:     	mov	x22, x8
102856d30:     	ldr	w10, [x9, #0x20]
102856d34:     	cmp	w10, w20
102856d38:     	cset	w10, lt
102856d3c:     	csel	x22, x22, x9, lt
102856d40:     	ldr	x9, [x9, w10, uxtw #3]
102856d44:     	cbnz	x9, 0x102856d30
102856d48:     	cmp	x22, x8
102856d4c:     	b.eq	0x102856de4
102856d50:     	ldr	w8, [x22, #0x20]
102856d54:     	cmp	w8, w20
102856d58:     	b.gt	0x102856de4
102856d5c:     	ldr	x0, [x22, #0x28]!
102856d60:     	cbz	x0, 0x102856d7c
102856d64:     	ldr	x8, [x0]
102856d68:     	ldr	x8, [x8, #0x10]
102856d6c:     	blr	x8
102856d70:     	b	0x102856d84
102856d74:     	mov	w19, #0x0               ; =0
102856d78:     	b	0x102856e78
102856d7c:     	adrp	x0, 0x1048c8000
102856d80:     	ldr	x0, [x0, #0x428]
102856d84:     	adrp	x1, 0x1048ed000
102856d88:     	add	x1, x1, #0xe58
102856d8c:     	bl	0x100016d30
102856d90:     	cbz	w0, 0x102856de4
102856d94:     	mov	x0, x22
102856d98:     	bl	0x1002a05dc
102856d9c:     	ldr	q0, [x0]
102856da0:     	str	q0, [sp]
102856da4:     	ldp	x9, x8, [sp, #0x30]
102856da8:     	stp	x9, x8, [sp, #0x10]
102856dac:     	cbz	x8, 0x102856dbc
102856db0:     	add	x8, x8, #0x8
102856db4:     	mov	w9, #0x1                ; =1
102856db8:     	ldadd	w9, w8, [x8]
102856dbc:     	add	x22, sp, #0x10
102856dc0:     	add	x2, sp, #0x10
102856dc4:     	mov	x0, x21
102856dc8:     	mov	x1, x20
102856dcc:     	bl	0x102e19cf4
102856dd0:     	mov	x21, x0
102856dd4:     	add	x0, x22, #0x8
102856dd8:     	bl	0x10001022c
102856ddc:     	ldr	q0, [sp]
102856de0:     	cbnz	w21, 0x102856e5c
102856de4:     	ldr	x8, [sp, #0x30]
102856de8:     	ldr	x9, [x8, #0x10]!
102856dec:     	cbz	x9, 0x102856e68
102856df0:     	mov	x21, x8
102856df4:     	ldr	w10, [x9, #0x20]
102856df8:     	cmp	w10, w20
102856dfc:     	cset	w10, lt
102856e00:     	csel	x21, x21, x9, lt
102856e04:     	ldr	x9, [x9, w10, uxtw #3]
102856e08:     	cbnz	x9, 0x102856df4
102856e0c:     	cmp	x21, x8
102856e10:     	b.eq	0x102856e68
102856e14:     	ldr	w8, [x21, #0x20]
102856e18:     	cmp	w8, w20
102856e1c:     	b.gt	0x102856e68
102856e20:     	ldr	x0, [x21, #0x28]!
102856e24:     	cbz	x0, 0x102856e38
102856e28:     	ldr	x8, [x0]
102856e2c:     	ldr	x8, [x8, #0x10]
102856e30:     	blr	x8
102856e34:     	b	0x102856e40
102856e38:     	adrp	x0, 0x1048c8000
102856e3c:     	ldr	x0, [x0, #0x428]
102856e40:     	adrp	x1, 0x1048ed000
102856e44:     	add	x1, x1, #0xe58
102856e48:     	bl	0x100016d30
102856e4c:     	cbz	w0, 0x102856e68
102856e50:     	mov	x0, x21
102856e54:     	bl	0x1002a05dc
102856e58:     	ldr	q0, [x0]
102856e5c:     	str	q0, [x19]
102856e60:     	mov	w19, #0x1               ; =1
102856e64:     	b	0x102856e6c
102856e68:     	mov	w19, #0x0               ; =0
102856e6c:     	add	x8, sp, #0x20
102856e70:     	add	x0, x8, #0x8
102856e74:     	bl	0x10001022c
102856e78:     	add	x0, x23, #0x8
102856e7c:     	bl	0x10001022c
102856e80:     	mov	x0, x19
102856e84:     	ldp	x29, x30, [sp, #0x70]
102856e88:     	ldp	x20, x19, [sp, #0x60]
102856e8c:     	ldp	x22, x21, [sp, #0x50]
102856e90:     	ldp	x24, x23, [sp, #0x40]
102856e94:     	add	sp, sp, #0x80
102856e98:     	ret
102856e9c:     	mov	x19, x0
102856ea0:     	add	x0, x22, #0x8
102856ea4:     	bl	0x10001022c
102856ea8:     	b	0x102856eb0
102856eac:     	mov	x19, x0
102856eb0:     	add	x8, sp, #0x20
102856eb4:     	add	x0, x8, #0x8
102856eb8:     	bl	0x10001022c
102856ebc:     	b	0x102856ec4
102856ec0:     	mov	x19, x0
102856ec4:     	add	x8, sp, #0x30
102856ec8:     	add	x0, x8, #0x8
102856ecc:     	bl	0x10001022c
102856ed0:     	mov	x0, x19
102856ed4:     	bl	0x103bda970

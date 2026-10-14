; CSP 5.1.4 ARM64, unslid range 0x10253cbcc:0x10253ccbc
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
10253cbcc:     	sub	sp, sp, #0x70
10253cbd0:     	stp	d9, d8, [sp, #0x20]
10253cbd4:     	stp	x24, x23, [sp, #0x30]
10253cbd8:     	stp	x22, x21, [sp, #0x40]
10253cbdc:     	stp	x20, x19, [sp, #0x50]
10253cbe0:     	stp	x29, x30, [sp, #0x60]
10253cbe4:     	add	x29, sp, #0x60
10253cbe8:     	mov	x23, x3
10253cbec:     	mov	x20, x2
10253cbf0:     	fmov	d8, d0
10253cbf4:     	mov	x21, x1
10253cbf8:     	mov	x19, x0
10253cbfc:     	add	x22, x0, #0x118
10253cc00:     	ldr	q0, [x22]
10253cc04:     	add	x8, sp, #0x10
10253cc08:     	stp	xzr, xzr, [x0, #0x118]
10253cc0c:     	str	q0, [sp, #0x10]
10253cc10:     	orr	x0, x8, #0x8
10253cc14:     	bl	0x10001022c
10253cc18:     	str	xzr, [x19, #0x128]
10253cc1c:     	ldp	x9, x8, [x23]
10253cc20:     	stp	x9, x8, [sp]
10253cc24:     	cbz	x8, 0x10253cc34
10253cc28:     	add	x8, x8, #0x8
10253cc2c:     	mov	w9, #0x1                ; =1
10253cc30:     	ldadd	w9, w8, [x8]
10253cc34:     	mov	x23, sp
10253cc38:     	mov	x1, sp
10253cc3c:     	add	x3, x19, #0x128
10253cc40:     	mov	x0, x19
10253cc44:     	mov	x2, x22
10253cc48:     	bl	0x10253ccbc
10253cc4c:     	mov	x22, x0
10253cc50:     	add	x0, x23, #0x8
10253cc54:     	bl	0x10001022c
10253cc58:     	cbz	w22, 0x10253cc88
10253cc5c:     	mov	x0, x19
10253cc60:     	bl	0x10253cdd4
10253cc64:     	str	w21, [x19, #0x16c]
10253cc68:     	str	w20, [x19, #0x174]
10253cc6c:     	mov	x0, x19
10253cc70:     	fmov	d0, d8
10253cc74:     	bl	0x10253ceec
10253cc78:     	mov	x0, x19
10253cc7c:     	bl	0x10253cf74
10253cc80:     	mov	w0, #0x1                ; =1
10253cc84:     	b	0x10253cc8c
10253cc88:     	mov	w0, #0x0                ; =0
10253cc8c:     	ldp	x29, x30, [sp, #0x60]
10253cc90:     	ldp	x20, x19, [sp, #0x50]
10253cc94:     	ldp	x22, x21, [sp, #0x40]
10253cc98:     	ldp	x24, x23, [sp, #0x30]
10253cc9c:     	ldp	d9, d8, [sp, #0x20]
10253cca0:     	add	sp, sp, #0x70
10253cca4:     	ret
10253cca8:     	mov	x19, x0
10253ccac:     	add	x0, x23, #0x8
10253ccb0:     	bl	0x10001022c
10253ccb4:     	mov	x0, x19
10253ccb8:     	bl	0x103bda970

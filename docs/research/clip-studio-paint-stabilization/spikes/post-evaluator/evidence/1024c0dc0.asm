
FUNCTION 0x1024c0dc0 size 824
1024c0dc0:     	sub	sp, sp, #0x50
1024c0dc4:     	stp	x22, x21, [sp, #0x20]
1024c0dc8:     	stp	x20, x19, [sp, #0x30]
1024c0dcc:     	stp	x29, x30, [sp, #0x40]
1024c0dd0:     	add	x29, sp, #0x40
1024c0dd4:     	mov	x19, x0
1024c0dd8:     	ldp	x9, x8, [x1]
1024c0ddc:     	stp	x9, x8, [sp, #0x10]
1024c0de0:     	cbz	x8, 0x1024c0df0
1024c0de4:     	add	x8, x8, #0x8
1024c0de8:     	mov	w9, #0x1                ; =1
1024c0dec:     	ldadd	w9, w8, [x8]
1024c0df0:     	ldp	x9, x8, [x2]
1024c0df4:     	stp	x9, x8, [sp]
1024c0df8:     	cbz	x8, 0x1024c0e08
1024c0dfc:     	add	x8, x8, #0x8
1024c0e00:     	mov	w9, #0x1                ; =1
1024c0e04:     	ldadd	w9, w8, [x8]
1024c0e08:     	add	x20, sp, #0x10
1024c0e0c:     	mov	x21, sp
1024c0e10:     	add	x1, sp, #0x10
1024c0e14:     	mov	x2, sp
1024c0e18:     	mov	x0, x19
1024c0e1c:     	bl	0x1036717d0
1024c0e20:     	add	x0, x21, #0x8
1024c0e24:     	bl	0x10001022c
1024c0e28:     	add	x0, x20, #0x8
1024c0e2c:     	bl	0x10001022c
1024c0e30:     	adrp	x8, 0x104a49000
1024c0e34:     	add	x8, x8, #0x5f0
1024c0e38:     	str	x8, [x19]
1024c0e3c:     	movi.2d	v0, #0000000000000000
1024c0e40:     	stur	q0, [x19, #0x58]
1024c0e44:     	stur	q0, [x19, #0x68]
1024c0e48:     	add	x0, x19, #0x88
1024c0e4c:     	bl	0x1024af65c
1024c0e50:     	add	x0, x19, #0xe0
1024c0e54:     	bl	0x1024af65c
1024c0e58:     	add	x0, x19, #0x140
1024c0e5c:     	bl	0x1024af65c
1024c0e60:     	add	x0, x19, #0x1b0
1024c0e64:     	bl	0x1024af65c
1024c0e68:     	add	x0, x19, #0x218
1024c0e6c:     	bl	0x1024af65c
1024c0e70:     	movi.2d	v0, #0000000000000000
1024c0e74:     	str	q0, [x19, #0x2a0]
1024c0e78:     	str	xzr, [x19, #0x2b8]
1024c0e7c:     	str	q0, [x19, #0x2c0]
1024c0e80:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
1024c0e84:     	str	x8, [x19, #0x2d0]
1024c0e88:     	add	x8, x19, #0x2d8
1024c0e8c:     	str	xzr, [x19, #0x2f8]
1024c0e90:     	stp	q0, q0, [x8]
1024c0e94:     	add	x0, x19, #0x308
1024c0e98:     	bl	0x1024af65c
1024c0e9c:     	add	x0, x19, #0x378
1024c0ea0:     	bl	0x1024af65c
1024c0ea4:     	add	x0, x19, #0x3d8
1024c0ea8:     	bl	0x1024af65c
1024c0eac:     	add	x0, x19, #0x448
1024c0eb0:     	bl	0x1024af65c
1024c0eb4:     	add	x0, x19, #0x4a8
1024c0eb8:     	bl	0x1024af65c
1024c0ebc:     	add	x0, x19, #0x508
1024c0ec0:     	bl	0x1024af65c
1024c0ec4:     	add	x0, x19, #0x568
1024c0ec8:     	bl	0x1024af65c
1024c0ecc:     	add	x0, x19, #0x5c8
1024c0ed0:     	bl	0x1024af65c
1024c0ed4:     	add	x0, x19, #0x630
1024c0ed8:     	bl	0x1024af65c
1024c0edc:     	add	x0, x19, #0x690
1024c0ee0:     	bl	0x1024af65c
1024c0ee4:     	movi.2d	v0, #0000000000000000
1024c0ee8:     	str	q0, [x19, #0x6f0]
1024c0eec:     	str	xzr, [x19, #0x78]
1024c0ef0:     	mov	w8, #0xc600             ; =50688
1024c0ef4:     	movk	w8, #0x1, lsl #16
1024c0ef8:     	str	w8, [x19, #0x80]
1024c0efc:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
1024c0f00:     	str	x8, [x19, #0x138]
1024c0f04:     	fmov.2d	v1, #1.00000000
1024c0f08:     	str	q1, [x19, #0x1a0]
1024c0f0c:     	mov	w9, #0x2                ; =2
1024c0f10:     	str	w9, [x19, #0x208]
1024c0f14:     	adrp	x9, 0x1042ef000
1024c0f18:     	ldr	d1, [x9, #0x8]
1024c0f1c:     	str	d1, [x19, #0x198]
1024c0f20:     	str	x8, [x19, #0x210]
1024c0f24:     	str	xzr, [x19, #0x270]
1024c0f28:     	str	wzr, [x19, #0x278]
1024c0f2c:     	adrp	x9, 0x1042f3000
1024c0f30:     	ldr	q1, [x9, #0x70]
1024c0f34:     	str	q1, [x19, #0x280]
1024c0f38:     	str	wzr, [x19, #0x290]
1024c0f3c:     	str	x8, [x19, #0x298]
1024c0f40:     	adrp	x9, 0x1042e4000
1024c0f44:     	ldr	d2, [x9, #0x790]
1024c0f48:     	str	d2, [x19, #0x2b0]
1024c0f4c:     	str	x8, [x19, #0x300]
1024c0f50:     	str	q0, [x19, #0x360]
1024c0f54:     	str	x8, [x19, #0x370]
1024c0f58:     	str	x8, [x19, #0x3d0]
1024c0f5c:     	str	xzr, [x19, #0x430]
1024c0f60:     	str	wzr, [x19, #0x438]
1024c0f64:     	str	xzr, [x19, #0x440]
1024c0f68:     	str	xzr, [x19, #0x4a0]
1024c0f6c:     	str	xzr, [x19, #0x500]
1024c0f70:     	str	xzr, [x19, #0x560]
1024c0f74:     	str	xzr, [x19, #0x5c0]
1024c0f78:     	adrp	x9, 0x1042ed000
1024c0f7c:     	ldr	d2, [x9, #0x458]
1024c0f80:     	str	d2, [x19, #0x620]
1024c0f84:     	str	x8, [x19, #0x628]
1024c0f88:     	str	x8, [x19, #0x688]
1024c0f8c:     	str	x8, [x19, #0x6e8]
1024c0f90:     	str	wzr, [x19, #0x700]
1024c0f94:     	str	x8, [x19, #0x708]
1024c0f98:     	str	wzr, [x19, #0x710]
1024c0f9c:     	add	x8, x19, #0x718
1024c0fa0:     	str	q0, [x8]
1024c0fa4:     	str	q1, [x19, #0x730]
1024c0fa8:     	str	xzr, [x19, #0x728]
1024c0fac:     	mov	x0, x19
1024c0fb0:     	ldp	x29, x30, [sp, #0x40]
1024c0fb4:     	ldp	x20, x19, [sp, #0x30]
1024c0fb8:     	ldp	x22, x21, [sp, #0x20]
1024c0fbc:     	add	sp, sp, #0x50
1024c0fc0:     	ret
1024c0fc4:     	mov	x20, x0
1024c0fc8:     	add	x0, x19, #0x630
1024c0fcc:     	bl	0x1024af6d8
1024c0fd0:     	b	0x1024c0fd8
1024c0fd4:     	mov	x20, x0
1024c0fd8:     	add	x0, x19, #0x5c8
1024c0fdc:     	bl	0x1024af6d8
1024c0fe0:     	b	0x1024c0fe8
1024c0fe4:     	mov	x20, x0
1024c0fe8:     	add	x0, x19, #0x568
1024c0fec:     	bl	0x1024af6d8
1024c0ff0:     	b	0x1024c0ff8
1024c0ff4:     	mov	x20, x0
1024c0ff8:     	add	x0, x19, #0x508
1024c0ffc:     	bl	0x1024af6d8
1024c1000:     	b	0x1024c1008
1024c1004:     	mov	x20, x0
1024c1008:     	add	x0, x19, #0x4a8
1024c100c:     	bl	0x1024af6d8
1024c1010:     	add	x0, x19, #0x448
1024c1014:     	bl	0x1024af6d8
1024c1018:     	add	x0, x19, #0x3d8
1024c101c:     	bl	0x1024af6d8
1024c1020:     	add	x0, x19, #0x378
1024c1024:     	bl	0x1024af6d8
1024c1028:     	add	x0, x19, #0x308
1024c102c:     	bl	0x1024af6d8
1024c1030:     	add	x0, x19, #0x2c0
1024c1034:     	bl	0x10001022c
1024c1038:     	add	x0, x19, #0x2a8
1024c103c:     	bl	0x10001022c
1024c1040:     	add	x0, x19, #0x218
1024c1044:     	bl	0x1024af6d8
1024c1048:     	add	x0, x19, #0x1b0
1024c104c:     	bl	0x1024af6d8
1024c1050:     	add	x0, x19, #0x140
1024c1054:     	bl	0x1024af6d8
1024c1058:     	add	x0, x19, #0xe0
1024c105c:     	bl	0x1024af6d8
1024c1060:     	add	x0, x19, #0x88
1024c1064:     	bl	0x1024af6d8
1024c1068:     	add	x0, x19, #0x70
1024c106c:     	bl	0x10001022c
1024c1070:     	add	x0, x19, #0x60
1024c1074:     	bl	0x100015a60
1024c1078:     	mov	x0, x19
1024c107c:     	bl	0x103671894
1024c1080:     	mov	x0, x20
1024c1084:     	bl	0x103bda970
1024c1088:     	mov	x20, x0
1024c108c:     	b	0x1024c1010
1024c1090:     	mov	x20, x0
1024c1094:     	b	0x1024c1018
1024c1098:     	mov	x20, x0
1024c109c:     	b	0x1024c1020
1024c10a0:     	mov	x20, x0
1024c10a4:     	b	0x1024c1028
1024c10a8:     	mov	x20, x0
1024c10ac:     	b	0x1024c1030
1024c10b0:     	mov	x20, x0
1024c10b4:     	b	0x1024c1048
1024c10b8:     	mov	x20, x0
1024c10bc:     	b	0x1024c1050
1024c10c0:     	mov	x20, x0
1024c10c4:     	b	0x1024c1058
1024c10c8:     	mov	x20, x0
1024c10cc:     	b	0x1024c1060
1024c10d0:     	mov	x20, x0
1024c10d4:     	b	0x1024c1068
1024c10d8:     	add	x19, sp, #0x10
1024c10dc:     	mov	x8, sp
1024c10e0:     	mov	x20, x0
1024c10e4:     	add	x0, x8, #0x8
1024c10e8:     	bl	0x10001022c
1024c10ec:     	add	x0, x19, #0x8
1024c10f0:     	bl	0x10001022c
1024c10f4:     	b	0x1024c1080

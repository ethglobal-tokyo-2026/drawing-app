
FUNCTION 0x102787db0 size 484
102787db0:     	sub	sp, sp, #0xe0
102787db4:     	stp	d15, d14, [sp, #0x70]
102787db8:     	stp	d13, d12, [sp, #0x80]
102787dbc:     	stp	d11, d10, [sp, #0x90]
102787dc0:     	stp	d9, d8, [sp, #0xa0]
102787dc4:     	stp	x22, x21, [sp, #0xb0]
102787dc8:     	stp	x20, x19, [sp, #0xc0]
102787dcc:     	stp	x29, x30, [sp, #0xd0]
102787dd0:     	add	x29, sp, #0xd0
102787dd4:     	fmov	d9, d0
102787dd8:     	mov	x19, x1
102787ddc:     	mov	x20, x0
102787de0:     	ldr	x0, [x0, #0x40]
102787de4:     	ldr	x8, [x0]
102787de8:     	ldr	x8, [x8, #0x88]
102787dec:     	blr	x8
102787df0:     	fmov	d8, d0
102787df4:     	ldr	x0, [x20, #0x40]
102787df8:     	ldr	x8, [x0]
102787dfc:     	ldr	x9, [x8, #0x98]
102787e00:     	add	x8, sp, #0x60
102787e04:     	blr	x9
102787e08:     	fmov	d0, #2.00000000
102787e0c:     	fcmp	d8, d0
102787e10:     	fcsel	d10, d0, d8, mi
102787e14:     	ldr	x8, [x20, #0x40]
102787e18:     	cmp	w19, #0x0
102787e1c:     	mov	w9, #0x30               ; =48
102787e20:     	mov	w10, #0x38              ; =56
102787e24:     	csel	x9, x10, x9, eq
102787e28:     	ldr	x20, [x8, x9]
102787e2c:     	ldr	x8, [sp, #0x60]
102787e30:     	cbz	x8, 0x102787e64
102787e34:     	add	x1, sp, #0x8
102787e38:     	mov	x0, x20
102787e3c:     	bl	0x10276b138
102787e40:     	ldr	x0, [sp, #0x60]
102787e44:     	add	x1, sp, #0x8
102787e48:     	fmov	d0, d8
102787e4c:     	bl	0x1024c497c
102787e50:     	fmov	d1, #1.00000000
102787e54:     	fcmp	d0, d1
102787e58:     	fcsel	d14, d1, d0, mi
102787e5c:     	cbnz	x20, 0x102787e6c
102787e60:     	b	0x102787f40
102787e64:     	fmov	d14, #1.00000000
102787e68:     	cbz	x20, 0x102787f40
102787e6c:     	mov	w22, #0x0               ; =0
102787e70:     	fmov	d11, #1.00000000
102787e74:     	fsub	d12, d11, d9
102787e78:     	movi	d13, #0000000000000000
102787e7c:     	fmov	d15, d14
102787e80:     	mov	x21, x20
102787e84:     	cbz	w19, 0x102787ea0
102787e88:     	ldr	x20, [x21, #0x28]
102787e8c:     	cbz	x20, 0x102787f40
102787e90:     	mov	x0, x21
102787e94:     	mov	w1, #0x0                ; =0
102787e98:     	bl	0x10276ba84
102787e9c:     	b	0x102787eb4
102787ea0:     	ldr	x20, [x21, #0x30]
102787ea4:     	cbz	x20, 0x102787f40
102787ea8:     	mov	x0, x20
102787eac:     	mov	w1, #0x0                ; =0
102787eb0:     	bl	0x10276ba84
102787eb4:     	fmov	d9, d0
102787eb8:     	fadd	d13, d13, d0
102787ebc:     	fcmp	d13, d10
102787ec0:     	b.gt	0x102787f40
102787ec4:     	ldr	x8, [sp, #0x60]
102787ec8:     	cbz	x8, 0x102787ef4
102787ecc:     	add	x1, sp, #0x8
102787ed0:     	mov	x0, x20
102787ed4:     	bl	0x10276b138
102787ed8:     	ldr	x0, [sp, #0x60]
102787edc:     	add	x1, sp, #0x8
102787ee0:     	fmov	d0, d8
102787ee4:     	bl	0x1024c497c
102787ee8:     	fcmp	d0, d11
102787eec:     	fcsel	d14, d11, d0, mi
102787ef0:     	b	0x102787ef8
102787ef4:     	fmov	d14, #1.00000000
102787ef8:     	fmsub	d0, d15, d12, d14
102787efc:     	fcmp	d9, d0
102787f00:     	b.pl	0x102787f38
102787f04:     	fmov	d0, #0.50000000
102787f08:     	fcmp	d13, d0
102787f0c:     	cset	w8, mi
102787f10:     	orr	w8, w22, w8
102787f14:     	tbnz	w8, #0x0, 0x102787f20
102787f18:     	ldrb	w8, [x20, #0x40]
102787f1c:     	tbz	w8, #0x0, 0x102787f38
102787f20:     	mov	x0, x21
102787f24:     	mov	w1, #0x1                ; =1
102787f28:     	bl	0x10276e06c
102787f2c:     	fmov	d15, d14
102787f30:     	mov	x21, x20
102787f34:     	b	0x102787e84
102787f38:     	mov	w22, #0x1               ; =1
102787f3c:     	b	0x102787e7c
102787f40:     	add	x8, sp, #0x60
102787f44:     	add	x0, x8, #0x8
102787f48:     	bl	0x10001022c
102787f4c:     	ldp	x29, x30, [sp, #0xd0]
102787f50:     	ldp	x20, x19, [sp, #0xc0]
102787f54:     	ldp	x22, x21, [sp, #0xb0]
102787f58:     	ldp	d9, d8, [sp, #0xa0]
102787f5c:     	ldp	d11, d10, [sp, #0x90]
102787f60:     	ldp	d13, d12, [sp, #0x80]
102787f64:     	ldp	d15, d14, [sp, #0x70]
102787f68:     	add	sp, sp, #0xe0
102787f6c:     	ret
102787f70:     	b	0x102787f7c
102787f74:     	b	0x102787f7c
102787f78:     	b	0x102787f7c
102787f7c:     	mov	x19, x0
102787f80:     	add	x8, sp, #0x60
102787f84:     	add	x0, x8, #0x8
102787f88:     	bl	0x10001022c
102787f8c:     	mov	x0, x19
102787f90:     	bl	0x103bda970

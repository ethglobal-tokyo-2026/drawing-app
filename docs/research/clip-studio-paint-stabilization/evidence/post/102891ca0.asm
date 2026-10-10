102891ca0:     	ldr	w8, [x20, #0x164]
102891ca4:     	cbz	w8, 0x102891ea8
102891ca8:     	add	x0, x20, #0x268
102891cac:     	bl	0x102c709e4
102891cb0:     	cbz	w0, 0x102891ccc
102891cb4:     	ldr	x0, [x20, #0x258]
102891cb8:     	cbz	x0, 0x102891ccc
102891cbc:     	bl	0x102c6a198
102891cc0:     	cbnz	w24, 0x102891ea8
102891cc4:     	cmp	w0, #0x1
102891cc8:     	b.hi	0x102891ea8
102891ccc:     	ldr	x8, [sp, #0x338]
102891cd0:     	str	x8, [sp, #0x340]
102891cd4:     	ldr	x0, [x20, #0x78]
102891cd8:     	cbz	x0, 0x102891d28
102891cdc:     	ldr	x8, [x0]
102891ce0:     	ldr	x8, [x8, #0x10]
102891ce4:     	blr	x8
102891ce8:     	cbz	w0, 0x102891d28
102891cec:     	ldr	x0, [x20, #0x78]
102891cf0:     	bl	0x102ce8894
102891cf4:     	cmp	w0, #0x64
102891cf8:     	b.eq	0x102891d28
102891cfc:     	ldr	w8, [x20, #0x170]
102891d00:     	cmp	w8, #0x5
102891d04:     	b.lt	0x102891d10
102891d08:     	mov	w8, #0x4                ; =4
102891d0c:     	str	w8, [x20, #0x170]
102891d10:     	ldr	d0, [x20, #0x168]
102891d14:     	fmov	d1, #1.50000000
102891d18:     	fcmp	d0, d1
102891d1c:     	b.le	0x102891d28
102891d20:     	mov	x8, #0x3ff8000000000000 ; =4609434218613702656
102891d24:     	str	x8, [x20, #0x168]
102891d28:     	str	xzr, [sp, #0x2b0]
102891d2c:     	adrp	x8, 0x104d6e000
102891d30:     	ldr	x8, [x8, #0xf0]
102891d34:     	ldr	x8, [x8]
102891d38:     	ldr	x0, [x8]
102891d3c:     	cbz	x0, 0x102891e94
102891d40:     	ldr	w1, [x20, #0x170]
102891d44:     	ldr	d0, [x20, #0x168]
102891d48:     	ldr	w2, [x20, #0x174]
102891d4c:     	ldr	w3, [sp, #0x29c]
102891d50:     	ldr	w4, [x20, #0x180]
102891d54:     	ldr	d1, [x20, #0x178]
102891d58:     	bl	0x1028ed064
102891d5c:     	str	x0, [sp, #0x2b0]

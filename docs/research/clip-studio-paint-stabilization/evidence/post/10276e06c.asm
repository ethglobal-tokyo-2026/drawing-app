10276e06c:     	stp	x20, x19, [sp, #-0x20]!
10276e070:     	stp	x29, x30, [sp, #0x10]
10276e074:     	add	x29, sp, #0x10
10276e078:     	mov	x2, x1
10276e07c:     	mov	x19, x0
10276e080:     	ldr	x0, [x0, #0x30]
10276e084:     	cbnz	x0, 0x10276e0a0
10276e088:     	ldr	x8, [x19, #0x38]
10276e08c:     	ldrb	w9, [x8, #0x21]
10276e090:     	tbnz	w9, #0x0, 0x10276e09c
10276e094:     	mov	x0, #0x0                ; =0
10276e098:     	b	0x10276e0a0
10276e09c:     	ldr	x0, [x8, #0x38]
10276e0a0:     	ldr	x8, [x19, #0x28]
10276e0a4:     	cbz	x8, 0x10276e0b0
10276e0a8:     	mov	w8, #0x1                ; =1
10276e0ac:     	b	0x10276e0c8
10276e0b0:     	ldr	x8, [x19, #0x38]
10276e0b4:     	ldrb	w9, [x8, #0x21]
10276e0b8:     	tbz	w9, #0x0, 0x10276e0e4
10276e0bc:     	ldr	x8, [x8, #0x30]
10276e0c0:     	cmp	x8, #0x0
10276e0c4:     	cset	w8, ne
10276e0c8:     	cmp	x0, #0x0
10276e0cc:     	ccmp	w8, #0x0, #0x4, ne
10276e0d0:     	b.eq	0x10276e0e4
10276e0d4:     	ldr	x8, [x0]
10276e0d8:     	ldr	x8, [x8, #0x128]
10276e0dc:     	mov	x1, x19
10276e0e0:     	blr	x8
10276e0e4:     	ldr	x0, [x19, #0x38]
10276e0e8:     	mov	x1, x19
10276e0ec:     	ldp	x29, x30, [sp, #0x10]
10276e0f0:     	ldp	x20, x19, [sp], #0x20
10276e0f4:     	b	0x102781838
10276e0f8:     	sub	sp, sp, #0xa0
10276e0fc:     	stp	d9, d8, [sp, #0x70]
10276e100:     	stp	x20, x19, [sp, #0x80]
10276e104:     	stp	x29, x30, [sp, #0x90]
10276e108:     	add	x29, sp, #0x90
10276e10c:     	ldrb	w8, [x0, #0x41]
10276e110:     	tbnz	w8, #0x4, 0x10276e194
10276e114:     	mov	x19, x0
10276e118:     	ldr	x0, [x0, #0x38]
10276e11c:     	ldr	x8, [x0]
10276e120:     	ldr	x9, [x8, #0x98]
10276e124:     	sub	x20, x29, #0x30
10276e128:     	sub	x8, x29, #0x30
10276e12c:     	blr	x9
10276e130:     	ldur	x8, [x29, #-0x30]
10276e134:     	cbz	x8, 0x10276e18c
10276e138:     	ldr	x0, [x19, #0x38]
10276e13c:     	ldr	x8, [x0]
10276e140:     	ldr	x8, [x8, #0x88]
10276e144:     	blr	x8
10276e148:     	fmov	d8, d0
10276e14c:     	add	x1, sp, #0x8
10276e150:     	mov	x0, x19
10276e154:     	bl	0x10276b138
10276e158:     	ldur	x0, [x29, #-0x30]
10276e15c:     	add	x1, sp, #0x8
10276e160:     	fmov	d0, d8
10276e164:     	bl	0x1024c4dd4
10276e168:     	ldr	s1, [x19, #0x58]
10276e16c:     	fcvt	d1, s1
10276e170:     	fmul	d0, d0, d1
10276e174:     	fdiv	d0, d0, d8
10276e178:     	fcvt	s0, d0
10276e17c:     	str	s0, [x19, #0x58]
10276e180:     	ldr	w8, [x19, #0x40]
10276e184:     	orr	w8, w8, #0x1000
10276e188:     	str	w8, [x19, #0x40]
10276e18c:     	add	x0, x20, #0x8
10276e190:     	bl	0x10001022c
10276e194:     	ldp	x29, x30, [sp, #0x90]
10276e198:     	ldp	x20, x19, [sp, #0x80]
10276e19c:     	ldp	d9, d8, [sp, #0x70]
10276e1a0:     	add	sp, sp, #0xa0
10276e1a4:     	ret
10276e1a8:     	b	0x10276e1ac
10276e1ac:     	mov	x19, x0
10276e1b0:     	sub	x8, x29, #0x30
10276e1b4:     	add	x0, x8, #0x8
10276e1b8:     	bl	0x10001022c
10276e1bc:     	mov	x0, x19
10276e1c0:     	bl	0x103bda970
10276e1c4:     	sub	sp, sp, #0xb0
10276e1c8:     	stp	d9, d8, [sp, #0x70]
10276e1cc:     	stp	x22, x21, [sp, #0x80]
10276e1d0:     	stp	x20, x19, [sp, #0x90]
10276e1d4:     	stp	x29, x30, [sp, #0xa0]
10276e1d8:     	add	x29, sp, #0xa0
10276e1dc:     	ldrb	w8, [x0, #0x41]
10276e1e0:     	tbnz	w8, #0x5, 0x10276e258
10276e1e4:     	mov	x19, x0
10276e1e8:     	ldr	x0, [x0, #0x38]
10276e1ec:     	ldr	x8, [x0]
10276e1f0:     	ldr	x9, [x8, #0x98]
10276e1f4:     	sub	x21, x29, #0x40
10276e1f8:     	sub	x8, x29, #0x40
10276e1fc:     	blr	x9
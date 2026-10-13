
FUNCTION 0x10359fe88 size 276
10359fe88:     	sub	sp, sp, #0xe0
10359fe8c:     	stp	d15, d14, [sp, #0x80]
10359fe90:     	stp	d13, d12, [sp, #0x90]
10359fe94:     	stp	d11, d10, [sp, #0xa0]
10359fe98:     	stp	d9, d8, [sp, #0xb0]
10359fe9c:     	stp	x20, x19, [sp, #0xc0]
10359fea0:     	stp	x29, x30, [sp, #0xd0]
10359fea4:     	add	x29, sp, #0xd0
10359fea8:     	stp	d4, d5, [x29, #-0x60]
10359feac:     	cmp	w0, #0x1
10359feb0:     	b.lt	0x10359ff74
10359feb4:     	mov	x19, x0
10359feb8:     	fmov	d11, d7
10359febc:     	fmov	d9, d6
10359fec0:     	fmov	d12, d5
10359fec4:     	fmov	d13, d4
10359fec8:     	fmov	d14, d3
10359fecc:     	fmov	d15, d2
10359fed0:     	fmov	d17, d0
10359fed4:     	ldr	d0, [x29, #0x28]
10359fed8:     	str	d0, [sp, #0x48]
10359fedc:     	ldr	d0, [x29, #0x20]
10359fee0:     	str	d0, [sp, #0x40]
10359fee4:     	ldr	d0, [x29, #0x18]
10359fee8:     	str	d0, [sp, #0x38]
10359feec:     	ldr	d0, [x29, #0x10]
10359fef0:     	str	d0, [sp, #0x30]
10359fef4:     	scvtf	d0, w0
10359fef8:     	fmov	d16, #1.00000000
10359fefc:     	fdiv	d10, d16, d0
10359ff00:     	movi	d8, #0000000000000000
10359ff04:     	str	d10, [sp, #0x28]
10359ff08:     	stp	d17, d1, [sp, #0x50]
10359ff0c:     	ldp	d3, d2, [sp, #0x40]
10359ff10:     	stp	d2, d10, [sp, #0x18]
10359ff14:     	ldp	d0, d2, [sp, #0x30]
10359ff18:     	stp	d2, d3, [sp, #0x8]
10359ff1c:     	str	d0, [sp]
10359ff20:     	fmov	d0, d17
10359ff24:     	fmov	d2, d15
10359ff28:     	fmov	d3, d14
10359ff2c:     	fmov	d4, d13
10359ff30:     	fmov	d5, d12
10359ff34:     	fmov	d6, d9
10359ff38:     	fmov	d7, d11
10359ff3c:     	bl	0x10359f580
10359ff40:     	stp	d0, d1, [sp, #0x60]
10359ff44:     	sub	x0, x29, #0x60
10359ff48:     	add	x1, sp, #0x60
10359ff4c:     	bl	0x102193618
10359ff50:     	ldp	d17, d1, [sp, #0x50]
10359ff54:     	fadd	d8, d8, d0
10359ff58:     	ldr	q0, [sp, #0x60]
10359ff5c:     	stur	q0, [x29, #-0x60]
10359ff60:     	ldr	d0, [sp, #0x28]
10359ff64:     	fadd	d10, d0, d10
10359ff68:     	subs	w19, w19, #0x1
10359ff6c:     	b.ne	0x10359ff0c
10359ff70:     	b	0x10359ff78
10359ff74:     	movi	d8, #0000000000000000
10359ff78:     	fmov	d0, d8
10359ff7c:     	ldp	x29, x30, [sp, #0xd0]
10359ff80:     	ldp	x20, x19, [sp, #0xc0]
10359ff84:     	ldp	d9, d8, [sp, #0xb0]
10359ff88:     	ldp	d11, d10, [sp, #0xa0]
10359ff8c:     	ldp	d13, d12, [sp, #0x90]
10359ff90:     	ldp	d15, d14, [sp, #0x80]
10359ff94:     	add	sp, sp, #0xe0
10359ff98:     	ret

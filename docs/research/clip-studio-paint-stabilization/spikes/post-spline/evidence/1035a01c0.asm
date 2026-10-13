
FUNCTION 0x1035a01c0 size 360
1035a01c0:     	sub	sp, sp, #0xe0
1035a01c4:     	stp	d15, d14, [sp, #0x60]
1035a01c8:     	stp	d13, d12, [sp, #0x70]
1035a01cc:     	stp	d11, d10, [sp, #0x80]
1035a01d0:     	stp	d9, d8, [sp, #0x90]
1035a01d4:     	stp	x28, x27, [sp, #0xa0]
1035a01d8:     	stp	x22, x21, [sp, #0xb0]
1035a01dc:     	stp	x20, x19, [sp, #0xc0]
1035a01e0:     	stp	x29, x30, [sp, #0xd0]
1035a01e4:     	add	x29, sp, #0xd0
1035a01e8:     	mov	x19, x0
1035a01ec:     	ldp	d18, d19, [x29, #0x20]
1035a01f0:     	ldp	d16, d17, [x29, #0x10]
1035a01f4:     	ldp	d12, d13, [x29, #0x38]
1035a01f8:     	ldr	d20, [x29, #0x30]
1035a01fc:     	stp	d20, d19, [sp, #0x28]
1035a0200:     	stp	d18, d19, [sp, #0x10]
1035a0204:     	stp	d18, d17, [sp, #0x38]
1035a0208:     	stp	d16, d17, [sp]
1035a020c:     	stp	d16, d0, [sp, #0x48]
1035a0210:     	str	d1, [sp, #0x58]
1035a0214:     	fmov	d11, d2
1035a0218:     	fmov	d10, d3
1035a021c:     	fmov	d9, d4
1035a0220:     	fmov	d8, d5
1035a0224:     	fmov	d15, d6
1035a0228:     	fmov	d14, d7
1035a022c:     	bl	0x10359fd24
1035a0230:     	fabd	d1, d13, d12
1035a0234:     	fmul	d0, d1, d0
1035a0238:     	ldr	d1, [sp, #0x28]
1035a023c:     	fdiv	d0, d0, d1
1035a0240:     	fcvtzs	w8, d0
1035a0244:     	str	d13, [sp, #0x28]
1035a0248:     	fsub	d0, d13, d12
1035a024c:     	mov	w9, #0xff               ; =255
1035a0250:     	cmp	w8, #0xff
1035a0254:     	csel	w8, w8, w9, lt
1035a0258:     	mov	w9, #0x4                ; =4
1035a025c:     	cmp	w8, #0x4
1035a0260:     	csel	w20, w8, w9, gt
1035a0264:     	ucvtf	d1, w20
1035a0268:     	fdiv	d13, d0, d1
1035a026c:     	add	x21, x19, #0x8
1035a0270:     	mov	x22, x20
1035a0274:     	ldp	d1, d2, [sp, #0x30]
1035a0278:     	stp	d1, d12, [sp, #0x18]
1035a027c:     	ldp	d1, d0, [sp, #0x40]
1035a0280:     	stp	d1, d2, [sp, #0x8]
1035a0284:     	str	d0, [sp]
1035a0288:     	ldp	d0, d1, [sp, #0x50]
1035a028c:     	fmov	d2, d11
1035a0290:     	fmov	d3, d10
1035a0294:     	fmov	d4, d9
1035a0298:     	fmov	d5, d8
1035a029c:     	fmov	d6, d15
1035a02a0:     	fmov	d7, d14
1035a02a4:     	bl	0x10359f580
1035a02a8:     	stp	d0, d1, [x21, #-0x8]
1035a02ac:     	fadd	d12, d13, d12
1035a02b0:     	add	x21, x21, #0x10
1035a02b4:     	subs	x22, x22, #0x1
1035a02b8:     	b.ne	0x1035a0274
1035a02bc:     	ldp	d1, d0, [sp, #0x28]
1035a02c0:     	stp	d0, d1, [sp, #0x18]
1035a02c4:     	ldp	d1, d0, [sp, #0x38]
1035a02c8:     	stp	d0, d1, [sp, #0x8]
1035a02cc:     	ldp	d1, d0, [sp, #0x48]
1035a02d0:     	str	d1, [sp]
1035a02d4:     	ldr	d1, [sp, #0x58]
1035a02d8:     	fmov	d2, d11
1035a02dc:     	fmov	d3, d10
1035a02e0:     	fmov	d4, d9
1035a02e4:     	fmov	d5, d8
1035a02e8:     	fmov	d6, d15
1035a02ec:     	fmov	d7, d14
1035a02f0:     	bl	0x10359f580
1035a02f4:     	add	x8, x19, x20, lsl #4
1035a02f8:     	stp	d0, d1, [x8]
1035a02fc:     	add	w0, w20, #0x1
1035a0300:     	ldp	x29, x30, [sp, #0xd0]
1035a0304:     	ldp	x20, x19, [sp, #0xc0]
1035a0308:     	ldp	x22, x21, [sp, #0xb0]
1035a030c:     	ldp	x28, x27, [sp, #0xa0]
1035a0310:     	ldp	d9, d8, [sp, #0x90]
1035a0314:     	ldp	d11, d10, [sp, #0x80]
1035a0318:     	ldp	d13, d12, [sp, #0x70]
1035a031c:     	ldp	d15, d14, [sp, #0x60]
1035a0320:     	add	sp, sp, #0xe0
1035a0324:     	ret

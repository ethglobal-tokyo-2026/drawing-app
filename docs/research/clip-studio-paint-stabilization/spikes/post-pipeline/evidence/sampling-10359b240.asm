
FUNCTION 0x10359b240 size 372
10359b240:     	sub	sp, sp, #0x70
10359b244:     	stp	d11, d10, [sp, #0x10]
10359b248:     	stp	d9, d8, [sp, #0x20]
10359b24c:     	stp	x24, x23, [sp, #0x30]
10359b250:     	stp	x22, x21, [sp, #0x40]
10359b254:     	stp	x20, x19, [sp, #0x50]
10359b258:     	stp	x29, x30, [sp, #0x60]
10359b25c:     	add	x29, sp, #0x60
10359b260:     	mov	x19, x3
10359b264:     	mov	x20, x2
10359b268:     	mov	x21, x0
10359b26c:     	subs	w8, w1, #0x1
10359b270:     	b.lt	0x10359b2c4
10359b274:     	mov	x9, #0x0                ; =0
10359b278:     	mov	w22, #0x0               ; =0
10359b27c:     	ldp	d0, d1, [x20]
10359b280:     	mov	w10, w1
10359b284:     	add	x11, x21, #0x8
10359b288:     	mov	x12, #0x7fefffffffffffff ; =9218868437227405311
10359b28c:     	fmov	d2, x12
10359b290:     	ldp	d3, d4, [x11, #-0x8]
10359b294:     	fsub	d3, d3, d0
10359b298:     	fsub	d4, d4, d1
10359b29c:     	fmul	d4, d4, d4
10359b2a0:     	fmadd	d3, d3, d3, d4
10359b2a4:     	fcmp	d3, d2
10359b2a8:     	csel	w22, w9, w22, mi
10359b2ac:     	fcsel	d2, d3, d2, mi
10359b2b0:     	add	x9, x9, #0x1
10359b2b4:     	add	x11, x11, #0x10
10359b2b8:     	cmp	x10, x9
10359b2bc:     	b.ne	0x10359b290
10359b2c0:     	b	0x10359b2c8
10359b2c4:     	mov	w22, #0x0               ; =0
10359b2c8:     	ldr	q0, [x21]
10359b2cc:     	str	q0, [x19]
10359b2d0:     	scvtf	d0, w8
10359b2d4:     	fmov	d1, #1.00000000
10359b2d8:     	fdiv	d8, d1, d0
10359b2dc:     	cmp	w22, w8
10359b2e0:     	b.ge	0x10359b324
10359b2e4:     	add	x8, x21, w22, sxtw #4
10359b2e8:     	ldp	d0, d1, [x8]
10359b2ec:     	ldp	d2, d3, [x8, #0x10]
10359b2f0:     	ldp	d4, d5, [x20]
10359b2f4:     	mov	x0, x19
10359b2f8:     	bl	0x1021944a8
10359b2fc:     	ldp	d1, d2, [x19]
10359b300:     	ldp	d3, d4, [x20]
10359b304:     	fsub	d1, d1, d3
10359b308:     	fsub	d2, d2, d4
10359b30c:     	fmul	d2, d2, d2
10359b310:     	fmadd	d10, d1, d1, d2
10359b314:     	scvtf	d1, w22
10359b318:     	fadd	d0, d0, d1
10359b31c:     	fmul	d9, d8, d0
10359b320:     	b	0x10359b330
10359b324:     	movi	d9, #0000000000000000
10359b328:     	mov	x8, #0x7fefffffffffffff ; =9218868437227405311
10359b32c:     	fmov	d10, x8
10359b330:     	subs	w23, w22, #0x1
10359b334:     	b.lt	0x10359b388
10359b338:     	add	x8, x21, w23, uxtw #4
10359b33c:     	ldp	d0, d1, [x8]
10359b340:     	add	x8, x21, w22, uxtw #4
10359b344:     	ldp	d2, d3, [x8]
10359b348:     	ldp	d4, d5, [x20]
10359b34c:     	mov	x0, sp
10359b350:     	bl	0x1021944a8
10359b354:     	ldp	d1, d2, [sp]
10359b358:     	ldp	d3, d4, [x20]
10359b35c:     	fsub	d1, d1, d3
10359b360:     	fsub	d2, d2, d4
10359b364:     	fmul	d2, d2, d2
10359b368:     	fmadd	d1, d1, d1, d2
10359b36c:     	fcmp	d1, d10
10359b370:     	b.pl	0x10359b388
10359b374:     	ldr	q1, [sp]
10359b378:     	str	q1, [x19]
10359b37c:     	ucvtf	d1, w23
10359b380:     	fadd	d0, d0, d1
10359b384:     	fmul	d9, d8, d0
10359b388:     	fmov	d0, #1.00000000
10359b38c:     	fcmp	d9, d0
10359b390:     	fcsel	d0, d0, d9, gt
10359b394:     	ldp	x29, x30, [sp, #0x60]
10359b398:     	ldp	x20, x19, [sp, #0x50]
10359b39c:     	ldp	x22, x21, [sp, #0x40]
10359b3a0:     	ldp	x24, x23, [sp, #0x30]
10359b3a4:     	ldp	d9, d8, [sp, #0x20]
10359b3a8:     	ldp	d11, d10, [sp, #0x10]
10359b3ac:     	add	sp, sp, #0x70
10359b3b0:     	ret

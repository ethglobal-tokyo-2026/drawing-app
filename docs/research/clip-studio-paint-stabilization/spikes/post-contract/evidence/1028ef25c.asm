
FUNCTION 0x1028ef25c size 472
1028ef25c:     	sub	sp, sp, #0x120
1028ef260:     	stp	x22, x21, [sp, #0xf0]
1028ef264:     	stp	x20, x19, [sp, #0x100]
1028ef268:     	stp	x29, x30, [sp, #0x110]
1028ef26c:     	add	x29, sp, #0x110
1028ef270:     	ldr	w8, [x1, #0xc0]
1028ef274:     	cbnz	w8, 0x1028ef3f0
1028ef278:     	mov	x19, x0
1028ef27c:     	ldp	x9, x8, [x1]
1028ef280:     	stp	x9, x8, [sp, #0x18]
1028ef284:     	cbz	x8, 0x1028ef294
1028ef288:     	add	x8, x8, #0x8
1028ef28c:     	mov	w9, #0x1                ; =1
1028ef290:     	ldadd	w9, w8, [x8]
1028ef294:     	ldp	x9, x8, [x1, #0x10]
1028ef298:     	stp	x9, x8, [sp, #0x28]
1028ef29c:     	cbz	x8, 0x1028ef2ac
1028ef2a0:     	add	x8, x8, #0x8
1028ef2a4:     	mov	w9, #0x1                ; =1
1028ef2a8:     	ldadd	w9, w8, [x8]
1028ef2ac:     	ldp	x9, x8, [x1, #0x20]
1028ef2b0:     	stp	x9, x8, [sp, #0x38]
1028ef2b4:     	cbz	x8, 0x1028ef2c4
1028ef2b8:     	add	x8, x8, #0x8
1028ef2bc:     	mov	w9, #0x1                ; =1
1028ef2c0:     	ldadd	w9, w8, [x8]
1028ef2c4:     	ldp	x9, x8, [x1, #0x30]
1028ef2c8:     	stp	x9, x8, [sp, #0x48]
1028ef2cc:     	cbz	x8, 0x1028ef2dc
1028ef2d0:     	add	x8, x8, #0x8
1028ef2d4:     	mov	w9, #0x1                ; =1
1028ef2d8:     	ldadd	w9, w8, [x8]
1028ef2dc:     	ldp	x9, x8, [x1, #0x40]
1028ef2e0:     	stp	x9, x8, [sp, #0x58]
1028ef2e4:     	cbz	x8, 0x1028ef2f4
1028ef2e8:     	add	x8, x8, #0x8
1028ef2ec:     	mov	w9, #0x1                ; =1
1028ef2f0:     	ldadd	w9, w8, [x8]
1028ef2f4:     	add	x20, sp, #0x18
1028ef2f8:     	ldp	x9, x8, [x1, #0x50]
1028ef2fc:     	stp	x9, x8, [sp, #0x68]
1028ef300:     	cbz	x8, 0x1028ef310
1028ef304:     	add	x8, x8, #0x8
1028ef308:     	mov	w9, #0x1                ; =1
1028ef30c:     	ldadd	w9, w8, [x8]
1028ef310:     	ldp	q0, q1, [x1, #0xa0]
1028ef314:     	ldr	q2, [x1, #0xc0]
1028ef318:     	stp	q1, q2, [x20, #0xb0]
1028ef31c:     	ldp	q1, q2, [x1, #0x60]
1028ef320:     	stur	q1, [sp, #0x78]
1028ef324:     	ldp	q1, q3, [x1, #0x80]
1028ef328:     	stp	q2, q1, [x20, #0x70]
1028ef32c:     	ldr	x8, [x1, #0xd0]
1028ef330:     	str	x8, [sp, #0xe8]
1028ef334:     	ldr	w8, [x1, #0xb8]
1028ef338:     	and	w9, w8, #0xfffffffe
1028ef33c:     	stp	q3, q0, [x20, #0x90]
1028ef340:     	cmp	w9, #0x2
1028ef344:     	b.eq	0x1028ef358
1028ef348:     	cmp	w8, #0x4
1028ef34c:     	b.ne	0x1028ef3a8
1028ef350:     	ldr	w8, [x19, #0x438]
1028ef354:     	cbz	w8, 0x1028ef3a8
1028ef358:     	ldr	w8, [x19, #0x434]
1028ef35c:     	cbz	w8, 0x1028ef380
1028ef360:     	ldur	q0, [x1, #0x60]
1028ef364:     	str	q0, [sp]
1028ef368:     	ldr	d0, [x1, #0xa0]
1028ef36c:     	str	d0, [sp, #0x10]
1028ef370:     	add	x0, x19, #0x3f0
1028ef374:     	mov	x1, sp
1028ef378:     	bl	0x1028ee5d8
1028ef37c:     	b	0x1028ef3a8
1028ef380:     	mov	x8, sp
1028ef384:     	add	x0, x19, #0x3f0
1028ef388:     	bl	0x1028ee540
1028ef38c:     	ldr	x0, [sp]
1028ef390:     	ldr	d0, [sp, #0xb8]
1028ef394:     	bl	0x1024a9bb4
1028ef398:     	str	d0, [sp, #0xb8]
1028ef39c:     	mov	x8, sp
1028ef3a0:     	add	x0, x8, #0x8
1028ef3a4:     	bl	0x10001022c
1028ef3a8:     	add	x1, sp, #0x18
1028ef3ac:     	mov	x0, x19
1028ef3b0:     	bl	0x10288d8ac
1028ef3b4:     	add	x19, sp, #0x18
1028ef3b8:     	add	x21, sp, #0x18
1028ef3bc:     	add	x8, sp, #0x18
1028ef3c0:     	add	x0, x8, #0x58
1028ef3c4:     	bl	0x10001022c
1028ef3c8:     	add	x0, x21, #0x48
1028ef3cc:     	bl	0x10001022c
1028ef3d0:     	add	x0, x21, #0x38
1028ef3d4:     	bl	0x10001022c
1028ef3d8:     	add	x0, x19, #0x28
1028ef3dc:     	bl	0x10001022c
1028ef3e0:     	add	x0, x19, #0x18
1028ef3e4:     	bl	0x10001022c
1028ef3e8:     	add	x0, x20, #0x8
1028ef3ec:     	bl	0x10001022c
1028ef3f0:     	ldp	x29, x30, [sp, #0x110]
1028ef3f4:     	ldp	x20, x19, [sp, #0x100]
1028ef3f8:     	ldp	x22, x21, [sp, #0xf0]
1028ef3fc:     	add	sp, sp, #0x120
1028ef400:     	ret
1028ef404:     	mov	x19, x0
1028ef408:     	mov	x8, sp
1028ef40c:     	add	x0, x8, #0x8
1028ef410:     	bl	0x10001022c
1028ef414:     	b	0x1028ef424
1028ef418:     	b	0x1028ef420
1028ef41c:     	b	0x1028ef420
1028ef420:     	mov	x19, x0
1028ef424:     	add	x0, sp, #0x18
1028ef428:     	bl	0x1005ee6bc
1028ef42c:     	mov	x0, x19
1028ef430:     	bl	0x103bda970

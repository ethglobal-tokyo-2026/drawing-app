; CSP 5.1.4 ARM64, unslid range 0x102a8d124:0x102a8dbf0
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102a8d124:     	stp	d9, d8, [sp, #-0x70]!
102a8d128:     	stp	x28, x27, [sp, #0x10]
102a8d12c:     	stp	x26, x25, [sp, #0x20]
102a8d130:     	stp	x24, x23, [sp, #0x30]
102a8d134:     	stp	x22, x21, [sp, #0x40]
102a8d138:     	stp	x20, x19, [sp, #0x50]
102a8d13c:     	stp	x29, x30, [sp, #0x60]
102a8d140:     	add	x29, sp, #0x60
102a8d144:     	sub	sp, sp, #0x290
102a8d148:     	mov	x19, x2
102a8d14c:     	mov	x21, x1
102a8d150:     	mov	x20, x0
102a8d154:     	ldr	x8, [x0, #0x68]
102a8d158:     	cbz	x8, 0x102a8d168
102a8d15c:     	ldr	x0, [x21]
102a8d160:     	bl	0x102e15714
102a8d164:     	cbnz	w0, 0x102a8d9f4
102a8d168:     	ldr	x0, [x21]
102a8d16c:     	sub	x8, x29, #0x90
102a8d170:     	bl	0x102e1579c
102a8d174:     	ldr	x0, [x21, #0x20]
102a8d178:     	bl	0x102915430
102a8d17c:     	fmov	d8, d0
102a8d180:     	ldr	x0, [x21, #0x20]
102a8d184:     	sub	x8, x29, #0xa0
102a8d188:     	bl	0x10290e8e8
102a8d18c:     	ldur	x8, [x29, #-0x90]
102a8d190:     	cmp	x8, x20
102a8d194:     	b.eq	0x102a8d1a0
102a8d198:     	mov	w22, #0x0               ; =0
102a8d19c:     	b	0x102a8d234
102a8d1a0:     	ldur	x0, [x29, #-0xa0]
102a8d1a4:     	bl	0x102574a98
102a8d1a8:     	cbz	w0, 0x102a8d1f4
102a8d1ac:     	ldur	x0, [x29, #-0xa0]
102a8d1b0:     	mov	w1, #0x1                ; =1
102a8d1b4:     	bl	0x102573eec
102a8d1b8:     	cbz	w0, 0x102a8da18
102a8d1bc:     	ldr	x0, [x21, #0x20]
102a8d1c0:     	sub	x8, x29, #0xb0
102a8d1c4:     	add	x22, x8, #0x8
102a8d1c8:     	ldp	x9, x8, [x29, #-0xa0]
102a8d1cc:     	stp	x9, x8, [x29, #-0xb0]
102a8d1d0:     	cbz	x8, 0x102a8d1e0
102a8d1d4:     	add	x8, x8, #0x8
102a8d1d8:     	mov	w9, #0x1                ; =1
102a8d1dc:     	ldadd	w9, w8, [x8]
102a8d1e0:     	sub	x1, x29, #0xb0
102a8d1e4:     	mov	w2, #0x0                ; =0
102a8d1e8:     	bl	0x10291c06c
102a8d1ec:     	mov	x0, x22
102a8d1f0:     	bl	0x10001022c
102a8d1f4:     	ldur	x0, [x29, #-0xa0]
102a8d1f8:     	bl	0x102572c1c
102a8d1fc:     	mov	x8, x0
102a8d200:     	ldur	x0, [x29, #-0xa0]
102a8d204:     	cbz	w8, 0x102a8d214
102a8d208:     	mov	x8, sp
102a8d20c:     	bl	0x102572984
102a8d210:     	b	0x102a8d21c
102a8d214:     	mov	x8, sp
102a8d218:     	bl	0x102572968
102a8d21c:     	ldr	x0, [sp]
102a8d220:     	bl	0x10368b4e0
102a8d224:     	mov	x22, x0
102a8d228:     	mov	x8, sp
102a8d22c:     	add	x0, x8, #0x8
102a8d230:     	bl	0x10001022c
102a8d234:     	stp	xzr, xzr, [x29, #-0xd0]
102a8d238:     	ldp	x9, x8, [x21]
102a8d23c:     	stur	x9, [x29, #-0xe8]
102a8d240:     	stp	x8, xzr, [x29, #-0xe0]
102a8d244:     	cbz	x8, 0x102a8d254
102a8d248:     	add	x8, x8, #0x8
102a8d24c:     	mov	w9, #0x1                ; =1
102a8d250:     	ldadd	w9, w8, [x8]
102a8d254:     	sub	x23, x29, #0xe8
102a8d258:     	ldr	w2, [x20, #0x64]
102a8d25c:     	sub	x0, x29, #0xe8
102a8d260:     	sub	x3, x29, #0xc4
102a8d264:     	sub	x4, x29, #0xc8
102a8d268:     	sub	x5, x29, #0xcc
102a8d26c:     	sub	x6, x29, #0xd8
102a8d270:     	sub	x7, x29, #0xd0
102a8d274:     	mov	x1, x22
102a8d278:     	fmov	d0, d8
102a8d27c:     	bl	0x102a9f5cc
102a8d280:     	add	x0, x23, #0x8
102a8d284:     	bl	0x10001022c
102a8d288:     	mov	w8, #0x1                ; =1
102a8d28c:     	stur	w8, [x29, #-0xec]
102a8d290:     	ldr	x0, [x21]
102a8d294:     	sub	x2, x29, #0xec
102a8d298:     	mov	w1, #0x1450             ; =5200
102a8d29c:     	bl	0x1000cb794
102a8d2a0:     	ldur	w8, [x29, #-0xec]
102a8d2a4:     	cbnz	w8, 0x102a8d2b8
102a8d2a8:     	ldur	w9, [x29, #-0xc4]
102a8d2ac:     	orr	w9, w9, #0x2
102a8d2b0:     	stur	w9, [x29, #-0xc4]
102a8d2b4:     	stur	wzr, [x29, #-0xcc]
102a8d2b8:     	str	w8, [x20, #0xa0]
102a8d2bc:     	stp	xzr, xzr, [x29, #-0x100]
102a8d2c0:     	ldp	x9, x8, [x21]
102a8d2c4:     	stp	x9, x8, [sp, #0x1e0]
102a8d2c8:     	cbz	x8, 0x102a8d2d8
102a8d2cc:     	add	x8, x8, #0x8
102a8d2d0:     	mov	w9, #0x1                ; =1
102a8d2d4:     	ldadd	w9, w8, [x8]
102a8d2d8:     	ldp	x9, x8, [x21, #0x20]
102a8d2dc:     	stp	x9, x8, [sp, #0x1d0]
102a8d2e0:     	cbz	x8, 0x102a8d2f0
102a8d2e4:     	add	x8, x8, #0x8
102a8d2e8:     	mov	w9, #0x1                ; =1
102a8d2ec:     	ldadd	w9, w8, [x8]
102a8d2f0:     	add	x22, sp, #0x1e0
102a8d2f4:     	add	x23, sp, #0x1d0
102a8d2f8:     	add	x0, sp, #0x1e0
102a8d2fc:     	add	x1, sp, #0x1d0
102a8d300:     	add	x3, x21, #0x80
102a8d304:     	sub	x4, x29, #0xc4
102a8d308:     	sub	x5, x29, #0x100
102a8d30c:     	mov	w2, #0x1                ; =1
102a8d310:     	bl	0x102a9fb40
102a8d314:     	add	x0, x23, #0x8
102a8d318:     	bl	0x10001022c
102a8d31c:     	add	x0, x22, #0x8
102a8d320:     	bl	0x10001022c
102a8d324:     	mov	w0, #0x18               ; =24
102a8d328:     	bl	0x103bdd37c
102a8d32c:     	mov	x1, x0
102a8d330:     	stp	xzr, xzr, [x1]
102a8d334:     	str	xzr, [x1, #0x10]
102a8d338:     	add	x0, sp, #0x1c0
102a8d33c:     	bl	0x100298214
102a8d340:     	ldp	x9, x8, [x21]
102a8d344:     	stp	x9, x8, [sp, #0x1b0]
102a8d348:     	cbz	x8, 0x102a8d358
102a8d34c:     	add	x8, x8, #0x8
102a8d350:     	mov	w9, #0x1                ; =1
102a8d354:     	ldadd	w9, w8, [x8]
102a8d358:     	ldp	x9, x8, [sp, #0x1c0]
102a8d35c:     	stp	x9, x8, [sp, #0x1a0]
102a8d360:     	cbz	x8, 0x102a8d370
102a8d364:     	add	x8, x8, #0x8
102a8d368:     	mov	w9, #0x1                ; =1
102a8d36c:     	ldadd	w9, w8, [x8]
102a8d370:     	add	x22, sp, #0x1b0
102a8d374:     	add	x23, sp, #0x1a0
102a8d378:     	add	x28, sp, #0x1c0
102a8d37c:     	add	x0, sp, #0x1b0
102a8d380:     	sub	x1, x29, #0xc4
102a8d384:     	add	x2, sp, #0x1a0
102a8d388:     	bl	0x102a9f8a8
102a8d38c:     	add	x0, x23, #0x8
102a8d390:     	bl	0x10001022c
102a8d394:     	add	x0, x22, #0x8
102a8d398:     	bl	0x10001022c
102a8d39c:     	ldr	x8, [x20]
102a8d3a0:     	ldr	x8, [x8, #0x200]
102a8d3a4:     	mov	x0, x20
102a8d3a8:     	mov	x1, x21
102a8d3ac:     	mov	w2, #0x1                ; =1
102a8d3b0:     	mov	w3, #0x1                ; =1
102a8d3b4:     	blr	x8
102a8d3b8:     	ldr	w8, [x20, #0x64]
102a8d3bc:     	cbnz	w8, 0x102a8d46c
102a8d3c0:     	ldur	w8, [x29, #-0xec]
102a8d3c4:     	cbz	w8, 0x102a8d46c
102a8d3c8:     	mov	w8, #0x1                ; =1
102a8d3cc:     	str	w8, [sp, #0x170]
102a8d3d0:     	ldr	x0, [x21]
102a8d3d4:     	add	x2, sp, #0x170
102a8d3d8:     	mov	w1, #0x1f54             ; =8020
102a8d3dc:     	bl	0x1000cb794
102a8d3e0:     	ldr	w8, [sp, #0x170]
102a8d3e4:     	cbz	w8, 0x102a8d46c
102a8d3e8:     	ldp	x9, x8, [x21, #0x10]
102a8d3ec:     	stp	x9, x8, [sp, #0x190]
102a8d3f0:     	cbz	x8, 0x102a8d400
102a8d3f4:     	add	x8, x8, #0x8
102a8d3f8:     	mov	w9, #0x1                ; =1
102a8d3fc:     	ldadd	w9, w8, [x8]
102a8d400:     	ldp	x9, x8, [x21, #0x20]
102a8d404:     	stp	x9, x8, [sp, #0x180]
102a8d408:     	cbz	x8, 0x102a8d418
102a8d40c:     	add	x8, x8, #0x8
102a8d410:     	mov	w9, #0x1                ; =1
102a8d414:     	ldadd	w9, w8, [x8]
102a8d418:     	add	x22, sp, #0x190
102a8d41c:     	add	x23, sp, #0x180
102a8d420:     	sub	x24, x29, #0x80
102a8d424:     	sub	x8, x29, #0x80
102a8d428:     	add	x0, sp, #0x190
102a8d42c:     	add	x1, sp, #0x180
102a8d430:     	bl	0x102cf94b8
102a8d434:     	mov	x8, sp
102a8d438:     	ldur	q0, [x29, #-0x80]
102a8d43c:     	stp	xzr, xzr, [x29, #-0x80]
102a8d440:     	ldr	q1, [x20, #0x70]
102a8d444:     	str	q0, [x20, #0x70]
102a8d448:     	str	q1, [sp]
102a8d44c:     	orr	x0, x8, #0x8
102a8d450:     	bl	0x10001022c
102a8d454:     	orr	x0, x24, #0x8
102a8d458:     	bl	0x10001022c
102a8d45c:     	add	x0, x23, #0x8
102a8d460:     	bl	0x10001022c
102a8d464:     	add	x0, x22, #0x8
102a8d468:     	bl	0x10001022c
102a8d46c:     	stp	xzr, xzr, [x20, #0x90]
102a8d470:     	mov	x8, sp
102a8d474:     	ldr	q0, [x20, #0x80]
102a8d478:     	stp	xzr, xzr, [x20, #0x80]
102a8d47c:     	str	q0, [sp]
102a8d480:     	orr	x0, x8, #0x8
102a8d484:     	bl	0x10001022c
102a8d488:     	str	wzr, [x20, #0xa4]
102a8d48c:     	mov	w0, #0x210              ; =528
102a8d490:     	bl	0x103bdd37c
102a8d494:     	mov	x22, x0
102a8d498:     	ldur	w1, [x29, #-0xc4]
102a8d49c:     	mov	w2, #0x0                ; =0
102a8d4a0:     	bl	0x10253c3fc
102a8d4a4:     	ldr	x0, [x20, #0x68]
102a8d4a8:     	str	x22, [x20, #0x68]
102a8d4ac:     	cbz	x0, 0x102a8d4bc
102a8d4b0:     	ldr	x8, [x0]
102a8d4b4:     	ldr	x8, [x8, #0x8]
102a8d4b8:     	blr	x8
102a8d4bc:     	ldr	x0, [x21, #0x20]
102a8d4c0:     	add	x8, sp, #0x170
102a8d4c4:     	bl	0x102915c0c
102a8d4c8:     	ldr	x0, [x21, #0x20]
102a8d4cc:     	bl	0x102915f10
102a8d4d0:     	mov	x22, x0
102a8d4d4:     	ldr	x0, [x21, #0x20]
102a8d4d8:     	bl	0x102915f8c
102a8d4dc:     	mov	x23, x0
102a8d4e0:     	ldr	x0, [x21, #0x20]
102a8d4e4:     	bl	0x102960be0
102a8d4e8:     	mov	x24, x0
102a8d4ec:     	ldr	x0, [x21, #0x20]
102a8d4f0:     	add	x8, sp, #0x160
102a8d4f4:     	bl	0x1029438b8
102a8d4f8:     	ldr	x0, [x20, #0x68]
102a8d4fc:     	ldp	x9, x8, [sp, #0x170]
102a8d500:     	stp	x9, x8, [sp, #0x150]
102a8d504:     	cbz	x8, 0x102a8d514
102a8d508:     	add	x8, x8, #0x8
102a8d50c:     	mov	w9, #0x1                ; =1
102a8d510:     	ldadd	w9, w8, [x8]
102a8d514:     	ldp	x9, x8, [x29, #-0xa0]
102a8d518:     	stp	x9, x8, [sp, #0x140]
102a8d51c:     	cbz	x8, 0x102a8d52c
102a8d520:     	add	x8, x8, #0x8
102a8d524:     	mov	w9, #0x1                ; =1
102a8d528:     	ldadd	w9, w8, [x8]
102a8d52c:     	ldur	w3, [x29, #-0xc8]
102a8d530:     	ldp	x9, x8, [sp, #0x160]
102a8d534:     	stp	x9, x8, [sp, #0x130]
102a8d538:     	cbz	x8, 0x102a8d548
102a8d53c:     	add	x8, x8, #0x8
102a8d540:     	mov	w9, #0x1                ; =1
102a8d544:     	ldadd	w9, w8, [x8]
102a8d548:     	add	x25, sp, #0x150
102a8d54c:     	add	x26, sp, #0x140
102a8d550:     	add	x27, sp, #0x130
102a8d554:     	add	x1, sp, #0x150
102a8d558:     	add	x2, sp, #0x140
102a8d55c:     	add	x7, sp, #0x130
102a8d560:     	mov	x4, x22
102a8d564:     	mov	x5, x23
102a8d568:     	mov	x6, x24
102a8d56c:     	bl	0x10253c5e0
102a8d570:     	mov	x22, x0
102a8d574:     	add	x0, x27, #0x8
102a8d578:     	bl	0x10001022c
102a8d57c:     	add	x0, x26, #0x8
102a8d580:     	bl	0x10001022c
102a8d584:     	add	x0, x25, #0x8
102a8d588:     	bl	0x10001022c
102a8d58c:     	cbz	w22, 0x102a8d714
102a8d590:     	stp	xzr, xzr, [sp, #0x120]
102a8d594:     	ldur	x8, [x29, #-0x90]
102a8d598:     	ldr	w8, [x8, #0x30]
102a8d59c:     	cbz	w8, 0x102a8d5d8
102a8d5a0:     	ldr	x0, [x21, #0x20]
102a8d5a4:     	sub	x22, x29, #0x80
102a8d5a8:     	sub	x8, x29, #0x80
102a8d5ac:     	bl	0x102917f84
102a8d5b0:     	mov	x8, sp
102a8d5b4:     	ldur	q0, [x29, #-0x80]
102a8d5b8:     	stp	xzr, xzr, [x29, #-0x80]
102a8d5bc:     	ldr	q1, [sp, #0x120]
102a8d5c0:     	str	q0, [sp, #0x120]
102a8d5c4:     	str	q1, [sp]
102a8d5c8:     	orr	x0, x8, #0x8
102a8d5cc:     	bl	0x10001022c
102a8d5d0:     	orr	x0, x22, #0x8
102a8d5d4:     	bl	0x10001022c
102a8d5d8:     	ldr	x0, [x20, #0x68]
102a8d5dc:     	sub	x1, x29, #0x100
102a8d5e0:     	bl	0x102544380
102a8d5e4:     	ldr	x0, [x20, #0x68]
102a8d5e8:     	ldp	x9, x8, [sp, #0x1c0]
102a8d5ec:     	stp	x9, x8, [sp, #0x110]
102a8d5f0:     	cbz	x8, 0x102a8d600
102a8d5f4:     	add	x8, x8, #0x8
102a8d5f8:     	mov	w9, #0x1                ; =1
102a8d5fc:     	ldadd	w9, w8, [x8]
102a8d600:     	add	x22, sp, #0x110
102a8d604:     	add	x1, sp, #0x110
102a8d608:     	bl	0x10254402c
102a8d60c:     	add	x0, x22, #0x8
102a8d610:     	bl	0x10001022c
102a8d614:     	ldr	x0, [x20, #0x68]
102a8d618:     	ldp	w2, w1, [x29, #-0xd0]
102a8d61c:     	ldur	d0, [x29, #-0xd8]
102a8d620:     	ldp	x9, x8, [sp, #0x120]
102a8d624:     	stp	x9, x8, [sp, #0x100]
102a8d628:     	cbz	x8, 0x102a8d638
102a8d62c:     	add	x8, x8, #0x8
102a8d630:     	mov	w9, #0x1                ; =1
102a8d634:     	ldadd	w9, w8, [x8]
102a8d638:     	add	x23, sp, #0x100
102a8d63c:     	add	x3, sp, #0x100
102a8d640:     	bl	0x10253cbcc
102a8d644:     	mov	x22, x0
102a8d648:     	add	x0, x23, #0x8
102a8d64c:     	bl	0x10001022c
102a8d650:     	cbz	w22, 0x102a8d730
102a8d654:     	str	wzr, [sp, #0xfc]
102a8d658:     	ldr	x0, [x21]
102a8d65c:     	add	x2, sp, #0xfc
102a8d660:     	mov	w1, #0x13ba             ; =5050
102a8d664:     	bl	0x1000cb794
102a8d668:     	ldr	w8, [sp, #0xfc]
102a8d66c:     	adrp	x24, 0x1042e3000
102a8d670:     	adrp	x26, 0x1042fe000
102a8d674:     	cbz	w8, 0x102a8d6f0
102a8d678:     	mov	x22, sp
102a8d67c:     	mov	x0, sp
102a8d680:     	bl	0x102218f64
102a8d684:     	orr	x0, x22, #0x4
102a8d688:     	bl	0x102218f64
102a8d68c:     	mov	x8, sp
102a8d690:     	add	x0, x8, #0x8
102a8d694:     	bl	0x102218f64
102a8d698:     	ldr	x0, [x21]
102a8d69c:     	mov	x2, sp
102a8d6a0:     	mov	w1, #0x13bb             ; =5051
102a8d6a4:     	bl	0x102a8dbf0
102a8d6a8:     	cbz	w0, 0x102a8d6f0
102a8d6ac:     	ldp	d0, d1, [x21, #0x80]
102a8d6b0:     	fcmp	d0, #0.0
102a8d6b4:     	ldr	d2, [x24, #0x690]
102a8d6b8:     	ldr	d3, [x26, #0xd20]
102a8d6bc:     	fcsel	d4, d3, d2, mi
102a8d6c0:     	fadd	d0, d0, d4
102a8d6c4:     	fcvtzs	w8, d0
102a8d6c8:     	fcmp	d1, #0.0
102a8d6cc:     	fcsel	d0, d3, d2, mi
102a8d6d0:     	fadd	d0, d1, d0
102a8d6d4:     	fcvtzs	w9, d0
102a8d6d8:     	orr	x1, x8, x9, lsl #32
102a8d6dc:     	ldr	x0, [x20, #0x68]
102a8d6e0:     	ldr	x2, [sp]
102a8d6e4:     	ldr	w3, [sp, #0x8]
102a8d6e8:     	bl	0x102544034
102a8d6ec:     	cbz	w0, 0x102a8d730
102a8d6f0:     	stp	xzr, xzr, [sp, #0xe8]
102a8d6f4:     	mov	w27, #0x1               ; =1
102a8d6f8:     	ldr	x0, [x20, #0x70]
102a8d6fc:     	cbz	x0, 0x102a8d74c
102a8d700:     	bl	0x102cf9820
102a8d704:     	mov	x22, x0
102a8d708:     	cmp	w0, #0x1
102a8d70c:     	b.ge	0x102a8d750
102a8d710:     	b	0x102a8d878
102a8d714:     	ldr	x0, [x20, #0x68]
102a8d718:     	str	xzr, [x20, #0x68]
102a8d71c:     	cbz	x0, 0x102a8d9bc
102a8d720:     	ldr	x8, [x0]
102a8d724:     	ldr	x8, [x8, #0x8]
102a8d728:     	blr	x8
102a8d72c:     	b	0x102a8d9bc
102a8d730:     	ldr	x0, [x20, #0x68]
102a8d734:     	str	xzr, [x20, #0x68]
102a8d738:     	cbz	x0, 0x102a8d9b0
102a8d73c:     	ldr	x8, [x0]
102a8d740:     	ldr	x8, [x8, #0x8]
102a8d744:     	blr	x8
102a8d748:     	b	0x102a8d9b0
102a8d74c:     	mov	w22, #0x1               ; =1
102a8d750:     	mov	w23, #0x0               ; =0
102a8d754:     	add	x28, sp, #0xc8
102a8d758:     	mov	x25, sp
102a8d75c:     	ldr	d8, [x24, #0x690]
102a8d760:     	ldr	d9, [x26, #0xd20]
102a8d764:     	ldur	q0, [x21, #0x80]
102a8d768:     	stur	q0, [x29, #-0x80]
102a8d76c:     	ldr	x0, [x20, #0x70]
102a8d770:     	cbz	x0, 0x102a8d780
102a8d774:     	sub	x1, x29, #0x80
102a8d778:     	mov	x2, x23
102a8d77c:     	bl	0x102cf9834
102a8d780:     	ldp	d0, d1, [x29, #-0x80]
102a8d784:     	fcmp	d0, #0.0
102a8d788:     	fcsel	d2, d9, d8, mi
102a8d78c:     	fadd	d0, d0, d2
102a8d790:     	fcvtzs	w8, d0
102a8d794:     	fcmp	d1, #0.0
102a8d798:     	fcsel	d0, d9, d8, mi
102a8d79c:     	fadd	d0, d1, d0
102a8d7a0:     	fcvtzs	w9, d0
102a8d7a4:     	orr	x24, x8, x9, lsl #32
102a8d7a8:     	mov	x0, x20
102a8d7ac:     	mov	x1, x21
102a8d7b0:     	mov	x2, x24
102a8d7b4:     	bl	0x102a8de34
102a8d7b8:     	cbz	w0, 0x102a8d858
102a8d7bc:     	stp	xzr, xzr, [sp, #0xd8]
102a8d7c0:     	ldr	x0, [x20, #0x68]
102a8d7c4:     	add	x8, sp, #0xc8
102a8d7c8:     	add	x2, sp, #0xd8
102a8d7cc:     	mov	x1, x24
102a8d7d0:     	bl	0x10253d048
102a8d7d4:     	ldr	x0, [x20, #0x68]
102a8d7d8:     	bl	0x10253c5b4
102a8d7dc:     	cbnz	w0, 0x102a8d868
102a8d7e0:     	ldr	x8, [sp, #0xc8]
102a8d7e4:     	cbz	x8, 0x102a8d850
102a8d7e8:     	add	x0, sp, #0xe8
102a8d7ec:     	add	x1, sp, #0xd8
102a8d7f0:     	bl	0x10221b5e4
102a8d7f4:     	ldr	x0, [x20, #0x80]
102a8d7f8:     	cbz	x0, 0x102a8d820
102a8d7fc:     	ldp	w1, w2, [sp, #0xd8]
102a8d800:     	ldp	w8, w9, [sp, #0xe0]
102a8d804:     	sub	w3, w8, w1
102a8d808:     	sub	w4, w9, w2
102a8d80c:     	ldr	x5, [sp, #0xc8]
102a8d810:     	mov	x6, x1
102a8d814:     	mov	x7, x2
102a8d818:     	bl	0x1036a7470
102a8d81c:     	b	0x102a8d850
102a8d820:     	ldp	x9, x8, [sp, #0xc8]
102a8d824:     	cbz	x8, 0x102a8d838
102a8d828:     	add	x10, x8, #0x8
102a8d82c:     	ldadd	w27, w10, [x10]
102a8d830:     	ldr	x10, [x20, #0x80]
102a8d834:     	b	0x102a8d83c
102a8d838:     	mov	x10, #0x0               ; =0
102a8d83c:     	ldr	x11, [x20, #0x88]
102a8d840:     	stp	x9, x8, [x20, #0x80]
102a8d844:     	stp	x10, x11, [sp]
102a8d848:     	add	x0, x25, #0x8
102a8d84c:     	bl	0x10001022c
102a8d850:     	add	x0, x28, #0x8
102a8d854:     	bl	0x10001022c
102a8d858:     	add	w23, w23, #0x1
102a8d85c:     	cmp	w22, w23
102a8d860:     	b.ne	0x102a8d764
102a8d864:     	b	0x102a8d878
102a8d868:     	mov	w8, #0x1                ; =1
102a8d86c:     	str	w8, [x20, #0xa4]
102a8d870:     	add	x0, x28, #0x8
102a8d874:     	bl	0x10001022c
102a8d878:     	movi.2d	v0, #0000000000000000
102a8d87c:     	stp	q0, q0, [sp, #0xa0]
102a8d880:     	stp	q0, q0, [sp, #0x80]
102a8d884:     	stp	q0, q0, [sp, #0x60]
102a8d888:     	stp	q0, q0, [sp, #0x40]
102a8d88c:     	stp	q0, q0, [sp, #0x20]
102a8d890:     	str	q0, [sp, #0x10]
102a8d894:     	ldp	x9, x8, [x21]
102a8d898:     	cbz	x8, 0x102a8d8a8
102a8d89c:     	add	x10, x8, #0x8
102a8d8a0:     	mov	w11, #0x1               ; =1
102a8d8a4:     	ldadd	w11, w10, [x10]
102a8d8a8:     	sub	x22, x29, #0x80
102a8d8ac:     	stp	x9, x8, [sp]
102a8d8b0:     	stp	xzr, xzr, [x29, #-0x80]
102a8d8b4:     	orr	x0, x22, #0x8
102a8d8b8:     	bl	0x10001022c
102a8d8bc:     	ldp	x9, x8, [x21, #0x10]
102a8d8c0:     	cbz	x8, 0x102a8d8d0
102a8d8c4:     	add	x10, x8, #0x8
102a8d8c8:     	mov	w11, #0x1               ; =1
102a8d8cc:     	ldadd	w11, w10, [x10]
102a8d8d0:     	stp	x9, x8, [sp, #0x10]
102a8d8d4:     	stp	xzr, xzr, [x29, #-0x80]
102a8d8d8:     	orr	x0, x22, #0x8
102a8d8dc:     	bl	0x10001022c
102a8d8e0:     	ldp	x9, x8, [x21, #0x20]
102a8d8e4:     	add	x28, sp, #0x1c0
102a8d8e8:     	cbz	x8, 0x102a8d8f8
102a8d8ec:     	add	x10, x8, #0x8
102a8d8f0:     	mov	w11, #0x1               ; =1
102a8d8f4:     	ldadd	w11, w10, [x10]
102a8d8f8:     	sub	x23, x29, #0x80
102a8d8fc:     	mov	x22, sp
102a8d900:     	stp	x9, x8, [sp, #0x20]
102a8d904:     	stp	xzr, xzr, [x29, #-0x80]
102a8d908:     	orr	x0, x23, #0x8
102a8d90c:     	bl	0x10001022c
102a8d910:     	ldur	q0, [x21, #0x80]
102a8d914:     	mov	w8, #0x1                ; =1
102a8d918:     	str	w8, [sp, #0x70]
102a8d91c:     	ldur	q1, [sp, #0xe8]
102a8d920:     	stp	q1, q0, [sp, #0x50]
102a8d924:     	ldp	x10, x9, [x20, #0x80]
102a8d928:     	cbz	x9, 0x102a8d934
102a8d92c:     	add	x11, x9, #0x8
102a8d930:     	ldadd	w8, w8, [x11]
102a8d934:     	stp	x10, x9, [sp, #0x40]
102a8d938:     	stp	xzr, xzr, [x29, #-0x80]
102a8d93c:     	orr	x0, x23, #0x8
102a8d940:     	bl	0x10001022c
102a8d944:     	ldur	x0, [x29, #-0x90]
102a8d948:     	ldr	x8, [x0]
102a8d94c:     	ldr	x8, [x8, #0xe0]
102a8d950:     	mov	x1, sp
102a8d954:     	blr	x8
102a8d958:     	mov	x20, sp
102a8d95c:     	mov	w8, #0x1                ; =1
102a8d960:     	str	w8, [x19]
102a8d964:     	mov	x19, sp
102a8d968:     	add	x0, x19, #0xb8
102a8d96c:     	bl	0x10001022c
102a8d970:     	add	x0, x19, #0x98
102a8d974:     	bl	0x10001022c
102a8d978:     	ldr	x0, [sp, #0x78]
102a8d97c:     	cbz	x0, 0x102a8d988
102a8d980:     	str	x0, [sp, #0x80]
102a8d984:     	bl	0x103bdd34c
102a8d988:     	add	x0, x22, #0x48
102a8d98c:     	bl	0x10001022c
102a8d990:     	add	x0, x19, #0x38
102a8d994:     	bl	0x10001022c
102a8d998:     	add	x0, x22, #0x28
102a8d99c:     	bl	0x10001022c
102a8d9a0:     	add	x0, x20, #0x18
102a8d9a4:     	bl	0x10001022c
102a8d9a8:     	add	x0, x20, #0x8
102a8d9ac:     	bl	0x10001022c
102a8d9b0:     	add	x8, sp, #0x120
102a8d9b4:     	orr	x0, x8, #0x8
102a8d9b8:     	bl	0x10001022c
102a8d9bc:     	add	x19, sp, #0x170
102a8d9c0:     	sub	x20, x29, #0xa0
102a8d9c4:     	add	x8, sp, #0x160
102a8d9c8:     	add	x0, x8, #0x8
102a8d9cc:     	bl	0x10001022c
102a8d9d0:     	add	x0, x19, #0x8
102a8d9d4:     	bl	0x10001022c
102a8d9d8:     	add	x0, x28, #0x8
102a8d9dc:     	bl	0x10001022c
102a8d9e0:     	add	x0, x20, #0x8
102a8d9e4:     	bl	0x10001022c
102a8d9e8:     	sub	x8, x29, #0x90
102a8d9ec:     	add	x0, x8, #0x8
102a8d9f0:     	bl	0x10001022c
102a8d9f4:     	add	sp, sp, #0x290
102a8d9f8:     	ldp	x29, x30, [sp, #0x60]
102a8d9fc:     	ldp	x20, x19, [sp, #0x50]
102a8da00:     	ldp	x22, x21, [sp, #0x40]
102a8da04:     	ldp	x24, x23, [sp, #0x30]
102a8da08:     	ldp	x26, x25, [sp, #0x20]
102a8da0c:     	ldp	x28, x27, [sp, #0x10]
102a8da10:     	ldp	d9, d8, [sp], #0x70
102a8da14:     	ret
102a8da18:     	ldur	x0, [x29, #-0xa0]
102a8da1c:     	mov	w1, #0x2                ; =2
102a8da20:     	bl	0x102573eec
102a8da24:     	cbz	w0, 0x102a8d1f4
102a8da28:     	ldur	x0, [x29, #-0xa0]
102a8da2c:     	mov	x22, sp
102a8da30:     	mov	x8, sp
102a8da34:     	bl	0x102572984
102a8da38:     	ldr	x23, [sp]
102a8da3c:     	add	x0, x22, #0x8
102a8da40:     	bl	0x10001022c
102a8da44:     	cbz	x23, 0x102a8d1f4
102a8da48:     	ldr	x0, [x21, #0x20]
102a8da4c:     	sub	x8, x29, #0xc0
102a8da50:     	add	x22, x8, #0x8
102a8da54:     	ldp	x9, x8, [x29, #-0xa0]
102a8da58:     	stp	x9, x8, [x29, #-0xc0]
102a8da5c:     	cbz	x8, 0x102a8da6c
102a8da60:     	add	x8, x8, #0x8
102a8da64:     	mov	w9, #0x1                ; =1
102a8da68:     	ldadd	w9, w8, [x8]
102a8da6c:     	sub	x1, x29, #0xc0
102a8da70:     	mov	w2, #0x1                ; =1
102a8da74:     	bl	0x10291c06c
102a8da78:     	b	0x102a8d1ec
102a8da7c:     	b	0x102a8da84
102a8da80:     	b	0x102a8db7c
102a8da84:     	mov	x19, x0
102a8da88:     	mov	x0, x22
102a8da8c:     	b	0x102a8dbcc
102a8da90:     	b	0x102a8db8c
102a8da94:     	b	0x102a8db8c
102a8da98:     	b	0x102a8db30
102a8da9c:     	mov	x19, x0
102a8daa0:     	mov	x0, sp
102a8daa4:     	bl	0x102893270
102a8daa8:     	b	0x102a8dba0
102a8daac:     	mov	x19, x0
102a8dab0:     	mov	x8, sp
102a8dab4:     	b	0x102a8dbc8
102a8dab8:     	b	0x102a8db8c
102a8dabc:     	b	0x102a8db8c
102a8dac0:     	b	0x102a8db74
102a8dac4:     	mov	x19, x0
102a8dac8:     	add	x0, x23, #0x8
102a8dacc:     	b	0x102a8db9c
102a8dad0:     	mov	x19, x0
102a8dad4:     	add	x0, x22, #0x8
102a8dad8:     	b	0x102a8db9c
102a8dadc:     	b	0x102a8db8c
102a8dae0:     	b	0x102a8db7c
102a8dae4:     	b	0x102a8db7c
102a8dae8:     	b	0x102a8db8c
102a8daec:     	mov	x19, x0
102a8daf0:     	add	x0, x27, #0x8
102a8daf4:     	bl	0x10001022c
102a8daf8:     	add	x0, x26, #0x8
102a8dafc:     	bl	0x10001022c
102a8db00:     	add	x0, x25, #0x8
102a8db04:     	b	0x102a8dba8
102a8db08:     	b	0x102a8db14
102a8db0c:     	b	0x102a8db14
102a8db10:     	b	0x102a8db14
102a8db14:     	mov	x19, x0
102a8db18:     	b	0x102a8dbb8
102a8db1c:     	b	0x102a8db74
102a8db20:     	mov	x19, x0
102a8db24:     	mov	x0, x22
102a8db28:     	bl	0x103bdd34c
102a8db2c:     	b	0x102a8dbc4
102a8db30:     	mov	x19, x0
102a8db34:     	add	x0, x23, #0x8
102a8db38:     	bl	0x10001022c
102a8db3c:     	add	x0, x22, #0x8
102a8db40:     	b	0x102a8dbc0
102a8db44:     	mov	x19, x0
102a8db48:     	add	x0, x23, #0x8
102a8db4c:     	bl	0x10001022c
102a8db50:     	add	x0, x22, #0x8
102a8db54:     	b	0x102a8dbcc
102a8db58:     	b	0x102a8db7c
102a8db5c:     	mov	x19, x0
102a8db60:     	add	x0, x23, #0x8
102a8db64:     	b	0x102a8dbcc
102a8db68:     	b	0x102a8db6c
102a8db6c:     	mov	x19, x0
102a8db70:     	b	0x102a8dbdc
102a8db74:     	mov	x19, x0
102a8db78:     	b	0x102a8dbc4
102a8db7c:     	mov	x19, x0
102a8db80:     	b	0x102a8dbd0
102a8db84:     	b	0x102a8db8c
102a8db88:     	b	0x102a8db8c
102a8db8c:     	mov	x19, x0
102a8db90:     	b	0x102a8dba0
102a8db94:     	mov	x19, x0
102a8db98:     	add	x0, x28, #0x8
102a8db9c:     	bl	0x10001022c
102a8dba0:     	add	x8, sp, #0x120
102a8dba4:     	orr	x0, x8, #0x8
102a8dba8:     	bl	0x10001022c
102a8dbac:     	add	x8, sp, #0x160
102a8dbb0:     	add	x0, x8, #0x8
102a8dbb4:     	bl	0x10001022c
102a8dbb8:     	add	x8, sp, #0x170
102a8dbbc:     	add	x0, x8, #0x8
102a8dbc0:     	bl	0x10001022c
102a8dbc4:     	add	x8, sp, #0x1c0
102a8dbc8:     	add	x0, x8, #0x8
102a8dbcc:     	bl	0x10001022c
102a8dbd0:     	sub	x8, x29, #0xa0
102a8dbd4:     	add	x0, x8, #0x8
102a8dbd8:     	bl	0x10001022c
102a8dbdc:     	sub	x8, x29, #0x90
102a8dbe0:     	add	x0, x8, #0x8
102a8dbe4:     	bl	0x10001022c
102a8dbe8:     	mov	x0, x19
102a8dbec:     	bl	0x103bda970

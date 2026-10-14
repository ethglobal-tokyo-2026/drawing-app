; CSP 5.1.4 ARM64, unslid range 0x10253d250:0x10253d3b0
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
10253d250:     	sub	sp, sp, #0x60
10253d254:     	stp	x22, x21, [sp, #0x30]
10253d258:     	stp	x20, x19, [sp, #0x40]
10253d25c:     	stp	x29, x30, [sp, #0x50]
10253d260:     	add	x29, sp, #0x50
10253d264:     	mov	x19, x2
10253d268:     	mov	x21, x1
10253d26c:     	mov	x20, x0
10253d270:     	ldr	x0, [x0, #0x190]
10253d274:     	bl	0x10208ffd0
10253d278:     	mov	x0, x20
10253d27c:     	mov	w1, #0x4                ; =4
10253d280:     	bl	0x10253f55c
10253d284:     	ldr	q0, [x20, #0x140]
10253d288:     	str	q0, [sp, #0x20]
10253d28c:     	ldr	w8, [x20, #0x1d0]
10253d290:     	neg	w1, w8
10253d294:     	ldr	w8, [x20, #0x1d4]
10253d298:     	neg	w2, w8
10253d29c:     	add	x0, sp, #0x20
10253d2a0:     	bl	0x10221b4d4
10253d2a4:     	ldr	w8, [x20, #0xa0]
10253d2a8:     	tbnz	w8, #0x1, 0x10253d2d0
10253d2ac:     	ldr	w9, [x20, #0x16c]
10253d2b0:     	cbz	w9, 0x10253d2ec
10253d2b4:     	and	w2, w8, #0x400
10253d2b8:     	mov	x0, x20
10253d2bc:     	mov	x1, x21
10253d2c0:     	mov	x3, x19
10253d2c4:     	bl	0x10253f5e4
10253d2c8:     	cbnz	w0, 0x10253d328
10253d2cc:     	b	0x10253d39c
10253d2d0:     	mov	x0, x20
10253d2d4:     	mov	w1, #0x1                ; =1
10253d2d8:     	mov	x2, x21
10253d2dc:     	mov	x3, x19
10253d2e0:     	bl	0x10253f454
10253d2e4:     	cbnz	w0, 0x10253d328
10253d2e8:     	b	0x10253d39c
10253d2ec:     	str	wzr, [sp, #0x1c]
10253d2f0:     	ldr	x1, [x20, #0x190]
10253d2f4:     	ldr	x2, [x20, #0x1a0]
10253d2f8:     	add	x8, sp, #0x1c
10253d2fc:     	stp	x19, x8, [sp, #0x8]
10253d300:     	add	x8, sp, #0x20
10253d304:     	str	x8, [sp]
10253d308:     	mov	x0, x20
10253d30c:     	mov	x3, x21
10253d310:     	mov	w4, #0x1                ; =1
10253d314:     	mov	w5, #0x1                ; =1
10253d318:     	mov	w6, #0x1                ; =1
10253d31c:     	mov	w7, #0x0                ; =0
10253d320:     	bl	0x10253d98c
10253d324:     	cbz	w0, 0x10253d39c
10253d328:     	mov	x0, x20
10253d32c:     	bl	0x10253d750
10253d330:     	cbz	w0, 0x10253d33c
10253d334:     	mov	w0, #0x0                ; =0
10253d338:     	b	0x10253d39c
10253d33c:     	ldr	w8, [x20, #0xa0]
10253d340:     	tbz	w8, #0x14, 0x10253d360
10253d344:     	ldr	x9, [x20, #0xf0]
10253d348:     	cbz	x9, 0x10253d360
10253d34c:     	mov	x0, x20
10253d350:     	mov	x1, x19
10253d354:     	bl	0x10253ff10
10253d358:     	cbz	w0, 0x10253d39c
10253d35c:     	ldr	w8, [x20, #0xa0]
10253d360:     	ldr	w9, [x20, #0x174]
10253d364:     	cbz	w9, 0x10253d384
10253d368:     	and	w2, w8, #0x10000
10253d36c:     	add	x3, sp, #0x20
10253d370:     	mov	x0, x20
10253d374:     	mov	x1, x19
10253d378:     	bl	0x10253e284
10253d37c:     	cbz	w0, 0x10253d39c
10253d380:     	ldr	w8, [x20, #0xa0]
10253d384:     	tbz	w8, #0x12, 0x10253d398
10253d388:     	mov	x0, x20
10253d38c:     	mov	x1, x19
10253d390:     	bl	0x10253ff7c
10253d394:     	cbz	w0, 0x10253d39c
10253d398:     	mov	w0, #0x1                ; =1
10253d39c:     	ldp	x29, x30, [sp, #0x50]
10253d3a0:     	ldp	x20, x19, [sp, #0x40]
10253d3a4:     	ldp	x22, x21, [sp, #0x30]
10253d3a8:     	add	sp, sp, #0x60
10253d3ac:     	ret

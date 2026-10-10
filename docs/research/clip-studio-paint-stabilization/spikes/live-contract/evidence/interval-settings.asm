
FUNCTION 0x1005e9444 size 392
1005e9444:     	sub	sp, sp, #0x60
1005e9448:     	stp	x20, x19, [sp, #0x40]
1005e944c:     	stp	x29, x30, [sp, #0x50]
1005e9450:     	add	x29, sp, #0x50
1005e9454:     	adrp	x0, 0x104d13000
1005e9458:     	add	x0, x0, #0x2c8
1005e945c:     	bl	0x10214de74
1005e9460:     	adrp	x1, 0x104d27000
1005e9464:     	add	x1, x1, #0xe48
1005e9468:     	sub	x20, x29, #0x20
1005e946c:     	sub	x8, x29, #0x20
1005e9470:     	bl	0x1032f6944
1005e9474:     	ldur	x19, [x29, #-0x20]
1005e9478:     	cbz	x19, 0x1005e94e4
1005e947c:     	stur	wzr, [x29, #-0x24]
1005e9480:     	sub	x8, x29, #0x24
1005e9484:     	str	x8, [sp, #0x8]
1005e9488:     	add	x0, sp, #0x18
1005e948c:     	add	x1, sp, #0x8
1005e9490:     	bl	0x10366ec8c
1005e9494:     	adrp	x1, 0x104d28000
1005e9498:     	add	x1, x1, #0x3b8
1005e949c:     	adrp	x2, 0x104d28000
1005e94a0:     	add	x2, x2, #0x598
1005e94a4:     	add	x3, sp, #0x18
1005e94a8:     	mov	x0, x19
1005e94ac:     	bl	0x1032f7918
1005e94b0:     	mov	x19, x0
1005e94b4:     	ldr	x0, [sp, #0x20]
1005e94b8:     	cbz	x0, 0x1005e94c8
1005e94bc:     	ldr	x8, [x0]
1005e94c0:     	ldr	x8, [x8, #0x8]
1005e94c4:     	blr	x8
1005e94c8:     	cbz	w19, 0x1005e94fc
1005e94cc:     	ldur	w19, [x29, #-0x24]
1005e94d0:     	bl	0x1020be49c
1005e94d4:     	cmp	w19, w0
1005e94d8:     	b.eq	0x1005e94e4
1005e94dc:     	ldur	w0, [x29, #-0x24]
1005e94e0:     	bl	0x1020be418
1005e94e4:     	add	x0, x20, #0x8
1005e94e8:     	bl	0x10001022c
1005e94ec:     	ldp	x29, x30, [sp, #0x50]
1005e94f0:     	ldp	x20, x19, [sp, #0x40]
1005e94f4:     	add	sp, sp, #0x60
1005e94f8:     	ret
1005e94fc:     	bl	0x102194e64
1005e9500:     	cmp	w0, #0x2
1005e9504:     	b.ne	0x1005e9550
1005e9508:     	stp	xzr, xzr, [sp, #0x8]
1005e950c:     	add	x0, sp, #0x8
1005e9510:     	bl	0x102194e68
1005e9514:     	ldr	w8, [sp, #0x8]
1005e9518:     	cmp	w8, #0xa
1005e951c:     	b.gt	0x1005e9530
1005e9520:     	b.ne	0x1005e94e4
1005e9524:     	ldr	w8, [sp, #0xc]
1005e9528:     	cmp	w8, #0xb
1005e952c:     	b.lt	0x1005e94e4
1005e9530:     	mov	w8, #0x1                ; =1
1005e9534:     	stur	w8, [x29, #-0x24]
1005e9538:     	bl	0x1020be49c
1005e953c:     	cmp	w0, #0x1
1005e9540:     	b.eq	0x1005e94e4
1005e9544:     	ldur	w0, [x29, #-0x24]
1005e9548:     	bl	0x1020be418
1005e954c:     	b	0x1005e94e4
1005e9550:     	bl	0x102194e64
1005e9554:     	cmp	w0, #0x3
1005e9558:     	b.ne	0x1005e9574
1005e955c:     	mov	w8, #0x1                ; =1
1005e9560:     	stur	w8, [x29, #-0x24]
1005e9564:     	bl	0x1020be49c
1005e9568:     	cmp	w0, #0x1
1005e956c:     	b.ne	0x1005e94dc
1005e9570:     	b	0x1005e94e4
1005e9574:     	bl	0x102194e64
1005e9578:     	cmp	w0, #0x1
1005e957c:     	b.ne	0x1005e94e4
1005e9580:     	stur	wzr, [x29, #-0x24]
1005e9584:     	bl	0x1020be49c
1005e9588:     	cbnz	w0, 0x1005e94dc
1005e958c:     	b	0x1005e94e4
1005e9590:     	b	0x1005e95b4
1005e9594:     	mov	x19, x0
1005e9598:     	ldr	x0, [sp, #0x20]
1005e959c:     	cbz	x0, 0x1005e95b8
1005e95a0:     	ldr	x8, [x0]
1005e95a4:     	ldr	x8, [x8, #0x8]
1005e95a8:     	blr	x8
1005e95ac:     	b	0x1005e95b8
1005e95b0:     	b	0x1005e95b4
1005e95b4:     	mov	x19, x0
1005e95b8:     	sub	x8, x29, #0x20
1005e95bc:     	add	x0, x8, #0x8
1005e95c0:     	bl	0x10001022c
1005e95c4:     	mov	x0, x19
1005e95c8:     	bl	0x103bda970


FUNCTION 0x1028ec548 size 636
1028ec548:     	sub	sp, sp, #0xc0
1028ec54c:     	stp	d9, d8, [sp, #0x70]
1028ec550:     	stp	x24, x23, [sp, #0x80]
1028ec554:     	stp	x22, x21, [sp, #0x90]
1028ec558:     	stp	x20, x19, [sp, #0xa0]
1028ec55c:     	stp	x29, x30, [sp, #0xb0]
1028ec560:     	add	x29, sp, #0xb0
1028ec564:     	mov	x19, x2
1028ec568:     	fmov	d8, d0
1028ec56c:     	mov	x21, x1
1028ec570:     	mov	x20, x0
1028ec574:     	ldp	q0, q1, [x1, #0x20]
1028ec578:     	stp	q0, q1, [sp, #0x30]
1028ec57c:     	ldr	q0, [x1, #0x40]
1028ec580:     	str	q0, [sp, #0x50]
1028ec584:     	ldr	x8, [x1, #0x50]
1028ec588:     	str	x8, [sp, #0x60]
1028ec58c:     	ldp	q0, q1, [x1]
1028ec590:     	stp	q0, q1, [sp, #0x10]
1028ec594:     	ldr	w8, [x0, #0x158]
1028ec598:     	cbz	w8, 0x1028ec680
1028ec59c:     	ldr	x0, [x20, #0x18]
1028ec5a0:     	bl	0x102781770
1028ec5a4:     	add	x1, sp, #0x10
1028ec5a8:     	bl	0x10276b190
1028ec5ac:     	ldp	q0, q1, [sp, #0x30]
1028ec5b0:     	stur	q0, [x20, #0x88]
1028ec5b4:     	stur	q1, [x20, #0x98]
1028ec5b8:     	ldr	q0, [sp, #0x50]
1028ec5bc:     	stur	q0, [x20, #0xa8]
1028ec5c0:     	ldr	x8, [sp, #0x60]
1028ec5c4:     	str	x8, [x20, #0xb8]
1028ec5c8:     	ldp	q0, q1, [sp, #0x10]
1028ec5cc:     	stur	q0, [x20, #0x68]
1028ec5d0:     	stur	q1, [x20, #0x78]
1028ec5d4:     	str	wzr, [x20, #0x158]
1028ec5d8:     	ldr	x0, [x20, #0x18]
1028ec5dc:     	bl	0x1027819bc
1028ec5e0:     	ldur	q0, [x20, #0x88]
1028ec5e4:     	ldur	q1, [x20, #0x98]
1028ec5e8:     	stp	q0, q1, [x20, #0xe0]
1028ec5ec:     	ldur	q0, [x20, #0xa8]
1028ec5f0:     	str	q0, [x20, #0x100]
1028ec5f4:     	ldur	q0, [x20, #0x68]
1028ec5f8:     	ldur	q1, [x20, #0x78]
1028ec5fc:     	stp	q0, q1, [x20, #0xc0]
1028ec600:     	ldp	q0, q1, [sp, #0x30]
1028ec604:     	stur	q0, [x20, #0x88]
1028ec608:     	stur	q1, [x20, #0x98]
1028ec60c:     	ldr	q0, [sp, #0x50]
1028ec610:     	stur	q0, [x20, #0xa8]
1028ec614:     	ldp	q0, q1, [sp, #0x10]
1028ec618:     	stur	q0, [x20, #0x68]
1028ec61c:     	ldr	x8, [x20, #0xb8]
1028ec620:     	str	x8, [x20, #0x110]
1028ec624:     	ldr	x8, [sp, #0x60]
1028ec628:     	str	x8, [x20, #0xb8]
1028ec62c:     	stur	q1, [x20, #0x78]
1028ec630:     	ldr	w8, [x21, #0x50]
1028ec634:     	and	w8, w8, #0x10
1028ec638:     	str	w8, [x20, #0x13c]
1028ec63c:     	ldr	x0, [x20, #0x8]
1028ec640:     	ldr	x1, [x20, #0x18]
1028ec644:     	add	x2, x20, #0x28
1028ec648:     	add	x3, x20, #0x48
1028ec64c:     	mov	w4, #0x0                ; =0
1028ec650:     	bl	0x1024a1f04
1028ec654:     	stp	x0, x1, [sp]
1028ec658:     	mov	x1, sp
1028ec65c:     	mov	x0, x19
1028ec660:     	bl	0x10221b5e4
1028ec664:     	ldp	x29, x30, [sp, #0xb0]
1028ec668:     	ldp	x20, x19, [sp, #0xa0]
1028ec66c:     	ldp	x22, x21, [sp, #0x90]
1028ec670:     	ldp	x24, x23, [sp, #0x80]
1028ec674:     	ldp	d9, d8, [sp, #0x70]
1028ec678:     	add	sp, sp, #0xc0
1028ec67c:     	ret
1028ec680:     	add	x1, sp, #0x10
1028ec684:     	mov	x0, x20
1028ec688:     	bl	0x1028ec4e0
1028ec68c:     	ldr	w8, [x20, #0x13c]
1028ec690:     	cbz	w8, 0x1028ec750
1028ec694:     	mov	x24, x20
1028ec698:     	ldr	x0, [x24, #0x18]!
1028ec69c:     	bl	0x102781770
1028ec6a0:     	mov	x22, x0
1028ec6a4:     	ldr	x8, [x22]
1028ec6a8:     	ldr	x8, [x8, #0x38]
1028ec6ac:     	add	x1, x20, #0x68
1028ec6b0:     	mov	x0, x22
1028ec6b4:     	blr	x8
1028ec6b8:     	ldr	w8, [x20, #0x13c]
1028ec6bc:     	cbz	w8, 0x1028ec6cc
1028ec6c0:     	ldr	w8, [x22, #0x40]
1028ec6c4:     	orr	w8, w8, #0x4
1028ec6c8:     	str	w8, [x22, #0x40]
1028ec6cc:     	ldr	x0, [x20, #0x18]
1028ec6d0:     	bl	0x1027819bc
1028ec6d4:     	ldr	x0, [x20, #0x8]
1028ec6d8:     	ldr	x1, [x20, #0x18]
1028ec6dc:     	add	x2, x20, #0x28
1028ec6e0:     	add	x3, x20, #0x48
1028ec6e4:     	mov	w4, #0x0                ; =0
1028ec6e8:     	bl	0x1024a1f04
1028ec6ec:     	stp	x0, x1, [sp]
1028ec6f0:     	mov	x1, sp
1028ec6f4:     	mov	x0, x19
1028ec6f8:     	bl	0x10221b5e4
1028ec6fc:     	ldr	x0, [x20, #0x18]
1028ec700:     	bl	0x102781770
1028ec704:     	ldr	x8, [x0]
1028ec708:     	ldr	x8, [x8, #0x40]
1028ec70c:     	add	x1, x20, #0x68
1028ec710:     	add	x2, sp, #0x10
1028ec714:     	blr	x8
1028ec718:     	ldr	w8, [x20, #0x138]
1028ec71c:     	cbz	w8, 0x1028ec5d8
1028ec720:     	ldr	x8, [x24]
1028ec724:     	ldrb	w8, [x8, #0x21]
1028ec728:     	tbz	w8, #0x4, 0x1028ec5d8
1028ec72c:     	mov	x0, x22
1028ec730:     	mov	w1, #0x1                ; =1
1028ec734:     	bl	0x102780880
1028ec738:     	ldrb	w8, [x22, #0x40]
1028ec73c:     	tbz	w8, #0x1, 0x1028ec5d8
1028ec740:     	ldr	x0, [x24]
1028ec744:     	mov	x1, x22
1028ec748:     	bl	0x102781a0c
1028ec74c:     	b	0x1028ec5d8
1028ec750:     	mov	x24, x20
1028ec754:     	ldr	x0, [x24, #0x18]!
1028ec758:     	ldr	w8, [x24, #0x120]
1028ec75c:     	cbz	w8, 0x1028ec7a0
1028ec760:     	ldr	w8, [x0, #0x40]
1028ec764:     	cmp	w8, #0x1
1028ec768:     	b.le	0x1028ec7a0
1028ec76c:     	ldr	d0, [x20, #0x130]
1028ec770:     	fmov	d1, #1.00000000
1028ec774:     	fdiv	d1, d1, d8
1028ec778:     	add	x0, x20, #0xc0
1028ec77c:     	add	x1, x20, #0x68
1028ec780:     	mov	x2, x21
1028ec784:     	bl	0x1027878ec
1028ec788:     	mov	x23, x0
1028ec78c:     	ldr	x0, [x20, #0x18]
1028ec790:     	bl	0x102781770
1028ec794:     	mov	x22, x0
1028ec798:     	cbnz	w23, 0x1028ec6a4
1028ec79c:     	b	0x1028ec7a8
1028ec7a0:     	bl	0x102781770
1028ec7a4:     	mov	x22, x0
1028ec7a8:     	ldr	x8, [x22]
1028ec7ac:     	ldr	x8, [x8, #0x28]
1028ec7b0:     	add	x1, x20, #0x68
1028ec7b4:     	add	x2, sp, #0x10
1028ec7b8:     	mov	x0, x22
1028ec7bc:     	blr	x8
1028ec7c0:     	b	0x1028ec5d8

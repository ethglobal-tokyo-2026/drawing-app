
FUNCTION 0x1024a9530 size 528
1024a9530:     	sub	sp, sp, #0xa0
1024a9534:     	stp	x24, x23, [sp, #0x60]
1024a9538:     	stp	x22, x21, [sp, #0x70]
1024a953c:     	stp	x20, x19, [sp, #0x80]
1024a9540:     	stp	x29, x30, [sp, #0x90]
1024a9544:     	add	x29, sp, #0x90
1024a9548:     	mov	x19, x1
1024a954c:     	mov	x22, x0
1024a9550:     	mov	x20, x8
1024a9554:     	cbz	w2, 0x1024a9568
1024a9558:     	ldr	x0, [x19]
1024a955c:     	bl	0x1036718e4
1024a9560:     	mov	x21, x0
1024a9564:     	b	0x1024a956c
1024a9568:     	mov	w21, #0x0               ; =0
1024a956c:     	stp	xzr, xzr, [sp, #0x40]
1024a9570:     	ldr	x0, [x22]
1024a9574:     	cbz	x0, 0x1024a95fc
1024a9578:     	sub	x23, x29, #0x40
1024a957c:     	sub	x8, x29, #0x40
1024a9580:     	bl	0x1036718ec
1024a9584:     	ldur	x24, [x29, #-0x40]
1024a9588:     	add	x0, x23, #0x8
1024a958c:     	bl	0x10001022c
1024a9590:     	cbz	x24, 0x1024a95fc
1024a9594:     	ldr	x0, [x22]
1024a9598:     	sub	x8, x29, #0x40
1024a959c:     	bl	0x1036718ec
1024a95a0:     	ldur	x0, [x29, #-0x40]
1024a95a4:     	add	x8, sp, #0x30
1024a95a8:     	bl	0x103674950
1024a95ac:     	add	x0, x23, #0x8
1024a95b0:     	bl	0x10001022c
1024a95b4:     	ldr	x0, [sp, #0x30]
1024a95b8:     	adrp	x1, 0x104d8f000
1024a95bc:     	add	x1, x1, #0xc0
1024a95c0:     	add	x24, sp, #0x20
1024a95c4:     	add	x8, sp, #0x20
1024a95c8:     	bl	0x103676c54
1024a95cc:     	ldr	q0, [sp, #0x20]
1024a95d0:     	stp	xzr, xzr, [sp, #0x20]
1024a95d4:     	ldr	q1, [sp, #0x40]
1024a95d8:     	str	q0, [sp, #0x40]
1024a95dc:     	stur	q1, [x29, #-0x40]
1024a95e0:     	orr	x0, x23, #0x8
1024a95e4:     	bl	0x10001022c
1024a95e8:     	orr	x0, x24, #0x8
1024a95ec:     	bl	0x10001022c
1024a95f0:     	add	x8, sp, #0x30
1024a95f4:     	add	x0, x8, #0x8
1024a95f8:     	bl	0x10001022c
1024a95fc:     	mov	w0, #0x178              ; =376
1024a9600:     	bl	0x103bdd37c
1024a9604:     	mov	x23, x0
1024a9608:     	ldp	x9, x8, [sp, #0x40]
1024a960c:     	stp	x9, x8, [sp, #0x10]
1024a9610:     	cbz	x8, 0x1024a9620
1024a9614:     	add	x8, x8, #0x8
1024a9618:     	mov	w9, #0x1                ; =1
1024a961c:     	ldadd	w9, w8, [x8]
1024a9620:     	ldp	x9, x8, [x22]
1024a9624:     	stp	x9, x8, [sp]
1024a9628:     	cbz	x8, 0x1024a9638
1024a962c:     	add	x8, x8, #0x8
1024a9630:     	mov	w9, #0x1                ; =1
1024a9634:     	ldadd	w9, w8, [x8]
1024a9638:     	add	x22, sp, #0x10
1024a963c:     	mov	x24, sp
1024a9640:     	add	x1, sp, #0x10
1024a9644:     	mov	x2, sp
1024a9648:     	mov	x0, x23
1024a964c:     	mov	x3, x21
1024a9650:     	bl	0x1024a925c
1024a9654:     	add	x0, x24, #0x8
1024a9658:     	bl	0x10001022c
1024a965c:     	add	x0, x22, #0x8
1024a9660:     	bl	0x10001022c
1024a9664:     	mov	x0, x20
1024a9668:     	mov	x1, x23
1024a966c:     	bl	0x1024aa994
1024a9670:     	add	x21, sp, #0x40
1024a9674:     	ldr	x8, [x20], #0x8
1024a9678:     	str	x8, [x23, #0x58]
1024a967c:     	add	x0, x23, #0x60
1024a9680:     	mov	x1, x20
1024a9684:     	bl	0x10005a220
1024a9688:     	ldr	x9, [x19]
1024a968c:     	ldr	w8, [x9, #0x168]
1024a9690:     	str	w8, [x23, #0x168]
1024a9694:     	cmp	w8, #0x1
1024a9698:     	b.lt	0x1024a96c0
1024a969c:     	mov	x8, #0x0                ; =0
1024a96a0:     	add	x9, x9, #0x68
1024a96a4:     	add	x10, x23, #0x68
1024a96a8:     	ldr	q0, [x9], #0x10
1024a96ac:     	str	q0, [x10], #0x10
1024a96b0:     	add	x8, x8, #0x1
1024a96b4:     	ldrsw	x11, [x23, #0x168]
1024a96b8:     	cmp	x8, x11
1024a96bc:     	b.lt	0x1024a96a8
1024a96c0:     	orr	x0, x21, #0x8
1024a96c4:     	bl	0x10001022c
1024a96c8:     	ldp	x29, x30, [sp, #0x90]
1024a96cc:     	ldp	x20, x19, [sp, #0x80]
1024a96d0:     	ldp	x22, x21, [sp, #0x70]
1024a96d4:     	ldp	x24, x23, [sp, #0x60]
1024a96d8:     	add	sp, sp, #0xa0
1024a96dc:     	ret
1024a96e0:     	mov	x19, x0
1024a96e4:     	add	x8, sp, #0x30
1024a96e8:     	b	0x1024a96f4
1024a96ec:     	mov	x19, x0
1024a96f0:     	sub	x8, x29, #0x40
1024a96f4:     	add	x0, x8, #0x8
1024a96f8:     	bl	0x10001022c
1024a96fc:     	b	0x1024a972c
1024a9700:     	b	0x1024a9728
1024a9704:     	b	0x1024a9728
1024a9708:     	mov	x19, x0
1024a970c:     	add	x0, x24, #0x8
1024a9710:     	bl	0x10001022c
1024a9714:     	add	x0, x22, #0x8
1024a9718:     	bl	0x10001022c
1024a971c:     	mov	x0, x23
1024a9720:     	bl	0x103bdd34c
1024a9724:     	b	0x1024a972c
1024a9728:     	mov	x19, x0
1024a972c:     	add	x8, sp, #0x40
1024a9730:     	orr	x0, x8, #0x8
1024a9734:     	bl	0x10001022c
1024a9738:     	mov	x0, x19
1024a973c:     	bl	0x103bda970

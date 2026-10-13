
FUNCTION 0x1024c553c size 284
1024c553c:     	ldr	w8, [x0, #0x80]
1024c5540:     	mov	w9, #0x4012             ; =16402
1024c5544:     	and	w9, w8, w9
1024c5548:     	cmp	w9, #0x4, lsl #12       ; =0x4000
1024c554c:     	b.ne	0x1024c5558
1024c5550:     	ldr	x9, [x0, #0x68]
1024c5554:     	cbz	x9, 0x1024c5560
1024c5558:     	mov	w0, #0x0                ; =0
1024c555c:     	ret
1024c5560:     	cbz	w1, 0x1024c55f0
1024c5564:     	ldr	w9, [x0, #0x19c]
1024c5568:     	cbnz	w9, 0x1024c5558
1024c556c:     	ldr	w9, [x0, #0xe8]
1024c5570:     	cmp	w9, #0x1
1024c5574:     	b.eq	0x1024c557c
1024c5578:     	tbnz	w9, #0x0, 0x1024c5558
1024c557c:     	ldr	d1, [x0, #0x138]
1024c5580:     	adrp	x9, 0x1042e6000
1024c5584:     	ldr	d0, [x9, #0xfd0]
1024c5588:     	fcmp	d1, d0
1024c558c:     	b.mi	0x1024c5558
1024c5590:     	ldr	w9, [x0, #0x148]
1024c5594:     	cmp	w9, #0x1
1024c5598:     	b.eq	0x1024c55a0
1024c559c:     	tbnz	w9, #0x0, 0x1024c5558
1024c55a0:     	ldr	d1, [x0, #0x1a0]
1024c55a4:     	fcmp	d1, d0
1024c55a8:     	b.mi	0x1024c5558
1024c55ac:     	ldr	w9, [x0, #0x208]
1024c55b0:     	cbz	w9, 0x1024c5558
1024c55b4:     	ldrb	w9, [x0, #0x2c8]
1024c55b8:     	tbnz	w9, #0x0, 0x1024c5558
1024c55bc:     	ldrb	w9, [x0, #0x624]
1024c55c0:     	tbnz	w9, #0x0, 0x1024c5558
1024c55c4:     	ldrb	w9, [x0, #0x90]
1024c55c8:     	tbnz	w9, #0x7, 0x1024c5558
1024c55cc:     	ldrb	w9, [x0, #0x220]
1024c55d0:     	tbnz	w9, #0x7, 0x1024c5558
1024c55d4:     	ldrb	w9, [x0, #0x278]
1024c55d8:     	tbnz	w9, #0x7, 0x1024c5558
1024c55dc:     	and	w8, w8, #0x30000
1024c55e0:     	cmp	w8, #0x10, lsl #12      ; =0x10000
1024c55e4:     	b.ne	0x1024c5610
1024c55e8:     	mov	w0, #0x1                ; =1
1024c55ec:     	ret
1024c55f0:     	tbnz	w8, #0x2, 0x1024c5558
1024c55f4:     	ldr	w9, [x0, #0x198]
1024c55f8:     	cbnz	w9, 0x1024c5558
1024c55fc:     	ldr	w9, [x0, #0x360]
1024c5600:     	cbnz	w9, 0x1024c5558
1024c5604:     	ldrb	w9, [x0, #0x700]
1024c5608:     	tbnz	w9, #0x0, 0x1024c5558
1024c560c:     	b	0x1024c5564
1024c5610:     	ldr	d1, [x0, #0x4a0]
1024c5614:     	adrp	x8, 0x1042e3000
1024c5618:     	ldr	d0, [x8, #0x690]
1024c561c:     	fcmp	d1, d0
1024c5620:     	b.gt	0x1024c5558
1024c5624:     	ldr	d1, [x0, #0x500]
1024c5628:     	fabs	d1, d1
1024c562c:     	fcmp	d1, d0
1024c5630:     	b.hi	0x1024c5558
1024c5634:     	ldr	d1, [x0, #0x560]
1024c5638:     	fabs	d1, d1
1024c563c:     	fcmp	d1, d0
1024c5640:     	b.hi	0x1024c5558
1024c5644:     	ldr	d1, [x0, #0x5c0]
1024c5648:     	fabs	d1, d1
1024c564c:     	fcmp	d1, d0
1024c5650:     	b.hi	0x1024c5558
1024c5654:     	b	0x1024c55e8


/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64:	file format mach-o arm64

Disassembly of section __TEXT,__text:

000000010000f680 <__text>:
100b2b518:     	stp	x24, x23, [sp, #-0x40]!
100b2b51c:     	stp	x22, x21, [sp, #0x10]
100b2b520:     	stp	x20, x19, [sp, #0x20]
100b2b524:     	stp	x29, x30, [sp, #0x30]
100b2b528:     	add	x29, sp, #0x30
100b2b52c:     	mov	x21, x3
100b2b530:     	mov	x19, x0
100b2b534:     	mov	x22, x0
100b2b538:     	ldr	x9, [x22, #0x8]!
100b2b53c:     	cbz	x9, 0x100b2b57c <__text+0xb1befc>
100b2b540:     	ldr	w8, [x1]
100b2b544:     	mov	x20, x9
100b2b548:     	ldr	w9, [x9, #0x20]
100b2b54c:     	cmp	w8, w9
100b2b550:     	b.ge	0x100b2b564 <__text+0xb1bee4>
100b2b554:     	ldr	x9, [x20]
100b2b558:     	mov	x22, x20
100b2b55c:     	cbnz	x9, 0x100b2b544 <__text+0xb1bec4>
100b2b560:     	b	0x100b2b580 <__text+0xb1bf00>
100b2b564:     	cmp	w9, w8
100b2b568:     	b.ge	0x100b2b5c8 <__text+0xb1bf48>
100b2b56c:     	ldr	x9, [x20, #0x8]
100b2b570:     	cbnz	x9, 0x100b2b544 <__text+0xb1bec4>
100b2b574:     	add	x22, x20, #0x8
100b2b578:     	b	0x100b2b580 <__text+0xb1bf00>
100b2b57c:     	mov	x20, x22
100b2b580:     	mov	w0, #0x58               ; =88
100b2b584:     	bl	0x103bdd37c <dyld_stub_binder+0x103bdd37c>
100b2b588:     	mov	x23, x0
100b2b58c:     	ldr	x8, [x21]
100b2b590:     	ldr	w8, [x8]
100b2b594:     	str	w8, [x0, #0x20]
100b2b598:     	movi.2d	v0, #0000000000000000
100b2b59c:     	stur	q0, [x0, #0x48]
100b2b5a0:     	stur	q0, [x0, #0x38]
100b2b5a4:     	stur	q0, [x0, #0x28]
100b2b5a8:     	mov	x0, x19
100b2b5ac:     	mov	x1, x20
100b2b5b0:     	mov	x2, x22
100b2b5b4:     	mov	x3, x23
100b2b5b8:     	bl	0x10002bfd8 <__text+0x1c958>
100b2b5bc:     	mov	w1, #0x1                ; =1
100b2b5c0:     	mov	x20, x23
100b2b5c4:     	b	0x100b2b5cc <__text+0xb1bf4c>
100b2b5c8:     	mov	x1, #0x0                ; =0
100b2b5cc:     	mov	x0, x20
100b2b5d0:     	ldp	x29, x30, [sp, #0x30]
100b2b5d4:     	ldp	x20, x19, [sp, #0x20]
100b2b5d8:     	ldp	x22, x21, [sp, #0x10]
100b2b5dc:     	ldp	x24, x23, [sp], #0x40
100b2b5e0:     	ret

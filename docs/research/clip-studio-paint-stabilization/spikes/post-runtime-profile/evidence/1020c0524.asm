
FUNCTION 0x1020c0524 size 56
1020c0524:     	stp	x20, x19, [sp, #-0x20]!
1020c0528:     	stp	x29, x30, [sp, #0x10]
1020c052c:     	add	x29, sp, #0x10
1020c0530:     	mov	x19, x0
1020c0534:     	adrp	x20, 0x104c8f000
1020c0538:     	add	x20, x20, #0xf00
1020c053c:     	mov	x0, x20
1020c0540:     	mov	x1, x19
1020c0544:     	bl	0x103116448
1020c0548:     	add	x0, x20, #0x10
1020c054c:     	add	x1, x19, #0x10
1020c0550:     	ldp	x29, x30, [sp, #0x10]
1020c0554:     	ldp	x20, x19, [sp], #0x20
1020c0558:     	b	0x103116448


FUNCTION 0x1020c055c size 52
1020c055c:     	stp	x20, x19, [sp, #-0x20]!
1020c0560:     	stp	x29, x30, [sp, #0x10]
1020c0564:     	add	x29, sp, #0x10
1020c0568:     	mov	x0, x8
1020c056c:     	adrp	x19, 0x104c8f000
1020c0570:     	add	x19, x19, #0xf00
1020c0574:     	mov	x1, x19
1020c0578:     	bl	0x10311643c
1020c057c:     	add	x0, x0, #0x10
1020c0580:     	add	x1, x19, #0x10
1020c0584:     	ldp	x29, x30, [sp, #0x10]
1020c0588:     	ldp	x20, x19, [sp], #0x20
1020c058c:     	b	0x10311643c

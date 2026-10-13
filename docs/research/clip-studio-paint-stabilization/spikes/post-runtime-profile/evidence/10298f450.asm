
FUNCTION 0x10298f450 size 132
10298f450:     	sub	sp, sp, #0x40
10298f454:     	stp	x20, x19, [sp, #0x20]
10298f458:     	stp	x29, x30, [sp, #0x30]
10298f45c:     	add	x29, sp, #0x30
10298f460:     	ldp	x9, x8, [x0]
10298f464:     	stp	x9, x8, [sp, #0x10]
10298f468:     	cbz	x8, 0x10298f478
10298f46c:     	add	x8, x8, #0x8
10298f470:     	mov	w9, #0x1                ; =1
10298f474:     	ldadd	w9, w8, [x8]
10298f478:     	add	x20, sp, #0x10
10298f47c:     	adrp	x0, 0x104cb6000
10298f480:     	add	x0, x0, #0x370
10298f484:     	bl	0x10214de74
10298f488:     	mov	x1, x0
10298f48c:     	str	wzr, [sp, #0xc]
10298f490:     	add	x0, sp, #0x10
10298f494:     	add	x2, sp, #0xc
10298f498:     	bl	0x10298d278
10298f49c:     	mov	x19, x0
10298f4a0:     	add	x0, x20, #0x8
10298f4a4:     	bl	0x10001022c
10298f4a8:     	mov	x0, x19
10298f4ac:     	ldp	x29, x30, [sp, #0x30]
10298f4b0:     	ldp	x20, x19, [sp, #0x20]
10298f4b4:     	add	sp, sp, #0x40
10298f4b8:     	ret
10298f4bc:     	b	0x10298f4c0
10298f4c0:     	mov	x19, x0
10298f4c4:     	add	x0, x20, #0x8
10298f4c8:     	bl	0x10001022c
10298f4cc:     	mov	x0, x19
10298f4d0:     	bl	0x103bda970

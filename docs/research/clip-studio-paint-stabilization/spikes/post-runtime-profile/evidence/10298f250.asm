
FUNCTION 0x10298f250 size 132
10298f250:     	sub	sp, sp, #0x40
10298f254:     	stp	x20, x19, [sp, #0x20]
10298f258:     	stp	x29, x30, [sp, #0x30]
10298f25c:     	add	x29, sp, #0x30
10298f260:     	ldp	x9, x8, [x0]
10298f264:     	stp	x9, x8, [sp, #0x10]
10298f268:     	cbz	x8, 0x10298f278
10298f26c:     	add	x8, x8, #0x8
10298f270:     	mov	w9, #0x1                ; =1
10298f274:     	ldadd	w9, w8, [x8]
10298f278:     	add	x20, sp, #0x10
10298f27c:     	adrp	x0, 0x104cb6000
10298f280:     	add	x0, x0, #0x330
10298f284:     	bl	0x10214de74
10298f288:     	mov	x1, x0
10298f28c:     	str	wzr, [sp, #0xc]
10298f290:     	add	x0, sp, #0x10
10298f294:     	add	x2, sp, #0xc
10298f298:     	bl	0x10298d278
10298f29c:     	mov	x19, x0
10298f2a0:     	add	x0, x20, #0x8
10298f2a4:     	bl	0x10001022c
10298f2a8:     	mov	x0, x19
10298f2ac:     	ldp	x29, x30, [sp, #0x30]
10298f2b0:     	ldp	x20, x19, [sp, #0x20]
10298f2b4:     	add	sp, sp, #0x40
10298f2b8:     	ret
10298f2bc:     	b	0x10298f2c0
10298f2c0:     	mov	x19, x0
10298f2c4:     	add	x0, x20, #0x8
10298f2c8:     	bl	0x10001022c
10298f2cc:     	mov	x0, x19
10298f2d0:     	bl	0x103bda970


FUNCTION 0x10298f350 size 132
10298f350:     	sub	sp, sp, #0x40
10298f354:     	stp	x20, x19, [sp, #0x20]
10298f358:     	stp	x29, x30, [sp, #0x30]
10298f35c:     	add	x29, sp, #0x30
10298f360:     	ldp	x9, x8, [x0]
10298f364:     	stp	x9, x8, [sp, #0x10]
10298f368:     	cbz	x8, 0x10298f378
10298f36c:     	add	x8, x8, #0x8
10298f370:     	mov	w9, #0x1                ; =1
10298f374:     	ldadd	w9, w8, [x8]
10298f378:     	add	x20, sp, #0x10
10298f37c:     	adrp	x0, 0x104cb6000
10298f380:     	add	x0, x0, #0x350
10298f384:     	bl	0x10214de74
10298f388:     	mov	x1, x0
10298f38c:     	str	wzr, [sp, #0xc]
10298f390:     	add	x0, sp, #0x10
10298f394:     	add	x2, sp, #0xc
10298f398:     	bl	0x10298d278
10298f39c:     	mov	x19, x0
10298f3a0:     	add	x0, x20, #0x8
10298f3a4:     	bl	0x10001022c
10298f3a8:     	mov	x0, x19
10298f3ac:     	ldp	x29, x30, [sp, #0x30]
10298f3b0:     	ldp	x20, x19, [sp, #0x20]
10298f3b4:     	add	sp, sp, #0x40
10298f3b8:     	ret
10298f3bc:     	b	0x10298f3c0
10298f3c0:     	mov	x19, x0
10298f3c4:     	add	x0, x20, #0x8
10298f3c8:     	bl	0x10001022c
10298f3cc:     	mov	x0, x19
10298f3d0:     	bl	0x103bda970

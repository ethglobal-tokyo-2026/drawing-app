
FUNCTION 0x10298d278 size 140
10298d278:     	sub	sp, sp, #0x50
10298d27c:     	stp	x22, x21, [sp, #0x20]
10298d280:     	stp	x20, x19, [sp, #0x30]
10298d284:     	stp	x29, x30, [sp, #0x40]
10298d288:     	add	x29, sp, #0x40
10298d28c:     	mov	x19, x2
10298d290:     	ldr	w8, [x2]
10298d294:     	str	w8, [sp, #0x1c]
10298d298:     	ldp	x9, x8, [x0]
10298d29c:     	stp	x9, x8, [sp, #0x8]
10298d2a0:     	cbz	x8, 0x10298d2b0
10298d2a4:     	add	x8, x8, #0x8
10298d2a8:     	mov	w9, #0x1                ; =1
10298d2ac:     	ldadd	w9, w8, [x8]
10298d2b0:     	add	x21, sp, #0x8
10298d2b4:     	add	x22, sp, #0x1c
10298d2b8:     	add	x0, sp, #0x8
10298d2bc:     	add	x2, sp, #0x1c
10298d2c0:     	bl	0x10028f4d8
10298d2c4:     	mov	x20, x0
10298d2c8:     	add	x0, x21, #0x8
10298d2cc:     	bl	0x10001022c
10298d2d0:     	cmp	w20, #0x0
10298d2d4:     	csel	x8, x19, x22, eq
10298d2d8:     	ldr	w0, [x8]
10298d2dc:     	ldp	x29, x30, [sp, #0x40]
10298d2e0:     	ldp	x20, x19, [sp, #0x30]
10298d2e4:     	ldp	x22, x21, [sp, #0x20]
10298d2e8:     	add	sp, sp, #0x50
10298d2ec:     	ret
10298d2f0:     	mov	x19, x0
10298d2f4:     	add	x0, x21, #0x8
10298d2f8:     	bl	0x10001022c
10298d2fc:     	mov	x0, x19
10298d300:     	bl	0x103bda970

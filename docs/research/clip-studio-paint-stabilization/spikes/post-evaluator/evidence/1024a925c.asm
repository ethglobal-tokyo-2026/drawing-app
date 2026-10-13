
FUNCTION 0x1024a925c size 188
1024a925c:     	sub	sp, sp, #0x50
1024a9260:     	stp	x22, x21, [sp, #0x20]
1024a9264:     	stp	x20, x19, [sp, #0x30]
1024a9268:     	stp	x29, x30, [sp, #0x40]
1024a926c:     	add	x29, sp, #0x40
1024a9270:     	mov	x19, x0
1024a9274:     	ldp	x9, x8, [x1]
1024a9278:     	stp	x9, x8, [sp, #0x10]
1024a927c:     	cbz	x8, 0x1024a928c
1024a9280:     	add	x8, x8, #0x8
1024a9284:     	mov	w9, #0x1                ; =1
1024a9288:     	ldadd	w9, w8, [x8]
1024a928c:     	ldp	x9, x8, [x2]
1024a9290:     	stp	x9, x8, [sp]
1024a9294:     	cbz	x8, 0x1024a92a4
1024a9298:     	add	x8, x8, #0x8
1024a929c:     	mov	w9, #0x1                ; =1
1024a92a0:     	ldadd	w9, w8, [x8]
1024a92a4:     	add	x20, sp, #0x10
1024a92a8:     	mov	x21, sp
1024a92ac:     	add	x1, sp, #0x10
1024a92b0:     	mov	x2, sp
1024a92b4:     	mov	x0, x19
1024a92b8:     	bl	0x1036717d0
1024a92bc:     	add	x0, x21, #0x8
1024a92c0:     	bl	0x10001022c
1024a92c4:     	add	x0, x20, #0x8
1024a92c8:     	bl	0x10001022c
1024a92cc:     	adrp	x8, 0x104a49000
1024a92d0:     	add	x8, x8, #0x1a0
1024a92d4:     	str	x8, [x19]
1024a92d8:     	stp	xzr, xzr, [x19, #0x58]
1024a92dc:     	str	xzr, [x19, #0x168]
1024a92e0:     	str	wzr, [x19, #0x170]
1024a92e4:     	mov	x0, x19
1024a92e8:     	ldp	x29, x30, [sp, #0x40]
1024a92ec:     	ldp	x20, x19, [sp, #0x30]
1024a92f0:     	ldp	x22, x21, [sp, #0x20]
1024a92f4:     	add	sp, sp, #0x50
1024a92f8:     	ret
1024a92fc:     	mov	x19, x0
1024a9300:     	add	x0, x21, #0x8
1024a9304:     	bl	0x10001022c
1024a9308:     	add	x0, x20, #0x8
1024a930c:     	bl	0x10001022c
1024a9310:     	mov	x0, x19
1024a9314:     	bl	0x103bda970

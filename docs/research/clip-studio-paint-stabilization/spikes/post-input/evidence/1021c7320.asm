
FUNCTION 0x1021c7320 size 152
1021c7320:     	sub	sp, sp, #0x50
1021c7324:     	stp	d9, d8, [sp, #0x20]
1021c7328:     	stp	x20, x19, [sp, #0x30]
1021c732c:     	stp	x29, x30, [sp, #0x40]
1021c7330:     	add	x29, sp, #0x40
1021c7334:     	add	x20, sp, #0x10
1021c7338:     	add	x8, sp, #0x10
1021c733c:     	bl	0x1021bbe5c
1021c7340:     	mov	x8, sp
1021c7344:     	ldp	x19, x9, [sp, #0x10]
1021c7348:     	stp	x19, x9, [sp]
1021c734c:     	cbz	x9, 0x1021c735c
1021c7350:     	add	x9, x9, #0x8
1021c7354:     	mov	w10, #0x1               ; =1
1021c7358:     	ldadd	w10, w9, [x9]
1021c735c:     	add	x0, x8, #0x8
1021c7360:     	bl	0x10001022c
1021c7364:     	cbz	x19, 0x1021c7380
1021c7368:     	ldr	x8, [x19]
1021c736c:     	ldr	x8, [x8, #0x358]
1021c7370:     	mov	x0, x19
1021c7374:     	blr	x8
1021c7378:     	fmov	d8, d0
1021c737c:     	b	0x1021c7384
1021c7380:     	fmov	d8, #1.00000000
1021c7384:     	add	x0, x20, #0x8
1021c7388:     	bl	0x10001022c
1021c738c:     	fmov	d0, d8
1021c7390:     	ldp	x29, x30, [sp, #0x40]
1021c7394:     	ldp	x20, x19, [sp, #0x30]
1021c7398:     	ldp	d9, d8, [sp, #0x20]
1021c739c:     	add	sp, sp, #0x50
1021c73a0:     	ret
1021c73a4:     	mov	x19, x0
1021c73a8:     	add	x0, x20, #0x8
1021c73ac:     	bl	0x10001022c
1021c73b0:     	mov	x0, x19
1021c73b4:     	bl	0x103bda970


FUNCTION 0x1029a42f8 size 128
1029a42f8:     	stp	x20, x19, [sp, #-0x20]!
1029a42fc:     	stp	x29, x30, [sp, #0x10]
1029a4300:     	add	x29, sp, #0x10
1029a4304:     	mov	x19, x2
1029a4308:     	bl	0x1021ba99c
1029a430c:     	mov	x20, x0
1029a4310:     	ldr	x0, [x0]
1029a4314:     	cbz	x0, 0x1029a4328
1029a4318:     	ldr	x8, [x0]
1029a431c:     	ldr	x8, [x8, #0x10]
1029a4320:     	blr	x8
1029a4324:     	b	0x1029a4330
1029a4328:     	adrp	x0, 0x1048c8000
1029a432c:     	ldr	x0, [x0, #0x428]
1029a4330:     	adrp	x1, 0x104a5c000
1029a4334:     	add	x1, x1, #0x8a0
1029a4338:     	bl	0x100016d30
1029a433c:     	cbz	w0, 0x1029a436c
1029a4340:     	mov	x0, x20
1029a4344:     	bl	0x1029a4378
1029a4348:     	ldr	q0, [x0]
1029a434c:     	str	q0, [x19]
1029a4350:     	ldp	q1, q0, [x0, #0x20]
1029a4354:     	ldr	x8, [x0, #0x40]
1029a4358:     	ldr	q2, [x0, #0x10]
1029a435c:     	str	x8, [x19, #0x40]
1029a4360:     	stp	q1, q0, [x19, #0x20]
1029a4364:     	str	q2, [x19, #0x10]
1029a4368:     	mov	w0, #0x1                ; =1
1029a436c:     	ldp	x29, x30, [sp, #0x10]
1029a4370:     	ldp	x20, x19, [sp], #0x20
1029a4374:     	ret

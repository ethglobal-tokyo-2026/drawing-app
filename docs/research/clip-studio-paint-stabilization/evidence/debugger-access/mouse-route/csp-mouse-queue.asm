1020d9000:     	ldr	x8, [x8, #0x8]
1020d9004:     	blr	x8
1020d9008:     	mov	x0, x19
1020d900c:     	bl	0x103bda970

FUNCTION 0x1020d9010 size 124
1020d9010:     	cbz	x0, 0x1020d9088
1020d9014:     	stp	x20, x19, [sp, #-0x20]!
1020d9018:     	stp	x29, x30, [sp, #0x10]
1020d901c:     	add	x29, sp, #0x10
1020d9020:     	mov	x19, x0
1020d9024:     	ldr	x0, [x0]
1020d9028:     	cbz	x0, 0x1020d903c
1020d902c:     	ldr	x8, [x0]
1020d9030:     	ldr	x8, [x8, #0x10]
1020d9034:     	blr	x8
1020d9038:     	b	0x1020d9044
1020d903c:     	adrp	x0, 0x1048c8000
1020d9040:     	ldr	x0, [x0, #0x428]
1020d9044:     	ldr	x8, [x0, #0x8]
1020d9048:     	and	x0, x8, #0x7fffffffffffffff
1020d904c:     	adrp	x8, 0x104515000
1020d9050:     	add	x8, x8, #0x99 STRING 'N12Planeswalker30PWGestureHitTestEventParameter29SGestureHitTestEventParameterE'
1020d9054:     	mov	x9, #-0x8000000000000000 ; =-9223372036854775808
1020d9058:     	add	x8, x8, x9
1020d905c:     	and	x1, x8, #0x7fffffffffffffff
1020d9060:     	cmp	x0, x1
1020d9064:     	b.eq	0x1020d9078
1020d9068:     	bl	0x103bdfd64
1020d906c:     	cbz	w0, 0x1020d9078
1020d9070:     	mov	x0, #0x0                ; =0
1020d9074:     	b	0x1020d9080
1020d9078:     	ldr	x8, [x19]
1020d907c:     	add	x0, x8, #0x8 STRING 'rameterE'
1020d9080:     	ldp	x29, x30, [sp, #0x10]
1020d9084:     	ldp	x20, x19, [sp], #0x20
1020d9088:     	ret

FUNCTION 0x1020d908c size 12
1020d908c:     	adrp	x0, 0x104a2c000
1020d9090:     	add	x0, x0, #0x1e8
1020d9094:     	ret

FUNCTION 0x1020d9098 size 68
1020d9098:     	stp	x20, x19, [sp, #-0x20]!
1020d909c:     	stp	x29, x30, [sp, #0x10]
1020d90a0:     	add	x29, sp, #0x10
1020d90a4:     	mov	x19, x0
1020d90a8:     	mov	w0, #0x20               ; =32
1020d90ac:     	bl	0x103bdd37c
1020d90b0:     	adrp	x8, 0x104a2c000
1020d90b4:     	add	x8, x8, #0x1f8
1020d90b8:     	add	x8, x8, #0x10
1020d90bc:     	str	x8, [x0]
1020d90c0:     	ldur	q0, [x19, #0x8]
1020d90c4:     	stur	q0, [x0, #0x8]
1020d90c8:     	ldr	x8, [x19, #0x18]
1020d90cc:     	str	x8, [x0, #0x18]
1020d90d0:     	ldp	x29, x30, [sp, #0x10]
1020d90d4:     	ldp	x20, x19, [sp], #0x20
1020d90d8:     	ret

FUNCTION 0x1020d90dc size 88
1020d90dc:     	adrp	x8, 0x1048c8000
1020d90e0:     	ldr	x8, [x8, #0x6e0]
1020d90e4:     	ldrb	w9, [x8]
1020d90e8:     	tbnz	w9, #0x0, 0x1020d9130
1020d90ec:     	stp	x20, x19, [sp, #-0x20]!
1020d90f0:     	stp	x29, x30, [sp, #0x10]
1020d90f4:     	add	x29, sp, #0x10
1020d90f8:     	mov	w9, #0x1                ; =1
1020d90fc:     	strb	w9, [x8]
1020d9100:     	adrp	x19, 0x1048c8000
1020d9104:     	ldr	x19, [x19, #0xda8]
1020d9108:     	mov	x8, x19
1020d910c:     	bl	0x10000fd00
1020d9110:     	adrp	x0, 0x10000f000
1020d9114:     	add	x0, x0, #0xf7c
1020d9118:     	adrp	x2, 0x100000000
1020d911c:     	add	x2, x2, #0x0
1020d9120:     	mov	x1, x19
1020d9124:     	ldp	x29, x30, [sp, #0x10]
1020d9128:     	ldp	x20, x19, [sp], #0x20
1020d912c:     	b	0x103bdd3c4
1020d9130:     	ret

FUNCTION 0x1020d9134 size 88
1020d9134:     	adrp	x8, 0x1048c8000
1020d9138:     	ldr	x8, [x8, #0x6e8]
1020d913c:     	ldrb	w9, [x8]
1020d9140:     	tbnz	w9, #0x0, 0x1020d9188
1020d9144:     	stp	x20, x19, [sp, #-0x20]!
1020d9148:     	stp	x29, x30, [sp, #0x10]
1020d914c:     	add	x29, sp, #0x10
1020d9150:     	mov	w9, #0x1                ; =1
1020d9154:     	strb	w9, [x8]
1020d9158:     	adrp	x19, 0x1048c8000
1020d915c:     	ldr	x19, [x19, #0xdb0]
1020d9160:     	mov	x8, x19
1020d9164:     	bl	0x10000ffa4
1020d9168:     	adrp	x0, 0x10000f000
1020d916c:     	add	x0, x0, #0xf7c
1020d9170:     	adrp	x2, 0x100000000
1020d9174:     	add	x2, x2, #0x0
1020d9178:     	mov	x1, x19
1020d917c:     	ldp	x29, x30, [sp, #0x10]
1020d9180:     	ldp	x20, x19, [sp], #0x20
1020d9184:     	b	0x103bdd3c4
1020d9188:     	ret

FUNCTION 0x1020d918c size 116
1020d918c:     	stp	x20, x19, [sp, #-0x20]!
1020d9190:     	stp	x29, x30, [sp, #0x10]
1020d9194:     	add	x29, sp, #0x10
1020d9198:     	adrp	x19, 0x104c90000
1020d919c:     	add	x19, x19, #0x378
1020d91a0:     	mov	x0, x19
1020d91a4:     	bl	0x10310cd44
1020d91a8:     	adrp	x0, 0x10310c000
1020d91ac:     	add	x0, x0, #0xd7c STRING '3'
1020d91b0:     	adrp	x2, 0x100000000
1020d91b4:     	add	x2, x2, #0x0
1020d91b8:     	mov	x1, x19
1020d91bc:     	bl	0x103bdd3c4
1020d91c0:     	adrp	x0, 0x104d64000
1020d91c4:     	add	x0, x0, #0x5e8
1020d91c8:     	adrp	x19, 0x1045de000
1020d91cc:     	add	x19, x19, #0x43f
1020d91d0:     	mov	x1, x19
1020d91d4:     	mov	x2, x19
1020d91d8:     	mov	w3, #0x0                ; =0
1020d91dc:     	bl	0x10214dc50
1020d91e0:     	adrp	x0, 0x104c90000
1020d91e4:     	add	x0, x0, #0x380
1020d91e8:     	mov	x1, x19
1020d91ec:     	mov	x2, x19
1020d91f0:     	mov	w3, #0x0                ; =0
1020d91f4:     	ldp	x29, x30, [sp, #0x10]
1020d91f8:     	ldp	x20, x19, [sp], #0x20
1020d91fc:     	b	0x10214dc50

FUNCTION 0x1020d9200 size 36
1020d9200:     	stp	x29, x30, [sp, #-0x10]!
1020d9204:     	mov	x29, sp
1020d9208:     	bl	0x10213655c
1020d920c:     	adrp	x8, 0x104a2c000
1020d9210:     	add	x8, x8, #0x250
1020d9214:     	str	x8, [x0]
1020d9218:     	stp	wzr, wzr, [x0, #0xec]
1020d921c:     	ldp	x29, x30, [sp], #0x10
1020d9220:     	ret

FUNCTION 0x1020d9224 size 36
1020d9224:     	stp	x29, x30, [sp, #-0x10]!
1020d9228:     	mov	x29, sp
1020d922c:     	bl	0x10213655c
1020d9230:     	adrp	x8, 0x104a2c000
1020d9234:     	add	x8, x8, #0x250
1020d9238:     	str	x8, [x0]
1020d923c:     	stp	wzr, wzr, [x0, #0xec]
1020d9240:     	ldp	x29, x30, [sp], #0x10
1020d9244:     	ret

FUNCTION 0x1020d9248 size 4
1020d9248:     	b	0x10213662c

FUNCTION 0x1020d924c size 4
1020d924c:     	b	0x10213662c

FUNCTION 0x1020d9250 size 20
1020d9250:     	stp	x29, x30, [sp, #-0x10]!
1020d9254:     	mov	x29, sp
1020d9258:     	bl	0x10213662c
1020d925c:     	ldp	x29, x30, [sp], #0x10
1020d9260:     	b	0x103bdd34c

FUNCTION 0x1020d9264 size 12
1020d9264:     	adrp	x8, 0x104d64000
1020d9268:     	ldr	x0, [x8, #0x608]
1020d926c:     	ret

FUNCTION 0x1020d9270 size 92
1020d9270:     	stp	x20, x19, [sp, #-0x20]!
1020d9274:     	stp	x29, x30, [sp, #0x10]
1020d9278:     	add	x29, sp, #0x10
1020d927c:     	adrp	x20, 0x104d64000
1020d9280:     	ldr	x8, [x20, #0x608]
1020d9284:     	cbnz	x8, 0x1020d92ac
1020d9288:     	mov	w0, #0xf8               ; =248
1020d928c:     	bl	0x103bdd37c
1020d9290:     	mov	x19, x0
1020d9294:     	bl	0x10213655c
1020d9298:     	adrp	x8, 0x104a2c000
1020d929c:     	add	x8, x8, #0x250
1020d92a0:     	str	x8, [x19]
1020d92a4:     	stp	wzr, wzr, [x19, #0xec]
1020d92a8:     	str	x19, [x20, #0x608]
1020d92ac:     	ldp	x29, x30, [sp, #0x10]
1020d92b0:     	ldp	x20, x19, [sp], #0x20
1020d92b4:     	ret
1020d92b8:     	mov	x20, x0
1020d92bc:     	mov	x0, x19
1020d92c0:     	bl	0x103bdd34c
1020d92c4:     	mov	x0, x20
1020d92c8:     	bl	0x103bda970

FUNCTION 0x1020d92cc size 52
1020d92cc:     	stp	x20, x19, [sp, #-0x20]!
1020d92d0:     	stp	x29, x30, [sp, #0x10]
1020d92d4:     	add	x29, sp, #0x10
1020d92d8:     	adrp	x19, 0x104d64000
1020d92dc:     	ldr	x0, [x19, #0x608]
1020d92e0:     	cbz	x0, 0x1020d92f4
1020d92e4:     	ldr	x8, [x0]
1020d92e8:     	ldr	x8, [x8, #0x8]
1020d92ec:     	blr	x8
1020d92f0:     	str	xzr, [x19, #0x608]
1020d92f4:     	ldp	x29, x30, [sp, #0x10]
1020d92f8:     	ldp	x20, x19, [sp], #0x20
1020d92fc:     	ret

FUNCTION 0x1020d9300 size 8
1020d9300:     	str	w1, [x0, #0xf0]
1020d9304:     	b	0x1021367a8

FUNCTION 0x1020d9308 size 524
1020d9308:     	sub	sp, sp, #0x80
1020d930c:     	stp	x24, x23, [sp, #0x40]
1020d9310:     	stp	x22, x21, [sp, #0x50]
1020d9314:     	stp	x20, x19, [sp, #0x60]
1020d9318:     	stp	x29, x30, [sp, #0x70]
1020d931c:     	add	x29, sp, #0x70
1020d9320:     	mov	x20, x3
1020d9324:     	mov	x19, x2
1020d9328:     	mov	x21, x1
1020d932c:     	mov	x22, x0
1020d9330:     	stur	wzr, [x29, #-0x34]
1020d9334:     	sub	x1, x29, #0x34
1020d9338:     	mov	x0, x2
1020d933c:     	bl	0x10207d1f8
1020d9340:     	cbz	w0, 0x1020d94e8
1020d9344:     	add	x0, sp, #0x10
1020d9348:     	bl	0x1021364f8
1020d934c:     	str	wzr, [sp, #0xc]
1020d9350:     	add	x1, sp, #0xc
1020d9354:     	mov	x0, x19
1020d9358:     	bl	0x10207d270
1020d935c:     	ldr	w1, [sp, #0xc]
1020d9360:     	add	x0, sp, #0x10
1020d9364:     	bl	0x10213652c
1020d9368:     	ldur	w8, [x29, #-0x34]
1020d936c:     	cmp	w8, #0x3
1020d9370:     	b.gt	0x1020d93c4
1020d9374:     	cmp	w8, #0x1
1020d9378:     	b.eq	0x1020d94c8
1020d937c:     	cmp	w8, #0x2
1020d9380:     	b.eq	0x1020d9448
1020d9384:     	cmp	w8, #0x3
1020d9388:     	b.ne	0x1020d9430
1020d938c:     	ldr	w8, [x22, #0xec]
1020d9390:     	cmp	w8, #0x2
1020d9394:     	b.ne	0x1020d93b0
1020d9398:     	add	x4, sp, #0x10
1020d939c:     	mov	x0, x22
1020d93a0:     	mov	x1, x21
1020d93a4:     	mov	x2, x19
1020d93a8:     	mov	x3, x20
1020d93ac:     	bl	0x1020d9514
1020d93b0:     	str	wzr, [x22, #0xec]
1020d93b4:     	mov	x0, x22
1020d93b8:     	mov	w1, #0x0                ; =0
1020d93bc:     	bl	0x1021367a0
1020d93c0:     	b	0x1020d94c8
1020d93c4:     	cmp	w8, #0x4
1020d93c8:     	b.eq	0x1020d9404
1020d93cc:     	cmp	w8, #0x5
1020d93d0:     	b.eq	0x1020d945c
1020d93d4:     	cmp	w8, #0x6
1020d93d8:     	b.ne	0x1020d9430
1020d93dc:     	ldr	w8, [x22, #0xec]
1020d93e0:     	cmp	w8, #0x2
1020d93e4:     	b.ne	0x1020d94c8
1020d93e8:     	add	x4, sp, #0x10
1020d93ec:     	mov	x0, x22
1020d93f0:     	mov	x1, x21
1020d93f4:     	mov	x2, x19
1020d93f8:     	mov	x3, x20
1020d93fc:     	bl	0x1020d9514
1020d9400:     	b	0x1020d943c
1020d9404:     	ldr	w8, [x22, #0xec]
1020d9408:     	cmp	w8, #0x1
1020d940c:     	b.ne	0x1020d94c8
1020d9410:     	mov	w23, #0x2               ; =2
1020d9414:     	add	x4, sp, #0x10
1020d9418:     	mov	x0, x22
1020d941c:     	mov	w1, #0x2                ; =2
1020d9420:     	mov	x2, x19
1020d9424:     	bl	0x1020d96a0
1020d9428:     	str	w23, [x22, #0xec]
1020d942c:     	b	0x1020d94c8
1020d9430:     	ldr	w8, [x22, #0xec]
1020d9434:     	cmp	w8, #0x1
1020d9438:     	b.ne	0x1020d94c8
1020d943c:     	mov	w8, #0x3                ; =3
1020d9440:     	str	w8, [x22, #0xec]
1020d9444:     	b	0x1020d94c8
1020d9448:     	mov	w8, #0x1                ; =1
1020d944c:     	str	w8, [x22, #0xec]
1020d9450:     	mov	x0, x22
1020d9454:     	bl	0x102137210
1020d9458:     	b	0x1020d94c8
1020d945c:     	ldr	w8, [x22, #0xec]
1020d9460:     	cmp	w8, #0x2
1020d9464:     	b.ne	0x1020d94c8
1020d9468:     	ldr	w8, [sp, #0xc]
1020d946c:     	cbz	w8, 0x1020d9478
1020d9470:     	ldr	w8, [x22, #0xf0]
1020d9474:     	cbz	w8, 0x1020d9490
1020d9478:     	add	x4, sp, #0x10
1020d947c:     	mov	x0, x22
1020d9480:     	mov	w1, #0x1                ; =1
1020d9484:     	mov	x2, x19
1020d9488:     	bl	0x1020d96a0
1020d948c:     	b	0x1020d94c8
1020d9490:     	add	x0, sp, #0x10
1020d9494:     	mov	w1, #0x0                ; =0
1020d9498:     	bl	0x10213652c
1020d949c:     	add	x4, sp, #0x10
1020d94a0:     	mov	x0, x22
1020d94a4:     	mov	x1, x21
1020d94a8:     	mov	x2, x19
1020d94ac:     	mov	x3, x20
1020d94b0:     	bl	0x1020d9514
1020d94b4:     	mov	w8, #0x3                ; =3
1020d94b8:     	str	w8, [x22, #0xec]
1020d94bc:     	ldr	w1, [sp, #0xc]
1020d94c0:     	add	x0, sp, #0x10
1020d94c4:     	bl	0x10213652c
1020d94c8:     	ldur	w3, [x29, #-0x34]
1020d94cc:     	add	x4, sp, #0x10
1020d94d0:     	mov	x0, x20
1020d94d4:     	mov	x1, x21
1020d94d8:     	mov	x2, x19
1020d94dc:     	bl	0x1020a94ec
1020d94e0:     	add	x0, sp, #0x10
1020d94e4:     	bl	0x102136518
1020d94e8:     	ldp	x29, x30, [sp, #0x70]
1020d94ec:     	ldp	x20, x19, [sp, #0x60]
1020d94f0:     	ldp	x22, x21, [sp, #0x50]
1020d94f4:     	ldp	x24, x23, [sp, #0x40]
1020d94f8:     	add	sp, sp, #0x80
1020d94fc:     	ret
1020d9500:     	mov	x19, x0
1020d9504:     	add	x0, sp, #0x10
1020d9508:     	bl	0x102136518
1020d950c:     	mov	x0, x19
1020d9510:     	bl	0x103bda970

FUNCTION 0x1020d9514 size 396
1020d9514:     	sub	sp, sp, #0x80
1020d9518:     	stp	d11, d10, [sp, #0x10]
1020d951c:     	stp	d9, d8, [sp, #0x20]
1020d9520:     	stp	x26, x25, [sp, #0x30]
1020d9524:     	stp	x24, x23, [sp, #0x40]
1020d9528:     	stp	x22, x21, [sp, #0x50]
1020d952c:     	stp	x20, x19, [sp, #0x60]
1020d9530:     	stp	x29, x30, [sp, #0x70]
1020d9534:     	add	x29, sp, #0x70
1020d9538:     	mov	x19, x4
1020d953c:     	mov	x21, x3
1020d9540:     	mov	x22, x2
1020d9544:     	mov	x23, x1
1020d9548:     	mov	x20, x0
1020d954c:     	mov	w1, #0x2                ; =2
1020d9550:     	bl	0x1021367b0
1020d9554:     	mov	w26, #0x1               ; =1
1020d9558:     	mov	x0, x19
1020d955c:     	mov	w1, #0x1                ; =1
1020d9560:     	bl	0x102136534
1020d9564:     	mov	x0, x20
1020d9568:     	bl	0x102136788
1020d956c:     	mov	x24, x0
1020d9570:     	mov	x0, x20
1020d9574:     	bl	0x102136798
1020d9578:     	fmov	d8, d0
1020d957c:     	fmov	d9, d1
1020d9580:     	adrp	x8, 0x104514000
1020d9584:     	add	x8, x8, #0xf98
1020d9588:     	ldr	d0, [x8]
1020d958c:     	cmp	w24, #0x0
1020d9590:     	movi	d1, #0000000000000000
1020d9594:     	fcsel	d10, d0, d1, eq
1020d9598:     	mov	x0, x20
1020d959c:     	bl	0x102136780
1020d95a0:     	fcvtzs	w25, d0
1020d95a4:     	mov	x0, x20
1020d95a8:     	bl	0x102136778
1020d95ac:     	cmp	w25, w0
1020d95b0:     	csel	w25, w25, w0, gt
1020d95b4:     	str	w26, [sp, #0xc]
1020d95b8:     	cbz	w24, 0x1020d95d4
1020d95bc:     	ldr	w8, [x20, #0xf0]
1020d95c0:     	cmp	w8, #0x0
1020d95c4:     	ccmp	w25, #0x0, #0x0, ne
1020d95c8:     	b.ne	0x1020d95d8
1020d95cc:     	mov	w26, #0x1               ; =1
1020d95d0:     	b	0x1020d95dc
1020d95d4:     	cbz	w25, 0x1020d95cc
1020d95d8:     	mov	w26, #0x0               ; =0
1020d95dc:     	add	x1, sp, #0xc
1020d95e0:     	mov	x0, x20
1020d95e4:     	fmov	d0, d8
1020d95e8:     	fmov	d1, d9
1020d95ec:     	fmov	d2, d10
1020d95f0:     	mov	x2, #0x0                ; =0
1020d95f4:     	mov	w3, #0x1                ; =1
1020d95f8:     	mov	w4, #0x0                ; =0
1020d95fc:     	mov	x5, #0x0                ; =0
1020d9600:     	mov	w6, #0x0                ; =0
1020d9604:     	mov	x7, x19
1020d9608:     	bl	0x1021367c0
1020d960c:     	tbnz	w26, #0x0, 0x1020d9640
1020d9610:     	ldr	w8, [sp, #0xc]
1020d9614:     	cmp	w8, #0x3
1020d9618:     	b.eq	0x1020d9640
1020d961c:     	mov	x0, x21
1020d9620:     	mov	x1, x23
1020d9624:     	mov	x2, x22
1020d9628:     	mov	w3, #0x5                ; =5
1020d962c:     	mov	x4, x19
1020d9630:     	bl	0x1020a94ec
1020d9634:     	sub	w25, w25, #0x1
1020d9638:     	cbnz	w24, 0x1020d95bc
1020d963c:     	b	0x1020d95d4
1020d9640:     	cbz	w26, 0x1020d967c
1020d9644:     	mov	x0, x20
1020d9648:     	mov	w1, #0x0                ; =0
1020d964c:     	bl	0x1021367b0
1020d9650:     	mov	x0, x20
1020d9654:     	mov	w1, #0x1                ; =1
1020d9658:     	bl	0x1021367b8
1020d965c:     	mov	x0, x19
1020d9660:     	mov	w1, #0x0                ; =0
1020d9664:     	bl	0x102136534
1020d9668:     	mov	x0, x19
1020d966c:     	fmov	d0, d8
1020d9670:     	fmov	d1, d9
1020d9674:     	fmov	d2, d10
1020d9678:     	bl	0x102136520
1020d967c:     	ldp	x29, x30, [sp, #0x70]
1020d9680:     	ldp	x20, x19, [sp, #0x60]
1020d9684:     	ldp	x22, x21, [sp, #0x50]
1020d9688:     	ldp	x24, x23, [sp, #0x40]
1020d968c:     	ldp	x26, x25, [sp, #0x30]
1020d9690:     	ldp	d9, d8, [sp, #0x20]
1020d9694:     	ldp	d11, d10, [sp, #0x10]
1020d9698:     	add	sp, sp, #0x80
1020d969c:     	ret

FUNCTION 0x1020d96a0 size 248
1020d96a0:     	sub	sp, sp, #0x60
1020d96a4:     	stp	d9, d8, [sp, #0x20]
1020d96a8:     	stp	x22, x21, [sp, #0x30]
1020d96ac:     	stp	x20, x19, [sp, #0x40]
1020d96b0:     	stp	x29, x30, [sp, #0x50]
1020d96b4:     	add	x29, sp, #0x50
1020d96b8:     	mov	x19, x4
1020d96bc:     	mov	x21, x2
1020d96c0:     	mov	x22, x1
1020d96c4:     	mov	x20, x0
1020d96c8:     	stp	wzr, w1, [sp, #0x18]
1020d96cc:     	add	x1, sp, #0x18
1020d96d0:     	mov	x0, x2
1020d96d4:     	bl	0x10207d270
1020d96d8:     	stp	xzr, xzr, [sp, #0x8]
1020d96dc:     	add	x1, sp, #0x8
1020d96e0:     	mov	x0, x21
1020d96e4:     	bl	0x10207d240
1020d96e8:     	adrp	x8, 0x104514000
1020d96ec:     	add	x8, x8, #0xf98
1020d96f0:     	ldr	d8, [x8]
1020d96f4:     	str	d8, [sp]
1020d96f8:     	ldr	w8, [sp, #0x18]
1020d96fc:     	cmp	w8, #0x0
1020d9700:     	ccmp	w22, #0x6, #0x4, eq
1020d9704:     	b.ne	0x1020d9720
1020d9708:     	mov	x0, x20
1020d970c:     	bl	0x102136788
1020d9710:     	cbz	w0, 0x1020d9754
1020d9714:     	str	xzr, [sp]
1020d9718:     	movi	d8, #0000000000000000
1020d971c:     	b	0x1020d9754
1020d9720:     	mov	x1, sp
1020d9724:     	mov	x0, x21
1020d9728:     	bl	0x10207d254
1020d972c:     	adrp	x8, 0x1042e3000
1020d9730:     	ldr	d0, [x8, #0x688]
1020d9734:     	fadd	d0, d8, d0
1020d9738:     	ldr	d8, [sp]
1020d973c:     	fcmp	d8, d0
1020d9740:     	b.pl	0x1020d9754
1020d9744:     	mov	x0, x20
1020d9748:     	mov	w1, #0x1                ; =1
1020d974c:     	bl	0x1021367a0
1020d9750:     	ldr	d8, [sp]
1020d9754:     	ldp	d0, d1, [sp, #0x8]
1020d9758:     	add	x1, sp, #0x1c
1020d975c:     	mov	x0, x20
1020d9760:     	fmov	d2, d8
1020d9764:     	mov	x2, #0x0                ; =0
1020d9768:     	mov	w3, #0x1                ; =1
1020d976c:     	mov	w4, #0x0                ; =0
1020d9770:     	mov	x5, #0x0                ; =0
1020d9774:     	mov	w6, #0x0                ; =0
1020d9778:     	mov	x7, x19
1020d977c:     	bl	0x1021367c0
1020d9780:     	ldp	x29, x30, [sp, #0x50]
1020d9784:     	ldp	x20, x19, [sp, #0x40]
1020d9788:     	ldp	x22, x21, [sp, #0x30]
1020d978c:     	ldp	d9, d8, [sp, #0x20]
1020d9790:     	add	sp, sp, #0x60
1020d9794:     	ret

FUNCTION 0x1020d9798 size 60
1020d9798:     	stp	x20, x19, [sp, #-0x20]!
1020d979c:     	stp	x29, x30, [sp, #0x10]
1020d97a0:     	add	x29, sp, #0x10
1020d97a4:     	adrp	x19, 0x104c90000
1020d97a8:     	add	x19, x19, #0x3a0
1020d97ac:     	mov	x0, x19
1020d97b0:     	bl	0x10310cd44
1020d97b4:     	adrp	x0, 0x10310c000
1020d97b8:     	add	x0, x0, #0xd7c STRING '3'
1020d97bc:     	adrp	x2, 0x100000000
1020d97c0:     	add	x2, x2, #0x0
1020d97c4:     	mov	x1, x19
1020d97c8:     	ldp	x29, x30, [sp, #0x10]
1020d97cc:     	ldp	x20, x19, [sp], #0x20
1020d97d0:     	b	0x103bdd3c4

FUNCTION 0x1020d97d4 size 64
1020d97d4:     	stp	x29, x30, [sp, #-0x10]!
1020d97d8:     	mov	x29, sp
1020d97dc:     	mov	w1, #0x0                ; =0
1020d97e0:     	bl	0x1020ece10
1020d97e4:     	adrp	x8, 0x104a2c000
1020d97e8:     	add	x8, x8, #0x288
1020d97ec:     	str	x8, [x0]
1020d97f0:     	adrp	x8, 0x104515000
1020d97f4:     	ldr	d0, [x8, #0x178]
1020d97f8:     	str	d0, [x0, #0xf0]
1020d97fc:     	movi.2d	v0, #0000000000000000
1020d9800:     	mov	x8, x0
1020d9804:     	str	q0, [x8, #0xf8]!
1020d9808:     	str	q0, [x8, #0x10]
1020d980c:     	ldp	x29, x30, [sp], #0x10
1020d9810:     	ret

FUNCTION 0x1020d9814 size 64
1020d9814:     	stp	x29, x30, [sp, #-0x10]!
1020d9818:     	mov	x29, sp
1020d981c:     	mov	w1, #0x0                ; =0
1020d9820:     	bl	0x1020ece10
1020d9824:     	adrp	x8, 0x104a2c000
1020d9828:     	add	x8, x8, #0x288
1020d982c:     	str	x8, [x0]
1020d9830:     	adrp	x8, 0x104515000
1020d9834:     	ldr	d0, [x8, #0x178]
1020d9838:     	str	d0, [x0, #0xf0]
1020d983c:     	movi.2d	v0, #0000000000000000
1020d9840:     	mov	x8, x0
1020d9844:     	str	q0, [x8, #0xf8]!
1020d9848:     	str	q0, [x8, #0x10]
1020d984c:     	ldp	x29, x30, [sp], #0x10
1020d9850:     	ret

FUNCTION 0x1020d9854 size 60
1020d9854:     	stp	x20, x19, [sp, #-0x20]!
1020d9858:     	stp	x29, x30, [sp, #0x10]
1020d985c:     	add	x29, sp, #0x10
1020d9860:     	mov	x19, x0
1020d9864:     	adrp	x8, 0x104a2c000
1020d9868:     	add	x8, x8, #0x288
1020d986c:     	str	x8, [x0]

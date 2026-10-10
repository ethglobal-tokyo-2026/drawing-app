
FUNCTION 0x10205c05c size 656
10205c05c:     	sub	sp, sp, #0x110
10205c060:     	stp	d9, d8, [sp, #0xb0]
10205c064:     	stp	x26, x25, [sp, #0xc0]
10205c068:     	stp	x24, x23, [sp, #0xd0]
10205c06c:     	stp	x22, x21, [sp, #0xe0]
10205c070:     	stp	x20, x19, [sp, #0xf0]
10205c074:     	stp	x29, x30, [sp, #0x100]
10205c078:     	add	x29, sp, #0x100
10205c07c:     	mov	x19, x2
10205c080:     	mov	x20, x0
10205c084:     	bl	0x103be8960  SELECTOR inputMethodEventHandleMouseEvent:
10205c088:     	tbnz	w0, #0x0, 0x10205c2cc
10205c08c:     	adrp	x8, 0x104af8000
10205c090:     	ldrsw	x8, [x8, #0xd5c]
10205c094:     	ldrb	w8, [x20, x8]
10205c098:     	tbnz	w8, #0x0, 0x10205c0a8
10205c09c:     	mov	x0, x20
10205c0a0:     	mov	x2, x19
10205c0a4:     	bl	0x103be9e80  SELECTOR mouseEntered:
10205c0a8:     	adrp	x8, 0x104af6000
10205c0ac:     	ldr	x2, [x8, #0x928]
10205c0b0:     	mov	x0, x19
10205c0b4:     	bl	0x103beb600  SELECTOR respondsToSelector:
10205c0b8:     	cbz	w0, 0x10205c2cc
10205c0bc:     	mov	x0, x20
10205c0c0:     	bl	0x103beed00  SELECTOR window
10205c0c4:     	bl	0x103be64e0  SELECTOR contentView
10205c0c8:     	mov	x21, x0
10205c0cc:     	mov	x0, x19
10205c0d0:     	bl	0x103be97c0  SELECTOR locationInWindow
10205c0d4:     	mov	x0, x21
10205c0d8:     	bl	0x103be7f20  SELECTOR hitTest:
10205c0dc:     	mov	x21, x0
10205c0e0:     	bl	0x103be5fc0  SELECTOR className
10205c0e4:     	adrp	x2, 0x104ae8000
10205c0e8:     	add	x2, x2, #0x18
10205c0ec:     	bl	0x103be7e40  SELECTOR hasPrefix:
10205c0f0:     	adrp	x22, 0x104c8e000
10205c0f4:     	tbnz	w0, #0x0, 0x10205c110
10205c0f8:     	mov	x0, x21
10205c0fc:     	bl	0x103be5fc0  SELECTOR className
10205c100:     	adrp	x2, 0x104ae8000
10205c104:     	add	x2, x2, #0x38
10205c108:     	bl	0x103be7e40  SELECTOR hasPrefix:
10205c10c:     	cbz	w0, 0x10205c120
10205c110:     	ldrb	w8, [x22, #0x4f1]
10205c114:     	tbnz	w8, #0x0, 0x10205c2cc
10205c118:     	mov	w8, #0x1                ; =1
10205c11c:     	b	0x10205c124
10205c120:     	mov	w8, #0x0                ; =0
10205c124:     	strb	w8, [x22, #0x4f1]
10205c128:     	mov	x0, x20
10205c12c:     	bl	0x103beed00  SELECTOR window
10205c130:     	bl	0x103beed40  SELECTOR windowController
10205c134:     	bl	0x103be95e0  SELECTOR legacyWindowObject
10205c138:     	cbz	x0, 0x10205c2cc
10205c13c:     	mov	x21, x0
10205c140:     	ldr	x8, [x0, #0x38]
10205c144:     	cbz	x8, 0x10205c2cc
10205c148:     	mov	x0, x19
10205c14c:     	bl	0x103be97c0  SELECTOR locationInWindow
10205c150:     	mov	x0, x20
10205c154:     	mov	x2, #0x0                ; =0
10205c158:     	bl	0x103be65e0  SELECTOR convertPoint:fromView:
10205c15c:     	fmov	d8, d0
10205c160:     	fmov	d9, d1
10205c164:     	bl	0x10207a668
10205c168:     	cmp	x21, x0
10205c16c:     	b.eq	0x10205c1d0
10205c170:     	mov	w8, #0x1                ; =1
10205c174:     	mov	w9, #0xe                ; =14
10205c178:     	stur	w8, [x29, #-0x64]
10205c17c:     	stur	w9, [x29, #-0x54]
10205c180:     	mov	x0, x19
10205c184:     	bl	0x103be97c0  SELECTOR locationInWindow
10205c188:     	mov	x0, x20
10205c18c:     	mov	x2, #0x0                ; =0
10205c190:     	bl	0x103be65e0  SELECTOR convertPoint:fromView:
10205c194:     	fmov	d8, d0
10205c198:     	fmov	d9, d1
10205c19c:     	fcvtzs	w8, d0
10205c1a0:     	fcvtzs	w9, d1
10205c1a4:     	orr	x8, x8, x9, lsl #32
10205c1a8:     	stur	x8, [x29, #-0x60]
10205c1ac:     	ldr	x8, [x21, #0x28]
10205c1b0:     	sub	x1, x29, #0x64
10205c1b4:     	mov	x0, x21
10205c1b8:     	blr	x8
10205c1bc:     	ldur	w8, [x29, #-0x54]
10205c1c0:     	adrp	x9, 0x104af8000
10205c1c4:     	ldrsw	x9, [x9, #0xd60]
10205c1c8:     	str	w8, [x20, x9]
10205c1cc:     	b	0x10205c1e0
10205c1d0:     	adrp	x8, 0x104af8000
10205c1d4:     	ldrsw	x8, [x8, #0xd60]
10205c1d8:     	ldr	w8, [x20, x8]
10205c1dc:     	stur	w8, [x29, #-0x54]
10205c1e0:     	adrp	x25, 0x1048c8000
10205c1e4:     	ldr	x25, [x25, #0x538]
10205c1e8:     	ldr	x0, [x25]
10205c1ec:     	mov	x2, x19
10205c1f0:     	bl	0x103be9160  SELECTOR isTabletEvent:
10205c1f4:     	cbz	w0, 0x10205c20c
10205c1f8:     	ldr	x0, [x25]
10205c1fc:     	mov	x2, x19
10205c200:     	mov	w3, #0x1                ; =1
10205c204:     	mov	w4, #0x0                ; =0
10205c208:     	bl	0x103bee260  SELECTOR tabletEvent:tabletEventKind:useLastPenAttitude:
10205c20c:     	ldur	w24, [x29, #-0x54]
10205c210:     	mov	x0, x19
10205c214:     	bl	0x103be9d00  SELECTOR modifierFlags
10205c218:     	mov	x22, x0
10205c21c:     	ldr	x0, [x25]
10205c220:     	bl	0x103beaf00  SELECTOR proxyModifierFlags
10205c224:     	orr	x22, x0, x22
10205c228:     	adrp	x8, 0x104af8000
10205c22c:     	ldr	x0, [x8, #0x778]
10205c230:     	mov	x2, x22
10205c234:     	bl	0x103be65c0  SELECTOR convertModifierFlags:
10205c238:     	mov	x23, x0
10205c23c:     	adrp	x8, 0x104c8e000
10205c240:     	ldrb	w8, [x8, #0x4f2]
10205c244:     	cmp	w8, #0x1
10205c248:     	b.ne	0x10205c258
10205c24c:     	adrp	x8, 0x104c8e000
10205c250:     	ldr	w0, [x8, #0x4f4]
10205c254:     	b	0x10205c264
10205c258:     	ldr	x0, [x25]
10205c25c:     	mov	x2, x19
10205c260:     	bl	0x103be6a00  SELECTOR currentPenTypeWithEvent:
10205c264:     	stp	d8, d9, [sp, #0x10]
10205c268:     	str	wzr, [sp, #0x20]
10205c26c:     	str	x22, [sp, #0x28]
10205c270:     	str	w23, [sp, #0x30]
10205c274:     	stur	xzr, [sp, #0x44]
10205c278:     	stur	xzr, [sp, #0x3c]
10205c27c:     	stur	xzr, [sp, #0x34]
10205c280:     	stp	wzr, w24, [sp, #0x4c]
10205c284:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
10205c288:     	str	x8, [sp, #0x60]
10205c28c:     	adrp	x9, 0x104484000
10205c290:     	ldr	d0, [x9, #0xf30]
10205c294:     	str	d0, [sp, #0x68]
10205c298:     	stp	wzr, w0, [sp, #0x70]
10205c29c:     	str	wzr, [sp, #0x78]
10205c2a0:     	stp	xzr, xzr, [sp, #0x80]
10205c2a4:     	str	x8, [sp, #0x90]
10205c2a8:     	mov	w8, #0x1                ; =1
10205c2ac:     	str	w8, [sp, #0x8]
10205c2b0:     	ldr	x8, [x21, #0x38]
10205c2b4:     	add	x1, sp, #0x8
10205c2b8:     	mov	x0, x21
10205c2bc:     	blr	x8
10205c2c0:     	mov	x0, x20
10205c2c4:     	mov	x2, x19
10205c2c8:     	bl	0x103be6a60  SELECTOR cursorEvent:
10205c2cc:     	ldp	x29, x30, [sp, #0x100]
10205c2d0:     	ldp	x20, x19, [sp, #0xf0]
10205c2d4:     	ldp	x22, x21, [sp, #0xe0]
10205c2d8:     	ldp	x24, x23, [sp, #0xd0]
10205c2dc:     	ldp	x26, x25, [sp, #0xc0]
10205c2e0:     	ldp	d9, d8, [sp, #0xb0]
10205c2e4:     	add	sp, sp, #0x110
10205c2e8:     	ret

FUNCTION 0x10205c2ec size 544
10205c2ec:     	sub	sp, sp, #0x100
10205c2f0:     	stp	d9, d8, [sp, #0x90]
10205c2f4:     	stp	x28, x27, [sp, #0xa0]
10205c2f8:     	stp	x26, x25, [sp, #0xb0]
10205c2fc:     	stp	x24, x23, [sp, #0xc0]
10205c300:     	stp	x22, x21, [sp, #0xd0]
10205c304:     	stp	x20, x19, [sp, #0xe0]
10205c308:     	stp	x29, x30, [sp, #0xf0]
10205c30c:     	add	x29, sp, #0xf0
10205c310:     	mov	x19, x2
10205c314:     	mov	x20, x0
10205c318:     	bl	0x103be8960  SELECTOR inputMethodEventHandleMouseEvent:
10205c31c:     	tbnz	w0, #0x0, 0x10205c4e8
10205c320:     	mov	x0, x20
10205c324:     	bl	0x103beed00  SELECTOR window
10205c328:     	bl	0x103beed40  SELECTOR windowController
10205c32c:     	mov	x22, x0
10205c330:     	bl	0x103be95e0  SELECTOR legacyWindowObject
10205c334:     	cbz	x0, 0x10205c4dc
10205c338:     	mov	x21, x0
10205c33c:     	ldr	x8, [x0, #0x38]
10205c340:     	cbz	x8, 0x10205c4dc
10205c344:     	adrp	x8, 0x104af8000
10205c348:     	ldrsw	x8, [x8, #0xd5c]
10205c34c:     	ldrb	w8, [x20, x8]
10205c350:     	tbnz	w8, #0x0, 0x10205c388
10205c354:     	mov	x0, x20
10205c358:     	bl	0x103beed00  SELECTOR window
10205c35c:     	bl	0x103be9620  SELECTOR level
10205c360:     	cmp	x0, #0x65
10205c364:     	b.eq	0x10205c37c
10205c368:     	mov	x0, x20
10205c36c:     	bl	0x103beed00  SELECTOR window
10205c370:     	bl	0x103be9620  SELECTOR level
10205c374:     	cmp	x0, #0x8
10205c378:     	b.ne	0x10205c388
10205c37c:     	mov	x0, x20
10205c380:     	mov	x2, x19
10205c384:     	bl	0x103be9e80  SELECTOR mouseEntered:
10205c388:     	mov	x0, x19
10205c38c:     	bl	0x103bee740  SELECTOR type
10205c390:     	mov	x23, x0
10205c394:     	mov	x0, x22
10205c398:     	bl	0x103beeec0  SELECTOR windowResizing
10205c39c:     	tbnz	w0, #0x0, 0x10205c3ac
10205c3a0:     	mov	x0, x22
10205c3a4:     	bl	0x103beedc0  SELECTOR windowMoved
10205c3a8:     	cbz	w0, 0x10205c3bc
10205c3ac:     	mov	x0, x20
10205c3b0:     	bl	0x103beed00  SELECTOR window
10205c3b4:     	bl	0x103be9ee0  SELECTOR mouseLocationOutsideOfEventStream
10205c3b8:     	b	0x10205c3c4
10205c3bc:     	mov	x0, x19
10205c3c0:     	bl	0x103be97c0  SELECTOR locationInWindow
10205c3c4:     	mov	x0, x20
10205c3c8:     	mov	x2, #0x0                ; =0
10205c3cc:     	bl	0x103be65e0  SELECTOR convertPoint:fromView:
10205c3d0:     	fmov	d8, d0
10205c3d4:     	fmov	d9, d1
10205c3d8:     	mov	w24, #0x1               ; =1
10205c3dc:     	cmp	x23, #0x6
10205c3e0:     	b.eq	0x10205c40c
10205c3e4:     	cmp	x23, #0x1b
10205c3e8:     	b.eq	0x10205c3fc
10205c3ec:     	cmp	x23, #0x7
10205c3f0:     	b.ne	0x10205c404
10205c3f4:     	mov	w25, #0x2               ; =2
10205c3f8:     	b	0x10205c410
10205c3fc:     	mov	x0, x19
10205c400:     	bl	0x103be5b20  SELECTOR buttonNumber
10205c404:     	mov	w25, #0x0               ; =0
10205c408:     	b	0x10205c410
10205c40c:     	mov	w25, #0x1               ; =1
10205c410:     	mov	x0, x19
10205c414:     	bl	0x103bee4c0  SELECTOR timestamp
10205c418:     	adrp	x26, 0x1048c8000
10205c41c:     	ldr	x26, [x26, #0x538]
10205c420:     	ldr	x0, [x26]
10205c424:     	mov	x2, x19
10205c428:     	bl	0x103be6a00  SELECTOR currentPenTypeWithEvent:
10205c42c:     	mov	x22, x0
10205c430:     	adrp	x8, 0x104c8e000
10205c434:     	str	w0, [x8, #0x4f4]
10205c438:     	mov	x0, x19
10205c43c:     	bl	0x103bee4c0  SELECTOR timestamp
10205c440:     	adrp	x8, 0x1042ec000
10205c444:     	ldr	d1, [x8, #0xf58]
10205c448:     	fmul	d0, d0, d1
10205c44c:     	fcvtzs	x27, d0
10205c450:     	mov	x0, x19
10205c454:     	bl	0x103be9d00  SELECTOR modifierFlags
10205c458:     	mov	x23, x0
10205c45c:     	ldr	x0, [x26]
10205c460:     	bl	0x103beaf00  SELECTOR proxyModifierFlags
10205c464:     	orr	x2, x0, x23
10205c468:     	and	x23, x2, #0xffff0000
10205c46c:     	adrp	x8, 0x104af8000
10205c470:     	ldr	x0, [x8, #0x778]
10205c474:     	bl	0x103be65c0  SELECTOR convertModifierFlags:
10205c478:     	stp	d8, d9, [sp, #0x8]
10205c47c:     	str	w25, [sp, #0x18]
10205c480:     	str	x23, [sp, #0x20]
10205c484:     	str	w0, [sp, #0x28]
10205c488:     	stur	xzr, [sp, #0x2c]
10205c48c:     	stur	xzr, [sp, #0x3c]
10205c490:     	stur	xzr, [sp, #0x34]
10205c494:     	str	wzr, [sp, #0x44]
10205c498:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
10205c49c:     	stp	x27, x8, [sp, #0x50]
10205c4a0:     	adrp	x9, 0x104484000
10205c4a4:     	ldr	d0, [x9, #0xf30]
10205c4a8:     	str	d0, [sp, #0x60]
10205c4ac:     	stp	wzr, w22, [sp, #0x68]
10205c4b0:     	str	wzr, [sp, #0x70]
10205c4b4:     	stp	xzr, xzr, [sp, #0x78]
10205c4b8:     	str	x8, [sp, #0x88]
10205c4bc:     	str	w24, [sp]
10205c4c0:     	adrp	x22, 0x104c8e000
10205c4c4:     	strb	w24, [x22, #0x4f2]
10205c4c8:     	ldr	x8, [x21, #0x38]
10205c4cc:     	mov	x1, sp
10205c4d0:     	mov	x0, x21
10205c4d4:     	blr	x8
10205c4d8:     	strb	wzr, [x22, #0x4f2]
10205c4dc:     	mov	x0, x20
10205c4e0:     	mov	x2, x19
10205c4e4:     	bl	0x103be6a60  SELECTOR cursorEvent:
10205c4e8:     	ldp	x29, x30, [sp, #0xf0]
10205c4ec:     	ldp	x20, x19, [sp, #0xe0]
10205c4f0:     	ldp	x22, x21, [sp, #0xd0]
10205c4f4:     	ldp	x24, x23, [sp, #0xc0]
10205c4f8:     	ldp	x26, x25, [sp, #0xb0]
10205c4fc:     	ldp	x28, x27, [sp, #0xa0]
10205c500:     	ldp	d9, d8, [sp, #0x90]
10205c504:     	add	sp, sp, #0x100
10205c508:     	ret

FUNCTION 0x10205c50c size 4
10205c50c:     	b	0x103be9e60

FUNCTION 0x10205c510 size 4
10205c510:     	b	0x103be9e60

FUNCTION 0x10205c514 size 372
10205c514:     	sub	sp, sp, #0xe0
10205c518:     	stp	d9, d8, [sp, #0x90]
10205c51c:     	stp	x24, x23, [sp, #0xa0]
10205c520:     	stp	x22, x21, [sp, #0xb0]
10205c524:     	stp	x20, x19, [sp, #0xc0]
10205c528:     	stp	x29, x30, [sp, #0xd0]
10205c52c:     	add	x29, sp, #0xd0
10205c530:     	mov	x20, x2
10205c534:     	mov	x19, x0
10205c538:     	bl	0x103be8960  SELECTOR inputMethodEventHandleMouseEvent:
10205c53c:     	tbnz	w0, #0x0, 0x10205c660
10205c540:     	bl	0x10207a668
10205c544:     	cbnz	x0, 0x10205c660
10205c548:     	adrp	x8, 0x104af8000
10205c54c:     	ldrsw	x8, [x8, #0xd5c]
10205c550:     	mov	w9, #0x1                ; =1
10205c554:     	strb	w9, [x19, x8]
10205c558:     	mov	x0, x19
10205c55c:     	bl	0x103beed00  SELECTOR window
10205c560:     	bl	0x103beed40  SELECTOR windowController
10205c564:     	bl	0x103be95e0  SELECTOR legacyWindowObject
10205c568:     	cbz	x0, 0x10205c644
10205c56c:     	mov	x21, x0
10205c570:     	ldr	x8, [x0, #0x38]
10205c574:     	cbz	x8, 0x10205c644
10205c578:     	mov	x0, x20
10205c57c:     	bl	0x103be97c0  SELECTOR locationInWindow
10205c580:     	mov	x0, x19
10205c584:     	mov	x2, #0x0                ; =0
10205c588:     	bl	0x103be65e0  SELECTOR convertPoint:fromView:
10205c58c:     	fmov	d8, d0
10205c590:     	fmov	d9, d1
10205c594:     	adrp	x24, 0x1048c8000
10205c598:     	ldr	x24, [x24, #0x538]
10205c59c:     	ldr	x0, [x24]
10205c5a0:     	mov	x2, x20
10205c5a4:     	bl	0x103be6a00  SELECTOR currentPenTypeWithEvent:
10205c5a8:     	mov	x22, x0
10205c5ac:     	mov	x0, x20
10205c5b0:     	bl	0x103be9d00  SELECTOR modifierFlags
10205c5b4:     	mov	x23, x0
10205c5b8:     	ldr	x0, [x24]
10205c5bc:     	bl	0x103beaf00  SELECTOR proxyModifierFlags
10205c5c0:     	orr	x23, x0, x23
10205c5c4:     	adrp	x8, 0x104af8000
10205c5c8:     	ldr	x0, [x8, #0x778]
10205c5cc:     	mov	x2, x23
10205c5d0:     	bl	0x103be65c0  SELECTOR convertModifierFlags:
10205c5d4:     	ldr	w8, [x21, #0xd8]
10205c5d8:     	cbnz	w8, 0x10205c644
10205c5dc:     	mov	w8, #0x1                ; =1
10205c5e0:     	str	w8, [x21, #0xd8]
10205c5e4:     	and	x8, x23, #0xffff0000
10205c5e8:     	stp	d8, d9, [sp, #0x8]
10205c5ec:     	str	wzr, [sp, #0x18]
10205c5f0:     	str	x8, [sp, #0x20]
10205c5f4:     	str	w0, [sp, #0x28]
10205c5f8:     	stur	xzr, [sp, #0x3c]
10205c5fc:     	stur	xzr, [sp, #0x34]
10205c600:     	str	wzr, [sp, #0x44]
10205c604:     	stur	xzr, [sp, #0x2c]
10205c608:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
10205c60c:     	str	x8, [sp, #0x58]
10205c610:     	adrp	x9, 0x104484000
10205c614:     	ldr	d0, [x9, #0xf30]
10205c618:     	str	d0, [sp, #0x60]
10205c61c:     	stp	wzr, w22, [sp, #0x68]
10205c620:     	str	wzr, [sp, #0x70]
10205c624:     	stp	xzr, xzr, [sp, #0x78]
10205c628:     	str	x8, [sp, #0x88]
10205c62c:     	mov	w8, #0x2                ; =2
10205c630:     	str	w8, [sp]
10205c634:     	ldr	x8, [x21, #0x38]
10205c638:     	mov	x1, sp
10205c63c:     	mov	x0, x21
10205c640:     	blr	x8
10205c644:     	mov	x0, x19
10205c648:     	mov	x2, x20
10205c64c:     	bl	0x103be6a60  SELECTOR cursorEvent:
10205c650:     	mov	x0, x19
10205c654:     	bl	0x103beed00  SELECTOR window
10205c658:     	mov	w2, #0x1                ; =1
10205c65c:     	bl	0x103bebdc0  SELECTOR setAcceptsMouseMovedEvents:
10205c660:     	ldp	x29, x30, [sp, #0xd0]
10205c664:     	ldp	x20, x19, [sp, #0xc0]
10205c668:     	ldp	x22, x21, [sp, #0xb0]
10205c66c:     	ldp	x24, x23, [sp, #0xa0]
10205c670:     	ldp	d9, d8, [sp, #0x90]
10205c674:     	add	sp, sp, #0xe0
10205c678:     	ret
10205c67c:     	bl	0x103bdd3dc
10205c680:     	bl	0x103bdd3f4
10205c684:     	b	0x10205c644

FUNCTION 0x10205c688 size 360
10205c688:     	sub	sp, sp, #0xc0
10205c68c:     	stp	x22, x21, [sp, #0x90]
10205c690:     	stp	x20, x19, [sp, #0xa0]
10205c694:     	stp	x29, x30, [sp, #0xb0]
10205c698:     	add	x29, sp, #0xb0
10205c69c:     	mov	x20, x2
10205c6a0:     	mov	x19, x0
10205c6a4:     	bl	0x103be8960  SELECTOR inputMethodEventHandleMouseEvent:
10205c6a8:     	tbnz	w0, #0x0, 0x10205c7dc
10205c6ac:     	bl	0x10207a668
10205c6b0:     	cbnz	x0, 0x10205c7dc
10205c6b4:     	adrp	x8, 0x104af8000
10205c6b8:     	ldrsw	x8, [x8, #0xd70]
10205c6bc:     	ldrb	w8, [x19, x8]
10205c6c0:     	cmp	w8, #0x1
10205c6c4:     	b.ne	0x10205c6d8
10205c6c8:     	mov	x0, x19
10205c6cc:     	bl	0x103be7b60  SELECTOR gesturesEndCallback
10205c6d0:     	mov	x0, x19
10205c6d4:     	bl	0x103bee580  SELECTOR touchesEndedCallback
10205c6d8:     	mov	x0, x19
10205c6dc:     	bl	0x103beed00  SELECTOR window
10205c6e0:     	bl	0x103beed40  SELECTOR windowController
10205c6e4:     	bl	0x103be95e0  SELECTOR legacyWindowObject
10205c6e8:     	mov	x21, x0
10205c6ec:     	adrp	x8, 0x104af8000
10205c6f0:     	ldrsw	x8, [x8, #0xd5c]
10205c6f4:     	strb	wzr, [x19, x8]
10205c6f8:     	adrp	x8, 0x104af8000
10205c6fc:     	ldrsw	x8, [x8, #0xd60]
10205c700:     	mov	w9, #0xf                ; =15
10205c704:     	str	w9, [x19, x8]
10205c708:     	mov	x0, x19
10205c70c:     	mov	x2, x20
10205c710:     	bl	0x103be6a60  SELECTOR cursorEvent:
10205c714:     	cbz	x21, 0x10205c7b8
10205c718:     	ldr	x8, [x21, #0x38]
10205c71c:     	cbz	x8, 0x10205c7b8
10205c720:     	str	wzr, [x21, #0xd8]
10205c724:     	mov	w8, #0x3                ; =3
10205c728:     	str	w8, [sp]
10205c72c:     	adrp	x22, 0x1048c8000
10205c730:     	ldr	x22, [x22, #0x538]
10205c734:     	ldr	x0, [x22]
10205c738:     	mov	x2, x20
10205c73c:     	bl	0x103be6a00  SELECTOR currentPenTypeWithEvent:
10205c740:     	stur	xzr, [sp, #0x2c]
10205c744:     	stur	xzr, [sp, #0x3c]
10205c748:     	stur	xzr, [sp, #0x34]
10205c74c:     	str	w0, [sp, #0x6c]
10205c750:     	str	wzr, [sp, #0x44]
10205c754:     	mov	x0, x20
10205c758:     	bl	0x103be9d00  SELECTOR modifierFlags
10205c75c:     	mov	x20, x0
10205c760:     	ldr	x0, [x22]
10205c764:     	bl	0x103beaf00  SELECTOR proxyModifierFlags
10205c768:     	orr	x2, x0, x20
10205c76c:     	and	x8, x2, #0xffff0000
10205c770:     	str	x8, [sp, #0x20]
10205c774:     	adrp	x8, 0x104af8000
10205c778:     	ldr	x0, [x8, #0x778]
10205c77c:     	bl	0x103be65c0  SELECTOR convertModifierFlags:
10205c780:     	str	w0, [sp, #0x28]
10205c784:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
10205c788:     	str	x8, [sp, #0x58]
10205c78c:     	adrp	x9, 0x104484000
10205c790:     	ldr	d0, [x9, #0xf30]
10205c794:     	str	d0, [sp, #0x60]
10205c798:     	str	wzr, [sp, #0x68]
10205c79c:     	str	wzr, [sp, #0x70]
10205c7a0:     	stp	xzr, xzr, [sp, #0x78]
10205c7a4:     	str	x8, [sp, #0x88]
10205c7a8:     	ldr	x8, [x21, #0x38]
10205c7ac:     	mov	x1, sp
10205c7b0:     	mov	x0, x21
10205c7b4:     	blr	x8
10205c7b8:     	mov	x0, x19
10205c7bc:     	bl	0x103beed00  SELECTOR window
10205c7c0:     	bl	0x103be9620  SELECTOR level
10205c7c4:     	cmp	x0, #0x65
10205c7c8:     	b.eq	0x10205c7dc
10205c7cc:     	mov	x0, x19
10205c7d0:     	bl	0x103beed00  SELECTOR window
10205c7d4:     	mov	w2, #0x0                ; =0
10205c7d8:     	bl	0x103bebdc0  SELECTOR setAcceptsMouseMovedEvents:
10205c7dc:     	ldp	x29, x30, [sp, #0xb0]
10205c7e0:     	ldp	x20, x19, [sp, #0xa0]
10205c7e4:     	ldp	x22, x21, [sp, #0x90]
10205c7e8:     	add	sp, sp, #0xc0
10205c7ec:     	ret

FUNCTION 0x10205c7f0 size 12
10205c7f0:     	adrp	x8, 0x104c8e000
10205c7f4:     	ldrb	w0, [x8, #0x4f8]
10205c7f8:     	ret

FUNCTION 0x10205c7fc size 1120
10205c7fc:     	sub	sp, sp, #0xf0
10205c800:     	stp	x28, x27, [sp, #0x90]
10205c804:     	stp	x26, x25, [sp, #0xa0]
10205c808:     	stp	x24, x23, [sp, #0xb0]
10205c80c:     	stp	x22, x21, [sp, #0xc0]
10205c810:     	stp	x20, x19, [sp, #0xd0]
10205c814:     	stp	x29, x30, [sp, #0xe0]
10205c818:     	add	x29, sp, #0xe0
10205c81c:     	mov	x19, x2
10205c820:     	mov	x23, x0
10205c824:     	bl	0x103be8960  SELECTOR inputMethodEventHandleMouseEvent:
10205c828:     	tbnz	w0, #0x0, 0x10205cc08
10205c82c:     	adrp	x8, 0x104c8e000
10205c830:     	strb	wzr, [x8, #0x4f8]
10205c834:     	mov	x0, x23
10205c838:     	bl	0x103beed00  SELECTOR window
10205c83c:     	mov	x26, x0
10205c840:     	bl	0x103beed40  SELECTOR windowController
10205c844:     	bl	0x103be95e0  SELECTOR legacyWindowObject
10205c848:     	cbz	x0, 0x10205cc08
10205c84c:     	mov	x20, x0
10205c850:     	mov	x0, x19
10205c854:     	bl	0x103bee740  SELECTOR type
10205c858:     	mov	x22, x0
10205c85c:     	mov	x0, x19
10205c860:     	bl	0x103be9d00  SELECTOR modifierFlags
10205c864:     	mov	x24, x0
10205c868:     	adrp	x28, 0x1048c8000
10205c86c:     	ldr	x28, [x28, #0x538]
10205c870:     	ldr	x0, [x28]
10205c874:     	bl	0x103beaf00  SELECTOR proxyModifierFlags
10205c878:     	mov	x25, x0
10205c87c:     	mov	x0, x19
10205c880:     	bl	0x103be60c0  SELECTOR clickCount
10205c884:     	mov	x21, x0
10205c888:     	mov	w8, #0x1                ; =1
10205c88c:     	lsl	w8, w8, w22
10205c890:     	sxtw	x8, w8
10205c894:     	adrp	x9, 0x104af8000
10205c898:     	ldrsw	x9, [x9, #0xd64]
10205c89c:     	ldr	x10, [x23, x9]
10205c8a0:     	orr	x8, x10, x8
10205c8a4:     	str	x8, [x23, x9]
10205c8a8:     	adrp	x8, 0x104af8000
10205c8ac:     	ldrsw	x8, [x8, #0xd74]
10205c8b0:     	str	xzr, [x23, x8]
10205c8b4:     	bl	0x10207a668
10205c8b8:     	cmp	x20, x0
10205c8bc:     	b.eq	0x10205c950
10205c8c0:     	mov	x0, x26
10205c8c4:     	bl	0x103beed40  SELECTOR windowController
10205c8c8:     	bl	0x103be9200  SELECTOR isWindowStyleNative
10205c8cc:     	mov	x27, x0
10205c8d0:     	adrp	x8, 0x104af8000
10205c8d4:     	ldrsw	x8, [x8, #0xd5c]
10205c8d8:     	ldrb	w8, [x23, x8]
10205c8dc:     	tbnz	w8, #0x0, 0x10205c8f0
10205c8e0:     	mov	x0, x23
10205c8e4:     	bl	0x103beed00  SELECTOR window
10205c8e8:     	mov	w2, #0x1                ; =1
10205c8ec:     	bl	0x103bebdc0  SELECTOR setAcceptsMouseMovedEvents:
10205c8f0:     	ldr	x8, [x20, #0x28]
10205c8f4:     	cbz	x8, 0x10205c950
10205c8f8:     	cmp	x22, #0x3
10205c8fc:     	b.eq	0x10205c950
10205c900:     	mov	w8, #0x1                ; =1
10205c904:     	mov	w9, #0xe                ; =14
10205c908:     	str	w8, [sp]
10205c90c:     	str	w9, [sp, #0x10]
10205c910:     	mov	x0, x19
10205c914:     	bl	0x103be97c0  SELECTOR locationInWindow
10205c918:     	mov	x0, x23
10205c91c:     	mov	x2, #0x0                ; =0
10205c920:     	bl	0x103be65e0  SELECTOR convertPoint:fromView:
10205c924:     	fcvtzs	w8, d0
10205c928:     	fcvtzs	w9, d1
10205c92c:     	orr	x8, x8, x9, lsl #32
10205c930:     	stur	x8, [sp, #0x4]
10205c934:     	ldr	x8, [x20, #0x28]
10205c938:     	mov	x1, sp
10205c93c:     	mov	x0, x20
10205c940:     	blr	x8
10205c944:     	ldr	w3, [sp, #0x10]
10205c948:     	cmp	w3, #0x1
10205c94c:     	b.ne	0x10205c980
10205c950:     	mov	x0, x26
10205c954:     	bl	0x103be5c80  SELECTOR canBecomeMainWindow
10205c958:     	cbz	w0, 0x10205c9c4
10205c95c:     	mov	x0, x26
10205c960:     	bl	0x103be8ee0  SELECTOR isMainWindow
10205c964:     	tbnz	w0, #0x0, 0x10205c9c4
10205c968:     	ldr	x0, [x28]
10205c96c:     	bl	0x103be9080  SELECTOR isRunModal
10205c970:     	tbz	w0, #0x0, 0x10205c9a0
10205c974:     	mov	x0, x26
10205c978:     	bl	0x103be9a80  SELECTOR makeMainWindow
10205c97c:     	b	0x10205c9c4
10205c980:     	cmp	w3, #0x2
10205c984:     	csinc	w8, w27, wzr, eq
10205c988:     	tbz	w8, #0x0, 0x10205ca54
10205c98c:     	sub	w8, w3, #0xe
10205c990:     	cmn	w8, #0x8
10205c994:     	csinc	w8, w27, wzr, hs
10205c998:     	tbnz	w8, #0x0, 0x10205c950
10205c99c:     	b	0x10205cc38
10205c9a0:     	mov	x0, x26
10205c9a4:     	mov	x2, #0x0                ; =0
10205c9a8:     	bl	0x103be9a40  SELECTOR makeKeyAndOrderFront:
10205c9ac:     	mov	x0, x26
10205c9b0:     	bl	0x103be5c80  SELECTOR canBecomeMainWindow
10205c9b4:     	cbz	w0, 0x10205c9c4
10205c9b8:     	mov	x0, x26
10205c9bc:     	bl	0x103be9a80  SELECTOR makeMainWindow
10205c9c0:     	b	0x10205cc08
10205c9c4:     	ldr	x8, [x20, #0x38]
10205c9c8:     	cbz	x8, 0x10205cbf8
10205c9cc:     	ldr	x0, [x28]
10205c9d0:     	mov	x2, x19
10205c9d4:     	bl	0x103be9160  SELECTOR isTabletEvent:
10205c9d8:     	cbz	w0, 0x10205ca00
10205c9dc:     	cmp	x22, #0x1
10205c9e0:     	b.ne	0x10205ca00
10205c9e4:     	bl	0x1020be504
10205c9e8:     	cbnz	w0, 0x10205ca00
10205c9ec:     	ldr	x0, [x28]
10205c9f0:     	mov	x2, x19
10205c9f4:     	mov	w3, #0x4                ; =4
10205c9f8:     	mov	w4, #0x0                ; =0
10205c9fc:     	bl	0x103bee260  SELECTOR tabletEvent:tabletEventKind:useLastPenAttitude:
10205ca00:     	orr	x24, x25, x24
10205ca04:     	mov	x0, x19
10205ca08:     	bl	0x103be97c0  SELECTOR locationInWindow
10205ca0c:     	mov	x0, x23
10205ca10:     	mov	x2, #0x0                ; =0
10205ca14:     	bl	0x103be65e0  SELECTOR convertPoint:fromView:
10205ca18:     	cmp	x22, #0x1
10205ca1c:     	b.ne	0x10205ca2c
10205ca20:     	tbnz	w21, #0x0, 0x10205ca40
10205ca24:     	mov	w8, #0x5                ; =5
10205ca28:     	b	0x10205caa4
10205ca2c:     	cmp	x22, #0x3
10205ca30:     	b.ne	0x10205ca48
10205ca34:     	tbnz	w21, #0x0, 0x10205ca98
10205ca38:     	mov	w8, #0x8                ; =8
10205ca3c:     	b	0x10205caa4
10205ca40:     	mov	w8, #0x4                ; =4
10205ca44:     	b	0x10205caa4
10205ca48:     	tbnz	w21, #0x0, 0x10205caa0
10205ca4c:     	mov	w8, #0xb                ; =11
10205ca50:     	b	0x10205caa4
10205ca54:     	tbnz	w21, #0x0, 0x10205cc28
10205ca58:     	adrp	x19, 0x104af8000
10205ca5c:     	ldr	x0, [x19, #0x830]
10205ca60:     	bl	0x103be8f20  SELECTOR isMiniaturizeOnDoubleClick
10205ca64:     	cbz	w0, 0x10205ca70
10205ca68:     	ldrb	w8, [x20, #0xbc]
10205ca6c:     	tbnz	w8, #0x5, 0x10205cc48
10205ca70:     	ldr	x0, [x19, #0x830]
10205ca74:     	bl	0x103be8f00  SELECTOR isMaximizeOnDoubleClick
10205ca78:     	cbz	w0, 0x10205cc08
10205ca7c:     	ldrb	w8, [x20, #0xbc]
10205ca80:     	tbz	w8, #0x6, 0x10205cc08
10205ca84:     	mov	x0, x23
10205ca88:     	bl	0x103beed00  SELECTOR window
10205ca8c:     	mov	x2, x23
10205ca90:     	bl	0x103bef060  SELECTOR zoom:
10205ca94:     	b	0x10205cc08
10205ca98:     	mov	w8, #0x7                ; =7
10205ca9c:     	b	0x10205caa4
10205caa0:     	mov	w8, #0xa                ; =10
10205caa4:     	str	w8, [sp]
10205caa8:     	stp	d0, d1, [sp, #0x8]
10205caac:     	stur	xzr, [sp, #0x2c]
10205cab0:     	stur	xzr, [sp, #0x3c]
10205cab4:     	stur	xzr, [sp, #0x34]
10205cab8:     	mov	x8, #0xf00000000        ; =64424509440
10205cabc:     	stur	x8, [sp, #0x44]
10205cac0:     	str	wzr, [sp, #0x18]
10205cac4:     	cmp	x22, #0x1
10205cac8:     	b.ne	0x10205cad4
10205cacc:     	mov	w8, #0x1                ; =1
10205cad0:     	b	0x10205cb10
10205cad4:     	cmp	x22, #0x3
10205cad8:     	b.eq	0x10205cb0c
10205cadc:     	cmp	x22, #0x19
10205cae0:     	b.ne	0x10205cb14
10205cae4:     	mov	x0, x19
10205cae8:     	bl	0x103be5b20  SELECTOR buttonNumber
10205caec:     	cmp	x0, #0x4
10205caf0:     	mov	w8, #0x4                ; =4
10205caf4:     	mov	w9, #0x10               ; =16
10205caf8:     	csel	w8, w9, w8, eq
10205cafc:     	cmp	x0, #0x3
10205cb00:     	mov	w9, #0x8                ; =8
10205cb04:     	csel	w8, w9, w8, eq
10205cb08:     	b	0x10205cb10
10205cb0c:     	mov	w8, #0x2                ; =2
10205cb10:     	str	w8, [sp, #0x18]
10205cb14:     	adrp	x8, 0x104484000
10205cb18:     	ldr	d0, [x8, #0xf30]
10205cb1c:     	str	d0, [sp, #0x60]
10205cb20:     	str	wzr, [sp, #0x68]
10205cb24:     	ldr	x0, [x28]
10205cb28:     	mov	x2, x19
10205cb2c:     	bl	0x103be6a00  SELECTOR currentPenTypeWithEvent:
10205cb30:     	stp	w0, wzr, [sp, #0x6c]
10205cb34:     	mov	x0, x19
10205cb38:     	bl	0x103bee4c0  SELECTOR timestamp
10205cb3c:     	adrp	x8, 0x1042ec000
10205cb40:     	ldr	d1, [x8, #0xf58]
10205cb44:     	fmul	d0, d0, d1
10205cb48:     	fcvtzs	x8, d0
10205cb4c:     	and	x9, x24, #0xffff0000
10205cb50:     	str	x8, [sp, #0x50]
10205cb54:     	str	x9, [sp, #0x20]
10205cb58:     	adrp	x23, 0x104af8000
10205cb5c:     	ldr	x0, [x23, #0x778]
10205cb60:     	mov	x2, x24
10205cb64:     	bl	0x103be65c0  SELECTOR convertModifierFlags:
10205cb68:     	str	w0, [sp, #0x28]
10205cb6c:     	mov	x0, x19
10205cb70:     	bl	0x103bee160  SELECTOR subtype
10205cb74:     	fmov	d0, #1.00000000
10205cb78:     	cmp	w0, #0x1
10205cb7c:     	b.ne	0x10205cb8c
10205cb80:     	mov	x0, x19
10205cb84:     	bl	0x103bead20  SELECTOR pressure
10205cb88:     	fcvt	d0, s0
10205cb8c:     	str	d0, [sp, #0x58]
10205cb90:     	ldr	x8, [x20, #0x38]
10205cb94:     	mov	x1, sp
10205cb98:     	mov	x0, x20
10205cb9c:     	blr	x8
10205cba0:     	ldrb	w8, [x20, #0xc0]
10205cba4:     	tbz	w8, #0x6, 0x10205cbd4
10205cba8:     	cmp	x22, #0x1
10205cbac:     	b.ne	0x10205cbd4
10205cbb0:     	mov	x0, x19
10205cbb4:     	bl	0x103bee160  SELECTOR subtype
10205cbb8:     	cmp	w0, #0x1
10205cbbc:     	b.ne	0x10205cbd4
10205cbc0:     	ldr	x0, [x28]
10205cbc4:     	mov	x2, x19
10205cbc8:     	mov	w3, #0x6                ; =6
10205cbcc:     	mov	w4, #0x0                ; =0
10205cbd0:     	bl	0x103bee260  SELECTOR tabletEvent:tabletEventKind:useLastPenAttitude:
10205cbd4:     	bl	0x10204ba04
10205cbd8:     	tbnz	w21, #0x0, 0x10205cbe0
10205cbdc:     	cbz	w0, 0x10205cbf8
10205cbe0:     	adrp	x8, 0x104c8e000
10205cbe4:     	ldrb	w8, [x8, #0x4f8]
10205cbe8:     	tbnz	w8, #0x0, 0x10205cbf8
10205cbec:     	ldr	x0, [x23, #0x778]
10205cbf0:     	mov	x2, x19
10205cbf4:     	bl	0x103be9f00  SELECTOR mouseTrackingLoop:
10205cbf8:     	ldr	x0, [x28]
10205cbfc:     	bl	0x103be4fc0  SELECTOR activeDocumentWindow
10205cc00:     	mov	w2, #0x1                ; =1
10205cc04:     	bl	0x103bebd80  SELECTOR setAcceptsFirstMouse:
10205cc08:     	ldp	x29, x30, [sp, #0xe0]
10205cc0c:     	ldp	x20, x19, [sp, #0xd0]
10205cc10:     	ldp	x22, x21, [sp, #0xc0]
10205cc14:     	ldp	x24, x23, [sp, #0xb0]
10205cc18:     	ldp	x26, x25, [sp, #0xa0]
10205cc1c:     	ldp	x28, x27, [sp, #0x90]
10205cc20:     	add	sp, sp, #0xf0
10205cc24:     	ret
10205cc28:     	mov	x0, x23
10205cc2c:     	mov	x2, x19
10205cc30:     	bl	0x103be6a60  SELECTOR cursorEvent:
10205cc34:     	ldr	w3, [sp, #0x10]
10205cc38:     	mov	x0, x23
10205cc3c:     	mov	x2, x19
10205cc40:     	bl	0x103beb5a0  SELECTOR resizeWindowEvent:withPart:
10205cc44:     	b	0x10205cc08
10205cc48:     	mov	x0, x23
10205cc4c:     	bl	0x103beed00  SELECTOR window
10205cc50:     	mov	x2, x23
10205cc54:     	bl	0x103be9c80  SELECTOR miniaturize:
10205cc58:     	b	0x10205cc08

FUNCTION 0x10205cc5c size 4
10205cc5c:     	b	0x103be9e20

FUNCTION 0x10205cc60 size 4
10205cc60:     	b	0x103be9e20

FUNCTION 0x10205cc64 size 640
10205cc64:     	sub	sp, sp, #0x100
10205cc68:     	stp	d9, d8, [sp, #0x90]
10205cc6c:     	stp	x28, x27, [sp, #0xa0]
10205cc70:     	stp	x26, x25, [sp, #0xb0]
10205cc74:     	stp	x24, x23, [sp, #0xc0]
10205cc78:     	stp	x22, x21, [sp, #0xd0]
10205cc7c:     	stp	x20, x19, [sp, #0xe0]
10205cc80:     	stp	x29, x30, [sp, #0xf0]
10205cc84:     	add	x29, sp, #0xf0
10205cc88:     	mov	x20, x2
10205cc8c:     	mov	x21, x0
10205cc90:     	bl	0x103be8960  SELECTOR inputMethodEventHandleMouseEvent:
10205cc94:     	tbnz	w0, #0x0, 0x10205cec0
10205cc98:     	mov	x0, x21
10205cc9c:     	bl	0x103beed00  SELECTOR window
10205cca0:     	bl	0x103beed40  SELECTOR windowController
10205cca4:     	bl	0x103bdf6bc
10205cca8:     	mov	x19, x0
10205ccac:     	mov	x0, x20
10205ccb0:     	bl	0x103bee740  SELECTOR type
10205ccb4:     	mov	x22, x0
10205ccb8:     	mov	x0, x19
10205ccbc:     	bl	0x103beedc0  SELECTOR windowMoved
10205ccc0:     	adrp	x25, 0x104af8000
10205ccc4:     	cbz	w0, 0x10205ccd0
10205ccc8:     	ldr	x0, [x25, #0x778]
10205cccc:     	bl	0x103bee920  SELECTOR updateKeyState
10205ccd0:     	mov	x0, x19
10205ccd4:     	bl	0x103be95e0  SELECTOR legacyWindowObject
10205ccd8:     	mov	x23, x0
10205ccdc:     	adrp	x8, 0x104af8000
10205cce0:     	ldrsw	x8, [x8, #0xd64]
10205cce4:     	ldr	x9, [x21, x8]
10205cce8:     	mov	w10, #0x2000000         ; =33554432
10205ccec:     	mov	w11, #0x8               ; =8
10205ccf0:     	cmp	x22, #0x4
10205ccf4:     	csel	x10, x11, x10, eq
10205ccf8:     	cmp	x22, #0x2
10205ccfc:     	csel	x10, x22, x10, eq
10205cd00:     	tst	x9, x10
10205cd04:     	b.eq	0x10205cd10
10205cd08:     	eor	x9, x9, x10
10205cd0c:     	str	x9, [x21, x8]
10205cd10:     	adrp	x26, 0x1048c8000
10205cd14:     	ldr	x26, [x26, #0x538]
10205cd18:     	ldr	x0, [x26]
10205cd1c:     	mov	x2, x20
10205cd20:     	bl	0x103be9160  SELECTOR isTabletEvent:
10205cd24:     	cmp	x22, #0x2
10205cd28:     	b.ne	0x10205cd44
10205cd2c:     	cbz	w0, 0x10205cd44
10205cd30:     	ldr	x0, [x26]
10205cd34:     	mov	x2, x20
10205cd38:     	mov	w3, #0x6                ; =6
10205cd3c:     	mov	w4, #0x0                ; =0
10205cd40:     	bl	0x103bee260  SELECTOR tabletEvent:tabletEventKind:useLastPenAttitude:
10205cd44:     	cbz	x23, 0x10205ce78
10205cd48:     	ldr	x8, [x23, #0x38]
10205cd4c:     	cbz	x8, 0x10205ce78
10205cd50:     	mov	x0, x20
10205cd54:     	bl	0x103be97c0  SELECTOR locationInWindow
10205cd58:     	mov	x0, x21
10205cd5c:     	mov	x2, #0x0                ; =0
10205cd60:     	bl	0x103be65e0  SELECTOR convertPoint:fromView:
10205cd64:     	fmov	d8, d0
10205cd68:     	fmov	d9, d1
10205cd6c:     	ldr	x0, [x26]
10205cd70:     	mov	x2, x20
10205cd74:     	bl	0x103be6a00  SELECTOR currentPenTypeWithEvent:
10205cd78:     	str	w0, [sp, #0x6c]
10205cd7c:     	str	wzr, [sp, #0x18]
10205cd80:     	cmp	x22, #0x1a
10205cd84:     	b.eq	0x10205cd98
10205cd88:     	cmp	x22, #0x4
10205cd8c:     	b.ne	0x10205cda0
10205cd90:     	mov	w8, #0x9                ; =9
10205cd94:     	b	0x10205cda4
10205cd98:     	mov	w8, #0xc                ; =12
10205cd9c:     	b	0x10205cda4
10205cda0:     	mov	w8, #0x6                ; =6
10205cda4:     	str	w8, [sp]
10205cda8:     	adrp	x27, 0x104af8000
10205cdac:     	ldr	x0, [x27, #0x790]
10205cdb0:     	bl	0x103beb6c0  SELECTOR retainClipBoardChangedEventIfNeed
10205cdb4:     	mov	x0, x20
10205cdb8:     	bl	0x103be9d00  SELECTOR modifierFlags
10205cdbc:     	mov	x24, x0
10205cdc0:     	ldr	x0, [x26]
10205cdc4:     	bl	0x103beaf00  SELECTOR proxyModifierFlags
10205cdc8:     	orr	x2, x0, x24
10205cdcc:     	and	x8, x2, #0xffff0000
10205cdd0:     	str	x8, [sp, #0x20]
10205cdd4:     	ldr	x0, [x25, #0x778]
10205cdd8:     	bl	0x103be65c0  SELECTOR convertModifierFlags:
10205cddc:     	str	w0, [sp, #0x28]
10205cde0:     	stp	d8, d9, [sp, #0x8]
10205cde4:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
10205cde8:     	str	x8, [sp, #0x58]
10205cdec:     	str	wzr, [sp, #0x68]
10205cdf0:     	adrp	x9, 0x104484000
10205cdf4:     	ldr	d0, [x9, #0xf30]
10205cdf8:     	str	d0, [sp, #0x60]
10205cdfc:     	stp	xzr, xzr, [sp, #0x78]
10205ce00:     	str	x8, [sp, #0x88]
10205ce04:     	stur	xzr, [sp, #0x2c]
10205ce08:     	stur	xzr, [sp, #0x3c]
10205ce0c:     	stur	xzr, [sp, #0x34]
10205ce10:     	str	wzr, [sp, #0x44]
10205ce14:     	mov	x0, x20
10205ce18:     	bl	0x103bee4c0  SELECTOR timestamp
10205ce1c:     	adrp	x8, 0x1042ec000
10205ce20:     	ldr	d1, [x8, #0xf58]
10205ce24:     	fmul	d0, d0, d1
10205ce28:     	fcvtzs	x8, d0
10205ce2c:     	str	x8, [sp, #0x50]
10205ce30:     	ldr	x8, [x23, #0x38]
10205ce34:     	mov	x1, sp
10205ce38:     	mov	x0, x23
10205ce3c:     	blr	x8
10205ce40:     	mov	x0, x21
10205ce44:     	mov	x2, x20
10205ce48:     	bl	0x103be8920  SELECTOR inputMethodEventHandleKeyDownEvent:
10205ce4c:     	tbnz	w0, #0x0, 0x10205ce58
10205ce50:     	ldr	x0, [x25, #0x778]
10205ce54:     	bl	0x103bee920  SELECTOR updateKeyState
10205ce58:     	ldr	x0, [x27, #0x790]
10205ce5c:     	bl	0x103beb0e0  SELECTOR releaseClipBoardChangedEventIfNeed
10205ce60:     	ldr	x0, [x26]
10205ce64:     	bl	0x103be8fc0  SELECTOR isMouseTrackingLoop
10205ce68:     	tbnz	w0, #0x0, 0x10205ce78
10205ce6c:     	mov	x0, x21
10205ce70:     	mov	x2, x20
10205ce74:     	bl	0x103bebc80  SELECTOR sendLegacyMouseMovedEvent:
10205ce78:     	mov	w8, #0x1                ; =1
10205ce7c:     	adrp	x9, 0x104c8e000
10205ce80:     	strb	w8, [x9, #0x4f8]
10205ce84:     	ldr	x0, [x25, #0x778]
10205ce88:     	mov	x2, x20
10205ce8c:     	bl	0x103beaba0  SELECTOR popupMenuTrackingLoop:
10205ce90:     	cmp	x22, #0x2
10205ce94:     	b.ne	0x10205ceb8
10205ce98:     	mov	x0, x19
10205ce9c:     	bl	0x103beeec0  SELECTOR windowResizing
10205cea0:     	cbz	w0, 0x10205ceb8
10205cea4:     	mov	x0, x19
10205cea8:     	mov	w2, #0x0                ; =0
10205ceac:     	bl	0x103bed720  SELECTOR setWindowResizing:
10205ceb0:     	mov	x0, x19
10205ceb4:     	bl	0x103beeea0  SELECTOR windowResizeEnd
10205ceb8:     	mov	x0, x19
10205cebc:     	bl	0x103bdf6b0
10205cec0:     	ldp	x29, x30, [sp, #0xf0]
10205cec4:     	ldp	x20, x19, [sp, #0xe0]
10205cec8:     	ldp	x22, x21, [sp, #0xd0]
10205cecc:     	ldp	x24, x23, [sp, #0xc0]
10205ced0:     	ldp	x26, x25, [sp, #0xb0]
10205ced4:     	ldp	x28, x27, [sp, #0xa0]
10205ced8:     	ldp	d9, d8, [sp, #0x90]
10205cedc:     	add	sp, sp, #0x100
10205cee0:     	ret

FUNCTION 0x10205cee4 size 4
10205cee4:     	b	0x103be9f20

FUNCTION 0x10205cee8 size 4
10205cee8:     	b	0x103be9f20

FUNCTION 0x10205ceec size 24
10205ceec:     	adrp	x8, 0x1048c8000
10205cef0:     	ldr	x8, [x8, #0x538]
10205cef4:     	ldr	x0, [x8]
10205cef8:     	mov	w3, #0x1                ; =1
10205cefc:     	mov	w4, #0x0                ; =0
10205cf00:     	b	0x103bee260

FUNCTION 0x10205cf04 size 488
10205cf04:     	sub	sp, sp, #0x100
10205cf08:     	stp	d9, d8, [sp, #0xb0]
10205cf0c:     	stp	x24, x23, [sp, #0xc0]
10205cf10:     	stp	x22, x21, [sp, #0xd0]
10205cf14:     	stp	x20, x19, [sp, #0xe0]
10205cf18:     	stp	x29, x30, [sp, #0xf0]
10205cf1c:     	add	x29, sp, #0xf0
10205cf20:     	mov	x19, x2
10205cf24:     	mov	x21, x0
10205cf28:     	bl	0x10204ba04
10205cf2c:     	cbz	w0, 0x10205cf4c
10205cf30:     	ldp	x29, x30, [sp, #0xf0]
10205cf34:     	ldp	x20, x19, [sp, #0xe0]
10205cf38:     	ldp	x22, x21, [sp, #0xd0]
10205cf3c:     	ldp	x24, x23, [sp, #0xc0]
10205cf40:     	ldp	d9, d8, [sp, #0xb0]
10205cf44:     	add	sp, sp, #0x100
10205cf48:     	ret
10205cf4c:     	mov	x0, x21
10205cf50:     	bl	0x103beed00  SELECTOR window
10205cf54:     	bl	0x103be9ee0  SELECTOR mouseLocationOutsideOfEventStream
10205cf58:     	fmov	d8, d0
10205cf5c:     	fmov	d9, d1
10205cf60:     	mov	x0, x21
10205cf64:     	bl	0x103beed00  SELECTOR window
10205cf68:     	bl	0x103beed40  SELECTOR windowController
10205cf6c:     	cbz	x0, 0x10205cf80
10205cf70:     	bl	0x103be95e0  SELECTOR legacyWindowObject
10205cf74:     	ldr	w8, [x0, #0xc4]
10205cf78:     	cmp	w8, #0x3
10205cf7c:     	b.ne	0x10205cf90
10205cf80:     	adrp	x8, 0x104af8000
10205cf84:     	ldrsw	x8, [x8, #0xd60]
10205cf88:     	mov	w9, #0x1                ; =1
10205cf8c:     	str	w9, [x21, x8]
10205cf90:     	adrp	x22, 0x1048c8000
10205cf94:     	ldr	x22, [x22, #0x538]
10205cf98:     	ldr	x0, [x22]
10205cf9c:     	bl	0x103be8d20  SELECTOR isEnteringProximity
10205cfa0:     	cbz	w0, 0x10205cfd0
10205cfa4:     	ldr	x0, [x22]
10205cfa8:     	mov	x2, x19
10205cfac:     	mov	w3, #0x1                ; =1
10205cfb0:     	mov	w4, #0x0                ; =0
10205cfb4:     	ldp	x29, x30, [sp, #0xf0]
10205cfb8:     	ldp	x20, x19, [sp, #0xe0]
10205cfbc:     	ldp	x22, x21, [sp, #0xd0]
10205cfc0:     	ldp	x24, x23, [sp, #0xc0]
10205cfc4:     	ldp	d9, d8, [sp, #0xb0]
10205cfc8:     	add	sp, sp, #0x100
10205cfcc:     	b	0x103bee260
10205cfd0:     	mov	x0, x21
10205cfd4:     	bl	0x103beed00  SELECTOR window
10205cfd8:     	bl	0x103beed40  SELECTOR windowController
10205cfdc:     	bl	0x103be95e0  SELECTOR legacyWindowObject
10205cfe0:     	cbz	x0, 0x10205cf30
10205cfe4:     	mov	x20, x0
10205cfe8:     	ldr	x8, [x0, #0x38]
10205cfec:     	cbz	x8, 0x10205cf30
10205cff0:     	mov	w8, #0x1                ; =1
10205cff4:     	mov	w9, #0xe                ; =14
10205cff8:     	stur	w8, [x29, #-0x54]
10205cffc:     	stur	w9, [x29, #-0x44]
10205d000:     	mov	x0, x21
10205d004:     	fmov	d0, d8
10205d008:     	fmov	d1, d9
10205d00c:     	mov	x2, #0x0                ; =0

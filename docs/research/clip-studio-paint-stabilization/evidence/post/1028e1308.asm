1028e1308:     	sub	sp, sp, #0xe0
1028e130c:     	stp	d9, d8, [sp, #0x70]
1028e1310:     	stp	x28, x27, [sp, #0x80]
1028e1314:     	stp	x26, x25, [sp, #0x90]
1028e1318:     	stp	x24, x23, [sp, #0xa0]
1028e131c:     	stp	x22, x21, [sp, #0xb0]
1028e1320:     	stp	x20, x19, [sp, #0xc0]
1028e1324:     	stp	x29, x30, [sp, #0xd0]
1028e1328:     	add	x29, sp, #0xd0
1028e132c:     	mov	x20, x7
1028e1330:     	mov	x25, x6
1028e1334:     	mov	x27, x5
1028e1338:     	mov	x19, x4
1028e133c:     	mov	x26, x3
1028e1340:     	mov	x21, x2
1028e1344:     	mov	x23, x1
1028e1348:     	mov	x24, x0
1028e134c:     	stur	wzr, [x29, #-0x64]
1028e1350:     	mov	w8, #0x1                ; =1
1028e1354:     	str	w8, [sp, #0x68]
1028e1358:     	ldr	x0, [x0]
1028e135c:     	ldp	x10, x9, [x1]
1028e1360:     	add	x11, sp, #0x58
1028e1364:     	add	x22, x11, #0x8
1028e1368:     	stp	x10, x9, [sp, #0x58]
1028e136c:     	cbz	x9, 0x1028e1378
1028e1370:     	add	x9, x9, #0x8
1028e1374:     	ldadd	w8, w8, [x9]
1028e1378:     	add	x2, sp, #0x58
1028e137c:     	sub	x3, x29, #0x64
1028e1380:     	mov	w1, #0x47e              ; =1150
1028e1384:     	bl	0x100f0f7cc
1028e1388:     	mov	x0, x22
1028e138c:     	bl	0x10001022c
1028e1390:     	ldur	w8, [x29, #-0x64]
1028e1394:     	cbz	w8, 0x1028e14c4
1028e1398:     	mov	w8, #0x1                ; =1
1028e139c:     	str	w8, [x27]
1028e13a0:     	ldr	x0, [x24]
1028e13a4:     	add	x9, sp, #0x48
1028e13a8:     	add	x22, x9, #0x8
1028e13ac:     	ldp	x10, x9, [x23]
1028e13b0:     	stp	x10, x9, [sp, #0x48]
1028e13b4:     	cbz	x9, 0x1028e13c0
1028e13b8:     	add	x9, x9, #0x8
1028e13bc:     	ldadd	w8, w8, [x9]
1028e13c0:     	add	x2, sp, #0x48
1028e13c4:     	mov	w1, #0x47f              ; =1151
1028e13c8:     	mov	x3, x27
1028e13cc:     	bl	0x100c9e168
1028e13d0:     	mov	x0, x22
1028e13d4:     	bl	0x10001022c
1028e13d8:     	ldr	w8, [x27]
1028e13dc:     	mul	w8, w8, w8
1028e13e0:     	ucvtf	d0, w8
1028e13e4:     	adrp	x8, 0x1042ec000
1028e13e8:     	ldr	d1, [x8, #0xb78]
1028e13ec:     	fmul	d0, d0, d1
1028e13f0:     	adrp	x8, 0x104302000
1028e13f4:     	ldr	d1, [x8, #0xfd8]
1028e13f8:     	fcmp	d0, d1
1028e13fc:     	ccmp	w26, #0x0, #0x4, mi
1028e1400:     	fcsel	d0, d1, d0, ne
1028e1404:     	str	d0, [x19]
1028e1408:     	ldr	x0, [x24]
1028e140c:     	add	x8, sp, #0x38
1028e1410:     	add	x22, x8, #0x8
1028e1414:     	ldp	x9, x8, [x23]
1028e1418:     	stp	x9, x8, [sp, #0x38]
1028e141c:     	cbz	x8, 0x1028e142c
1028e1420:     	add	x8, x8, #0x8
1028e1424:     	mov	w9, #0x1                ; =1
1028e1428:     	ldadd	w9, w8, [x8]
1028e142c:     	add	x2, sp, #0x38
1028e1430:     	mov	w1, #0x480              ; =1152
1028e1434:     	mov	x3, x25
1028e1438:     	bl	0x100f0f7cc
1028e143c:     	mov	x0, x22
1028e1440:     	bl	0x10001022c
1028e1444:     	ldr	x0, [x24]
1028e1448:     	add	x8, sp, #0x28
1028e144c:     	add	x22, x8, #0x8
1028e1450:     	ldp	x9, x8, [x23]
1028e1454:     	stp	x9, x8, [sp, #0x28]
1028e1458:     	cbz	x8, 0x1028e1468
1028e145c:     	add	x8, x8, #0x8
1028e1460:     	mov	w9, #0x1                ; =1
1028e1464:     	ldadd	w9, w8, [x8]
1028e1468:     	add	x2, sp, #0x28
1028e146c:     	add	x3, sp, #0x68
1028e1470:     	mov	w1, #0x481              ; =1153
1028e1474:     	bl	0x100f0f7cc
1028e1478:     	ldr	x25, [x29, #0x10]
1028e147c:     	mov	x0, x22
1028e1480:     	bl	0x10001022c
1028e1484:     	ldr	x0, [x24]
1028e1488:     	add	x8, sp, #0x18
1028e148c:     	add	x22, x8, #0x8
1028e1490:     	ldp	x9, x8, [x23]
1028e1494:     	stp	x9, x8, [sp, #0x18]
1028e1498:     	cbz	x8, 0x1028e14a8
1028e149c:     	add	x8, x8, #0x8
1028e14a0:     	mov	w9, #0x1                ; =1
1028e14a4:     	ldadd	w9, w8, [x8]
1028e14a8:     	add	x2, sp, #0x18
1028e14ac:     	mov	w1, #0x482              ; =1154
1028e14b0:     	mov	x3, x25
1028e14b4:     	bl	0x100f0f7cc
1028e14b8:     	mov	x0, x22
1028e14bc:     	bl	0x10001022c
1028e14c0:     	b	0x1028e14e0
1028e14c4:     	cbz	w26, 0x1028e1564
1028e14c8:     	mov	w8, #0x1                ; =1
1028e14cc:     	str	w8, [x27]
1028e14d0:     	mov	x8, #-0x6666666666666667 ; =-7378697629483820647
1028e14d4:     	movk	x8, #0x999a
1028e14d8:     	movk	x8, #0x3fc9, lsl #48
1028e14dc:     	str	x8, [x19]
1028e14e0:     	add	x8, sp, #0x8
1028e14e4:     	add	x22, x8, #0x8
1028e14e8:     	ldp	x9, x8, [x21]
1028e14ec:     	stp	x9, x8, [sp, #0x8]
1028e14f0:     	cbz	x8, 0x1028e1500
1028e14f4:     	add	x8, x8, #0x8
1028e14f8:     	mov	w9, #0x1                ; =1
1028e14fc:     	ldadd	w9, w8, [x8]
1028e1500:     	add	x0, sp, #0x8
1028e1504:     	bl	0x102992930
1028e1508:     	adrp	x8, 0x1042ee000
1028e150c:     	ldr	d1, [x8, #0x828]
1028e1510:     	fmul	d8, d0, d1
1028e1514:     	mov	x0, x22
1028e1518:     	bl	0x10001022c
1028e151c:     	fmov	d0, #1.00000000
1028e1520:     	fdiv	d0, d0, d8
1028e1524:     	str	d0, [x20]
1028e1528:     	ldr	w8, [sp, #0x68]
1028e152c:     	cbz	w8, 0x1028e153c
1028e1530:     	ldr	d1, [x19]
1028e1534:     	fmul	d0, d0, d1
1028e1538:     	str	d0, [x19]
1028e153c:     	mov	w0, #0x1                ; =1
1028e1540:     	ldp	x29, x30, [sp, #0xd0]
1028e1544:     	ldp	x20, x19, [sp, #0xc0]
1028e1548:     	ldp	x22, x21, [sp, #0xb0]
1028e154c:     	ldp	x24, x23, [sp, #0xa0]
1028e1550:     	ldp	x26, x25, [sp, #0x90]
1028e1554:     	ldp	x28, x27, [sp, #0x80]
1028e1558:     	ldp	d9, d8, [sp, #0x70]
1028e155c:     	add	sp, sp, #0xe0
1028e1560:     	ret
1028e1564:     	mov	w0, #0x0                ; =0
1028e1568:     	b	0x1028e1540
1028e156c:     	b	0x1028e1580
1028e1570:     	b	0x1028e1580
1028e1574:     	b	0x1028e1580
1028e1578:     	b	0x1028e1580
1028e157c:     	b	0x1028e1580
1028e1580:     	mov	x19, x0
1028e1584:     	mov	x0, x22
1028e1588:     	bl	0x10001022c
1028e158c:     	mov	x0, x19
1028e1590:     	bl	0x103bda970

FUNCTION 0x1024a1268 size 796
1024a1268:     	sub	sp, sp, #0xf0
1024a126c:     	stp	d9, d8, [sp, #0x80]
1024a1270:     	stp	x28, x27, [sp, #0x90]
1024a1274:     	stp	x26, x25, [sp, #0xa0]
1024a1278:     	stp	x24, x23, [sp, #0xb0]
1024a127c:     	stp	x22, x21, [sp, #0xc0]
1024a1280:     	stp	x20, x19, [sp, #0xd0]
1024a1284:     	stp	x29, x30, [sp, #0xe0]
1024a1288:     	add	x29, sp, #0xe0
1024a128c:     	mov	x19, x0
1024a1290:     	stp	x3, x4, [sp, #0x70]
1024a1294:     	ldr	x0, [x2]
1024a1298:     	cbz	x0, 0x1024a1404
1024a129c:     	mov	x21, x7
1024a12a0:     	mov	x22, x6
1024a12a4:     	mov	x25, x5
1024a12a8:     	mov	x24, x2
1024a12ac:     	mov	x23, x1
1024a12b0:     	ldr	w20, [x29, #0x30]
1024a12b4:     	str	w20, [x19, #0x268]
1024a12b8:     	bl	0x1024acac8
1024a12bc:     	fmov	d8, d0
1024a12c0:     	ldr	x0, [x24]
1024a12c4:     	bl	0x1024acad0
1024a12c8:     	fmov	d1, d0
1024a12cc:     	mov	x0, x19
1024a12d0:     	fmov	d0, d8
1024a12d4:     	bl	0x1024a1584
1024a12d8:     	str	x22, [x19, #0x18]
1024a12dc:     	str	x25, [x19, #0xf8]
1024a12e0:     	str	wzr, [x19, #0xd4]
1024a12e4:     	add	x0, x19, #0xe8
1024a12e8:     	mov	x1, x24
1024a12ec:     	bl	0x100023be4
1024a12f0:     	ldr	x0, [x24]
1024a12f4:     	add	x26, sp, #0x60
1024a12f8:     	add	x8, sp, #0x60
1024a12fc:     	mov	w1, #0x0                ; =0
1024a1300:     	bl	0x1024ac538
1024a1304:     	ldr	x0, [sp, #0x60]
1024a1308:     	cbz	x0, 0x1024a13fc
1024a130c:     	bl	0x10368abc0
1024a1310:     	stp	x0, x1, [sp, #0x50]
1024a1314:     	add	x0, sp, #0x70
1024a1318:     	add	x1, sp, #0x50
1024a131c:     	bl	0x10221b7bc
1024a1320:     	cbz	w0, 0x1024a13fc
1024a1324:     	ldr	x0, [x24]
1024a1328:     	add	x1, sp, #0x70
1024a132c:     	bl	0x1024acb68
1024a1330:     	ldr	x0, [sp, #0x60]
1024a1334:     	bl	0x10368b4e0
1024a1338:     	str	w0, [x19, #0x100]
1024a133c:     	ldr	q0, [sp, #0x70]
1024a1340:     	stur	q0, [x19, #0x8]
1024a1344:     	ldp	w1, w2, [x19, #0x18]
1024a1348:     	add	x0, x19, #0x8
1024a134c:     	bl	0x10221b4d4
1024a1350:     	mov	x0, x19
1024a1354:     	bl	0x1024a09fc
1024a1358:     	ldp	x25, x24, [x29, #0x10]
1024a135c:     	add	x0, x19, #0x120
1024a1360:     	mov	x1, x24
1024a1364:     	bl	0x100023be4
1024a1368:     	mov	x0, x19
1024a136c:     	mov	x1, x23
1024a1370:     	mov	x2, x22
1024a1374:     	mov	x3, x21
1024a1378:     	mov	x4, x25
1024a137c:     	mov	w5, #0x1                ; =1
1024a1380:     	mov	w6, #0x0                ; =0
1024a1384:     	mov	w7, #0x1                ; =1
1024a1388:     	bl	0x1024a1630
1024a138c:     	ldr	x8, [x19, #0x120]
1024a1390:     	cbz	x8, 0x1024a140c
1024a1394:     	ldr	x0, [x24]
1024a1398:     	add	x21, sp, #0x38
1024a139c:     	add	x8, sp, #0x38
1024a13a0:     	add	x1, sp, #0x48
1024a13a4:     	bl	0x10253c5bc
1024a13a8:     	ldp	w8, w9, [sp, #0x48]
1024a13ac:     	ldp	w10, w11, [x19, #0xf8]
1024a13b0:     	ldp	w12, w13, [x19, #0x18]
1024a13b4:     	add	w10, w10, w12
1024a13b8:     	sub	w8, w8, w10
1024a13bc:     	add	w10, w11, w13
1024a13c0:     	sub	w9, w9, w10
1024a13c4:     	orr	x2, x8, x9, lsl #32
1024a13c8:     	ldr	x0, [x19, #0xe8]
1024a13cc:     	ldp	x9, x8, [sp, #0x38]
1024a13d0:     	stp	x9, x8, [sp, #0x28]
1024a13d4:     	cbz	x8, 0x1024a13e4
1024a13d8:     	add	x8, x8, #0x8
1024a13dc:     	mov	w9, #0x1                ; =1
1024a13e0:     	ldadd	w9, w8, [x8]
1024a13e4:     	add	x22, sp, #0x28
1024a13e8:     	add	x1, sp, #0x28
1024a13ec:     	bl	0x1024acb34
1024a13f0:     	add	x0, x22, #0x8
1024a13f4:     	bl	0x10001022c
1024a13f8:     	b	0x1024a1424
1024a13fc:     	mov	w19, #0x0               ; =0
1024a1400:     	b	0x1024a1504
1024a1404:     	mov	w19, #0x0               ; =0
1024a1408:     	b	0x1024a150c
1024a140c:     	ldur	x0, [x19, #0xe8]
1024a1410:     	stp	xzr, xzr, [sp, #0x18]
1024a1414:     	add	x21, sp, #0x18
1024a1418:     	add	x1, sp, #0x18
1024a141c:     	mov	x2, #0x0                ; =0
1024a1420:     	bl	0x1024acb34
1024a1424:     	add	x0, x21, #0x8
1024a1428:     	bl	0x10001022c
1024a142c:     	ldr	w22, [x19, #0xd0]
1024a1430:     	ldr	x0, [x19, #0x48]
1024a1434:     	add	x23, sp, #0x38
1024a1438:     	add	x8, sp, #0x38
1024a143c:     	bl	0x1024c1e3c
1024a1440:     	ldr	x8, [sp, #0x38]
1024a1444:     	cmp	x8, #0x0
1024a1448:     	cset	w21, ne
1024a144c:     	add	x0, x23, #0x8
1024a1450:     	bl	0x10001022c
1024a1454:     	ldr	x0, [x19, #0xe8]
1024a1458:     	ldp	w1, w3, [x19, #0xc4]
1024a145c:     	ldr	w4, [x19, #0xc0]
1024a1460:     	and	w5, w22, #0x100
1024a1464:     	mov	x2, x21
1024a1468:     	mov	x6, x20
1024a146c:     	bl	0x1024acc98
1024a1470:     	mov	x0, x19
1024a1474:     	mov	w1, #0x0                ; =0
1024a1478:     	mov	x2, x20
1024a147c:     	bl	0x1024a1cd0
1024a1480:     	cbz	w0, 0x1024a14f4
1024a1484:     	ldr	w8, [x19, #0xd4]
1024a1488:     	cbz	w8, 0x1024a14cc
1024a148c:     	ldr	x21, [x19, #0x130]
1024a1490:     	cbz	x21, 0x1024a14cc
1024a1494:     	ldur	x0, [x19, #0xe8]
1024a1498:     	add	x8, sp, #0x8
1024a149c:     	mov	w1, #0x0                ; =0
1024a14a0:     	bl	0x1024ac698
1024a14a4:     	ldp	x2, x3, [sp, #0x70]
1024a14a8:     	add	x22, sp, #0x8
1024a14ac:     	add	x1, sp, #0x8
1024a14b0:     	mov	x0, x21
1024a14b4:     	bl	0x10250f614
1024a14b8:     	add	x0, x22, #0x8
1024a14bc:     	bl	0x10001022c
1024a14c0:     	ldr	x0, [x19, #0x130]
1024a14c4:     	mov	w1, #0x0                ; =0
1024a14c8:     	bl	0x10250f6b8
1024a14cc:     	ldr	w8, [x19, #0x160]
1024a14d0:     	cbz	w8, 0x1024a14e0
1024a14d4:     	mov	x0, x19
1024a14d8:     	mov	x1, x20
1024a14dc:     	bl	0x1024a1db8
1024a14e0:     	ldr	x8, [x29, #0x20]
1024a14e4:     	ldr	w9, [x19, #0xd4]
1024a14e8:     	str	w9, [x8]
1024a14ec:     	mov	w19, #0x1               ; =1
1024a14f0:     	b	0x1024a1504
1024a14f4:     	mov	w19, #0x0               ; =0
1024a14f8:     	ldr	x8, [x29, #0x28]
1024a14fc:     	mov	w9, #0x1                ; =1
1024a1500:     	str	w9, [x8]
1024a1504:     	add	x0, x26, #0x8
1024a1508:     	bl	0x10001022c
1024a150c:     	mov	x0, x19
1024a1510:     	ldp	x29, x30, [sp, #0xe0]
1024a1514:     	ldp	x20, x19, [sp, #0xd0]
1024a1518:     	ldp	x22, x21, [sp, #0xc0]
1024a151c:     	ldp	x24, x23, [sp, #0xb0]
1024a1520:     	ldp	x26, x25, [sp, #0xa0]
1024a1524:     	ldp	x28, x27, [sp, #0x90]
1024a1528:     	ldp	d9, d8, [sp, #0x80]
1024a152c:     	add	sp, sp, #0xf0
1024a1530:     	ret
1024a1534:     	mov	x19, x0
1024a1538:     	add	x0, x22, #0x8
1024a153c:     	b	0x1024a1558
1024a1540:     	mov	x19, x0
1024a1544:     	b	0x1024a1554
1024a1548:     	mov	x19, x0
1024a154c:     	add	x0, x22, #0x8
1024a1550:     	bl	0x10001022c
1024a1554:     	add	x0, x21, #0x8
1024a1558:     	bl	0x10001022c
1024a155c:     	b	0x1024a1570
1024a1560:     	b	0x1024a156c
1024a1564:     	b	0x1024a156c
1024a1568:     	b	0x1024a156c
1024a156c:     	mov	x19, x0
1024a1570:     	add	x8, sp, #0x60
1024a1574:     	add	x0, x8, #0x8
1024a1578:     	bl	0x10001022c
1024a157c:     	mov	x0, x19
1024a1580:     	bl	0x103bda970

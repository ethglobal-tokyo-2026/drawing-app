
FUNCTION 0x1024c1398 size 892
1024c1398:     	sub	sp, sp, #0x100
1024c139c:     	stp	x28, x27, [sp, #0xa0]
1024c13a0:     	stp	x26, x25, [sp, #0xb0]
1024c13a4:     	stp	x24, x23, [sp, #0xc0]
1024c13a8:     	stp	x22, x21, [sp, #0xd0]
1024c13ac:     	stp	x20, x19, [sp, #0xe0]
1024c13b0:     	stp	x29, x30, [sp, #0xf0]
1024c13b4:     	add	x29, sp, #0xf0
1024c13b8:     	mov	x20, x4
1024c13bc:     	mov	x21, x2
1024c13c0:     	mov	x22, x1
1024c13c4:     	mov	x23, x0
1024c13c8:     	mov	x19, x8
1024c13cc:     	cbz	w3, 0x1024c13e0
1024c13d0:     	ldr	x0, [x22]
1024c13d4:     	bl	0x1036718e4
1024c13d8:     	mov	x25, x0
1024c13dc:     	b	0x1024c13e4
1024c13e0:     	mov	w25, #0x0               ; =0
1024c13e4:     	stp	xzr, xzr, [x29, #-0x70]
1024c13e8:     	ldr	x0, [x23]
1024c13ec:     	cbz	x0, 0x1024c1470
1024c13f0:     	sub	x24, x29, #0x60
1024c13f4:     	sub	x8, x29, #0x60
1024c13f8:     	bl	0x1036718ec
1024c13fc:     	ldur	x26, [x29, #-0x60]
1024c1400:     	add	x0, x24, #0x8
1024c1404:     	bl	0x10001022c
1024c1408:     	cbz	x26, 0x1024c1470
1024c140c:     	ldr	x0, [x23]
1024c1410:     	sub	x8, x29, #0x60
1024c1414:     	bl	0x1036718ec
1024c1418:     	ldur	x0, [x29, #-0x60]
1024c141c:     	add	x8, sp, #0x70
1024c1420:     	bl	0x103674950
1024c1424:     	add	x0, x24, #0x8
1024c1428:     	bl	0x10001022c
1024c142c:     	ldr	x0, [sp, #0x70]
1024c1430:     	adrp	x1, 0x104d8f000
1024c1434:     	add	x1, x1, #0x150
1024c1438:     	add	x26, sp, #0x60
1024c143c:     	add	x8, sp, #0x60
1024c1440:     	bl	0x103676c54
1024c1444:     	ldr	q0, [sp, #0x60]
1024c1448:     	stp	xzr, xzr, [sp, #0x60]
1024c144c:     	ldur	q1, [x29, #-0x70]
1024c1450:     	stp	q0, q1, [x29, #-0x70]
1024c1454:     	orr	x0, x24, #0x8
1024c1458:     	bl	0x10001022c
1024c145c:     	orr	x0, x26, #0x8
1024c1460:     	bl	0x10001022c
1024c1464:     	add	x8, sp, #0x70
1024c1468:     	add	x0, x8, #0x8
1024c146c:     	bl	0x10001022c
1024c1470:     	mov	w0, #0x740              ; =1856
1024c1474:     	bl	0x103bdd37c
1024c1478:     	mov	x24, x0
1024c147c:     	ldp	x9, x8, [x29, #-0x70]
1024c1480:     	stp	x9, x8, [sp, #0x50]
1024c1484:     	cbz	x8, 0x1024c1494
1024c1488:     	add	x8, x8, #0x8
1024c148c:     	mov	w9, #0x1                ; =1
1024c1490:     	ldadd	w9, w8, [x8]
1024c1494:     	ldp	x9, x8, [x23]
1024c1498:     	stp	x9, x8, [sp, #0x40]
1024c149c:     	cbz	x8, 0x1024c14ac
1024c14a0:     	add	x8, x8, #0x8
1024c14a4:     	mov	w9, #0x1                ; =1
1024c14a8:     	ldadd	w9, w8, [x8]
1024c14ac:     	add	x26, sp, #0x50
1024c14b0:     	add	x27, sp, #0x40
1024c14b4:     	add	x1, sp, #0x50
1024c14b8:     	add	x2, sp, #0x40
1024c14bc:     	mov	x0, x24
1024c14c0:     	mov	x3, x25
1024c14c4:     	bl	0x1024c0dc0
1024c14c8:     	add	x0, x27, #0x8
1024c14cc:     	bl	0x10001022c
1024c14d0:     	add	x0, x26, #0x8
1024c14d4:     	bl	0x10001022c
1024c14d8:     	mov	x0, x19
1024c14dc:     	mov	x1, x24
1024c14e0:     	bl	0x1024cadb4
1024c14e4:     	ldr	x8, [x19], #0x8
1024c14e8:     	str	x8, [x24, #0x58]
1024c14ec:     	add	x0, x24, #0x60
1024c14f0:     	mov	x1, x19
1024c14f4:     	bl	0x10005a220
1024c14f8:     	ldr	x0, [x22]
1024c14fc:     	sub	x25, x29, #0x60
1024c1500:     	sub	x8, x29, #0x60
1024c1504:     	bl	0x103671930
1024c1508:     	ldur	x8, [x29, #-0x60]
1024c150c:     	ldr	x9, [x23]
1024c1510:     	cmp	x8, x9
1024c1514:     	cset	w23, eq
1024c1518:     	add	x0, x25, #0x8
1024c151c:     	bl	0x10001022c
1024c1520:     	ldp	x9, x8, [x22]
1024c1524:     	stp	x9, x8, [sp, #0x30]
1024c1528:     	cbz	x8, 0x1024c1538
1024c152c:     	add	x8, x8, #0x8
1024c1530:     	mov	w9, #0x1                ; =1
1024c1534:     	ldadd	w9, w8, [x8]
1024c1538:     	ldp	x9, x8, [x21]
1024c153c:     	stp	x9, x8, [sp, #0x20]
1024c1540:     	cbz	x8, 0x1024c1550
1024c1544:     	add	x8, x8, #0x8
1024c1548:     	mov	w9, #0x1                ; =1
1024c154c:     	ldadd	w9, w8, [x8]
1024c1550:     	add	x25, sp, #0x30
1024c1554:     	add	x26, sp, #0x20
1024c1558:     	add	x1, sp, #0x30
1024c155c:     	add	x2, sp, #0x20
1024c1560:     	mov	x0, x24
1024c1564:     	mov	x3, x23
1024c1568:     	mov	x4, x20
1024c156c:     	bl	0x1024c1714
1024c1570:     	add	x0, x26, #0x8
1024c1574:     	bl	0x10001022c
1024c1578:     	add	x0, x25, #0x8
1024c157c:     	bl	0x10001022c
1024c1580:     	ldr	w8, [x24, #0x80]
1024c1584:     	mov	w9, #0xc600             ; =50688
1024c1588:     	orr	w8, w8, w9
1024c158c:     	str	w8, [x24, #0x80]
1024c1590:     	ldr	x9, [x22]
1024c1594:     	ldp	x8, x9, [x9, #0x68]
1024c1598:     	stp	x8, x9, [x29, #-0x60]
1024c159c:     	cbz	x9, 0x1024c15ac
1024c15a0:     	add	x9, x9, #0x8
1024c15a4:     	mov	w10, #0x1               ; =1
1024c15a8:     	ldadd	w10, w9, [x9]
1024c15ac:     	sub	x22, x29, #0x60
1024c15b0:     	cbz	x8, 0x1024c162c
1024c15b4:     	add	x8, sp, #0x70
1024c15b8:     	mov	x0, x24
1024c15bc:     	bl	0x1024c1e58
1024c15c0:     	ldr	x0, [sp, #0x70]
1024c15c4:     	ldp	x9, x8, [x29, #-0x60]
1024c15c8:     	stp	x9, x8, [sp, #0x10]
1024c15cc:     	cbz	x8, 0x1024c15dc
1024c15d0:     	add	x8, x8, #0x8
1024c15d4:     	mov	w9, #0x1                ; =1
1024c15d8:     	ldadd	w9, w8, [x8]
1024c15dc:     	ldp	x9, x8, [x21]
1024c15e0:     	stp	x9, x8, [sp]
1024c15e4:     	cbz	x8, 0x1024c15f4
1024c15e8:     	add	x8, x8, #0x8
1024c15ec:     	mov	w9, #0x1                ; =1
1024c15f0:     	ldadd	w9, w8, [x8]
1024c15f4:     	add	x21, sp, #0x10
1024c15f8:     	mov	x24, sp
1024c15fc:     	add	x1, sp, #0x10
1024c1600:     	mov	x2, sp
1024c1604:     	mov	x3, x23
1024c1608:     	mov	x4, x20
1024c160c:     	bl	0x1024c1714
1024c1610:     	add	x0, x24, #0x8
1024c1614:     	bl	0x10001022c
1024c1618:     	add	x0, x21, #0x8
1024c161c:     	bl	0x10001022c
1024c1620:     	add	x8, sp, #0x70
1024c1624:     	add	x0, x8, #0x8
1024c1628:     	bl	0x10001022c
1024c162c:     	sub	x19, x29, #0x70
1024c1630:     	add	x0, x22, #0x8
1024c1634:     	bl	0x10001022c
1024c1638:     	orr	x0, x19, #0x8
1024c163c:     	bl	0x10001022c
1024c1640:     	ldp	x29, x30, [sp, #0xf0]
1024c1644:     	ldp	x20, x19, [sp, #0xe0]
1024c1648:     	ldp	x22, x21, [sp, #0xd0]
1024c164c:     	ldp	x24, x23, [sp, #0xc0]
1024c1650:     	ldp	x26, x25, [sp, #0xb0]
1024c1654:     	ldp	x28, x27, [sp, #0xa0]
1024c1658:     	add	sp, sp, #0x100
1024c165c:     	ret
1024c1660:     	mov	x20, x0
1024c1664:     	add	x8, sp, #0x70
1024c1668:     	b	0x1024c1674
1024c166c:     	mov	x20, x0
1024c1670:     	sub	x8, x29, #0x60
1024c1674:     	add	x0, x8, #0x8
1024c1678:     	b	0x1024c16d4
1024c167c:     	b	0x1024c16fc
1024c1680:     	mov	x20, x0
1024c1684:     	add	x0, x24, #0x8
1024c1688:     	bl	0x10001022c
1024c168c:     	add	x0, x21, #0x8
1024c1690:     	bl	0x10001022c
1024c1694:     	add	x8, sp, #0x70
1024c1698:     	add	x0, x8, #0x8
1024c169c:     	bl	0x10001022c
1024c16a0:     	b	0x1024c16a8
1024c16a4:     	mov	x20, x0
1024c16a8:     	add	x0, x22, #0x8
1024c16ac:     	b	0x1024c16c4
1024c16b0:     	b	0x1024c16fc
1024c16b4:     	mov	x20, x0
1024c16b8:     	add	x0, x26, #0x8
1024c16bc:     	bl	0x10001022c
1024c16c0:     	add	x0, x25, #0x8
1024c16c4:     	bl	0x10001022c
1024c16c8:     	b	0x1024c16d0
1024c16cc:     	mov	x20, x0
1024c16d0:     	mov	x0, x19
1024c16d4:     	bl	0x10001022c
1024c16d8:     	b	0x1024c1700
1024c16dc:     	mov	x20, x0
1024c16e0:     	add	x0, x27, #0x8
1024c16e4:     	bl	0x10001022c
1024c16e8:     	add	x0, x26, #0x8
1024c16ec:     	bl	0x10001022c
1024c16f0:     	mov	x0, x24
1024c16f4:     	bl	0x103bdd34c
1024c16f8:     	b	0x1024c1700
1024c16fc:     	mov	x20, x0
1024c1700:     	sub	x8, x29, #0x70
1024c1704:     	orr	x0, x8, #0x8
1024c1708:     	bl	0x10001022c
1024c170c:     	mov	x0, x20
1024c1710:     	bl	0x103bda970

FUNCTION 0x1024c1714 size 1832
1024c1714:     	sub	sp, sp, #0x1a0
1024c1718:     	stp	x28, x27, [sp, #0x140]
1024c171c:     	stp	x26, x25, [sp, #0x150]
1024c1720:     	stp	x24, x23, [sp, #0x160]
1024c1724:     	stp	x22, x21, [sp, #0x170]
1024c1728:     	stp	x20, x19, [sp, #0x180]
1024c172c:     	stp	x29, x30, [sp, #0x190]
1024c1730:     	add	x29, sp, #0x190
1024c1734:     	mov	x22, x4
1024c1738:     	mov	x21, x3
1024c173c:     	mov	x20, x2
1024c1740:     	mov	x19, x0
1024c1744:     	ldr	x24, [x1]
1024c1748:     	ldr	w8, [x24, #0x80]
1024c174c:     	str	w8, [x0, #0x80]
1024c1750:     	ldr	d0, [x24, #0x78]
1024c1754:     	str	d0, [x0, #0x78]
1024c1758:     	ldp	x9, x8, [x2]
1024c175c:     	stp	x9, x8, [x29, #-0x70]
1024c1760:     	cbz	x8, 0x1024c1770
1024c1764:     	add	x8, x8, #0x8
1024c1768:     	mov	w9, #0x1                ; =1
1024c176c:     	ldadd	w9, w8, [x8]
1024c1770:     	sub	x23, x29, #0x70
1024c1774:     	add	x0, x19, #0x88
1024c1778:     	add	x1, x24, #0x88
1024c177c:     	sub	x2, x29, #0x70
1024c1780:     	mov	x3, x21
1024c1784:     	bl	0x1024afc3c
1024c1788:     	add	x0, x23, #0x8
1024c178c:     	bl	0x10001022c
1024c1790:     	ldp	x9, x8, [x20]
1024c1794:     	stp	x9, x8, [x29, #-0x80]
1024c1798:     	cbz	x8, 0x1024c17a8
1024c179c:     	add	x8, x8, #0x8
1024c17a0:     	mov	w9, #0x1                ; =1
1024c17a4:     	ldadd	w9, w8, [x8]
1024c17a8:     	sub	x23, x29, #0x80
1024c17ac:     	add	x0, x19, #0xe0
1024c17b0:     	add	x1, x24, #0xe0
1024c17b4:     	sub	x2, x29, #0x80
1024c17b8:     	mov	x3, x21
1024c17bc:     	bl	0x1024afc3c
1024c17c0:     	add	x0, x23, #0x8
1024c17c4:     	bl	0x10001022c
1024c17c8:     	ldr	d0, [x24, #0x138]
1024c17cc:     	str	d0, [x19, #0x138]
1024c17d0:     	ldp	x9, x8, [x20]
1024c17d4:     	stp	x9, x8, [x29, #-0x90]
1024c17d8:     	cbz	x8, 0x1024c17e8
1024c17dc:     	add	x8, x8, #0x8
1024c17e0:     	mov	w9, #0x1                ; =1
1024c17e4:     	ldadd	w9, w8, [x8]
1024c17e8:     	sub	x23, x29, #0x90
1024c17ec:     	add	x0, x19, #0x140
1024c17f0:     	add	x1, x24, #0x140
1024c17f4:     	sub	x2, x29, #0x90
1024c17f8:     	mov	x3, x21
1024c17fc:     	bl	0x1024afc3c
1024c1800:     	add	x0, x23, #0x8
1024c1804:     	bl	0x10001022c
1024c1808:     	ldr	d0, [x24, #0x198]
1024c180c:     	str	d0, [x19, #0x198]
1024c1810:     	ldr	w8, [x24, #0x208]
1024c1814:     	str	w8, [x19, #0x208]
1024c1818:     	ldr	q0, [x24, #0x1a0]
1024c181c:     	str	q0, [x19, #0x1a0]
1024c1820:     	ldp	x9, x8, [x20]
1024c1824:     	stp	x9, x8, [x29, #-0xa0]
1024c1828:     	cbz	x8, 0x1024c1838
1024c182c:     	add	x8, x8, #0x8
1024c1830:     	mov	w9, #0x1                ; =1
1024c1834:     	ldadd	w9, w8, [x8]
1024c1838:     	sub	x23, x29, #0xa0
1024c183c:     	add	x0, x19, #0x1b0
1024c1840:     	add	x1, x24, #0x1b0
1024c1844:     	sub	x2, x29, #0xa0
1024c1848:     	mov	x3, x21
1024c184c:     	bl	0x1024afc3c
1024c1850:     	add	x0, x23, #0x8
1024c1854:     	bl	0x10001022c
1024c1858:     	ldr	d0, [x24, #0x210]
1024c185c:     	str	d0, [x19, #0x210]
1024c1860:     	ldp	x9, x8, [x20]
1024c1864:     	stp	x9, x8, [x29, #-0xb0]
1024c1868:     	cbz	x8, 0x1024c1878
1024c186c:     	add	x8, x8, #0x8
1024c1870:     	mov	w9, #0x1                ; =1
1024c1874:     	ldadd	w9, w8, [x8]
1024c1878:     	sub	x23, x29, #0xb0
1024c187c:     	add	x0, x19, #0x218
1024c1880:     	add	x1, x24, #0x218
1024c1884:     	sub	x2, x29, #0xb0
1024c1888:     	mov	x3, x21
1024c188c:     	bl	0x1024afc3c
1024c1890:     	add	x0, x23, #0x8
1024c1894:     	bl	0x10001022c
1024c1898:     	ldr	d0, [x24, #0x270]
1024c189c:     	str	d0, [x19, #0x270]
1024c18a0:     	ldr	w8, [x24, #0x278]
1024c18a4:     	str	w8, [x19, #0x278]
1024c18a8:     	ldr	q0, [x24, #0x280]
1024c18ac:     	str	q0, [x19, #0x280]
1024c18b0:     	ldr	w8, [x24, #0x290]
1024c18b4:     	str	w8, [x19, #0x290]
1024c18b8:     	ldr	d0, [x24, #0x298]
1024c18bc:     	str	d0, [x19, #0x298]
1024c18c0:     	ldr	x8, [x24, #0x2a0]
1024c18c4:     	cbz	x8, 0x1024c18dc
1024c18c8:     	cbz	w21, 0x1024c18f8
1024c18cc:     	add	x0, x19, #0x2a0
1024c18d0:     	add	x1, x24, #0x2a0
1024c18d4:     	bl	0x100023be4
1024c18d8:     	b	0x1024c195c
1024c18dc:     	sub	x8, x29, #0x60
1024c18e0:     	ldr	q0, [x19, #0x2a0]
1024c18e4:     	movi.2d	v1, #0000000000000000
1024c18e8:     	str	q1, [x19, #0x2a0]
1024c18ec:     	stur	q0, [x29, #-0x60]
1024c18f0:     	orr	x0, x8, #0x8
1024c18f4:     	b	0x1024c1958
1024c18f8:     	ldr	x0, [x20]
1024c18fc:     	ldr	x9, [x24, #0x2a8]
1024c1900:     	stp	x8, x9, [sp, #0xc0]
1024c1904:     	cbz	x9, 0x1024c1914
1024c1908:     	add	x8, x9, #0x8
1024c190c:     	mov	w9, #0x1                ; =1
1024c1910:     	ldadd	w9, w8, [x8]
1024c1914:     	add	x23, sp, #0xc0
1024c1918:     	sub	x25, x29, #0xc0
1024c191c:     	sub	x8, x29, #0xc0
1024c1920:     	add	x1, sp, #0xc0
1024c1924:     	mov	x2, x22
1024c1928:     	bl	0x1024cc9a8
1024c192c:     	sub	x8, x29, #0x60
1024c1930:     	ldur	q0, [x29, #-0xc0]
1024c1934:     	stp	xzr, xzr, [x29, #-0xc0]
1024c1938:     	ldr	q1, [x19, #0x2a0]
1024c193c:     	str	q0, [x19, #0x2a0]
1024c1940:     	stur	q1, [x29, #-0x60]
1024c1944:     	orr	x0, x8, #0x8
1024c1948:     	bl	0x10001022c
1024c194c:     	orr	x0, x25, #0x8
1024c1950:     	bl	0x10001022c
1024c1954:     	add	x0, x23, #0x8
1024c1958:     	bl	0x10001022c
1024c195c:     	ldr	d0, [x24, #0x2b0]
1024c1960:     	str	d0, [x19, #0x2b0]
1024c1964:     	ldr	w8, [x24, #0x2c8]
1024c1968:     	tbnz	w8, #0x0, 0x1024c1994
1024c196c:     	add	x8, x19, #0x2b8
1024c1970:     	sub	x9, x29, #0x60
1024c1974:     	ldr	q0, [x8]
1024c1978:     	movi.2d	v1, #0000000000000000
1024c197c:     	str	q1, [x8]
1024c1980:     	stur	q0, [x29, #-0x60]
1024c1984:     	orr	x0, x9, #0x8
1024c1988:     	bl	0x10001022c
1024c198c:     	str	wzr, [x19, #0x2c8]
1024c1990:     	b	0x1024c1a18
1024c1994:     	add	x23, x19, #0x2b8
1024c1998:     	str	w8, [x19, #0x2c8]
1024c199c:     	cbz	w21, 0x1024c19b0
1024c19a0:     	add	x1, x24, #0x2b8
1024c19a4:     	mov	x0, x23
1024c19a8:     	bl	0x100023be4
1024c19ac:     	b	0x1024c1a18
1024c19b0:     	ldr	x0, [x20]
1024c19b4:     	ldr	x9, [x24, #0x2b8]
1024c19b8:     	ldr	x8, [x24, #0x2c0]
1024c19bc:     	stp	x9, x8, [sp, #0xb0]
1024c19c0:     	cbz	x8, 0x1024c19d0
1024c19c4:     	add	x8, x8, #0x8
1024c19c8:     	mov	w9, #0x1                ; =1
1024c19cc:     	ldadd	w9, w8, [x8]
1024c19d0:     	add	x25, sp, #0xb0
1024c19d4:     	sub	x26, x29, #0xc0
1024c19d8:     	sub	x8, x29, #0xc0
1024c19dc:     	add	x1, sp, #0xb0
1024c19e0:     	mov	x2, x22
1024c19e4:     	bl	0x1024cc71c
1024c19e8:     	sub	x8, x29, #0x60
1024c19ec:     	ldur	q0, [x29, #-0xc0]
1024c19f0:     	stp	xzr, xzr, [x29, #-0xc0]
1024c19f4:     	ldr	q1, [x23]
1024c19f8:     	str	q0, [x23]
1024c19fc:     	stur	q1, [x29, #-0x60]
1024c1a00:     	orr	x0, x8, #0x8
1024c1a04:     	bl	0x10001022c
1024c1a08:     	orr	x0, x26, #0x8
1024c1a0c:     	bl	0x10001022c
1024c1a10:     	add	x0, x25, #0x8
1024c1a14:     	bl	0x10001022c
1024c1a18:     	ldr	w8, [x24, #0x2cc]
1024c1a1c:     	str	w8, [x19, #0x2cc]
1024c1a20:     	ldr	q0, [x24, #0x2d0]
1024c1a24:     	str	q0, [x19, #0x2d0]
1024c1a28:     	ldr	q0, [x24, #0x2e0]
1024c1a2c:     	str	q0, [x19, #0x2e0]
1024c1a30:     	ldr	q0, [x24, #0x2f0]
1024c1a34:     	str	q0, [x19, #0x2f0]
1024c1a38:     	ldr	d0, [x24, #0x300]
1024c1a3c:     	str	d0, [x19, #0x300]
1024c1a40:     	ldp	x9, x8, [x20]
1024c1a44:     	stp	x9, x8, [sp, #0xa0]
1024c1a48:     	cbz	x8, 0x1024c1a58
1024c1a4c:     	add	x8, x8, #0x8
1024c1a50:     	mov	w9, #0x1                ; =1
1024c1a54:     	ldadd	w9, w8, [x8]
1024c1a58:     	add	x22, sp, #0xa0
1024c1a5c:     	add	x0, x19, #0x308
1024c1a60:     	add	x1, x24, #0x308
1024c1a64:     	add	x2, sp, #0xa0
1024c1a68:     	mov	x3, x21
1024c1a6c:     	bl	0x1024afc3c
1024c1a70:     	add	x0, x22, #0x8
1024c1a74:     	bl	0x10001022c
1024c1a78:     	ldr	q0, [x24, #0x360]
1024c1a7c:     	str	q0, [x19, #0x360]
1024c1a80:     	ldr	d0, [x24, #0x370]
1024c1a84:     	str	d0, [x19, #0x370]
1024c1a88:     	ldp	x9, x8, [x20]
1024c1a8c:     	stp	x9, x8, [sp, #0x90]
1024c1a90:     	cbz	x8, 0x1024c1aa0
1024c1a94:     	add	x8, x8, #0x8
1024c1a98:     	mov	w9, #0x1                ; =1
1024c1a9c:     	ldadd	w9, w8, [x8]
1024c1aa0:     	add	x22, sp, #0x90
1024c1aa4:     	add	x0, x19, #0x378
1024c1aa8:     	add	x1, x24, #0x378
1024c1aac:     	add	x2, sp, #0x90
1024c1ab0:     	mov	x3, x21
1024c1ab4:     	bl	0x1024afc3c
1024c1ab8:     	add	x0, x22, #0x8
1024c1abc:     	bl	0x10001022c
1024c1ac0:     	ldr	d0, [x24, #0x3d0]
1024c1ac4:     	str	d0, [x19, #0x3d0]
1024c1ac8:     	ldp	x9, x8, [x20]
1024c1acc:     	stp	x9, x8, [sp, #0x80]
1024c1ad0:     	cbz	x8, 0x1024c1ae0
1024c1ad4:     	add	x8, x8, #0x8
1024c1ad8:     	mov	w9, #0x1                ; =1
1024c1adc:     	ldadd	w9, w8, [x8]
1024c1ae0:     	add	x22, sp, #0x80
1024c1ae4:     	add	x0, x19, #0x3d8
1024c1ae8:     	add	x1, x24, #0x3d8
1024c1aec:     	add	x2, sp, #0x80
1024c1af0:     	mov	x3, x21
1024c1af4:     	bl	0x1024afc3c
1024c1af8:     	add	x0, x22, #0x8
1024c1afc:     	bl	0x10001022c
1024c1b00:     	ldr	d0, [x24, #0x430]
1024c1b04:     	str	d0, [x19, #0x430]
1024c1b08:     	ldr	w8, [x24, #0x438]
1024c1b0c:     	str	w8, [x19, #0x438]
1024c1b10:     	ldr	d0, [x24, #0x440]
1024c1b14:     	str	d0, [x19, #0x440]
1024c1b18:     	ldp	x9, x8, [x20]
1024c1b1c:     	stp	x9, x8, [sp, #0x70]
1024c1b20:     	cbz	x8, 0x1024c1b30
1024c1b24:     	add	x8, x8, #0x8
1024c1b28:     	mov	w9, #0x1                ; =1
1024c1b2c:     	ldadd	w9, w8, [x8]
1024c1b30:     	add	x22, sp, #0x70
1024c1b34:     	add	x0, x19, #0x448
1024c1b38:     	add	x1, x24, #0x448
1024c1b3c:     	add	x2, sp, #0x70
1024c1b40:     	mov	x3, x21
1024c1b44:     	bl	0x1024afc3c
1024c1b48:     	add	x0, x22, #0x8
1024c1b4c:     	bl	0x10001022c
1024c1b50:     	ldr	d0, [x24, #0x4a0]
1024c1b54:     	str	d0, [x19, #0x4a0]
1024c1b58:     	ldp	x9, x8, [x20]
1024c1b5c:     	stp	x9, x8, [sp, #0x60]
1024c1b60:     	cbz	x8, 0x1024c1b70
1024c1b64:     	add	x8, x8, #0x8
1024c1b68:     	mov	w9, #0x1                ; =1
1024c1b6c:     	ldadd	w9, w8, [x8]
1024c1b70:     	add	x22, sp, #0x60
1024c1b74:     	add	x0, x19, #0x4a8
1024c1b78:     	add	x1, x24, #0x4a8
1024c1b7c:     	add	x2, sp, #0x60
1024c1b80:     	mov	x3, x21
1024c1b84:     	bl	0x1024afc3c
1024c1b88:     	add	x0, x22, #0x8
1024c1b8c:     	bl	0x10001022c
1024c1b90:     	ldr	d0, [x24, #0x500]
1024c1b94:     	str	d0, [x19, #0x500]
1024c1b98:     	ldp	x9, x8, [x20]
1024c1b9c:     	stp	x9, x8, [sp, #0x50]
1024c1ba0:     	cbz	x8, 0x1024c1bb0
1024c1ba4:     	add	x8, x8, #0x8
1024c1ba8:     	mov	w9, #0x1                ; =1
1024c1bac:     	ldadd	w9, w8, [x8]
1024c1bb0:     	add	x22, sp, #0x50
1024c1bb4:     	add	x0, x19, #0x508
1024c1bb8:     	add	x1, x24, #0x508
1024c1bbc:     	add	x2, sp, #0x50
1024c1bc0:     	mov	x3, x21
1024c1bc4:     	bl	0x1024afc3c
1024c1bc8:     	add	x0, x22, #0x8
1024c1bcc:     	bl	0x10001022c
1024c1bd0:     	ldr	d0, [x24, #0x560]
1024c1bd4:     	str	d0, [x19, #0x560]
1024c1bd8:     	ldp	x9, x8, [x20]
1024c1bdc:     	stp	x9, x8, [sp, #0x40]
1024c1be0:     	cbz	x8, 0x1024c1bf0
1024c1be4:     	add	x8, x8, #0x8
1024c1be8:     	mov	w9, #0x1                ; =1
1024c1bec:     	ldadd	w9, w8, [x8]
1024c1bf0:     	add	x22, sp, #0x40
1024c1bf4:     	add	x0, x19, #0x568
1024c1bf8:     	add	x1, x24, #0x568
1024c1bfc:     	add	x2, sp, #0x40
1024c1c00:     	mov	x3, x21
1024c1c04:     	bl	0x1024afc3c
1024c1c08:     	add	x0, x22, #0x8
1024c1c0c:     	bl	0x10001022c
1024c1c10:     	ldr	d0, [x24, #0x5c0]
1024c1c14:     	str	d0, [x19, #0x5c0]
1024c1c18:     	ldp	x9, x8, [x20]
1024c1c1c:     	stp	x9, x8, [sp, #0x30]
1024c1c20:     	cbz	x8, 0x1024c1c30
1024c1c24:     	add	x8, x8, #0x8
1024c1c28:     	mov	w9, #0x1                ; =1
1024c1c2c:     	ldadd	w9, w8, [x8]
1024c1c30:     	add	x22, sp, #0x30
1024c1c34:     	add	x0, x19, #0x5c8
1024c1c38:     	add	x1, x24, #0x5c8
1024c1c3c:     	add	x2, sp, #0x30
1024c1c40:     	mov	x3, x21
1024c1c44:     	bl	0x1024afc3c
1024c1c48:     	add	x0, x22, #0x8
1024c1c4c:     	bl	0x10001022c
1024c1c50:     	ldr	d0, [x24, #0x620]
1024c1c54:     	str	d0, [x19, #0x620]
1024c1c58:     	ldr	d0, [x24, #0x628]
1024c1c5c:     	str	d0, [x19, #0x628]
1024c1c60:     	ldp	x9, x8, [x20]
1024c1c64:     	stp	x9, x8, [sp, #0x20]
1024c1c68:     	cbz	x8, 0x1024c1c78
1024c1c6c:     	add	x8, x8, #0x8
1024c1c70:     	mov	w9, #0x1                ; =1
1024c1c74:     	ldadd	w9, w8, [x8]
1024c1c78:     	add	x22, sp, #0x20
1024c1c7c:     	add	x0, x19, #0x630
1024c1c80:     	add	x1, x24, #0x630
1024c1c84:     	add	x2, sp, #0x20
1024c1c88:     	mov	x3, x21
1024c1c8c:     	bl	0x1024afc3c
1024c1c90:     	add	x0, x22, #0x8
1024c1c94:     	bl	0x10001022c
1024c1c98:     	ldr	d0, [x24, #0x688]
1024c1c9c:     	str	d0, [x19, #0x688]
1024c1ca0:     	ldp	x9, x8, [x20]
1024c1ca4:     	stp	x9, x8, [sp, #0x10]
1024c1ca8:     	cbz	x8, 0x1024c1cb8
1024c1cac:     	add	x8, x8, #0x8
1024c1cb0:     	mov	w9, #0x1                ; =1
1024c1cb4:     	ldadd	w9, w8, [x8]
1024c1cb8:     	add	x22, sp, #0x10
1024c1cbc:     	add	x0, x19, #0x690
1024c1cc0:     	add	x1, x24, #0x690
1024c1cc4:     	add	x2, sp, #0x10
1024c1cc8:     	mov	x3, x21
1024c1ccc:     	bl	0x1024afc3c
1024c1cd0:     	add	x0, x22, #0x8
1024c1cd4:     	bl	0x10001022c
1024c1cd8:     	ldr	d0, [x24, #0x6e8]
1024c1cdc:     	str	d0, [x19, #0x6e8]
1024c1ce0:     	ldrb	w8, [x19, #0x624]
1024c1ce4:     	tbnz	w8, #0x1, 0x1024c1d04
1024c1ce8:     	sub	x8, x29, #0x60
1024c1cec:     	ldr	q0, [x19, #0x6f0]
1024c1cf0:     	movi.2d	v1, #0000000000000000
1024c1cf4:     	str	q1, [x19, #0x6f0]
1024c1cf8:     	stur	q0, [x29, #-0x60]
1024c1cfc:     	orr	x0, x8, #0x8
1024c1d00:     	b	0x1024c1d78
1024c1d04:     	cbz	w21, 0x1024c1d18
1024c1d08:     	add	x0, x19, #0x6f0
1024c1d0c:     	add	x1, x24, #0x6f0
1024c1d10:     	bl	0x100023be4
1024c1d14:     	b	0x1024c1d7c
1024c1d18:     	ldr	x0, [x20]
1024c1d1c:     	ldr	x9, [x24, #0x6f0]
1024c1d20:     	ldr	x8, [x24, #0x6f8]
1024c1d24:     	stp	x9, x8, [sp]
1024c1d28:     	cbz	x8, 0x1024c1d38
1024c1d2c:     	add	x8, x8, #0x8
1024c1d30:     	mov	w9, #0x1                ; =1
1024c1d34:     	ldadd	w9, w8, [x8]
1024c1d38:     	mov	x20, sp
1024c1d3c:     	sub	x21, x29, #0xc0
1024c1d40:     	sub	x8, x29, #0xc0
1024c1d44:     	mov	x1, sp
1024c1d48:     	bl	0x1024ccbf8
1024c1d4c:     	sub	x8, x29, #0x60
1024c1d50:     	ldur	q0, [x29, #-0xc0]
1024c1d54:     	stp	xzr, xzr, [x29, #-0xc0]
1024c1d58:     	ldr	q1, [x19, #0x6f0]
1024c1d5c:     	str	q0, [x19, #0x6f0]
1024c1d60:     	stur	q1, [x29, #-0x60]
1024c1d64:     	orr	x0, x8, #0x8
1024c1d68:     	bl	0x10001022c
1024c1d6c:     	orr	x0, x21, #0x8
1024c1d70:     	bl	0x10001022c
1024c1d74:     	add	x0, x20, #0x8
1024c1d78:     	bl	0x10001022c
1024c1d7c:     	ldr	w8, [x24, #0x700]
1024c1d80:     	str	w8, [x19, #0x700]
1024c1d84:     	ldr	w8, [x24, #0x710]
1024c1d88:     	str	w8, [x19, #0x710]
1024c1d8c:     	ldr	d0, [x24, #0x708]
1024c1d90:     	str	d0, [x19, #0x708]
1024c1d94:     	ldr	d0, [x24, #0x718]
1024c1d98:     	str	d0, [x19, #0x718]
1024c1d9c:     	ldr	q0, [x24, #0x720]
1024c1da0:     	str	q0, [x19, #0x720]
1024c1da4:     	ldr	q0, [x24, #0x730]
1024c1da8:     	str	q0, [x19, #0x730]
1024c1dac:     	ldp	x29, x30, [sp, #0x190]
1024c1db0:     	ldp	x20, x19, [sp, #0x180]
1024c1db4:     	ldp	x22, x21, [sp, #0x170]
1024c1db8:     	ldp	x24, x23, [sp, #0x160]
1024c1dbc:     	ldp	x26, x25, [sp, #0x150]
1024c1dc0:     	ldp	x28, x27, [sp, #0x140]
1024c1dc4:     	add	sp, sp, #0x1a0
1024c1dc8:     	ret
1024c1dcc:     	mov	x19, x0
1024c1dd0:     	add	x0, x20, #0x8
1024c1dd4:     	b	0x1024c1e30
1024c1dd8:     	mov	x19, x0
1024c1ddc:     	add	x0, x25, #0x8
1024c1de0:     	b	0x1024c1e30
1024c1de4:     	b	0x1024c1e28
1024c1de8:     	b	0x1024c1e0c
1024c1dec:     	b	0x1024c1e0c
1024c1df0:     	b	0x1024c1e0c
1024c1df4:     	b	0x1024c1e0c
1024c1df8:     	b	0x1024c1e0c
1024c1dfc:     	b	0x1024c1e0c
1024c1e00:     	b	0x1024c1e0c
1024c1e04:     	b	0x1024c1e0c
1024c1e08:     	b	0x1024c1e0c
1024c1e0c:     	mov	x19, x0
1024c1e10:     	add	x0, x22, #0x8
1024c1e14:     	b	0x1024c1e30
1024c1e18:     	b	0x1024c1e28
1024c1e1c:     	b	0x1024c1e28
1024c1e20:     	b	0x1024c1e28
1024c1e24:     	b	0x1024c1e28
1024c1e28:     	mov	x19, x0
1024c1e2c:     	add	x0, x23, #0x8
1024c1e30:     	bl	0x10001022c
1024c1e34:     	mov	x0, x19
1024c1e38:     	bl	0x103bda970

FUNCTION 0x1024c1e3c size 28
1024c1e3c:     	ldp	x10, x9, [x0, #0x68]
1024c1e40:     	stp	x10, x9, [x8]
1024c1e44:     	cbz	x9, 0x1024c1e54
1024c1e48:     	add	x8, x9, #0x8
1024c1e4c:     	mov	w9, #0x1                ; =1
1024c1e50:     	ldadd	w9, w8, [x8]
1024c1e54:     	ret

FUNCTION 0x1024c1e58 size 236
1024c1e58:     	sub	sp, sp, #0x80
1024c1e5c:     	stp	x24, x23, [sp, #0x40]
1024c1e60:     	stp	x22, x21, [sp, #0x50]
1024c1e64:     	stp	x20, x19, [sp, #0x60]
1024c1e68:     	stp	x29, x30, [sp, #0x70]
1024c1e6c:     	add	x29, sp, #0x70
1024c1e70:     	mov	x20, x0
1024c1e74:     	mov	x19, x8
1024c1e78:     	ldr	x8, [x0, #0x68]
1024c1e7c:     	cbnz	x8, 0x1024c1ef8
1024c1e80:     	add	x21, sp, #0x20
1024c1e84:     	add	x8, sp, #0x20
1024c1e88:     	mov	x0, x20
1024c1e8c:     	bl	0x103671930
1024c1e90:     	ldp	x9, x8, [sp, #0x20]
1024c1e94:     	stp	x9, x8, [sp]
1024c1e98:     	cbz	x8, 0x1024c1ea8
1024c1e9c:     	add	x8, x8, #0x8
1024c1ea0:     	mov	w9, #0x1                ; =1
1024c1ea4:     	ldadd	w9, w8, [x8]
1024c1ea8:     	mov	x22, sp
1024c1eac:     	add	x23, sp, #0x10
1024c1eb0:     	add	x8, sp, #0x10
1024c1eb4:     	mov	x0, sp
1024c1eb8:     	bl	0x1024c11e4
1024c1ebc:     	add	x8, sp, #0x30
1024c1ec0:     	ldr	q0, [sp, #0x10]
1024c1ec4:     	stp	xzr, xzr, [sp, #0x10]
1024c1ec8:     	ldur	q1, [x20, #0x68]
1024c1ecc:     	stur	q0, [x20, #0x68]
1024c1ed0:     	str	q1, [sp, #0x30]
1024c1ed4:     	orr	x0, x8, #0x8
1024c1ed8:     	bl	0x10001022c
1024c1edc:     	orr	x0, x23, #0x8
1024c1ee0:     	bl	0x10001022c
1024c1ee4:     	add	x0, x22, #0x8
1024c1ee8:     	bl	0x10001022c
1024c1eec:     	add	x0, x21, #0x8
1024c1ef0:     	bl	0x10001022c
1024c1ef4:     	ldr	x8, [x20, #0x68]
1024c1ef8:     	ldr	x9, [x20, #0x70]
1024c1efc:     	stp	x8, x9, [x19]
1024c1f00:     	cbz	x9, 0x1024c1f10
1024c1f04:     	add	x8, x9, #0x8
1024c1f08:     	mov	w9, #0x1                ; =1
1024c1f0c:     	ldadd	w9, w8, [x8]
1024c1f10:     	ldp	x29, x30, [sp, #0x70]
1024c1f14:     	ldp	x20, x19, [sp, #0x60]
1024c1f18:     	ldp	x22, x21, [sp, #0x50]
1024c1f1c:     	ldp	x24, x23, [sp, #0x40]
1024c1f20:     	add	sp, sp, #0x80
1024c1f24:     	ret
1024c1f28:     	mov	x19, x0
1024c1f2c:     	add	x0, x22, #0x8
1024c1f30:     	bl	0x10001022c
1024c1f34:     	add	x0, x21, #0x8
1024c1f38:     	bl	0x10001022c
1024c1f3c:     	mov	x0, x19
1024c1f40:     	bl	0x103bda970

FUNCTION 0x1024c1f44 size 1488
1024c1f44:     	sub	sp, sp, #0xe0
1024c1f48:     	stp	d9, d8, [sp, #0x70]
1024c1f4c:     	stp	x28, x27, [sp, #0x80]
1024c1f50:     	stp	x26, x25, [sp, #0x90]
1024c1f54:     	stp	x24, x23, [sp, #0xa0]
1024c1f58:     	stp	x22, x21, [sp, #0xb0]
1024c1f5c:     	stp	x20, x19, [sp, #0xc0]
1024c1f60:     	stp	x29, x30, [sp, #0xd0]
1024c1f64:     	add	x29, sp, #0xd0
1024c1f68:     	fmov	d8, d1
1024c1f6c:     	fmov	d9, d0
1024c1f70:     	mov	x19, x8
1024c1f74:     	ldr	x9, [x1]
1024c1f78:     	ldp	x8, x9, [x9, #0x68]
1024c1f7c:     	stp	x8, x9, [sp, #0x60]
1024c1f80:     	cbz	x9, 0x1024c1f90
1024c1f84:     	add	x9, x9, #0x8
1024c1f88:     	mov	w10, #0x1               ; =1
1024c1f8c:     	ldadd	w10, w9, [x9]
1024c1f90:     	adrp	x9, 0x1042e6000
1024c1f94:     	ldr	d0, [x9, #0xfd0]
1024c1f98:     	fcmp	d9, d0
1024c1f9c:     	b.lt	0x1024c1fc4
1024c1fa0:     	adrp	x9, 0x1042e6000
1024c1fa4:     	ldr	d1, [x9, #0xfd8]
1024c1fa8:     	fcmp	d9, d1
1024c1fac:     	b.hi	0x1024c1fc4
1024c1fb0:     	mov	w12, #0x0               ; =0
1024c1fb4:     	str	xzr, [sp, #0x18]
1024c1fb8:     	mov	w28, #0x0               ; =0
1024c1fbc:     	mov	w24, #0x0               ; =0
1024c1fc0:     	b	0x1024c2000
1024c1fc4:     	ldr	x9, [x1]
1024c1fc8:     	ldr	w10, [x9, #0x624]
1024c1fcc:     	and	w24, w10, #0x1
1024c1fd0:     	ldr	w9, [x9, #0x2c8]
1024c1fd4:     	and	w28, w9, #0x1
1024c1fd8:     	cbz	x8, 0x1024c1ff8
1024c1fdc:     	ldrb	w9, [x8, #0x624]
1024c1fe0:     	and	w10, w9, #0x1
1024c1fe4:     	ldrb	w9, [x8, #0x2c8]
1024c1fe8:     	and	w9, w9, #0x1
1024c1fec:     	stp	w10, w9, [sp, #0x18]
1024c1ff0:     	mov	w12, #0x1               ; =1
1024c1ff4:     	b	0x1024c2000
1024c1ff8:     	mov	w12, #0x0               ; =0
1024c1ffc:     	str	xzr, [sp, #0x18]
1024c2000:     	fabs	d1, d8
1024c2004:     	adrp	x9, 0x1042e3000
1024c2008:     	ldr	d2, [x9, #0x690]
1024c200c:     	fcmp	d1, d2
1024c2010:     	b.ls	0x1024c207c
1024c2014:     	ldr	x9, [x1]
1024c2018:     	ldr	w10, [x9, #0x2c8]
1024c201c:     	and	w26, w10, #0x1
1024c2020:     	ldr	w10, [x9, #0x278]
1024c2024:     	ldrb	w11, [x9, #0x624]
1024c2028:     	tbnz	w11, #0x0, 0x1024c208c
1024c202c:     	tbnz	w10, #0x6, 0x1024c20b4
1024c2030:     	ldr	w10, [x9, #0x80]
1024c2034:     	tbnz	w10, #0x4, 0x1024c24bc
1024c2038:     	ldr	d1, [x9, #0x210]
1024c203c:     	fcmp	d1, d0
1024c2040:     	b.lt	0x1024c206c
1024c2044:     	adrp	x10, 0x1042e6000
1024c2048:     	ldr	d2, [x10, #0xfd8]
1024c204c:     	fcmp	d1, d2
1024c2050:     	b.hi	0x1024c206c
1024c2054:     	mov	w27, #0x0               ; =0
1024c2058:     	ldr	w9, [x9, #0x220]
1024c205c:     	mov	w21, #0x0               ; =0
1024c2060:     	cmp	w9, #0x1
1024c2064:     	b.eq	0x1024c20bc
1024c2068:     	tbz	w9, #0x0, 0x1024c20bc
1024c206c:     	mov	w21, #0x0               ; =0
1024c2070:     	mov	w27, #0x1               ; =1
1024c2074:     	cbnz	x8, 0x1024c20c0
1024c2078:     	b	0x1024c20a8
1024c207c:     	mov	w27, #0x0               ; =0
1024c2080:     	mov	w26, #0x0               ; =0
1024c2084:     	mov	w21, #0x0               ; =0
1024c2088:     	b	0x1024c20a8
1024c208c:     	mov	w11, #0x1               ; =1
1024c2090:     	bic	w27, w11, w10, lsr #6
1024c2094:     	ldrh	w9, [x9, #0x290]
1024c2098:     	mov	w10, #0x340             ; =832
1024c209c:     	tst	w9, w10
1024c20a0:     	cset	w21, eq
1024c20a4:     	cbnz	x8, 0x1024c20c0
1024c20a8:     	mov	w25, #0x0               ; =0
1024c20ac:     	str	xzr, [sp, #0x10]
1024c20b0:     	b	0x1024c2148
1024c20b4:     	mov	w27, #0x0               ; =0
1024c20b8:     	mov	w21, #0x0               ; =0
1024c20bc:     	cbz	x8, 0x1024c20a8
1024c20c0:     	ldr	w9, [x8, #0x2c8]
1024c20c4:     	and	w9, w9, #0x1
1024c20c8:     	str	w9, [sp, #0x14]
1024c20cc:     	ldr	w9, [x8, #0x278]
1024c20d0:     	ldrb	w10, [x8, #0x624]
1024c20d4:     	tbnz	w10, #0x0, 0x1024c2120
1024c20d8:     	tbnz	w9, #0x6, 0x1024c2140
1024c20dc:     	ldr	w9, [x8, #0x80]
1024c20e0:     	tbnz	w9, #0x4, 0x1024c24d0
1024c20e4:     	ldr	d1, [x8, #0x210]
1024c20e8:     	fcmp	d1, d0
1024c20ec:     	b.lt	0x1024c2114
1024c20f0:     	adrp	x9, 0x1042e6000
1024c20f4:     	ldr	d0, [x9, #0xfd8]
1024c20f8:     	fcmp	d1, d0
1024c20fc:     	b.hi	0x1024c2114
1024c2100:     	mov	w25, #0x0               ; =0
1024c2104:     	ldr	w8, [x8, #0x220]
1024c2108:     	cmp	w8, #0x1
1024c210c:     	b.eq	0x1024c24dc
1024c2110:     	tbz	w8, #0x0, 0x1024c24dc
1024c2114:     	str	wzr, [sp, #0x10]
1024c2118:     	mov	w25, #0x1               ; =1
1024c211c:     	b	0x1024c2148
1024c2120:     	ldrh	w8, [x8, #0x290]
1024c2124:     	mov	w10, #0x340             ; =832
1024c2128:     	tst	w8, w10
1024c212c:     	cset	w8, eq
1024c2130:     	str	w8, [sp, #0x10]
1024c2134:     	tst	w9, #0x40
1024c2138:     	cset	w25, eq
1024c213c:     	b	0x1024c2148
1024c2140:     	mov	w25, #0x0               ; =0
1024c2144:     	str	wzr, [sp, #0x10]
1024c2148:     	orr	w8, w24, w28
1024c214c:     	orr	w9, w27, w26
1024c2150:     	orr	w8, w8, w9
1024c2154:     	orr	w8, w8, w21
1024c2158:     	cmp	w8, #0x0
1024c215c:     	str	w12, [sp, #0xc]
1024c2160:     	csinc	w8, w12, wzr, eq
1024c2164:     	ldp	w10, w9, [sp, #0x18]
1024c2168:     	orr	w9, w10, w9
1024c216c:     	orr	w8, w8, w9
1024c2170:     	tbnz	w8, #0x0, 0x1024c2190
1024c2174:     	tbnz	w25, #0x0, 0x1024c2190
1024c2178:     	ldr	w8, [sp, #0x14]
1024c217c:     	cbnz	w8, 0x1024c2190
1024c2180:     	ldr	w8, [sp, #0x10]
1024c2184:     	cbnz	w8, 0x1024c2190
1024c2188:     	stp	xzr, xzr, [x19]
1024c218c:     	b	0x1024c248c
1024c2190:     	ldp	x9, x8, [x0]
1024c2194:     	stp	x9, x8, [sp, #0x50]
1024c2198:     	cbz	x8, 0x1024c21a8
1024c219c:     	add	x8, x8, #0x8
1024c21a0:     	mov	w9, #0x1                ; =1
1024c21a4:     	ldadd	w9, w8, [x8]
1024c21a8:     	ldp	x9, x8, [x1]
1024c21ac:     	stp	x9, x8, [sp, #0x40]
1024c21b0:     	cbz	x8, 0x1024c21c0
1024c21b4:     	add	x8, x8, #0x8
1024c21b8:     	mov	w9, #0x1                ; =1
1024c21bc:     	ldadd	w9, w8, [x8]
1024c21c0:     	ldp	x9, x8, [x2]
1024c21c4:     	stp	x9, x8, [sp, #0x30]
1024c21c8:     	cbz	x8, 0x1024c21d8
1024c21cc:     	add	x8, x8, #0x8
1024c21d0:     	mov	w9, #0x1                ; =1
1024c21d4:     	ldadd	w9, w8, [x8]
1024c21d8:     	add	x22, sp, #0x50
1024c21dc:     	add	x20, sp, #0x40
1024c21e0:     	add	x23, sp, #0x30
1024c21e4:     	add	x0, sp, #0x50
1024c21e8:     	add	x1, sp, #0x40
1024c21ec:     	add	x2, sp, #0x30
1024c21f0:     	mov	x8, x19
1024c21f4:     	mov	w3, #0x0                ; =0
1024c21f8:     	mov	w4, #0x1                ; =1
1024c21fc:     	bl	0x1024c1398
1024c2200:     	add	x0, x23, #0x8
1024c2204:     	bl	0x10001022c
1024c2208:     	add	x0, x20, #0x8
1024c220c:     	bl	0x10001022c
1024c2210:     	add	x0, x22, #0x8
1024c2214:     	bl	0x10001022c
1024c2218:     	ldr	x9, [x19]
1024c221c:     	ldp	x8, x9, [x9, #0x68]
1024c2220:     	stp	x8, x9, [sp, #0x20]
1024c2224:     	cbz	x9, 0x1024c2234
1024c2228:     	add	x9, x9, #0x8 STRING 'counted_impl_pIN12Planeswalker4Urza30UR3DOdObjectSelectionPopupViewEEE'
1024c222c:     	mov	w10, #0x1               ; =1
1024c2230:     	ldadd	w10, w9, [x9]
1024c2234:     	cbz	w24, 0x1024c2248
1024c2238:     	ldr	x9, [x19]
1024c223c:     	ldr	d0, [x9, #0x628]
1024c2240:     	fmul	d0, d0, d9
1024c2244:     	str	d0, [x9, #0x628]
1024c2248:     	cbz	w28, 0x1024c225c
1024c224c:     	ldr	x9, [x19]
1024c2250:     	ldr	d0, [x9, #0x2d0]
1024c2254:     	fmul	d0, d0, d9
1024c2258:     	str	d0, [x9, #0x2d0]
1024c225c:     	adrp	x9, 0x1042f3000
1024c2260:     	cbz	w27, 0x1024c22b0
1024c2264:     	ldr	x10, [x19]
1024c2268:     	ldr	d0, [x10, #0x270]
1024c226c:     	fadd	d0, d0, d8
1024c2270:     	str	d0, [x10, #0x270]
1024c2274:     	ldr	d1, [x9, #0xb8]
1024c2278:     	fcmp	d0, d1
1024c227c:     	b.le	0x1024c2298
1024c2280:     	adrp	x11, 0x1042f3000
1024c2284:     	ldr	d2, [x11, #0xa8]
1024c2288:     	fadd	d0, d0, d2
1024c228c:     	fcmp	d0, d1
1024c2290:     	b.gt	0x1024c2288
1024c2294:     	str	d0, [x10, #0x270]
1024c2298:     	fcmp	d0, #0.0
1024c229c:     	b.pl	0x1024c22b0
1024c22a0:     	fadd	d0, d0, d1
1024c22a4:     	fcmp	d0, #0.0
1024c22a8:     	b.mi	0x1024c22a0
1024c22ac:     	str	d0, [x10, #0x270]
1024c22b0:     	cbz	w26, 0x1024c2300
1024c22b4:     	ldr	x10, [x19]
1024c22b8:     	ldr	d0, [x10, #0x2d8]
1024c22bc:     	fadd	d0, d0, d8
1024c22c0:     	str	d0, [x10, #0x2d8]
1024c22c4:     	ldr	d1, [x9, #0xb8]
1024c22c8:     	fcmp	d0, d1
1024c22cc:     	b.le	0x1024c22e8
1024c22d0:     	adrp	x11, 0x1042f3000
1024c22d4:     	ldr	d2, [x11, #0xa8]
1024c22d8:     	fadd	d0, d0, d2
1024c22dc:     	fcmp	d0, d1
1024c22e0:     	b.gt	0x1024c22d8
1024c22e4:     	str	d0, [x10, #0x2d8]
1024c22e8:     	fcmp	d0, #0.0
1024c22ec:     	b.pl	0x1024c2300
1024c22f0:     	fadd	d0, d0, d1
1024c22f4:     	fcmp	d0, #0.0
1024c22f8:     	b.mi	0x1024c22f0
1024c22fc:     	str	d0, [x10, #0x2d8]
1024c2300:     	cbz	w21, 0x1024c2350
1024c2304:     	ldr	x10, [x19]
1024c2308:     	ldr	d0, [x10, #0x288]
1024c230c:     	fadd	d0, d0, d8
1024c2310:     	str	d0, [x10, #0x288]
1024c2314:     	ldr	d1, [x9, #0xb8]
1024c2318:     	fcmp	d0, d1
1024c231c:     	b.le	0x1024c2338
1024c2320:     	adrp	x11, 0x1042f3000
1024c2324:     	ldr	d2, [x11, #0xa8]
1024c2328:     	fadd	d0, d0, d2
1024c232c:     	fcmp	d0, d1
1024c2330:     	b.gt	0x1024c2328
1024c2334:     	str	d0, [x10, #0x288]
1024c2338:     	fcmp	d0, #0.0
1024c233c:     	b.pl	0x1024c2350
1024c2340:     	fadd	d0, d0, d1
1024c2344:     	fcmp	d0, #0.0
1024c2348:     	b.mi	0x1024c2340
1024c234c:     	str	d0, [x10, #0x288]
1024c2350:     	add	x10, sp, #0x20
1024c2354:     	ldr	x11, [sp, #0x60]
1024c2358:     	cbz	x11, 0x1024c2484
1024c235c:     	ldr	w11, [sp, #0xc]
1024c2360:     	cbz	w11, 0x1024c2370
1024c2364:     	ldr	d0, [x8, #0x78]
1024c2368:     	fmul	d0, d0, d9
1024c236c:     	str	d0, [x8, #0x78]
1024c2370:     	ldr	w11, [sp, #0x18]
1024c2374:     	cbz	w11, 0x1024c2384
1024c2378:     	ldr	d0, [x8, #0x628]
1024c237c:     	fmul	d0, d0, d9
1024c2380:     	str	d0, [x8, #0x628]
1024c2384:     	ldr	w11, [sp, #0x1c]
1024c2388:     	cbz	w11, 0x1024c2398
1024c238c:     	ldr	d0, [x8, #0x2d0]
1024c2390:     	fmul	d0, d0, d9
1024c2394:     	str	d0, [x8, #0x2d0]
1024c2398:     	cbz	w25, 0x1024c23e4
1024c239c:     	ldr	d0, [x8, #0x270]
1024c23a0:     	fadd	d0, d0, d8
1024c23a4:     	str	d0, [x8, #0x270]
1024c23a8:     	ldr	d1, [x9, #0xb8]
1024c23ac:     	fcmp	d0, d1
1024c23b0:     	b.le	0x1024c23cc
1024c23b4:     	adrp	x11, 0x1042f3000
1024c23b8:     	ldr	d2, [x11, #0xa8]
1024c23bc:     	fadd	d0, d0, d2
1024c23c0:     	fcmp	d0, d1
1024c23c4:     	b.gt	0x1024c23bc
1024c23c8:     	str	d0, [x8, #0x270]
1024c23cc:     	fcmp	d0, #0.0
1024c23d0:     	b.pl	0x1024c23e4
1024c23d4:     	fadd	d0, d0, d1
1024c23d8:     	fcmp	d0, #0.0
1024c23dc:     	b.mi	0x1024c23d4
1024c23e0:     	str	d0, [x8, #0x270]
1024c23e4:     	ldr	w11, [sp, #0x14]
1024c23e8:     	cbz	w11, 0x1024c2434
1024c23ec:     	ldr	d0, [x8, #0x2d8]
1024c23f0:     	fadd	d0, d0, d8
1024c23f4:     	str	d0, [x8, #0x2d8]
1024c23f8:     	ldr	d1, [x9, #0xb8]
1024c23fc:     	fcmp	d0, d1
1024c2400:     	b.le	0x1024c241c
1024c2404:     	adrp	x11, 0x1042f3000
1024c2408:     	ldr	d2, [x11, #0xa8]
1024c240c:     	fadd	d0, d0, d2
1024c2410:     	fcmp	d0, d1
1024c2414:     	b.gt	0x1024c240c
1024c2418:     	str	d0, [x8, #0x2d8]
1024c241c:     	fcmp	d0, #0.0
1024c2420:     	b.pl	0x1024c2434
1024c2424:     	fadd	d0, d0, d1
1024c2428:     	fcmp	d0, #0.0
1024c242c:     	b.mi	0x1024c2424
1024c2430:     	str	d0, [x8, #0x2d8]
1024c2434:     	ldr	w11, [sp, #0x10]
1024c2438:     	cbz	w11, 0x1024c2484
1024c243c:     	ldr	d0, [x8, #0x288]
1024c2440:     	fadd	d0, d0, d8
1024c2444:     	str	d0, [x8, #0x288]
1024c2448:     	ldr	d1, [x9, #0xb8]
1024c244c:     	fcmp	d0, d1
1024c2450:     	b.le	0x1024c246c
1024c2454:     	adrp	x9, 0x1042f3000
1024c2458:     	ldr	d2, [x9, #0xa8]
1024c245c:     	fadd	d0, d0, d2
1024c2460:     	fcmp	d0, d1
1024c2464:     	b.gt	0x1024c245c
1024c2468:     	str	d0, [x8, #0x288]
1024c246c:     	fcmp	d0, #0.0
1024c2470:     	b.pl	0x1024c2484
1024c2474:     	fadd	d0, d0, d1
1024c2478:     	fcmp	d0, #0.0
1024c247c:     	b.mi	0x1024c2474
1024c2480:     	str	d0, [x8, #0x288]
1024c2484:     	add	x0, x10, #0x8 STRING 'counted_impl_pIN12Planeswalker4Urza30UR3DOdObjectSelectionPopupViewEEE'
1024c2488:     	bl	0x10001022c
1024c248c:     	add	x8, sp, #0x60
1024c2490:     	add	x0, x8, #0x8
1024c2494:     	bl	0x10001022c
1024c2498:     	ldp	x29, x30, [sp, #0xd0]
1024c249c:     	ldp	x20, x19, [sp, #0xc0]
1024c24a0:     	ldp	x22, x21, [sp, #0xb0]
1024c24a4:     	ldp	x24, x23, [sp, #0xa0]
1024c24a8:     	ldp	x26, x25, [sp, #0x90]
1024c24ac:     	ldp	x28, x27, [sp, #0x80]
1024c24b0:     	ldp	d9, d8, [sp, #0x70]
1024c24b4:     	add	sp, sp, #0xe0
1024c24b8:     	ret
1024c24bc:     	mov	w21, #0x0               ; =0
1024c24c0:     	mov	w9, #0x1                ; =1
1024c24c4:     	bic	w27, w9, w10, lsr #5
1024c24c8:     	cbnz	x8, 0x1024c20c0
1024c24cc:     	b	0x1024c20a8
1024c24d0:     	str	wzr, [sp, #0x10]
1024c24d4:     	tst	w9, #0x20
1024c24d8:     	b	0x1024c2138
1024c24dc:     	str	w25, [sp, #0x10]
1024c24e0:     	b	0x1024c2148
1024c24e4:     	mov	x19, x0
1024c24e8:     	add	x0, x23, #0x8
1024c24ec:     	bl	0x10001022c
1024c24f0:     	add	x0, x20, #0x8
1024c24f4:     	bl	0x10001022c
1024c24f8:     	add	x0, x22, #0x8
1024c24fc:     	bl	0x10001022c
1024c2500:     	add	x8, sp, #0x60
1024c2504:     	add	x0, x8, #0x8
1024c2508:     	bl	0x10001022c
1024c250c:     	mov	x0, x19
1024c2510:     	bl	0x103bda970

FUNCTION 0x1024c2514 size 816
1024c2514:     	sub	sp, sp, #0xc0
1024c2518:     	stp	x28, x27, [sp, #0x60]
1024c251c:     	stp	x26, x25, [sp, #0x70]
1024c2520:     	stp	x24, x23, [sp, #0x80]
1024c2524:     	stp	x22, x21, [sp, #0x90]
1024c2528:     	stp	x20, x19, [sp, #0xa0]
1024c252c:     	stp	x29, x30, [sp, #0xb0]
1024c2530:     	add	x29, sp, #0xb0
1024c2534:     	mov	x20, x2
1024c2538:     	mov	x21, x1
1024c253c:     	mov	x19, x8
1024c2540:     	ldr	x8, [x1]
1024c2544:     	ldp	x10, x8, [x8, #0x68]
1024c2548:     	stp	x10, x8, [sp, #0x50]
1024c254c:     	cbz	x8, 0x1024c255c
1024c2550:     	add	x8, x8, #0x8
1024c2554:     	mov	w9, #0x1                ; =1
1024c2558:     	ldadd	w9, w8, [x8]
1024c255c:     	ldr	x9, [x20]
1024c2560:     	ldp	x11, x8, [x9, #0x68]
1024c2564:     	stp	x11, x8, [sp, #0x40]
1024c2568:     	cbz	x8, 0x1024c257c
1024c256c:     	add	x8, x8, #0x8
1024c2570:     	mov	w9, #0x1                ; =1
1024c2574:     	ldadd	w9, w8, [x8]
1024c2578:     	ldr	x9, [x20]
1024c257c:     	ldr	x8, [x21]
1024c2580:     	ldr	d2, [x8, #0x270]
1024c2584:     	ldr	d3, [x9, #0x270]
1024c2588:     	adrp	x12, 0x1042e3000
1024c258c:     	ldr	d0, [x12, #0x688]
1024c2590:     	fadd	d4, d3, d0
1024c2594:     	adrp	x12, 0x1042e3000
1024c2598:     	ldr	d1, [x12, #0x690]
1024c259c:     	fadd	d3, d3, d1
1024c25a0:     	fcmp	d4, d2
1024c25a4:     	fccmp	d3, d2, #0x8, ls
1024c25a8:     	b.ge	0x1024c25c8
1024c25ac:     	mov	w24, #0x1               ; =1
1024c25b0:     	cmp	x10, #0x0
1024c25b4:     	ccmp	x11, #0x0, #0x4, ne
1024c25b8:     	b.ne	0x1024c25fc
1024c25bc:     	mov	w26, #0x0               ; =0
1024c25c0:     	mov	w27, #0x0               ; =0
1024c25c4:     	b	0x1024c25f4
1024c25c8:     	ldr	w12, [x8, #0x278]
1024c25cc:     	ldr	w13, [x9, #0x278]
1024c25d0:     	cmp	w12, w13
1024c25d4:     	cset	w25, ne
1024c25d8:     	cbz	x10, 0x1024c25e0
1024c25dc:     	cbnz	x11, 0x1024c2600
1024c25e0:     	cmp	w12, w13
1024c25e4:     	b.eq	0x1024c2664
1024c25e8:     	mov	w26, #0x0               ; =0
1024c25ec:     	mov	w27, #0x0               ; =0
1024c25f0:     	mov	w24, #0x1               ; =1
1024c25f4:     	mov	w25, #0x1               ; =1
1024c25f8:     	b	0x1024c2698
1024c25fc:     	mov	w25, #0x1               ; =1
1024c2600:     	ldr	d2, [x10, #0x270]
1024c2604:     	ldr	d3, [x11, #0x270]
1024c2608:     	fadd	d4, d3, d0
1024c260c:     	fadd	d3, d3, d1
1024c2610:     	fcmp	d4, d2
1024c2614:     	fccmp	d3, d2, #0x8, ls
1024c2618:     	b.ge	0x1024c2624
1024c261c:     	mov	w27, #0x0               ; =0
1024c2620:     	b	0x1024c2634
1024c2624:     	ldr	w12, [x10, #0x278]
1024c2628:     	ldr	w13, [x11, #0x278]
1024c262c:     	cmp	w12, w13
1024c2630:     	cset	w27, eq
1024c2634:     	mov	w24, #0x0               ; =0
1024c2638:     	ldr	d2, [x10, #0x78]
1024c263c:     	ldr	d3, [x11, #0x78]
1024c2640:     	fadd	d0, d3, d0
1024c2644:     	fcmp	d0, d2
1024c2648:     	cset	w10, ls
1024c264c:     	fadd	d0, d3, d1
1024c2650:     	fcmp	d0, d2
1024c2654:     	csel	w26, wzr, w10, lt
1024c2658:     	tbnz	w25, #0x0, 0x1024c2698
1024c265c:     	cbz	w27, 0x1024c2698
1024c2660:     	cbz	w26, 0x1024c2698
1024c2664:     	ldr	d0, [x8, #0x138]
1024c2668:     	ldr	d1, [x9, #0x138]
1024c266c:     	fcmp	d0, d1
1024c2670:     	csel	x8, x20, x21, mi
1024c2674:     	ldp	x9, x8, [x8]
1024c2678:     	stp	x9, x8, [x19]
1024c267c:     	add	x19, sp, #0x50
1024c2680:     	add	x20, sp, #0x40
1024c2684:     	cbz	x8, 0x1024c27d8
1024c2688:     	add	x8, x8, #0x8
1024c268c:     	mov	w9, #0x1                ; =1
1024c2690:     	ldadd	w9, w8, [x8]
1024c2694:     	b	0x1024c27d8
1024c2698:     	ldp	x10, x9, [x0]
1024c269c:     	stp	x10, x9, [sp, #0x30]
1024c26a0:     	cbz	x9, 0x1024c26b4
1024c26a4:     	add	x8, x9, #0x8 STRING 'S0_4listIJNS0_5valueIPS7_EENS_3argILi1EEEEEEEE'
1024c26a8:     	mov	w9, #0x1                ; =1
1024c26ac:     	ldadd	w9, w8, [x8]
1024c26b0:     	ldr	x8, [x21]
1024c26b4:     	ldr	x9, [x21, #0x8]
1024c26b8:     	stp	x8, x9, [sp, #0x20]
1024c26bc:     	cbz	x9, 0x1024c26cc
1024c26c0:     	add	x8, x9, #0x8 STRING 'S0_4listIJNS0_5valueIPS7_EENS_3argILi1EEEEEEEE'
1024c26c4:     	mov	w9, #0x1                ; =1
1024c26c8:     	ldadd	w9, w8, [x8]
1024c26cc:     	ldp	x9, x8, [x3]
1024c26d0:     	stp	x9, x8, [sp, #0x10]
1024c26d4:     	cbz	x8, 0x1024c26e4
1024c26d8:     	add	x8, x8, #0x8
1024c26dc:     	mov	w9, #0x1                ; =1
1024c26e0:     	ldadd	w9, w8, [x8]
1024c26e4:     	add	x28, sp, #0x30
1024c26e8:     	add	x22, sp, #0x20
1024c26ec:     	add	x23, sp, #0x10
1024c26f0:     	add	x0, sp, #0x30
1024c26f4:     	add	x1, sp, #0x20
1024c26f8:     	add	x2, sp, #0x10
1024c26fc:     	mov	x8, x19
1024c2700:     	mov	w3, #0x0                ; =0
1024c2704:     	mov	w4, #0x1                ; =1
1024c2708:     	bl	0x1024c1398
1024c270c:     	add	x0, x23, #0x8
1024c2710:     	bl	0x10001022c
1024c2714:     	add	x0, x22, #0x8
1024c2718:     	bl	0x10001022c
1024c271c:     	add	x0, x28, #0x8
1024c2720:     	bl	0x10001022c
1024c2724:     	ldr	x9, [x19]
1024c2728:     	ldp	x8, x9, [x9, #0x68]
1024c272c:     	stp	x8, x9, [sp]
1024c2730:     	cbz	x9, 0x1024c2740
1024c2734:     	add	x9, x9, #0x8 STRING 'S0_4listIJNS0_5valueIPS7_EENS_3argILi1EEEEEEEE'
1024c2738:     	mov	w10, #0x1               ; =1
1024c273c:     	ldadd	w10, w9, [x9]
1024c2740:     	ldr	x9, [x21]
1024c2744:     	ldr	d1, [x9, #0x138]
1024c2748:     	ldr	x9, [x20]
1024c274c:     	ldr	d0, [x9, #0x138]
1024c2750:     	fcmp	d1, d0
1024c2754:     	b.pl	0x1024c2760
1024c2758:     	ldr	x9, [x19]
1024c275c:     	str	d0, [x9, #0x138]
1024c2760:     	add	x20, sp, #0x40
1024c2764:     	cbz	w25, 0x1024c2784
1024c2768:     	ldr	x9, [x19]
1024c276c:     	ldr	w10, [x9, #0x278]
1024c2770:     	tst	w10, #0x70
1024c2774:     	b.ne	0x1024c2784
1024c2778:     	mov	w11, #0x12              ; =18
1024c277c:     	orr	w10, w10, w11
1024c2780:     	str	w10, [x9, #0x278]
1024c2784:     	orr	w9, w24, w27
1024c2788:     	tbnz	w9, #0x0, 0x1024c27a4
1024c278c:     	ldr	w9, [x8, #0x278]
1024c2790:     	tst	w9, #0x70
1024c2794:     	b.ne	0x1024c27a4
1024c2798:     	mov	w10, #0x12              ; =18
1024c279c:     	orr	w9, w9, w10
1024c27a0:     	str	w9, [x8, #0x278]
1024c27a4:     	mov	x9, sp
1024c27a8:     	orr	w10, w24, w26
1024c27ac:     	add	x19, sp, #0x50
1024c27b0:     	tbnz	w10, #0x0, 0x1024c27d0
1024c27b4:     	ldr	x10, [sp, #0x50]
1024c27b8:     	ldr	d1, [x10, #0x78]
1024c27bc:     	ldr	x10, [sp, #0x40]
1024c27c0:     	ldr	d0, [x10, #0x78]
1024c27c4:     	fcmp	d1, d0
1024c27c8:     	b.pl	0x1024c27d0
1024c27cc:     	str	d0, [x8, #0x78]
1024c27d0:     	add	x0, x9, #0x8 STRING 'S0_4listIJNS0_5valueIPS7_EENS_3argILi1EEEEEEEE'
1024c27d4:     	bl	0x10001022c
1024c27d8:     	add	x0, x20, #0x8
1024c27dc:     	bl	0x10001022c
1024c27e0:     	add	x0, x19, #0x8
1024c27e4:     	bl	0x10001022c
1024c27e8:     	ldp	x29, x30, [sp, #0xb0]
1024c27ec:     	ldp	x20, x19, [sp, #0xa0]
1024c27f0:     	ldp	x22, x21, [sp, #0x90]
1024c27f4:     	ldp	x24, x23, [sp, #0x80]
1024c27f8:     	ldp	x26, x25, [sp, #0x70]
1024c27fc:     	ldp	x28, x27, [sp, #0x60]
1024c2800:     	add	sp, sp, #0xc0
1024c2804:     	ret
1024c2808:     	mov	x19, x0
1024c280c:     	add	x0, x23, #0x8
1024c2810:     	bl	0x10001022c
1024c2814:     	add	x0, x22, #0x8
1024c2818:     	bl	0x10001022c
1024c281c:     	add	x0, x28, #0x8
1024c2820:     	bl	0x10001022c
1024c2824:     	add	x8, sp, #0x40
1024c2828:     	add	x0, x8, #0x8
1024c282c:     	bl	0x10001022c
1024c2830:     	add	x8, sp, #0x50
1024c2834:     	add	x0, x8, #0x8
1024c2838:     	bl	0x10001022c
1024c283c:     	mov	x0, x19
1024c2840:     	bl	0x103bda970

FUNCTION 0x1024c2844 size 108
1024c2844:     	sub	sp, sp, #0x20
1024c2848:     	stp	x29, x30, [sp, #0x10]
1024c284c:     	add	x29, sp, #0x10
1024c2850:     	ldr	x10, [x0, #0x60]
1024c2854:     	mov	x9, sp
1024c2858:     	stp	xzr, x10, [sp]
1024c285c:     	cbz	x10, 0x1024c2890
1024c2860:     	ldr	w11, [x10, #0x8]
1024c2864:     	cbz	w11, 0x1024c288c
1024c2868:     	add	w12, w11, #0x1
1024c286c:     	add	x13, x10, #0x8 STRING 'counted_impl_pIN12Planeswalker4Urza30UR3DOdObjectSelectionPopupViewEEE'
1024c2870:     	mov	x14, x11
1024c2874:     	cas	w14, w12, [x13]
1024c2878:     	cmp	w14, w11
1024c287c:     	mov	x11, x14
1024c2880:     	b.ne	0x1024c2864
1024c2884:     	ldr	x11, [x0, #0x58]
1024c2888:     	b	0x1024c2894
1024c288c:     	mov	x10, #0x0               ; =0
1024c2890:     	mov	x11, #0x0               ; =0
1024c2894:     	stp	x11, x10, [x8]
1024c2898:     	stp	xzr, xzr, [sp]
1024c289c:     	add	x0, x9, #0x8 STRING 'S0_4listIJNS0_5valueIPS7_EENS_3argILi1EEEEEEEE'
1024c28a0:     	bl	0x10001022c
1024c28a4:     	ldp	x29, x30, [sp, #0x10]
1024c28a8:     	add	sp, sp, #0x20
1024c28ac:     	ret

FUNCTION 0x1024c28b0 size 8
1024c28b0:     	ldr	d0, [x0, #0x78]
1024c28b4:     	ret

FUNCTION 0x1024c28b8 size 8
1024c28b8:     	str	d0, [x0, #0x78]
1024c28bc:     	ret

FUNCTION 0x1024c28c0 size 44
1024c28c0:     	ldrb	w8, [x0, #0x278]
1024c28c4:     	tbnz	w8, #0x6, 0x1024c28e4
1024c28c8:     	ldrb	w8, [x0, #0x290]
1024c28cc:     	tbnz	w8, #0x6, 0x1024c28e4
1024c28d0:     	ldr	w8, [x0, #0x80]
1024c28d4:     	mov	w9, #0x30               ; =48
1024c28d8:     	bics	wzr, w9, w8
1024c28dc:     	cset	w0, eq
1024c28e0:     	ret
1024c28e4:     	mov	w0, #0x1                ; =1
1024c28e8:     	ret

FUNCTION 0x1024c28ec size 252
1024c28ec:     	ldr	w8, [x0, #0x90]
1024c28f0:     	tbz	w8, #0x0, 0x1024c28fc
1024c28f4:     	and	w8, w8, w1
1024c28f8:     	cbnz	w8, 0x1024c29cc
1024c28fc:     	ldr	w8, [x0, #0xe8]
1024c2900:     	tbz	w8, #0x0, 0x1024c290c
1024c2904:     	and	w8, w8, w1
1024c2908:     	cbnz	w8, 0x1024c29cc
1024c290c:     	ldr	w8, [x0, #0x148]
1024c2910:     	tbz	w8, #0x0, 0x1024c291c
1024c2914:     	and	w8, w8, w1
1024c2918:     	cbnz	w8, 0x1024c29cc
1024c291c:     	ldr	w8, [x0, #0x1b8]
1024c2920:     	tbz	w8, #0x0, 0x1024c292c
1024c2924:     	and	w8, w8, w1
1024c2928:     	cbnz	w8, 0x1024c29cc
1024c292c:     	ldr	w8, [x0, #0x220]
1024c2930:     	tbz	w8, #0x0, 0x1024c293c
1024c2934:     	and	w8, w8, w1
1024c2938:     	cbnz	w8, 0x1024c29cc
1024c293c:     	ldr	w8, [x0, #0x310]
1024c2940:     	tbz	w8, #0x0, 0x1024c294c
1024c2944:     	and	w8, w8, w1
1024c2948:     	cbnz	w8, 0x1024c29cc
1024c294c:     	ldr	w8, [x0, #0x380]
1024c2950:     	tbz	w8, #0x0, 0x1024c295c
1024c2954:     	and	w8, w8, w1
1024c2958:     	cbnz	w8, 0x1024c29cc
1024c295c:     	ldr	w8, [x0, #0x3e0]
1024c2960:     	tbz	w8, #0x0, 0x1024c296c
1024c2964:     	and	w8, w8, w1
1024c2968:     	cbnz	w8, 0x1024c29cc
1024c296c:     	ldr	w8, [x0, #0x450]
1024c2970:     	tbz	w8, #0x0, 0x1024c297c
1024c2974:     	and	w8, w8, w1
1024c2978:     	cbnz	w8, 0x1024c29cc
1024c297c:     	ldr	w8, [x0, #0x4b0]
1024c2980:     	tbz	w8, #0x0, 0x1024c298c
1024c2984:     	and	w8, w8, w1
1024c2988:     	cbnz	w8, 0x1024c29cc
1024c298c:     	ldr	w8, [x0, #0x510]
1024c2990:     	tbz	w8, #0x0, 0x1024c299c
1024c2994:     	and	w8, w8, w1
1024c2998:     	cbnz	w8, 0x1024c29cc
1024c299c:     	ldr	w8, [x0, #0x570]
1024c29a0:     	tbz	w8, #0x0, 0x1024c29ac
1024c29a4:     	and	w8, w8, w1
1024c29a8:     	cbnz	w8, 0x1024c29cc
1024c29ac:     	ldr	w8, [x0, #0x5d0]
1024c29b0:     	tbz	w8, #0x0, 0x1024c29bc
1024c29b4:     	and	w8, w8, w1
1024c29b8:     	cbnz	w8, 0x1024c29cc
1024c29bc:     	ldr	w8, [x0, #0x638]
1024c29c0:     	tbz	w8, #0x0, 0x1024c29d4
1024c29c4:     	and	w8, w8, w1
1024c29c8:     	cbz	w8, 0x1024c29d4
1024c29cc:     	mov	w0, #0x1                ; =1
1024c29d0:     	ret
1024c29d4:     	ldr	w8, [x0, #0x698]
1024c29d8:     	tst	w8, w1
1024c29dc:     	cset	w9, ne
1024c29e0:     	and	w0, w8, w9
1024c29e4:     	ret

FUNCTION 0x1024c29e8 size 52
1024c29e8:     	ldrb	w8, [x0, #0x80]
1024c29ec:     	tbnz	w8, #0x4, 0x1024c29f8
1024c29f0:     	mov	w0, #0x0                ; =0
1024c29f4:     	ret
1024c29f8:     	ldr	x0, [x0, #0x2a0]
1024c29fc:     	cbz	x0, 0x1024c2a18
1024c2a00:     	stp	x29, x30, [sp, #-0x10]!
1024c2a04:     	mov	x29, sp
1024c2a08:     	bl	0x1024b2f74
1024c2a0c:     	cmp	w0, #0x1
1024c2a10:     	cset	w0, gt
1024c2a14:     	ldp	x29, x30, [sp], #0x10
1024c2a18:     	ret

FUNCTION 0x1024c2a1c size 48
1024c2a1c:     	ldr	w8, [x0, #0x624]
1024c2a20:     	mov	w9, #0x11               ; =17
1024c2a24:     	bics	wzr, w9, w8
1024c2a28:     	b.eq	0x1024c2a44
1024c2a2c:     	ldr	x8, [x0, #0x68]
1024c2a30:     	cbz	x8, 0x1024c2a3c
1024c2a34:     	ldrb	w8, [x8, #0x82]
1024c2a38:     	tbnz	w8, #0x3, 0x1024c2a44
1024c2a3c:     	mov	w0, #0x0                ; =0
1024c2a40:     	ret
1024c2a44:     	mov	w0, #0x1                ; =1
1024c2a48:     	ret

FUNCTION 0x1024c2a4c size 32
1024c2a4c:     	cbz	w2, 0x1024c2a5c
1024c2a50:     	ldr	w8, [x0, #0x80]
1024c2a54:     	orr	w8, w8, w1
1024c2a58:     	b	0x1024c2a64
1024c2a5c:     	ldr	w8, [x0, #0x80]
1024c2a60:     	bic	w8, w8, w1
1024c2a64:     	str	w8, [x0, #0x80]
1024c2a68:     	ret

FUNCTION 0x1024c2a6c size 8
1024c2a6c:     	str	w1, [x0, #0x2b0]
1024c2a70:     	ret

FUNCTION 0x1024c2a74 size 8
1024c2a74:     	ldr	w0, [x0, #0x2b4]
1024c2a78:     	ret

FUNCTION 0x1024c2a7c size 8
1024c2a7c:     	str	w1, [x0, #0x198]
1024c2a80:     	ret

FUNCTION 0x1024c2a84 size 8
1024c2a84:     	ldr	w0, [x0, #0x19c]
1024c2a88:     	ret

FUNCTION 0x1024c2a8c size 8
1024c2a8c:     	str	w1, [x0, #0x19c]
1024c2a90:     	ret

FUNCTION 0x1024c2a94 size 8
1024c2a94:     	str	d0, [x0, #0x1a0]
1024c2a98:     	ret

FUNCTION 0x1024c2a9c size 332
1024c2a9c:     	sub	sp, sp, #0x70
1024c2aa0:     	stp	x22, x21, [sp, #0x40]
1024c2aa4:     	stp	x20, x19, [sp, #0x50]
1024c2aa8:     	stp	x29, x30, [sp, #0x60]
1024c2aac:     	add	x29, sp, #0x60
1024c2ab0:     	mov	x21, x1
1024c2ab4:     	mov	x19, x0
1024c2ab8:     	str	w2, [x0, #0x198]
1024c2abc:     	cbz	w4, 0x1024c2acc
1024c2ac0:     	ldr	w8, [x19, #0x80]
1024c2ac4:     	orr	w8, w8, #0x8
1024c2ac8:     	str	w8, [x19, #0x80]
1024c2acc:     	ldr	w8, [x19, #0x90]
1024c2ad0:     	orr	w8, w8, #0x1
1024c2ad4:     	str	w8, [x19, #0x90]
1024c2ad8:     	cbz	w3, 0x1024c2b78
1024c2adc:     	add	x8, sp, #0x20
1024c2ae0:     	add	x20, x8, #0x8
1024c2ae4:     	stp	xzr, xzr, [sp, #0x20]
1024c2ae8:     	add	x22, sp, #0x20
1024c2aec:     	add	x8, sp, #0x30
1024c2af0:     	add	x0, sp, #0x20
1024c2af4:     	bl	0x1024a937c
1024c2af8:     	add	x8, sp, #0x30
1024c2afc:     	add	x20, x8, #0x8
1024c2b00:     	add	x0, x22, #0x8
1024c2b04:     	bl	0x10001022c
1024c2b08:     	ldr	x0, [sp, #0x30]
1024c2b0c:     	bl	0x1024a97ac
1024c2b10:     	ldp	x9, x8, [sp, #0x30]
1024c2b14:     	stp	x9, x8, [sp, #0x10]
1024c2b18:     	cbz	x8, 0x1024c2b28
1024c2b1c:     	add	x8, x8, #0x8
1024c2b20:     	mov	w9, #0x1                ; =1
1024c2b24:     	ldadd	w9, w8, [x8]
1024c2b28:     	ldp	x9, x8, [x21]
1024c2b2c:     	stp	x9, x8, [sp]
1024c2b30:     	cbz	x8, 0x1024c2b40
1024c2b34:     	add	x8, x8, #0x8
1024c2b38:     	mov	w9, #0x1                ; =1
1024c2b3c:     	ldadd	w9, w8, [x8]
1024c2b40:     	add	x21, sp, #0x10
1024c2b44:     	mov	x22, sp
1024c2b48:     	add	x0, x19, #0x88
1024c2b4c:     	movi	d0, #0000000000000000
1024c2b50:     	add	x1, sp, #0x10
1024c2b54:     	mov	x2, sp
1024c2b58:     	bl	0x1024af7f0
1024c2b5c:     	add	x20, sp, #0x30
1024c2b60:     	add	x0, x22, #0x8
1024c2b64:     	bl	0x10001022c
1024c2b68:     	add	x0, x21, #0x8
1024c2b6c:     	bl	0x10001022c
1024c2b70:     	add	x0, x20, #0x8
1024c2b74:     	bl	0x10001022c
1024c2b78:     	ldr	w8, [x19, #0xe8]
1024c2b7c:     	orr	w8, w8, #0x1
1024c2b80:     	str	w8, [x19, #0xe8]
1024c2b84:     	ldr	w8, [x19, #0x148]
1024c2b88:     	orr	w8, w8, #0x1
1024c2b8c:     	str	w8, [x19, #0x148]
1024c2b90:     	ldr	w8, [x19, #0x220]
1024c2b94:     	orr	w8, w8, #0x1
1024c2b98:     	str	w8, [x19, #0x220]
1024c2b9c:     	mov	w8, #0x1                ; =1
1024c2ba0:     	str	w8, [x19, #0x278]
1024c2ba4:     	ldp	x29, x30, [sp, #0x60]
1024c2ba8:     	ldp	x20, x19, [sp, #0x50]
1024c2bac:     	ldp	x22, x21, [sp, #0x40]
1024c2bb0:     	add	sp, sp, #0x70
1024c2bb4:     	ret
1024c2bb8:     	mov	x19, x0
1024c2bbc:     	add	x0, x22, #0x8
1024c2bc0:     	bl	0x10001022c
1024c2bc4:     	add	x0, x21, #0x8
1024c2bc8:     	bl	0x10001022c
1024c2bcc:     	b	0x1024c2bd8
1024c2bd0:     	b	0x1024c2bd4
1024c2bd4:     	mov	x19, x0
1024c2bd8:     	mov	x0, x20
1024c2bdc:     	bl	0x10001022c
1024c2be0:     	mov	x0, x19
1024c2be4:     	bl	0x103bda970

FUNCTION 0x1024c2be8 size 584
1024c2be8:     	sub	sp, sp, #0xd0
1024c2bec:     	stp	d9, d8, [sp, #0x70]
1024c2bf0:     	stp	x26, x25, [sp, #0x80]
1024c2bf4:     	stp	x24, x23, [sp, #0x90]
1024c2bf8:     	stp	x22, x21, [sp, #0xa0]
1024c2bfc:     	stp	x20, x19, [sp, #0xb0]
1024c2c00:     	stp	x29, x30, [sp, #0xc0]
1024c2c04:     	add	x29, sp, #0xc0
1024c2c08:     	mov	x19, x5
1024c2c0c:     	mov	x22, x4
1024c2c10:     	fmov	d9, d1
1024c2c14:     	fmov	d8, d0
1024c2c18:     	mov	x21, x1
1024c2c1c:     	mov	x20, x0
1024c2c20:     	str	w2, [x0, #0x198]
1024c2c24:     	ldr	w8, [x0, #0x90]
1024c2c28:     	orr	w8, w8, #0x1
1024c2c2c:     	str	w8, [x0, #0x90]
1024c2c30:     	add	x8, sp, #0x60
1024c2c34:     	add	x24, x8, #0x8
1024c2c38:     	cbz	w3, 0x1024c2cd0
1024c2c3c:     	add	x8, sp, #0x50
1024c2c40:     	add	x23, x8, #0x8
1024c2c44:     	stp	xzr, xzr, [sp, #0x50]
1024c2c48:     	add	x25, sp, #0x50
1024c2c4c:     	add	x8, sp, #0x60
1024c2c50:     	add	x0, sp, #0x50
1024c2c54:     	bl	0x1024a937c
1024c2c58:     	add	x0, x25, #0x8
1024c2c5c:     	bl	0x10001022c
1024c2c60:     	ldr	x0, [sp, #0x60]
1024c2c64:     	bl	0x1024a97ac
1024c2c68:     	ldp	x9, x8, [sp, #0x60]
1024c2c6c:     	stp	x9, x8, [sp, #0x40]
1024c2c70:     	cbz	x8, 0x1024c2c80
1024c2c74:     	add	x8, x8, #0x8
1024c2c78:     	mov	w9, #0x1                ; =1
1024c2c7c:     	ldadd	w9, w8, [x8]
1024c2c80:     	ldp	x9, x8, [x21]
1024c2c84:     	stp	x9, x8, [sp, #0x30]
1024c2c88:     	cbz	x8, 0x1024c2c98
1024c2c8c:     	add	x8, x8, #0x8
1024c2c90:     	mov	w9, #0x1                ; =1
1024c2c94:     	ldadd	w9, w8, [x8]
1024c2c98:     	add	x23, sp, #0x40
1024c2c9c:     	add	x25, sp, #0x30
1024c2ca0:     	add	x0, x20, #0x88
1024c2ca4:     	movi	d0, #0000000000000000
1024c2ca8:     	add	x1, sp, #0x40
1024c2cac:     	add	x2, sp, #0x30
1024c2cb0:     	bl	0x1024af7f0
1024c2cb4:     	add	x26, sp, #0x60
1024c2cb8:     	add	x0, x25, #0x8
1024c2cbc:     	bl	0x10001022c
1024c2cc0:     	add	x0, x23, #0x8
1024c2cc4:     	bl	0x10001022c
1024c2cc8:     	add	x0, x26, #0x8
1024c2ccc:     	bl	0x10001022c
1024c2cd0:     	ldr	w8, [x20, #0xe8]
1024c2cd4:     	orr	w8, w8, #0x1
1024c2cd8:     	str	w8, [x20, #0xe8]
1024c2cdc:     	ldr	w8, [x20, #0x148]
1024c2ce0:     	orr	w8, w8, #0x1
1024c2ce4:     	str	w8, [x20, #0x148]
1024c2ce8:     	str	d9, [x20, #0x210]
1024c2cec:     	ldr	w8, [x20, #0x220]
1024c2cf0:     	orr	w8, w8, #0x1
1024c2cf4:     	str	w8, [x20, #0x220]
1024c2cf8:     	cbz	w22, 0x1024c2d94
1024c2cfc:     	add	x8, sp, #0x20
1024c2d00:     	add	x22, x8, #0x8
1024c2d04:     	stp	xzr, xzr, [sp, #0x20]
1024c2d08:     	add	x23, sp, #0x20
1024c2d0c:     	add	x8, sp, #0x60
1024c2d10:     	add	x0, sp, #0x20
1024c2d14:     	bl	0x1024a937c
1024c2d18:     	add	x0, x23, #0x8
1024c2d1c:     	bl	0x10001022c
1024c2d20:     	ldr	x0, [sp, #0x60]
1024c2d24:     	bl	0x1024a9a24
1024c2d28:     	ldp	x9, x8, [sp, #0x60]
1024c2d2c:     	stp	x9, x8, [sp, #0x10]
1024c2d30:     	cbz	x8, 0x1024c2d40
1024c2d34:     	add	x8, x8, #0x8
1024c2d38:     	mov	w9, #0x1                ; =1
1024c2d3c:     	ldadd	w9, w8, [x8]
1024c2d40:     	ldp	x9, x8, [x21]
1024c2d44:     	stp	x9, x8, [sp]
1024c2d48:     	cbz	x8, 0x1024c2d58
1024c2d4c:     	add	x8, x8, #0x8
1024c2d50:     	mov	w9, #0x1                ; =1
1024c2d54:     	ldadd	w9, w8, [x8]
1024c2d58:     	add	x21, sp, #0x10
1024c2d5c:     	mov	x22, sp
1024c2d60:     	add	x0, x20, #0x218
1024c2d64:     	movi	d0, #0000000000000000
1024c2d68:     	fmov	s1, #1.00000000
1024c2d6c:     	add	x1, sp, #0x10
1024c2d70:     	mov	x2, sp
1024c2d74:     	bl	0x1024af8b8
1024c2d78:     	add	x23, sp, #0x60
1024c2d7c:     	add	x0, x22, #0x8
1024c2d80:     	bl	0x10001022c
1024c2d84:     	add	x0, x21, #0x8
1024c2d88:     	bl	0x10001022c
1024c2d8c:     	add	x0, x23, #0x8
1024c2d90:     	bl	0x10001022c
1024c2d94:     	str	d8, [x20, #0x270]
1024c2d98:     	cmp	w19, #0x0
1024c2d9c:     	mov	w8, #0x21               ; =33
1024c2da0:     	csinc	w8, w8, wzr, ne
1024c2da4:     	str	w8, [x20, #0x278]
1024c2da8:     	ldp	x29, x30, [sp, #0xc0]
1024c2dac:     	ldp	x20, x19, [sp, #0xb0]
1024c2db0:     	ldp	x22, x21, [sp, #0xa0]
1024c2db4:     	ldp	x24, x23, [sp, #0x90]
1024c2db8:     	ldp	x26, x25, [sp, #0x80]
1024c2dbc:     	ldp	d9, d8, [sp, #0x70]
1024c2dc0:     	add	sp, sp, #0xd0
1024c2dc4:     	ret
1024c2dc8:     	mov	x19, x0
1024c2dcc:     	add	x0, x22, #0x8
1024c2dd0:     	bl	0x10001022c
1024c2dd4:     	add	x0, x21, #0x8
1024c2dd8:     	bl	0x10001022c
1024c2ddc:     	b	0x1024c2de4
1024c2de0:     	mov	x19, x0
1024c2de4:     	mov	x22, x24
1024c2de8:     	b	0x1024c2e08
1024c2dec:     	mov	x19, x0
1024c2df0:     	add	x0, x25, #0x8
1024c2df4:     	bl	0x10001022c
1024c2df8:     	add	x0, x23, #0x8
1024c2dfc:     	bl	0x10001022c
1024c2e00:     	b	0x1024c2e14
1024c2e04:     	mov	x19, x0
1024c2e08:     	mov	x0, x22
1024c2e0c:     	b	0x1024c2e24
1024c2e10:     	mov	x19, x0
1024c2e14:     	mov	x23, x24
1024c2e18:     	b	0x1024c2e20
1024c2e1c:     	mov	x19, x0
1024c2e20:     	mov	x0, x23
1024c2e24:     	bl	0x10001022c
1024c2e28:     	mov	x0, x19
1024c2e2c:     	bl	0x103bda970

FUNCTION 0x1024c2e30 size 64
1024c2e30:     	ldr	d0, [x0, #0x270]
1024c2e34:     	str	d0, [x1]
1024c2e38:     	ldr	d0, [x0, #0x210]
1024c2e3c:     	str	d0, [x2]
1024c2e40:     	ldr	w8, [x0, #0x198]
1024c2e44:     	str	w8, [x3]
1024c2e48:     	ldr	w8, [x0, #0x90]
1024c2e4c:     	and	w8, w8, #0x1
1024c2e50:     	str	w8, [x4]
1024c2e54:     	ldr	w8, [x0, #0x220]
1024c2e58:     	and	w8, w8, #0x20
1024c2e5c:     	str	w8, [x5]
1024c2e60:     	ldr	w8, [x0, #0x278]
1024c2e64:     	and	w8, w8, #0x30
1024c2e68:     	str	w8, [x6]
1024c2e6c:     	ret

FUNCTION 0x1024c2e70 size 248
1024c2e70:     	sub	sp, sp, #0x80
1024c2e74:     	stp	d11, d10, [sp, #0x20]
1024c2e78:     	stp	d9, d8, [sp, #0x30]
1024c2e7c:     	stp	x24, x23, [sp, #0x40]
1024c2e80:     	stp	x22, x21, [sp, #0x50]
1024c2e84:     	stp	x20, x19, [sp, #0x60]
1024c2e88:     	stp	x29, x30, [sp, #0x70]
1024c2e8c:     	add	x29, sp, #0x70
1024c2e90:     	fmov	d8, d2
1024c2e94:     	mov	x21, x4
1024c2e98:     	mov	x20, x3
1024c2e9c:     	fmov	d9, d1
1024c2ea0:     	mov	x23, x2
1024c2ea4:     	fmov	d10, d0
1024c2ea8:     	mov	x19, x0
1024c2eac:     	stp	xzr, xzr, [sp, #0x10]
1024c2eb0:     	add	x24, sp, #0x10
1024c2eb4:     	add	x0, x0, #0x88
1024c2eb8:     	add	x2, sp, #0x10
1024c2ebc:     	mov	w3, #0x1                ; =1
1024c2ec0:     	bl	0x1024afc3c
1024c2ec4:     	mov	x8, sp
1024c2ec8:     	add	x22, x8, #0x8
1024c2ecc:     	add	x0, x24, #0x8
1024c2ed0:     	bl	0x10001022c
1024c2ed4:     	str	d10, [x19, #0x138]
1024c2ed8:     	stp	xzr, xzr, [sp]
1024c2edc:     	mov	x24, sp
1024c2ee0:     	add	x0, x19, #0x140
1024c2ee4:     	mov	x2, sp
1024c2ee8:     	mov	x1, x23
1024c2eec:     	mov	w3, #0x1                ; =1
1024c2ef0:     	bl	0x1024afc3c
1024c2ef4:     	add	x0, x24, #0x8
1024c2ef8:     	bl	0x10001022c
1024c2efc:     	str	d9, [x19, #0x1a0]
1024c2f00:     	cbz	w21, 0x1024c2f10
1024c2f04:     	str	d8, [x19, #0x1a8]
1024c2f08:     	mov	w8, #0x5                ; =5
1024c2f0c:     	b	0x1024c2f14
1024c2f10:     	mov	w8, #0x4                ; =4
1024c2f14:     	str	w8, [x19, #0x208]
1024c2f18:     	cbz	w20, 0x1024c2f28
1024c2f1c:     	ldr	w8, [x19, #0x80]
1024c2f20:     	orr	w8, w8, #0x2
1024c2f24:     	str	w8, [x19, #0x80]
1024c2f28:     	ldp	x29, x30, [sp, #0x70]
1024c2f2c:     	ldp	x20, x19, [sp, #0x60]
1024c2f30:     	ldp	x22, x21, [sp, #0x50]
1024c2f34:     	ldp	x24, x23, [sp, #0x40]
1024c2f38:     	ldp	d9, d8, [sp, #0x30]
1024c2f3c:     	ldp	d11, d10, [sp, #0x20]
1024c2f40:     	add	sp, sp, #0x80
1024c2f44:     	ret
1024c2f48:     	mov	x19, x0
1024c2f4c:     	b	0x1024c2f58
1024c2f50:     	mov	x19, x0
1024c2f54:     	add	x22, x24, #0x8
1024c2f58:     	mov	x0, x22
1024c2f5c:     	bl	0x10001022c
1024c2f60:     	mov	x0, x19
1024c2f64:     	bl	0x103bda970

FUNCTION 0x1024c2f68 size 108
1024c2f68:     	stp	x20, x19, [sp, #-0x20]!
1024c2f6c:     	stp	x29, x30, [sp, #0x10]
1024c2f70:     	add	x29, sp, #0x10
1024c2f74:     	mov	x19, x1
1024c2f78:     	mov	x20, x0
1024c2f7c:     	mov	w2, #0x0                ; =0
1024c2f80:     	mov	w3, #0x0                ; =0
1024c2f84:     	mov	w4, #0x0                ; =0
1024c2f88:     	bl	0x1024c2fd4
1024c2f8c:     	cbz	w0, 0x1024c2fc8
1024c2f90:     	ldr	x0, [x20, #0x68]
1024c2f94:     	ldr	x1, [x19, #0x68]
1024c2f98:     	cbz	x0, 0x1024c2fb8
1024c2f9c:     	cbz	x1, 0x1024c2fbc
1024c2fa0:     	mov	w2, #0x0                ; =0
1024c2fa4:     	mov	w3, #0x0                ; =0
1024c2fa8:     	mov	w4, #0x1                ; =1
1024c2fac:     	bl	0x1024c2fd4
1024c2fb0:     	cbnz	w0, 0x1024c2fc4
1024c2fb4:     	b	0x1024c2fc8
1024c2fb8:     	cbz	x1, 0x1024c2fc4
1024c2fbc:     	mov	w0, #0x0                ; =0
1024c2fc0:     	b	0x1024c2fc8
1024c2fc4:     	mov	w0, #0x1                ; =1
1024c2fc8:     	ldp	x29, x30, [sp, #0x10]
1024c2fcc:     	ldp	x20, x19, [sp], #0x20
1024c2fd0:     	ret

FUNCTION 0x1024c2fd4 size 2080
1024c2fd4:     	stp	d9, d8, [sp, #-0x40]!
1024c2fd8:     	stp	x22, x21, [sp, #0x10]
1024c2fdc:     	stp	x20, x19, [sp, #0x20]
1024c2fe0:     	stp	x29, x30, [sp, #0x30]
1024c2fe4:     	add	x29, sp, #0x30
1024c2fe8:     	mov	x21, x4
1024c2fec:     	mov	x22, x2
1024c2ff0:     	mov	x19, x1
1024c2ff4:     	mov	x20, x0
1024c2ff8:     	cbnz	w4, 0x1024c3004
1024c2ffc:     	ldr	x8, [x20, #0x68]
1024c3000:     	cbz	x8, 0x1024c3008
1024c3004:     	mov	w8, #0x1                ; =1
1024c3008:     	ldr	w10, [x20, #0x80]
1024c300c:     	ldr	w9, [x19, #0x80]
1024c3010:     	cmp	w10, w9
1024c3014:     	b.ne	0x1024c304c
1024c3018:     	cmp	w22, #0x0
1024c301c:     	csinc	w8, w8, wzr, ne
1024c3020:     	tbz	w8, #0x0, 0x1024c3090
1024c3024:     	add	x0, x20, #0x88
1024c3028:     	add	x1, x19, #0x88
1024c302c:     	bl	0x1024afb00
1024c3030:     	cbz	w0, 0x1024c37cc
1024c3034:     	cbz	w21, 0x1024c311c
1024c3038:     	ldrb	w8, [x20, #0x148]
1024c303c:     	tbnz	w8, #0x0, 0x1024c30e0
1024c3040:     	ldrb	w8, [x19, #0x148]
1024c3044:     	tbz	w8, #0x0, 0x1024c3100
1024c3048:     	b	0x1024c37c8
1024c304c:     	cbz	w3, 0x1024c37c8
1024c3050:     	eor	w11, w9, w10
1024c3054:     	mov	w12, #0x39ff            ; =14847
1024c3058:     	movk	w12, #0xfffe, lsl #16
1024c305c:     	tst	w11, w12
1024c3060:     	b.ne	0x1024c37c8
1024c3064:     	tbnz	w10, #0xe, 0x1024c306c
1024c3068:     	tbnz	w9, #0xe, 0x1024c37c8
1024c306c:     	tbnz	w10, #0xf, 0x1024c3074
1024c3070:     	tbnz	w9, #0xf, 0x1024c37c8
1024c3074:     	tbnz	w10, #0x10, 0x1024c307c
1024c3078:     	tbnz	w9, #0x10, 0x1024c37c8
1024c307c:     	tbnz	w10, #0x9, 0x1024c3084
1024c3080:     	tbnz	w9, #0x9, 0x1024c37c8
1024c3084:     	tbnz	w10, #0xa, 0x1024c3018
1024c3088:     	tbnz	w9, #0xa, 0x1024c37c8
1024c308c:     	b	0x1024c3018
1024c3090:     	ldr	w8, [x19, #0x90]
1024c3094:     	ldrb	w9, [x20, #0x90]
1024c3098:     	tbnz	w9, #0x7, 0x1024c30a4
1024c309c:     	tbz	w8, #0x7, 0x1024c30cc
1024c30a0:     	b	0x1024c37c8
1024c30a4:     	tbz	w8, #0x7, 0x1024c37c8
1024c30a8:     	add	x0, x20, #0x88
1024c30ac:     	mov	w1, #0x80               ; =128
1024c30b0:     	bl	0x1024af6f0
1024c30b4:     	fmov	s8, s0
1024c30b8:     	add	x0, x19, #0x88
1024c30bc:     	mov	w1, #0x80               ; =128
1024c30c0:     	bl	0x1024af6f0
1024c30c4:     	fcmp	s8, s0
1024c30c8:     	b.ne	0x1024c37c8
1024c30cc:     	ldr	w8, [x19, #0xe8]
1024c30d0:     	ldrb	w9, [x20, #0xe8]
1024c30d4:     	tbnz	w9, #0x7, 0x1024c3130
1024c30d8:     	tbz	w8, #0x7, 0x1024c3158
1024c30dc:     	b	0x1024c37c8
1024c30e0:     	ldr	d0, [x20, #0x138]
1024c30e4:     	ldr	d1, [x19, #0x138]
1024c30e8:     	fcmp	d0, d1
1024c30ec:     	b.ne	0x1024c37c8
1024c30f0:     	add	x0, x20, #0x140
1024c30f4:     	add	x1, x19, #0x140
1024c30f8:     	bl	0x1024afb00
1024c30fc:     	cbz	w0, 0x1024c37cc
1024c3100:     	cbnz	w22, 0x1024c31a8
1024c3104:     	cbz	w21, 0x1024c31a8
1024c3108:     	ldr	d0, [x20, #0x78]
1024c310c:     	ldr	d1, [x19, #0x78]
1024c3110:     	fcmp	d0, d1
1024c3114:     	b.ne	0x1024c37c8
1024c3118:     	b	0x1024c31a8
1024c311c:     	ldrb	w8, [x20, #0xe8]
1024c3120:     	tbnz	w8, #0x0, 0x1024c316c
1024c3124:     	ldrb	w8, [x19, #0xe8]
1024c3128:     	tbz	w8, #0x0, 0x1024c3038
1024c312c:     	b	0x1024c37c8
1024c3130:     	tbz	w8, #0x7, 0x1024c37c8
1024c3134:     	add	x0, x20, #0xe0
1024c3138:     	mov	w1, #0x80               ; =128
1024c313c:     	bl	0x1024af6f0
1024c3140:     	fmov	s8, s0
1024c3144:     	add	x0, x19, #0xe0
1024c3148:     	mov	w1, #0x80               ; =128
1024c314c:     	bl	0x1024af6f0
1024c3150:     	fcmp	s8, s0
1024c3154:     	b.ne	0x1024c37c8
1024c3158:     	ldr	w8, [x19, #0x148]
1024c315c:     	ldrb	w9, [x20, #0x148]
1024c3160:     	tbnz	w9, #0x7, 0x1024c3180
1024c3164:     	tbz	w8, #0x7, 0x1024c31a8
1024c3168:     	b	0x1024c37c8
1024c316c:     	add	x0, x20, #0xe0
1024c3170:     	add	x1, x19, #0xe0
1024c3174:     	bl	0x1024afb00
1024c3178:     	cbnz	w0, 0x1024c3038
1024c317c:     	b	0x1024c37cc
1024c3180:     	tbz	w8, #0x7, 0x1024c37c8
1024c3184:     	add	x0, x20, #0x140
1024c3188:     	mov	w1, #0x80               ; =128
1024c318c:     	bl	0x1024af6f0
1024c3190:     	fmov	s8, s0
1024c3194:     	add	x0, x19, #0x140
1024c3198:     	mov	w1, #0x80               ; =128
1024c319c:     	bl	0x1024af6f0
1024c31a0:     	fcmp	s8, s0
1024c31a4:     	b.ne	0x1024c37c8
1024c31a8:     	ldr	w8, [x20, #0x198]
1024c31ac:     	ldr	w9, [x19, #0x198]
1024c31b0:     	cmp	w8, w9
1024c31b4:     	b.ne	0x1024c37c8
1024c31b8:     	ldr	w8, [x20, #0x19c]
1024c31bc:     	ldr	w9, [x19, #0x19c]
1024c31c0:     	cmp	w8, w9
1024c31c4:     	b.ne	0x1024c37c8
1024c31c8:     	ldr	d0, [x20, #0x1a0]
1024c31cc:     	ldr	d1, [x19, #0x1a0]
1024c31d0:     	fcmp	d0, d1
1024c31d4:     	b.ne	0x1024c37c8
1024c31d8:     	ldr	w8, [x20, #0x208]
1024c31dc:     	ldr	w9, [x19, #0x208]
1024c31e0:     	cmp	w8, w9
1024c31e4:     	b.ne	0x1024c37c8
1024c31e8:     	cbz	w8, 0x1024c3234
1024c31ec:     	ldrb	w8, [x20, #0x220]
1024c31f0:     	tbnz	w8, #0x0, 0x1024c3200
1024c31f4:     	ldrb	w8, [x19, #0x220]
1024c31f8:     	tbz	w8, #0x0, 0x1024c3220
1024c31fc:     	b	0x1024c37c8
1024c3200:     	ldr	d0, [x20, #0x210]
1024c3204:     	ldr	d1, [x19, #0x210]
1024c3208:     	fcmp	d0, d1
1024c320c:     	b.ne	0x1024c37c8
1024c3210:     	add	x0, x20, #0x218
1024c3214:     	add	x1, x19, #0x218
1024c3218:     	bl	0x1024afb00
1024c321c:     	cbz	w0, 0x1024c37cc
1024c3220:     	ldr	w8, [x20, #0x278]
1024c3224:     	tbnz	w8, #0x0, 0x1024c326c
1024c3228:     	ldrb	w8, [x19, #0x278]
1024c322c:     	tbz	w8, #0x0, 0x1024c32c0
1024c3230:     	b	0x1024c37c8
1024c3234:     	ldrb	w8, [x20, #0x1b8]
1024c3238:     	tbnz	w8, #0x0, 0x1024c3248
1024c323c:     	ldrb	w8, [x19, #0x1b8]
1024c3240:     	tbz	w8, #0x0, 0x1024c31ec
1024c3244:     	b	0x1024c37c8
1024c3248:     	ldr	d0, [x20, #0x1a8]
1024c324c:     	ldr	d1, [x19, #0x1a8]
1024c3250:     	fcmp	d0, d1
1024c3254:     	b.ne	0x1024c37c8
1024c3258:     	add	x0, x20, #0x1b0
1024c325c:     	add	x1, x19, #0x1b0
1024c3260:     	bl	0x1024afb00
1024c3264:     	cbnz	w0, 0x1024c31ec
1024c3268:     	b	0x1024c37cc
1024c326c:     	cbz	w22, 0x1024c3284
1024c3270:     	ldr	w9, [x19, #0x278]
1024c3274:     	eor	w9, w9, w8
1024c3278:     	tst	w9, #0xc0
1024c327c:     	b.ne	0x1024c37c8
1024c3280:     	b	0x1024c32a4
1024c3284:     	mov	w0, #0x0                ; =0
1024c3288:     	ldr	d0, [x20, #0x270]
1024c328c:     	ldr	d1, [x19, #0x270]
1024c3290:     	fcmp	d0, d1
1024c3294:     	b.ne	0x1024c37cc
1024c3298:     	ldr	w9, [x19, #0x278]
1024c329c:     	cmp	w8, w9
1024c32a0:     	b.ne	0x1024c37cc
1024c32a4:     	tbz	w8, #0x7, 0x1024c32b8
1024c32a8:     	ldr	d0, [x20, #0x280]
1024c32ac:     	ldr	d1, [x19, #0x280]
1024c32b0:     	fcmp	d0, d1
1024c32b4:     	b.ne	0x1024c37c8
1024c32b8:     	ldrb	w8, [x20, #0x624]
1024c32bc:     	tbnz	w8, #0x0, 0x1024c3334
1024c32c0:     	ldr	x0, [x20, #0x2a0]
1024c32c4:     	ldr	x1, [x19, #0x2a0]
1024c32c8:     	cbz	x0, 0x1024c32dc
1024c32cc:     	cbz	x1, 0x1024c37c8
1024c32d0:     	bl	0x1024b3210
1024c32d4:     	cbnz	w0, 0x1024c32e0
1024c32d8:     	b	0x1024c37cc
1024c32dc:     	cbnz	x1, 0x1024c37c8
1024c32e0:     	ldr	w8, [x20, #0x2b0]
1024c32e4:     	ldr	w9, [x19, #0x2b0]
1024c32e8:     	cmp	w8, w9
1024c32ec:     	b.ne	0x1024c37c8
1024c32f0:     	ldr	w8, [x20, #0x2b4]
1024c32f4:     	ldr	w9, [x19, #0x2b4]
1024c32f8:     	cmp	w8, w9
1024c32fc:     	b.ne	0x1024c37c8
1024c3300:     	ldr	w8, [x20, #0x2c8]
1024c3304:     	tbnz	w8, #0x0, 0x1024c336c
1024c3308:     	ldrb	w8, [x19, #0x2c8]
1024c330c:     	tbnz	w8, #0x0, 0x1024c37c8
1024c3310:     	cbz	w21, 0x1024c3470
1024c3314:     	ldr	w9, [x20, #0x624]
1024c3318:     	ldr	w8, [x19, #0x624]
1024c331c:     	tbnz	w9, #0x0, 0x1024c3454
1024c3320:     	tbnz	w8, #0x0, 0x1024c37c8
1024c3324:     	orr	w8, w21, w22
1024c3328:     	cbz	w8, 0x1024c3540
1024c332c:     	mov	w0, #0x1                ; =1
1024c3330:     	b	0x1024c37cc
1024c3334:     	ldr	d0, [x20, #0x288]
1024c3338:     	ldr	d1, [x19, #0x288]
1024c333c:     	fcmp	d0, d1
1024c3340:     	b.ne	0x1024c37c8
1024c3344:     	ldr	w8, [x20, #0x290]
1024c3348:     	ldr	w9, [x19, #0x290]
1024c334c:     	cmp	w8, w9
1024c3350:     	b.ne	0x1024c37c8
1024c3354:     	tbz	w8, #0x7, 0x1024c32c0
1024c3358:     	ldr	d0, [x20, #0x298]
1024c335c:     	ldr	d1, [x19, #0x298]
1024c3360:     	fcmp	d0, d1
1024c3364:     	b.ne	0x1024c37c8
1024c3368:     	b	0x1024c32c0
1024c336c:     	ldr	w9, [x19, #0x2c8]
1024c3370:     	cmp	w8, w9
1024c3374:     	b.ne	0x1024c37c8
1024c3378:     	ldr	w8, [x20, #0x2cc]
1024c337c:     	ldr	w9, [x19, #0x2cc]
1024c3380:     	cmp	w8, w9
1024c3384:     	b.ne	0x1024c37c8
1024c3388:     	ldr	d0, [x20, #0x2d0]
1024c338c:     	ldr	d1, [x19, #0x2d0]
1024c3390:     	fcmp	d0, d1
1024c3394:     	b.ne	0x1024c37c8
1024c3398:     	ldr	d0, [x20, #0x2d8]
1024c339c:     	ldr	d1, [x19, #0x2d8]
1024c33a0:     	fcmp	d0, d1
1024c33a4:     	b.ne	0x1024c37c8
1024c33a8:     	mov	w0, #0x0                ; =0
1024c33ac:     	ldr	d2, [x20, #0x2e0]
1024c33b0:     	ldr	d3, [x19, #0x2e0]
1024c33b4:     	adrp	x8, 0x1042e3000
1024c33b8:     	ldr	d0, [x8, #0x688]
1024c33bc:     	fadd	d1, d3, d0
1024c33c0:     	fcmp	d1, d2
1024c33c4:     	b.hi	0x1024c37cc
1024c33c8:     	adrp	x8, 0x1042e3000
1024c33cc:     	ldr	d1, [x8, #0x690]
1024c33d0:     	fadd	d3, d3, d1
1024c33d4:     	fcmp	d3, d2
1024c33d8:     	b.lt	0x1024c37cc
1024c33dc:     	mov	w0, #0x0                ; =0
1024c33e0:     	ldr	d2, [x20, #0x2e8]
1024c33e4:     	ldr	d3, [x19, #0x2e8]
1024c33e8:     	fadd	d0, d3, d0
1024c33ec:     	fcmp	d0, d2
1024c33f0:     	b.hi	0x1024c37cc
1024c33f4:     	fadd	d0, d3, d1
1024c33f8:     	fcmp	d0, d2
1024c33fc:     	b.lt	0x1024c37cc
1024c3400:     	ldr	d0, [x20, #0x2f0]
1024c3404:     	ldr	d1, [x19, #0x2f0]
1024c3408:     	fcmp	d0, d1
1024c340c:     	b.ne	0x1024c37c8
1024c3410:     	ldr	d0, [x20, #0x2f8]
1024c3414:     	ldr	d1, [x19, #0x2f8]
1024c3418:     	fcmp	d0, d1
1024c341c:     	b.ne	0x1024c37c8
1024c3420:     	ldr	x0, [x20, #0x2b8]
1024c3424:     	ldr	x1, [x19, #0x2b8]
1024c3428:     	bl	0x1024b1594
1024c342c:     	cbz	w0, 0x1024c37cc
1024c3430:     	ldr	d0, [x20, #0x300]
1024c3434:     	ldr	d1, [x19, #0x300]
1024c3438:     	fcmp	d0, d1
1024c343c:     	b.ne	0x1024c37c8
1024c3440:     	add	x0, x20, #0x308
1024c3444:     	add	x1, x19, #0x308
1024c3448:     	bl	0x1024afb00
1024c344c:     	cbnz	w0, 0x1024c3310
1024c3450:     	b	0x1024c37cc
1024c3454:     	cmp	w9, w8
1024c3458:     	b.ne	0x1024c37c8
1024c345c:     	ldrb	w8, [x20, #0x638]
1024c3460:     	tbnz	w8, #0x0, 0x1024c350c
1024c3464:     	ldrb	w8, [x19, #0x638]
1024c3468:     	tbz	w8, #0x0, 0x1024c352c
1024c346c:     	b	0x1024c37c8
1024c3470:     	cbz	w22, 0x1024c34b4
1024c3474:     	ldr	w8, [x20, #0x80]
1024c3478:     	and	w9, w8, #0x30000
1024c347c:     	cmp	w9, #0x10, lsl #12      ; =0x10000
1024c3480:     	b.eq	0x1024c3494
1024c3484:     	ldr	w9, [x19, #0x80]
1024c3488:     	and	w9, w9, #0x30000
1024c348c:     	cmp	w9, #0x10, lsl #12      ; =0x10000
1024c3490:     	b.ne	0x1024c3554
1024c3494:     	tbz	w8, #0x11, 0x1024c3314
1024c3498:     	ldrb	w8, [x19, #0x82]
1024c349c:     	tbz	w8, #0x1, 0x1024c3314
1024c34a0:     	ldrb	w8, [x20, #0x510]
1024c34a4:     	tbnz	w8, #0x0, 0x1024c364c
1024c34a8:     	ldrb	w8, [x19, #0x510]
1024c34ac:     	tbz	w8, #0x0, 0x1024c3674
1024c34b0:     	b	0x1024c37c8
1024c34b4:     	ldr	w8, [x20, #0x368]
1024c34b8:     	ldr	w9, [x19, #0x368]
1024c34bc:     	cmp	w8, w9
1024c34c0:     	b.ne	0x1024c37c8
1024c34c4:     	ldr	w8, [x20, #0x36c]
1024c34c8:     	ldr	w9, [x19, #0x36c]
1024c34cc:     	cmp	w8, w9
1024c34d0:     	b.ne	0x1024c37c8
1024c34d4:     	ldr	w8, [x20, #0x360]
1024c34d8:     	ldr	w9, [x19, #0x360]
1024c34dc:     	cmp	w8, w9
1024c34e0:     	b.ne	0x1024c37c8
1024c34e4:     	ldr	w9, [x20, #0x364]
1024c34e8:     	ldr	w10, [x19, #0x364]
1024c34ec:     	cmp	w9, w10
1024c34f0:     	b.ne	0x1024c37c8
1024c34f4:     	cbz	w8, 0x1024c3788
1024c34f8:     	ldrb	w8, [x20, #0x380]
1024c34fc:     	tbnz	w8, #0x0, 0x1024c3700
1024c3500:     	ldrb	w8, [x19, #0x380]
1024c3504:     	tbz	w8, #0x0, 0x1024c3720
1024c3508:     	b	0x1024c37c8
1024c350c:     	ldr	d0, [x20, #0x628]
1024c3510:     	ldr	d1, [x19, #0x628]
1024c3514:     	fcmp	d0, d1
1024c3518:     	b.ne	0x1024c37c8
1024c351c:     	add	x0, x20, #0x630
1024c3520:     	add	x1, x19, #0x630
1024c3524:     	bl	0x1024afb00
1024c3528:     	cbz	w0, 0x1024c37cc
1024c352c:     	ldrb	w8, [x20, #0x698]
1024c3530:     	tbnz	w8, #0x0, 0x1024c35cc
1024c3534:     	ldrb	w8, [x19, #0x698]
1024c3538:     	tbz	w8, #0x0, 0x1024c35ec
1024c353c:     	b	0x1024c37c8
1024c3540:     	ldr	w8, [x20, #0x700]
1024c3544:     	ldr	w9, [x19, #0x700]
1024c3548:     	tbnz	w8, #0x0, 0x1024c3568
1024c354c:     	tbz	w9, #0x0, 0x1024c332c
1024c3550:     	b	0x1024c37c8
1024c3554:     	ldrb	w9, [x20, #0x4b0]
1024c3558:     	tbnz	w9, #0x0, 0x1024c3618
1024c355c:     	ldrb	w9, [x19, #0x4b0]
1024c3560:     	tbz	w9, #0x0, 0x1024c3494
1024c3564:     	b	0x1024c37c8
1024c3568:     	cmp	w8, w9
1024c356c:     	b.ne	0x1024c37c8
1024c3570:     	ldr	d0, [x20, #0x708]
1024c3574:     	ldr	d1, [x19, #0x708]
1024c3578:     	fcmp	d0, d1
1024c357c:     	b.ne	0x1024c37c8
1024c3580:     	ldr	w9, [x20, #0x710]
1024c3584:     	ldr	w10, [x19, #0x710]
1024c3588:     	cmp	w9, w10
1024c358c:     	b.ne	0x1024c37c8
1024c3590:     	cmp	w9, #0x1
1024c3594:     	b.eq	0x1024c3734
1024c3598:     	cbnz	w9, 0x1024c332c
1024c359c:     	ldr	d0, [x20, #0x718]
1024c35a0:     	ldr	d1, [x19, #0x718]
1024c35a4:     	fcmp	d0, d1
1024c35a8:     	b.ne	0x1024c37c8
1024c35ac:     	ldr	d0, [x20, #0x720]
1024c35b0:     	ldr	d1, [x19, #0x720]
1024c35b4:     	fcmp	d0, d1
1024c35b8:     	b.ne	0x1024c37c8
1024c35bc:     	tbz	w8, #0x8, 0x1024c332c
1024c35c0:     	ldr	d0, [x20, #0x728]
1024c35c4:     	ldr	d1, [x19, #0x728]
1024c35c8:     	b	0x1024c374c
1024c35cc:     	ldr	d0, [x20, #0x688]
1024c35d0:     	ldr	d1, [x19, #0x688]
1024c35d4:     	fcmp	d0, d1
1024c35d8:     	b.ne	0x1024c37c8
1024c35dc:     	add	x0, x20, #0x690
1024c35e0:     	add	x1, x19, #0x690
1024c35e4:     	bl	0x1024afb00
1024c35e8:     	cbz	w0, 0x1024c37cc
1024c35ec:     	ldr	d0, [x20, #0x6e8]
1024c35f0:     	ldr	d1, [x19, #0x6e8]
1024c35f4:     	fcmp	d0, d1
1024c35f8:     	b.ne	0x1024c37c8
1024c35fc:     	ldrb	w8, [x20, #0x624]
1024c3600:     	tbz	w8, #0x1, 0x1024c3324
1024c3604:     	ldr	x0, [x20, #0x6f0]
1024c3608:     	ldr	x1, [x19, #0x6f0]
1024c360c:     	bl	0x1024ab11c
1024c3610:     	cbnz	w0, 0x1024c3324
1024c3614:     	b	0x1024c37cc
1024c3618:     	ldr	d0, [x20, #0x4a0]
1024c361c:     	ldr	d1, [x19, #0x4a0]
1024c3620:     	fcmp	d0, d1
1024c3624:     	b.ne	0x1024c37c8
1024c3628:     	cbz	w22, 0x1024c3634
1024c362c:     	ldrb	w9, [x19, #0x4b0]
1024c3630:     	tbz	w9, #0x0, 0x1024c3494
1024c3634:     	add	x0, x20, #0x4a8
1024c3638:     	add	x1, x19, #0x4a8
1024c363c:     	bl	0x1024afb00
1024c3640:     	cbz	w0, 0x1024c37cc
1024c3644:     	ldr	w8, [x20, #0x80]
1024c3648:     	b	0x1024c3494
1024c364c:     	ldr	d0, [x20, #0x500]
1024c3650:     	ldr	d1, [x19, #0x500]
1024c3654:     	fcmp	d0, d1
1024c3658:     	b.ne	0x1024c37c8
1024c365c:     	ldrb	w8, [x19, #0x510]
1024c3660:     	tbz	w8, #0x0, 0x1024c3674
1024c3664:     	add	x0, x20, #0x508
1024c3668:     	add	x1, x19, #0x508
1024c366c:     	bl	0x1024afb00
1024c3670:     	cbz	w0, 0x1024c37cc
1024c3674:     	ldrb	w8, [x20, #0x570]
1024c3678:     	tbnz	w8, #0x0, 0x1024c3688
1024c367c:     	ldrb	w8, [x19, #0x570]
1024c3680:     	tbz	w8, #0x0, 0x1024c36b0
1024c3684:     	b	0x1024c37c8
1024c3688:     	ldr	d0, [x20, #0x560]
1024c368c:     	ldr	d1, [x19, #0x560]
1024c3690:     	fcmp	d0, d1
1024c3694:     	b.ne	0x1024c37c8
1024c3698:     	ldrb	w8, [x19, #0x570]
1024c369c:     	tbz	w8, #0x0, 0x1024c36b0
1024c36a0:     	add	x0, x20, #0x568
1024c36a4:     	add	x1, x19, #0x568
1024c36a8:     	bl	0x1024afb00
1024c36ac:     	cbz	w0, 0x1024c37cc
1024c36b0:     	ldrb	w8, [x20, #0x5d0]
1024c36b4:     	tbnz	w8, #0x0, 0x1024c36c4
1024c36b8:     	ldrb	w8, [x19, #0x5d0]
1024c36bc:     	tbz	w8, #0x0, 0x1024c36ec
1024c36c0:     	b	0x1024c37c8
1024c36c4:     	ldr	d0, [x20, #0x5c0]
1024c36c8:     	ldr	d1, [x19, #0x5c0]
1024c36cc:     	fcmp	d0, d1
1024c36d0:     	b.ne	0x1024c37c8
1024c36d4:     	ldrb	w8, [x19, #0x5d0]
1024c36d8:     	tbz	w8, #0x0, 0x1024c36ec
1024c36dc:     	add	x0, x20, #0x5c8
1024c36e0:     	add	x1, x19, #0x5c8
1024c36e4:     	bl	0x1024afb00
1024c36e8:     	cbz	w0, 0x1024c37cc
1024c36ec:     	ldr	w8, [x20, #0x620]
1024c36f0:     	ldr	w9, [x19, #0x620]
1024c36f4:     	cmp	w8, w9
1024c36f8:     	b.eq	0x1024c3314
1024c36fc:     	b	0x1024c37c8
1024c3700:     	ldr	d0, [x20, #0x370]
1024c3704:     	ldr	d1, [x19, #0x370]
1024c3708:     	fcmp	d0, d1
1024c370c:     	b.ne	0x1024c37c8
1024c3710:     	add	x0, x20, #0x378
1024c3714:     	add	x1, x19, #0x378
1024c3718:     	bl	0x1024afb00
1024c371c:     	cbz	w0, 0x1024c37cc
1024c3720:     	ldrb	w8, [x20, #0x3e0]
1024c3724:     	tbnz	w8, #0x0, 0x1024c3758
1024c3728:     	ldrb	w8, [x19, #0x3e0]
1024c372c:     	tbz	w8, #0x0, 0x1024c3778
1024c3730:     	b	0x1024c37c8
1024c3734:     	ldr	d0, [x20, #0x730]
1024c3738:     	ldr	d1, [x19, #0x730]
1024c373c:     	fcmp	d0, d1
1024c3740:     	b.ne	0x1024c37c8
1024c3744:     	ldr	d0, [x20, #0x738]
1024c3748:     	ldr	d1, [x19, #0x738]
1024c374c:     	fcmp	d0, d1
1024c3750:     	b.ne	0x1024c37c8
1024c3754:     	b	0x1024c332c
1024c3758:     	ldr	d0, [x20, #0x3d0]
1024c375c:     	ldr	d1, [x19, #0x3d0]
1024c3760:     	fcmp	d0, d1
1024c3764:     	b.ne	0x1024c37c8
1024c3768:     	add	x0, x20, #0x3d8
1024c376c:     	add	x1, x19, #0x3d8
1024c3770:     	bl	0x1024afb00
1024c3774:     	cbz	w0, 0x1024c37cc
1024c3778:     	ldr	d0, [x20, #0x430]
1024c377c:     	ldr	d1, [x19, #0x430]
1024c3780:     	fcmp	d0, d1
1024c3784:     	b.ne	0x1024c37c8
1024c3788:     	ldrb	w8, [x20, #0x450]
1024c378c:     	tbnz	w8, #0x0, 0x1024c379c
1024c3790:     	ldrb	w8, [x19, #0x450]
1024c3794:     	tbz	w8, #0x0, 0x1024c3474
1024c3798:     	b	0x1024c37c8
1024c379c:     	ldr	w8, [x20, #0x364]
1024c37a0:     	cmp	w8, #0x1
1024c37a4:     	b.ne	0x1024c3474
1024c37a8:     	ldr	w8, [x20, #0x438]
1024c37ac:     	ldr	w9, [x19, #0x438]
1024c37b0:     	cmp	w8, w9
1024c37b4:     	b.ne	0x1024c37c8
1024c37b8:     	ldr	d0, [x20, #0x440]
1024c37bc:     	ldr	d1, [x19, #0x440]
1024c37c0:     	fcmp	d0, d1
1024c37c4:     	b.eq	0x1024c37e0
1024c37c8:     	mov	w0, #0x0                ; =0
1024c37cc:     	ldp	x29, x30, [sp, #0x30]
1024c37d0:     	ldp	x20, x19, [sp, #0x20]
1024c37d4:     	ldp	x22, x21, [sp, #0x10]
1024c37d8:     	ldp	d9, d8, [sp], #0x40
1024c37dc:     	ret
1024c37e0:     	add	x0, x20, #0x448
1024c37e4:     	add	x1, x19, #0x448
1024c37e8:     	bl	0x1024afb00
1024c37ec:     	cbnz	w0, 0x1024c3474
1024c37f0:     	b	0x1024c37cc

FUNCTION 0x1024c37f4 size 108
1024c37f4:     	stp	x20, x19, [sp, #-0x20]!
1024c37f8:     	stp	x29, x30, [sp, #0x10]
1024c37fc:     	add	x29, sp, #0x10
1024c3800:     	mov	x19, x1
1024c3804:     	mov	x20, x0
1024c3808:     	mov	w2, #0x0                ; =0
1024c380c:     	mov	w3, #0x1                ; =1
1024c3810:     	mov	w4, #0x0                ; =0
1024c3814:     	bl	0x1024c2fd4
1024c3818:     	cbz	w0, 0x1024c3854
1024c381c:     	ldr	x0, [x20, #0x68]
1024c3820:     	ldr	x1, [x19, #0x68]
1024c3824:     	cbz	x0, 0x1024c3844
1024c3828:     	cbz	x1, 0x1024c3848
1024c382c:     	mov	w2, #0x0                ; =0
1024c3830:     	mov	w3, #0x1                ; =1
1024c3834:     	mov	w4, #0x1                ; =1
1024c3838:     	bl	0x1024c2fd4
1024c383c:     	cbnz	w0, 0x1024c3850
1024c3840:     	b	0x1024c3854
1024c3844:     	cbz	x1, 0x1024c3850
1024c3848:     	mov	w0, #0x0                ; =0
1024c384c:     	b	0x1024c3854
1024c3850:     	mov	w0, #0x1                ; =1
1024c3854:     	ldp	x29, x30, [sp, #0x10]
1024c3858:     	ldp	x20, x19, [sp], #0x20
1024c385c:     	ret

FUNCTION 0x1024c3860 size 108
1024c3860:     	stp	x20, x19, [sp, #-0x20]!
1024c3864:     	stp	x29, x30, [sp, #0x10]
1024c3868:     	add	x29, sp, #0x10
1024c386c:     	mov	x19, x1
1024c3870:     	mov	x20, x0
1024c3874:     	mov	w2, #0x1                ; =1
1024c3878:     	mov	w3, #0x0                ; =0
1024c387c:     	mov	w4, #0x0                ; =0
1024c3880:     	bl	0x1024c2fd4
1024c3884:     	cbz	w0, 0x1024c38c0
1024c3888:     	ldr	x0, [x20, #0x68]
1024c388c:     	ldr	x1, [x19, #0x68]
1024c3890:     	cbz	x0, 0x1024c38b0
1024c3894:     	cbz	x1, 0x1024c38b4
1024c3898:     	mov	w2, #0x1                ; =1
1024c389c:     	mov	w3, #0x0                ; =0
1024c38a0:     	mov	w4, #0x1                ; =1
1024c38a4:     	bl	0x1024c2fd4
1024c38a8:     	cbnz	w0, 0x1024c38bc
1024c38ac:     	b	0x1024c38c0
1024c38b0:     	cbz	x1, 0x1024c38bc
1024c38b4:     	mov	w0, #0x0                ; =0
1024c38b8:     	b	0x1024c38c0
1024c38bc:     	mov	w0, #0x1                ; =1
1024c38c0:     	ldp	x29, x30, [sp, #0x10]
1024c38c4:     	ldp	x20, x19, [sp], #0x20
1024c38c8:     	ret

FUNCTION 0x1024c38cc size 20
1024c38cc:     	fmov	d0, #1.00000000
1024c38d0:     	ldrb	w8, [x0, #0x80]
1024c38d4:     	tbnz	w8, #0x4, 0x1024c38dc
1024c38d8:     	ldr	d0, [x0, #0x1a0]
1024c38dc:     	ret

FUNCTION 0x1024c38e0 size 16
1024c38e0:     	ldr	w8, [x0, #0x438]
1024c38e4:     	cmp	w8, #0x1
1024c38e8:     	cset	w0, eq
1024c38ec:     	ret

FUNCTION 0x1024c38f0 size 8
1024c38f0:     	ldr	d0, [x0, #0x270]
1024c38f4:     	ret

FUNCTION 0x1024c38f8 size 332
1024c38f8:     	stp	d9, d8, [sp, #-0x40]!
1024c38fc:     	stp	x22, x21, [sp, #0x10]
1024c3900:     	stp	x20, x19, [sp, #0x20]
1024c3904:     	stp	x29, x30, [sp, #0x30]
1024c3908:     	add	x29, sp, #0x30
1024c390c:     	fmov	d8, d0
1024c3910:     	mov	x19, x0
1024c3914:     	ldr	w21, [x0, #0x624]
1024c3918:     	movi	d9, #0000000000000000
1024c391c:     	tbz	w21, #0x0, 0x1024c3970
1024c3920:     	mov	x20, x1
1024c3924:     	ldr	d0, [x19, #0x628]
1024c3928:     	add	x0, x19, #0x630
1024c392c:     	bl	0x1024b0108
1024c3930:     	ldrb	w8, [x19, #0x624]
1024c3934:     	tbz	w8, #0x1, 0x1024c3950
1024c3938:     	adrp	x8, 0x10453a000
1024c393c:     	ldr	d1, [x8, #0x778]
1024c3940:     	fmul	d1, d0, d1
1024c3944:     	ldrb	w8, [x19, #0x278]
1024c3948:     	tst	w8, #0x1
1024c394c:     	fcsel	d0, d0, d1, eq
1024c3950:     	fmov	d1, #1.00000000
1024c3954:     	fcmp	d0, d1
1024c3958:     	fcsel	d9, d1, d0, mi
1024c395c:     	cbz	w20, 0x1024c3970
1024c3960:     	movi	d8, #0000000000000000
1024c3964:     	ldrb	w8, [x19, #0x80]
1024c3968:     	tbz	w8, #0x4, 0x1024c39d0
1024c396c:     	b	0x1024c39e8
1024c3970:     	add	x0, x19, #0x88
1024c3974:     	fmov	d0, d8
1024c3978:     	bl	0x1024b0108
1024c397c:     	fmov	d1, #1.00000000
1024c3980:     	fcmp	d0, d1
1024c3984:     	fcsel	d8, d1, d0, mi
1024c3988:     	ldr	w8, [x19, #0x80]
1024c398c:     	tbnz	w8, #0x4, 0x1024c39ac
1024c3990:     	tbnz	w21, #0x0, 0x1024c39d0
1024c3994:     	ldr	d0, [x19, #0x1a0]
1024c3998:     	fmov	d1, #1.50000000
1024c399c:     	fmov	d2, #-0.50000000
1024c39a0:     	fmadd	d0, d0, d2, d1
1024c39a4:     	fmul	d8, d8, d0
1024c39a8:     	b	0x1024c3a00
1024c39ac:     	tbnz	w21, #0x0, 0x1024c39e8
1024c39b0:     	tbnz	w8, #0x5, 0x1024c3a00
1024c39b4:     	adrp	x8, 0x10453a000
1024c39b8:     	ldr	d0, [x8, #0x778]
1024c39bc:     	fmul	d0, d8, d0
1024c39c0:     	ldrb	w8, [x19, #0x278]
1024c39c4:     	tst	w8, #0x1
1024c39c8:     	fcsel	d8, d8, d0, eq
1024c39cc:     	b	0x1024c3a00
1024c39d0:     	ldr	d0, [x19, #0x1a0]
1024c39d4:     	fmov	d1, #1.50000000
1024c39d8:     	fmov	d2, #-0.50000000
1024c39dc:     	fmadd	d0, d0, d2, d1
1024c39e0:     	fmul	d9, d9, d0
1024c39e4:     	b	0x1024c3a00
1024c39e8:     	adrp	x8, 0x10453a000
1024c39ec:     	ldr	d0, [x8, #0x778]
1024c39f0:     	fmul	d0, d9, d0
1024c39f4:     	ldrb	w8, [x19, #0x290]
1024c39f8:     	tst	w8, #0x1
1024c39fc:     	fcsel	d9, d9, d0, eq
1024c3a00:     	ldr	d0, [x19, #0x210]
1024c3a04:     	add	x0, x19, #0x218
1024c3a08:     	bl	0x1024b0108
1024c3a0c:     	fmov	d1, #1.00000000
1024c3a10:     	fcmp	d0, d1
1024c3a14:     	b.le	0x1024c3a2c
1024c3a18:     	fmul	d1, d8, d0
1024c3a1c:     	fmul	d0, d9, d0
1024c3a20:     	tst	w21, #0x1
1024c3a24:     	fcsel	d8, d1, d8, eq
1024c3a28:     	fcsel	d9, d9, d0, eq
1024c3a2c:     	fadd	d0, d8, d9
1024c3a30:     	ldp	x29, x30, [sp, #0x30]
1024c3a34:     	ldp	x20, x19, [sp, #0x20]
1024c3a38:     	ldp	x22, x21, [sp, #0x10]
1024c3a3c:     	ldp	d9, d8, [sp], #0x40
1024c3a40:     	ret

FUNCTION 0x1024c3a44 size 216
1024c3a44:     	ldr	w8, [x0, #0x624]
1024c3a48:     	ldr	d1, [x0, #0x628]
1024c3a4c:     	fmov	d2, #1.00000000
1024c3a50:     	fcmp	d0, d2
1024c3a54:     	fcsel	d3, d0, d2, pl
1024c3a58:     	fcmp	d1, d2
1024c3a5c:     	fcsel	d2, d1, d2, pl
1024c3a60:     	tst	w8, #0x1
1024c3a64:     	fcsel	d0, d3, d0, eq
1024c3a68:     	fcsel	d1, d1, d2, eq
1024c3a6c:     	ldrb	w9, [x0, #0x80]
1024c3a70:     	tbnz	w9, #0x4, 0x1024c3a8c
1024c3a74:     	ldr	d2, [x0, #0x1a0]
1024c3a78:     	fmov	d3, #1.50000000
1024c3a7c:     	fmov	d4, #-0.50000000
1024c3a80:     	fmadd	d2, d2, d4, d3
1024c3a84:     	tbz	w8, #0x0, 0x1024c3ab0
1024c3a88:     	b	0x1024c3ad8
1024c3a8c:     	tbnz	w8, #0x0, 0x1024c3ab8
1024c3a90:     	ldr	d2, [x0, #0x270]
1024c3a94:     	fcmp	d2, #0.0
1024c3a98:     	b.ne	0x1024c3aa8
1024c3a9c:     	ldr	w9, [x0, #0x278]
1024c3aa0:     	cmp	w9, #0x10
1024c3aa4:     	b.lo	0x1024c3adc
1024c3aa8:     	adrp	x9, 0x10453a000
1024c3aac:     	ldr	d2, [x9, #0x778]
1024c3ab0:     	fmul	d0, d0, d2
1024c3ab4:     	b	0x1024c3adc
1024c3ab8:     	ldr	d2, [x0, #0x288]
1024c3abc:     	fcmp	d2, #0.0
1024c3ac0:     	b.ne	0x1024c3ad0
1024c3ac4:     	ldr	w9, [x0, #0x290]
1024c3ac8:     	cmp	w9, #0x10
1024c3acc:     	b.lo	0x1024c3adc
1024c3ad0:     	adrp	x9, 0x10453a000
1024c3ad4:     	ldr	d2, [x9, #0x778]
1024c3ad8:     	fmul	d1, d1, d2
1024c3adc:     	ldr	d2, [x0, #0x210]
1024c3ae0:     	fmov	d3, #1.00000000
1024c3ae4:     	fmul	d4, d0, d2
1024c3ae8:     	fmul	d5, d1, d2
1024c3aec:     	tst	w8, #0x1
1024c3af0:     	fcsel	d4, d4, d0, eq
1024c3af4:     	fcsel	d5, d1, d5, eq
1024c3af8:     	fcmp	d2, d3
1024c3afc:     	fcsel	d0, d0, d4, le
1024c3b00:     	fcsel	d1, d1, d5, le
1024c3b04:     	tst	w8, #0x1
1024c3b08:     	fcsel	d0, d0, d1, eq
1024c3b0c:     	fmov	d1, #5.00000000
1024c3b10:     	fmov	d2, #2.00000000
1024c3b14:     	fmadd	d0, d0, d2, d1
1024c3b18:     	ret

FUNCTION 0x1024c3b1c size 372
1024c3b1c:     	stp	x22, x21, [sp, #-0x30]!
1024c3b20:     	stp	x20, x19, [sp, #0x10]
1024c3b24:     	stp	x29, x30, [sp, #0x20]
1024c3b28:     	add	x29, sp, #0x20
1024c3b2c:     	mov	x19, x3
1024c3b30:     	mov	x21, x2
1024c3b34:     	mov	x20, x0
1024c3b38:     	ldr	w9, [x0, #0x2b0]
1024c3b3c:     	str	w9, [x3]
1024c3b40:     	ldr	w8, [x0, #0x80]
1024c3b44:     	dup.2s	v0, w8
1024c3b48:     	adrp	x10, 0x10453a000
1024c3b4c:     	ldr	d1, [x10, #0x7e8]
1024c3b50:     	and.8b	v0, v0, v1
1024c3b54:     	stur	d0, [x3, #0x4]
1024c3b58:     	ldr	w10, [x0, #0x364]
1024c3b5c:     	stp	wzr, w10, [x3, #0xc]
1024c3b60:     	cbnz	w2, 0x1024c3b7c
1024c3b64:     	ldr	w11, [x20, #0x360]
1024c3b68:     	cbz	w11, 0x1024c3b7c
1024c3b6c:     	cmp	w1, #0x1
1024c3b70:     	b.ne	0x1024c3bc0
1024c3b74:     	cmp	w10, #0x2
1024c3b78:     	b.ne	0x1024c3bc0
1024c3b7c:     	cmp	w9, #0x1b
1024c3b80:     	b.eq	0x1024c3bb8
1024c3b84:     	cmp	w9, #0x23
1024c3b88:     	b.eq	0x1024c3bb8
1024c3b8c:     	tbnz	w8, #0x8, 0x1024c3bb8
1024c3b90:     	str	wzr, [x19, #0x1c]
1024c3b94:     	and	w9, w8, #0x30000
1024c3b98:     	cmp	w9, #0x10, lsl #12      ; =0x10000
1024c3b9c:     	b.ne	0x1024c3c44
1024c3ba0:     	tbz	w8, #0x4, 0x1024c3bcc
1024c3ba4:     	ldr	x0, [x20, #0x2a0]
1024c3ba8:     	bl	0x1024b2fc4
1024c3bac:     	cmp	w0, #0x0
1024c3bb0:     	cset	w8, eq
1024c3bb4:     	b	0x1024c3bc8
1024c3bb8:     	str	wzr, [x19, #0x1c]
1024c3bbc:     	b	0x1024c3bcc
1024c3bc0:     	mov	w8, #0x1                ; =1
1024c3bc4:     	str	w8, [x19, #0xc]
1024c3bc8:     	str	w8, [x19, #0x1c]
1024c3bcc:     	ldr	w8, [x20, #0x2c8]
1024c3bd0:     	mov	w9, #0x11               ; =17
1024c3bd4:     	and	w8, w8, w9
1024c3bd8:     	movi	d0, #0000000000000000
1024c3bdc:     	cmp	w8, #0x1
1024c3be0:     	b.ne	0x1024c3be8
1024c3be4:     	ldr	d0, [x20, #0x300]
1024c3be8:     	add	x8, x20, #0x718
1024c3bec:     	str	d0, [x19, #0x20]
1024c3bf0:     	cbz	w21, 0x1024c3bfc
1024c3bf4:     	mov	w9, #0x0                ; =0
1024c3bf8:     	b	0x1024c3c00
1024c3bfc:     	ldr	w9, [x20, #0x700]
1024c3c00:     	str	w9, [x19, #0x28]
1024c3c04:     	ldr	d0, [x20, #0x708]
1024c3c08:     	str	d0, [x19, #0x30]
1024c3c0c:     	ldr	w9, [x20, #0x710]
1024c3c10:     	str	w9, [x19, #0x38]
1024c3c14:     	ldr	q0, [x8]
1024c3c18:     	str	q0, [x19, #0x40]
1024c3c1c:     	ldr	d0, [x20, #0x738]
1024c3c20:     	str	d0, [x19, #0x60]
1024c3c24:     	ldr	q0, [x8, #0x10]
1024c3c28:     	str	q0, [x19, #0x50]
1024c3c2c:     	ldr	d0, [x20, #0x368]
1024c3c30:     	stur	d0, [x19, #0x14]
1024c3c34:     	ldp	x29, x30, [sp, #0x20]
1024c3c38:     	ldp	x20, x19, [sp, #0x10]
1024c3c3c:     	ldp	x22, x21, [sp], #0x30
1024c3c40:     	ret
1024c3c44:     	ldr	d1, [x20, #0x4a0]
1024c3c48:     	adrp	x9, 0x1042e3000
1024c3c4c:     	ldr	d0, [x9, #0x690]
1024c3c50:     	fcmp	d1, d0
1024c3c54:     	b.gt	0x1024c3c88
1024c3c58:     	ldr	d1, [x20, #0x500]
1024c3c5c:     	fabs	d1, d1
1024c3c60:     	fcmp	d1, d0
1024c3c64:     	b.hi	0x1024c3c88
1024c3c68:     	ldr	d1, [x20, #0x560]
1024c3c6c:     	fabs	d1, d1
1024c3c70:     	fcmp	d1, d0
1024c3c74:     	b.hi	0x1024c3c88
1024c3c78:     	ldr	d1, [x20, #0x5c0]
1024c3c7c:     	fabs	d1, d1
1024c3c80:     	fcmp	d1, d0
1024c3c84:     	b.ls	0x1024c3ba0
1024c3c88:     	mov	w8, #0x1                ; =1
1024c3c8c:     	b	0x1024c3bc8

FUNCTION 0x1024c3c90 size 76
1024c3c90:     	ldrb	w8, [x0, #0x2c8]
1024c3c94:     	tbz	w8, #0x0, 0x1024c3cd8
1024c3c98:     	stp	x20, x19, [sp, #-0x20]!
1024c3c9c:     	stp	x29, x30, [sp, #0x10]
1024c3ca0:     	add	x29, sp, #0x10
1024c3ca4:     	mov	x19, x1
1024c3ca8:     	add	x20, x0, #0x2c8
1024c3cac:     	add	x1, x0, #0x2b8
1024c3cb0:     	mov	x0, x19
1024c3cb4:     	bl	0x100023be4
1024c3cb8:     	ldp	q1, q0, [x20, #0x10]
1024c3cbc:     	ldr	x8, [x20, #0x30]
1024c3cc0:     	ldr	q2, [x20]
1024c3cc4:     	str	x8, [x19, #0x40]
1024c3cc8:     	stp	q1, q0, [x19, #0x20]
1024c3ccc:     	str	q2, [x19, #0x10]
1024c3cd0:     	ldp	x29, x30, [sp, #0x10]
1024c3cd4:     	ldp	x20, x19, [sp], #0x20
1024c3cd8:     	ret

FUNCTION 0x1024c3cdc size 16
1024c3cdc:     	ldr	x0, [x0, #0x2a0]
1024c3ce0:     	cbz	x0, 0x1024c3ce8
1024c3ce4:     	b	0x1024b32f8
1024c3ce8:     	ret

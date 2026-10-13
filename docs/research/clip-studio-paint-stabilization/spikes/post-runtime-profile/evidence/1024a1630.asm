
FUNCTION 0x1024a1630 size 1696
1024a1630:     	stp	d9, d8, [sp, #-0x70]!
1024a1634:     	stp	x28, x27, [sp, #0x10]
1024a1638:     	stp	x26, x25, [sp, #0x20]
1024a163c:     	stp	x24, x23, [sp, #0x30]
1024a1640:     	stp	x22, x21, [sp, #0x40]
1024a1644:     	stp	x20, x19, [sp, #0x50]
1024a1648:     	stp	x29, x30, [sp, #0x60]
1024a164c:     	add	x29, sp, #0x60
1024a1650:     	sub	sp, sp, #0x2a0
1024a1654:     	cbz	x1, 0x1024a1c54
1024a1658:     	mov	x19, x0
1024a165c:     	ldr	x8, [x0, #0xe8]
1024a1660:     	cbz	x8, 0x1024a1c54
1024a1664:     	mov	x26, x6
1024a1668:     	mov	x25, x1
1024a166c:     	mov	x20, x5
1024a1670:     	mov	x21, x2
1024a1674:     	mov	x22, x7
1024a1678:     	mov	x23, x4
1024a167c:     	mov	x24, x3
1024a1680:     	add	x27, sp, #0x80
1024a1684:     	add	x28, sp, #0x80
1024a1688:     	ldur	q0, [x19, #0x58]
1024a168c:     	movi.2d	v1, #0000000000000000
1024a1690:     	stur	q1, [x19, #0x58]
1024a1694:     	str	q0, [sp, #0x80]
1024a1698:     	orr	x0, x28, #0x8
1024a169c:     	bl	0x10001022c
1024a16a0:     	ldr	x8, [x25]
1024a16a4:     	ldr	x9, [x8, #0x98]
1024a16a8:     	sub	x8, x29, #0xf0
1024a16ac:     	mov	x0, x25
1024a16b0:     	blr	x9
1024a16b4:     	ldr	q0, [x27, #0x190]
1024a16b8:     	movi.2d	v1, #0000000000000000
1024a16bc:     	str	q1, [x27, #0x190]
1024a16c0:     	ldur	q1, [x19, #0x48]
1024a16c4:     	stur	q0, [x19, #0x48]
1024a16c8:     	str	q1, [sp, #0x80]
1024a16cc:     	orr	x0, x28, #0x8
1024a16d0:     	bl	0x10001022c
1024a16d4:     	sub	x8, x29, #0xf0
1024a16d8:     	orr	x0, x8, #0x8
1024a16dc:     	bl	0x10001022c
1024a16e0:     	ldr	x8, [x19, #0x48]
1024a16e4:     	cbz	x8, 0x1024a1c54
1024a16e8:     	ldr	x8, [x25]
1024a16ec:     	ldr	x8, [x8, #0x88]
1024a16f0:     	mov	x0, x25
1024a16f4:     	blr	x8
1024a16f8:     	str	d0, [x19, #0x68]
1024a16fc:     	ldr	x8, [x25]
1024a1700:     	ldr	x8, [x8, #0x78]
1024a1704:     	mov	x0, x25
1024a1708:     	blr	x8
1024a170c:     	fmov	d8, d0
1024a1710:     	ldr	x8, [x25]
1024a1714:     	ldr	x8, [x8, #0x48]
1024a1718:     	mov	x0, x25
1024a171c:     	blr	x8
1024a1720:     	mov	x28, x19
1024a1724:     	str	x0, [x28, #0x78]!
1024a1728:     	str	w1, [x19, #0x80]
1024a172c:     	ldr	x8, [x25]
1024a1730:     	ldr	x8, [x8, #0x58]
1024a1734:     	mov	x0, x25
1024a1738:     	blr	x8
1024a173c:     	stur	x0, [x19, #0x84]
1024a1740:     	str	w1, [x19, #0x8c]
1024a1744:     	mov	x0, x19
1024a1748:     	bl	0x1024a42a4
1024a174c:     	str	wzr, [x19, #0xd4]
1024a1750:     	cbz	w26, 0x1024a175c
1024a1754:     	ldr	x8, [x19, #0x120]
1024a1758:     	cbz	x8, 0x1024a17e0
1024a175c:     	mov	w8, #0x21               ; =33
1024a1760:     	str	w8, [x19, #0xe0]
1024a1764:     	ldr	x0, [x19, #0xe8]
1024a1768:     	sub	x8, x29, #0x80
1024a176c:     	mov	w1, #0x0                ; =0
1024a1770:     	bl	0x1024ac538
1024a1774:     	ldur	x0, [x29, #-0x80]
1024a1778:     	add	x27, sp, #0x80
1024a177c:     	cbz	x0, 0x1024a1790
1024a1780:     	bl	0x10368b4b4
1024a1784:     	mov	x1, x0
1024a1788:     	str	w1, [x19, #0xe0]
1024a178c:     	b	0x1024a1794
1024a1790:     	ldr	w1, [x19, #0xe0]
1024a1794:     	ldr	x0, [x19, #0x48]
1024a1798:     	ldr	w2, [x19, #0x100]
1024a179c:     	sub	x3, x29, #0xf0
1024a17a0:     	bl	0x1024c3b1c
1024a17a4:     	sub	x26, x29, #0xf0
1024a17a8:     	ldur	d0, [x26, #0x14]
1024a17ac:     	str	d0, [x19, #0xd8]
1024a17b0:     	ldur	w8, [x29, #-0xe4]
1024a17b4:     	cbz	w8, 0x1024a17d8
1024a17b8:     	ldur	w8, [x29, #-0xe0]
1024a17bc:     	cbz	w8, 0x1024a1844
1024a17c0:     	cmp	w8, #0x1
1024a17c4:     	b.eq	0x1024a183c
1024a17c8:     	cmp	w8, #0x2
1024a17cc:     	b.ne	0x1024a17d8
1024a17d0:     	mov	w8, #0x3                ; =3
1024a17d4:     	b	0x1024a1848
1024a17d8:     	str	wzr, [x19, #0xc0]
1024a17dc:     	b	0x1024a184c
1024a17e0:     	ldr	d0, [x19, #0x108]
1024a17e4:     	adrp	x8, 0x1042e6000
1024a17e8:     	ldr	d1, [x8, #0xfd0]
1024a17ec:     	fcmp	d0, d1
1024a17f0:     	b.lt	0x1024a175c
1024a17f4:     	adrp	x8, 0x1042e6000
1024a17f8:     	ldr	d1, [x8, #0xfd8]
1024a17fc:     	fcmp	d0, d1
1024a1800:     	b.hi	0x1024a175c
1024a1804:     	ldr	x0, [x19, #0x48]
1024a1808:     	ldr	w1, [x19, #0x100]
1024a180c:     	bl	0x1024c553c
1024a1810:     	cbz	w0, 0x1024a175c
1024a1814:     	ldr	x8, [x25, #0x30]
1024a1818:     	cbz	x8, 0x1024a1830
1024a181c:     	ldrb	w8, [x8, #0x40]
1024a1820:     	tbnz	w8, #0x4, 0x1024a175c
1024a1824:     	ldr	x8, [x25, #0x38]
1024a1828:     	ldrb	w8, [x8, #0x40]
1024a182c:     	tbnz	w8, #0x5, 0x1024a175c
1024a1830:     	mov	w8, #0x1                ; =1
1024a1834:     	str	w8, [x19, #0xd4]
1024a1838:     	b	0x1024a175c
1024a183c:     	mov	w8, #0x2                ; =2
1024a1840:     	b	0x1024a1848
1024a1844:     	mov	w8, #0x1                ; =1
1024a1848:     	str	w8, [x19, #0xc0]
1024a184c:     	ldur	w8, [x29, #-0xd4]
1024a1850:     	ldur	w9, [x29, #-0xf0]
1024a1854:     	str	w8, [x19, #0xc4]
1024a1858:     	cmp	w9, #0x1b
1024a185c:     	cset	w8, eq
1024a1860:     	str	w8, [x19, #0xcc]
1024a1864:     	add	x0, sp, #0x80
1024a1868:     	bl	0x1024a5a34
1024a186c:     	lsr	x25, x21, #32
1024a1870:     	ldr	x0, [x19, #0x48]
1024a1874:     	ldrb	w8, [x0, #0x2c8]
1024a1878:     	tbz	w8, #0x0, 0x1024a1910
1024a187c:     	add	x8, sp, #0x80
1024a1880:     	add	x1, x8, #0xa0
1024a1884:     	bl	0x1024c3c90
1024a1888:     	scvtf	d1, w21
1024a188c:     	scvtf	d0, w25
1024a1890:     	ldrb	w8, [sp, #0x130]
1024a1894:     	tbnz	w8, #0x4, 0x1024a18a8
1024a1898:     	mov	w8, #0x1                ; =1
1024a189c:     	str	w8, [sp, #0x100]
1024a18a0:     	mov	w8, #0x110              ; =272
1024a18a4:     	b	0x1024a18b4
1024a18a8:     	mov	w8, #0x1                ; =1
1024a18ac:     	str	w8, [sp, #0xfc]
1024a18b0:     	mov	w8, #0x108              ; =264
1024a18b4:     	ldr	d2, [x19, x8]
1024a18b8:     	ldr	d3, [sp, #0x138]
1024a18bc:     	fmul	d3, d2, d3
1024a18c0:     	str	d3, [sp, #0x138]
1024a18c4:     	ldur	q3, [x27, #0xc8]
1024a18c8:     	fmul.2d	v3, v3, v2[0]
1024a18cc:     	stur	q3, [x27, #0xc8]
1024a18d0:     	fmul	d1, d2, d1
1024a18d4:     	fcmp	d1, #0.0
1024a18d8:     	adrp	x8, 0x1042e3000
1024a18dc:     	ldr	d3, [x8, #0x690]
1024a18e0:     	adrp	x8, 0x1042fe000
1024a18e4:     	ldr	d4, [x8, #0xd20]
1024a18e8:     	fcsel	d5, d4, d3, mi
1024a18ec:     	fadd	d1, d1, d5
1024a18f0:     	fcvtzs	w8, d1
1024a18f4:     	fmul	d0, d2, d0
1024a18f8:     	fcmp	d0, #0.0
1024a18fc:     	fcsel	d1, d4, d3, mi
1024a1900:     	fadd	d0, d0, d1
1024a1904:     	fcvtzs	w9, d0
1024a1908:     	str	w8, [sp, #0x114]
1024a190c:     	str	w9, [sp, #0x118]
1024a1910:     	ldr	x8, [x28]
1024a1914:     	str	x8, [sp, #0x80]
1024a1918:     	ldr	w8, [x28, #0x8]
1024a191c:     	str	w8, [sp, #0x88]
1024a1920:     	ldr	x0, [x19, #0x48]
1024a1924:     	bl	0x1024c38cc
1024a1928:     	str	d0, [sp, #0x90]
1024a192c:     	ldp	w9, w8, [x29, #-0xf0]
1024a1930:     	and	w8, w8, #0x1000
1024a1934:     	ldr	w10, [x19, #0xc0]
1024a1938:     	stp	w8, w10, [sp, #0x98]
1024a193c:     	ldur	w8, [x29, #-0xe8]
1024a1940:     	stp	w9, w8, [sp, #0xa8]
1024a1944:     	str	d8, [sp, #0xb0]
1024a1948:     	ldr	x0, [x19, #0x48]
1024a194c:     	bl	0x1024c29e8
1024a1950:     	str	w0, [sp, #0xf8]
1024a1954:     	ldur	d0, [x29, #-0xd0]
1024a1958:     	str	d0, [sp, #0x108]
1024a195c:     	str	w22, [sp, #0x110]
1024a1960:     	str	w24, [sp, #0x168]
1024a1964:     	stur	x23, [x27, #0xec]
1024a1968:     	ldr	w8, [x19, #0x100]
1024a196c:     	str	w8, [sp, #0x174]
1024a1970:     	add	x8, sp, #0x80
1024a1974:     	add	x8, x8, #0x184
1024a1978:     	ldr	d0, [x19, #0xd8]
1024a197c:     	str	d0, [x8]
1024a1980:     	ldur	w8, [x29, #-0xc8]
1024a1984:     	str	w8, [x19, #0xd0]
1024a1988:     	tbz	w8, #0x0, 0x1024a19ec
1024a198c:     	mov	w9, #0x1                ; =1
1024a1990:     	and	w10, w8, #0x10
1024a1994:     	stp	w9, w10, [sp, #0xb8]
1024a1998:     	ldur	d1, [x29, #-0xc0]
1024a199c:     	ldr	d0, [x19, #0x110]
1024a19a0:     	fmul	d1, d1, d0
1024a19a4:     	str	d1, [sp, #0xc0]
1024a19a8:     	ldur	w10, [x29, #-0xb8]
1024a19ac:     	cmp	w10, #0x1
1024a19b0:     	b.eq	0x1024a19d8
1024a19b4:     	cbnz	w10, 0x1024a19ec
1024a19b8:     	str	wzr, [sp, #0xc8]
1024a19bc:     	ldr	q1, [x26, #0x40]
1024a19c0:     	str	q1, [x27, #0x50]
1024a19c4:     	tbz	w8, #0x8, 0x1024a19ec
1024a19c8:     	add	x8, x27, #0x60
1024a19cc:     	ldur	d1, [x29, #-0xa0]
1024a19d0:     	fmul	d0, d0, d1
1024a19d4:     	b	0x1024a19e8
1024a19d8:     	add	x8, x27, #0x70
1024a19dc:     	str	w9, [sp, #0xc8]
1024a19e0:     	ldp	d1, d0, [x29, #-0x98]
1024a19e4:     	str	d1, [sp, #0xe8]
1024a19e8:     	str	d0, [x8]
1024a19ec:     	ldr	x0, [x19, #0x48]
1024a19f0:     	add	x8, sp, #0x70
1024a19f4:     	bl	0x1024c1e3c
1024a19f8:     	str	xzr, [x19, #0x70]
1024a19fc:     	str	wzr, [x19, #0xc8]
1024a1a00:     	ldr	x0, [sp, #0x70]
1024a1a04:     	cbz	x0, 0x1024a1b60
1024a1a08:     	ldr	w1, [x19, #0xe0]
1024a1a0c:     	ldr	w2, [x19, #0x100]
1024a1a10:     	add	x3, sp, #0x8
1024a1a14:     	bl	0x1024c3b1c
1024a1a18:     	mov	w8, #0x1                ; =1
1024a1a1c:     	str	w8, [sp, #0x178]
1024a1a20:     	ldr	x0, [sp, #0x70]
1024a1a24:     	bl	0x1024c28b0
1024a1a28:     	str	d0, [x19, #0x70]
1024a1a2c:     	ldr	x0, [sp, #0x70]
1024a1a30:     	bl	0x1024c2a74
1024a1a34:     	str	w0, [sp, #0x17c]
1024a1a38:     	ldr	x0, [sp, #0x70]
1024a1a3c:     	ldr	w8, [x0, #0x80]
1024a1a40:     	and	w8, w8, #0x40000
1024a1a44:     	str	w8, [sp, #0x180]
1024a1a48:     	bl	0x1024c38cc
1024a1a4c:     	str	d0, [sp, #0x188]
1024a1a50:     	ldr	w8, [sp, #0xc]
1024a1a54:     	and	w8, w8, #0x1000
1024a1a58:     	str	w8, [sp, #0x190]
1024a1a5c:     	ldr	x0, [sp, #0x70]
1024a1a60:     	bl	0x1024c29e8
1024a1a64:     	str	w0, [sp, #0x198]
1024a1a68:     	ldr	d0, [sp, #0x28]
1024a1a6c:     	str	d0, [sp, #0x1b0]
1024a1a70:     	str	wzr, [sp, #0x194]
1024a1a74:     	ldr	w8, [x19, #0xcc]
1024a1a78:     	cbnz	w8, 0x1024a1ac0
1024a1a7c:     	ldur	w8, [x29, #-0xe4]
1024a1a80:     	cbz	w8, 0x1024a1ab0
1024a1a84:     	ldur	w8, [x29, #-0xe0]
1024a1a88:     	cmp	w8, #0x2
1024a1a8c:     	b.ne	0x1024a1ac0
1024a1a90:     	ldr	w8, [sp, #0x180]
1024a1a94:     	cbnz	w8, 0x1024a1aa4
1024a1a98:     	ldr	x0, [sp, #0x70]
1024a1a9c:     	bl	0x1024c53c8
1024a1aa0:     	cbz	w0, 0x1024a1ac0
1024a1aa4:     	mov	w8, #0x1                ; =1
1024a1aa8:     	str	w8, [sp, #0x194]
1024a1aac:     	b	0x1024a1ab8
1024a1ab0:     	ldr	w8, [sp, #0x180]
1024a1ab4:     	cbz	w8, 0x1024a1ac0
1024a1ab8:     	ldr	w8, [sp, #0x24]
1024a1abc:     	str	w8, [x19, #0xc8]
1024a1ac0:     	ldr	x0, [sp, #0x70]
1024a1ac4:     	ldrb	w8, [x0, #0x2c8]
1024a1ac8:     	tbz	w8, #0x0, 0x1024a1b60
1024a1acc:     	add	x8, sp, #0x80
1024a1ad0:     	add	x1, x8, #0x138
1024a1ad4:     	bl	0x1024c3c90
1024a1ad8:     	scvtf	d1, w21
1024a1adc:     	scvtf	d0, w25
1024a1ae0:     	ldrb	w8, [sp, #0x1c8]
1024a1ae4:     	tbnz	w8, #0x4, 0x1024a1af8
1024a1ae8:     	mov	w8, #0x1                ; =1
1024a1aec:     	str	w8, [sp, #0x1a0]
1024a1af0:     	mov	w8, #0x110              ; =272
1024a1af4:     	b	0x1024a1b04
1024a1af8:     	mov	w8, #0x1                ; =1
1024a1afc:     	str	w8, [sp, #0x19c]
1024a1b00:     	mov	w8, #0x108              ; =264
1024a1b04:     	ldr	d2, [x19, x8]
1024a1b08:     	ldr	d3, [sp, #0x1d0]
1024a1b0c:     	fmul	d3, d2, d3
1024a1b10:     	str	d3, [sp, #0x1d0]
1024a1b14:     	ldr	q3, [x27, #0x160]
1024a1b18:     	fmul.2d	v3, v3, v2[0]
1024a1b1c:     	str	q3, [x27, #0x160]
1024a1b20:     	fmul	d1, d2, d1
1024a1b24:     	fcmp	d1, #0.0
1024a1b28:     	adrp	x8, 0x1042e3000
1024a1b2c:     	ldr	d3, [x8, #0x690]
1024a1b30:     	adrp	x8, 0x1042fe000
1024a1b34:     	ldr	d4, [x8, #0xd20]
1024a1b38:     	fcsel	d5, d4, d3, mi
1024a1b3c:     	fadd	d1, d1, d5
1024a1b40:     	fcvtzs	w8, d1
1024a1b44:     	str	w8, [sp, #0x1a4]
1024a1b48:     	fmul	d0, d2, d0
1024a1b4c:     	fcmp	d0, #0.0
1024a1b50:     	fcsel	d1, d4, d3, mi
1024a1b54:     	fadd	d0, d0, d1
1024a1b58:     	fcvtzs	w8, d0
1024a1b5c:     	str	w8, [sp, #0x1a8]
1024a1b60:     	ldr	x0, [x19, #0x48]
1024a1b64:     	ldr	w8, [x0, #0x80]
1024a1b68:     	and	w8, w8, #0x400
1024a1b6c:     	str	w8, [sp, #0x200]
1024a1b70:     	ldr	w8, [x19, #0xc0]
1024a1b74:     	cmp	w8, #0x2
1024a1b78:     	b.ne	0x1024a1b9c
1024a1b7c:     	ldr	d0, [x19, #0x68]
1024a1b80:     	ldr	d1, [x19, #0x108]
1024a1b84:     	fmul	d0, d0, d1
1024a1b88:     	bl	0x1024c3a44
1024a1b8c:     	fcvtzs	w8, d0
1024a1b90:     	str	w8, [sp, #0xa0]
1024a1b94:     	ldr	x0, [x19, #0x48]
1024a1b98:     	b	0x1024a1ba0
1024a1b9c:     	str	wzr, [sp, #0xa0]
1024a1ba0:     	bl	0x1024c38e0
1024a1ba4:     	str	w0, [sp, #0xa4]
1024a1ba8:     	str	wzr, [x19, #0x160]
1024a1bac:     	cbz	w20, 0x1024a1be8
1024a1bb0:     	ldr	w8, [x19, #0xd4]
1024a1bb4:     	cbnz	w8, 0x1024a1be8
1024a1bb8:     	ldr	x8, [x19, #0x120]
1024a1bbc:     	cbnz	x8, 0x1024a1be8
1024a1bc0:     	bl	0x10267fba8
1024a1bc4:     	cmp	w0, #0x2
1024a1bc8:     	b.lt	0x1024a1be8
1024a1bcc:     	ldr	x0, [x19, #0x48]
1024a1bd0:     	ldr	d0, [x19, #0x68]
1024a1bd4:     	ldr	w1, [x19, #0x100]
1024a1bd8:     	bl	0x1024c540c
1024a1bdc:     	cbz	w0, 0x1024a1be8
1024a1be0:     	mov	w8, #0x2                ; =2
1024a1be4:     	str	w8, [x19, #0x160]
1024a1be8:     	ldr	x0, [x19, #0x140]
1024a1bec:     	add	x1, sp, #0x80
1024a1bf0:     	mov	w2, #0x1                ; =1
1024a1bf4:     	bl	0x1024a6314
1024a1bf8:     	ldr	x0, [x19, #0x150]
1024a1bfc:     	ldr	w8, [x19, #0x160]
1024a1c00:     	cmp	w8, #0x2
1024a1c04:     	cset	w2, eq
1024a1c08:     	add	x1, sp, #0x80
1024a1c0c:     	bl	0x1024a6314
1024a1c10:     	mov	x0, x19
1024a1c14:     	bl	0x1024a24ac
1024a1c18:     	add	x0, x19, #0x180
1024a1c1c:     	bl	0x1024a066c
1024a1c20:     	add	x0, x19, #0x1e0
1024a1c24:     	bl	0x1024a066c
1024a1c28:     	add	x8, sp, #0x70
1024a1c2c:     	add	x0, x8, #0x8
1024a1c30:     	bl	0x10001022c
1024a1c34:     	add	x19, sp, #0x80
1024a1c38:     	add	x0, x19, #0x140
1024a1c3c:     	bl	0x10001022c
1024a1c40:     	add	x0, x19, #0xa8
1024a1c44:     	bl	0x10001022c
1024a1c48:     	sub	x8, x29, #0x80
1024a1c4c:     	add	x0, x8, #0x8
1024a1c50:     	bl	0x10001022c
1024a1c54:     	add	sp, sp, #0x2a0
1024a1c58:     	ldp	x29, x30, [sp, #0x60]
1024a1c5c:     	ldp	x20, x19, [sp, #0x50]
1024a1c60:     	ldp	x22, x21, [sp, #0x40]
1024a1c64:     	ldp	x24, x23, [sp, #0x30]
1024a1c68:     	ldp	x26, x25, [sp, #0x20]
1024a1c6c:     	ldp	x28, x27, [sp, #0x10]
1024a1c70:     	ldp	d9, d8, [sp], #0x70
1024a1c74:     	ret
1024a1c78:     	b	0x1024a1c84
1024a1c7c:     	b	0x1024a1c8c
1024a1c80:     	b	0x1024a1c84
1024a1c84:     	mov	x19, x0
1024a1c88:     	b	0x1024a1cbc
1024a1c8c:     	mov	x19, x0
1024a1c90:     	b	0x1024a1ca8
1024a1c94:     	b	0x1024a1c98
1024a1c98:     	mov	x19, x0
1024a1c9c:     	add	x8, sp, #0x70
1024a1ca0:     	add	x0, x8, #0x8
1024a1ca4:     	bl	0x10001022c
1024a1ca8:     	add	x20, sp, #0x80
1024a1cac:     	add	x0, x20, #0x140
1024a1cb0:     	bl	0x10001022c
1024a1cb4:     	add	x0, x20, #0xa8
1024a1cb8:     	bl	0x10001022c
1024a1cbc:     	sub	x8, x29, #0x80
1024a1cc0:     	add	x0, x8, #0x8
1024a1cc4:     	bl	0x10001022c
1024a1cc8:     	mov	x0, x19
1024a1ccc:     	bl	0x103bda970

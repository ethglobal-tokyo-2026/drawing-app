1002a6600:     	add	x11, x8, #0x8
1002a6604:     	mov	x12, x9
1002a6608:     	cas	w12, w10, [x11]
1002a660c:     	cmp	w12, w9
1002a6610:     	mov	x9, x12
1002a6614:     	b.ne	0x1002a65f8
1002a6618:     	ldr	x0, [x19, #0x68]
1002a661c:     	str	x0, [sp]
1002a6620:     	cbz	x0, 0x1002a66e8
1002a6624:     	bl	0x1002a8d58
1002a6628:     	b	0x1002a66e8
1002a662c:     	adrp	x0, 0x104d1d000
1002a6630:     	add	x0, x0, #0x5b8
1002a6634:     	bl	0x10214de74
1002a6638:     	cmp	w20, w0
1002a663c:     	b.ne	0x1002a6688
1002a6640:     	mov	x20, sp
1002a6644:     	ldr	x8, [x19, #0x70]
1002a6648:     	stp	xzr, x8, [sp]
1002a664c:     	cbz	x8, 0x1002a66e8
1002a6650:     	ldr	w9, [x8, #0x8]
1002a6654:     	cbz	w9, 0x1002a66e4
1002a6658:     	add	w10, w9, #0x1
1002a665c:     	add	x11, x8, #0x8
1002a6660:     	mov	x12, x9
1002a6664:     	cas	w12, w10, [x11]
1002a6668:     	cmp	w12, w9
1002a666c:     	mov	x9, x12
1002a6670:     	b.ne	0x1002a6654
1002a6674:     	ldr	x0, [x19, #0x68]
1002a6678:     	str	x0, [sp]
1002a667c:     	cbz	x0, 0x1002a66e8
1002a6680:     	bl	0x1002a8fe0
1002a6684:     	b	0x1002a66e8
1002a6688:     	adrp	x0, 0x104d1d000
1002a668c:     	add	x0, x0, #0x5d8
1002a6690:     	bl	0x10214de74
1002a6694:     	cmp	w20, w0
1002a6698:     	b.ne	0x1002a6700
1002a669c:     	mov	x20, sp
1002a66a0:     	ldr	x8, [x19, #0x70]
1002a66a4:     	stp	xzr, x8, [sp]
1002a66a8:     	cbz	x8, 0x1002a66e8
1002a66ac:     	ldr	w9, [x8, #0x8]
1002a66b0:     	cbz	w9, 0x1002a66e4
1002a66b4:     	add	w10, w9, #0x1
1002a66b8:     	add	x11, x8, #0x8
1002a66bc:     	mov	x12, x9
1002a66c0:     	cas	w12, w10, [x11]
1002a66c4:     	cmp	w12, w9
1002a66c8:     	mov	x9, x12
1002a66cc:     	b.ne	0x1002a66b0
1002a66d0:     	ldr	x0, [x19, #0x68]
1002a66d4:     	str	x0, [sp]
1002a66d8:     	cbz	x0, 0x1002a66e8
1002a66dc:     	bl	0x1002a9084
1002a66e0:     	b	0x1002a66e8
1002a66e4:     	str	xzr, [sp, #0x8]
1002a66e8:     	add	x0, x20, #0x8
1002a66ec:     	bl	0x10001022c
1002a66f0:     	ldp	x29, x30, [sp, #0x20]
1002a66f4:     	ldp	x20, x19, [sp, #0x10]
1002a66f8:     	add	sp, sp, #0x30
1002a66fc:     	ret
1002a6700:     	adrp	x0, 0x104d1e000
1002a6704:     	add	x0, x0, #0x4b8
1002a6708:     	bl	0x10214de74
1002a670c:     	cmp	w20, w0
1002a6710:     	b.ne	0x1002a6720
1002a6714:     	mov	x0, x19
1002a6718:     	mov	w1, #0x1                ; =1
1002a671c:     	b	0x1002a673c
1002a6720:     	adrp	x0, 0x104d1e000
1002a6724:     	add	x0, x0, #0x4d8
1002a6728:     	bl	0x10214de74
1002a672c:     	cmp	w20, w0
1002a6730:     	b.ne	0x1002a66f0
1002a6734:     	mov	x0, x19
1002a6738:     	mov	w1, #0x0                ; =0
1002a673c:     	ldp	x29, x30, [sp, #0x20]
1002a6740:     	ldp	x20, x19, [sp, #0x10]
1002a6744:     	add	sp, sp, #0x30
1002a6748:     	b	0x1002a6cf4
1002a674c:     	b	0x1002a6754
1002a6750:     	b	0x1002a6754
1002a6754:     	mov	x19, x0
1002a6758:     	add	x0, x20, #0x8
1002a675c:     	bl	0x10001022c
1002a6760:     	mov	x0, x19
1002a6764:     	bl	0x103bda970

FUNCTION 0x1002a6768 size 232
1002a6768:     	sub	sp, sp, #0x60
1002a676c:     	stp	x22, x21, [sp, #0x30]
1002a6770:     	stp	x20, x19, [sp, #0x40]
1002a6774:     	stp	x29, x30, [sp, #0x50]
1002a6778:     	add	x29, sp, #0x50
1002a677c:     	mov	x19, x1
1002a6780:     	add	x20, sp, #0x20
1002a6784:     	add	x8, sp, #0x20
1002a6788:     	bl	0x102e14500
1002a678c:     	ldr	x0, [sp, #0x20]
1002a6790:     	cbz	x0, 0x1002a67b8
1002a6794:     	stp	xzr, xzr, [sp, #0x10]
1002a6798:     	add	x2, sp, #0x10
1002a679c:     	mov	w1, #0x1914             ; =6420
1002a67a0:     	mov	w3, #0x1                ; =1
1002a67a4:     	mov	x4, x19
1002a67a8:     	bl	0x102e1a378
1002a67ac:     	cbz	w0, 0x1002a67c0
1002a67b0:     	mov	w19, #0x1               ; =1
1002a67b4:     	b	0x1002a67f0
1002a67b8:     	mov	w19, #0x0               ; =0
1002a67bc:     	b	0x1002a67fc
1002a67c0:     	ldr	x0, [sp, #0x20]
1002a67c4:     	stp	xzr, xzr, [sp]
1002a67c8:     	mov	x21, sp
1002a67cc:     	mov	x2, sp
1002a67d0:     	mov	w1, #0x3e8              ; =1000
1002a67d4:     	mov	w3, #0x1                ; =1
1002a67d8:     	mov	x4, x19
1002a67dc:     	bl	0x102e1a378
1002a67e0:     	cmp	w0, #0x0
1002a67e4:     	cset	w19, ne
1002a67e8:     	add	x0, x21, #0x8
1002a67ec:     	bl	0x10001022c
1002a67f0:     	add	x8, sp, #0x10
1002a67f4:     	add	x0, x8, #0x8
1002a67f8:     	bl	0x10001022c
1002a67fc:     	add	x0, x20, #0x8
1002a6800:     	bl	0x10001022c
1002a6804:     	mov	x0, x19
1002a6808:     	ldp	x29, x30, [sp, #0x50]
1002a680c:     	ldp	x20, x19, [sp, #0x40]
1002a6810:     	ldp	x22, x21, [sp, #0x30]
1002a6814:     	add	sp, sp, #0x60
1002a6818:     	ret
1002a681c:     	mov	x19, x0
1002a6820:     	add	x0, x21, #0x8
1002a6824:     	bl	0x10001022c
1002a6828:     	b	0x1002a6830
1002a682c:     	mov	x19, x0
1002a6830:     	add	x8, sp, #0x10
1002a6834:     	add	x0, x8, #0x8
1002a6838:     	bl	0x10001022c
1002a683c:     	add	x8, sp, #0x20
1002a6840:     	add	x0, x8, #0x8
1002a6844:     	bl	0x10001022c
1002a6848:     	mov	x0, x19
1002a684c:     	bl	0x103bda970

FUNCTION 0x1002a6850 size 516
1002a6850:     	sub	sp, sp, #0x80
1002a6854:     	stp	x24, x23, [sp, #0x40]
1002a6858:     	stp	x22, x21, [sp, #0x50]
1002a685c:     	stp	x20, x19, [sp, #0x60]
1002a6860:     	stp	x29, x30, [sp, #0x70]
1002a6864:     	add	x29, sp, #0x70
1002a6868:     	mov	x19, x3
1002a686c:     	mov	x20, x1
1002a6870:     	mov	x21, x0
1002a6874:     	add	x23, sp, #0x30
1002a6878:     	add	x8, sp, #0x30
1002a687c:     	mov	x1, x2
1002a6880:     	bl	0x102e15918
1002a6884:     	ldr	x8, [sp, #0x30]
1002a6888:     	cbz	x8, 0x1002a68f0
1002a688c:     	ldr	x0, [x21, #0x48]
1002a6890:     	add	x8, sp, #0x20
1002a6894:     	bl	0x102e4c94c
1002a6898:     	ldr	x8, [sp, #0x20]
1002a689c:     	cbz	x8, 0x1002a6960
1002a68a0:     	ldr	x9, [x8, #0x10]!
1002a68a4:     	cbz	x9, 0x1002a6960
1002a68a8:     	mov	x22, x8
1002a68ac:     	ldr	w10, [x9, #0x20]
1002a68b0:     	cmp	w10, w20
1002a68b4:     	cset	w10, lt
1002a68b8:     	csel	x22, x22, x9, lt
1002a68bc:     	ldr	x9, [x9, w10, uxtw #3]
1002a68c0:     	cbnz	x9, 0x1002a68ac
1002a68c4:     	cmp	x22, x8
1002a68c8:     	b.eq	0x1002a6960
1002a68cc:     	ldr	w8, [x22, #0x20]
1002a68d0:     	cmp	w8, w20
1002a68d4:     	b.gt	0x1002a6960
1002a68d8:     	ldr	x0, [x22, #0x28]!
1002a68dc:     	cbz	x0, 0x1002a68f8
1002a68e0:     	ldr	x8, [x0]
1002a68e4:     	ldr	x8, [x8, #0x10]
1002a68e8:     	blr	x8
1002a68ec:     	b	0x1002a6900
1002a68f0:     	mov	w19, #0x0               ; =0
1002a68f4:     	b	0x1002a69f4
1002a68f8:     	adrp	x0, 0x1048c8000
1002a68fc:     	ldr	x0, [x0, #0x428]
1002a6900:     	adrp	x1, 0x1048ed000
1002a6904:     	add	x1, x1, #0xe58
1002a6908:     	bl	0x100016d30
1002a690c:     	cbz	w0, 0x1002a6960
1002a6910:     	mov	x0, x22
1002a6914:     	bl	0x1002a05dc
1002a6918:     	ldr	q0, [x0]
1002a691c:     	str	q0, [sp]
1002a6920:     	ldp	x9, x8, [sp, #0x30]
1002a6924:     	stp	x9, x8, [sp, #0x10]
1002a6928:     	cbz	x8, 0x1002a6938
1002a692c:     	add	x8, x8, #0x8
1002a6930:     	mov	w9, #0x1                ; =1
1002a6934:     	ldadd	w9, w8, [x8]
1002a6938:     	add	x22, sp, #0x10
1002a693c:     	add	x2, sp, #0x10
1002a6940:     	mov	x0, x21
1002a6944:     	mov	x1, x20
1002a6948:     	bl	0x102e19cf4
1002a694c:     	mov	x21, x0
1002a6950:     	add	x0, x22, #0x8
1002a6954:     	bl	0x10001022c
1002a6958:     	ldr	q0, [sp]
1002a695c:     	cbnz	w21, 0x1002a69d8
1002a6960:     	ldr	x8, [sp, #0x30]
1002a6964:     	ldr	x9, [x8, #0x10]!
1002a6968:     	cbz	x9, 0x1002a69e4
1002a696c:     	mov	x21, x8
1002a6970:     	ldr	w10, [x9, #0x20]
1002a6974:     	cmp	w10, w20
1002a6978:     	cset	w10, lt
1002a697c:     	csel	x21, x21, x9, lt
1002a6980:     	ldr	x9, [x9, w10, uxtw #3]
1002a6984:     	cbnz	x9, 0x1002a6970
1002a6988:     	cmp	x21, x8
1002a698c:     	b.eq	0x1002a69e4
1002a6990:     	ldr	w8, [x21, #0x20]
1002a6994:     	cmp	w8, w20
1002a6998:     	b.gt	0x1002a69e4
1002a699c:     	ldr	x0, [x21, #0x28]!
1002a69a0:     	cbz	x0, 0x1002a69b4
1002a69a4:     	ldr	x8, [x0]
1002a69a8:     	ldr	x8, [x8, #0x10]
1002a69ac:     	blr	x8
1002a69b0:     	b	0x1002a69bc
1002a69b4:     	adrp	x0, 0x1048c8000
1002a69b8:     	ldr	x0, [x0, #0x428]
1002a69bc:     	adrp	x1, 0x1048ed000
1002a69c0:     	add	x1, x1, #0xe58
1002a69c4:     	bl	0x100016d30
1002a69c8:     	cbz	w0, 0x1002a69e4
1002a69cc:     	mov	x0, x21
1002a69d0:     	bl	0x1002a05dc
1002a69d4:     	ldr	q0, [x0]
1002a69d8:     	str	q0, [x19]
1002a69dc:     	mov	w19, #0x1               ; =1
1002a69e0:     	b	0x1002a69e8
1002a69e4:     	mov	w19, #0x0               ; =0
1002a69e8:     	add	x8, sp, #0x20
1002a69ec:     	add	x0, x8, #0x8
1002a69f0:     	bl	0x10001022c
1002a69f4:     	add	x0, x23, #0x8
1002a69f8:     	bl	0x10001022c
1002a69fc:     	mov	x0, x19
1002a6a00:     	ldp	x29, x30, [sp, #0x70]
1002a6a04:     	ldp	x20, x19, [sp, #0x60]
1002a6a08:     	ldp	x22, x21, [sp, #0x50]
1002a6a0c:     	ldp	x24, x23, [sp, #0x40]
1002a6a10:     	add	sp, sp, #0x80
1002a6a14:     	ret
1002a6a18:     	mov	x19, x0
1002a6a1c:     	add	x0, x22, #0x8
1002a6a20:     	bl	0x10001022c
1002a6a24:     	b	0x1002a6a2c
1002a6a28:     	mov	x19, x0
1002a6a2c:     	add	x8, sp, #0x20
1002a6a30:     	add	x0, x8, #0x8
1002a6a34:     	bl	0x10001022c
1002a6a38:     	b	0x1002a6a40
1002a6a3c:     	mov	x19, x0
1002a6a40:     	add	x8, sp, #0x30
1002a6a44:     	add	x0, x8, #0x8
1002a6a48:     	bl	0x10001022c
1002a6a4c:     	mov	x0, x19
1002a6a50:     	bl	0x103bda970

FUNCTION 0x1002a6a54 size 516
1002a6a54:     	sub	sp, sp, #0xb0
1002a6a58:     	stp	x26, x25, [sp, #0x60]
1002a6a5c:     	stp	x24, x23, [sp, #0x70]
1002a6a60:     	stp	x22, x21, [sp, #0x80]
1002a6a64:     	stp	x20, x19, [sp, #0x90]
1002a6a68:     	stp	x29, x30, [sp, #0xa0]
1002a6a6c:     	add	x29, sp, #0xa0
1002a6a70:     	mov	x21, x3
1002a6a74:     	mov	x19, x1
1002a6a78:     	mov	x20, x0
1002a6a7c:     	add	x24, sp, #0x30
1002a6a80:     	add	x8, sp, #0x30
1002a6a84:     	mov	x1, x2
1002a6a88:     	bl	0x102e15918
1002a6a8c:     	ldr	x9, [sp, #0x30]
1002a6a90:     	cbz	x9, 0x1002a6bfc
1002a6a94:     	ldr	x8, [sp, #0x38]
1002a6a98:     	stp	x9, x8, [sp, #0x20]
1002a6a9c:     	cbz	x8, 0x1002a6aac
1002a6aa0:     	add	x8, x8, #0x8
1002a6aa4:     	mov	w9, #0x1                ; =1
1002a6aa8:     	ldadd	w9, w8, [x8]
1002a6aac:     	add	x23, sp, #0x20
1002a6ab0:     	add	x2, sp, #0x20
1002a6ab4:     	mov	x0, x20
1002a6ab8:     	mov	x1, x19
1002a6abc:     	bl	0x102e1a1f8
1002a6ac0:     	mov	x22, x0
1002a6ac4:     	add	x0, x23, #0x8
1002a6ac8:     	bl	0x10001022c
1002a6acc:     	cbz	w22, 0x1002a6b0c
1002a6ad0:     	ldr	x0, [x20, #0x48]
1002a6ad4:     	add	x22, sp, #0x10
1002a6ad8:     	add	x8, sp, #0x10
1002a6adc:     	bl	0x102e4c94c
1002a6ae0:     	add	x8, sp, #0x40
1002a6ae4:     	ldr	q0, [sp, #0x10]
1002a6ae8:     	stp	xzr, xzr, [sp, #0x10]
1002a6aec:     	ldr	q1, [sp, #0x30]
1002a6af0:     	stp	q0, q1, [sp, #0x30]
1002a6af4:     	orr	x0, x8, #0x8
1002a6af8:     	bl	0x10001022c
1002a6afc:     	orr	x0, x22, #0x8
1002a6b00:     	bl	0x10001022c
1002a6b04:     	mov	w25, #0x0               ; =0
1002a6b08:     	b	0x1002a6b34
1002a6b0c:     	ldr	x0, [x20, #0x48]
1002a6b10:     	add	x22, sp, #0x40
1002a6b14:     	add	x8, sp, #0x40
1002a6b18:     	bl	0x102e4c968
1002a6b1c:     	ldr	x8, [sp, #0x40]
1002a6b20:     	ldr	x9, [sp, #0x30]
1002a6b24:     	cmp	x8, x9
1002a6b28:     	cset	w25, ne
1002a6b2c:     	add	x0, x22, #0x8
1002a6b30:     	bl	0x10001022c
1002a6b34:     	ldr	x0, [sp, #0x30]
1002a6b38:     	ldp	x2, x3, [x21]
1002a6b3c:     	mov	x1, x19
1002a6b40:     	bl	0x102e4936c
1002a6b44:     	ldr	x22, [sp, #0x30]
1002a6b48:     	str	w19, [sp, #0x10]
1002a6b4c:     	add	x8, sp, #0x10
1002a6b50:     	str	x8, [sp, #0x40]
1002a6b54:     	adrp	x2, 0x1042ee000
1002a6b58:     	add	x2, x2, #0x8bc
1002a6b5c:     	add	x0, x22, #0x8
1002a6b60:     	add	x1, sp, #0x10
1002a6b64:     	add	x3, sp, #0x40
1002a6b68:     	sub	x4, x29, #0x41
1002a6b6c:     	bl	0x1002a01bc
1002a6b70:     	mov	x23, x0
1002a6b74:     	mov	w0, #0x18               ; =24
1002a6b78:     	bl	0x103bdd37c
1002a6b7c:     	adrp	x8, 0x1048ed000
1002a6b80:     	add	x8, x8, #0xe10
1002a6b84:     	add	x8, x8, #0x10
1002a6b88:     	str	x8, [x0]
1002a6b8c:     	ldr	q0, [x21]
1002a6b90:     	stur	q0, [x0, #0x8]
1002a6b94:     	ldr	x8, [x23, #0x28]
1002a6b98:     	str	x0, [x23, #0x28]
1002a6b9c:     	cbz	x8, 0x1002a6bb0
1002a6ba0:     	ldr	x9, [x8]
1002a6ba4:     	ldr	x9, [x9, #0x8]
1002a6ba8:     	mov	x0, x8
1002a6bac:     	blr	x9
1002a6bb0:     	mov	x0, x22
1002a6bb4:     	bl	0x102e47f38
1002a6bb8:     	tbnz	w25, #0x0, 0x1002a6bc8
1002a6bbc:     	mov	x0, x20
1002a6bc0:     	mov	x1, x19
1002a6bc4:     	bl	0x102e26d44
1002a6bc8:     	ldp	x9, x8, [sp, #0x30]
1002a6bcc:     	stp	x9, x8, [sp]
1002a6bd0:     	cbz	x8, 0x1002a6be0
1002a6bd4:     	add	x8, x8, #0x8
1002a6bd8:     	mov	w9, #0x1                ; =1
1002a6bdc:     	ldadd	w9, w8, [x8]
1002a6be0:     	mov	x21, sp
1002a6be4:     	mov	x2, sp
1002a6be8:     	mov	x0, x20
1002a6bec:     	mov	x1, x19
1002a6bf0:     	bl	0x102e1a2c4
1002a6bf4:     	add	x0, x21, #0x8
1002a6bf8:     	bl	0x10001022c
1002a6bfc:     	orr	x0, x24, #0x8
1002a6c00:     	bl	0x10001022c
1002a6c04:     	ldp	x29, x30, [sp, #0xa0]
1002a6c08:     	ldp	x20, x19, [sp, #0x90]
1002a6c0c:     	ldp	x22, x21, [sp, #0x80]
1002a6c10:     	ldp	x24, x23, [sp, #0x70]
1002a6c14:     	ldp	x26, x25, [sp, #0x60]
1002a6c18:     	add	sp, sp, #0xb0
1002a6c1c:     	ret
1002a6c20:     	b	0x1002a6c44
1002a6c24:     	b	0x1002a6c44
1002a6c28:     	mov	x19, x0
1002a6c2c:     	add	x0, x21, #0x8
1002a6c30:     	b	0x1002a6c3c
1002a6c34:     	mov	x19, x0
1002a6c38:     	add	x0, x23, #0x8
1002a6c3c:     	bl	0x10001022c
1002a6c40:     	b	0x1002a6c48
1002a6c44:     	mov	x19, x0
1002a6c48:     	orr	x0, x24, #0x8
1002a6c4c:     	bl	0x10001022c
1002a6c50:     	mov	x0, x19
1002a6c54:     	bl	0x103bda970

FUNCTION 0x1002a6c58 size 156
1002a6c58:     	sub	sp, sp, #0x50
1002a6c5c:     	stp	x22, x21, [sp, #0x20]
1002a6c60:     	stp	x20, x19, [sp, #0x30]
1002a6c64:     	stp	x29, x30, [sp, #0x40]
1002a6c68:     	add	x29, sp, #0x40
1002a6c6c:     	ldr	w8, [x0, #0x108]
1002a6c70:     	cmp	w8, w1
1002a6c74:     	b.eq	0x1002a6cc4
1002a6c78:     	mov	x19, x1
1002a6c7c:     	str	w1, [x0, #0x108]
1002a6c80:     	add	x20, sp, #0x10
1002a6c84:     	add	x8, sp, #0x10
1002a6c88:     	bl	0x1020b6284
1002a6c8c:     	ldp	x9, x8, [sp, #0x10]
1002a6c90:     	stp	x9, x8, [sp]
1002a6c94:     	cbz	x8, 0x1002a6ca4
1002a6c98:     	add	x8, x8, #0x8
1002a6c9c:     	mov	w9, #0x1                ; =1
1002a6ca0:     	ldadd	w9, w8, [x8]
1002a6ca4:     	mov	x21, sp
1002a6ca8:     	mov	x0, sp
1002a6cac:     	mov	x1, x19
1002a6cb0:     	bl	0x1002aa1d0
1002a6cb4:     	add	x0, x21, #0x8
1002a6cb8:     	bl	0x10001022c
1002a6cbc:     	add	x0, x20, #0x8
1002a6cc0:     	bl	0x10001022c
1002a6cc4:     	ldp	x29, x30, [sp, #0x40]
1002a6cc8:     	ldp	x20, x19, [sp, #0x30]
1002a6ccc:     	ldp	x22, x21, [sp, #0x20]
1002a6cd0:     	add	sp, sp, #0x50
1002a6cd4:     	ret
1002a6cd8:     	mov	x19, x0
1002a6cdc:     	add	x0, x21, #0x8
1002a6ce0:     	bl	0x10001022c
1002a6ce4:     	add	x0, x20, #0x8
1002a6ce8:     	bl	0x10001022c
1002a6cec:     	mov	x0, x19
1002a6cf0:     	bl	0x103bda970

FUNCTION 0x1002a6cf4 size 732
1002a6cf4:     	sub	sp, sp, #0xe0
1002a6cf8:     	stp	d9, d8, [sp, #0x80]
1002a6cfc:     	stp	x26, x25, [sp, #0x90]
1002a6d00:     	stp	x24, x23, [sp, #0xa0]
1002a6d04:     	stp	x22, x21, [sp, #0xb0]
1002a6d08:     	stp	x20, x19, [sp, #0xc0]
1002a6d0c:     	stp	x29, x30, [sp, #0xd0]
1002a6d10:     	add	x29, sp, #0xd0
1002a6d14:     	mov	x19, x1
1002a6d18:     	mov	x20, x0
1002a6d1c:     	sub	x25, x29, #0x60
1002a6d20:     	sub	x8, x29, #0x60
1002a6d24:     	bl	0x102e14500
1002a6d28:     	add	x24, sp, #0x60
1002a6d2c:     	ldr	x8, [x20, #0x70]
1002a6d30:     	stp	xzr, x8, [sp, #0x60]
1002a6d34:     	cbz	x8, 0x1002a6f40
1002a6d38:     	ldr	w9, [x8, #0x8]
1002a6d3c:     	cbz	w9, 0x1002a6dcc
1002a6d40:     	add	w10, w9, #0x1
1002a6d44:     	add	x11, x8, #0x8
1002a6d48:     	mov	x12, x9
1002a6d4c:     	cas	w12, w10, [x11]
1002a6d50:     	cmp	w12, w9
1002a6d54:     	mov	x9, x12
1002a6d58:     	b.ne	0x1002a6d3c
1002a6d5c:     	ldr	x8, [x20, #0x68]
1002a6d60:     	str	x8, [sp, #0x60]
1002a6d64:     	cbz	x8, 0x1002a6f40
1002a6d68:     	ldur	x0, [x29, #-0x60]
1002a6d6c:     	cbz	x0, 0x1002a6f40
1002a6d70:     	add	x26, sp, #0x50
1002a6d74:     	add	x8, sp, #0x50
1002a6d78:     	mov	w1, #0x1                ; =1
1002a6d7c:     	bl	0x102e15918
1002a6d80:     	stp	xzr, xzr, [sp, #0x40]
1002a6d84:     	ldur	x0, [x29, #-0x60]
1002a6d88:     	ldp	x9, x8, [sp, #0x50]
1002a6d8c:     	stp	x9, x8, [sp, #0x30]
1002a6d90:     	cbz	x8, 0x1002a6da0
1002a6d94:     	add	x8, x8, #0x8
1002a6d98:     	mov	w9, #0x1                ; =1
1002a6d9c:     	ldadd	w9, w8, [x8]
1002a6da0:     	add	x20, sp, #0x30
1002a6da4:     	add	x2, sp, #0x30
1002a6da8:     	add	x3, sp, #0x40
1002a6dac:     	mov	w1, #0x1914             ; =6420
1002a6db0:     	bl	0x1002a6fd0
1002a6db4:     	mov	x21, x0
1002a6db8:     	add	x0, x20, #0x8
1002a6dbc:     	bl	0x10001022c
1002a6dc0:     	cbz	w21, 0x1002a6dd4
1002a6dc4:     	mov	w20, #0x1914            ; =6420
1002a6dc8:     	b	0x1002a6e18
1002a6dcc:     	str	xzr, [sp, #0x68]
1002a6dd0:     	b	0x1002a6f40
1002a6dd4:     	ldur	x0, [x29, #-0x60]
1002a6dd8:     	ldp	x9, x8, [sp, #0x50]
1002a6ddc:     	stp	x9, x8, [sp, #0x20]
1002a6de0:     	cbz	x8, 0x1002a6df0
1002a6de4:     	add	x8, x8, #0x8
1002a6de8:     	mov	w9, #0x1                ; =1
1002a6dec:     	ldadd	w9, w8, [x8]
1002a6df0:     	add	x22, sp, #0x20
1002a6df4:     	add	x2, sp, #0x20
1002a6df8:     	add	x3, sp, #0x40
1002a6dfc:     	mov	w1, #0x3e8              ; =1000
1002a6e00:     	bl	0x1002a6fd0
1002a6e04:     	mov	x20, x0
1002a6e08:     	add	x0, x22, #0x8
1002a6e0c:     	bl	0x10001022c
1002a6e10:     	cbz	w20, 0x1002a6f38
1002a6e14:     	mov	w20, #0x3e8             ; =1000
1002a6e18:     	ldp	x0, x1, [sp, #0x40]
1002a6e1c:     	bl	0x10339dc98
1002a6e20:     	mov	x22, x1
1002a6e24:     	stp	x0, x1, [sp, #0x40]
1002a6e28:     	cmp	w22, #0x2
1002a6e2c:     	mov	x8, #0x4059000000000000 ; =4636737291354636288
1002a6e30:     	fmov	d0, x8
1002a6e34:     	fmov	d1, #10.00000000
1002a6e38:     	fcsel	d8, d0, d1, eq
1002a6e3c:     	fmov	d0, x0
1002a6e40:     	fmul	d0, d8, d0
1002a6e44:     	fcmp	d0, #0.0
1002a6e48:     	cset	w8, mi
1002a6e4c:     	adrp	x9, 0x1042e4000
1002a6e50:     	add	x9, x9, #0x7a0
1002a6e54:     	ldr	d1, [x9, w8, uxtw #3]
1002a6e58:     	fadd	d0, d0, d1
1002a6e5c:     	fcvtzs	w23, d0
1002a6e60:     	ldr	x0, [sp, #0x60]
1002a6e64:     	mov	x1, x23
1002a6e68:     	mov	x2, x19
1002a6e6c:     	mov	x3, x22
1002a6e70:     	bl	0x1002a891c
1002a6e74:     	cmp	w0, w23
1002a6e78:     	b.eq	0x1002a6f38
1002a6e7c:     	scvtf	d0, w0
1002a6e80:     	fdiv	d0, d0, d8
1002a6e84:     	str	d0, [sp, #0x40]
1002a6e88:     	str	w22, [sp, #0x48]
1002a6e8c:     	ldur	x0, [x29, #-0x60]
1002a6e90:     	add	x19, sp, #0x10
1002a6e94:     	add	x8, sp, #0x10
1002a6e98:     	mov	w1, #0x0                ; =0
1002a6e9c:     	bl	0x102e15918
1002a6ea0:     	ldr	x22, [sp, #0x10]
1002a6ea4:     	ldr	x23, [sp, #0x50]
1002a6ea8:     	add	x0, x19, #0x8
1002a6eac:     	bl	0x10001022c
1002a6eb0:     	cmp	x22, x23
1002a6eb4:     	b.eq	0x1002a6ed8
1002a6eb8:     	cbz	w21, 0x1002a6f00
1002a6ebc:     	ldr	w8, [sp, #0x48]
1002a6ec0:     	cbz	w8, 0x1002a6ee8
1002a6ec4:     	cmp	w8, #0x2
1002a6ec8:     	b.ne	0x1002a6f00
1002a6ecc:     	ldr	d1, [sp, #0x40]
1002a6ed0:     	fmov	d0, #10.00000000
1002a6ed4:     	b	0x1002a6ef4
1002a6ed8:     	ldr	x0, [sp, #0x60]
1002a6edc:     	ldp	x1, x2, [sp, #0x40]
1002a6ee0:     	bl	0x1002a84cc
1002a6ee4:     	b	0x1002a6f38
1002a6ee8:     	ldr	d1, [sp, #0x40]
1002a6eec:     	mov	x8, #0x4069000000000000 ; =4641240890982006784
1002a6ef0:     	fmov	d0, x8
1002a6ef4:     	fcmp	d1, d0
1002a6ef8:     	b.le	0x1002a6f00
1002a6efc:     	str	d0, [sp, #0x40]
1002a6f00:     	ldur	x0, [x29, #-0x60]
1002a6f04:     	ldp	x9, x8, [sp, #0x50]
1002a6f08:     	stp	x9, x8, [sp]
1002a6f0c:     	cbz	x8, 0x1002a6f1c
1002a6f10:     	add	x8, x8, #0x8
1002a6f14:     	mov	w9, #0x1                ; =1
1002a6f18:     	ldadd	w9, w8, [x8]
1002a6f1c:     	mov	x21, sp
1002a6f20:     	mov	x2, sp
1002a6f24:     	add	x3, sp, #0x40
1002a6f28:     	mov	x1, x20
1002a6f2c:     	bl	0x1002a71ac
1002a6f30:     	add	x0, x21, #0x8
1002a6f34:     	bl	0x10001022c
1002a6f38:     	add	x0, x26, #0x8
1002a6f3c:     	bl	0x10001022c
1002a6f40:     	add	x0, x24, #0x8
1002a6f44:     	bl	0x10001022c
1002a6f48:     	add	x0, x25, #0x8
1002a6f4c:     	bl	0x10001022c
1002a6f50:     	ldp	x29, x30, [sp, #0xd0]
1002a6f54:     	ldp	x20, x19, [sp, #0xc0]
1002a6f58:     	ldp	x22, x21, [sp, #0xb0]
1002a6f5c:     	ldp	x24, x23, [sp, #0xa0]
1002a6f60:     	ldp	x26, x25, [sp, #0x90]
1002a6f64:     	ldp	d9, d8, [sp, #0x80]
1002a6f68:     	add	sp, sp, #0xe0
1002a6f6c:     	ret
1002a6f70:     	mov	x19, x0
1002a6f74:     	add	x0, x21, #0x8
1002a6f78:     	b	0x1002a6f98
1002a6f7c:     	mov	x19, x0
1002a6f80:     	add	x0, x22, #0x8
1002a6f84:     	b	0x1002a6f98
1002a6f88:     	b	0x1002a6fa8
1002a6f8c:     	b	0x1002a6fa8
1002a6f90:     	mov	x19, x0
1002a6f94:     	add	x0, x20, #0x8
1002a6f98:     	bl	0x10001022c
1002a6f9c:     	b	0x1002a6fac
1002a6fa0:     	mov	x19, x0
1002a6fa4:     	b	0x1002a6fb4
1002a6fa8:     	mov	x19, x0
1002a6fac:     	add	x0, x26, #0x8
1002a6fb0:     	bl	0x10001022c
1002a6fb4:     	add	x0, x24, #0x8
1002a6fb8:     	bl	0x10001022c
1002a6fbc:     	sub	x8, x29, #0x60
1002a6fc0:     	add	x0, x8, #0x8
1002a6fc4:     	bl	0x10001022c
1002a6fc8:     	mov	x0, x19
1002a6fcc:     	bl	0x103bda970

FUNCTION 0x1002a6fd0 size 476
1002a6fd0:     	sub	sp, sp, #0x70
1002a6fd4:     	stp	x24, x23, [sp, #0x30]
1002a6fd8:     	stp	x22, x21, [sp, #0x40]
1002a6fdc:     	stp	x20, x19, [sp, #0x50]
1002a6fe0:     	stp	x29, x30, [sp, #0x60]
1002a6fe4:     	add	x29, sp, #0x60
1002a6fe8:     	ldr	x8, [x2]
1002a6fec:     	cbz	x8, 0x1002a7064
1002a6ff0:     	mov	x19, x3
1002a6ff4:     	mov	x21, x2
1002a6ff8:     	mov	x20, x1
1002a6ffc:     	mov	x22, x0
1002a7000:     	ldr	x0, [x0, #0x48]
1002a7004:     	add	x8, sp, #0x20
1002a7008:     	bl	0x102e4c94c
1002a700c:     	ldr	x8, [sp, #0x20]
1002a7010:     	cbz	x8, 0x1002a70d4
1002a7014:     	ldr	x9, [x8, #0x10]!
1002a7018:     	cbz	x9, 0x1002a70d4
1002a701c:     	mov	x23, x8
1002a7020:     	ldr	w10, [x9, #0x20]
1002a7024:     	cmp	w10, w20
1002a7028:     	cset	w10, lt
1002a702c:     	csel	x23, x23, x9, lt
1002a7030:     	ldr	x9, [x9, w10, uxtw #3]
1002a7034:     	cbnz	x9, 0x1002a7020
1002a7038:     	cmp	x23, x8
1002a703c:     	b.eq	0x1002a70d4
1002a7040:     	ldr	w8, [x23, #0x20]
1002a7044:     	cmp	w8, w20
1002a7048:     	b.gt	0x1002a70d4
1002a704c:     	ldr	x0, [x23, #0x28]!
1002a7050:     	cbz	x0, 0x1002a706c
1002a7054:     	ldr	x8, [x0]
1002a7058:     	ldr	x8, [x8, #0x10]
1002a705c:     	blr	x8
1002a7060:     	b	0x1002a7074
1002a7064:     	mov	w19, #0x0               ; =0
1002a7068:     	b	0x1002a7168
1002a706c:     	adrp	x0, 0x1048c8000
1002a7070:     	ldr	x0, [x0, #0x428]
1002a7074:     	adrp	x1, 0x1048ed000
1002a7078:     	add	x1, x1, #0xe58
1002a707c:     	bl	0x100016d30
1002a7080:     	cbz	w0, 0x1002a70d4
1002a7084:     	mov	x0, x23
1002a7088:     	bl	0x1002a05dc
1002a708c:     	ldr	q0, [x0]
1002a7090:     	str	q0, [sp]
1002a7094:     	ldp	x9, x8, [x21]
1002a7098:     	stp	x9, x8, [sp, #0x10]
1002a709c:     	cbz	x8, 0x1002a70ac
1002a70a0:     	add	x8, x8, #0x8
1002a70a4:     	mov	w9, #0x1                ; =1
1002a70a8:     	ldadd	w9, w8, [x8]
1002a70ac:     	add	x23, sp, #0x10
1002a70b0:     	add	x2, sp, #0x10
1002a70b4:     	mov	x0, x22
1002a70b8:     	mov	x1, x20
1002a70bc:     	bl	0x102e19cf4
1002a70c0:     	mov	x22, x0
1002a70c4:     	add	x0, x23, #0x8
1002a70c8:     	bl	0x10001022c
1002a70cc:     	ldr	q0, [sp]
1002a70d0:     	cbnz	w22, 0x1002a714c
1002a70d4:     	ldr	x8, [x21]
1002a70d8:     	ldr	x9, [x8, #0x10]!
1002a70dc:     	cbz	x9, 0x1002a7158
1002a70e0:     	mov	x21, x8
1002a70e4:     	ldr	w10, [x9, #0x20]
1002a70e8:     	cmp	w10, w20
1002a70ec:     	cset	w10, lt
1002a70f0:     	csel	x21, x21, x9, lt
1002a70f4:     	ldr	x9, [x9, w10, uxtw #3]
1002a70f8:     	cbnz	x9, 0x1002a70e4
1002a70fc:     	cmp	x21, x8
1002a7100:     	b.eq	0x1002a7158
1002a7104:     	ldr	w8, [x21, #0x20]
1002a7108:     	cmp	w8, w20
1002a710c:     	b.gt	0x1002a7158
1002a7110:     	ldr	x0, [x21, #0x28]!
1002a7114:     	cbz	x0, 0x1002a7128
1002a7118:     	ldr	x8, [x0]
1002a711c:     	ldr	x8, [x8, #0x10]
1002a7120:     	blr	x8
1002a7124:     	b	0x1002a7130
1002a7128:     	adrp	x0, 0x1048c8000
1002a712c:     	ldr	x0, [x0, #0x428]
1002a7130:     	adrp	x1, 0x1048ed000
1002a7134:     	add	x1, x1, #0xe58
1002a7138:     	bl	0x100016d30
1002a713c:     	cbz	w0, 0x1002a7158
1002a7140:     	mov	x0, x21
1002a7144:     	bl	0x1002a05dc
1002a7148:     	ldr	q0, [x0]
1002a714c:     	str	q0, [x19]
1002a7150:     	mov	w19, #0x1               ; =1
1002a7154:     	b	0x1002a715c
1002a7158:     	mov	w19, #0x0               ; =0
1002a715c:     	add	x8, sp, #0x20
1002a7160:     	add	x0, x8, #0x8
1002a7164:     	bl	0x10001022c
1002a7168:     	mov	x0, x19
1002a716c:     	ldp	x29, x30, [sp, #0x60]
1002a7170:     	ldp	x20, x19, [sp, #0x50]
1002a7174:     	ldp	x22, x21, [sp, #0x40]
1002a7178:     	ldp	x24, x23, [sp, #0x30]
1002a717c:     	add	sp, sp, #0x70
1002a7180:     	ret
1002a7184:     	mov	x19, x0
1002a7188:     	add	x0, x23, #0x8
1002a718c:     	bl	0x10001022c
1002a7190:     	b	0x1002a7198
1002a7194:     	mov	x19, x0
1002a7198:     	add	x8, sp, #0x20
1002a719c:     	add	x0, x8, #0x8
1002a71a0:     	bl	0x10001022c
1002a71a4:     	mov	x0, x19
1002a71a8:     	bl	0x103bda970

FUNCTION 0x1002a71ac size 596
1002a71ac:     	sub	sp, sp, #0xa0
1002a71b0:     	stp	x26, x25, [sp, #0x50]
1002a71b4:     	stp	x24, x23, [sp, #0x60]
1002a71b8:     	stp	x22, x21, [sp, #0x70]
1002a71bc:     	stp	x20, x19, [sp, #0x80]
1002a71c0:     	stp	x29, x30, [sp, #0x90]
1002a71c4:     	add	x29, sp, #0x90
1002a71c8:     	ldr	x8, [x2]
1002a71cc:     	cbz	x8, 0x1002a73cc
1002a71d0:     	mov	x22, x3
1002a71d4:     	mov	x21, x2
1002a71d8:     	mov	x19, x1
1002a71dc:     	mov	x20, x0
1002a71e0:     	add	x10, sp, #0x20
1002a71e4:     	ldr	x9, [x2, #0x8]
1002a71e8:     	add	x23, x10, #0x8
1002a71ec:     	stp	x8, x9, [sp, #0x20]
1002a71f0:     	cbz	x9, 0x1002a7200
1002a71f4:     	add	x8, x9, #0x8 STRING 'FvRKNS2_8PWStringEEEE'
1002a71f8:     	mov	w9, #0x1                ; =1
1002a71fc:     	ldadd	w9, w8, [x8]
1002a7200:     	add	x2, sp, #0x20
1002a7204:     	mov	x0, x20
1002a7208:     	mov	x1, x19
1002a720c:     	bl	0x102e1a1f8
1002a7210:     	mov	x24, x0
1002a7214:     	mov	x0, x23
1002a7218:     	bl	0x10001022c
1002a721c:     	cbz	w24, 0x1002a72e8
1002a7220:     	ldr	x0, [x20, #0x48]
1002a7224:     	add	x24, sp, #0x10
1002a7228:     	add	x8, sp, #0x10
1002a722c:     	bl	0x102e4c94c
1002a7230:     	add	x8, sp, #0x30
1002a7234:     	ldr	q0, [sp, #0x10]
1002a7238:     	stp	xzr, xzr, [sp, #0x10]
1002a723c:     	ldr	q1, [x21]
1002a7240:     	str	q0, [x21]
1002a7244:     	str	q1, [sp, #0x30]
1002a7248:     	orr	x0, x8, #0x8
1002a724c:     	bl	0x10001022c
1002a7250:     	orr	x0, x24, #0x8
1002a7254:     	bl	0x10001022c
1002a7258:     	ldr	x0, [x21]
1002a725c:     	ldp	x2, x3, [x22]
1002a7260:     	mov	x1, x19
1002a7264:     	bl	0x102e4936c
1002a7268:     	ldr	x23, [x21]
1002a726c:     	str	w19, [sp, #0x10]
1002a7270:     	str	x24, [sp, #0x30]
1002a7274:     	adrp	x2, 0x1042ee000
1002a7278:     	add	x2, x2, #0x8bc
1002a727c:     	add	x0, x23, #0x8
1002a7280:     	add	x1, sp, #0x10
1002a7284:     	add	x3, sp, #0x30
1002a7288:     	sub	x4, x29, #0x41
1002a728c:     	bl	0x1002a01bc
1002a7290:     	mov	x24, x0
1002a7294:     	mov	w0, #0x18               ; =24
1002a7298:     	bl	0x103bdd37c
1002a729c:     	mov	x8, x0
1002a72a0:     	adrp	x9, 0x1048ed000
1002a72a4:     	add	x9, x9, #0xe10
1002a72a8:     	add	x9, x9, #0x10
1002a72ac:     	str	x9, [x0]
1002a72b0:     	ldr	q0, [x22]
1002a72b4:     	stur	q0, [x0, #0x8]
1002a72b8:     	ldr	x0, [x24, #0x28]
1002a72bc:     	str	x8, [x24, #0x28]
1002a72c0:     	cbz	x0, 0x1002a72d0
1002a72c4:     	ldr	x8, [x0]
1002a72c8:     	ldr	x8, [x8, #0x8]
1002a72cc:     	blr	x8
1002a72d0:     	mov	x0, x23
1002a72d4:     	bl	0x102e47f38
1002a72d8:     	mov	x0, x20
1002a72dc:     	mov	x1, x19
1002a72e0:     	bl	0x102e26d44
1002a72e4:     	b	0x1002a7394
1002a72e8:     	ldr	x0, [x20, #0x48]
1002a72ec:     	add	x23, sp, #0x30
1002a72f0:     	add	x8, sp, #0x30
1002a72f4:     	bl	0x102e4c968
1002a72f8:     	ldr	x25, [sp, #0x30]
1002a72fc:     	ldr	x26, [x21]
1002a7300:     	add	x0, x23, #0x8
1002a7304:     	bl	0x10001022c
1002a7308:     	ldr	x0, [x21]
1002a730c:     	ldp	x2, x3, [x22]
1002a7310:     	mov	x1, x19
1002a7314:     	bl	0x102e4936c
1002a7318:     	ldr	x23, [x21]
1002a731c:     	str	w19, [sp, #0x10]
1002a7320:     	add	x8, sp, #0x10
1002a7324:     	str	x8, [sp, #0x30]
1002a7328:     	adrp	x2, 0x1042ee000
1002a732c:     	add	x2, x2, #0x8bc
1002a7330:     	add	x0, x23, #0x8
1002a7334:     	add	x1, sp, #0x10
1002a7338:     	add	x3, sp, #0x30
1002a733c:     	sub	x4, x29, #0x41
1002a7340:     	bl	0x1002a01bc
1002a7344:     	mov	x24, x0
1002a7348:     	mov	w0, #0x18               ; =24
1002a734c:     	bl	0x103bdd37c
1002a7350:     	mov	x8, x0
1002a7354:     	adrp	x9, 0x1048ed000
1002a7358:     	add	x9, x9, #0xe10
1002a735c:     	add	x9, x9, #0x10
1002a7360:     	str	x9, [x0]
1002a7364:     	ldr	q0, [x22]
1002a7368:     	stur	q0, [x0, #0x8]
1002a736c:     	ldr	x0, [x24, #0x28]
1002a7370:     	str	x8, [x24, #0x28]
1002a7374:     	cbz	x0, 0x1002a7384
1002a7378:     	ldr	x8, [x0]
1002a737c:     	ldr	x8, [x8, #0x8]
1002a7380:     	blr	x8
1002a7384:     	mov	x0, x23
1002a7388:     	bl	0x102e47f38
1002a738c:     	cmp	x25, x26
1002a7390:     	b.eq	0x1002a72d8
1002a7394:     	mov	x8, sp
1002a7398:     	add	x23, x8, #0x8
1002a739c:     	ldp	x9, x8, [x21]
1002a73a0:     	stp	x9, x8, [sp]
1002a73a4:     	cbz	x8, 0x1002a73b4
1002a73a8:     	add	x8, x8, #0x8
1002a73ac:     	mov	w9, #0x1                ; =1
1002a73b0:     	ldadd	w9, w8, [x8]
1002a73b4:     	mov	x2, sp
1002a73b8:     	mov	x0, x20
1002a73bc:     	mov	x1, x19
1002a73c0:     	bl	0x102e1a2c4
1002a73c4:     	mov	x0, x23
1002a73c8:     	bl	0x10001022c
1002a73cc:     	ldp	x29, x30, [sp, #0x90]
1002a73d0:     	ldp	x20, x19, [sp, #0x80]
1002a73d4:     	ldp	x22, x21, [sp, #0x70]
1002a73d8:     	ldp	x24, x23, [sp, #0x60]
1002a73dc:     	ldp	x26, x25, [sp, #0x50]
1002a73e0:     	add	sp, sp, #0xa0
1002a73e4:     	ret
1002a73e8:     	b	0x1002a73ec
1002a73ec:     	mov	x19, x0
1002a73f0:     	mov	x0, x23
1002a73f4:     	bl	0x10001022c
1002a73f8:     	mov	x0, x19
1002a73fc:     	bl	0x103bda970

FUNCTION 0x1002a7400 size 152
1002a7400:     	ldr	w8, [x0, #0x8]
1002a7404:     	cbz	w8, 0x1002a7430
1002a7408:     	cmp	w8, #0x2
1002a740c:     	b.ne	0x1002a7458
1002a7410:     	ldr	d1, [x0]
1002a7414:     	mov	x9, #0x4059000000000000 ; =4636737291354636288
1002a7418:     	fmov	d0, x9
1002a741c:     	fcmp	d1, d0
1002a7420:     	b.gt	0x1002a7454
1002a7424:     	adrp	x9, 0x1042ee000
1002a7428:     	ldr	d0, [x9, #0x828]
1002a742c:     	b	0x1002a744c
1002a7430:     	ldr	d1, [x0]
1002a7434:     	adrp	x9, 0x1042ee000
1002a7438:     	ldr	d0, [x9, #0x818]
1002a743c:     	fcmp	d1, d0
1002a7440:     	b.gt	0x1002a7454
1002a7444:     	adrp	x9, 0x1042ec000
1002a7448:     	ldr	d0, [x9, #0xb78]
1002a744c:     	fcmp	d1, d0

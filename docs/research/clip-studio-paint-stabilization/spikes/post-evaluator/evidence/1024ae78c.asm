
FUNCTION 0x1024ae78c size 3680
1024ae78c:     	stp	x28, x27, [sp, #-0x60]!
1024ae790:     	stp	x26, x25, [sp, #0x10]
1024ae794:     	stp	x24, x23, [sp, #0x20]
1024ae798:     	stp	x22, x21, [sp, #0x30]
1024ae79c:     	stp	x20, x19, [sp, #0x40]
1024ae7a0:     	stp	x29, x30, [sp, #0x50]
1024ae7a4:     	add	x29, sp, #0x50
1024ae7a8:     	mov	w9, #0x1b70             ; =7024
1024ae7ac:     	adrp	x16, 0x1048c8000
1024ae7b0:     	ldr	x16, [x16, #0x4c8]
1024ae7b4:     	blr	x16
1024ae7b8:     	sub	sp, sp, #0x1, lsl #12   ; =0x1000
1024ae7bc:     	sub	sp, sp, #0xb70
1024ae7c0:     	str	w6, [sp, #0x15c]
1024ae7c4:     	str	w0, [sp, #0x164]
1024ae7c8:     	adrp	x8, 0x1048c8000
1024ae7cc:     	ldr	x8, [x8, #0x4d0]
1024ae7d0:     	ldr	x8, [x8]
1024ae7d4:     	stur	x8, [x29, #-0x68]
1024ae7d8:     	ldr	x8, [x1]
1024ae7dc:     	cbz	x8, 0x1024af510
1024ae7e0:     	ldr	w8, [sp, #0x15c]
1024ae7e4:     	cmp	w8, #0x2
1024ae7e8:     	b.lt	0x1024af510
1024ae7ec:     	mov	x23, x3
1024ae7f0:     	ldr	x0, [x3]
1024ae7f4:     	cbz	x0, 0x1024af510
1024ae7f8:     	mov	x22, x5
1024ae7fc:     	mov	x25, x4
1024ae800:     	mov	x24, x2
1024ae804:     	mov	x26, x1
1024ae808:     	bl	0x103687bcc
1024ae80c:     	cmp	w0, #0x2
1024ae810:     	b.ne	0x1024af510
1024ae814:     	ldr	x0, [x26]
1024ae818:     	bl	0x103687bcc
1024ae81c:     	cmp	w0, #0x2
1024ae820:     	b.ne	0x1024af510
1024ae824:     	ldr	w8, [sp, #0x164]
1024ae828:     	cbz	w8, 0x1024ae884
1024ae82c:     	ldr	x8, [x24]
1024ae830:     	cbz	x8, 0x1024af510
1024ae834:     	ldr	x0, [x25]
1024ae838:     	cbz	x0, 0x1024af510
1024ae83c:     	bl	0x103687bcc
1024ae840:     	cmp	w0, #0x2
1024ae844:     	b.gt	0x1024af510
1024ae848:     	mov	x8, x0
1024ae84c:     	ldr	x0, [x24]
1024ae850:     	mov	x19, x8
1024ae854:     	bl	0x103687bcc
1024ae858:     	cmp	w0, w19
1024ae85c:     	b.ne	0x1024af510
1024ae860:     	ldr	x0, [x25]
1024ae864:     	bl	0x10368b4b4
1024ae868:     	cmp	w0, #0x21
1024ae86c:     	b.ne	0x1024af510
1024ae870:     	ldr	x0, [x24]
1024ae874:     	bl	0x10368b4b4
1024ae878:     	cmp	w0, #0x21
1024ae87c:     	b.eq	0x1024ae888
1024ae880:     	b	0x1024af510
1024ae884:     	mov	w19, #0x0               ; =0
1024ae888:     	str	w19, [sp, #0x128]
1024ae88c:     	add	x19, sp, #0x6f0
1024ae890:     	ldr	x0, [x23]
1024ae894:     	bl	0x10368abc0
1024ae898:     	str	x0, [sp, #0x738]
1024ae89c:     	str	x1, [sp, #0x740]
1024ae8a0:     	ldr	q0, [x22]
1024ae8a4:     	str	q0, [x19, #0x30]
1024ae8a8:     	add	x0, sp, #0x720
1024ae8ac:     	add	x1, sp, #0x738
1024ae8b0:     	bl	0x10221b7bc
1024ae8b4:     	cbz	w0, 0x1024af510
1024ae8b8:     	ldr	q0, [x19, #0x30]
1024ae8bc:     	str	q0, [x19, #0x20]
1024ae8c0:     	add	x0, sp, #0x710
1024ae8c4:     	ldr	w1, [sp, #0x15c]
1024ae8c8:     	bl	0x10221b580
1024ae8cc:     	ldr	w8, [sp, #0x15c]
1024ae8d0:     	lsr	w1, w8, #1
1024ae8d4:     	add	x0, sp, #0x710
1024ae8d8:     	str	w1, [sp, #0x54]
1024ae8dc:     	mov	x2, x1
1024ae8e0:     	bl	0x10221b4d4
1024ae8e4:     	add	x0, sp, #0x710
1024ae8e8:     	ldr	w1, [sp, #0x54]
1024ae8ec:     	mov	x2, x1
1024ae8f0:     	bl	0x10221b508
1024ae8f4:     	ldr	q0, [x19, #0x30]
1024ae8f8:     	str	q0, [x19, #0x10]
1024ae8fc:     	add	x0, sp, #0x700
1024ae900:     	mov	w1, #0x1                ; =1
1024ae904:     	mov	w2, #0x1                ; =1
1024ae908:     	bl	0x10221b508
1024ae90c:     	ldr	q0, [x19, #0x30]
1024ae910:     	str	q0, [x19]
1024ae914:     	ldr	d0, [sp, #0x6f0]
1024ae918:     	movi.2d	v1, #0xffffffffffffffff
1024ae91c:     	add.2s	v0, v0, v1
1024ae920:     	str	d0, [sp, #0x6f0]
1024ae924:     	ldr	x1, [x23]
1024ae928:     	add	x0, sp, #0x5b8
1024ae92c:     	bl	0x103690d30
1024ae930:     	ldr	x1, [x26]
1024ae934:     	add	x0, sp, #0x480
1024ae938:     	bl	0x103690d30
1024ae93c:     	ldr	x1, [x25]
1024ae940:     	add	x0, sp, #0x348
1024ae944:     	bl	0x103690d30
1024ae948:     	ldr	x1, [x24]
1024ae94c:     	add	x0, sp, #0x210
1024ae950:     	bl	0x103690d30
1024ae954:     	add	x0, sp, #0x5b8
1024ae958:     	add	x2, sp, #0x700
1024ae95c:     	mov	w1, #0x0                ; =0
1024ae960:     	bl	0x103690f18
1024ae964:     	cbz	w0, 0x1024af4f0
1024ae968:     	add	x0, sp, #0x480
1024ae96c:     	add	x2, sp, #0x710
1024ae970:     	mov	w1, #0x1                ; =1
1024ae974:     	bl	0x103690f18
1024ae978:     	cbz	w0, 0x1024af4f0
1024ae97c:     	ldr	w8, [sp, #0x164]
1024ae980:     	cbz	w8, 0x1024ae9ac
1024ae984:     	add	x0, sp, #0x348
1024ae988:     	add	x2, sp, #0x700
1024ae98c:     	mov	w1, #0x0                ; =0
1024ae990:     	bl	0x103690f18
1024ae994:     	cbz	w0, 0x1024af4f0
1024ae998:     	add	x0, sp, #0x210
1024ae99c:     	add	x2, sp, #0x710
1024ae9a0:     	mov	w1, #0x1                ; =1
1024ae9a4:     	bl	0x103690f18
1024ae9a8:     	cbz	w0, 0x1024af4f0
1024ae9ac:     	add	x0, sp, #0x5b8
1024ae9b0:     	bl	0x1036910a8
1024ae9b4:     	mov	x24, x0
1024ae9b8:     	add	x0, sp, #0x480
1024ae9bc:     	bl	0x1036910a8
1024ae9c0:     	mov	x25, x0
1024ae9c4:     	add	x0, sp, #0x480
1024ae9c8:     	bl	0x1036910a0
1024ae9cc:     	str	x0, [sp, #0x28]
1024ae9d0:     	ldr	w8, [sp, #0x164]
1024ae9d4:     	cbz	w8, 0x1024aea08
1024ae9d8:     	add	x0, sp, #0x348
1024ae9dc:     	bl	0x1036910b8
1024ae9e0:     	mov	x27, x0
1024ae9e4:     	add	x0, sp, #0x210
1024ae9e8:     	bl	0x1036910b8
1024ae9ec:     	mov	x26, x0
1024ae9f0:     	add	x0, sp, #0x210
1024ae9f4:     	bl	0x1036910b0
1024ae9f8:     	str	x0, [sp, #0x20]
1024ae9fc:     	sxtw	x8, w26
1024aea00:     	str	x8, [sp, #0x90]
1024aea04:     	b	0x1024aea14
1024aea08:     	str	xzr, [sp, #0x90]
1024aea0c:     	str	xzr, [sp, #0x20]
1024aea10:     	mov	w27, #0x0               ; =0
1024aea14:     	adrp	x8, 0x10453a000
1024aea18:     	add	x8, x8, #0x640
1024aea1c:     	strh	wzr, [sp, #0x20e]
1024aea20:     	adrp	x9, 0x10453a000
1024aea24:     	add	x9, x9, #0x638
1024aea28:     	ldr	w10, [sp, #0x128]
1024aea2c:     	cmp	w10, #0x2
1024aea30:     	csel	x8, x9, x8, eq
1024aea34:     	str	x8, [sp, #0x88]
1024aea38:     	ldr	x1, [x23]
1024aea3c:     	add	x0, sp, #0x1dc
1024aea40:     	add	x2, sp, #0x6f0
1024aea44:     	bl	0x103686ed0
1024aea48:     	mov	x11, #0x0               ; =0
1024aea4c:     	add	w8, w24, w24, lsr #31
1024aea50:     	add	w9, w25, w25, lsr #31
1024aea54:     	asr	w12, w8, #1
1024aea58:     	asr	w8, w9, #1
1024aea5c:     	ldr	w9, [sp, #0x15c]
1024aea60:     	mul	w10, w9, w9
1024aea64:     	str	x10, [sp, #0x148]
1024aea68:     	ldr	w10, [sp, #0x164]
1024aea6c:     	cmp	w10, #0x0
1024aea70:     	add	x10, sp, #0xf56
1024aea74:     	csel	x10, x10, x11, ne
1024aea78:     	str	x10, [sp, #0x30]
1024aea7c:     	ldr	x10, [sp, #0x28]
1024aea80:     	sxtw	x26, w10
1024aea84:     	ldr	x10, [sp, #0x20]
1024aea88:     	sxtw	x28, w10
1024aea8c:     	csel	x10, x28, x11, ne
1024aea90:     	str	x10, [sp, #0x150]
1024aea94:     	sub	w9, w9, #0x1
1024aea98:     	str	w9, [sp, #0x160]
1024aea9c:     	sxtw	x9, w12
1024aeaa0:     	stp	x9, x12, [sp, #0x38]
1024aeaa4:     	sxtw	x9, w27
1024aeaa8:     	str	x9, [sp, #0x48]
1024aeaac:     	stp	x11, x11, [sp, #0x1c8]
1024aeab0:     	sxtw	x8, w8
1024aeab4:     	stp	x8, x26, [sp, #0x78]
1024aeab8:     	sbfiz	x19, x12, #1, #32
1024aeabc:     	stp	x19, x11, [sp, #0x10]
1024aeac0:     	sub	x8, x11, w12, sxtw #1
1024aeac4:     	str	x8, [sp, #0x8]
1024aeac8:     	str	x28, [sp, #0x140]
1024aeacc:     	add	x0, sp, #0x1dc
1024aead0:     	add	x1, sp, #0x1c8
1024aead4:     	bl	0x103686ed4
1024aead8:     	cbz	w0, 0x1024af4f0
1024aeadc:     	ldr	w20, [sp, #0x1c8]
1024aeae0:     	ldr	w19, [sp, #0x1d4]
1024aeae4:     	ldr	w21, [sp, #0x1d0]
1024aeae8:     	ldr	w22, [sp, #0x1cc]
1024aeaec:     	add	x8, sp, #0xc9
1024aeaf0:     	ldur	q0, [x8, #0xff]
1024aeaf4:     	str	q0, [sp, #0x1b0]
1024aeaf8:     	add	x0, sp, #0x1b0
1024aeafc:     	ldr	w1, [sp, #0x15c]
1024aeb00:     	bl	0x10221b580
1024aeb04:     	add	x0, sp, #0x1b0
1024aeb08:     	ldr	w1, [sp, #0x54]
1024aeb0c:     	mov	x2, x1
1024aeb10:     	bl	0x10221b4d4
1024aeb14:     	ldr	w8, [sp, #0x740]
1024aeb18:     	ldr	w9, [sp, #0x744]
1024aeb1c:     	sub	w8, w8, #0x1
1024aeb20:     	ldr	w10, [sp, #0x1d0]
1024aeb24:     	ldr	w2, [sp, #0x1cc]
1024aeb28:     	cmp	w8, w10
1024aeb2c:     	csel	w23, w8, w10, lt
1024aeb30:     	sub	w8, w9, #0x1
1024aeb34:     	ldr	w9, [sp, #0x1d4]
1024aeb38:     	cmp	w8, w9
1024aeb3c:     	csel	w24, w8, w9, lt
1024aeb40:     	add	x0, sp, #0x5b8
1024aeb44:     	mov	x1, x23
1024aeb48:     	bl	0x103690fe4
1024aeb4c:     	add	x0, sp, #0x5b8
1024aeb50:     	bl	0x103691054
1024aeb54:     	mov	x25, x0
1024aeb58:     	sub	w19, w19, w22
1024aeb5c:     	cbz	x0, 0x1024aebb8
1024aeb60:     	cmp	w19, #0x1
1024aeb64:     	b.lt	0x1024aebdc
1024aeb68:     	str	w20, [sp, #0x138]
1024aeb6c:     	add	x27, sp, #0x1, lsl #12  ; =0x1000
1024aeb70:     	add	x27, x27, #0x756
1024aeb74:     	mov	x22, x19
1024aeb78:     	ldr	x20, [sp, #0x10]
1024aeb7c:     	mov	x0, x27
1024aeb80:     	mov	x1, x25
1024aeb84:     	mov	x2, x26
1024aeb88:     	bl	0x103bdf590
1024aeb8c:     	add	x27, x27, #0x2
1024aeb90:     	add	x25, x25, x20
1024aeb94:     	subs	w22, w22, #0x1
1024aeb98:     	b.ne	0x1024aeb7c
1024aeb9c:     	ldr	w8, [sp, #0x164]
1024aeba0:     	ldr	w20, [sp, #0x138]
1024aeba4:     	cbz	w8, 0x1024aec54
1024aeba8:     	ldr	x8, [sp, #0x8]
1024aebac:     	add	x8, x25, x8
1024aebb0:     	cbnz	x8, 0x1024aebe4
1024aebb4:     	b	0x1024aec3c
1024aebb8:     	ldr	x8, [sp, #0x28]
1024aebbc:     	mul	w8, w19, w8
1024aebc0:     	sxtw	x1, w8
1024aebc4:     	add	x0, sp, #0x1, lsl #12   ; =0x1000
1024aebc8:     	add	x0, x0, #0x756
1024aebcc:     	bl	0x103bdd6dc
1024aebd0:     	ldr	w8, [sp, #0x164]
1024aebd4:     	cbnz	w8, 0x1024aec3c
1024aebd8:     	b	0x1024aec54
1024aebdc:     	ldr	w8, [sp, #0x164]
1024aebe0:     	cbz	w8, 0x1024aec54
1024aebe4:     	ldr	w2, [sp, #0x1cc]
1024aebe8:     	add	x0, sp, #0x348
1024aebec:     	mov	x1, x23
1024aebf0:     	bl	0x103690fe4
1024aebf4:     	add	x0, sp, #0x348
1024aebf8:     	bl	0x10369105c
1024aebfc:     	mov	x25, x0
1024aec00:     	cbz	x0, 0x1024aec3c
1024aec04:     	cmp	w19, #0x1
1024aec08:     	b.lt	0x1024aec54
1024aec0c:     	add	x27, sp, #0x74e
1024aec10:     	mov	x22, x19
1024aec14:     	mov	x0, x27
1024aec18:     	mov	x1, x25
1024aec1c:     	mov	x2, x28
1024aec20:     	bl	0x103bdf590
1024aec24:     	add	x27, x27, x28
1024aec28:     	ldr	x8, [sp, #0x48]
1024aec2c:     	add	x25, x25, x8
1024aec30:     	subs	w22, w22, #0x1
1024aec34:     	b.ne	0x1024aec14
1024aec38:     	b	0x1024aec54
1024aec3c:     	ldr	x8, [sp, #0x20]
1024aec40:     	mul	w8, w19, w8
1024aec44:     	sxtw	x2, w8
1024aec48:     	add	x0, sp, #0x74e
1024aec4c:     	mov	w1, #0xff               ; =255
1024aec50:     	bl	0x103bdf5a8
1024aec54:     	ldr	w1, [sp, #0x1c8]
1024aec58:     	add	x0, sp, #0x5b8
1024aec5c:     	mov	x2, x24
1024aec60:     	bl	0x103690fe4
1024aec64:     	add	x22, sp, #0x74e
1024aec68:     	add	x0, sp, #0x5b8
1024aec6c:     	bl	0x103691054
1024aec70:     	mov	x1, x0
1024aec74:     	sub	w20, w21, w20
1024aec78:     	ldr	x8, [sp, #0x28]
1024aec7c:     	mul	w8, w20, w8
1024aec80:     	sxtw	x2, w8
1024aec84:     	add	x0, sp, #0x1, lsl #12   ; =0x1000
1024aec88:     	add	x0, x0, #0x958
1024aec8c:     	cbz	x1, 0x1024aecd4
1024aec90:     	bl	0x103bdf590
1024aec94:     	ldr	w8, [sp, #0x164]
1024aec98:     	cbz	w8, 0x1024aecfc
1024aec9c:     	ldr	w1, [sp, #0x1c8]
1024aeca0:     	add	x0, sp, #0x348
1024aeca4:     	mov	x2, x24
1024aeca8:     	bl	0x103690fe4
1024aecac:     	add	x0, sp, #0x348
1024aecb0:     	bl	0x10369105c
1024aecb4:     	mov	x1, x0
1024aecb8:     	cbz	x1, 0x1024aece4
1024aecbc:     	ldr	x8, [sp, #0x20]
1024aecc0:     	mul	w8, w20, w8
1024aecc4:     	sxtw	x2, w8
1024aecc8:     	add	x0, sp, #0xf56
1024aeccc:     	bl	0x103bdf590
1024aecd0:     	b	0x1024aecfc
1024aecd4:     	mov	x1, x2
1024aecd8:     	bl	0x103bdd6dc
1024aecdc:     	ldr	w8, [sp, #0x164]
1024aece0:     	cbz	w8, 0x1024aecfc
1024aece4:     	ldr	x8, [sp, #0x20]
1024aece8:     	mul	w8, w20, w8
1024aecec:     	sxtw	x2, w8
1024aecf0:     	add	x0, sp, #0xf56
1024aecf4:     	mov	w1, #0xff               ; =255
1024aecf8:     	bl	0x103bdf5a8
1024aecfc:     	add	x0, sp, #0x5b8
1024aed00:     	mov	x1, x23
1024aed04:     	mov	x2, x24
1024aed08:     	bl	0x103690fe4
1024aed0c:     	add	x0, sp, #0x5b8
1024aed10:     	bl	0x103691054
1024aed14:     	mov	x1, x0
1024aed18:     	sxtw	x20, w19
1024aed1c:     	add	x8, sp, #0x1, lsl #12   ; =0x1000
1024aed20:     	add	x8, x8, #0x756 STRING 'walker19PWBrushPatternStyleEEE'
1024aed24:     	add	x0, x8, w19, sxtw #1
1024aed28:     	cbz	x1, 0x1024aed6c
1024aed2c:     	mov	x2, x26
1024aed30:     	bl	0x103bdf590
1024aed34:     	ldr	w8, [sp, #0x164]
1024aed38:     	cbz	w8, 0x1024aed8c
1024aed3c:     	add	x0, sp, #0x348
1024aed40:     	mov	x1, x23
1024aed44:     	mov	x2, x24
1024aed48:     	bl	0x103690fe4
1024aed4c:     	add	x0, sp, #0x348
1024aed50:     	bl	0x10369105c
1024aed54:     	mov	x1, x0
1024aed58:     	smaddl	x0, w20, w28, x22
1024aed5c:     	cbz	x1, 0x1024aed80
1024aed60:     	mov	x2, x28
1024aed64:     	bl	0x103bdf590
1024aed68:     	b	0x1024aed8c
1024aed6c:     	mov	x1, x26
1024aed70:     	bl	0x103bdd6dc
1024aed74:     	ldr	w8, [sp, #0x164]
1024aed78:     	cbz	w8, 0x1024aed8c
1024aed7c:     	smaddl	x0, w20, w28, x22
1024aed80:     	mov	w1, #0xff               ; =255
1024aed84:     	mov	x2, x28
1024aed88:     	bl	0x103bdf5a8
1024aed8c:     	ldr	w1, [sp, #0x1c8]
1024aed90:     	ldr	w2, [sp, #0x1cc]
1024aed94:     	add	x0, sp, #0x5b8
1024aed98:     	bl	0x103690fe4
1024aed9c:     	add	x0, sp, #0x5b8
1024aeda0:     	bl	0x103691054
1024aeda4:     	mov	x19, x0
1024aeda8:     	mov	x20, #0x0               ; =0
1024aedac:     	ldr	w8, [sp, #0x164]
1024aedb0:     	cbz	w8, 0x1024aedd4
1024aedb4:     	cbz	x19, 0x1024aedd4
1024aedb8:     	ldr	w1, [sp, #0x1c8]
1024aedbc:     	ldr	w2, [sp, #0x1cc]
1024aedc0:     	add	x0, sp, #0x348
1024aedc4:     	bl	0x103690fe4
1024aedc8:     	add	x0, sp, #0x348
1024aedcc:     	bl	0x10369105c
1024aedd0:     	mov	x20, x0
1024aedd4:     	add	x0, sp, #0x178
1024aedd8:     	add	x1, sp, #0x480
1024aeddc:     	add	x2, sp, #0x1b0
1024aede0:     	mov	w3, #0x1                ; =1
1024aede4:     	bl	0x103686c98
1024aede8:     	ldr	x8, [sp, #0x18]
1024aedec:     	stp	x8, x8, [sp, #0x168]
1024aedf0:     	stp	x20, x19, [sp, #0x98]
1024aedf4:     	add	x0, sp, #0x178
1024aedf8:     	add	x1, sp, #0x168
1024aedfc:     	bl	0x103686cf4
1024aee00:     	cbz	w0, 0x1024aeacc
1024aee04:     	ldr	w1, [sp, #0x168]
1024aee08:     	ldr	w2, [sp, #0x16c]
1024aee0c:     	add	x0, sp, #0x480
1024aee10:     	bl	0x103690fe4
1024aee14:     	add	x0, sp, #0x480
1024aee18:     	bl	0x103691054
1024aee1c:     	mov	x21, x0
1024aee20:     	cbz	x0, 0x1024aedf4
1024aee24:     	ldr	w8, [sp, #0x164]
1024aee28:     	cbz	w8, 0x1024aee4c
1024aee2c:     	ldr	w1, [sp, #0x168]
1024aee30:     	ldr	w2, [sp, #0x16c]
1024aee34:     	add	x0, sp, #0x210
1024aee38:     	bl	0x103690fe4
1024aee3c:     	add	x0, sp, #0x210
1024aee40:     	bl	0x10369105c
1024aee44:     	cbnz	x0, 0x1024aee50
1024aee48:     	b	0x1024aedf4
1024aee4c:     	mov	x0, #0x0                ; =0
1024aee50:     	ldr	w8, [sp, #0x168]
1024aee54:     	ldr	w9, [sp, #0x54]
1024aee58:     	subs	w8, w8, w9
1024aee5c:     	b.mi	0x1024aee6c
1024aee60:     	ldr	w9, [sp, #0x15c]
1024aee64:     	udiv	w15, w8, w9
1024aee68:     	b	0x1024aee70
1024aee6c:     	mov	w15, #-0x1              ; =-1
1024aee70:     	ldr	w16, [sp, #0x16c]
1024aee74:     	ldr	w9, [sp, #0x54]
1024aee78:     	subs	w11, w16, w9
1024aee7c:     	b.mi	0x1024aeec4
1024aee80:     	ldr	w12, [sp, #0x1d4]
1024aee84:     	ldr	w9, [sp, #0x15c]
1024aee88:     	udiv	w9, w11, w9
1024aee8c:     	cbz	x19, 0x1024aeefc
1024aee90:     	ldr	w10, [sp, #0x1cc]
1024aee94:     	sub	w10, w9, w10
1024aee98:     	ldr	x13, [sp, #0x40]
1024aee9c:     	mul	w10, w10, w13
1024aeea0:     	add	x14, x19, w10, sxtw #1
1024aeea4:     	sub	w12, w12, #0x1
1024aeea8:     	cmp	w9, w12
1024aeeac:     	cset	w10, lt
1024aeeb0:     	ldr	x13, [sp, #0x38]
1024aeeb4:     	str	x14, [sp, #0xa8]
1024aeeb8:     	add	x13, x14, x13, lsl #1
1024aeebc:     	csel	x13, x13, xzr, lt
1024aeec0:     	b	0x1024aef0c
1024aeec4:     	mov	w10, #0x0               ; =0
1024aeec8:     	ldr	w9, [sp, #0x15c]
1024aeecc:     	add	w17, w11, w9
1024aeed0:     	mov	w11, #0x1               ; =1
1024aeed4:     	mov	w9, #-0x1               ; =-1
1024aeed8:     	add	x12, sp, #0x1, lsl #12  ; =0x1000
1024aeedc:     	add	x12, x12, #0x958
1024aeee0:     	str	x12, [sp, #0xc8]
1024aeee4:     	add	x12, sp, #0x1, lsl #12  ; =0x1000
1024aeee8:     	add	x12, x12, #0x958
1024aeeec:     	str	x12, [sp, #0xa8]
1024aeef0:     	ldr	x12, [sp, #0x30]
1024aeef4:     	str	x12, [sp, #0xb8]
1024aeef8:     	b	0x1024aef84
1024aeefc:     	str	xzr, [sp, #0xa8]
1024aef00:     	mov	x13, #0x0               ; =0
1024aef04:     	mov	w10, #0x0               ; =0
1024aef08:     	sub	w12, w12, #0x1
1024aef0c:     	ldr	w14, [sp, #0x15c]
1024aef10:     	msub	w17, w9, w14, w11
1024aef14:     	cmp	w9, w12
1024aef18:     	add	x11, sp, #0x1, lsl #12  ; =0x1000
1024aef1c:     	add	x11, x11, #0x958
1024aef20:     	csel	x11, x13, x11, lt
1024aef24:     	str	x11, [sp, #0xc8]
1024aef28:     	ldr	w11, [sp, #0x164]
1024aef2c:     	cbz	w11, 0x1024aef60
1024aef30:     	cbz	x20, 0x1024aef6c
1024aef34:     	ldrsw	x11, [sp, #0x1cc]
1024aef38:     	sxtw	x13, w9
1024aef3c:     	sub	x11, x13, x11
1024aef40:     	ldr	x13, [sp, #0x48]
1024aef44:     	madd	x14, x11, x13, x20
1024aef48:     	cmp	w9, w12
1024aef4c:     	cset	w11, ge
1024aef50:     	str	x14, [sp, #0xb8]
1024aef54:     	add	x13, x14, x13
1024aef58:     	csel	x13, xzr, x13, ge
1024aef5c:     	b	0x1024aef78
1024aef60:     	stp	xzr, xzr, [sp, #0xb0]
1024aef64:     	mov	w11, #0x1               ; =1
1024aef68:     	b	0x1024aef88
1024aef6c:     	str	xzr, [sp, #0xb8]
1024aef70:     	mov	x13, #0x0               ; =0
1024aef74:     	mov	w11, #0x1               ; =1
1024aef78:     	cmp	w9, w12
1024aef7c:     	add	x12, sp, #0xf56
1024aef80:     	csel	x12, x13, x12, lt
1024aef84:     	str	x12, [sp, #0xb0]
1024aef88:     	ldr	w12, [sp, #0x174]
1024aef8c:     	cmp	w16, w12
1024aef90:     	b.ge	0x1024aedf4
1024aef94:     	ldr	w12, [sp, #0x15c]
1024aef98:     	msub	w8, w15, w12, w8
1024aef9c:     	str	w8, [sp, #0x6c]
1024aefa0:     	cmp	w10, #0x0
1024aefa4:     	ldr	x8, [sp, #0x40]
1024aefa8:     	csel	w8, wzr, w8, eq
1024aefac:     	sxtw	x8, w8
1024aefb0:     	str	x8, [sp, #0x60]
1024aefb4:     	cmp	w11, #0x0
1024aefb8:     	ldr	x8, [sp, #0x48]
1024aefbc:     	csel	x8, xzr, x8, ne
1024aefc0:     	ldr	w10, [sp, #0x164]
1024aefc4:     	cmp	w10, #0x0
1024aefc8:     	csel	x8, x8, xzr, ne
1024aefcc:     	str	x8, [sp, #0x58]
1024aefd0:     	sxtw	x8, w15
1024aefd4:     	str	x8, [sp, #0x70]
1024aefd8:     	mov	x1, x9
1024aefdc:     	str	x15, [sp, #0xc0]
1024aefe0:     	stp	x0, x21, [sp, #0xd8]
1024aefe4:     	str	w16, [sp, #0xd4]
1024aefe8:     	tbnz	w15, #0x1f, 0x1024af0d8
1024aefec:     	ldrsw	x8, [sp, #0x1c8]
1024aeff0:     	ldr	w11, [sp, #0x1d0]
1024aeff4:     	ldr	x9, [sp, #0x70]
1024aeff8:     	sub	x10, x9, x8
1024aeffc:     	ldr	x8, [sp, #0xa8]
1024af000:     	add	x9, x8, x10, lsl #1
1024af004:     	cmp	x8, #0x0
1024af008:     	add	x13, sp, #0x20e
1024af00c:     	csel	x4, x9, x13, ne
1024af010:     	cset	w8, ne
1024af014:     	add	x9, x9, #0x2
1024af018:     	csel	x3, x9, x13, ne
1024af01c:     	ldr	x9, [sp, #0xc8]
1024af020:     	add	x12, x9, x10, lsl #1
1024af024:     	cmp	x9, #0x0
1024af028:     	csel	x26, x12, x13, ne
1024af02c:     	cset	w9, ne
1024af030:     	add	x12, x12, #0x2
1024af034:     	csel	x2, x12, x13, ne
1024af038:     	sub	w12, w11, #0x1
1024af03c:     	cmp	w15, w12
1024af040:     	b.lt	0x1024af068
1024af044:     	ldr	w11, [sp, #0x1cc]
1024af048:     	sub	w11, w1, w11
1024af04c:     	add	w13, w11, #0x1
1024af050:     	add	x14, sp, #0x1, lsl #12  ; =0x1000
1024af054:     	add	x14, x14, #0x756
1024af058:     	add	x2, x14, w13, sxtw #1
1024af05c:     	add	x11, x14, w11, sxtw #1
1024af060:     	tst	w1, #0x80000000
1024af064:     	csel	x3, x2, x11, ne
1024af068:     	ldr	w11, [sp, #0x164]
1024af06c:     	cbz	w11, 0x1024af150
1024af070:     	mul	x11, x10, x28
1024af074:     	ldp	x0, x14, [sp, #0xb0]
1024af078:     	add	x10, x14, x11
1024af07c:     	add	x13, x10, x28
1024af080:     	cmp	x14, #0x0
1024af084:     	ldr	x14, [sp, #0x88]
1024af088:     	csel	x21, x10, x14, ne
1024af08c:     	cset	w10, ne
1024af090:     	csel	x27, x13, x14, ne
1024af094:     	add	x11, x0, x11
1024af098:     	add	x13, x11, x28
1024af09c:     	cmp	x0, #0x0
1024af0a0:     	csel	x19, x11, x14, ne
1024af0a4:     	cset	w11, ne
1024af0a8:     	csel	x25, x13, x14, ne
1024af0ac:     	cmp	w15, w12
1024af0b0:     	b.lt	0x1024af164
1024af0b4:     	ldr	w12, [sp, #0x1cc]
1024af0b8:     	sub	w12, w1, w12
1024af0bc:     	add	w13, w12, #0x1
1024af0c0:     	add	x14, sp, #0x74e
1024af0c4:     	smaddl	x25, w28, w13, x14
1024af0c8:     	smaddl	x12, w28, w12, x14
1024af0cc:     	tst	w1, #0x80000000
1024af0d0:     	csel	x27, x25, x12, ne
1024af0d4:     	b	0x1024af164
1024af0d8:     	ldrsw	x8, [sp, #0x1cc]
1024af0dc:     	sub	w9, w1, w8
1024af0e0:     	add	w9, w9, #0x1
1024af0e4:     	add	x11, sp, #0x1, lsl #12  ; =0x1000
1024af0e8:     	add	x11, x11, #0x756
1024af0ec:     	add	x2, x11, w9, sxtw #1
1024af0f0:     	sxtw	x10, w1
1024af0f4:     	sub	x8, x10, x8
1024af0f8:     	add	x10, x11, x8, lsl #1
1024af0fc:     	cmp	w1, #0x0
1024af100:     	csel	x3, x2, x10, lt
1024af104:     	smaddl	x10, w9, w28, x22
1024af108:     	madd	x8, x8, x28, x22
1024af10c:     	cmp	w1, #0x0
1024af110:     	csel	x11, x10, x8, lt
1024af114:     	ldr	w12, [sp, #0x164]
1024af118:     	cmp	w12, #0x0
1024af11c:     	mov	w9, wzr
1024af120:     	mov	w8, wzr
1024af124:     	ldr	x13, [sp, #0x88]
1024af128:     	csel	x21, x11, x13, ne
1024af12c:     	csel	x27, x11, x13, ne
1024af130:     	csel	x19, x10, x13, ne
1024af134:     	cmp	w12, #0x0
1024af138:     	csel	x25, x10, x13, ne
1024af13c:     	mov	w10, wzr
1024af140:     	mov	w11, wzr
1024af144:     	mov	x26, x2
1024af148:     	mov	x4, x3
1024af14c:     	b	0x1024af164
1024af150:     	mov	w10, #0x0               ; =0
1024af154:     	ldr	x25, [sp, #0x88]
1024af158:     	mov	x21, x25
1024af15c:     	mov	x27, x25
1024af160:     	mov	x19, x25
1024af164:     	ldr	w28, [sp, #0x168]
1024af168:     	ldr	w12, [sp, #0x170]
1024af16c:     	cmp	w28, w12
1024af170:     	b.ge	0x1024af408
1024af174:     	ldr	w12, [sp, #0x15c]
1024af178:     	sub	w16, w12, w17
1024af17c:     	add	w12, w1, #0x1
1024af180:     	str	w12, [sp, #0x124]
1024af184:     	cmp	w10, #0x0
1024af188:     	ldr	x10, [sp, #0x140]
1024af18c:     	csel	x12, x10, xzr, ne
1024af190:     	cmp	w11, #0x0
1024af194:     	csel	x10, x10, xzr, ne
1024af198:     	stp	x10, x12, [sp, #0xe8]
1024af19c:     	cmp	w8, #0x0
1024af1a0:     	mov	w8, #0x2                ; =2
1024af1a4:     	csel	x10, x8, xzr, ne
1024af1a8:     	cmp	w9, #0x0
1024af1ac:     	csel	x8, x8, xzr, ne
1024af1b0:     	stp	x8, x10, [sp, #0x110]
1024af1b4:     	mov	x8, x1
1024af1b8:     	sxtw	x8, w8
1024af1bc:     	stp	x1, x8, [sp, #0x100]
1024af1c0:     	ldr	w24, [sp, #0x6c]
1024af1c4:     	ldr	x8, [sp, #0xc0]
1024af1c8:     	mov	x0, x8
1024af1cc:     	ldp	x23, x20, [sp, #0xd8]
1024af1d0:     	stp	w16, w17, [sp, #0xf8]
1024af1d4:     	ldr	w8, [sp, #0x15c]
1024af1d8:     	sub	w10, w8, w24
1024af1dc:     	ldrh	w8, [x4]
1024af1e0:     	mul	w9, w10, w16
1024af1e4:     	mul	w8, w9, w8
1024af1e8:     	ldrh	w9, [x3]
1024af1ec:     	mul	w11, w24, w16
1024af1f0:     	mul	w9, w11, w9
1024af1f4:     	ldrh	w11, [x26]
1024af1f8:     	mul	w10, w10, w17
1024af1fc:     	mul	w10, w10, w11
1024af200:     	ldrh	w11, [x2]
1024af204:     	mul	w12, w24, w17
1024af208:     	mul	w11, w12, w11
1024af20c:     	add	x12, x9, x8
1024af210:     	add	x13, x10, x11
1024af214:     	adds	x12, x12, x13
1024af218:     	b.eq	0x1024af278
1024af21c:     	ldr	x13, [sp, #0x148]
1024af220:     	udiv	x13, x12, x13
1024af224:     	strh	w13, [x20]
1024af228:     	ldr	w13, [sp, #0x164]
1024af22c:     	cbz	w13, 0x1024af2f8
1024af230:     	ldr	w13, [sp, #0x128]
1024af234:     	cmp	w13, #0x1
1024af238:     	b.ne	0x1024af2b8
1024af23c:     	mov	x13, #0x0               ; =0
1024af240:     	ldrb	w14, [x21, x13]
1024af244:     	umull	x14, w14, w8
1024af248:     	ldrb	w15, [x27, x13]
1024af24c:     	umaddl	x14, w15, w9, x14
1024af250:     	ldrb	w15, [x19, x13]
1024af254:     	umaddl	x14, w15, w10, x14
1024af258:     	ldrb	w15, [x25, x13]
1024af25c:     	umaddl	x14, w15, w11, x14
1024af260:     	udiv	x14, x14, x12
1024af264:     	strb	w14, [x23, x13]
1024af268:     	add	x13, x13, #0x1
1024af26c:     	cmp	x13, #0x3
1024af270:     	b.ne	0x1024af240
1024af274:     	b	0x1024af2f8
1024af278:     	strh	wzr, [x20]
1024af27c:     	ldr	w8, [sp, #0x164]
1024af280:     	cbz	w8, 0x1024af2f8
1024af284:     	str	w0, [sp, #0x12c]
1024af288:     	mov	x0, x23
1024af28c:     	mov	w1, #0xff               ; =255
1024af290:     	stp	x4, x2, [sp, #0x130]
1024af294:     	ldr	x2, [sp, #0x140]
1024af298:     	mov	x22, x3
1024af29c:     	bl	0x103bdf5a8
1024af2a0:     	ldr	w0, [sp, #0x12c]
1024af2a4:     	ldp	w16, w17, [sp, #0xf8]
1024af2a8:     	ldp	x4, x2, [sp, #0x130]
1024af2ac:     	mov	x3, x22
1024af2b0:     	ldr	x1, [sp, #0x100]
1024af2b4:     	b	0x1024af2f8
1024af2b8:     	cmp	w13, #0x2
1024af2bc:     	b.ne	0x1024af2f8
1024af2c0:     	mov	x13, #0x0               ; =0
1024af2c4:     	ldrh	w14, [x21, x13]
1024af2c8:     	umull	x14, w14, w8
1024af2cc:     	ldrh	w15, [x27, x13]
1024af2d0:     	umaddl	x14, w15, w9, x14
1024af2d4:     	ldrh	w15, [x19, x13]
1024af2d8:     	umaddl	x14, w15, w10, x14
1024af2dc:     	ldrh	w15, [x25, x13]
1024af2e0:     	umaddl	x14, w15, w11, x14
1024af2e4:     	udiv	x14, x14, x12
1024af2e8:     	strh	w14, [x23, x13]
1024af2ec:     	add	x13, x13, #0x2
1024af2f0:     	cmp	x13, #0x6
1024af2f4:     	b.ne	0x1024af2c4
1024af2f8:     	ldr	w8, [sp, #0x160]
1024af2fc:     	cmp	w24, w8
1024af300:     	b.ge	0x1024af30c
1024af304:     	add	w24, w24, #0x1
1024af308:     	b	0x1024af3ec
1024af30c:     	add	w0, w0, #0x1
1024af310:     	ldr	w8, [sp, #0x1d0]
1024af314:     	sub	w8, w8, #0x1
1024af318:     	cmp	w0, w8
1024af31c:     	b.ge	0x1024af350
1024af320:     	ldp	x8, x10, [sp, #0x110]
1024af324:     	add	x9, x3, x10
1024af328:     	add	x8, x2, x8
1024af32c:     	ldr	w10, [sp, #0x164]
1024af330:     	cbz	w10, 0x1024af3b4
1024af334:     	mov	w24, #0x0               ; =0
1024af338:     	mov	x21, x27
1024af33c:     	ldp	x10, x11, [sp, #0xe8]
1024af340:     	add	x27, x27, x11
1024af344:     	mov	x19, x25
1024af348:     	add	x25, x25, x10
1024af34c:     	b	0x1024af3b8
1024af350:     	ldrsw	x9, [sp, #0x1cc]
1024af354:     	ldr	w8, [sp, #0x124]
1024af358:     	sub	w10, w8, w9
1024af35c:     	add	x12, sp, #0x1, lsl #12  ; =0x1000
1024af360:     	add	x12, x12, #0x756
1024af364:     	add	x8, x12, w10, sxtw #1
1024af368:     	ldr	x11, [sp, #0x108]
1024af36c:     	sub	x11, x11, x9
1024af370:     	add	x9, x12, x11, lsl #1
1024af374:     	cmp	w1, #0x0
1024af378:     	csel	x9, x8, x9, lt
1024af37c:     	ldr	w12, [sp, #0x164]
1024af380:     	cbz	w12, 0x1024af3b4
1024af384:     	ldr	x12, [sp, #0x140]
1024af388:     	add	x13, sp, #0x74e
1024af38c:     	smaddl	x10, w10, w12, x13
1024af390:     	mov	w24, #0x0               ; =0
1024af394:     	tbnz	w1, #0x1f, 0x1024af3cc
1024af398:     	mov	x21, x27
1024af39c:     	madd	x27, x11, x12, x13
1024af3a0:     	mov	x4, x3
1024af3a4:     	mov	x3, x9
1024af3a8:     	mov	x26, x2
1024af3ac:     	mov	x2, x8
1024af3b0:     	b	0x1024af3e4
1024af3b4:     	mov	w24, #0x0               ; =0
1024af3b8:     	mov	x4, x3
1024af3bc:     	mov	x3, x9
1024af3c0:     	mov	x26, x2
1024af3c4:     	mov	x2, x8
1024af3c8:     	b	0x1024af3ec
1024af3cc:     	mov	x4, x3
1024af3d0:     	mov	x3, x9
1024af3d4:     	mov	x26, x2
1024af3d8:     	mov	x2, x8
1024af3dc:     	mov	x21, x27
1024af3e0:     	mov	x27, x10
1024af3e4:     	mov	x19, x25
1024af3e8:     	mov	x25, x10
1024af3ec:     	add	x20, x20, #0x2
1024af3f0:     	ldr	x8, [sp, #0x150]
1024af3f4:     	add	x23, x23, x8
1024af3f8:     	add	w28, w28, #0x1
1024af3fc:     	ldr	w8, [sp, #0x170]
1024af400:     	cmp	w28, w8
1024af404:     	b.lt	0x1024af1d4
1024af408:     	ldr	w8, [sp, #0x160]
1024af40c:     	cmp	w17, w8
1024af410:     	b.ge	0x1024af438
1024af414:     	add	w17, w17, #0x1
1024af418:     	ldr	x26, [sp, #0x80]
1024af41c:     	ldr	x28, [sp, #0x140]
1024af420:     	add	x22, sp, #0x74e
1024af424:     	ldp	x20, x19, [sp, #0x98]
1024af428:     	ldp	x0, x21, [sp, #0xd8]
1024af42c:     	ldr	x15, [sp, #0xc0]
1024af430:     	ldr	w16, [sp, #0xd4]
1024af434:     	b	0x1024af4cc
1024af438:     	add	w1, w1, #0x1
1024af43c:     	ldr	w8, [sp, #0x1d4]
1024af440:     	sub	w8, w8, #0x1
1024af444:     	cmp	w1, w8
1024af448:     	ldr	x26, [sp, #0x80]
1024af44c:     	ldr	x28, [sp, #0x140]
1024af450:     	add	x22, sp, #0x74e
1024af454:     	ldp	x20, x19, [sp, #0x98]
1024af458:     	ldp	x0, x21, [sp, #0xd8]
1024af45c:     	ldr	x15, [sp, #0xc0]
1024af460:     	ldr	w16, [sp, #0xd4]
1024af464:     	mov	w17, #0x0               ; =0
1024af468:     	b.ge	0x1024af49c
1024af46c:     	ldr	x8, [sp, #0xc8]
1024af470:     	str	x8, [sp, #0xa8]
1024af474:     	ldr	x9, [sp, #0x60]
1024af478:     	add	x8, x8, x9, lsl #1
1024af47c:     	ldr	w9, [sp, #0x164]
1024af480:     	cmp	w9, #0x0
1024af484:     	ldp	x10, x9, [sp, #0xb0]
1024af488:     	csel	x11, x10, x9, ne
1024af48c:     	ldr	x9, [sp, #0x58]
1024af490:     	add	x10, x10, x9
1024af494:     	stp	x10, x11, [sp, #0xb0]
1024af498:     	b	0x1024af4c8
1024af49c:     	ldr	w8, [sp, #0x164]
1024af4a0:     	cmp	w8, #0x0
1024af4a4:     	ldp	x9, x8, [sp, #0xb0]
1024af4a8:     	csel	x10, x9, x8, ne
1024af4ac:     	add	x8, sp, #0xf56
1024af4b0:     	csel	x9, x8, x9, ne
1024af4b4:     	stp	x9, x10, [sp, #0xb0]
1024af4b8:     	ldr	x8, [sp, #0xc8]
1024af4bc:     	str	x8, [sp, #0xa8]
1024af4c0:     	add	x8, sp, #0x1, lsl #12   ; =0x1000
1024af4c4:     	add	x8, x8, #0x958
1024af4c8:     	str	x8, [sp, #0xc8]
1024af4cc:     	ldr	x8, [sp, #0x78]
1024af4d0:     	add	x21, x21, x8, lsl #1
1024af4d4:     	ldr	x8, [sp, #0x90]
1024af4d8:     	add	x0, x0, x8
1024af4dc:     	add	w16, w16, #0x1
1024af4e0:     	ldr	w8, [sp, #0x174]
1024af4e4:     	cmp	w16, w8
1024af4e8:     	b.lt	0x1024aefe0
1024af4ec:     	b	0x1024aedf4
1024af4f0:     	add	x0, sp, #0x210
1024af4f4:     	bl	0x103690e78
1024af4f8:     	add	x0, sp, #0x348
1024af4fc:     	bl	0x103690e78
1024af500:     	add	x0, sp, #0x480
1024af504:     	bl	0x103690e78
1024af508:     	add	x0, sp, #0x5b8
1024af50c:     	bl	0x103690e78
1024af510:     	ldur	x8, [x29, #-0x68]
1024af514:     	adrp	x9, 0x1048c8000
1024af518:     	ldr	x9, [x9, #0x4d0]
1024af51c:     	ldr	x9, [x9]
1024af520:     	cmp	x9, x8
1024af524:     	b.ne	0x1024af54c
1024af528:     	add	sp, sp, #0x1, lsl #12   ; =0x1000
1024af52c:     	add	sp, sp, #0xb70
1024af530:     	ldp	x29, x30, [sp, #0x50]
1024af534:     	ldp	x20, x19, [sp, #0x40]
1024af538:     	ldp	x22, x21, [sp, #0x30]
1024af53c:     	ldp	x24, x23, [sp, #0x20]
1024af540:     	ldp	x26, x25, [sp, #0x10]
1024af544:     	ldp	x28, x27, [sp], #0x60
1024af548:     	ret
1024af54c:     	bl	0x103bdd4d8
1024af550:     	b	0x1024af5c0
1024af554:     	b	0x1024af5c0
1024af558:     	b	0x1024af5c0
1024af55c:     	b	0x1024af5c0
1024af560:     	b	0x1024af5c0
1024af564:     	mov	x19, x0
1024af568:     	b	0x1024af5cc
1024af56c:     	mov	x19, x0
1024af570:     	b	0x1024af5d4
1024af574:     	mov	x19, x0
1024af578:     	b	0x1024af5dc
1024af57c:     	b	0x1024af5c0
1024af580:     	b	0x1024af5c0
1024af584:     	b	0x1024af5c0
1024af588:     	b	0x1024af5c0
1024af58c:     	mov	x19, x0
1024af590:     	b	0x1024af5e4
1024af594:     	b	0x1024af5c0
1024af598:     	b	0x1024af5c0
1024af59c:     	b	0x1024af5c0
1024af5a0:     	b	0x1024af5c0
1024af5a4:     	b	0x1024af5c0
1024af5a8:     	b	0x1024af5c0
1024af5ac:     	b	0x1024af5c0
1024af5b0:     	b	0x1024af5c0
1024af5b4:     	b	0x1024af5c0
1024af5b8:     	b	0x1024af5c0
1024af5bc:     	b	0x1024af5c0
1024af5c0:     	mov	x19, x0
1024af5c4:     	add	x0, sp, #0x210
1024af5c8:     	bl	0x103690e78
1024af5cc:     	add	x0, sp, #0x348
1024af5d0:     	bl	0x103690e78
1024af5d4:     	add	x0, sp, #0x480
1024af5d8:     	bl	0x103690e78
1024af5dc:     	add	x0, sp, #0x5b8
1024af5e0:     	bl	0x103690e78
1024af5e4:     	mov	x0, x19
1024af5e8:     	bl	0x103bda970

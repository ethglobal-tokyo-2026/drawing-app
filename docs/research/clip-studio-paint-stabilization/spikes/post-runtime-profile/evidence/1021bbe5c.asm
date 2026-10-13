
FUNCTION 0x1021bbe5c size 544
1021bbe5c:     	sub	sp, sp, #0xb0
1021bbe60:     	stp	x28, x27, [sp, #0x50]
1021bbe64:     	stp	x26, x25, [sp, #0x60]
1021bbe68:     	stp	x24, x23, [sp, #0x70]
1021bbe6c:     	stp	x22, x21, [sp, #0x80]
1021bbe70:     	stp	x20, x19, [sp, #0x90]
1021bbe74:     	stp	x29, x30, [sp, #0xa0]
1021bbe78:     	add	x29, sp, #0xa0
1021bbe7c:     	mov	x20, x0
1021bbe80:     	mov	x19, x8
1021bbe84:     	ldr	x22, [x0, #0x30]
1021bbe88:     	add	x21, sp, #0x30
1021bbe8c:     	stp	xzr, x22, [sp, #0x30]
1021bbe90:     	cbz	x22, 0x1021bbf28
1021bbe94:     	ldr	w9, [x22, #0x8]
1021bbe98:     	cbz	w9, 0x1021bbf24
1021bbe9c:     	add	w10, w9, #0x1
1021bbea0:     	add	x8, x22, #0x8
1021bbea4:     	mov	x11, x9
1021bbea8:     	cas	w11, w10, [x8]
1021bbeac:     	cmp	w11, w9
1021bbeb0:     	mov	x9, x11
1021bbeb4:     	b.ne	0x1021bbe98
1021bbeb8:     	ldr	x24, [x20, #0x28]
1021bbebc:     	stp	x22, x24, [sp, #0x28]
1021bbec0:     	add	x9, sp, #0x20
1021bbec4:     	str	x24, [sp, #0x20]
1021bbec8:     	mov	w23, #0x1               ; =1
1021bbecc:     	ldadd	w23, w8, [x8]
1021bbed0:     	add	x0, x9, #0x8
1021bbed4:     	bl	0x10001022c
1021bbed8:     	cbz	x24, 0x1021bbf38
1021bbedc:     	stp	x24, x22, [x19]
1021bbee0:     	add	x8, x22, #0x8
1021bbee4:     	ldadd	w23, w8, [x8]
1021bbee8:     	add	x20, sp, #0x10
1021bbeec:     	ldr	x26, [x24, #0x30]
1021bbef0:     	stp	xzr, x26, [sp, #0x10]
1021bbef4:     	cbz	x26, 0x1021bbfa4
1021bbef8:     	ldr	w8, [x26, #0x8]
1021bbefc:     	cbz	w8, 0x1021bbfa0
1021bbf00:     	add	w9, w8, #0x1
1021bbf04:     	add	x10, x26, #0x8
1021bbf08:     	mov	x11, x8
1021bbf0c:     	cas	w11, w9, [x10]
1021bbf10:     	cmp	w11, w8
1021bbf14:     	mov	x8, x11
1021bbf18:     	b.ne	0x1021bbefc
1021bbf1c:     	ldr	x23, [x24, #0x28]
1021bbf20:     	b	0x1021bbfa8
1021bbf24:     	str	xzr, [sp, #0x38]
1021bbf28:     	add	x8, sp, #0x20
1021bbf2c:     	stp	xzr, xzr, [sp, #0x20]
1021bbf30:     	add	x0, x8, #0x8
1021bbf34:     	bl	0x10001022c
1021bbf38:     	ldr	x8, [x20, #0x20]
1021bbf3c:     	stp	xzr, x8, [x19]
1021bbf40:     	cbz	x8, 0x1021bbf78
1021bbf44:     	ldr	w9, [x8, #0x8]
1021bbf48:     	cbz	w9, 0x1021bbf74
1021bbf4c:     	add	w10, w9, #0x1
1021bbf50:     	add	x11, x8, #0x8
1021bbf54:     	mov	x12, x9
1021bbf58:     	cas	w12, w10, [x11]
1021bbf5c:     	cmp	w12, w9
1021bbf60:     	mov	x9, x12
1021bbf64:     	b.ne	0x1021bbf48
1021bbf68:     	ldr	x8, [x20, #0x18]
1021bbf6c:     	str	x8, [x19]
1021bbf70:     	b	0x1021bbf78
1021bbf74:     	str	xzr, [x19, #0x8]
1021bbf78:     	add	x0, x21, #0x8
1021bbf7c:     	bl	0x10001022c
1021bbf80:     	ldp	x29, x30, [sp, #0xa0]
1021bbf84:     	ldp	x20, x19, [sp, #0x90]
1021bbf88:     	ldp	x22, x21, [sp, #0x80]
1021bbf8c:     	ldp	x24, x23, [sp, #0x70]
1021bbf90:     	ldp	x26, x25, [sp, #0x60]
1021bbf94:     	ldp	x28, x27, [sp, #0x50]
1021bbf98:     	add	sp, sp, #0xb0
1021bbf9c:     	ret
1021bbfa0:     	mov	x26, #0x0               ; =0
1021bbfa4:     	mov	x23, #0x0               ; =0
1021bbfa8:     	add	x22, sp, #0x40
1021bbfac:     	stp	xzr, xzr, [sp, #0x10]
1021bbfb0:     	ldr	x8, [sp, #0x38]
1021bbfb4:     	stp	x23, x26, [sp, #0x30]
1021bbfb8:     	stp	x24, x8, [sp, #0x40]
1021bbfbc:     	add	x0, x22, #0x8
1021bbfc0:     	bl	0x10001022c
1021bbfc4:     	add	x0, x20, #0x8
1021bbfc8:     	bl	0x10001022c
1021bbfcc:     	mov	x24, sp
1021bbfd0:     	mov	w25, #0x1               ; =1
1021bbfd4:     	stp	x23, x26, [sp]
1021bbfd8:     	cbz	x26, 0x1021bbfe4
1021bbfdc:     	add	x8, x26, #0x8
1021bbfe0:     	ldadd	w25, w8, [x8]
1021bbfe4:     	add	x0, x24, #0x8
1021bbfe8:     	bl	0x10001022c
1021bbfec:     	cbz	x23, 0x1021bbf78
1021bbff0:     	ldr	x27, [sp, #0x38]
1021bbff4:     	cbz	x27, 0x1021bc000
1021bbff8:     	add	x8, x27, #0x8
1021bbffc:     	ldadd	w25, w8, [x8]
1021bc000:     	ldr	q0, [x19]
1021bc004:     	stp	x23, x27, [x19]
1021bc008:     	str	q0, [sp, #0x40]
1021bc00c:     	orr	x0, x22, #0x8
1021bc010:     	bl	0x10001022c
1021bc014:     	ldr	x8, [x23, #0x30]
1021bc018:     	stp	xzr, x8, [sp, #0x10]
1021bc01c:     	cbz	x8, 0x1021bc050
1021bc020:     	ldr	w9, [x8, #0x8]
1021bc024:     	cbz	w9, 0x1021bc050
1021bc028:     	add	w10, w9, #0x1
1021bc02c:     	add	x11, x8, #0x8
1021bc030:     	mov	x12, x9
1021bc034:     	cas	w12, w10, [x11]
1021bc038:     	cmp	w12, w9
1021bc03c:     	mov	x9, x12
1021bc040:     	b.ne	0x1021bc024
1021bc044:     	ldr	x28, [x23, #0x28]
1021bc048:     	ldr	x26, [sp, #0x18]
1021bc04c:     	b	0x1021bc058
1021bc050:     	mov	x26, #0x0               ; =0
1021bc054:     	mov	x28, #0x0               ; =0
1021bc058:     	stp	xzr, xzr, [sp, #0x10]
1021bc05c:     	stp	x28, x26, [sp, #0x30]
1021bc060:     	stp	x23, x27, [sp, #0x40]
1021bc064:     	add	x0, x22, #0x8
1021bc068:     	bl	0x10001022c
1021bc06c:     	add	x0, x20, #0x8
1021bc070:     	bl	0x10001022c
1021bc074:     	mov	x23, x28
1021bc078:     	b	0x1021bbfd4

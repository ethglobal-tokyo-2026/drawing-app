
FUNCTION 0x1024aff24 size 316
1024aff24:     	stp	d9, d8, [sp, #-0x40]!
1024aff28:     	stp	x22, x21, [sp, #0x10]
1024aff2c:     	stp	x20, x19, [sp, #0x20]
1024aff30:     	stp	x29, x30, [sp, #0x30]
1024aff34:     	add	x29, sp, #0x30
1024aff38:     	mov	x21, x3
1024aff3c:     	mov	x19, x2
1024aff40:     	mov	x22, x1
1024aff44:     	fmov	d8, d0
1024aff48:     	mov	x20, x0
1024aff4c:     	ldr	w8, [x0, #0x8]
1024aff50:     	tbz	w8, #0x4, 0x1024aff80
1024aff54:     	ldr	x0, [x20, #0x28]
1024aff58:     	cbz	x0, 0x1024aff80
1024aff5c:     	ldr	d0, [x19, #0x10]
1024aff60:     	bl	0x1024a9bb4
1024aff64:     	ldr	s1, [x20, #0xc]
1024aff68:     	fcvt	d1, s1
1024aff6c:     	fmov	d2, #1.00000000
1024aff70:     	fsub	d2, d2, d1
1024aff74:     	fmadd	d0, d2, d0, d1
1024aff78:     	fmul	d8, d0, d8
1024aff7c:     	ldr	w8, [x20, #0x8]
1024aff80:     	tbz	w8, #0x5, 0x1024affb0
1024aff84:     	ldr	x0, [x20, #0x38]
1024aff88:     	cbz	x0, 0x1024affb0
1024aff8c:     	ldr	d0, [x19, #0x18]
1024aff90:     	bl	0x1024a9bb4
1024aff94:     	ldp	s1, s2, [x20, #0x10]
1024aff98:     	fcvt	d3, s1
1024aff9c:     	fsub	s1, s2, s1
1024affa0:     	fcvt	d1, s1
1024affa4:     	fmadd	d0, d1, d0, d3
1024affa8:     	fmul	d8, d8, d0
1024affac:     	ldr	w8, [x20, #0x8]
1024affb0:     	tbz	w8, #0x6, 0x1024affe0
1024affb4:     	ldr	x0, [x20, #0x48]
1024affb8:     	cbz	x0, 0x1024affe0
1024affbc:     	ldr	d0, [x19, #0x20]
1024affc0:     	bl	0x1024a9bb4
1024affc4:     	ldr	s1, [x20, #0x18]
1024affc8:     	fcvt	d1, s1
1024affcc:     	fmov	d2, #1.00000000
1024affd0:     	fsub	d2, d2, d1
1024affd4:     	fmadd	d0, d2, d0, d1
1024affd8:     	fmul	d8, d8, d0
1024affdc:     	ldr	w8, [x20, #0x8]
1024affe0:     	cbz	w22, 0x1024b0028
1024affe4:     	tbz	w8, #0x7, 0x1024b0028
1024affe8:     	ldr	w8, [x21]
1024affec:     	mov	w9, #0x4e6d             ; =20077
1024afff0:     	movk	w9, #0x41c6, lsl #16
1024afff4:     	mov	w10, #0xd687            ; =54919
1024afff8:     	movk	w10, #0x12, lsl #16
1024afffc:     	madd	w8, w8, w9, w10
1024b0000:     	str	w8, [x21]
1024b0004:     	ubfx	w8, w8, #16, #15
1024b0008:     	ucvtf	d0, w8, #0xf
1024b000c:     	ldr	s1, [x20, #0x1c]
1024b0010:     	fcvt	d1, s1
1024b0014:     	fmov	d2, #1.00000000
1024b0018:     	fsub	d2, d2, d1
1024b001c:     	fmadd	d0, d2, d0, d1
1024b0020:     	fmul	d8, d8, d0
1024b0024:     	ldr	w8, [x20, #0x8]
1024b0028:     	tbz	w8, #0x8, 0x1024b0048
1024b002c:     	ldr	s0, [x20, #0x20]
1024b0030:     	fcvt	d0, s0
1024b0034:     	fmov	d1, #1.00000000
1024b0038:     	fsub	d1, d1, d0
1024b003c:     	ldr	d2, [x19, #0x30]
1024b0040:     	fmadd	d0, d1, d2, d0
1024b0044:     	fmul	d8, d8, d0
1024b0048:     	fmov	d0, d8
1024b004c:     	ldp	x29, x30, [sp, #0x30]
1024b0050:     	ldp	x20, x19, [sp, #0x20]
1024b0054:     	ldp	x22, x21, [sp, #0x10]
1024b0058:     	ldp	d9, d8, [sp], #0x40
1024b005c:     	ret

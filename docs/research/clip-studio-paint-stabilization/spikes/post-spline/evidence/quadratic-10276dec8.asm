
FUNCTION 0x10276dec8 size 288
10276dec8:     	sub	sp, sp, #0xa0
10276decc:     	stp	d9, d8, [sp, #0x60]
10276ded0:     	stp	x22, x21, [sp, #0x70]
10276ded4:     	stp	x20, x19, [sp, #0x80]
10276ded8:     	stp	x29, x30, [sp, #0x90]
10276dedc:     	add	x29, sp, #0x90
10276dee0:     	fmov	d9, d1
10276dee4:     	fmov	d8, d0
10276dee8:     	mov	x19, x0
10276deec:     	ldr	x20, [x0, #0x28]
10276def0:     	cbz	x20, 0x10276df6c
10276def4:     	str	xzr, [sp, #0x50]
10276def8:     	add	x1, sp, #0x8
10276defc:     	mov	x0, x19
10276df00:     	fmov	d0, d8
10276df04:     	bl	0x10276b714
10276df08:     	adrp	x8, 0x1042e3000
10276df0c:     	ldr	d0, [x8, #0x690]
10276df10:     	fcmp	d9, d0
10276df14:     	b.le	0x10276df58
10276df18:     	fmul	d0, d9, d9
10276df1c:     	ldp	d3, d4, [x20, #0x8]
10276df20:     	ldp	d1, d2, [sp, #0x8]
10276df24:     	fsub	d3, d3, d1
10276df28:     	fsub	d4, d4, d2
10276df2c:     	fmul	d4, d4, d4
10276df30:     	fmadd	d3, d3, d3, d4
10276df34:     	fcmp	d3, d0
10276df38:     	b.mi	0x10276df80
10276df3c:     	ldp	d3, d4, [x19, #0x8]
10276df40:     	fsub	d1, d3, d1
10276df44:     	fsub	d2, d4, d2
10276df48:     	fmul	d2, d2, d2
10276df4c:     	fmadd	d1, d1, d1, d2
10276df50:     	fcmp	d1, d0
10276df54:     	b.mi	0x10276df80
10276df58:     	ldr	x1, [x19, #0x28]
10276df5c:     	ldr	x0, [x19, #0x38]
10276df60:     	cbz	x1, 0x10276df88
10276df64:     	bl	0x1027817d0
10276df68:     	b	0x10276df8c
10276df6c:     	ldr	x8, [x19, #0x38]
10276df70:     	ldrb	w9, [x8, #0x21]
10276df74:     	tbz	w9, #0x0, 0x10276df80
10276df78:     	ldr	x20, [x8, #0x30]
10276df7c:     	cbnz	x20, 0x10276def4
10276df80:     	mov	x21, #0x0               ; =0
10276df84:     	b	0x10276dfcc
10276df88:     	bl	0x102781770
10276df8c:     	mov	x21, x0
10276df90:     	add	x1, sp, #0x8
10276df94:     	bl	0x10276b190
10276df98:     	ldr	x8, [x21, #0x38]
10276df9c:     	ldrb	w8, [x8, #0x20]
10276dfa0:     	tbz	w8, #0x4, 0x10276dfb0
10276dfa4:     	ldr	w8, [x21, #0x40]
10276dfa8:     	orr	w8, w8, #0x1
10276dfac:     	str	w8, [x21, #0x40]
10276dfb0:     	ldr	x8, [x19]
10276dfb4:     	ldr	x8, [x8, #0x108]
10276dfb8:     	mov	x0, x19
10276dfbc:     	mov	x1, x21
10276dfc0:     	mov	x2, x20
10276dfc4:     	fmov	d0, d8
10276dfc8:     	blr	x8
10276dfcc:     	mov	x0, x21
10276dfd0:     	ldp	x29, x30, [sp, #0x90]
10276dfd4:     	ldp	x20, x19, [sp, #0x80]
10276dfd8:     	ldp	x22, x21, [sp, #0x70]
10276dfdc:     	ldp	d9, d8, [sp, #0x60]
10276dfe0:     	add	sp, sp, #0xa0
10276dfe4:     	ret


FUNCTION 0x102781eb0 size 420
102781eb0:     	sub	sp, sp, #0xa0
102781eb4:     	stp	d11, d10, [sp, #0x20]
102781eb8:     	stp	d9, d8, [sp, #0x30]
102781ebc:     	stp	x28, x27, [sp, #0x40]
102781ec0:     	stp	x26, x25, [sp, #0x50]
102781ec4:     	stp	x24, x23, [sp, #0x60]
102781ec8:     	stp	x22, x21, [sp, #0x70]
102781ecc:     	stp	x20, x19, [sp, #0x80]
102781ed0:     	stp	x29, x30, [sp, #0x90]
102781ed4:     	add	x29, sp, #0x90
102781ed8:     	fmov	d8, d1
102781edc:     	fmov	d9, d0
102781ee0:     	ldr	d0, [x1]
102781ee4:     	fadd	d1, d9, d0
102781ee8:     	ldr	w8, [x0, #0x50]
102781eec:     	scvtf	d2, w8
102781ef0:     	fcmp	d1, d2
102781ef4:     	b.mi	0x102781f34
102781ef8:     	fadd	d2, d8, d0
102781efc:     	ldr	w8, [x0, #0x54]
102781f00:     	scvtf	d3, w8
102781f04:     	fcmp	d2, d3
102781f08:     	b.mi	0x102781f34
102781f0c:     	fsub	d3, d9, d0
102781f10:     	ldr	w8, [x0, #0x58]
102781f14:     	scvtf	d4, w8
102781f18:     	fcmp	d3, d4
102781f1c:     	b.gt	0x102781f34
102781f20:     	fsub	d4, d8, d0
102781f24:     	ldr	w8, [x0, #0x5c]
102781f28:     	scvtf	d5, w8
102781f2c:     	fcmp	d4, d5
102781f30:     	b.le	0x102781f64
102781f34:     	mov	w25, #0x0               ; =0
102781f38:     	mov	x0, x25
102781f3c:     	ldp	x29, x30, [sp, #0x90]
102781f40:     	ldp	x20, x19, [sp, #0x80]
102781f44:     	ldp	x22, x21, [sp, #0x70]
102781f48:     	ldp	x24, x23, [sp, #0x60]
102781f4c:     	ldp	x26, x25, [sp, #0x50]
102781f50:     	ldp	x28, x27, [sp, #0x40]
102781f54:     	ldp	d9, d8, [sp, #0x30]
102781f58:     	ldp	d11, d10, [sp, #0x20]
102781f5c:     	add	sp, sp, #0xa0
102781f60:     	ret
102781f64:     	mov	x24, x2
102781f68:     	mov	w25, #0x0               ; =0
102781f6c:     	fcmp	d3, #0.0
102781f70:     	adrp	x8, 0x1042e3000
102781f74:     	ldr	d6, [x8, #0x690]
102781f78:     	adrp	x8, 0x1042fe000
102781f7c:     	ldr	d7, [x8, #0xd20]
102781f80:     	fcsel	d5, d7, d6, mi
102781f84:     	fcmp	d4, #0.0
102781f88:     	fcsel	d6, d7, d6, mi
102781f8c:     	cbz	x2, 0x102781f38
102781f90:     	mov	x23, x3
102781f94:     	cmp	x24, x3
102781f98:     	b.eq	0x102781f38
102781f9c:     	mov	x21, x5
102781fa0:     	mov	x22, x4
102781fa4:     	mov	x20, x1
102781fa8:     	str	x6, [sp, #0x8]
102781fac:     	mov	w25, #0x0               ; =0
102781fb0:     	fadd	d3, d3, d5
102781fb4:     	fcvtzs	w26, d3
102781fb8:     	fadd	d3, d4, d6
102781fbc:     	fcvtzs	w27, d3
102781fc0:     	fcvtps	w28, d1
102781fc4:     	fcvtps	w19, d2
102781fc8:     	fmul	d10, d0, d0
102781fcc:     	ldp	w9, w8, [x24, #0x18]
102781fd0:     	ldp	w11, w10, [x24, #0x20]
102781fd4:     	cmp	w26, w11
102781fd8:     	ccmp	w28, w9, #0x4, lt
102781fdc:     	ccmp	w27, w10, #0x0, gt
102781fe0:     	ccmp	w19, w8, #0x4, lt
102781fe4:     	b.le	0x102782034
102781fe8:     	add	x1, sp, #0x10
102781fec:     	mov	x0, x24
102781ff0:     	fmov	d0, d9
102781ff4:     	fmov	d1, d8
102781ff8:     	bl	0x10276bab4
102781ffc:     	ldp	d1, d2, [sp, #0x10]
102782000:     	fsub	d1, d1, d9
102782004:     	fsub	d2, d2, d8
102782008:     	fmul	d2, d2, d2
10278200c:     	fmadd	d1, d1, d1, d2
102782010:     	fcmp	d1, d10
102782014:     	b.pl	0x102782034
102782018:     	ldr	q2, [sp, #0x10]
10278201c:     	str	q2, [x22]
102782020:     	str	x24, [x21]
102782024:     	ldr	x8, [sp, #0x8]
102782028:     	str	d0, [x8]
10278202c:     	mov	w25, #0x1               ; =1
102782030:     	fmov	d10, d1
102782034:     	ldr	x24, [x24, #0x28]
102782038:     	cmp	x24, #0x0
10278203c:     	ccmp	x24, x23, #0x4, ne
102782040:     	b.ne	0x102781fcc
102782044:     	cbz	w25, 0x102781f38
102782048:     	fsqrt	d0, d10
10278204c:     	str	d0, [x20]
102782050:     	b	0x102781f38

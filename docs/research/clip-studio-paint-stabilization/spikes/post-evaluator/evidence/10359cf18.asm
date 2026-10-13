
FUNCTION 0x10359cf18 size 312
10359cf18:     	sub	sp, sp, #0x60
10359cf1c:     	stp	d11, d10, [sp, #0x20]
10359cf20:     	stp	d9, d8, [sp, #0x30]
10359cf24:     	stp	x20, x19, [sp, #0x40]
10359cf28:     	stp	x29, x30, [sp, #0x50]
10359cf2c:     	add	x29, sp, #0x50
10359cf30:     	mov	x20, x1
10359cf34:     	mov	x19, x0
10359cf38:     	fmov	d8, d5
10359cf3c:     	fmov	d9, d3
10359cf40:     	fmov	d10, d1
10359cf44:     	adrp	x8, 0x1048c8000
10359cf48:     	ldr	x8, [x8, #0x4d0]
10359cf4c:     	ldr	x8, [x8]
10359cf50:     	str	x8, [sp, #0x18]
10359cf54:     	fmov	d1, #-2.00000000
10359cf58:     	fmadd	d3, d2, d1, d0
10359cf5c:     	fadd	d3, d3, d4
10359cf60:     	fadd	d2, d2, d2
10359cf64:     	fmadd	d1, d0, d1, d2
10359cf68:     	fsub	d2, d0, d6
10359cf6c:     	add	x0, sp, #0x8
10359cf70:     	fmov	d0, d3
10359cf74:     	bl	0x10359b494
10359cf78:     	cmp	w0, #0x1
10359cf7c:     	b.lt	0x10359cfa0
10359cf80:     	mov	x8, x0
10359cf84:     	ldr	d0, [sp, #0x8]
10359cf88:     	fcmp	d0, #0.0
10359cf8c:     	fmov	d1, #1.00000000
10359cf90:     	fccmp	d0, d1, #0x0, ge
10359cf94:     	b.mi	0x10359cfa8
10359cf98:     	mov	w0, #0x0                ; =0
10359cf9c:     	b	0x10359cfd4
10359cfa0:     	mov	w0, #0x0                ; =0
10359cfa4:     	b	0x10359d01c
10359cfa8:     	str	d0, [x20]
10359cfac:     	fsub	d1, d1, d0
10359cfb0:     	fmul	d2, d1, d1
10359cfb4:     	fadd	d1, d1, d1
10359cfb8:     	fmul	d1, d0, d1
10359cfbc:     	fmul	d0, d0, d0
10359cfc0:     	fmul	d1, d9, d1
10359cfc4:     	fmadd	d1, d2, d10, d1
10359cfc8:     	fmadd	d0, d0, d8, d1
10359cfcc:     	str	d0, [x19]
10359cfd0:     	mov	w0, #0x1                ; =1
10359cfd4:     	cmp	w8, #0x2
10359cfd8:     	b.ne	0x10359d01c
10359cfdc:     	ldr	d0, [sp, #0x10]
10359cfe0:     	fcmp	d0, #0.0
10359cfe4:     	fmov	d1, #1.00000000
10359cfe8:     	fccmp	d0, d1, #0x0, ge
10359cfec:     	b.pl	0x10359d01c
10359cff0:     	str	d0, [x20, w0, uxtw #3]
10359cff4:     	fsub	d1, d1, d0
10359cff8:     	fmul	d2, d1, d1
10359cffc:     	fadd	d1, d1, d1
10359d000:     	fmul	d1, d0, d1
10359d004:     	fmul	d0, d0, d0
10359d008:     	fmul	d1, d9, d1
10359d00c:     	fmadd	d1, d2, d10, d1
10359d010:     	fmadd	d0, d0, d8, d1
10359d014:     	str	d0, [x19, w0, uxtw #3]
10359d018:     	add	w0, w0, #0x1
10359d01c:     	ldr	x8, [sp, #0x18]
10359d020:     	adrp	x9, 0x1048c8000
10359d024:     	ldr	x9, [x9, #0x4d0]
10359d028:     	ldr	x9, [x9]
10359d02c:     	cmp	x9, x8
10359d030:     	b.ne	0x10359d04c
10359d034:     	ldp	x29, x30, [sp, #0x50]
10359d038:     	ldp	x20, x19, [sp, #0x40]
10359d03c:     	ldp	d9, d8, [sp, #0x30]
10359d040:     	ldp	d11, d10, [sp, #0x20]
10359d044:     	add	sp, sp, #0x60
10359d048:     	ret
10359d04c:     	bl	0x103bdd4d8

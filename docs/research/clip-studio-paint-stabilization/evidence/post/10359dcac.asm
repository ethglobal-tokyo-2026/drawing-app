10359dcac:     	sub	sp, sp, #0x80
10359dcb0:     	stp	d15, d14, [sp, #0x20]
10359dcb4:     	stp	d13, d12, [sp, #0x30]
10359dcb8:     	stp	d11, d10, [sp, #0x40]
10359dcbc:     	stp	d9, d8, [sp, #0x50]
10359dcc0:     	stp	x20, x19, [sp, #0x60]
10359dcc4:     	stp	x29, x30, [sp, #0x70]
10359dcc8:     	add	x29, sp, #0x70
10359dccc:     	mov	x19, x0
10359dcd0:     	fmov	d12, d5
10359dcd4:     	fmov	d13, d4
10359dcd8:     	fmov	d8, d3
10359dcdc:     	fmov	d11, d2
10359dce0:     	fmov	d14, d1
10359dce4:     	fmov	d15, d0
10359dce8:     	fmul	d0, d5, d7
10359dcec:     	fmadd	d0, d4, d6, d0
10359dcf0:     	adrp	x8, 0x1044bd000
10359dcf4:     	ldr	d1, [x8, #0x850]
10359dcf8:     	fcmp	d0, d1
10359dcfc:     	b.le	0x10359dd44
10359dd00:     	fadd	d0, d15, d11
10359dd04:     	fadd	d1, d14, d8
10359dd08:     	fmov	d2, #0.50000000
10359dd0c:     	fmul	d0, d0, d2
10359dd10:     	fmul	d1, d1, d2
10359dd14:     	stp	d0, d1, [x19]
10359dd18:     	fadd	d2, d15, d13
10359dd1c:     	fadd	d3, d14, d12
10359dd20:     	fmov	d0, d15
10359dd24:     	fmov	d1, d14
10359dd28:     	fmov	d4, d11
10359dd2c:     	fmov	d5, d8
10359dd30:     	bl	0x102193758
10359dd34:     	fmov	d1, #1.00000000
10359dd38:     	fcmp	d0, d1
10359dd3c:     	cset	w0, mi
10359dd40:     	b	0x10359ddec
10359dd44:     	adrp	x8, 0x10433f000
10359dd48:     	ldr	d1, [x8, #0x708]
10359dd4c:     	fcmp	d0, d1
10359dd50:     	b.le	0x10359dde8
10359dd54:     	fmov	d10, d7
10359dd58:     	fmov	d9, d6
10359dd5c:     	fadd	d2, d15, d13
10359dd60:     	fadd	d3, d14, d12
10359dd64:     	fadd	d6, d11, d6
10359dd68:     	fadd	d7, d8, d7
10359dd6c:     	fmov	d0, d15
10359dd70:     	fmov	d1, d14
10359dd74:     	fmov	d4, d11
10359dd78:     	fmov	d5, d8
10359dd7c:     	mov	x0, x19
10359dd80:     	bl	0x102193b84
10359dd84:     	cbz	w0, 0x10359ddec
10359dd88:     	ldp	d2, d3, [x19]
10359dd8c:     	add	x0, sp, #0x10
10359dd90:     	fmov	d0, d15
10359dd94:     	fmov	d1, d14
10359dd98:     	bl	0x1021939b4
10359dd9c:     	cbz	w0, 0x10359ddb4
10359dda0:     	ldp	d0, d1, [sp, #0x10]
10359dda4:     	fmul	d1, d12, d1
10359dda8:     	fmadd	d0, d13, d0, d1
10359ddac:     	fcmp	d0, #0.0
10359ddb0:     	b.le	0x10359dde8
10359ddb4:     	ldp	d2, d3, [x19]
10359ddb8:     	mov	x0, sp
10359ddbc:     	fmov	d0, d11
10359ddc0:     	fmov	d1, d8
10359ddc4:     	bl	0x1021939b4
10359ddc8:     	cbz	w0, 0x10359dde0
10359ddcc:     	ldp	d0, d1, [sp]
10359ddd0:     	fmul	d1, d10, d1
10359ddd4:     	fmadd	d0, d9, d0, d1
10359ddd8:     	fcmp	d0, #0.0
10359dddc:     	b.pl	0x10359dde8
10359dde0:     	mov	w0, #0x1                ; =1
10359dde4:     	b	0x10359ddec
10359dde8:     	mov	w0, #0x0                ; =0
10359ddec:     	ldp	x29, x30, [sp, #0x70]
10359ddf0:     	ldp	x20, x19, [sp, #0x60]
10359ddf4:     	ldp	d9, d8, [sp, #0x50]
10359ddf8:     	ldp	d11, d10, [sp, #0x40]
10359ddfc:     	ldp	d13, d12, [sp, #0x30]
10359de00:     	ldp	d15, d14, [sp, #0x20]
10359de04:     	add	sp, sp, #0x80
10359de08:     	ret
10359de0c:     	sub	sp, sp, #0x80
10359de10:     	stp	d11, d10, [sp, #0x50]
10359de14:     	stp	d9, d8, [sp, #0x60]
10359de18:     	stp	x29, x30, [sp, #0x70]
10359de1c:     	add	x29, sp, #0x70
10359de20:     	fmov	d8, d0
10359de24:     	adrp	x8, 0x1048c8000
10359de28:     	ldr	x8, [x8, #0x4d0]
10359de2c:     	ldr	x8, [x8]
10359de30:     	stur	x8, [x29, #-0x28]
10359de34:     	subs	w10, w0, #0x2
10359de38:     	b.ne	0x10359de74
10359de3c:     	ldp	d0, d1, [x1]
10359de40:     	ldp	d2, d3, [x1, #0x10]
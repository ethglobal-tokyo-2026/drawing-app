
FUNCTION 0x102e1dad0 size 7444
102e1dad0:     	stp	d9, d8, [sp, #-0x70]!
102e1dad4:     	stp	x28, x27, [sp, #0x10]
102e1dad8:     	stp	x26, x25, [sp, #0x20]
102e1dadc:     	stp	x24, x23, [sp, #0x30]
102e1dae0:     	stp	x22, x21, [sp, #0x40]
102e1dae4:     	stp	x20, x19, [sp, #0x50]
102e1dae8:     	stp	x29, x30, [sp, #0x60]
102e1daec:     	add	x29, sp, #0x60
102e1daf0:     	sub	sp, sp, #0x2f0
102e1daf4:     	fmov	d8, d0
102e1daf8:     	str	w7, [sp, #0x1c]
102e1dafc:     	mov	x26, x6
102e1db00:     	mov	x24, x5
102e1db04:     	mov	x25, x4
102e1db08:     	mov	x27, x3
102e1db0c:     	mov	x23, x2
102e1db10:     	mov	x20, x1
102e1db14:     	mov	x19, x0
102e1db18:     	ldp	x9, x8, [x4]
102e1db1c:     	str	x9, [sp, #0x208]
102e1db20:     	str	x8, [sp, #0x210]
102e1db24:     	cbz	x8, 0x102e1db34
102e1db28:     	add	x8, x8, #0x8
102e1db2c:     	mov	w9, #0x1                ; =1
102e1db30:     	ldadd	w9, w8, [x8]
102e1db34:     	ldp	x9, x8, [x25, #0x10]
102e1db38:     	str	x9, [sp, #0x218]
102e1db3c:     	str	x8, [sp, #0x220]
102e1db40:     	cbz	x8, 0x102e1db50
102e1db44:     	add	x8, x8, #0x8
102e1db48:     	mov	w9, #0x1                ; =1
102e1db4c:     	ldadd	w9, w8, [x8]
102e1db50:     	ldp	x9, x8, [x25, #0x20]
102e1db54:     	str	x9, [sp, #0x228]
102e1db58:     	str	x8, [sp, #0x230]
102e1db5c:     	cbz	x8, 0x102e1db6c
102e1db60:     	add	x8, x8, #0x8
102e1db64:     	mov	w9, #0x1                ; =1
102e1db68:     	ldadd	w9, w8, [x8]
102e1db6c:     	ldp	x9, x8, [x25, #0x30]
102e1db70:     	str	x9, [sp, #0x238]
102e1db74:     	str	x8, [sp, #0x240]
102e1db78:     	cbz	x8, 0x102e1db88
102e1db7c:     	add	x8, x8, #0x8
102e1db80:     	mov	w9, #0x1                ; =1
102e1db84:     	ldadd	w9, w8, [x8]
102e1db88:     	ldp	x9, x8, [x25, #0x40]
102e1db8c:     	str	x9, [sp, #0x248]
102e1db90:     	str	x8, [sp, #0x250]
102e1db94:     	cbz	x8, 0x102e1dba4
102e1db98:     	add	x8, x8, #0x8
102e1db9c:     	mov	w9, #0x1                ; =1
102e1dba0:     	ldadd	w9, w8, [x8]
102e1dba4:     	add	x28, sp, #0x208
102e1dba8:     	ldp	x9, x8, [x25, #0x50]
102e1dbac:     	str	x9, [sp, #0x258]
102e1dbb0:     	str	x8, [sp, #0x260]
102e1dbb4:     	cbz	x8, 0x102e1dbc4
102e1dbb8:     	add	x8, x8, #0x8
102e1dbbc:     	mov	w9, #0x1                ; =1
102e1dbc0:     	ldadd	w9, w8, [x8]
102e1dbc4:     	ldp	q0, q1, [x25, #0xa0]
102e1dbc8:     	stp	q0, q1, [x28, #0xa0]
102e1dbcc:     	ldr	q0, [x25, #0xc0]
102e1dbd0:     	str	q0, [x28, #0xc0]
102e1dbd4:     	ldr	x8, [x25, #0xd0]
102e1dbd8:     	str	x8, [sp, #0x2d8]
102e1dbdc:     	ldp	q0, q1, [x25, #0x60]
102e1dbe0:     	stp	q0, q1, [x28, #0x60]
102e1dbe4:     	ldp	q0, q1, [x25, #0x80]
102e1dbe8:     	stp	q0, q1, [x28, #0x80]
102e1dbec:     	ldr	x9, [x20]
102e1dbf0:     	mov	x22, x20
102e1dbf4:     	ldr	x8, [x22, #0x8]!
102e1dbf8:     	stp	x9, x8, [sp, #0x1f8]
102e1dbfc:     	cbz	x8, 0x102e1dc0c
102e1dc00:     	add	x8, x8, #0x8
102e1dc04:     	mov	w9, #0x1                ; =1
102e1dc08:     	ldadd	w9, w8, [x8]
102e1dc0c:     	add	x21, sp, #0x1f8
102e1dc10:     	add	x0, sp, #0x1f8
102e1dc14:     	add	x8, sp, #0x208
102e1dc18:     	add	x1, x8, #0x60
102e1dc1c:     	bl	0x1029915fc
102e1dc20:     	str	d0, [sp, #0x288]
102e1dc24:     	str	d1, [sp, #0x290]
102e1dc28:     	add	x0, x21, #0x8
102e1dc2c:     	bl	0x10001022c
102e1dc30:     	ldr	w8, [x25, #0xc0]
102e1dc34:     	cbz	w8, 0x102e1dd88
102e1dc38:     	ldp	x8, x9, [x19, #0xd0]
102e1dc3c:     	stp	x8, x9, [sp, #0x70]
102e1dc40:     	cbz	x9, 0x102e1dc50
102e1dc44:     	add	x9, x9, #0x8
102e1dc48:     	mov	w10, #0x1               ; =1
102e1dc4c:     	ldadd	w10, w9, [x9]
102e1dc50:     	add	x21, sp, #0x70
102e1dc54:     	cbz	x8, 0x102e1e300
102e1dc58:     	adrp	x0, 0x104d65000
102e1dc5c:     	add	x0, x0, #0x1f0
102e1dc60:     	bl	0x10214de74
102e1dc64:     	cmp	w0, w24
102e1dc68:     	b.ne	0x102e1e300
102e1dc6c:     	ldr	x0, [sp, #0x70]
102e1dc70:     	bl	0x102e10eb4
102e1dc74:     	cbz	w0, 0x102e1e2ec
102e1dc78:     	ldr	x0, [x19, #0x350]
102e1dc7c:     	cbz	x0, 0x102e1dd04
102e1dc80:     	bl	0x1029ff614
102e1dc84:     	cbz	w0, 0x102e1dd04
102e1dc88:     	ldr	w8, [x19, #0x370]
102e1dc8c:     	cbnz	w8, 0x102e1dd04
102e1dc90:     	ldr	x0, [x19, #0x350]
102e1dc94:     	ldp	x9, x8, [x20]
102e1dc98:     	stp	x9, x8, [sp, #0x1e8]
102e1dc9c:     	cbz	x8, 0x102e1dcac
102e1dca0:     	add	x8, x8, #0x8
102e1dca4:     	mov	w9, #0x1                ; =1
102e1dca8:     	ldadd	w9, w8, [x8]
102e1dcac:     	ldr	d0, [sp, #0x298]
102e1dcb0:     	ldr	d1, [sp, #0x2a0]
102e1dcb4:     	fcmp	d0, #0.0
102e1dcb8:     	adrp	x8, 0x1042e3000
102e1dcbc:     	ldr	d2, [x8, #0x690]
102e1dcc0:     	adrp	x8, 0x1042fe000
102e1dcc4:     	ldr	d3, [x8, #0xd20]
102e1dcc8:     	fcsel	d4, d3, d2, mi
102e1dccc:     	fadd	d0, d0, d4
102e1dcd0:     	add	x20, sp, #0x1e8
102e1dcd4:     	fcvtzs	w8, d0
102e1dcd8:     	fcmp	d1, #0.0
102e1dcdc:     	fcsel	d0, d3, d2, mi
102e1dce0:     	fadd	d0, d1, d0
102e1dce4:     	fcvtzs	w9, d0
102e1dce8:     	orr	x8, x8, x9, lsl #32
102e1dcec:     	str	x8, [sp, #0x1d0]
102e1dcf0:     	add	x1, sp, #0x1e8
102e1dcf4:     	add	x2, sp, #0x1d0
102e1dcf8:     	bl	0x1029fb9a4
102e1dcfc:     	add	x0, x20, #0x8
102e1dd00:     	bl	0x10001022c
102e1dd04:     	add	x22, sp, #0x1d0
102e1dd08:     	add	x8, sp, #0x1d0
102e1dd0c:     	mov	x0, x19
102e1dd10:     	bl	0x102e1b69c
102e1dd14:     	ldr	x20, [sp, #0x1d0]
102e1dd18:     	add	x0, x22, #0x8
102e1dd1c:     	bl	0x10001022c
102e1dd20:     	ldr	w8, [x19, #0xa8]
102e1dd24:     	cmp	w8, #0x1
102e1dd28:     	b.ne	0x102e1dd34
102e1dd2c:     	ldr	w8, [x19, #0x1d8]
102e1dd30:     	cbz	w8, 0x102e1e430
102e1dd34:     	mov	w22, #0x0               ; =0
102e1dd38:     	ldr	w8, [x19, #0x224]
102e1dd3c:     	cbz	w8, 0x102e1dd4c
102e1dd40:     	add	x1, sp, #0x208
102e1dd44:     	mov	x0, x19
102e1dd48:     	bl	0x102e1c53c
102e1dd4c:     	cmp	x20, #0x0
102e1dd50:     	csinc	w8, w22, wzr, ne
102e1dd54:     	tbnz	w8, #0x0, 0x102e1dd70
102e1dd58:     	ldr	x8, [x20]
102e1dd5c:     	ldr	x8, [x8, #0x60]
102e1dd60:     	add	x1, sp, #0x208
102e1dd64:     	mov	x0, x20
102e1dd68:     	mov	w2, #0x0                ; =0
102e1dd6c:     	blr	x8
102e1dd70:     	ldr	w8, [x19, #0x224]
102e1dd74:     	cbz	w8, 0x102e1e300
102e1dd78:     	add	x1, sp, #0x208
102e1dd7c:     	mov	x0, x19
102e1dd80:     	bl	0x102e1f874
102e1dd84:     	b	0x102e1e300
102e1dd88:     	ldr	w8, [x19, #0xa8]
102e1dd8c:     	cbz	w8, 0x102e1dd98
102e1dd90:     	ldr	w8, [x19, #0x22c]
102e1dd94:     	cbz	w8, 0x102e1e2d4
102e1dd98:     	adrp	x0, 0x104d65000
102e1dd9c:     	add	x0, x0, #0x250
102e1dda0:     	bl	0x10214de74
102e1dda4:     	cmp	w0, w24
102e1dda8:     	b.eq	0x102e1de10
102e1ddac:     	adrp	x0, 0x104d65000
102e1ddb0:     	add	x0, x0, #0x2b0
102e1ddb4:     	bl	0x10214de74
102e1ddb8:     	cmp	w0, w24
102e1ddbc:     	b.eq	0x102e1de10
102e1ddc0:     	adrp	x0, 0x104d65000
102e1ddc4:     	add	x0, x0, #0x310
102e1ddc8:     	bl	0x10214de74
102e1ddcc:     	cmp	w0, w24
102e1ddd0:     	b.eq	0x102e1de10
102e1ddd4:     	adrp	x0, 0x104d65000
102e1ddd8:     	add	x0, x0, #0x270
102e1dddc:     	bl	0x10214de74
102e1dde0:     	cmp	w0, w24
102e1dde4:     	b.eq	0x102e1de10
102e1dde8:     	adrp	x0, 0x104d65000
102e1ddec:     	add	x0, x0, #0x2d0
102e1ddf0:     	bl	0x10214de74
102e1ddf4:     	cmp	w0, w24
102e1ddf8:     	b.eq	0x102e1de10
102e1ddfc:     	adrp	x0, 0x104d65000
102e1de00:     	add	x0, x0, #0x330
102e1de04:     	bl	0x10214de74
102e1de08:     	cmp	w0, w24
102e1de0c:     	b.ne	0x102e1edc4
102e1de10:     	mov	w8, #0x0                ; =0
102e1de14:     	mov	w9, #0x1                ; =1
102e1de18:     	str	w9, [sp, #0x18]
102e1de1c:     	str	w8, [x19, #0x4c8]
102e1de20:     	ldr	w8, [x29, #0x2c]
102e1de24:     	cbz	w8, 0x102e1de44
102e1de28:     	ldr	w8, [x19, #0x230]
102e1de2c:     	cbz	w8, 0x102e1de44
102e1de30:     	adrp	x0, 0x104d65000
102e1de34:     	add	x0, x0, #0x1f0
102e1de38:     	bl	0x10214de74
102e1de3c:     	cmp	w0, w24
102e1de40:     	b.eq	0x102e1e308
102e1de44:     	adrp	x0, 0x104d65000
102e1de48:     	add	x0, x0, #0x3d0
102e1de4c:     	bl	0x10214de74
102e1de50:     	ldr	w21, [x29, #0x24]
102e1de54:     	cmp	w0, w24
102e1de58:     	b.eq	0x102e1de78
102e1de5c:     	adrp	x0, 0x104d65000
102e1de60:     	add	x0, x0, #0x3b0
102e1de64:     	bl	0x10214de74
102e1de68:     	cmp	w0, w24
102e1de6c:     	b.eq	0x102e1de78
102e1de70:     	ldr	w8, [x19, #0x1d8]
102e1de74:     	cbz	w8, 0x102e1e49c
102e1de78:     	tbz	w21, #0x2, 0x102e1dea8
102e1de7c:     	ldr	x0, [x19, #0x48]
102e1de80:     	add	x8, sp, #0x70
102e1de84:     	bl	0x102e4c968
102e1de88:     	ldr	x0, [sp, #0x70]
102e1de8c:     	cbz	x0, 0x102e1de9c
102e1de90:     	bl	0x102e4801c
102e1de94:     	cmp	w0, #0x2d
102e1de98:     	b.ne	0x102e1e3a8
102e1de9c:     	add	x8, sp, #0x70
102e1dea0:     	add	x0, x8, #0x8
102e1dea4:     	bl	0x10001022c
102e1dea8:     	ldp	x9, x8, [x20]
102e1deac:     	stp	x9, x8, [sp, #0x130]
102e1deb0:     	cbz	x8, 0x102e1dec0
102e1deb4:     	add	x8, x8, #0x8
102e1deb8:     	mov	w9, #0x1                ; =1
102e1debc:     	ldadd	w9, w8, [x8]
102e1dec0:     	ldp	x9, x8, [x23]
102e1dec4:     	stp	x9, x8, [sp, #0x120]
102e1dec8:     	cbz	x8, 0x102e1ded8
102e1decc:     	add	x8, x8, #0x8
102e1ded0:     	mov	w9, #0x1                ; =1
102e1ded4:     	ldadd	w9, w8, [x8]
102e1ded8:     	add	x26, sp, #0x130
102e1dedc:     	add	x27, sp, #0x120
102e1dee0:     	add	x1, sp, #0x130
102e1dee4:     	add	x2, sp, #0x120
102e1dee8:     	mov	x0, x19
102e1deec:     	bl	0x102e1bab8
102e1def0:     	mov	x21, x0
102e1def4:     	add	x0, x27, #0x8
102e1def8:     	bl	0x10001022c
102e1defc:     	add	x0, x26, #0x8
102e1df00:     	bl	0x10001022c
102e1df04:     	cbz	w21, 0x102e1e3b4
102e1df08:     	mov	w27, #0x1               ; =1
102e1df0c:     	ldr	w21, [x29, #0x20]
102e1df10:     	str	wzr, [x19, #0x298]
102e1df14:     	add	x26, sp, #0x70
102e1df18:     	add	x8, sp, #0x70
102e1df1c:     	mov	x0, x19
102e1df20:     	bl	0x102e1b69c
102e1df24:     	ldr	x23, [sp, #0x70]
102e1df28:     	add	x0, x26, #0x8
102e1df2c:     	bl	0x10001022c
102e1df30:     	cbz	w21, 0x102e1df4c
102e1df34:     	cbz	x23, 0x102e1df4c
102e1df38:     	ldr	x8, [x23]
102e1df3c:     	ldr	x8, [x8, #0x260]
102e1df40:     	mov	x0, x23
102e1df44:     	blr	x8
102e1df48:     	cbz	w0, 0x102e1e478
102e1df4c:     	adrp	x0, 0x104d65000
102e1df50:     	add	x0, x0, #0x3d0
102e1df54:     	bl	0x10214de74
102e1df58:     	cmp	w24, w0
102e1df5c:     	b.eq	0x102e1dffc
102e1df60:     	ldr	w8, [x19, #0xa8]
102e1df64:     	cbz	w8, 0x102e1dffc
102e1df68:     	ldr	x8, [x23]
102e1df6c:     	ldr	x8, [x8, #0x258]
102e1df70:     	mov	x0, x23
102e1df74:     	blr	x8
102e1df78:     	cbz	w0, 0x102e1dffc
102e1df7c:     	ldr	w8, [x19, #0x3c8]
102e1df80:     	cmp	w8, #0x1
102e1df84:     	b.eq	0x102e1dfb0
102e1df88:     	cmp	w8, #0x2
102e1df8c:     	b.ne	0x102e1dffc
102e1df90:     	ldr	w21, [x19, #0x494]
102e1df94:     	bl	0x102194e64
102e1df98:     	ldp	w9, w8, [x25, #0xb4]
102e1df9c:     	cmp	w9, #0x0
102e1dfa0:     	ccmp	w8, #0x2, #0x0, eq
102e1dfa4:     	ccmp	w0, #0x4, #0x0, eq
102e1dfa8:     	b.eq	0x102e1dfb0
102e1dfac:     	cbnz	w21, 0x102e1dfb8
102e1dfb0:     	ldr	w8, [x19, #0x11c]
102e1dfb4:     	cbz	w8, 0x102e1dffc
102e1dfb8:     	ldp	x9, x8, [x20]
102e1dfbc:     	stp	x9, x8, [sp, #0xd0]
102e1dfc0:     	cbz	x8, 0x102e1dfd0
102e1dfc4:     	add	x8, x8, #0x8
102e1dfc8:     	mov	w9, #0x1                ; =1
102e1dfcc:     	ldadd	w9, w8, [x8]
102e1dfd0:     	add	x25, sp, #0xd0
102e1dfd4:     	add	x1, sp, #0xd0
102e1dfd8:     	add	x8, sp, #0x208
102e1dfdc:     	add	x2, x8, #0x60
102e1dfe0:     	bl	0x102e21894
102e1dfe4:     	mov	x21, x0
102e1dfe8:     	add	x0, x25, #0x8
102e1dfec:     	bl	0x10001022c
102e1dff0:     	cbz	w21, 0x102e1dffc
102e1dff4:     	mov	w8, #0x1                ; =1
102e1dff8:     	str	w8, [sp, #0x2d0]
102e1dffc:     	ldp	x9, x8, [x20]
102e1e000:     	stp	x9, x8, [sp, #0xc0]
102e1e004:     	cbz	x8, 0x102e1e014
102e1e008:     	add	x8, x8, #0x8
102e1e00c:     	mov	w9, #0x1                ; =1
102e1e010:     	ldadd	w9, w8, [x8]
102e1e014:     	add	x21, sp, #0xc0
102e1e018:     	add	x0, sp, #0xc0
102e1e01c:     	bl	0x102992930
102e1e020:     	add	x26, sp, #0x208
102e1e024:     	adrp	x8, 0x1042ee000
102e1e028:     	ldr	d1, [x8, #0x828]
102e1e02c:     	fmul	d9, d0, d1
102e1e030:     	add	x0, x21, #0x8
102e1e034:     	bl	0x10001022c
102e1e038:     	fmov	d0, #3.00000000
102e1e03c:     	fdiv	d0, d0, d9
102e1e040:     	ldr	d1, [sp, #0x288]
102e1e044:     	ldr	d2, [x19, #0x2c8]
102e1e048:     	fabd	d1, d1, d2
102e1e04c:     	fcmp	d1, d0
102e1e050:     	b.gt	0x102e1e068
102e1e054:     	ldr	d1, [sp, #0x290]
102e1e058:     	ldr	d2, [x19, #0x2d0]
102e1e05c:     	fabd	d1, d1, d2
102e1e060:     	fcmp	d1, d0
102e1e064:     	b.le	0x102e1e084
102e1e068:     	add	x21, x19, #0x2c8
102e1e06c:     	add	x1, x26, #0x80
102e1e070:     	mov	x0, x21
102e1e074:     	bl	0x10219471c
102e1e078:     	str	d0, [x19, #0x2c0]
102e1e07c:     	ldur	q0, [x26, #0x80]
102e1e080:     	str	q0, [x21]
102e1e084:     	add	x1, sp, #0x208
102e1e088:     	mov	x0, x19
102e1e08c:     	bl	0x102e1f874
102e1e090:     	add	x25, x19, #0x11c
102e1e094:     	str	xzr, [sp, #0xb8]
102e1e098:     	ldr	x0, [x19, #0x350]
102e1e09c:     	cbz	x0, 0x102e1e17c
102e1e0a0:     	bl	0x1029ff614
102e1e0a4:     	cbz	w0, 0x102e1e17c
102e1e0a8:     	ldr	w8, [x19, #0x370]
102e1e0ac:     	cbnz	w8, 0x102e1e17c
102e1e0b0:     	ldp	x9, x8, [x20]
102e1e0b4:     	stp	x9, x8, [sp, #0x70]
102e1e0b8:     	cbz	x8, 0x102e1e0c8
102e1e0bc:     	add	x8, x8, #0x8
102e1e0c0:     	mov	w9, #0x1                ; =1
102e1e0c4:     	ldadd	w9, w8, [x8]
102e1e0c8:     	add	x21, sp, #0x70
102e1e0cc:     	adrp	x0, 0x104d65000
102e1e0d0:     	add	x0, x0, #0x1f0
102e1e0d4:     	bl	0x10214de74
102e1e0d8:     	cmp	w24, w0
102e1e0dc:     	b.eq	0x102e1e0f4
102e1e0e0:     	adrp	x0, 0x104d65000
102e1e0e4:     	add	x0, x0, #0x210
102e1e0e8:     	bl	0x10214de74
102e1e0ec:     	cmp	w24, w0
102e1e0f0:     	b.ne	0x102e1ee38
102e1e0f4:     	str	x25, [sp, #0x10]
102e1e0f8:     	ldr	x0, [x19, #0x350]
102e1e0fc:     	add	x8, sp, #0xa8
102e1e100:     	add	x25, x8, #0x8
102e1e104:     	ldp	x9, x8, [sp, #0x70]
102e1e108:     	stp	x9, x8, [sp, #0xa8]
102e1e10c:     	cbz	x8, 0x102e1e11c
102e1e110:     	add	x8, x8, #0x8
102e1e114:     	mov	w9, #0x1                ; =1
102e1e118:     	ldadd	w9, w8, [x8]
102e1e11c:     	ldr	d0, [sp, #0x298]
102e1e120:     	ldr	d1, [sp, #0x2a0]
102e1e124:     	fcmp	d0, #0.0
102e1e128:     	adrp	x8, 0x1042e3000
102e1e12c:     	ldr	d2, [x8, #0x690]
102e1e130:     	adrp	x8, 0x1042fe000
102e1e134:     	ldr	d3, [x8, #0xd20]
102e1e138:     	fcsel	d4, d3, d2, mi
102e1e13c:     	fadd	d0, d0, d4
102e1e140:     	fcvtzs	w8, d0
102e1e144:     	fcmp	d1, #0.0
102e1e148:     	fcsel	d0, d3, d2, mi
102e1e14c:     	fadd	d0, d1, d0
102e1e150:     	fcvtzs	w9, d0
102e1e154:     	orr	x8, x8, x9, lsl #32
102e1e158:     	str	x8, [sp, #0x1d0]
102e1e15c:     	add	x1, sp, #0xa8
102e1e160:     	add	x2, sp, #0x1d0
102e1e164:     	bl	0x1029fb9a4
102e1e168:     	mov	x0, x25
102e1e16c:     	bl	0x10001022c
102e1e170:     	ldr	x25, [sp, #0x10]
102e1e174:     	add	x0, x21, #0x8
102e1e178:     	bl	0x10001022c
102e1e17c:     	adrp	x0, 0x104d65000
102e1e180:     	add	x0, x0, #0x1f0
102e1e184:     	bl	0x10214de74
102e1e188:     	cmp	w24, w0
102e1e18c:     	b.eq	0x102e1e1b4
102e1e190:     	adrp	x0, 0x104d65000
102e1e194:     	add	x0, x0, #0x210
102e1e198:     	bl	0x10214de74
102e1e19c:     	ldr	w8, [x29, #0x14]
102e1e1a0:     	cbnz	w8, 0x102e1e1b4
102e1e1a4:     	cmp	w24, w0
102e1e1a8:     	b.eq	0x102e1e1b4
102e1e1ac:     	ldr	w8, [x19, #0x1d8]
102e1e1b0:     	cbz	w8, 0x102e1e60c
102e1e1b4:     	adrp	x0, 0x104d65000
102e1e1b8:     	add	x0, x0, #0x1f0
102e1e1bc:     	bl	0x10214de74
102e1e1c0:     	cmp	w24, w0
102e1e1c4:     	b.ne	0x102e1e268
102e1e1c8:     	ldr	w8, [sp, #0x2c0]
102e1e1cc:     	sub	w8, w8, #0x2
102e1e1d0:     	cmp	w8, #0x2
102e1e1d4:     	b.hi	0x102e1e268
102e1e1d8:     	ldr	x8, [x19, #0x300]
102e1e1dc:     	cmp	w8, #0x80
102e1e1e0:     	b.lt	0x102e1e204
102e1e1e4:     	ldr	x9, [x19, #0x2f8]
102e1e1e8:     	sub	x8, x8, #0x1
102e1e1ec:     	str	x8, [x19, #0x300]
102e1e1f0:     	add	x8, x9, #0x1
102e1e1f4:     	str	x8, [x19, #0x2f8]
102e1e1f8:     	add	x0, x19, #0x2d8
102e1e1fc:     	mov	w1, #0x1                ; =1
102e1e200:     	bl	0x1021374fc
102e1e204:     	ldr	x1, [x29, #0x38]
102e1e208:     	movi.2d	v0, #0000000000000000
102e1e20c:     	stp	q0, q0, [sp, #0x70]
102e1e210:     	ldr	x9, [sp, #0x218]
102e1e214:     	ldr	x8, [sp, #0x220]
102e1e218:     	stp	x9, x8, [sp, #0x60]
102e1e21c:     	cbz	x8, 0x102e1e22c
102e1e220:     	add	x8, x8, #0x8
102e1e224:     	mov	w9, #0x1                ; =1
102e1e228:     	ldadd	w9, w8, [x8]
102e1e22c:     	add	x21, sp, #0x60
102e1e230:     	add	x0, sp, #0x60
102e1e234:     	bl	0x1029915fc
102e1e238:     	stp	d0, d1, [sp, #0x70]
102e1e23c:     	add	x0, x21, #0x8
102e1e240:     	bl	0x10001022c
102e1e244:     	mov	x0, x19
102e1e248:     	fmov	d0, d8
102e1e24c:     	bl	0x102e1f800
102e1e250:     	str	d0, [sp, #0x80]
102e1e254:     	ldr	x8, [sp, #0x2d8]
102e1e258:     	str	x8, [sp, #0x88]
102e1e25c:     	add	x0, x19, #0x2d8
102e1e260:     	add	x1, sp, #0x70
102e1e264:     	bl	0x102e21a28
102e1e268:     	ldr	w8, [x19, #0xa8]
102e1e26c:     	cmp	w8, #0x1
102e1e270:     	b.ne	0x102e1e36c
102e1e274:     	ldr	w8, [x19, #0x1d8]
102e1e278:     	cbnz	w8, 0x102e1e6b8
102e1e27c:     	ldr	w8, [x19, #0x11c]
102e1e280:     	cmp	w8, #0x3
102e1e284:     	b.eq	0x102e1ee0c
102e1e288:     	cmp	w8, #0x2
102e1e28c:     	b.eq	0x102e1edf0
102e1e290:     	cmp	w8, #0x1
102e1e294:     	b.ne	0x102e1e6b8
102e1e298:     	adrp	x0, 0x104d65000
102e1e29c:     	add	x0, x0, #0x1f0
102e1e2a0:     	bl	0x10214de74
102e1e2a4:     	cmp	w24, w0
102e1e2a8:     	b.ne	0x102e1ee30
102e1e2ac:     	ldr	d0, [sp, #0x2a8]
102e1e2b0:     	mov	x0, x19
102e1e2b4:     	bl	0x102e1f800
102e1e2b8:     	str	d0, [sp, #0x2a8]
102e1e2bc:     	ldr	x8, [x23]
102e1e2c0:     	ldr	x8, [x8, #0x18]
102e1e2c4:     	add	x1, sp, #0x208
102e1e2c8:     	mov	x0, x23
102e1e2cc:     	blr	x8
102e1e2d0:     	b	0x102e1ee30
102e1e2d4:     	ldr	w8, [sp, #0x1c]
102e1e2d8:     	cmp	w8, #0x4
102e1e2dc:     	b.ne	0x102e1dd98
102e1e2e0:     	ldr	w8, [x19, #0x20c]
102e1e2e4:     	cbnz	w8, 0x102e1e308
102e1e2e8:     	b	0x102e1dd98
102e1e2ec:     	ldr	w8, [x19, #0x224]
102e1e2f0:     	cbz	w8, 0x102e1e300
102e1e2f4:     	ldr	x0, [sp, #0x70]
102e1e2f8:     	bl	0x102e10eac
102e1e2fc:     	cbz	w0, 0x102e1dc78
102e1e300:     	add	x0, x21, #0x8
102e1e304:     	bl	0x10001022c
102e1e308:     	mov	w21, #0x1               ; =1
102e1e30c:     	add	x19, sp, #0x208
102e1e310:     	add	x20, sp, #0x208
102e1e314:     	add	x0, x20, #0x58
102e1e318:     	bl	0x10001022c
102e1e31c:     	add	x0, x20, #0x48
102e1e320:     	bl	0x10001022c
102e1e324:     	add	x0, x19, #0x38
102e1e328:     	bl	0x10001022c
102e1e32c:     	add	x0, x19, #0x28
102e1e330:     	bl	0x10001022c
102e1e334:     	add	x0, x28, #0x18
102e1e338:     	bl	0x10001022c
102e1e33c:     	add	x0, x28, #0x8
102e1e340:     	bl	0x10001022c
102e1e344:     	mov	x0, x21
102e1e348:     	add	sp, sp, #0x2f0
102e1e34c:     	ldp	x29, x30, [sp, #0x60]
102e1e350:     	ldp	x20, x19, [sp, #0x50]
102e1e354:     	ldp	x22, x21, [sp, #0x40]
102e1e358:     	ldp	x24, x23, [sp, #0x30]
102e1e35c:     	ldp	x26, x25, [sp, #0x20]
102e1e360:     	ldp	x28, x27, [sp, #0x10]
102e1e364:     	ldp	d9, d8, [sp], #0x70
102e1e368:     	ret
102e1e36c:     	adrp	x0, 0x104d65000
102e1e370:     	add	x0, x0, #0x210
102e1e374:     	bl	0x10214de74
102e1e378:     	cmp	w24, w0
102e1e37c:     	b.ne	0x102e1e6b8
102e1e380:     	ldr	w8, [x29, #0x10]
102e1e384:     	ldr	w9, [x19, #0x11c]
102e1e388:     	cmp	w9, #0x3
102e1e38c:     	b.eq	0x102e1e9dc
102e1e390:     	cmp	w9, #0x2
102e1e394:     	b.eq	0x102e1e6b0
102e1e398:     	cmp	w9, #0x1
102e1e39c:     	b.ne	0x102e1e6b8
102e1e3a0:     	tbz	w8, #0x0, 0x102e1e6b4
102e1e3a4:     	b	0x102e1e6b8
102e1e3a8:     	add	x8, sp, #0x70
102e1e3ac:     	add	x0, x8, #0x8
102e1e3b0:     	bl	0x10001022c
102e1e3b4:     	ldp	x9, x8, [x20]
102e1e3b8:     	stp	x9, x8, [sp, #0x110]
102e1e3bc:     	cbz	x8, 0x102e1e3cc
102e1e3c0:     	add	x8, x8, #0x8
102e1e3c4:     	mov	w9, #0x1                ; =1
102e1e3c8:     	ldadd	w9, w8, [x8]
102e1e3cc:     	add	x21, sp, #0x110
102e1e3d0:     	adrp	x0, 0x104d63000
102e1e3d4:     	add	x0, x0, #0xc60
102e1e3d8:     	bl	0x10214de74
102e1e3dc:     	mov	x1, x0
102e1e3e0:     	add	x0, sp, #0x110
102e1e3e4:     	bl	0x102996c2c
102e1e3e8:     	add	x0, x21, #0x8
102e1e3ec:     	bl	0x10001022c
102e1e3f0:     	ldr	x0, [x19, #0x350]
102e1e3f4:     	cbz	x0, 0x102e1e564
102e1e3f8:     	bl	0x1029ff614
102e1e3fc:     	cbz	w0, 0x102e1e564
102e1e400:     	ldp	x8, x9, [x20]
102e1e404:     	stp	x8, x9, [sp, #0x70]
102e1e408:     	cbz	x9, 0x102e1e538
102e1e40c:     	add	x10, x9, #0x8
102e1e410:     	mov	w11, #0x1               ; =1
102e1e414:     	ldadd	w11, w12, [x10]
102e1e418:     	ldr	x0, [x19, #0x350]
102e1e41c:     	add	x12, sp, #0x100
102e1e420:     	add	x21, x12, #0x8
102e1e424:     	stp	x8, x9, [sp, #0x100]
102e1e428:     	ldadd	w11, w8, [x10]
102e1e42c:     	b	0x102e1e548
102e1e430:     	ldr	w8, [x19, #0x11c]
102e1e434:     	sub	w9, w8, #0x2
102e1e438:     	cmp	w9, #0x2
102e1e43c:     	b.lo	0x102e1e470
102e1e440:     	cmp	w8, #0x1
102e1e444:     	b.ne	0x102e1dd34
102e1e448:     	ldr	d0, [sp, #0x2a8]
102e1e44c:     	mov	x0, x19
102e1e450:     	bl	0x102e1f800
102e1e454:     	str	d0, [sp, #0x2a8]
102e1e458:     	cbz	x20, 0x102e1e470
102e1e45c:     	ldr	x8, [x20]
102e1e460:     	ldr	x8, [x8, #0x18]
102e1e464:     	add	x1, sp, #0x208
102e1e468:     	mov	x0, x20
102e1e46c:     	blr	x8
102e1e470:     	mov	w22, #0x1               ; =1
102e1e474:     	b	0x102e1dd38
102e1e478:     	ldr	w8, [x19, #0x208]
102e1e47c:     	mov	w21, #0x1               ; =1
102e1e480:     	cbnz	w8, 0x102e1e30c
102e1e484:     	str	w21, [x19, #0x208]
102e1e488:     	adrp	x0, 0x104d65000
102e1e48c:     	add	x0, x0, #0x290
102e1e490:     	bl	0x10214de74
102e1e494:     	mov	x24, x0
102e1e498:     	b	0x102e1df4c
102e1e49c:     	ldr	w8, [x19, #0x124]
102e1e4a0:     	cbz	w8, 0x102e1e4ec
102e1e4a4:     	ldr	w8, [x19, #0x11c]
102e1e4a8:     	cmp	w8, #0x1
102e1e4ac:     	b.ne	0x102e1e4e8
102e1e4b0:     	ldr	d0, [sp, #0x2a8]
102e1e4b4:     	adrp	x8, 0x1042e3000
102e1e4b8:     	ldr	d1, [x8, #0x690]
102e1e4bc:     	fcmp	d0, d1
102e1e4c0:     	b.pl	0x102e1e4e8
102e1e4c4:     	adrp	x0, 0x104d65000
102e1e4c8:     	add	x0, x0, #0x1f0
102e1e4cc:     	bl	0x10214de74
102e1e4d0:     	cmp	w0, w24
102e1e4d4:     	b.ne	0x102e1e4e8
102e1e4d8:     	adrp	x0, 0x104d65000
102e1e4dc:     	add	x0, x0, #0x290
102e1e4e0:     	bl	0x10214de74
102e1e4e4:     	mov	x24, x0
102e1e4e8:     	str	wzr, [x19, #0x124]
102e1e4ec:     	str	wzr, [sp, #0x70]
102e1e4f0:     	adrp	x0, 0x104d65000
102e1e4f4:     	add	x0, x0, #0x1f0
102e1e4f8:     	bl	0x10214de74
102e1e4fc:     	cmp	w24, w0
102e1e500:     	cset	w8, eq
102e1e504:     	str	w8, [sp, #0x10]
102e1e508:     	adrp	x0, 0x104d65000
102e1e50c:     	add	x0, x0, #0x270
102e1e510:     	bl	0x10214de74
102e1e514:     	cmp	w24, w0
102e1e518:     	b.eq	0x102e1e530
102e1e51c:     	adrp	x0, 0x104d65000
102e1e520:     	add	x0, x0, #0x2d0
102e1e524:     	bl	0x10214de74
102e1e528:     	cmp	w24, w0
102e1e52c:     	b.ne	0x102e1e9e8
102e1e530:     	mov	w4, #0x1                ; =1
102e1e534:     	b	0x102e1e9fc
102e1e538:     	ldr	x0, [x19, #0x350]
102e1e53c:     	add	x9, sp, #0x100
102e1e540:     	add	x21, x9, #0x8
102e1e544:     	stp	x8, xzr, [sp, #0x100]
102e1e548:     	add	x22, sp, #0x70
102e1e54c:     	add	x1, sp, #0x100
102e1e550:     	bl	0x1029ff6b0
102e1e554:     	mov	x0, x21
102e1e558:     	bl	0x10001022c
102e1e55c:     	add	x0, x22, #0x8
102e1e560:     	bl	0x10001022c
102e1e564:     	str	wzr, [x19, #0x11c]
102e1e568:     	ldr	x8, [x20]
102e1e56c:     	cbz	x8, 0x102e1eeb8
102e1e570:     	adrp	x0, 0x104d65000
102e1e574:     	add	x0, x0, #0x250
102e1e578:     	bl	0x10214de74
102e1e57c:     	cmp	w24, w0
102e1e580:     	b.ne	0x102e1e594
102e1e584:     	mov	w21, #0x0               ; =0
102e1e588:     	mov	w8, #0x1                ; =1
102e1e58c:     	str	w8, [x19, #0x298]
102e1e590:     	b	0x102e1e30c
102e1e594:     	adrp	x0, 0x104d65000
102e1e598:     	add	x0, x0, #0x290
102e1e59c:     	bl	0x10214de74
102e1e5a0:     	cmp	w24, w0
102e1e5a4:     	b.ne	0x102e1e5ec
102e1e5a8:     	ldr	w8, [x19, #0x298]
102e1e5ac:     	cbz	w8, 0x102e1eeb8
102e1e5b0:     	str	wzr, [x19, #0x298]
102e1e5b4:     	ldr	w9, [x19, #0x49c]
102e1e5b8:     	ldr	x8, [x23]
102e1e5bc:     	cbz	w9, 0x102e1ee84
102e1e5c0:     	ldr	x9, [x23, #0x8]
102e1e5c4:     	stp	x8, x9, [sp, #0xf0]
102e1e5c8:     	cbz	x9, 0x102e1e5d8
102e1e5cc:     	add	x8, x9, #0x8
102e1e5d0:     	mov	w9, #0x1                ; =1
102e1e5d4:     	ldadd	w9, w8, [x8]
102e1e5d8:     	add	x20, sp, #0xf0
102e1e5dc:     	add	x1, sp, #0xf0
102e1e5e0:     	mov	x0, x19
102e1e5e4:     	bl	0x102e214b4
102e1e5e8:     	b	0x102e1eeb0
102e1e5ec:     	adrp	x0, 0x104d65000
102e1e5f0:     	add	x0, x0, #0x230
102e1e5f4:     	bl	0x10214de74
102e1e5f8:     	cmp	w24, w0
102e1e5fc:     	b.ne	0x102e1eeb8
102e1e600:     	mov	w21, #0x0               ; =0
102e1e604:     	str	wzr, [x19, #0x298]
102e1e608:     	b	0x102e1e30c
102e1e60c:     	adrp	x0, 0x104d65000
102e1e610:     	add	x0, x0, #0x250
102e1e614:     	bl	0x10214de74
102e1e618:     	cmp	w24, w0
102e1e61c:     	b.ne	0x102e1ed38
102e1e620:     	ldr	w8, [x19, #0x11c]
102e1e624:     	cbnz	w8, 0x102e1e714
102e1e628:     	tbz	w27, #0x0, 0x102e1f08c
102e1e62c:     	ldr	w8, [sp, #0x1c]
102e1e630:     	cmp	w8, #0x3
102e1e634:     	b.ne	0x102e1e644
102e1e638:     	ldr	w8, [x19, #0x130]
102e1e63c:     	cmp	w8, #0x5
102e1e640:     	b.eq	0x102e1e714
102e1e644:     	ldr	w8, [x19, #0xa8]
102e1e648:     	cbnz	w8, 0x102e1e658
102e1e64c:     	add	x1, sp, #0x208
102e1e650:     	mov	x0, x19
102e1e654:     	bl	0x102e21b48
102e1e658:     	add	x21, sp, #0x70
102e1e65c:     	add	x8, sp, #0x70
102e1e660:     	mov	x0, x19
102e1e664:     	bl	0x102e1b69c
102e1e668:     	ldr	x23, [sp, #0x70]
102e1e66c:     	add	x0, x21, #0x8
102e1e670:     	bl	0x10001022c
102e1e674:     	add	x1, sp, #0x208
102e1e678:     	mov	x0, x19
102e1e67c:     	bl	0x102e1c53c
102e1e680:     	ldr	d0, [sp, #0x2a8]
102e1e684:     	mov	x0, x19
102e1e688:     	bl	0x102e1f800
102e1e68c:     	str	d0, [sp, #0x2a8]
102e1e690:     	ldr	x8, [x23]
102e1e694:     	ldr	x8, [x8, #0x10]
102e1e698:     	add	x1, sp, #0x208
102e1e69c:     	add	x2, sp, #0xbc
102e1e6a0:     	add	x3, sp, #0xb8
102e1e6a4:     	mov	x0, x23
102e1e6a8:     	blr	x8
102e1e6ac:     	b	0x102e1f0c8
102e1e6b0:     	tbnz	w8, #0x1, 0x102e1e6b8
102e1e6b4:     	str	wzr, [x19, #0x11c]
102e1e6b8:     	ldr	w8, [x19, #0xa8]
102e1e6bc:     	cbnz	w8, 0x102e1e6cc
102e1e6c0:     	add	x1, sp, #0x208
102e1e6c4:     	mov	x0, x19
102e1e6c8:     	bl	0x102e21b48
102e1e6cc:     	mov	w21, #0x1               ; =1
102e1e6d0:     	add	x1, sp, #0x208
102e1e6d4:     	mov	x0, x19
102e1e6d8:     	bl	0x102e1c53c
102e1e6dc:     	cbz	w21, 0x102e1e714
102e1e6e0:     	add	x21, sp, #0x70
102e1e6e4:     	add	x8, sp, #0x70
102e1e6e8:     	mov	x0, x19
102e1e6ec:     	bl	0x102e1b69c
102e1e6f0:     	ldr	x23, [sp, #0x70]
102e1e6f4:     	add	x0, x21, #0x8
102e1e6f8:     	bl	0x10001022c
102e1e6fc:     	ldr	x8, [x23]
102e1e700:     	ldr	x8, [x8, #0x60]
102e1e704:     	add	x1, sp, #0x208
102e1e708:     	mov	x0, x23
102e1e70c:     	mov	w2, #0x0                ; =0
102e1e710:     	blr	x8
102e1e714:     	ldr	w8, [x19, #0x1ac]
102e1e718:     	cbz	w8, 0x102e1e7c0
102e1e71c:     	ldur	q0, [x26, #0x80]
102e1e720:     	str	q0, [sp, #0x70]
102e1e724:     	ldp	x9, x8, [x20]
102e1e728:     	stp	x9, x8, [sp, #0x40]
102e1e72c:     	cbz	x8, 0x102e1e73c
102e1e730:     	add	x8, x8, #0x8
102e1e734:     	mov	w9, #0x1                ; =1
102e1e738:     	ldadd	w9, w8, [x8]
102e1e73c:     	add	x21, sp, #0x40
102e1e740:     	add	x0, sp, #0x40
102e1e744:     	add	x8, sp, #0x208
102e1e748:     	add	x1, x8, #0x60
102e1e74c:     	bl	0x1029915fc
102e1e750:     	str	d0, [sp, #0x288]
102e1e754:     	str	d1, [sp, #0x290]
102e1e758:     	add	x0, x21, #0x8
102e1e75c:     	bl	0x10001022c
102e1e760:     	add	x8, sp, #0x1d0
102e1e764:     	mov	x0, x19
102e1e768:     	mov	w1, #0x1                ; =1
102e1e76c:     	bl	0x102e15918
102e1e770:     	ldr	x0, [sp, #0x1d0]
102e1e774:     	bl	0x102e4801c
102e1e778:     	mov	x1, x0
102e1e77c:     	add	x21, sp, #0x30
102e1e780:     	add	x8, sp, #0x30
102e1e784:     	mov	x0, x19
102e1e788:     	bl	0x102e15724
102e1e78c:     	ldr	x0, [sp, #0x30]
102e1e790:     	ldr	x8, [x0]
102e1e794:     	ldr	x8, [x8, #0x60]
102e1e798:     	add	x1, sp, #0x208
102e1e79c:     	mov	w2, #0x1                ; =1
102e1e7a0:     	blr	x8
102e1e7a4:     	ldr	q0, [sp, #0x70]
102e1e7a8:     	stur	q0, [x26, #0x80]
102e1e7ac:     	add	x0, x21, #0x8
102e1e7b0:     	bl	0x10001022c
102e1e7b4:     	add	x8, sp, #0x1d0
102e1e7b8:     	add	x0, x8, #0x8
102e1e7bc:     	bl	0x10001022c
102e1e7c0:     	ldr	w8, [sp, #0xbc]
102e1e7c4:     	cbz	w8, 0x102e1e8b4
102e1e7c8:     	ldr	w8, [x19, #0xa8]
102e1e7cc:     	cmp	w8, #0x3
102e1e7d0:     	b.eq	0x102e1e850
102e1e7d4:     	cbnz	w8, 0x102e1e860
102e1e7d8:     	ldp	x9, x8, [x20]
102e1e7dc:     	stp	x9, x8, [sp, #0x20]
102e1e7e0:     	cbz	x8, 0x102e1e7f0
102e1e7e4:     	add	x8, x8, #0x8
102e1e7e8:     	mov	w9, #0x1                ; =1
102e1e7ec:     	ldadd	w9, w8, [x8]
102e1e7f0:     	add	x21, sp, #0x20
102e1e7f4:     	add	x23, sp, #0x1d0
102e1e7f8:     	add	x8, sp, #0x1d0
102e1e7fc:     	add	x0, sp, #0x20
102e1e800:     	bl	0x10299d8cc
102e1e804:     	add	x8, sp, #0x70
102e1e808:     	ldr	q0, [sp, #0x1d0]
102e1e80c:     	stp	xzr, xzr, [sp, #0x1d0]
102e1e810:     	ldr	q1, [x20]
102e1e814:     	str	q0, [x20]
102e1e818:     	str	q1, [sp, #0x70]
102e1e81c:     	orr	x0, x8, #0x8
102e1e820:     	bl	0x10001022c
102e1e824:     	orr	x0, x23, #0x8
102e1e828:     	bl	0x10001022c
102e1e82c:     	add	x0, x21, #0x8
102e1e830:     	bl	0x10001022c
102e1e834:     	ldr	x0, [x20]
102e1e838:     	bl	0x1021c3880
102e1e83c:     	ldr	x8, [x20]
102e1e840:     	str	x8, [x19, #0x4b8]
102e1e844:     	add	x0, x19, #0x4c0
102e1e848:     	mov	x1, x22
102e1e84c:     	bl	0x10005a220
102e1e850:     	mov	w8, #0x1                ; =1
102e1e854:     	str	w8, [x19, #0xa8]
102e1e858:     	adrp	x9, 0x104cd4000
102e1e85c:     	str	w8, [x9, #0x390]
102e1e860:     	ldr	w8, [sp, #0x1c]
102e1e864:     	cmp	w8, #0x4
102e1e868:     	cset	w8, eq
102e1e86c:     	str	w8, [x19, #0x22c]
102e1e870:     	add	x22, sp, #0x70
102e1e874:     	add	x8, sp, #0x70
102e1e878:     	mov	x0, x19
102e1e87c:     	bl	0x102e1b69c
102e1e880:     	ldr	x21, [sp, #0x70]
102e1e884:     	add	x0, x22, #0x8
102e1e888:     	bl	0x10001022c
102e1e88c:     	ldr	x8, [x21]
102e1e890:     	ldr	x8, [x8, #0x248]
102e1e894:     	mov	x0, x21
102e1e898:     	blr	x8
102e1e89c:     	cbz	w0, 0x102e1e8a4
102e1e8a0:     	bl	0x1032018ac
102e1e8a4:     	ldr	w8, [x21, #0x4c]
102e1e8a8:     	cbz	w8, 0x102e1e8b4
102e1e8ac:     	mov	x0, x19
102e1e8b0:     	bl	0x102e2270c
102e1e8b4:     	ldr	w8, [sp, #0xb8]
102e1e8b8:     	cbz	w8, 0x102e1e93c
102e1e8bc:     	ldr	w8, [x19, #0xa8]
102e1e8c0:     	cbz	w8, 0x102e1e93c
102e1e8c4:     	ldr	w9, [x19, #0x1ac]
102e1e8c8:     	cbz	w9, 0x102e1e8d4
102e1e8cc:     	mov	w8, #0x1                ; =1
102e1e8d0:     	b	0x102e1e924
102e1e8d4:     	ldr	w9, [x19, #0x1b0]
102e1e8d8:     	mov	w10, #0x11              ; =17
102e1e8dc:     	bics	wzr, w10, w9
102e1e8e0:     	b.ne	0x102e1e8ec
102e1e8e4:     	mov	w8, #0x3                ; =3
102e1e8e8:     	b	0x102e1e924
102e1e8ec:     	cmp	w8, #0x1
102e1e8f0:     	b.ne	0x102e1e920
102e1e8f4:     	ldr	x0, [x20]
102e1e8f8:     	bl	0x1021c39cc
102e1e8fc:     	add	x8, x25, #0x39c
102e1e900:     	add	x9, sp, #0x70
102e1e904:     	ldr	q0, [x8]
102e1e908:     	add	x8, x19, #0x4b8
102e1e90c:     	movi.2d	v1, #0000000000000000
102e1e910:     	str	q1, [x8]
102e1e914:     	str	q0, [sp, #0x70]
102e1e918:     	orr	x0, x9, #0x8
102e1e91c:     	bl	0x100015a60
102e1e920:     	mov	w8, #0x0                ; =0
102e1e924:     	str	w8, [x19, #0xa8]
102e1e928:     	adrp	x9, 0x104cd4000
102e1e92c:     	str	w8, [x9, #0x390]
102e1e930:     	add	x1, sp, #0x208
102e1e934:     	mov	x0, x19
102e1e938:     	bl	0x102e21cfc
102e1e93c:     	ldr	w8, [x19, #0x1cc]
102e1e940:     	cbz	w8, 0x102e1e95c
102e1e944:     	ldr	w8, [x19, #0xa8]
102e1e948:     	cbnz	w8, 0x102e1e95c
102e1e94c:     	ldr	w8, [x19, #0x1b8]
102e1e950:     	cbnz	w8, 0x102e1e95c
102e1e954:     	mov	x0, x19
102e1e958:     	bl	0x102e22770
102e1e95c:     	ldr	w8, [x19, #0x234]
102e1e960:     	cbz	w8, 0x102e1e974
102e1e964:     	ldr	w8, [x19, #0x11c]
102e1e968:     	cbnz	w8, 0x102e1e974
102e1e96c:     	mov	x0, x19
102e1e970:     	bl	0x102e18d58
102e1e974:     	add	x8, x19, #0x238
102e1e978:     	add	x9, sp, #0x208
102e1e97c:     	ldur	q0, [x9, #0x60]
102e1e980:     	str	q0, [x8]
102e1e984:     	add	x8, x19, #0x258
102e1e988:     	ldur	q0, [x26, #0x80]
102e1e98c:     	str	q0, [x8]
102e1e990:     	ldr	d0, [sp, #0x2a8]
102e1e994:     	str	d0, [x19, #0x268]
102e1e998:     	ldr	w8, [sp, #0x2b0]
102e1e99c:     	ldr	w9, [sp, #0x2bc]
102e1e9a0:     	str	w8, [x19, #0x270]
102e1e9a4:     	add	x8, x25, #0x158
102e1e9a8:     	ldur	q0, [x28, #0xac]
102e1e9ac:     	ldr	w10, [sp, #0x2c8]
102e1e9b0:     	str	w10, [x19, #0x284]
102e1e9b4:     	str	w9, [x19, #0x288]
102e1e9b8:     	ldur	q1, [x28, #0xb8]
102e1e9bc:     	mov.d	v0[1], v1[0]
102e1e9c0:     	str	q0, [x8]
102e1e9c4:     	ldr	w8, [sp, #0x1c]
102e1e9c8:     	str	w8, [x19, #0x28c]
102e1e9cc:     	add	x1, sp, #0x208
102e1e9d0:     	mov	x0, x19
102e1e9d4:     	bl	0x102e1f874
102e1e9d8:     	b	0x102e1e308
102e1e9dc:     	tst	w8, #0x1c
102e1e9e0:     	b.ne	0x102e1e6b8
102e1e9e4:     	b	0x102e1e6b4
102e1e9e8:     	adrp	x0, 0x104d65000
102e1e9ec:     	add	x0, x0, #0x330
102e1e9f0:     	bl	0x10214de74
102e1e9f4:     	cmp	w24, w0
102e1e9f8:     	cset	w4, eq
102e1e9fc:     	ldr	x8, [x20]
102e1ea00:     	ldr	w9, [sp, #0x1c]
102e1ea04:     	cmp	w9, #0x4
102e1ea08:     	b.ne	0x102e1ea5c
102e1ea0c:     	ldr	w6, [x29, #0x28]
102e1ea10:     	ldr	w5, [x29, #0x18]
102e1ea14:     	add	x9, sp, #0x1c0
102e1ea18:     	add	x9, x9, #0x8
102e1ea1c:     	str	x9, [sp, #0x8]
102e1ea20:     	ldr	x9, [x22]
102e1ea24:     	stp	x8, x9, [sp, #0x1c0]
102e1ea28:     	cbz	x9, 0x102e1ea38
102e1ea2c:     	add	x8, x9, #0x8
102e1ea30:     	mov	w9, #0x1                ; =1
102e1ea34:     	ldadd	w9, w8, [x8]
102e1ea38:     	add	x8, sp, #0x70
102e1ea3c:     	str	x8, [sp]
102e1ea40:     	add	x1, sp, #0x1c0
102e1ea44:     	mov	x0, x19
102e1ea48:     	mov	w2, #0x4                ; =4
102e1ea4c:     	ldr	w3, [sp, #0x10]
102e1ea50:     	mov	w7, #0x0                ; =0
102e1ea54:     	bl	0x102e1fbf4
102e1ea58:     	b	0x102e1eaa8
102e1ea5c:     	ldr	w7, [x29, #0x1c]
102e1ea60:     	add	x9, sp, #0x1b0
102e1ea64:     	add	x9, x9, #0x8
102e1ea68:     	str	x9, [sp, #0x8]
102e1ea6c:     	ldr	x9, [x22]
102e1ea70:     	stp	x8, x9, [sp, #0x1b0]
102e1ea74:     	cbz	x9, 0x102e1ea84
102e1ea78:     	add	x8, x9, #0x8
102e1ea7c:     	mov	w9, #0x1                ; =1
102e1ea80:     	ldadd	w9, w8, [x8]
102e1ea84:     	add	x8, sp, #0x70
102e1ea88:     	str	x8, [sp]
102e1ea8c:     	add	x1, sp, #0x1b0
102e1ea90:     	mov	x0, x19
102e1ea94:     	ldr	w2, [sp, #0x1c]
102e1ea98:     	ldr	w3, [sp, #0x10]
102e1ea9c:     	mov	w5, #0x0                ; =0
102e1eaa0:     	mov	w6, #0x0                ; =0
102e1eaa4:     	bl	0x102e1fbf4
102e1eaa8:     	ldr	x0, [sp, #0x8]
102e1eaac:     	bl	0x10001022c
102e1eab0:     	ldr	w8, [sp, #0x70]
102e1eab4:     	cbz	w8, 0x102e1ead4
102e1eab8:     	adrp	x0, 0x104d65000
102e1eabc:     	add	x0, x0, #0x250
102e1eac0:     	bl	0x10214de74
102e1eac4:     	cmp	w24, w0
102e1eac8:     	cset	w8, eq
102e1eacc:     	str	w8, [sp, #0x10]
102e1ead0:     	b	0x102e1ead8
102e1ead4:     	str	wzr, [sp, #0x10]
102e1ead8:     	ldr	w8, [x19, #0x228]
102e1eadc:     	cbz	w8, 0x102e1eb28
102e1eae0:     	ldr	w8, [sp, #0x1c]
102e1eae4:     	cmp	w8, #0x4
102e1eae8:     	b.ne	0x102e1eb24
102e1eaec:     	ldp	x9, x8, [x20]
102e1eaf0:     	stp	x9, x8, [sp, #0x1a0]
102e1eaf4:     	cbz	x8, 0x102e1eb04
102e1eaf8:     	add	x8, x8, #0x8
102e1eafc:     	mov	w9, #0x1                ; =1
102e1eb00:     	ldadd	w9, w8, [x8]
102e1eb04:     	add	x0, sp, #0x1a0
102e1eb08:     	bl	0x1029a2ec4
102e1eb0c:     	str	w0, [sp, #0x8]
102e1eb10:     	add	x8, sp, #0x1a0
102e1eb14:     	add	x0, x8, #0x8
102e1eb18:     	bl	0x10001022c
102e1eb1c:     	ldr	w8, [sp, #0x8]
102e1eb20:     	cbz	w8, 0x102e1eeb8
102e1eb24:     	str	wzr, [x19, #0x228]
102e1eb28:     	ldr	x0, [x27]
102e1eb2c:     	cbz	x0, 0x102e1eb4c
102e1eb30:     	mov	w1, #0x5f               ; =95
102e1eb34:     	bl	0x1021c41f8
102e1eb38:     	str	w0, [sp, #0x8]
102e1eb3c:     	ldr	x0, [x27]
102e1eb40:     	mov	w1, #0x5e               ; =94
102e1eb44:     	bl	0x1021c41f8
102e1eb48:     	b	0x102e1eb68
102e1eb4c:     	ldr	x0, [x20]
102e1eb50:     	mov	w1, #0x5f               ; =95
102e1eb54:     	bl	0x1021c41f8
102e1eb58:     	str	w0, [sp, #0x8]
102e1eb5c:     	ldr	x0, [x20]
102e1eb60:     	mov	w1, #0x5e               ; =94
102e1eb64:     	bl	0x1021c41f8
102e1eb68:     	ubfiz	w8, w26, #2, #1
102e1eb6c:     	bfxil	w8, w26, #1, #2
102e1eb70:     	orr	w9, w8, #0x8
102e1eb74:     	ldr	w10, [sp, #0x8]
102e1eb78:     	cmp	w10, #0x0
102e1eb7c:     	csel	w8, w8, w9, eq
102e1eb80:     	orr	w9, w8, #0x10
102e1eb84:     	cmp	w0, #0x0
102e1eb88:     	csel	w8, w8, w9, eq
102e1eb8c:     	ldr	w9, [x19, #0x138]
102e1eb90:     	cmp	w8, w9
102e1eb94:     	b.ne	0x102e1eba0
102e1eb98:     	ldr	w9, [x19, #0x164]
102e1eb9c:     	cbz	w9, 0x102e1ec68
102e1eba0:     	str	w8, [x19, #0x138]
102e1eba4:     	ldr	w9, [x19, #0x160]
102e1eba8:     	bic	w8, w8, w9
102e1ebac:     	str	w8, [sp, #0x2d4]
102e1ebb0:     	ldp	x9, x8, [x23]
102e1ebb4:     	stp	x9, x8, [sp, #0x190]
102e1ebb8:     	cbz	x8, 0x102e1ebc8
102e1ebbc:     	add	x8, x8, #0x8
102e1ebc0:     	mov	w9, #0x1                ; =1
102e1ebc4:     	ldadd	w9, w8, [x8]
102e1ebc8:     	ldp	x9, x8, [x20]
102e1ebcc:     	stp	x9, x8, [sp, #0x180]
102e1ebd0:     	cbz	x8, 0x102e1ebe0
102e1ebd4:     	add	x8, x8, #0x8
102e1ebd8:     	mov	w9, #0x1                ; =1
102e1ebdc:     	ldadd	w9, w8, [x8]
102e1ebe0:     	add	x26, sp, #0x190
102e1ebe4:     	add	x27, sp, #0x180
102e1ebe8:     	add	x1, sp, #0x190
102e1ebec:     	add	x2, sp, #0x180
102e1ebf0:     	mov	x0, x19
102e1ebf4:     	bl	0x102e20464
102e1ebf8:     	add	x0, x27, #0x8
102e1ebfc:     	bl	0x10001022c
102e1ec00:     	add	x0, x26, #0x8
102e1ec04:     	bl	0x10001022c
102e1ec08:     	ldr	w8, [x19, #0x15c]
102e1ec0c:     	cbnz	w8, 0x102e1ec68
102e1ec10:     	ldp	x9, x8, [x20]
102e1ec14:     	stp	x9, x8, [sp, #0x170]
102e1ec18:     	cbz	x8, 0x102e1ec28
102e1ec1c:     	add	x8, x8, #0x8
102e1ec20:     	mov	w9, #0x1                ; =1
102e1ec24:     	ldadd	w9, w8, [x8]
102e1ec28:     	ldp	x9, x8, [x23]
102e1ec2c:     	stp	x9, x8, [sp, #0x160]
102e1ec30:     	cbz	x8, 0x102e1ec40
102e1ec34:     	add	x8, x8, #0x8
102e1ec38:     	mov	w9, #0x1                ; =1
102e1ec3c:     	ldadd	w9, w8, [x8]
102e1ec40:     	add	x26, sp, #0x170
102e1ec44:     	add	x27, sp, #0x160
102e1ec48:     	add	x1, sp, #0x170
102e1ec4c:     	add	x2, sp, #0x160
102e1ec50:     	mov	x0, x19
102e1ec54:     	bl	0x102e1c24c
102e1ec58:     	add	x0, x27, #0x8
102e1ec5c:     	bl	0x10001022c
102e1ec60:     	add	x0, x26, #0x8
102e1ec64:     	bl	0x10001022c
102e1ec68:     	ldr	w8, [x19, #0x11c]
102e1ec6c:     	cbnz	w8, 0x102e1ed28
102e1ec70:     	adrp	x0, 0x104d65000
102e1ec74:     	add	x0, x0, #0x2b0
102e1ec78:     	bl	0x10214de74
102e1ec7c:     	cmp	w24, w0
102e1ec80:     	b.ne	0x102e1ecd0
102e1ec84:     	ldp	x9, x8, [x23]
102e1ec88:     	stp	x9, x8, [sp, #0x150]
102e1ec8c:     	cbz	x8, 0x102e1ec9c
102e1ec90:     	add	x8, x8, #0x8
102e1ec94:     	mov	w9, #0x1                ; =1
102e1ec98:     	ldadd	w9, w8, [x8]
102e1ec9c:     	add	x26, sp, #0x150
102e1eca0:     	add	x3, sp, #0x150
102e1eca4:     	mov	x0, x19
102e1eca8:     	mov	w1, #0x0                ; =0
102e1ecac:     	mov	x2, x21
102e1ecb0:     	bl	0x102e20ea0
102e1ecb4:     	add	x0, x26, #0x8
102e1ecb8:     	bl	0x10001022c
102e1ecbc:     	ldr	w8, [x19, #0x12c]
102e1ecc0:     	cmp	w8, #0x8
102e1ecc4:     	ldr	w8, [sp, #0x10]
102e1ecc8:     	csinc	w8, w8, wzr, ne
102e1eccc:     	str	w8, [sp, #0x10]
102e1ecd0:     	adrp	x0, 0x104d65000
102e1ecd4:     	add	x0, x0, #0x310
102e1ecd8:     	bl	0x10214de74
102e1ecdc:     	cmp	w24, w0
102e1ece0:     	b.ne	0x102e1ed28
102e1ece4:     	ldp	x9, x8, [x23]
102e1ece8:     	stp	x9, x8, [sp, #0x140]
102e1ecec:     	cbz	x8, 0x102e1ecfc
102e1ecf0:     	add	x8, x8, #0x8
102e1ecf4:     	mov	w9, #0x1                ; =1
102e1ecf8:     	ldadd	w9, w8, [x8]
102e1ecfc:     	add	x26, sp, #0x140
102e1ed00:     	add	x3, sp, #0x140
102e1ed04:     	mov	x0, x19
102e1ed08:     	mov	w1, #0x1                ; =1
102e1ed0c:     	mov	x2, x21
102e1ed10:     	bl	0x102e20ea0
102e1ed14:     	add	x0, x26, #0x8
102e1ed18:     	bl	0x10001022c
102e1ed1c:     	ldr	w8, [x19, #0x12c]
102e1ed20:     	cmp	w8, #0x8
102e1ed24:     	b.eq	0x102e1ed30
102e1ed28:     	ldr	w8, [sp, #0x10]
102e1ed2c:     	cbz	w8, 0x102e1de78
102e1ed30:     	mov	w27, #0x0               ; =0
102e1ed34:     	b	0x102e1df0c
102e1ed38:     	adrp	x0, 0x104d65000
102e1ed3c:     	add	x0, x0, #0x290
102e1ed40:     	bl	0x10214de74
102e1ed44:     	cmp	w24, w0
102e1ed48:     	b.ne	0x102e1eec0
102e1ed4c:     	ldr	w8, [sp, #0x18]
102e1ed50:     	tbnz	w8, #0x0, 0x102e1efc4
102e1ed54:     	ldr	w8, [x19, #0xa8]
102e1ed58:     	orr	w8, w8, #0x2
102e1ed5c:     	cmp	w8, #0x3
102e1ed60:     	b.ne	0x102e1efc4
102e1ed64:     	str	wzr, [x19, #0xa8]
102e1ed68:     	adrp	x8, 0x104cd4000
102e1ed6c:     	str	wzr, [x8, #0x390]
102e1ed70:     	ldr	x8, [x23]
102e1ed74:     	ldr	x8, [x8, #0x88]
102e1ed78:     	add	x1, sp, #0x208
102e1ed7c:     	mov	x0, x23
102e1ed80:     	blr	x8
102e1ed84:     	ldr	x0, [x20]
102e1ed88:     	bl	0x1021c39cc
102e1ed8c:     	add	x8, x25, #0x39c
102e1ed90:     	add	x9, sp, #0x70
102e1ed94:     	ldr	q0, [x8]
102e1ed98:     	add	x8, x19, #0x4b8
102e1ed9c:     	movi.2d	v1, #0000000000000000
102e1eda0:     	str	q1, [x8]
102e1eda4:     	str	q0, [sp, #0x70]
102e1eda8:     	orr	x0, x9, #0x8
102e1edac:     	bl	0x100015a60
102e1edb0:     	add	x1, sp, #0x208
102e1edb4:     	mov	x0, x19
102e1edb8:     	bl	0x102e21cfc
102e1edbc:     	str	wzr, [x19, #0x11c]
102e1edc0:     	b	0x102e1e714
102e1edc4:     	adrp	x0, 0x104d65000
102e1edc8:     	add	x0, x0, #0x1f0
102e1edcc:     	bl	0x10214de74
102e1edd0:     	ldr	w21, [x29, #0x30]
102e1edd4:     	cmp	w0, w24
102e1edd8:     	b.ne	0x102e1ef78
102e1eddc:     	mov	w8, #0x1                ; =1
102e1ede0:     	mov	w9, #0x1                ; =1
102e1ede4:     	str	w9, [sp, #0x18]
102e1ede8:     	cbnz	w21, 0x102e1de1c
102e1edec:     	b	0x102e1de20
102e1edf0:     	adrp	x0, 0x104d65000
102e1edf4:     	add	x0, x0, #0x1f0
102e1edf8:     	bl	0x10214de74
102e1edfc:     	mov	w2, #0x0                ; =0
102e1ee00:     	cmp	w24, w0
102e1ee04:     	b.eq	0x102e1ee24
102e1ee08:     	b	0x102e1ee30
102e1ee0c:     	adrp	x0, 0x104d65000
102e1ee10:     	add	x0, x0, #0x1f0
102e1ee14:     	bl	0x10214de74
102e1ee18:     	cmp	w24, w0
102e1ee1c:     	b.ne	0x102e1ee30
102e1ee20:     	mov	w2, #0x1                ; =1
102e1ee24:     	add	x1, sp, #0x208
102e1ee28:     	mov	x0, x19
102e1ee2c:     	bl	0x102e21ab4
102e1ee30:     	mov	w21, #0x0               ; =0
102e1ee34:     	b	0x102e1e6d0
102e1ee38:     	adrp	x0, 0x104d65000
102e1ee3c:     	add	x0, x0, #0x230
102e1ee40:     	bl	0x10214de74
102e1ee44:     	cmp	w24, w0
102e1ee48:     	b.ne	0x102e1e174
102e1ee4c:     	str	x25, [sp, #0x10]
102e1ee50:     	ldr	x0, [x19, #0x350]
102e1ee54:     	add	x8, sp, #0x98
102e1ee58:     	add	x25, x8, #0x8
102e1ee5c:     	ldp	x9, x8, [sp, #0x70]
102e1ee60:     	stp	x9, x8, [sp, #0x98]
102e1ee64:     	cbz	x8, 0x102e1ee74
102e1ee68:     	add	x8, x8, #0x8
102e1ee6c:     	mov	w9, #0x1                ; =1
102e1ee70:     	ldadd	w9, w8, [x8]
102e1ee74:     	add	x1, sp, #0x98
102e1ee78:     	mov	w2, #0x0                ; =0
102e1ee7c:     	bl	0x1029fbabc
102e1ee80:     	b	0x102e1e168
102e1ee84:     	ldr	x9, [x23, #0x8]
102e1ee88:     	stp	x8, x9, [sp, #0xe0]
102e1ee8c:     	cbz	x9, 0x102e1ee9c
102e1ee90:     	add	x8, x9, #0x8
102e1ee94:     	mov	w9, #0x1                ; =1
102e1ee98:     	ldadd	w9, w8, [x8]
102e1ee9c:     	add	x20, sp, #0xe0
102e1eea0:     	ldr	w2, [sp, #0x2c0]
102e1eea4:     	add	x1, sp, #0xe0
102e1eea8:     	mov	x0, x19
102e1eeac:     	bl	0x102e216ac
102e1eeb0:     	add	x0, x20, #0x8
102e1eeb4:     	bl	0x10001022c
102e1eeb8:     	mov	w21, #0x0               ; =0
102e1eebc:     	b	0x102e1e30c
102e1eec0:     	adrp	x0, 0x104d65000
102e1eec4:     	add	x0, x0, #0x270
102e1eec8:     	bl	0x10214de74
102e1eecc:     	cmp	w24, w0
102e1eed0:     	b.ne	0x102e1f02c
102e1eed4:     	ldr	w8, [x19, #0x11c]
102e1eed8:     	cmp	w8, #0x1
102e1eedc:     	b.hi	0x102e1e714
102e1eee0:     	ldr	w8, [sp, #0x1c]
102e1eee4:     	cmp	w8, #0x3
102e1eee8:     	b.ne	0x102e1eef8
102e1eeec:     	ldr	w8, [x19, #0x130]
102e1eef0:     	cmp	w8, #0x5
102e1eef4:     	b.eq	0x102e1e714
102e1eef8:     	ldr	w8, [x19, #0xa8]
102e1eefc:     	cbnz	w8, 0x102e1ef0c
102e1ef00:     	add	x1, sp, #0x208
102e1ef04:     	mov	x0, x19
102e1ef08:     	bl	0x102e21b48
102e1ef0c:     	add	x21, sp, #0x70
102e1ef10:     	add	x8, sp, #0x70
102e1ef14:     	mov	x0, x19
102e1ef18:     	bl	0x102e1b69c
102e1ef1c:     	ldr	x23, [sp, #0x70]
102e1ef20:     	add	x0, x21, #0x8
102e1ef24:     	bl	0x10001022c
102e1ef28:     	add	x1, sp, #0x208
102e1ef2c:     	mov	x0, x19
102e1ef30:     	bl	0x102e1c53c
102e1ef34:     	ldr	w24, [x19, #0x11c]
102e1ef38:     	cmp	w24, #0x1
102e1ef3c:     	cset	w21, eq
102e1ef40:     	ldr	w1, [x19, #0x3f8]
102e1ef44:     	ldr	w2, [x19, #0x3fc]
102e1ef48:     	mov	x0, x23
102e1ef4c:     	bl	0x102e35428
102e1ef50:     	cbz	w0, 0x102e1f268
102e1ef54:     	ldr	x8, [x23]
102e1ef58:     	ldr	x8, [x8, #0x28]
102e1ef5c:     	add	x1, sp, #0x208
102e1ef60:     	add	x3, sp, #0xbc
102e1ef64:     	add	x4, sp, #0xb8
102e1ef68:     	mov	x0, x23
102e1ef6c:     	mov	x2, x21
102e1ef70:     	blr	x8
102e1ef74:     	b	0x102e1f2b8
102e1ef78:     	adrp	x0, 0x104d65000
102e1ef7c:     	add	x0, x0, #0x290
102e1ef80:     	bl	0x10214de74
102e1ef84:     	cmp	w0, w24
102e1ef88:     	b.eq	0x102e1efb4
102e1ef8c:     	adrp	x0, 0x104d65000
102e1ef90:     	add	x0, x0, #0x2f0
102e1ef94:     	bl	0x10214de74
102e1ef98:     	cmp	w0, w24
102e1ef9c:     	b.eq	0x102e1efb4
102e1efa0:     	adrp	x0, 0x104d65000
102e1efa4:     	add	x0, x0, #0x350
102e1efa8:     	bl	0x10214de74
102e1efac:     	cmp	w0, w24
102e1efb0:     	b.ne	0x102e1f204
102e1efb4:     	mov	w8, #0x0                ; =0
102e1efb8:     	cbz	w21, 0x102e1f0d4
102e1efbc:     	str	wzr, [sp, #0x18]
102e1efc0:     	b	0x102e1de1c
102e1efc4:     	ldr	w8, [x19, #0x11c]
102e1efc8:     	cmp	w8, #0x1
102e1efcc:     	b.ne	0x102e1e714
102e1efd0:     	ldr	w8, [x19, #0xa8]
102e1efd4:     	cmp	w8, #0x1
102e1efd8:     	b.ne	0x102e1f00c
102e1efdc:     	str	w8, [x19, #0x1d8]
102e1efe0:     	ldr	d0, [sp, #0x2a8]
102e1efe4:     	mov	x0, x19
102e1efe8:     	bl	0x102e1f800
102e1efec:     	str	d0, [sp, #0x2a8]
102e1eff0:     	ldr	x8, [x23]
102e1eff4:     	ldr	x8, [x8, #0x20]
102e1eff8:     	add	x1, sp, #0x208
102e1effc:     	add	x2, sp, #0xb8
102e1f000:     	mov	x0, x23
102e1f004:     	blr	x8
102e1f008:     	str	wzr, [x19, #0x1d8]
102e1f00c:     	add	x8, x19, #0x11c
102e1f010:     	str	xzr, [x8]
102e1f014:     	ldr	w8, [sp, #0xb8]
102e1f018:     	cbnz	w8, 0x102e1e714
102e1f01c:     	add	x1, sp, #0x208
102e1f020:     	mov	x0, x19
102e1f024:     	bl	0x102e1c53c
102e1f028:     	b	0x102e1e714
102e1f02c:     	adrp	x0, 0x104d65000
102e1f030:     	add	x0, x0, #0x2b0
102e1f034:     	bl	0x10214de74
102e1f038:     	cmp	w24, w0
102e1f03c:     	b.ne	0x102e1f0e4
102e1f040:     	ldr	w8, [x19, #0x11c]
102e1f044:     	cbnz	w8, 0x102e1e714
102e1f048:     	ldr	w8, [x19, #0x130]
102e1f04c:     	cmp	w8, #0x5
102e1f050:     	b.eq	0x102e1f058
102e1f054:     	cbnz	w8, 0x102e1f324
102e1f058:     	ldr	w8, [x19, #0xa8]
102e1f05c:     	cbnz	w8, 0x102e1f06c
102e1f060:     	add	x1, sp, #0x208
102e1f064:     	mov	x0, x19
102e1f068:     	bl	0x102e21b48
102e1f06c:     	add	x1, sp, #0x208
102e1f070:     	add	x3, sp, #0xbc
102e1f074:     	add	x4, sp, #0xb8
102e1f078:     	mov	x0, x19
102e1f07c:     	mov	w2, #0x0                ; =0
102e1f080:     	bl	0x102e2230c
102e1f084:     	mov	w8, #0x2                ; =2
102e1f088:     	b	0x102e1f0cc
102e1f08c:     	ldr	x9, [sp, #0x218]
102e1f090:     	ldr	x8, [sp, #0x220]
102e1f094:     	stp	x9, x8, [sp, #0x50]
102e1f098:     	cbz	x8, 0x102e1f0a8
102e1f09c:     	add	x8, x8, #0x8
102e1f0a0:     	mov	w9, #0x1                ; =1
102e1f0a4:     	ldadd	w9, w8, [x8]
102e1f0a8:     	add	x21, sp, #0x50
102e1f0ac:     	add	x1, sp, #0x50
102e1f0b0:     	add	x8, sp, #0x208
102e1f0b4:     	add	x2, x8, #0x60
102e1f0b8:     	mov	x0, x19
102e1f0bc:     	bl	0x102e21c38
102e1f0c0:     	add	x0, x21, #0x8
102e1f0c4:     	bl	0x10001022c
102e1f0c8:     	mov	w8, #0x1                ; =1
102e1f0cc:     	str	w8, [x19, #0x11c]
102e1f0d0:     	b	0x102e1e714
102e1f0d4:     	ldr	w9, [x19, #0x4c8]
102e1f0d8:     	cmp	w9, #0x0
102e1f0dc:     	cset	w9, eq
102e1f0e0:     	b	0x102e1de18
102e1f0e4:     	adrp	x0, 0x104d65000
102e1f0e8:     	add	x0, x0, #0x2f0
102e1f0ec:     	bl	0x10214de74
102e1f0f0:     	cmp	w24, w0
102e1f0f4:     	b.ne	0x102e1f174
102e1f0f8:     	ldr	w8, [sp, #0x18]
102e1f0fc:     	tbnz	w8, #0x0, 0x102e1f210
102e1f100:     	ldr	w8, [x19, #0xa8]
102e1f104:     	orr	w8, w8, #0x2
102e1f108:     	cmp	w8, #0x3
102e1f10c:     	b.ne	0x102e1f210
102e1f110:     	str	wzr, [x19, #0xa8]
102e1f114:     	adrp	x8, 0x104cd4000
102e1f118:     	str	wzr, [x8, #0x390]
102e1f11c:     	ldr	x8, [x23]
102e1f120:     	ldr	x8, [x8, #0x88]
102e1f124:     	add	x1, sp, #0x208
102e1f128:     	mov	x0, x23
102e1f12c:     	blr	x8
102e1f130:     	ldr	x0, [x20]
102e1f134:     	bl	0x1021c39cc
102e1f138:     	add	x8, x25, #0x39c
102e1f13c:     	add	x9, sp, #0x70
102e1f140:     	ldr	q0, [x8]
102e1f144:     	add	x8, x19, #0x4b8
102e1f148:     	movi.2d	v1, #0000000000000000
102e1f14c:     	str	q1, [x8]
102e1f150:     	str	q0, [sp, #0x70]
102e1f154:     	orr	x0, x9, #0x8
102e1f158:     	bl	0x100015a60
102e1f15c:     	add	x1, sp, #0x208
102e1f160:     	mov	x0, x19
102e1f164:     	bl	0x102e21cfc
102e1f168:     	add	x8, x19, #0x11c
102e1f16c:     	str	xzr, [x8]
102e1f170:     	b	0x102e1e714
102e1f174:     	adrp	x0, 0x104d65000
102e1f178:     	add	x0, x0, #0x2d0
102e1f17c:     	bl	0x10214de74
102e1f180:     	cmp	w24, w0
102e1f184:     	b.ne	0x102e1f2c4
102e1f188:     	ldr	w8, [x19, #0x11c]
102e1f18c:     	orr	w8, w8, #0x2
102e1f190:     	cmp	w8, #0x2
102e1f194:     	b.ne	0x102e1e714
102e1f198:     	ldr	w8, [x19, #0xa8]
102e1f19c:     	cbz	w8, 0x102e1e714
102e1f1a0:     	str	x25, [sp, #0x10]
102e1f1a4:     	ldr	w8, [x19, #0x130]
102e1f1a8:     	cmp	w8, #0x5
102e1f1ac:     	b.eq	0x102e1f1b4
102e1f1b0:     	cbnz	w8, 0x102e1f508
102e1f1b4:     	ldr	w8, [x19, #0x12c]
102e1f1b8:     	cmp	w8, #0x2
102e1f1bc:     	b.ne	0x102e1f508
102e1f1c0:     	ldr	w1, [x19, #0x3f8]
102e1f1c4:     	ldr	w2, [x19, #0x3fc]
102e1f1c8:     	mov	x0, x23
102e1f1cc:     	ldr	x25, [sp, #0x10]
102e1f1d0:     	bl	0x102e35428
102e1f1d4:     	cbz	w0, 0x102e1f508
102e1f1d8:     	ldr	w8, [x19, #0x11c]
102e1f1dc:     	cmp	w8, #0x2
102e1f1e0:     	cset	w2, eq
102e1f1e4:     	ldr	x8, [x23]
102e1f1e8:     	ldr	x8, [x8, #0x28]
102e1f1ec:     	add	x1, sp, #0x208
102e1f1f0:     	add	x3, sp, #0xbc
102e1f1f4:     	add	x4, sp, #0xb8
102e1f1f8:     	mov	x0, x23
102e1f1fc:     	blr	x8
102e1f200:     	b	0x102e1f508
102e1f204:     	mov	w8, #0x1                ; =1
102e1f208:     	str	w8, [sp, #0x18]
102e1f20c:     	b	0x102e1de20
102e1f210:     	ldr	w9, [x19, #0x120]
102e1f214:     	ldr	w8, [x19, #0x11c]
102e1f218:     	cbz	w9, 0x102e1f38c
102e1f21c:     	cmp	w8, #0x1
102e1f220:     	b.ne	0x102e1e714
102e1f224:     	ldr	w8, [x19, #0xa8]
102e1f228:     	cmp	w8, #0x1
102e1f22c:     	b.ne	0x102e1f260
102e1f230:     	str	w8, [x19, #0x1d8]
102e1f234:     	ldr	d0, [sp, #0x2a8]
102e1f238:     	mov	x0, x19
102e1f23c:     	bl	0x102e1f800
102e1f240:     	str	d0, [sp, #0x2a8]
102e1f244:     	ldr	x8, [x23]
102e1f248:     	ldr	x8, [x8, #0x20]
102e1f24c:     	add	x1, sp, #0x208
102e1f250:     	add	x2, sp, #0xb8
102e1f254:     	mov	x0, x23
102e1f258:     	blr	x8
102e1f25c:     	str	wzr, [x19, #0x1d8]
102e1f260:     	str	wzr, [x25, #0x4]
102e1f264:     	b	0x102e1f3b4
102e1f268:     	cmp	w24, #0x1
102e1f26c:     	b.eq	0x102e1f2b8
102e1f270:     	bl	0x1020be2d8
102e1f274:     	cbnz	w0, 0x102e1f288
102e1f278:     	bl	0x1020be2ec
102e1f27c:     	cbnz	w0, 0x102e1f288
102e1f280:     	bl	0x1020be300
102e1f284:     	cbz	w0, 0x102e1f294
102e1f288:     	mov	w0, #0x1                ; =1
102e1f28c:     	bl	0x1020be4cc
102e1f290:     	cbnz	w0, 0x102e1f2b8
102e1f294:     	ldr	x8, [x23]
102e1f298:     	ldr	x8, [x8, #0x10]
102e1f29c:     	add	x1, sp, #0x208
102e1f2a0:     	add	x2, sp, #0xbc
102e1f2a4:     	add	x3, sp, #0xb8
102e1f2a8:     	mov	x0, x23
102e1f2ac:     	blr	x8
102e1f2b0:     	mov	w8, #0x1                ; =1
102e1f2b4:     	str	w8, [x19, #0x11c]
102e1f2b8:     	mov	w8, #0x1                ; =1
102e1f2bc:     	str	w8, [x19, #0x124]
102e1f2c0:     	b	0x102e1e714
102e1f2c4:     	adrp	x0, 0x104d65000
102e1f2c8:     	add	x0, x0, #0x310
102e1f2cc:     	bl	0x10214de74
102e1f2d0:     	cmp	w24, w0
102e1f2d4:     	b.ne	0x102e1f3bc
102e1f2d8:     	ldr	w8, [x19, #0x11c]
102e1f2dc:     	cbnz	w8, 0x102e1e714
102e1f2e0:     	ldr	w8, [x19, #0x130]
102e1f2e4:     	cmp	w8, #0x5
102e1f2e8:     	b.eq	0x102e1f2f0
102e1f2ec:     	cbnz	w8, 0x102e1e714
102e1f2f0:     	ldr	w8, [x19, #0xa8]
102e1f2f4:     	cbnz	w8, 0x102e1f304
102e1f2f8:     	add	x1, sp, #0x208
102e1f2fc:     	mov	x0, x19
102e1f300:     	bl	0x102e21b48
102e1f304:     	add	x1, sp, #0x208
102e1f308:     	add	x3, sp, #0xbc
102e1f30c:     	add	x4, sp, #0xb8
102e1f310:     	mov	x0, x19
102e1f314:     	mov	w2, #0x1                ; =1
102e1f318:     	bl	0x102e2230c
102e1f31c:     	mov	w8, #0x3                ; =3
102e1f320:     	b	0x102e1f0cc
102e1f324:     	ldr	w8, [x19, #0xa8]
102e1f328:     	cbnz	w8, 0x102e1f338
102e1f32c:     	add	x1, sp, #0x208
102e1f330:     	mov	x0, x19
102e1f334:     	bl	0x102e21b48
102e1f338:     	add	x21, sp, #0x70
102e1f33c:     	add	x8, sp, #0x70
102e1f340:     	mov	x0, x19
102e1f344:     	bl	0x102e1b69c
102e1f348:     	ldr	x23, [sp, #0x70]
102e1f34c:     	add	x0, x21, #0x8
102e1f350:     	bl	0x10001022c
102e1f354:     	add	x1, sp, #0x208
102e1f358:     	mov	x0, x19
102e1f35c:     	bl	0x102e1c53c
102e1f360:     	ldr	x8, [x23]
102e1f364:     	ldr	x8, [x8, #0x10]
102e1f368:     	add	x1, sp, #0x208
102e1f36c:     	add	x2, sp, #0xbc
102e1f370:     	add	x3, sp, #0xb8
102e1f374:     	mov	x0, x23
102e1f378:     	blr	x8
102e1f37c:     	add	x8, x19, #0x11c
102e1f380:     	mov	x9, #0x100000001        ; =4294967297
102e1f384:     	str	x9, [x8]
102e1f388:     	b	0x102e1e714
102e1f38c:     	cmp	w8, #0x2
102e1f390:     	b.ne	0x102e1e714
102e1f394:     	ldr	w8, [x19, #0xa8]
102e1f398:     	cmp	w8, #0x1
102e1f39c:     	b.ne	0x102e1f3b4
102e1f3a0:     	add	x1, sp, #0x208
102e1f3a4:     	add	x3, sp, #0xb8
102e1f3a8:     	mov	x0, x19
102e1f3ac:     	mov	w2, #0x0                ; =0
102e1f3b0:     	bl	0x102e225dc
102e1f3b4:     	str	wzr, [x25]
102e1f3b8:     	b	0x102e1e714
102e1f3bc:     	adrp	x0, 0x104d65000
102e1f3c0:     	add	x0, x0, #0x350
102e1f3c4:     	bl	0x10214de74
102e1f3c8:     	cmp	w24, w0
102e1f3cc:     	str	x25, [sp, #0x10]
102e1f3d0:     	b.ne	0x102e1f44c
102e1f3d4:     	ldr	w8, [sp, #0x18]
102e1f3d8:     	tbnz	w8, #0x0, 0x102e1f4d8
102e1f3dc:     	ldr	w8, [x19, #0xa8]
102e1f3e0:     	orr	w8, w8, #0x2
102e1f3e4:     	cmp	w8, #0x3
102e1f3e8:     	b.ne	0x102e1f4d8
102e1f3ec:     	str	wzr, [x19, #0xa8]
102e1f3f0:     	adrp	x8, 0x104cd4000
102e1f3f4:     	str	wzr, [x8, #0x390]
102e1f3f8:     	ldr	x8, [x23]
102e1f3fc:     	ldr	x8, [x8, #0x88]
102e1f400:     	add	x1, sp, #0x208
102e1f404:     	mov	x0, x23
102e1f408:     	blr	x8
102e1f40c:     	ldr	x0, [x20]
102e1f410:     	bl	0x1021c39cc
102e1f414:     	ldr	x8, [sp, #0x10]
102e1f418:     	add	x8, x8, #0x39c
102e1f41c:     	add	x9, sp, #0x70
102e1f420:     	ldr	q0, [x8]
102e1f424:     	add	x8, x19, #0x4b8
102e1f428:     	movi.2d	v1, #0000000000000000
102e1f42c:     	str	q1, [x8]
102e1f430:     	str	q0, [sp, #0x70]
102e1f434:     	orr	x0, x9, #0x8
102e1f438:     	bl	0x100015a60
102e1f43c:     	add	x1, sp, #0x208
102e1f440:     	mov	x0, x19
102e1f444:     	bl	0x102e21cfc
102e1f448:     	b	0x102e1f504
102e1f44c:     	adrp	x0, 0x104d65000
102e1f450:     	add	x0, x0, #0x330
102e1f454:     	bl	0x10214de74
102e1f458:     	cmp	w24, w0
102e1f45c:     	b.ne	0x102e1f510
102e1f460:     	ldr	w8, [x19, #0x11c]
102e1f464:     	cmp	w8, #0x3
102e1f468:     	b.eq	0x102e1f470
102e1f46c:     	cbnz	w8, 0x102e1f508
102e1f470:     	ldr	w8, [x19, #0xa8]
102e1f474:     	cbz	w8, 0x102e1f508
102e1f478:     	ldr	w8, [x19, #0x130]
102e1f47c:     	cmp	w8, #0x5
102e1f480:     	b.eq	0x102e1f488
102e1f484:     	cbnz	w8, 0x102e1f508
102e1f488:     	ldr	w8, [x19, #0x12c]
102e1f48c:     	cmp	w8, #0x2
102e1f490:     	b.ne	0x102e1f508
102e1f494:     	ldr	w1, [x19, #0x3f8]
102e1f498:     	ldr	w2, [x19, #0x3fc]
102e1f49c:     	mov	x0, x23
102e1f4a0:     	ldr	x25, [sp, #0x10]
102e1f4a4:     	bl	0x102e35428
102e1f4a8:     	cbz	w0, 0x102e1f508
102e1f4ac:     	ldr	w8, [x19, #0x11c]
102e1f4b0:     	cmp	w8, #0x3
102e1f4b4:     	cset	w2, eq
102e1f4b8:     	ldr	x8, [x23]
102e1f4bc:     	ldr	x8, [x8, #0x28]
102e1f4c0:     	add	x1, sp, #0x208
102e1f4c4:     	add	x3, sp, #0xbc
102e1f4c8:     	add	x4, sp, #0xb8
102e1f4cc:     	mov	x0, x23
102e1f4d0:     	blr	x8
102e1f4d4:     	b	0x102e1f508
102e1f4d8:     	ldr	w8, [x19, #0x11c]
102e1f4dc:     	cmp	w8, #0x3
102e1f4e0:     	b.ne	0x102e1f508
102e1f4e4:     	ldr	w8, [x19, #0xa8]
102e1f4e8:     	cmp	w8, #0x1
102e1f4ec:     	b.ne	0x102e1f504
102e1f4f0:     	add	x1, sp, #0x208
102e1f4f4:     	add	x3, sp, #0xb8
102e1f4f8:     	mov	x0, x19
102e1f4fc:     	mov	w2, #0x1                ; =1
102e1f500:     	bl	0x102e225dc
102e1f504:     	str	wzr, [x19, #0x11c]
102e1f508:     	ldr	x25, [sp, #0x10]
102e1f50c:     	b	0x102e1e714
102e1f510:     	adrp	x0, 0x104d65000
102e1f514:     	add	x0, x0, #0x230
102e1f518:     	ldr	x25, [sp, #0x10]
102e1f51c:     	bl	0x10214de74
102e1f520:     	cmp	w24, w0
102e1f524:     	b.ne	0x102e1f550
102e1f528:     	ldr	w8, [x19, #0xa8]
102e1f52c:     	ldr	x25, [sp, #0x10]
102e1f530:     	cbnz	w8, 0x102e1f548
102e1f534:     	ldr	x8, [x23]
102e1f538:     	ldr	x8, [x8, #0x68]
102e1f53c:     	add	x1, sp, #0x208
102e1f540:     	mov	x0, x23
102e1f544:     	blr	x8
102e1f548:     	str	wzr, [x19, #0x128]
102e1f54c:     	b	0x102e1e714
102e1f550:     	adrp	x0, 0x104d65000
102e1f554:     	add	x0, x0, #0x3d0
102e1f558:     	ldr	x25, [sp, #0x10]
102e1f55c:     	bl	0x10214de74
102e1f560:     	cmp	w24, w0
102e1f564:     	b.ne	0x102e1eeb8
102e1f568:     	ldr	w8, [x19, #0xa8]
102e1f56c:     	orr	w8, w8, #0x2
102e1f570:     	cmp	w8, #0x3
102e1f574:     	b.ne	0x102e1f508
102e1f578:     	str	wzr, [x19, #0xa8]
102e1f57c:     	adrp	x8, 0x104cd4000
102e1f580:     	str	wzr, [x8, #0x390]
102e1f584:     	ldr	x8, [x23]
102e1f588:     	ldr	x8, [x8, #0x88]
102e1f58c:     	add	x1, sp, #0x208
102e1f590:     	mov	x0, x23
102e1f594:     	ldr	x25, [sp, #0x10]
102e1f598:     	blr	x8
102e1f59c:     	add	x1, sp, #0x208
102e1f5a0:     	mov	x0, x19
102e1f5a4:     	bl	0x102e21cfc
102e1f5a8:     	str	wzr, [x19, #0x11c]
102e1f5ac:     	str	wzr, [x19, #0x4c8]
102e1f5b0:     	b	0x102e1e714
102e1f5b4:     	b	0x102e1f708
102e1f5b8:     	b	0x102e1f708
102e1f5bc:     	b	0x102e1f708
102e1f5c0:     	b	0x102e1f704
102e1f5c4:     	b	0x102e1f6b4
102e1f5c8:     	b	0x102e1f704
102e1f5cc:     	b	0x102e1f620
102e1f5d0:     	b	0x102e1f5d4
102e1f5d4:     	mov	x19, x0
102e1f5d8:     	b	0x102e1f6e8
102e1f5dc:     	b	0x102e1f5e8
102e1f5e0:     	b	0x102e1f704
102e1f5e4:     	b	0x102e1f6dc
102e1f5e8:     	mov	x19, x0
102e1f5ec:     	add	x0, x20, #0x8
102e1f5f0:     	b	0x102e1f7d0
102e1f5f4:     	mov	x19, x0
102e1f5f8:     	add	x8, sp, #0x1a0
102e1f5fc:     	b	0x102e1f680
102e1f600:     	b	0x102e1f7c0
102e1f604:     	mov	x19, x0
102e1f608:     	add	x0, x25, #0x8
102e1f60c:     	b	0x102e1f7d0
102e1f610:     	b	0x102e1f614
102e1f614:     	mov	x19, x0
102e1f618:     	ldr	x0, [sp, #0x8]
102e1f61c:     	b	0x102e1f7d0
102e1f620:     	mov	x24, x0
102e1f624:     	mov	x0, x25
102e1f628:     	bl	0x10001022c
102e1f62c:     	b	0x102e1f6bc
102e1f630:     	b	0x102e1f704
102e1f634:     	b	0x102e1f6dc
102e1f638:     	mov	x19, x0
102e1f63c:     	add	x0, x20, #0x8
102e1f640:     	bl	0x10001022c
102e1f644:     	b	0x102e1f7cc
102e1f648:     	b	0x102e1f7c0
102e1f64c:     	b	0x102e1f7c8
102e1f650:     	b	0x102e1f6b4
102e1f654:     	b	0x102e1f6b4
102e1f658:     	mov	x19, x0
102e1f65c:     	mov	x0, x21
102e1f660:     	bl	0x10001022c
102e1f664:     	add	x0, x22, #0x8
102e1f668:     	b	0x102e1f7d0
102e1f66c:     	b	0x102e1f704
102e1f670:     	b	0x102e1f7c0
102e1f674:     	b	0x102e1f7c0
102e1f678:     	mov	x19, x0
102e1f67c:     	add	x8, sp, #0x70
102e1f680:     	add	x0, x8, #0x8
102e1f684:     	b	0x102e1f7d0
102e1f688:     	str	x25, [sp, #0x10]
102e1f68c:     	mov	x24, x0
102e1f690:     	add	x0, x21, #0x8
102e1f694:     	bl	0x10001022c
102e1f698:     	b	0x102e1f6a4
102e1f69c:     	str	x25, [sp, #0x10]
102e1f6a0:     	mov	x24, x0
102e1f6a4:     	add	x8, sp, #0x1d0
102e1f6a8:     	add	x0, x8, #0x8
102e1f6ac:     	b	0x102e1f6c0
102e1f6b0:     	b	0x102e1f704
102e1f6b4:     	str	x25, [sp, #0x10]
102e1f6b8:     	mov	x24, x0
102e1f6bc:     	add	x0, x21, #0x8
102e1f6c0:     	bl	0x10001022c
102e1f6c4:     	b	0x102e1f70c
102e1f6c8:     	b	0x102e1f7c0
102e1f6cc:     	b	0x102e1f7c0
102e1f6d0:     	b	0x102e1f7c8
102e1f6d4:     	b	0x102e1f7c0
102e1f6d8:     	b	0x102e1f7c0
102e1f6dc:     	mov	x19, x0
102e1f6e0:     	add	x0, x27, #0x8
102e1f6e4:     	bl	0x10001022c
102e1f6e8:     	add	x0, x26, #0x8
102e1f6ec:     	b	0x102e1f7d0
102e1f6f0:     	b	0x102e1f7c0
102e1f6f4:     	b	0x102e1f7c8
102e1f6f8:     	b	0x102e1f7c8
102e1f6fc:     	b	0x102e1f704
102e1f700:     	b	0x102e1f7c0
102e1f704:     	str	x25, [sp, #0x10]
102e1f708:     	mov	x24, x0
102e1f70c:     	mov	x0, x24
102e1f710:     	bl	0x103bdd3dc
102e1f714:     	ldr	w8, [x19, #0xa8]
102e1f718:     	ldr	w9, [sp, #0xbc]
102e1f71c:     	orr	w8, w8, w9
102e1f720:     	cbz	w8, 0x102e1f780
102e1f724:     	str	wzr, [x19, #0xa8]
102e1f728:     	adrp	x8, 0x104cd4000
102e1f72c:     	str	wzr, [x8, #0x390]
102e1f730:     	ldr	x8, [x23]
102e1f734:     	ldr	x8, [x8, #0x88]
102e1f738:     	add	x1, sp, #0x208
102e1f73c:     	mov	x0, x23
102e1f740:     	blr	x8
102e1f744:     	ldr	x0, [x20]
102e1f748:     	bl	0x1021c39cc
102e1f74c:     	ldr	x8, [sp, #0x10]
102e1f750:     	add	x8, x8, #0x39c
102e1f754:     	add	x9, sp, #0x70
102e1f758:     	ldr	q0, [x8]
102e1f75c:     	add	x8, x19, #0x4b8
102e1f760:     	movi.2d	v1, #0000000000000000
102e1f764:     	str	q1, [x8]
102e1f768:     	str	q0, [sp, #0x70]
102e1f76c:     	orr	x0, x9, #0x8
102e1f770:     	bl	0x100015a60
102e1f774:     	add	x1, sp, #0x208
102e1f778:     	mov	x0, x19
102e1f77c:     	bl	0x102e21cfc
102e1f780:     	str	wzr, [x19, #0x11c]
102e1f784:     	str	wzr, [x19, #0x1d8]
102e1f788:     	str	wzr, [x19, #0x4c8]
102e1f78c:     	str	wzr, [sp, #0xbc]
102e1f790:     	bl	0x103bdd3f4
102e1f794:     	ldr	x25, [sp, #0x10]
102e1f798:     	b	0x102e1e7c0
102e1f79c:     	bl	0x103bdd3dc
102e1f7a0:     	bl	0x103bdd3f4
102e1f7a4:     	b	0x102e1f744
102e1f7a8:     	mov	x19, x0
102e1f7ac:     	bl	0x103bdd3f4
102e1f7b0:     	b	0x102e1f7d4
102e1f7b4:     	bl	0x1000102a0
102e1f7b8:     	b	0x102e1f7c0
102e1f7bc:     	b	0x102e1f7c8
102e1f7c0:     	mov	x19, x0
102e1f7c4:     	b	0x102e1f7d4
102e1f7c8:     	mov	x19, x0
102e1f7cc:     	add	x0, x21, #0x8
102e1f7d0:     	bl	0x10001022c
102e1f7d4:     	add	x0, sp, #0x208
102e1f7d8:     	bl	0x1005ee6bc
102e1f7dc:     	mov	x0, x19
102e1f7e0:     	bl	0x103bda970

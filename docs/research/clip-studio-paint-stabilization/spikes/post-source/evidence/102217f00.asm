
FUNCTION 0x102217f00 size 112
102217f00:     	fsub	d1, d1, d0
102217f04:     	adrp	x8, 0x1042ef000
102217f08:     	ldr	d3, [x8, #0x18]
102217f0c:     	fcmp	d1, d3
102217f10:     	adrp	x9, 0x1042f3000
102217f14:     	adrp	x8, 0x1042f3000
102217f18:     	b.le	0x102217f24
102217f1c:     	ldr	d3, [x8, #0xa8]
102217f20:     	b	0x102217f38
102217f24:     	adrp	x10, 0x1042f3000
102217f28:     	ldr	d3, [x10, #0xb0]
102217f2c:     	fcmp	d1, d3
102217f30:     	b.pl	0x102217f3c
102217f34:     	ldr	d3, [x9, #0xb8]
102217f38:     	fadd	d1, d1, d3
102217f3c:     	fmadd	d0, d1, d2, d0
102217f40:     	ldr	d1, [x9, #0xb8]
102217f44:     	fcmp	d0, d1
102217f48:     	b.le	0x102217f64
102217f4c:     	ldr	d2, [x8, #0xa8]
102217f50:     	fadd	d0, d0, d2
102217f54:     	fcmp	d0, d1
102217f58:     	b.gt	0x102217f50
102217f5c:     	b	0x102217f64
102217f60:     	fadd	d0, d0, d1
102217f64:     	fcmp	d0, #0.0
102217f68:     	b.mi	0x102217f60
102217f6c:     	ret

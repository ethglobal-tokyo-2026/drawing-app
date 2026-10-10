
FUNCTION 0x102217e30 size 40
102217e30:     	fcvtzs	w8, d0
102217e34:     	scvtf	d1, w8
102217e38:     	fsub	d0, d0, d1
102217e3c:     	adrp	x9, 0x10451c000
102217e40:     	add	x9, x9, #0xbd8
102217e44:     	add	x8, x9, w8, sxtw #3
102217e48:     	ldp	d1, d2, [x8]
102217e4c:     	fsub	d2, d2, d1
102217e50:     	fmadd	d0, d2, d0, d1
102217e54:     	ret

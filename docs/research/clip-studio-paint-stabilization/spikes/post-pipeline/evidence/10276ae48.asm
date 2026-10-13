
FUNCTION 0x10276ae48 size 80
10276ae48:     	adrp	x8, 0x104a52000
10276ae4c:     	add	x8, x8, #0xb60
10276ae50:     	str	x8, [x0]
10276ae54:     	movi.2d	v0, #0000000000000000
10276ae58:     	stur	q0, [x0, #0x8]
10276ae5c:     	stur	q0, [x0, #0x18]
10276ae60:     	stur	q0, [x0, #0x28]
10276ae64:     	stur	q0, [x0, #0x34]
10276ae68:     	adrp	x8, 0x104483000
10276ae6c:     	ldr	q0, [x8, #0x980]
10276ae70:     	stur	q0, [x0, #0x44]
10276ae74:     	adrp	x8, 0x104486000
10276ae78:     	ldr	q0, [x8, #0x40]
10276ae7c:     	stur	q0, [x0, #0x54]
10276ae80:     	str	xzr, [x0, #0x68]
10276ae84:     	str	wzr, [x0, #0x64]
10276ae88:     	adrp	x8, 0x1042ed000
10276ae8c:     	ldr	d0, [x8, #0x458]
10276ae90:     	str	d0, [x0, #0x70]
10276ae94:     	ret

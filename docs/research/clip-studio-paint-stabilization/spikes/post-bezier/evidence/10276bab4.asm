
FUNCTION 0x10276bab4 size 60
10276bab4:     	mov	x2, x1
10276bab8:     	ldr	x1, [x0, #0x28]
10276babc:     	cbz	x1, 0x10276bacc
10276bac0:     	ldr	x8, [x0]
10276bac4:     	ldr	x3, [x8, #0x88]
10276bac8:     	br	x3
10276bacc:     	ldr	x8, [x0, #0x38]
10276bad0:     	ldrb	w9, [x8, #0x21]
10276bad4:     	tbz	w9, #0x0, 0x10276bae0
10276bad8:     	ldr	x1, [x8, #0x30]
10276badc:     	cbnz	x1, 0x10276bac0
10276bae0:     	ldur	q0, [x0, #0x8]
10276bae4:     	str	q0, [x2]
10276bae8:     	movi	d0, #0000000000000000
10276baec:     	ret

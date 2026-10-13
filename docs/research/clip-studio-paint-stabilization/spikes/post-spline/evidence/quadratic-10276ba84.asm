
FUNCTION 0x10276ba84 size 48
10276ba84:     	ldr	x2, [x0, #0x28]
10276ba88:     	cbz	x2, 0x10276ba98
10276ba8c:     	ldr	x8, [x0]
10276ba90:     	ldr	x3, [x8, #0x78]
10276ba94:     	br	x3
10276ba98:     	ldr	x8, [x0, #0x38]
10276ba9c:     	ldrb	w9, [x8, #0x21]
10276baa0:     	tbz	w9, #0x0, 0x10276baac
10276baa4:     	ldr	x2, [x8, #0x30]
10276baa8:     	cbnz	x2, 0x10276ba8c
10276baac:     	movi	d0, #0000000000000000
10276bab0:     	ret

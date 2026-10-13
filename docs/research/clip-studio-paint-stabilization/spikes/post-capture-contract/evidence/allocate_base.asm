
FUNCTION 0x10277ee70 size 48
10277ee70:     	mov	x8, x0
10277ee74:     	ldr	x0, [x8, #0x8]!
10277ee78:     	cbz	x0, 0x10277ee88
10277ee7c:     	ldr	x9, [x0]
10277ee80:     	str	x9, [x8]
10277ee84:     	b	0x10276ae98
10277ee88:     	stp	x29, x30, [sp, #-0x10]!
10277ee8c:     	mov	x29, sp
10277ee90:     	mov	x0, x8
10277ee94:     	bl	0x10277ef38
10277ee98:     	ldp	x29, x30, [sp], #0x10
10277ee9c:     	b	0x10276ae98

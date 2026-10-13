
FUNCTION 0x10276afac size 44
10276afac:     	mov	x8, x0
10276afb0:     	ldr	x0, [x0, #0x30]
10276afb4:     	cbz	x0, 0x10276afbc
10276afb8:     	ret
10276afbc:     	ldr	x8, [x8, #0x38]
10276afc0:     	ldrb	w9, [x8, #0x21]
10276afc4:     	tbnz	w9, #0x0, 0x10276afd0
10276afc8:     	mov	x0, #0x0                ; =0
10276afcc:     	ret
10276afd0:     	ldr	x0, [x8, #0x38]
10276afd4:     	ret


FUNCTION 0x10276af54 size 44
10276af54:     	mov	x8, x0
10276af58:     	ldr	x0, [x0, #0x28]
10276af5c:     	cbz	x0, 0x10276af64
10276af60:     	ret
10276af64:     	ldr	x8, [x8, #0x38]
10276af68:     	ldrb	w9, [x8, #0x21]
10276af6c:     	tbnz	w9, #0x0, 0x10276af78
10276af70:     	mov	x0, #0x0                ; =0
10276af74:     	ret
10276af78:     	ldr	x0, [x8, #0x30]
10276af7c:     	ret

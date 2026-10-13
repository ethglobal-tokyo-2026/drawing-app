
FUNCTION 0x10276afd8 size 44
10276afd8:     	mov	x8, x0
10276afdc:     	ldr	x0, [x0, #0x30]
10276afe0:     	cbz	x0, 0x10276afe8
10276afe4:     	ret
10276afe8:     	ldr	x8, [x8, #0x38]
10276afec:     	ldrb	w9, [x8, #0x21]
10276aff0:     	tbnz	w9, #0x0, 0x10276affc
10276aff4:     	mov	x0, #0x0                ; =0
10276aff8:     	ret
10276affc:     	ldr	x0, [x8, #0x38]
10276b000:     	ret

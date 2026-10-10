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
10276af80:     	mov	x8, x0
10276af84:     	ldr	x0, [x0, #0x28]
10276af88:     	cbz	x0, 0x10276af90
10276af8c:     	ret
10276af90:     	ldr	x8, [x8, #0x38]
10276af94:     	ldrb	w9, [x8, #0x21]
10276af98:     	tbnz	w9, #0x0, 0x10276afa4
10276af9c:     	mov	x0, #0x0                ; =0
10276afa0:     	ret
10276afa4:     	ldr	x0, [x8, #0x30]
10276afa8:     	ret
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
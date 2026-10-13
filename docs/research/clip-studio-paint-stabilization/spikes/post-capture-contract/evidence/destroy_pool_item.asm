
FUNCTION 0x10277eea0 size 60
10277eea0:     	stp	x20, x19, [sp, #-0x20]!
10277eea4:     	stp	x29, x30, [sp, #0x10]
10277eea8:     	add	x29, sp, #0x10
10277eeac:     	mov	x19, x1
10277eeb0:     	mov	x20, x0
10277eeb4:     	ldr	x8, [x1]
10277eeb8:     	ldr	x8, [x8]
10277eebc:     	mov	x0, x1
10277eec0:     	blr	x8
10277eec4:     	ldr	x8, [x20, #0x8]
10277eec8:     	str	x8, [x19]
10277eecc:     	str	x19, [x20, #0x8]
10277eed0:     	ldp	x29, x30, [sp, #0x10]
10277eed4:     	ldp	x20, x19, [sp], #0x20
10277eed8:     	ret

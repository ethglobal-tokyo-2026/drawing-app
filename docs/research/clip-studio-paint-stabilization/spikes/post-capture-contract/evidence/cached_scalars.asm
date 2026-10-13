10276cc24:     	add	x8, x22, #0x70
10276cc28:     	cbz	w7, 0x10276cc40
10276cc2c:     	ldr	d0, [x19, #0x8]
10276cc30:     	fcvt	s0, d0
10276cc34:     	str	s0, [x22, #0x6c]
10276cc38:     	mov	x9, x19
10276cc3c:     	b	0x10276cc54
10276cc40:     	ldr	s0, [x22, #0x6c]
10276cc44:     	fcvt	d0, s0
10276cc48:     	str	d0, [x19, #0x8]
10276cc4c:     	mov	x9, x8
10276cc50:     	mov	x8, x19
10276cc54:     	ldr	d0, [x9]
10276cc58:     	str	d0, [x8]


FUNCTION 0x102764ac8 size 96
102764ac8:     	stp	x20, x19, [sp, #-0x20]!
102764acc:     	stp	x29, x30, [sp, #0x10]
102764ad0:     	add	x29, sp, #0x10
102764ad4:     	mov	x19, x0
102764ad8:     	ldr	q0, [x1]
102764adc:     	stur	q0, [x0, #0x78]
102764ae0:     	bl	0x10276af54
102764ae4:     	cbz	x0, 0x102764b1c
102764ae8:     	adrp	x1, 0x104a52000
102764aec:     	add	x1, x1, #0xc98
102764af0:     	adrp	x2, 0x104a52000
102764af4:     	add	x2, x2, #0x8e8
102764af8:     	mov	x3, #0x0                ; =0
102764afc:     	bl	0x103bdd454
102764b00:     	cbz	x0, 0x102764b1c
102764b04:     	ldur	q0, [x19, #0x78]
102764b08:     	ldur	q1, [x0, #0x78]
102764b0c:     	fadd.2d	v0, v0, v1
102764b10:     	fmov.2d	v1, #0.50000000
102764b14:     	fmul.2d	v0, v0, v1
102764b18:     	stur	q0, [x0, #0x8]
102764b1c:     	ldp	x29, x30, [sp, #0x10]
102764b20:     	ldp	x20, x19, [sp], #0x20
102764b24:     	ret

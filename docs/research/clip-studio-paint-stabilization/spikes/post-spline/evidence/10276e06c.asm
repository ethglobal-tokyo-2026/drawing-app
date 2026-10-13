
FUNCTION 0x10276e06c size 140
10276e06c:     	stp	x20, x19, [sp, #-0x20]!
10276e070:     	stp	x29, x30, [sp, #0x10]
10276e074:     	add	x29, sp, #0x10
10276e078:     	mov	x2, x1
10276e07c:     	mov	x19, x0
10276e080:     	ldr	x0, [x0, #0x30]
10276e084:     	cbnz	x0, 0x10276e0a0
10276e088:     	ldr	x8, [x19, #0x38]
10276e08c:     	ldrb	w9, [x8, #0x21]
10276e090:     	tbnz	w9, #0x0, 0x10276e09c
10276e094:     	mov	x0, #0x0                ; =0
10276e098:     	b	0x10276e0a0
10276e09c:     	ldr	x0, [x8, #0x38]
10276e0a0:     	ldr	x8, [x19, #0x28]
10276e0a4:     	cbz	x8, 0x10276e0b0
10276e0a8:     	mov	w8, #0x1                ; =1
10276e0ac:     	b	0x10276e0c8
10276e0b0:     	ldr	x8, [x19, #0x38]
10276e0b4:     	ldrb	w9, [x8, #0x21]
10276e0b8:     	tbz	w9, #0x0, 0x10276e0e4
10276e0bc:     	ldr	x8, [x8, #0x30]
10276e0c0:     	cmp	x8, #0x0
10276e0c4:     	cset	w8, ne
10276e0c8:     	cmp	x0, #0x0
10276e0cc:     	ccmp	w8, #0x0, #0x4, ne
10276e0d0:     	b.eq	0x10276e0e4
10276e0d4:     	ldr	x8, [x0]
10276e0d8:     	ldr	x8, [x8, #0x128]
10276e0dc:     	mov	x1, x19
10276e0e0:     	blr	x8
10276e0e4:     	ldr	x0, [x19, #0x38]
10276e0e8:     	mov	x1, x19
10276e0ec:     	ldp	x29, x30, [sp, #0x10]
10276e0f0:     	ldp	x20, x19, [sp], #0x20
10276e0f4:     	b	0x102781838

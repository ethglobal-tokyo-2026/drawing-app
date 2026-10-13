
FUNCTION 0x1028ec8d0 size 244
1028ec8d0:     	sub	sp, sp, #0xa0
1028ec8d4:     	stp	x22, x21, [sp, #0x70]
1028ec8d8:     	stp	x20, x19, [sp, #0x80]
1028ec8dc:     	stp	x29, x30, [sp, #0x90]
1028ec8e0:     	add	x29, sp, #0x90
1028ec8e4:     	mov	x21, x3
1028ec8e8:     	mov	x20, x2
1028ec8ec:     	mov	x19, x0
1028ec8f0:     	ldp	q0, q1, [x1, #0x20]
1028ec8f4:     	stp	q0, q1, [sp, #0x30]
1028ec8f8:     	ldr	q0, [x1, #0x40]
1028ec8fc:     	str	q0, [sp, #0x50]
1028ec900:     	ldr	x8, [x1, #0x50]
1028ec904:     	str	x8, [sp, #0x60]
1028ec908:     	ldp	q0, q1, [x1]
1028ec90c:     	stp	q0, q1, [sp, #0x10]
1028ec910:     	add	x1, sp, #0x10
1028ec914:     	bl	0x1028ec4e0
1028ec918:     	ldr	x0, [x19, #0x18]
1028ec91c:     	bl	0x102781770
1028ec920:     	mov	x22, x0
1028ec924:     	ldr	x8, [x0]
1028ec928:     	ldr	x8, [x8, #0x30]
1028ec92c:     	add	x1, x19, #0x68
1028ec930:     	add	x2, sp, #0x10
1028ec934:     	blr	x8
1028ec938:     	mov	x0, x22
1028ec93c:     	bl	0x10276b2c4
1028ec940:     	ldr	x0, [x19, #0x18]
1028ec944:     	bl	0x1027819bc
1028ec948:     	ldp	q0, q1, [sp, #0x30]
1028ec94c:     	stur	q0, [x19, #0x88]
1028ec950:     	stur	q1, [x19, #0x98]
1028ec954:     	ldr	q0, [sp, #0x50]
1028ec958:     	stur	q0, [x19, #0xa8]
1028ec95c:     	ldr	x8, [sp, #0x60]
1028ec960:     	str	x8, [x19, #0xb8]
1028ec964:     	ldp	q0, q1, [sp, #0x10]
1028ec968:     	stur	q0, [x19, #0x68]
1028ec96c:     	stur	q1, [x19, #0x78]
1028ec970:     	stp	xzr, xzr, [sp]
1028ec974:     	cbz	w21, 0x1028ec9a0
1028ec978:     	ldr	x0, [x19, #0x8]
1028ec97c:     	ldr	x1, [x19, #0x18]
1028ec980:     	add	x2, x19, #0x28
1028ec984:     	add	x3, x19, #0x48
1028ec988:     	mov	w4, #0x1                ; =1
1028ec98c:     	bl	0x1024a1f04
1028ec990:     	stp	x0, x1, [sp]
1028ec994:     	mov	x1, sp
1028ec998:     	mov	x0, x19
1028ec99c:     	bl	0x1028ec7c4
1028ec9a0:     	mov	x1, sp
1028ec9a4:     	mov	x0, x20
1028ec9a8:     	bl	0x10221b5e4
1028ec9ac:     	ldr	x0, [x19, #0x18]
1028ec9b0:     	ldp	x29, x30, [sp, #0x90]
1028ec9b4:     	ldp	x20, x19, [sp, #0x80]
1028ec9b8:     	ldp	x22, x21, [sp, #0x70]
1028ec9bc:     	add	sp, sp, #0xa0
1028ec9c0:     	ret

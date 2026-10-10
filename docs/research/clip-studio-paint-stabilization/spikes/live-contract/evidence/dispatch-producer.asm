
FUNCTION 0x1021f0b1c size 116
1021f0b1c:     	sub	sp, sp, #0x40
1021f0b20:     	stp	x20, x19, [sp, #0x20]
1021f0b24:     	stp	x29, x30, [sp, #0x30]
1021f0b28:     	add	x29, sp, #0x30
1021f0b2c:     	mov	x19, x1
1021f0b30:     	mov	x20, x0
1021f0b34:     	bl	0x1020bdaa4
1021f0b38:     	cbz	x0, 0x1021f0b6c
1021f0b3c:     	adrp	x8, 0x1021f0000
1021f0b40:     	add	x8, x8, #0xb90
1021f0b44:     	adrp	x9, 0x1048cb000
1021f0b48:     	ldr	x9, [x9, #0xa38]
1021f0b4c:     	orr	x9, x9, #0x1
1021f0b50:     	stp	x9, x8, [sp]
1021f0b54:     	mov	x3, sp
1021f0b58:     	mov	x1, x20
1021f0b5c:     	mov	x2, x19
1021f0b60:     	bl	0x1020bdb6c
1021f0b64:     	mov	x0, sp
1021f0b68:     	bl	0x101b7db3c
1021f0b6c:     	ldp	x29, x30, [sp, #0x30]
1021f0b70:     	ldp	x20, x19, [sp, #0x20]
1021f0b74:     	add	sp, sp, #0x40
1021f0b78:     	ret
1021f0b7c:     	mov	x19, x0
1021f0b80:     	mov	x0, sp
1021f0b84:     	bl	0x101b7db3c
1021f0b88:     	mov	x0, x19
1021f0b8c:     	bl	0x103bda970

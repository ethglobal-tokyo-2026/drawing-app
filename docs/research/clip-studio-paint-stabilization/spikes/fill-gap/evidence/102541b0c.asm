; CSP 5.1.4 ARM64, unslid range 0x102541b0c:0x102541c0c
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102541b0c:     	stp	x22, x21, [sp, #-0x30]!
102541b10:     	stp	x20, x19, [sp, #0x10]
102541b14:     	stp	x29, x30, [sp, #0x20]
102541b18:     	add	x29, sp, #0x20
102541b1c:     	mov	x21, x1
102541b20:     	ldr	q0, [x5]
102541b24:     	fmov	s1, w21
102541b28:     	mov.s	v1[1], w2
102541b2c:     	dup.2d	v1, v1[0]
102541b30:     	cmgt.4s	v2, v0, v1
102541b34:     	xtn.4h	v2, v2
102541b38:     	cmge.4s	v0, v1, v0
102541b3c:     	xtn.4h	v0, v0
102541b40:     	mov.s	v0[1], v2[1]
102541b44:     	uminv.4h	h0, v0
102541b48:     	fmov	w8, s0
102541b4c:     	tbnz	w8, #0x0, 0x102541b58
102541b50:     	mov	w0, #0x0                ; =0
102541b54:     	b	0x102541bfc
102541b58:     	mov	x20, x2
102541b5c:     	mov	x19, x0
102541b60:     	cbz	w3, 0x102541b84
102541b64:     	ldr	w8, [x19, #0x1f0]
102541b68:     	cbz	w8, 0x102541bb0
102541b6c:     	mov	x0, x19
102541b70:     	mov	x1, x21
102541b74:     	mov	x2, x20
102541b78:     	bl	0x10254343c
102541b7c:     	cbnz	w0, 0x102541bf8
102541b80:     	b	0x102541bfc
102541b84:     	cbz	w4, 0x102541bf8
102541b88:     	ldr	x0, [x19, #0xc8]
102541b8c:     	ldr	w8, [x19, #0x1d8]
102541b90:     	ldr	w9, [x19, #0x1dc]
102541b94:     	add	w1, w8, w21
102541b98:     	add	w2, w9, w20
102541b9c:     	bl	0x103687eec
102541ba0:     	ldr	x8, [x19, #0x78]
102541ba4:     	ldr	w8, [x8, w0, sxtw #2]
102541ba8:     	tbz	w8, #0x1, 0x102541b50
102541bac:     	b	0x102541bf8
102541bb0:     	ldr	w8, [x19, #0x1f8]
102541bb4:     	cbnz	w8, 0x102541bdc
102541bb8:     	ldr	x0, [x19, #0xc8]
102541bbc:     	ldr	w8, [x19, #0x1d8]
102541bc0:     	ldr	w9, [x19, #0x1dc]
102541bc4:     	add	w1, w8, w21
102541bc8:     	add	w2, w9, w20
102541bcc:     	bl	0x103687eec
102541bd0:     	ldr	x8, [x19, #0x78]
102541bd4:     	ldr	w8, [x8, w0, sxtw #2]
102541bd8:     	tbnz	w8, #0x1, 0x102541bf8
102541bdc:     	ldr	w8, [x19, #0x1d8]
102541be0:     	ldr	w9, [x19, #0x1dc]
102541be4:     	add	w1, w8, w21
102541be8:     	add	w2, w9, w20
102541bec:     	mov	x0, x19
102541bf0:     	bl	0x102540ac4
102541bf4:     	cbz	w0, 0x102541bfc
102541bf8:     	mov	w0, #0x1                ; =1
102541bfc:     	ldp	x29, x30, [sp, #0x20]
102541c00:     	ldp	x20, x19, [sp, #0x10]
102541c04:     	ldp	x22, x21, [sp], #0x30
102541c08:     	ret

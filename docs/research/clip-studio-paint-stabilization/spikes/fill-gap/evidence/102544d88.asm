; CSP 5.1.4 ARM64, unslid range 0x102544d88:0x102544dd0
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102544d88:     	ldr	x8, [x0]
102544d8c:     	lsl	w9, w1, #8
102544d90:     	add	w9, w9, #0x100
102544d94:     	ldp	x11, x10, [x8]
102544d98:     	ldr	w11, [x11]
102544d9c:     	sub	w12, w11, w1, lsl #8
102544da0:     	mov	w13, #0x100             ; =256
102544da4:     	cmp	w9, w11
102544da8:     	csel	w3, w13, w12, lt
102544dac:     	ldr	x0, [x10, #0x190]
102544db0:     	ldp	x9, x8, [x8, #0x10]
102544db4:     	ldp	w11, w2, [x9]
102544db8:     	add	w1, w11, w1, lsl #8
102544dbc:     	ldr	w4, [x8]
102544dc0:     	ldr	x5, [x10, #0x1b0]
102544dc4:     	mov	x6, x1
102544dc8:     	mov	x7, x2
102544dcc:     	b	0x1020904dc

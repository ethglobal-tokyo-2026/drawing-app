; CSP 5.1.4 ARM64, unslid range 0x102544c80:0x102544cc8
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102544c80:     	ldr	x8, [x0]
102544c84:     	lsl	w9, w1, #8
102544c88:     	add	w9, w9, #0x100
102544c8c:     	ldp	x11, x10, [x8]
102544c90:     	ldr	w11, [x11]
102544c94:     	sub	w12, w11, w1, lsl #8
102544c98:     	mov	w13, #0x100             ; =256
102544c9c:     	cmp	w9, w11
102544ca0:     	csel	w3, w13, w12, lt
102544ca4:     	ldr	x0, [x10, #0x1b0]
102544ca8:     	ldp	x9, x8, [x8, #0x10]
102544cac:     	ldp	w11, w2, [x9]
102544cb0:     	add	w1, w11, w1, lsl #8
102544cb4:     	ldr	w4, [x8]
102544cb8:     	ldr	x5, [x10, #0x190]
102544cbc:     	mov	x6, x1
102544cc0:     	mov	x7, x2
102544cc4:     	b	0x1020904dc

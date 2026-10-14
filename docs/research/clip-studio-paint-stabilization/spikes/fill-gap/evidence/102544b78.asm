; CSP 5.1.4 ARM64, unslid range 0x102544b78:0x102544bc0
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102544b78:     	ldr	x8, [x0]
102544b7c:     	lsl	w9, w1, #8
102544b80:     	add	w9, w9, #0x100
102544b84:     	ldp	x11, x10, [x8]
102544b88:     	ldr	w11, [x11]
102544b8c:     	sub	w12, w11, w1, lsl #8
102544b90:     	mov	w13, #0x100             ; =256
102544b94:     	cmp	w9, w11
102544b98:     	csel	w3, w13, w12, lt
102544b9c:     	ldr	x0, [x10, #0x190]
102544ba0:     	ldp	x9, x8, [x8, #0x10]
102544ba4:     	ldp	w11, w2, [x9]
102544ba8:     	add	w1, w11, w1, lsl #8
102544bac:     	ldr	w4, [x8]
102544bb0:     	ldr	x5, [x10, #0x1b0]
102544bb4:     	mov	x6, x1
102544bb8:     	mov	x7, x2
102544bbc:     	b	0x1020904dc

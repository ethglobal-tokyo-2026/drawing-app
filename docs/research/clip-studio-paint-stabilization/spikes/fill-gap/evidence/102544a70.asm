; CSP 5.1.4 ARM64, unslid range 0x102544a70:0x102544ab8
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102544a70:     	ldr	x8, [x0]
102544a74:     	lsl	w9, w1, #8
102544a78:     	add	w9, w9, #0x100
102544a7c:     	ldp	x11, x10, [x8]
102544a80:     	ldr	w11, [x11]
102544a84:     	sub	w12, w11, w1, lsl #8
102544a88:     	mov	w13, #0x100             ; =256
102544a8c:     	cmp	w9, w11
102544a90:     	csel	w3, w13, w12, lt
102544a94:     	ldr	x0, [x10, #0x1b0]
102544a98:     	ldp	x9, x8, [x8, #0x10]
102544a9c:     	ldp	w11, w2, [x9]
102544aa0:     	add	w1, w11, w1, lsl #8
102544aa4:     	ldr	w4, [x8]
102544aa8:     	ldr	x5, [x10, #0x190]
102544aac:     	mov	x6, x1
102544ab0:     	mov	x7, x2
102544ab4:     	b	0x1020904dc

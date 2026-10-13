
FUNCTION 0x1021bca90 size 76
1021bca90:     	sub	sp, sp, #0x40
1021bca94:     	stp	x20, x19, [sp, #0x20]
1021bca98:     	stp	x29, x30, [sp, #0x30]
1021bca9c:     	add	x29, sp, #0x30
1021bcaa0:     	mov	x19, x1
1021bcaa4:     	mov	x20, sp
1021bcaa8:     	mov	x8, sp
1021bcaac:     	add	x0, x0, #0x58
1021bcab0:     	bl	0x1021d574c
1021bcab4:     	mov	x1, sp
1021bcab8:     	mov	x0, x19
1021bcabc:     	bl	0x103116448
1021bcac0:     	add	x0, x19, #0x10
1021bcac4:     	add	x1, x20, #0x10
1021bcac8:     	bl	0x103116448
1021bcacc:     	ldp	x29, x30, [sp, #0x30]
1021bcad0:     	ldp	x20, x19, [sp, #0x20]
1021bcad4:     	add	sp, sp, #0x40
1021bcad8:     	ret

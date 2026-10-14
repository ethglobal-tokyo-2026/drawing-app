; CSP 5.1.4 ARM64, unslid range 0x10339dc98:0x10339dcc8
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
10339dc98:     	stp	x20, x19, [sp, #-0x20]!
10339dc9c:     	stp	x29, x30, [sp, #0x10]
10339dca0:     	add	x29, sp, #0x10
10339dca4:     	mov	x19, x1
10339dca8:     	mov	x20, x0
10339dcac:     	bl	0x10339d934
10339dcb0:     	ldr	w2, [x0, #0x8]
10339dcb4:     	mov	x0, x20
10339dcb8:     	mov	x1, x19
10339dcbc:     	ldp	x29, x30, [sp, #0x10]
10339dcc0:     	ldp	x20, x19, [sp], #0x20
10339dcc4:     	b	0x102218260

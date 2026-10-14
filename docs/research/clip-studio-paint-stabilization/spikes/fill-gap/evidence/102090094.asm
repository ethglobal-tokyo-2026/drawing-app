; CSP 5.1.4 ARM64, unslid range 0x102090094:0x1020900d0
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102090094:     	ldr	w8, [x0, #0x8]
102090098:     	ldr	w9, [x1, #0x8]
10209009c:     	cmp	w8, w9
1020900a0:     	b.ne	0x1020900cc
1020900a4:     	ldr	w9, [x0, #0xc]
1020900a8:     	ldr	w8, [x1, #0xc]
1020900ac:     	cmp	w9, w8
1020900b0:     	b.ne	0x1020900cc
1020900b4:     	ldr	x8, [x0, #0x28]
1020900b8:     	ldr	x1, [x1, #0x28]
1020900bc:     	ldr	w10, [x0, #0x10]
1020900c0:     	mul	w2, w10, w9
1020900c4:     	mov	x0, x8
1020900c8:     	b	0x10310f1e8
1020900cc:     	ret

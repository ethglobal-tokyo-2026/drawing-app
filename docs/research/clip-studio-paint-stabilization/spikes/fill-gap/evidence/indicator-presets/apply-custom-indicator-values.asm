
/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64:	file format mach-o arm64

Disassembly of section __TEXT,__text:

000000010000f680 <__text>:
100f2708c:     	ldp	x9, x8, [x29, #-0x60]
100f27090:     	stp	x9, x8, [sp, #0x70]
100f27094:     	cbz	x8, 0x100f270a4 <__text+0xf17a24>
100f27098:     	add	x8, x8, #0x8
100f2709c:     	mov	w9, #0x1                ; =1
100f270a0:     	ldadd	w9, w8, [x8]
100f270a4:     	add	x25, sp, #0x70
100f270a8:     	ldr	x8, [x22]
100f270ac:     	ldr	w3, [x8, #0x60]
100f270b0:     	ldp	d1, d0, [x8, #0x50]
100f270b4:     	add	x0, sp, #0x70
100f270b8:     	and	w2, w24, #0x2
100f270bc:     	mov	x1, x23
100f270c0:     	mov	x4, x21
100f270c4:     	bl	0x100f28a78 <__text+0xf193f8>
100f270c8:     	add	x0, x25, #0x8
100f270cc:     	b	0x100f271e8 <__text+0xf17b68>

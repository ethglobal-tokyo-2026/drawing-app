
FUNCTION 0x1024a9740 size 108
1024a9740:     	sub	sp, sp, #0x20
1024a9744:     	stp	x29, x30, [sp, #0x10]
1024a9748:     	add	x29, sp, #0x10
1024a974c:     	ldr	x10, [x0, #0x60]
1024a9750:     	mov	x9, sp
1024a9754:     	stp	xzr, x10, [sp]
1024a9758:     	cbz	x10, 0x1024a978c
1024a975c:     	ldr	w11, [x10, #0x8]
1024a9760:     	cbz	w11, 0x1024a9788
1024a9764:     	add	w12, w11, #0x1
1024a9768:     	add	x13, x10, #0x8
1024a976c:     	mov	x14, x11
1024a9770:     	cas	w14, w12, [x13]
1024a9774:     	cmp	w14, w11
1024a9778:     	mov	x11, x14
1024a977c:     	b.ne	0x1024a9760
1024a9780:     	ldr	x11, [x0, #0x58]
1024a9784:     	b	0x1024a9790
1024a9788:     	mov	x10, #0x0               ; =0
1024a978c:     	mov	x11, #0x0               ; =0
1024a9790:     	stp	x11, x10, [x8]
1024a9794:     	stp	xzr, xzr, [sp]
1024a9798:     	add	x0, x9, #0x8
1024a979c:     	bl	0x10001022c
1024a97a0:     	ldp	x29, x30, [sp, #0x10]
1024a97a4:     	add	sp, sp, #0x20
1024a97a8:     	ret

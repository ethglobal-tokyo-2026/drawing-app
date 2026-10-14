; CSP 5.1.4 ARM64, unslid range 0x10253d750:0x10253d804
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
10253d750:     	sub	sp, sp, #0x40
10253d754:     	stp	x20, x19, [sp, #0x20]
10253d758:     	stp	x29, x30, [sp, #0x30]
10253d75c:     	add	x29, sp, #0x30
10253d760:     	ldr	x8, [x0, #0x90]
10253d764:     	cbz	x8, 0x10253d7d8
10253d768:     	mov	x20, x0
10253d76c:     	add	x10, sp, #0x10
10253d770:     	ldr	x9, [x0, #0x98]
10253d774:     	add	x19, x10, #0x8
10253d778:     	stp	x8, x9, [sp, #0x10]
10253d77c:     	cbz	x9, 0x10253d78c
10253d780:     	add	x8, x9, #0x8
10253d784:     	mov	w9, #0x1                ; =1
10253d788:     	ldadd	w9, w8, [x8]
10253d78c:     	add	x0, sp, #0x10
10253d790:     	bl	0x10214ff74
10253d794:     	mov	x0, x19
10253d798:     	bl	0x10001022c
10253d79c:     	mov	x8, sp
10253d7a0:     	add	x19, x8, #0x8
10253d7a4:     	ldp	x9, x8, [x20, #0x90]
10253d7a8:     	stp	x9, x8, [sp]
10253d7ac:     	cbz	x8, 0x10253d7bc
10253d7b0:     	add	x8, x8, #0x8
10253d7b4:     	mov	w9, #0x1                ; =1
10253d7b8:     	ldadd	w9, w8, [x8]
10253d7bc:     	mov	x0, sp
10253d7c0:     	bl	0x10214ff2c
10253d7c4:     	str	w0, [x20, #0x1fc]
10253d7c8:     	mov	x0, x19
10253d7cc:     	bl	0x10001022c
10253d7d0:     	ldr	w0, [x20, #0x1fc]
10253d7d4:     	b	0x10253d7dc
10253d7d8:     	mov	w0, #0x0                ; =0
10253d7dc:     	ldp	x29, x30, [sp, #0x30]
10253d7e0:     	ldp	x20, x19, [sp, #0x20]
10253d7e4:     	add	sp, sp, #0x40
10253d7e8:     	ret
10253d7ec:     	b	0x10253d7f0
10253d7f0:     	mov	x20, x0
10253d7f4:     	mov	x0, x19
10253d7f8:     	bl	0x10001022c
10253d7fc:     	mov	x0, x20
10253d800:     	bl	0x103bda970

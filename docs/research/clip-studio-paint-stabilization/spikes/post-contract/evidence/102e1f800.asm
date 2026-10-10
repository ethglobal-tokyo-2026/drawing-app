
FUNCTION 0x102e1f800 size 116
102e1f800:     	sub	sp, sp, #0x40
102e1f804:     	stp	d9, d8, [sp, #0x10]
102e1f808:     	stp	x20, x19, [sp, #0x20]
102e1f80c:     	stp	x29, x30, [sp, #0x30]
102e1f810:     	add	x29, sp, #0x30
102e1f814:     	fmov	d8, d0
102e1f818:     	ldr	x0, [x0, #0x48]
102e1f81c:     	mov	x19, sp
102e1f820:     	mov	x8, sp
102e1f824:     	bl	0x102e54874
102e1f828:     	ldr	x0, [sp]
102e1f82c:     	cbz	x0, 0x102e1f83c
102e1f830:     	fmov	d0, d8
102e1f834:     	bl	0x1024a9bb4
102e1f838:     	fmov	d8, d0
102e1f83c:     	add	x0, x19, #0x8
102e1f840:     	bl	0x10001022c
102e1f844:     	fmov	d0, d8
102e1f848:     	ldp	x29, x30, [sp, #0x30]
102e1f84c:     	ldp	x20, x19, [sp, #0x20]
102e1f850:     	ldp	d9, d8, [sp, #0x10]
102e1f854:     	add	sp, sp, #0x40
102e1f858:     	ret
102e1f85c:     	mov	x19, x0
102e1f860:     	mov	x8, sp
102e1f864:     	add	x0, x8, #0x8
102e1f868:     	bl	0x10001022c
102e1f86c:     	mov	x0, x19
102e1f870:     	bl	0x103bda970

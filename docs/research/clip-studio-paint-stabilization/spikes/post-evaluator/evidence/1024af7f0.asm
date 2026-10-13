
FUNCTION 0x1024af7f0 size 176
1024af7f0:     	sub	sp, sp, #0x60
1024af7f4:     	stp	x22, x21, [sp, #0x30]
1024af7f8:     	stp	x20, x19, [sp, #0x40]
1024af7fc:     	stp	x29, x30, [sp, #0x50]
1024af800:     	add	x29, sp, #0x50
1024af804:     	mov	x19, x0
1024af808:     	ldr	w8, [x0, #0x8]
1024af80c:     	orr	w8, w8, #0x10
1024af810:     	str	w8, [x0, #0x8]
1024af814:     	str	s0, [x0, #0xc]
1024af818:     	ldr	x0, [x2]
1024af81c:     	ldp	x9, x8, [x1]
1024af820:     	stp	x9, x8, [sp]
1024af824:     	cbz	x8, 0x1024af834
1024af828:     	add	x8, x8, #0x8
1024af82c:     	mov	w9, #0x1                ; =1
1024af830:     	ldadd	w9, w8, [x8]
1024af834:     	mov	x20, sp
1024af838:     	add	x21, sp, #0x10
1024af83c:     	add	x8, sp, #0x10
1024af840:     	mov	x1, sp
1024af844:     	bl	0x1024cc188
1024af848:     	add	x8, sp, #0x20
1024af84c:     	ldr	q0, [sp, #0x10]
1024af850:     	stp	xzr, xzr, [sp, #0x10]
1024af854:     	ldur	q1, [x19, #0x28]
1024af858:     	stur	q0, [x19, #0x28]
1024af85c:     	str	q1, [sp, #0x20]
1024af860:     	orr	x0, x8, #0x8
1024af864:     	bl	0x10001022c
1024af868:     	orr	x0, x21, #0x8
1024af86c:     	bl	0x10001022c
1024af870:     	add	x0, x20, #0x8
1024af874:     	bl	0x10001022c
1024af878:     	ldp	x29, x30, [sp, #0x50]
1024af87c:     	ldp	x20, x19, [sp, #0x40]
1024af880:     	ldp	x22, x21, [sp, #0x30]
1024af884:     	add	sp, sp, #0x60
1024af888:     	ret
1024af88c:     	mov	x19, x0
1024af890:     	add	x0, x20, #0x8
1024af894:     	bl	0x10001022c
1024af898:     	mov	x0, x19
1024af89c:     	bl	0x103bda970

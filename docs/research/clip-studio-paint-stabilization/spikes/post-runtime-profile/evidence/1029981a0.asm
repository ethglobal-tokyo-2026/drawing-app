
FUNCTION 0x1029981a0 size 120
1029981a0:     	sub	sp, sp, #0x40
1029981a4:     	stp	x22, x21, [sp, #0x10]
1029981a8:     	stp	x20, x19, [sp, #0x20]
1029981ac:     	stp	x29, x30, [sp, #0x30]
1029981b0:     	add	x29, sp, #0x30
1029981b4:     	mov	x19, x2
1029981b8:     	mov	x20, x1
1029981bc:     	mov	x21, x0
1029981c0:     	ldp	x22, x9, [x0]
1029981c4:     	mov	x8, sp
1029981c8:     	stp	x22, x9, [sp]
1029981cc:     	cbz	x9, 0x1029981dc
1029981d0:     	add	x9, x9, #0x8
1029981d4:     	mov	w10, #0x1               ; =1
1029981d8:     	ldadd	w10, w9, [x9]
1029981dc:     	add	x0, x8, #0x8
1029981e0:     	bl	0x10001022c
1029981e4:     	cbz	x22, 0x102998200
1029981e8:     	ldr	x0, [x21]
1029981ec:     	bl	0x1021c0e88
1029981f0:     	mov	x1, x20
1029981f4:     	mov	x2, x19
1029981f8:     	bl	0x1029a42f8
1029981fc:     	b	0x102998204
102998200:     	mov	w0, #0x0                ; =0
102998204:     	ldp	x29, x30, [sp, #0x30]
102998208:     	ldp	x20, x19, [sp, #0x20]
10299820c:     	ldp	x22, x21, [sp, #0x10]
102998210:     	add	sp, sp, #0x40
102998214:     	ret

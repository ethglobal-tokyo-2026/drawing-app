
FUNCTION 0x1029a4378 size 124
1029a4378:     	cbz	x0, 0x1029a43f0
1029a437c:     	stp	x20, x19, [sp, #-0x20]!
1029a4380:     	stp	x29, x30, [sp, #0x10]
1029a4384:     	add	x29, sp, #0x10
1029a4388:     	mov	x19, x0
1029a438c:     	ldr	x0, [x0]
1029a4390:     	cbz	x0, 0x1029a43a4
1029a4394:     	ldr	x8, [x0]
1029a4398:     	ldr	x8, [x8, #0x10]
1029a439c:     	blr	x8
1029a43a0:     	b	0x1029a43ac
1029a43a4:     	adrp	x0, 0x1048c8000
1029a43a8:     	ldr	x0, [x0, #0x428]
1029a43ac:     	ldr	x8, [x0, #0x8]
1029a43b0:     	and	x0, x8, #0x7fffffffffffffff
1029a43b4:     	adrp	x8, 0x104555000
1029a43b8:     	add	x8, x8, #0x101
1029a43bc:     	mov	x9, #-0x8000000000000000 ; =-9223372036854775808
1029a43c0:     	add	x8, x8, x9
1029a43c4:     	and	x1, x8, #0x7fffffffffffffff
1029a43c8:     	cmp	x0, x1
1029a43cc:     	b.eq	0x1029a43e0
1029a43d0:     	bl	0x103bdfd64
1029a43d4:     	cbz	w0, 0x1029a43e0
1029a43d8:     	mov	x0, #0x0                ; =0
1029a43dc:     	b	0x1029a43e8
1029a43e0:     	ldr	x8, [x19]
1029a43e4:     	add	x0, x8, #0x8
1029a43e8:     	ldp	x29, x30, [sp, #0x10]
1029a43ec:     	ldp	x20, x19, [sp], #0x20
1029a43f0:     	ret

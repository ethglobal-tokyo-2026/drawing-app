
FUNCTION 0x102786868 size 132
102786868:     	stp	x20, x19, [sp, #-0x20]!
10278686c:     	stp	x29, x30, [sp, #0x10]
102786870:     	add	x29, sp, #0x10
102786874:     	mov	x20, x1
102786878:     	mov	x19, x0
10278687c:     	ldur	q0, [x0, #0x8]
102786880:     	mov.d	x9, v0[1]
102786884:     	fmov	x8, d0
102786888:     	subs	x10, x9, x8
10278688c:     	lsl	x10, x10, #6
102786890:     	sub	x10, x10, #0x1
102786894:     	cmp	x9, x8
102786898:     	csel	x11, xzr, x10, eq
10278689c:     	ldp	x10, x9, [x0, #0x20]
1027868a0:     	add	x10, x9, x10
1027868a4:     	cmp	x11, x10
1027868a8:     	b.ne	0x1027868c0
1027868ac:     	mov	x0, x19
1027868b0:     	bl	0x102786b7c
1027868b4:     	ldr	x8, [x19, #0x8]
1027868b8:     	ldp	x10, x9, [x19, #0x20]
1027868bc:     	add	x10, x10, x9
1027868c0:     	lsr	x11, x10, #6
1027868c4:     	and	x11, x11, #0x3fffffffffffff8
1027868c8:     	ldr	x8, [x8, x11]
1027868cc:     	and	x10, x10, #0x1ff
1027868d0:     	ldr	x11, [x20]
1027868d4:     	str	x11, [x8, x10, lsl #3]
1027868d8:     	add	x8, x9, #0x1
1027868dc:     	str	x8, [x19, #0x28]
1027868e0:     	ldp	x29, x30, [sp, #0x10]
1027868e4:     	ldp	x20, x19, [sp], #0x20
1027868e8:     	ret

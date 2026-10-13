
FUNCTION 0x10003be50 size 124
10003be50:     	sub	sp, sp, #0x20
10003be54:     	stp	x29, x30, [sp, #0x10]
10003be58:     	add	x29, sp, #0x10
10003be5c:     	ldr	x8, [x0]
10003be60:     	mov	x9, #-0x8000000000000000 ; =-9223372036854775808
10003be64:     	cmp	x8, x9
10003be68:     	b.ne	0x10003be84
10003be6c:     	ldr	x8, [x1]
10003be70:     	sdiv	x10, x9, x8
10003be74:     	msub	x8, x10, x8, x9
10003be78:     	str	x8, [sp, #0x8]
10003be7c:     	add	x0, sp, #0x8
10003be80:     	b	0x10003bea0
10003be84:     	ldr	x10, [x1]
10003be88:     	cmp	x10, x9
10003be8c:     	b.ne	0x10003beb0
10003be90:     	sdiv	x10, x9, x8
10003be94:     	msub	x8, x10, x8, x9
10003be98:     	str	x8, [sp, #0x8]
10003be9c:     	add	x1, sp, #0x8
10003bea0:     	bl	0x10003be50
10003bea4:     	ldp	x29, x30, [sp, #0x10]
10003bea8:     	add	sp, sp, #0x20
10003beac:     	ret
10003beb0:     	cmp	x8, #0x0
10003beb4:     	cneg	x0, x8, mi
10003beb8:     	cmp	x10, #0x0
10003bebc:     	cneg	x1, x10, mi
10003bec0:     	ldp	x29, x30, [sp, #0x10]
10003bec4:     	add	sp, sp, #0x20
10003bec8:     	b	0x10003c2b8

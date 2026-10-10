
FUNCTION 0x1020579a4 size 60
1020579a4:     	stp	x29, x30, [sp, #-0x10]!
1020579a8:     	mov	x29, sp
1020579ac:     	adrp	x8, 0x1048c8000
1020579b0:     	ldr	x8, [x8, #0x538]
1020579b4:     	ldr	x0, [x8]
1020579b8:     	bl	0x103be8d20
1020579bc:     	adrp	x8, 0x104c8e000
1020579c0:     	ldr	x8, [x8, #0x220]
1020579c4:     	cmp	x8, #0x3
1020579c8:     	mov	w8, #0x2                ; =2
1020579cc:     	cinc	w8, w8, eq
1020579d0:     	cmp	w0, #0x0
1020579d4:     	csinc	w0, w8, wzr, ne
1020579d8:     	ldp	x29, x30, [sp], #0x10
1020579dc:     	ret

FUNCTION 0x1020579e0 size 116
1020579e0:     	stp	x20, x19, [sp, #-0x20]!
1020579e4:     	stp	x29, x30, [sp, #0x10]
1020579e8:     	add	x29, sp, #0x10
1020579ec:     	mov	x19, x2
1020579f0:     	mov	x0, x2
1020579f4:     	bl	0x103bee740
1020579f8:     	mov	x8, x0
1020579fc:     	mov	w0, #0x0                ; =0
102057a00:     	cmp	x8, #0x1b
102057a04:     	b.hi	0x102057a2c
102057a08:     	mov	w9, #0x1                ; =1
102057a0c:     	lsl	x8, x9, x8
102057a10:     	mov	w9, #0xa0fe             ; =41214
102057a14:     	movk	w9, #0xfc1, lsl #16
102057a18:     	tst	x8, x9
102057a1c:     	b.eq	0x102057a2c
102057a20:     	mov	x0, x19
102057a24:     	bl	0x103bee160
102057a28:     	mov	w0, #0x1                ; =1
102057a2c:     	ldp	x29, x30, [sp, #0x10]
102057a30:     	ldp	x20, x19, [sp], #0x20
102057a34:     	ret
102057a38:     	cmp	w1, #0x1
102057a3c:     	b.ne	0x102057a50
102057a40:     	bl	0x103bdf65c
102057a44:     	bl	0x103bdf680
102057a48:     	mov	w0, #0x0                ; =0
102057a4c:     	b	0x102057a2c
102057a50:     	bl	0x103bda970

FUNCTION 0x102057a54 size 112
102057a54:     	stp	x20, x19, [sp, #-0x20]!
102057a58:     	stp	x29, x30, [sp, #0x10]
102057a5c:     	add	x29, sp, #0x10
102057a60:     	mov	x19, x2
102057a64:     	adrp	x8, 0x104af8000
102057a68:     	ldr	x0, [x8, #0x778]
102057a6c:     	bl	0x103be9140
102057a70:     	cbz	w0, 0x102057ab4
102057a74:     	adrp	x8, 0x1048c8000
102057a78:     	ldr	x8, [x8, #0x538]
102057a7c:     	ldr	x0, [x8]
102057a80:     	mov	x2, x19
102057a84:     	bl	0x103be9160
102057a88:     	tbnz	w0, #0x0, 0x102057a9c
102057a8c:     	mov	x0, x19
102057a90:     	bl	0x103bee160
102057a94:     	cmp	w0, #0x2
102057a98:     	b.ne	0x102057ab4
102057a9c:     	adrp	x8, 0x104c8e000
102057aa0:     	ldr	x8, [x8, #0x220]
102057aa4:     	cmp	x8, #0x3
102057aa8:     	mov	w8, #0x2                ; =2
102057aac:     	cinc	w0, w8, eq
102057ab0:     	b	0x102057ab8
102057ab4:     	mov	w0, #0x1                ; =1
102057ab8:     	ldp	x29, x30, [sp, #0x10]
102057abc:     	ldp	x20, x19, [sp], #0x20
102057ac0:     	ret


FUNCTION 0x102779bc8 size 128
102779bc8:     	ldr	w8, [x0, #0x70]
102779bcc:     	cmp	w8, #0x4
102779bd0:     	mov	w9, #0x1                ; =1
102779bd4:     	lsl	w8, w9, w8
102779bd8:     	mov	w9, #0x15               ; =21
102779bdc:     	and	w8, w8, w9
102779be0:     	ccmp	w8, #0x0, #0x4, ls
102779be4:     	b.eq	0x102779c40
102779be8:     	stp	x20, x19, [sp, #-0x20]!
102779bec:     	stp	x29, x30, [sp, #0x10]
102779bf0:     	add	x29, sp, #0x10
102779bf4:     	mov	x20, x1
102779bf8:     	mov	x19, x0
102779bfc:     	ldr	x0, [x0, #0x10]
102779c00:     	cbnz	x0, 0x102779c10
102779c04:     	mov	x0, x19
102779c08:     	bl	0x102779c48
102779c0c:     	ldr	x0, [x19, #0x10]
102779c10:     	orr	w2, w20, #0x1
102779c14:     	mov	x1, x19
102779c18:     	bl	0x102783f4c
102779c1c:     	ldp	x29, x30, [sp, #0x10]
102779c20:     	ldp	x20, x19, [sp], #0x20
102779c24:     	cbz	x0, 0x102779c40
102779c28:     	adrp	x1, 0x104a53000
102779c2c:     	add	x1, x1, #0x618
102779c30:     	adrp	x2, 0x104a53000
102779c34:     	add	x2, x2, #0xb98
102779c38:     	mov	x3, #0x0                ; =0
102779c3c:     	b	0x103bdd454
102779c40:     	mov	x0, #0x0                ; =0
102779c44:     	ret

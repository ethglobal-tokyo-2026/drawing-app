
FUNCTION 0x102072aac size 136
102072aac:     	sub	sp, sp, #0x40
102072ab0:     	stp	x20, x19, [sp, #0x20]
102072ab4:     	stp	x29, x30, [sp, #0x30]
102072ab8:     	add	x29, sp, #0x30
102072abc:     	mov	x19, x0
102072ac0:     	bl	0x103bdf650
102072ac4:     	mov	x20, x0
102072ac8:     	adrp	x8, 0x104af8000
102072acc:     	ldr	x0, [x8, #0x948]
102072ad0:     	bl	0x103beae00
102072ad4:     	cbz	x0, 0x102072b00
102072ad8:     	add	x8, sp, #0x8
102072adc:     	bl	0x103bea5e0
102072ae0:     	ldp	x9, x8, [sp, #0x8]
102072ae4:     	cmp	x9, #0xa
102072ae8:     	ccmp	x8, #0xf, #0x4, eq
102072aec:     	b.le	0x102072b10
102072af0:     	mov	w8, #0x0                ; =0
102072af4:     	mov	w10, #0x0               ; =0
102072af8:     	mov	w9, #0xb                ; =11
102072afc:     	b	0x102072b14
102072b00:     	mov	x9, #0x0                ; =0
102072b04:     	mov	x8, #0x0                ; =0
102072b08:     	stp	xzr, xzr, [sp, #0x8]
102072b0c:     	str	xzr, [sp, #0x18]
102072b10:     	ldr	w10, [sp, #0x18]
102072b14:     	stp	w9, w8, [x19]
102072b18:     	stp	w10, wzr, [x19, #0x8]
102072b1c:     	mov	x0, x20
102072b20:     	bl	0x103bdf644
102072b24:     	ldp	x29, x30, [sp, #0x30]
102072b28:     	ldp	x20, x19, [sp, #0x20]
102072b2c:     	add	sp, sp, #0x40
102072b30:     	ret

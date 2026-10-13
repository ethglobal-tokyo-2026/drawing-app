
FUNCTION 0x10277ef38 size 372
10277ef38:     	stp	x22, x21, [sp, #-0x30]!
10277ef3c:     	stp	x20, x19, [sp, #0x10]
10277ef40:     	stp	x29, x30, [sp, #0x20]
10277ef44:     	add	x29, sp, #0x20
10277ef48:     	mov	x19, x0
10277ef4c:     	mov	w8, #0x8                ; =8
10277ef50:     	ldp	x9, x10, [x0, #0x18]
10277ef54:     	cmp	x9, #0x8
10277ef58:     	csel	x8, x9, x8, hi
10277ef5c:     	add	x8, x8, #0x7
10277ef60:     	and	x21, x8, #0xfffffffffffffff8
10277ef64:     	mov	x22, #0x10              ; =16
10277ef68:     	madd	x20, x21, x10, x22
10277ef6c:     	mov	x0, x20
10277ef70:     	bl	0x10277f0ac
10277ef74:     	cbz	x0, 0x10277efac
10277ef78:     	ldr	x10, [x19, #0x30]
10277ef7c:     	ldp	x8, x9, [x19, #0x18]
10277ef80:     	cbz	x10, 0x10277efec
10277ef84:     	mul	x11, x9, x21
10277ef88:     	udiv	x11, x11, x8
10277ef8c:     	cmp	x11, x10
10277ef90:     	b.hs	0x10277f018
10277ef94:     	lsl	x11, x9, #1
10277ef98:     	mul	x10, x8, x10
10277ef9c:     	udiv	x10, x10, x21
10277efa0:     	cmp	x10, x9, lsl #1
10277efa4:     	csel	x9, x10, x11, lo
10277efa8:     	b	0x10277eff0
10277efac:     	ldr	x8, [x19, #0x20]
10277efb0:     	cmp	x8, #0x5
10277efb4:     	b.lo	0x10277f06c
10277efb8:     	lsr	x8, x8, #1
10277efbc:     	str	x8, [x19, #0x20]
10277efc0:     	ldr	x9, [x19, #0x18]
10277efc4:     	mov	w10, #0x8               ; =8
10277efc8:     	cmp	x9, #0x8
10277efcc:     	csel	x9, x9, x10, hi
10277efd0:     	add	x9, x9, #0x7
10277efd4:     	and	x21, x9, #0xfffffffffffffff8
10277efd8:     	madd	x20, x21, x8, x22
10277efdc:     	mov	x0, x20
10277efe0:     	bl	0x10277f0ac
10277efe4:     	cbnz	x0, 0x10277ef78
10277efe8:     	b	0x10277f09c
10277efec:     	lsl	x9, x9, #1
10277eff0:     	mov	w10, #0x8               ; =8
10277eff4:     	cmp	x8, #0x8
10277eff8:     	csel	x8, x8, x10, hi
10277effc:     	add	x8, x8, #0x7
10277f000:     	and	x8, x8, #0xfffffffffffffff8
10277f004:     	mov	x10, #-0x11             ; =-17
10277f008:     	udiv	x8, x10, x8
10277f00c:     	cmp	x8, x9
10277f010:     	csel	x8, x8, x9, lo
10277f014:     	stp	x8, x8, [x19, #0x20]
10277f018:     	ldr	x9, [x19]
10277f01c:     	sub	x8, x20, x21
10277f020:     	sub	x10, x8, #0x10
10277f024:     	udiv	x8, x10, x21
10277f028:     	mul	x11, x8, x21
10277f02c:     	add	x8, x0, x11
10277f030:     	str	x9, [x8]
10277f034:     	sub	x9, x10, x11
10277f038:     	cmp	x10, x9
10277f03c:     	b.eq	0x10277f07c
10277f040:     	neg	x9, x21
10277f044:     	add	x10, x8, x9
10277f048:     	cmp	x10, x0
10277f04c:     	b.eq	0x10277f074
10277f050:     	mov	x11, x10
10277f054:     	str	x8, [x8, x9]
10277f058:     	add	x10, x10, x9
10277f05c:     	cmp	x10, x0
10277f060:     	mov	x8, x11
10277f064:     	b.ne	0x10277f050
10277f068:     	b	0x10277f078
10277f06c:     	mov	x0, #0x0                ; =0
10277f070:     	b	0x10277f09c
10277f074:     	mov	x11, x8
10277f078:     	str	x11, [x0]
10277f07c:     	str	x0, [x19]
10277f080:     	add	x8, x0, x20
10277f084:     	ldp	x9, x10, [x19, #0x8]
10277f088:     	stp	x9, x10, [x8, #-0x10]
10277f08c:     	stp	x0, x20, [x19, #0x8]
10277f090:     	ldr	x0, [x19]
10277f094:     	ldr	x8, [x0]
10277f098:     	str	x8, [x19]
10277f09c:     	ldp	x29, x30, [sp, #0x20]
10277f0a0:     	ldp	x20, x19, [sp, #0x10]
10277f0a4:     	ldp	x22, x21, [sp], #0x30
10277f0a8:     	ret

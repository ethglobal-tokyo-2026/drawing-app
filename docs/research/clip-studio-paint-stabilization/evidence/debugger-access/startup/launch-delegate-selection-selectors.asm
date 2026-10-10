
FUNCTION 0x10204f998 size 764
10204f998:     	sub	sp, sp, #0x150
10204f99c:     	stp	x28, x27, [sp, #0xf0]
10204f9a0:     	stp	x26, x25, [sp, #0x100]
10204f9a4:     	stp	x24, x23, [sp, #0x110]
10204f9a8:     	stp	x22, x21, [sp, #0x120]
10204f9ac:     	stp	x20, x19, [sp, #0x130]
10204f9b0:     	stp	x29, x30, [sp, #0x140]
10204f9b4:     	add	x29, sp, #0x140
10204f9b8:     	stp	x0, x3, [sp, #0x8]
10204f9bc:     	adrp	x8, 0x1048c8000
10204f9c0:     	ldr	x8, [x8, #0x4d0]
10204f9c4:     	ldr	x8, [x8]
10204f9c8:     	stur	x8, [x29, #-0x60]
10204f9cc:     	adrp	x8, 0x104af8000
10204f9d0:     	str	w2, [sp, #0x1c]
10204f9d4:     	tbz	w2, #0x0, 0x10204faf8
10204f9d8:     	ldr	x0, [x8, #0x728]
10204f9dc:     	bl	0x103bdf62c
10204f9e0:     	bl	0x103be8140  SELECTOR init
10204f9e4:     	str	x0, [sp]
10204f9e8:     	adrp	x8, 0x104af8000
10204f9ec:     	ldr	x0, [x8, #0x748]
10204f9f0:     	bl	0x103bed9c0  SELECTOR sharedWorkspace
10204f9f4:     	bl	0x103be9520  SELECTOR launchedApplications
10204f9f8:     	mov	x23, x0
10204f9fc:     	adrp	x19, 0x104af8000
10204fa00:     	ldr	x0, [x19, #0x708]
10204fa04:     	bl	0x103be9900  SELECTOR mainBundle
10204fa08:     	bl	0x103be5aa0  SELECTOR bundleIdentifier
10204fa0c:     	mov	x24, x0
10204fa10:     	ldr	x0, [x19, #0x708]
10204fa14:     	bl	0x103be9900  SELECTOR mainBundle
10204fa18:     	bl	0x103be5ac0  SELECTOR bundlePath
10204fa1c:     	mov	x25, x0
10204fa20:     	movi.2d	v0, #0000000000000000
10204fa24:     	stp	q0, q0, [sp, #0x20]
10204fa28:     	stp	q0, q0, [sp, #0x40]
10204fa2c:     	add	x2, sp, #0x20
10204fa30:     	add	x3, sp, #0x60
10204fa34:     	mov	x0, x23
10204fa38:     	mov	w4, #0x10               ; =16
10204fa3c:     	bl	0x103be67a0  SELECTOR countByEnumeratingWithState:objects:count:
10204fa40:     	mov	x26, x0
10204fa44:     	cbz	x0, 0x10204faec
10204fa48:     	ldr	x8, [sp, #0x30]
10204fa4c:     	ldr	x19, [x8]
10204fa50:     	adrp	x27, 0x104ae7000
10204fa54:     	add	x27, x27, #0xdb8
10204fa58:     	adrp	x28, 0x104ae7000
10204fa5c:     	add	x28, x28, #0xdd8
10204fa60:     	mov	x21, #0x0               ; =0
10204fa64:     	ldr	x8, [sp, #0x30]
10204fa68:     	ldr	x8, [x8]
10204fa6c:     	cmp	x8, x19
10204fa70:     	b.eq	0x10204fa7c
10204fa74:     	mov	x0, x23
10204fa78:     	bl	0x103bdf68c
10204fa7c:     	ldr	x8, [sp, #0x28]
10204fa80:     	ldr	x22, [x8, x21, lsl #3]
10204fa84:     	mov	x0, x22
10204fa88:     	mov	x2, x27
10204fa8c:     	bl	0x103bea380  SELECTOR objectForKey:
10204fa90:     	mov	x20, x0
10204fa94:     	mov	x0, x22
10204fa98:     	mov	x2, x28
10204fa9c:     	bl	0x103bea380  SELECTOR objectForKey:
10204faa0:     	mov	x22, x0
10204faa4:     	mov	x0, x24
10204faa8:     	mov	x2, x20
10204faac:     	bl	0x103be8d80  SELECTOR isEqualToString:
10204fab0:     	cbz	w0, 0x10204fac4
10204fab4:     	mov	x0, x25
10204fab8:     	mov	x2, x22
10204fabc:     	bl	0x103be8d80  SELECTOR isEqualToString:
10204fac0:     	cbz	w0, 0x10204fbc8
10204fac4:     	add	x21, x21, #0x1
10204fac8:     	cmp	x26, x21
10204facc:     	b.ne	0x10204fa64
10204fad0:     	add	x2, sp, #0x20
10204fad4:     	add	x3, sp, #0x60
10204fad8:     	mov	x0, x23
10204fadc:     	mov	w4, #0x10               ; =16
10204fae0:     	bl	0x103be67a0  SELECTOR countByEnumeratingWithState:objects:count:
10204fae4:     	mov	x26, x0
10204fae8:     	cbnz	x0, 0x10204fa60
10204faec:     	ldr	x0, [sp]
10204faf0:     	bl	0x103bdf6b0
10204faf4:     	adrp	x8, 0x104af8000
10204faf8:     	ldr	x0, [x8, #0x728]
10204fafc:     	bl	0x103bdf62c
10204fb00:     	bl	0x103be8140  SELECTOR init
10204fb04:     	mov	x22, x0
10204fb08:     	mov	x24, #0x0               ; =0
10204fb0c:     	mov	w0, #0xd0               ; =208
10204fb10:     	bl	0x103bdd37c
10204fb14:     	mov	x23, x0
10204fb18:     	movi.2d	v0, #0000000000000000
10204fb1c:     	stur	q0, [x0, #0xb8]
10204fb20:     	stur	q0, [x0, #0xa8]
10204fb24:     	ldp	x9, x8, [sp, #0x8]
10204fb28:     	ldp	q0, q1, [x9, #0x60]
10204fb2c:     	stur	q0, [x0, #0x68]
10204fb30:     	stur	q1, [x0, #0x78]
10204fb34:     	ldr	q0, [x9, #0x80]
10204fb38:     	stur	q0, [x0, #0x88]
10204fb3c:     	ldp	q0, q1, [x9, #0x20]
10204fb40:     	stur	q0, [x0, #0x28]
10204fb44:     	stur	q1, [x0, #0x38]
10204fb48:     	ldp	q0, q1, [x9, #0x40]
10204fb4c:     	stur	q0, [x0, #0x48]
10204fb50:     	stur	q1, [x0, #0x58]
10204fb54:     	ldp	q0, q1, [x9]
10204fb58:     	stur	q0, [x0, #0x8]
10204fb5c:     	str	x8, [x0]
10204fb60:     	ldr	x8, [x9, #0x90]
10204fb64:     	str	x8, [x0, #0x98]
10204fb68:     	stur	q1, [x0, #0x18]
10204fb6c:     	ldr	w8, [sp, #0x1c]
10204fb70:     	str	w8, [x0, #0xc8]
10204fb74:     	adrp	x8, 0x104af8000
10204fb78:     	ldr	x0, [x8, #0x778]
10204fb7c:     	mov	x24, x23
10204fb80:     	bl	0x103bed800  SELECTOR sharedApplication
10204fb84:     	adrp	x8, 0x104af8000
10204fb88:     	ldr	x0, [x8, #0x7f8]
10204fb8c:     	mov	x24, x23
10204fb90:     	bl	0x103bdf62c
10204fb94:     	mov	x24, x23
10204fb98:     	mov	x2, x23
10204fb9c:     	bl	0x103be8540  SELECTOR initWithLegacyApplicaton:
10204fba0:     	mov	x2, x0
10204fba4:     	str	x0, [x23, #0xa0]
10204fba8:     	adrp	x8, 0x1048c8000
10204fbac:     	ldr	x8, [x8, #0x538]
10204fbb0:     	ldr	x0, [x8]
10204fbb4:     	mov	x24, x23
10204fbb8:     	bl	0x103bec440  SELECTOR setDelegate:
10204fbbc:     	mov	x0, x22
10204fbc0:     	bl	0x103bdf6b0
10204fbc4:     	b	0x10204fc04
10204fbc8:     	adrp	x8, 0x104af8000
10204fbcc:     	ldr	x0, [x8, #0x808]
10204fbd0:     	bl	0x103bed800  SELECTOR sharedApplication
10204fbd4:     	adrp	x8, 0x104af8000
10204fbd8:     	ldr	x0, [x8, #0x810]
10204fbdc:     	bl	0x103bdf62c
10204fbe0:     	bl	0x103be8140  SELECTOR init
10204fbe4:     	mov	x2, x0
10204fbe8:     	adrp	x8, 0x1048c8000
10204fbec:     	ldr	x8, [x8, #0x538]
10204fbf0:     	ldr	x0, [x8]
10204fbf4:     	bl	0x103bec440  SELECTOR setDelegate:
10204fbf8:     	ldr	x0, [sp]
10204fbfc:     	bl	0x103bdf6b0
10204fc00:     	mov	x23, #0x0               ; =0
10204fc04:     	ldur	x8, [x29, #-0x60]
10204fc08:     	adrp	x9, 0x1048c8000
10204fc0c:     	ldr	x9, [x9, #0x4d0]
10204fc10:     	ldr	x9, [x9]
10204fc14:     	cmp	x9, x8
10204fc18:     	b.ne	0x10204fc40
10204fc1c:     	mov	x0, x23
10204fc20:     	ldp	x29, x30, [sp, #0x140]
10204fc24:     	ldp	x20, x19, [sp, #0x130]
10204fc28:     	ldp	x22, x21, [sp, #0x120]
10204fc2c:     	ldp	x24, x23, [sp, #0x110]
10204fc30:     	ldp	x26, x25, [sp, #0x100]
10204fc34:     	ldp	x28, x27, [sp, #0xf0]
10204fc38:     	add	sp, sp, #0x150
10204fc3c:     	ret
10204fc40:     	bl	0x103bdd4d8
10204fc44:     	mov	x19, x0
10204fc48:     	cbz	w1, 0x10204fc8c
10204fc4c:     	mov	x0, x19
10204fc50:     	bl	0x103bdd3dc
10204fc54:     	mov	x0, x24
10204fc58:     	bl	0x10204f900
10204fc5c:     	mov	x0, x22
10204fc60:     	bl	0x103bdf6b0
10204fc64:     	bl	0x103bdd3f4
10204fc68:     	b	0x10204fc00
10204fc6c:     	mov	x19, x0
10204fc70:     	bl	0x103bdd3f4
10204fc74:     	b	0x10204fc8c
10204fc78:     	mov	x19, x0
10204fc7c:     	cbz	w1, 0x10204fc8c
10204fc80:     	mov	x0, x19
10204fc84:     	bl	0x1000102a0
10204fc88:     	mov	x19, x0
10204fc8c:     	mov	x0, x19
10204fc90:     	bl	0x103bda970

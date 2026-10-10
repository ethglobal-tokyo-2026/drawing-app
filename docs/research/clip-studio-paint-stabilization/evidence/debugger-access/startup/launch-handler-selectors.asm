
FUNCTION 0x10204ba7c size 584
10204ba7c:     	stp	x28, x27, [sp, #-0x60]!
10204ba80:     	stp	x26, x25, [sp, #0x10]
10204ba84:     	stp	x24, x23, [sp, #0x20]
10204ba88:     	stp	x22, x21, [sp, #0x30]
10204ba8c:     	stp	x20, x19, [sp, #0x40]
10204ba90:     	stp	x29, x30, [sp, #0x50]
10204ba94:     	add	x29, sp, #0x50
10204ba98:     	sub	sp, sp, #0x1b0
10204ba9c:     	mov	x21, x0
10204baa0:     	adrp	x8, 0x1048c8000
10204baa4:     	ldr	x8, [x8, #0x4d0]
10204baa8:     	ldr	x8, [x8]
10204baac:     	stur	x8, [x29, #-0x60]
10204bab0:     	adrp	x20, 0x104af8000
10204bab4:     	ldr	x0, [x20, #0x748]
10204bab8:     	bl	0x103bed9c0  SELECTOR sharedWorkspace
10204babc:     	bl	0x103be9520  SELECTOR launchedApplications
10204bac0:     	mov	x25, x0
10204bac4:     	adrp	x19, 0x104af8000
10204bac8:     	ldr	x0, [x19, #0x708]
10204bacc:     	bl	0x103be9900  SELECTOR mainBundle
10204bad0:     	bl	0x103be5aa0  SELECTOR bundleIdentifier
10204bad4:     	mov	x28, x0
10204bad8:     	ldr	x0, [x19, #0x708]
10204badc:     	bl	0x103be9900  SELECTOR mainBundle
10204bae0:     	bl	0x103be5ac0  SELECTOR bundlePath
10204bae4:     	mov	x19, x0
10204bae8:     	movi.2d	v0, #0000000000000000
10204baec:     	stp	q0, q0, [sp, #0x60]
10204baf0:     	stp	q0, q0, [sp, #0x80]
10204baf4:     	add	x2, sp, #0x60
10204baf8:     	sub	x3, x29, #0xe0
10204bafc:     	mov	x0, x25
10204bb00:     	mov	w4, #0x10               ; =16
10204bb04:     	bl	0x103be67a0  SELECTOR countByEnumeratingWithState:objects:count:
10204bb08:     	cbz	x0, 0x10204bc74
10204bb0c:     	mov	x24, x0
10204bb10:     	ldr	x8, [sp, #0x70]
10204bb14:     	ldr	x22, [x8]
10204bb18:     	stp	x25, x21, [sp, #0x10]
10204bb1c:     	stp	x19, x28, [sp]
10204bb20:     	mov	x23, #0x0               ; =0
10204bb24:     	ldr	x8, [sp, #0x70]
10204bb28:     	ldr	x8, [x8]
10204bb2c:     	cmp	x8, x22
10204bb30:     	b.eq	0x10204bb3c
10204bb34:     	mov	x0, x25
10204bb38:     	bl	0x103bdf68c
10204bb3c:     	ldr	x8, [sp, #0x68]
10204bb40:     	ldr	x26, [x8, x23, lsl #3]
10204bb44:     	mov	x0, x26
10204bb48:     	adrp	x2, 0x104ae7000
10204bb4c:     	add	x2, x2, #0xdb8
10204bb50:     	bl	0x103bea380  SELECTOR objectForKey:
10204bb54:     	mov	x27, x0
10204bb58:     	mov	x0, x26
10204bb5c:     	adrp	x2, 0x104ae7000
10204bb60:     	add	x2, x2, #0xdd8
10204bb64:     	bl	0x103bea380  SELECTOR objectForKey:
10204bb68:     	mov	x26, x0
10204bb6c:     	mov	x0, x28
10204bb70:     	mov	x2, x27
10204bb74:     	bl	0x103be8d80  SELECTOR isEqualToString:
10204bb78:     	cbz	w0, 0x10204bc4c
10204bb7c:     	mov	x0, x19
10204bb80:     	mov	x2, x26
10204bb84:     	bl	0x103be8d80  SELECTOR isEqualToString:
10204bb88:     	tbnz	w0, #0x0, 0x10204bc4c
10204bb8c:     	ldr	x0, [x20, #0x748]
10204bb90:     	bl	0x103bed9c0  SELECTOR sharedWorkspace
10204bb94:     	mov	x2, x26
10204bb98:     	bl	0x103be9500  SELECTOR launchApplication:
10204bb9c:     	ldr	x27, [x21, #0x8]
10204bba0:     	cbz	x27, 0x10204bc4c
10204bba4:     	movi.2d	v0, #0000000000000000
10204bba8:     	stp	q0, q0, [sp, #0x40]
10204bbac:     	stp	q0, q0, [sp, #0x20]
10204bbb0:     	add	x2, sp, #0x20
10204bbb4:     	add	x3, sp, #0xa0
10204bbb8:     	mov	x0, x27
10204bbbc:     	mov	w4, #0x10               ; =16
10204bbc0:     	bl	0x103be67a0  SELECTOR countByEnumeratingWithState:objects:count:
10204bbc4:     	cbz	x0, 0x10204bc34
10204bbc8:     	mov	x28, x0
10204bbcc:     	ldr	x8, [sp, #0x30]
10204bbd0:     	ldr	x25, [x8]
10204bbd4:     	mov	x21, #0x0               ; =0
10204bbd8:     	ldr	x8, [sp, #0x30]
10204bbdc:     	ldr	x8, [x8]
10204bbe0:     	cmp	x8, x25
10204bbe4:     	b.eq	0x10204bbf0
10204bbe8:     	mov	x0, x27
10204bbec:     	bl	0x103bdf68c
10204bbf0:     	ldr	x8, [sp, #0x28]
10204bbf4:     	ldr	x19, [x8, x21, lsl #3]
10204bbf8:     	ldr	x0, [x20, #0x748]
10204bbfc:     	bl	0x103bed9c0  SELECTOR sharedWorkspace
10204bc00:     	mov	x2, x19
10204bc04:     	mov	x3, x26
10204bc08:     	bl	0x103bea4e0  SELECTOR openFile:withApplication:
10204bc0c:     	add	x21, x21, #0x1
10204bc10:     	cmp	x28, x21
10204bc14:     	b.ne	0x10204bbd8
10204bc18:     	add	x2, sp, #0x20
10204bc1c:     	add	x3, sp, #0xa0
10204bc20:     	mov	x0, x27
10204bc24:     	mov	w4, #0x10               ; =16
10204bc28:     	bl	0x103be67a0  SELECTOR countByEnumeratingWithState:objects:count:
10204bc2c:     	mov	x28, x0
10204bc30:     	cbnz	x0, 0x10204bbd4
10204bc34:     	ldr	x21, [sp, #0x18]
10204bc38:     	ldr	x0, [x21, #0x8]
10204bc3c:     	bl	0x103bdf6b0
10204bc40:     	str	xzr, [x21, #0x8]
10204bc44:     	ldp	x28, x25, [sp, #0x8]
10204bc48:     	ldr	x19, [sp]
10204bc4c:     	add	x23, x23, #0x1
10204bc50:     	cmp	x23, x24
10204bc54:     	b.ne	0x10204bb24
10204bc58:     	add	x2, sp, #0x60
10204bc5c:     	sub	x3, x29, #0xe0
10204bc60:     	mov	x0, x25
10204bc64:     	mov	w4, #0x10               ; =16
10204bc68:     	bl	0x103be67a0  SELECTOR countByEnumeratingWithState:objects:count:
10204bc6c:     	mov	x24, x0
10204bc70:     	cbnz	x0, 0x10204bb20
10204bc74:     	adrp	x8, 0x1048c8000
10204bc78:     	ldr	x8, [x8, #0x538]
10204bc7c:     	ldr	x0, [x8]
10204bc80:     	mov	x2, x21
10204bc84:     	bl	0x103bee340  SELECTOR terminate:
10204bc88:     	ldur	x8, [x29, #-0x60]
10204bc8c:     	adrp	x9, 0x1048c8000
10204bc90:     	ldr	x9, [x9, #0x4d0]
10204bc94:     	ldr	x9, [x9]
10204bc98:     	cmp	x9, x8
10204bc9c:     	b.ne	0x10204bcc0
10204bca0:     	add	sp, sp, #0x1b0
10204bca4:     	ldp	x29, x30, [sp, #0x50]
10204bca8:     	ldp	x20, x19, [sp, #0x40]
10204bcac:     	ldp	x22, x21, [sp, #0x30]
10204bcb0:     	ldp	x24, x23, [sp, #0x20]
10204bcb4:     	ldp	x26, x25, [sp, #0x10]
10204bcb8:     	ldp	x28, x27, [sp], #0x60
10204bcbc:     	ret
10204bcc0:     	bl	0x103bdd4d8

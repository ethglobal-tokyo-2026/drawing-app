
FUNCTION 0x1020538b8 size 2148
1020538b8:     	sub	sp, sp, #0x1d0
1020538bc:     	stp	d11, d10, [sp, #0x150]
1020538c0:     	stp	d9, d8, [sp, #0x160]
1020538c4:     	stp	x28, x27, [sp, #0x170]
1020538c8:     	stp	x26, x25, [sp, #0x180]
1020538cc:     	stp	x24, x23, [sp, #0x190]
1020538d0:     	stp	x22, x21, [sp, #0x1a0]
1020538d4:     	stp	x20, x19, [sp, #0x1b0]
1020538d8:     	stp	x29, x30, [sp, #0x1c0]
1020538dc:     	add	x29, sp, #0x1c0
1020538e0:     	mov	x19, x2
1020538e4:     	mov	x20, x0
1020538e8:     	adrp	x8, 0x1048c8000
1020538ec:     	ldr	x8, [x8, #0x4d0]
1020538f0:     	ldr	x8, [x8]
1020538f4:     	stur	x8, [x29, #-0x80]
1020538f8:     	bl	0x10207a668
1020538fc:     	mov	x21, x0
102053900:     	cbz	x0, 0x102053a50
102053904:     	ldr	x0, [x21, #0xb0]
102053908:     	bl	0x103beed00  SELECTOR window
10205390c:     	ldr	w8, [x21, #0x110]
102053910:     	cbz	w8, 0x102053a50
102053914:     	mov	x22, x0
102053918:     	bl	0x103be9620  SELECTOR level
10205391c:     	cmp	x0, #0x65
102053920:     	b.eq	0x102053a50
102053924:     	adrp	x8, 0x104af8000
102053928:     	ldr	x0, [x8, #0x778]
10205392c:     	mov	x2, x19
102053930:     	bl	0x103be8fa0  SELECTOR isMouseEvent:
102053934:     	cbz	w0, 0x102053a50
102053938:     	mov	x0, x19
10205393c:     	bl	0x103beed00  SELECTOR window
102053940:     	cmp	x22, x0
102053944:     	b.eq	0x102053a50
102053948:     	mov	x0, x19
10205394c:     	bl	0x103beed00  SELECTOR window
102053950:     	cbz	x0, 0x102053970
102053954:     	mov	x0, x19
102053958:     	bl	0x103be97c0  SELECTOR locationInWindow
10205395c:     	fmov	d8, d0
102053960:     	fmov	d9, d1
102053964:     	mov	x0, x19
102053968:     	bl	0x103beed00  SELECTOR window
10205396c:     	b	0x102053984
102053970:     	mov	x0, x22
102053974:     	bl	0x103be9ee0  SELECTOR mouseLocationOutsideOfEventStream
102053978:     	fmov	d8, d0
10205397c:     	fmov	d9, d1
102053980:     	mov	x0, x22
102053984:     	fmov	d0, d8
102053988:     	fmov	d1, d9
10205398c:     	bl	0x103be6580  SELECTOR convertBaseToScreen:
102053990:     	mov	x0, x22
102053994:     	bl	0x103be6660  SELECTOR convertScreenToBase:
102053998:     	fmov	d8, d0
10205399c:     	fmov	d9, d1
1020539a0:     	adrp	x8, 0x104af8000
1020539a4:     	ldr	x23, [x8, #0x828]
1020539a8:     	mov	x0, x19
1020539ac:     	bl	0x103bee740  SELECTOR type
1020539b0:     	mov	x24, x0
1020539b4:     	mov	x0, x19
1020539b8:     	bl	0x103be9d00  SELECTOR modifierFlags
1020539bc:     	mov	x25, x0
1020539c0:     	mov	x0, x19
1020539c4:     	bl	0x103bee4c0  SELECTOR timestamp
1020539c8:     	fmov	d10, d0
1020539cc:     	mov	x0, x22
1020539d0:     	bl	0x103beee20  SELECTOR windowNumber
1020539d4:     	mov	x22, x0
1020539d8:     	mov	x0, x19
1020539dc:     	bl	0x103be6520  SELECTOR context
1020539e0:     	mov	x26, x0
1020539e4:     	mov	x0, x19
1020539e8:     	bl	0x103be7540  SELECTOR eventNumber
1020539ec:     	mov	x27, x0
1020539f0:     	mov	x0, x19
1020539f4:     	bl	0x103bee740  SELECTOR type
1020539f8:     	cmp	x0, #0x5
1020539fc:     	b.ne	0x102053a08
102053a00:     	mov	x28, #0x0               ; =0
102053a04:     	b	0x102053a14
102053a08:     	mov	x0, x19
102053a0c:     	bl	0x103be60c0  SELECTOR clickCount
102053a10:     	mov	x28, x0
102053a14:     	mov	x0, x19
102053a18:     	bl	0x103bead20  SELECTOR pressure
102053a1c:     	fmov	s3, s0
102053a20:     	mov	x0, x23
102053a24:     	mov	x2, x24
102053a28:     	fmov	d0, d8
102053a2c:     	fmov	d1, d9
102053a30:     	mov	x3, x25
102053a34:     	fmov	d2, d10
102053a38:     	mov	x4, x22
102053a3c:     	mov	x5, x26
102053a40:     	mov	x6, x27
102053a44:     	mov	x7, x28
102053a48:     	bl	0x103be9ea0  SELECTOR mouseEventWithType:location:modifierFlags:timestamp:windowNumber:context:eventNumber:clickCount:pressure:
102053a4c:     	mov	x19, x0
102053a50:     	mov	x0, x19
102053a54:     	bl	0x103bee740  SELECTOR type
102053a58:     	cmp	x0, #0xa
102053a5c:     	b.gt	0x102053a7c
102053a60:     	cmp	x0, #0x5
102053a64:     	b.gt	0x102053ac4
102053a68:     	cmp	x0, #0x1
102053a6c:     	b.eq	0x102053b34
102053a70:     	cmp	x0, #0x3
102053a74:     	b.eq	0x102053b34
102053a78:     	b	0x102053c40
102053a7c:     	cmp	x0, #0x17
102053a80:     	b.gt	0x102053b24
102053a84:     	cmp	x0, #0xb
102053a88:     	b.eq	0x102053b8c
102053a8c:     	cmp	x0, #0xc
102053a90:     	b.ne	0x102053c40
102053a94:     	adrp	x8, 0x1048c8000
102053a98:     	ldr	x8, [x8, #0x538]
102053a9c:     	ldr	x0, [x8]
102053aa0:     	bl	0x103be9ce0  SELECTOR modalWindow
102053aa4:     	cbz	x0, 0x102053f60
102053aa8:     	adrp	x8, 0x104af8000
102053aac:     	ldr	x8, [x8, #0xb98]
102053ab0:     	stp	x20, x8, [sp, #0xa0]
102053ab4:     	adrp	x8, 0x104af6000
102053ab8:     	ldr	x1, [x8, #0xd90]
102053abc:     	add	x0, sp, #0xa0
102053ac0:     	b	0x102053c6c
102053ac4:     	cmp	x0, #0x6
102053ac8:     	b.eq	0x102053bbc
102053acc:     	cmp	x0, #0xa
102053ad0:     	b.ne	0x102053c40
102053ad4:     	mov	x0, x20
102053ad8:     	bl	0x103be9080  SELECTOR isRunModal
102053adc:     	mov	x21, x0
102053ae0:     	adrp	x23, 0x104af8000
102053ae4:     	ldr	x0, [x23, #0x778]
102053ae8:     	mov	x2, x19
102053aec:     	bl	0x103bebc60  SELECTOR sendEventToSuper:
102053af0:     	mov	x22, x0
102053af4:     	mov	x0, x20
102053af8:     	mov	x2, x19
102053afc:     	bl	0x103be7d60  SELECTOR handleKeyEquivalent:
102053b00:     	cbz	w22, 0x102053cfc
102053b04:     	tbnz	w0, #0x0, 0x102053c74
102053b08:     	adrp	x8, 0x104af8000
102053b0c:     	ldr	x8, [x8, #0xb98]
102053b10:     	stp	x20, x8, [sp, #0x80]
102053b14:     	adrp	x8, 0x104af6000
102053b18:     	ldr	x1, [x8, #0xd90]
102053b1c:     	add	x0, sp, #0x80
102053b20:     	b	0x102053c6c
102053b24:     	cmp	x0, #0x18
102053b28:     	b.eq	0x102053cb4
102053b2c:     	cmp	x0, #0x19
102053b30:     	b.ne	0x102053c40
102053b34:     	adrp	x8, 0x104af8000
102053b38:     	ldr	x0, [x8, #0x778]
102053b3c:     	mov	x2, #0x0                ; =0
102053b40:     	bl	0x103bec9e0  SELECTOR setKeyDownActiveState:
102053b44:     	cbz	x21, 0x102053c40
102053b48:     	ldr	x0, [x21, #0xb0]
102053b4c:     	bl	0x103beed00  SELECTOR window
102053b50:     	mov	x21, x0
102053b54:     	mov	x0, x19
102053b58:     	bl	0x103beed00  SELECTOR window
102053b5c:     	cmp	x21, x0
102053b60:     	b.eq	0x102053c40
102053b64:     	mov	x0, x19
102053b68:     	bl	0x103beed00  SELECTOR window
102053b6c:     	cbz	x0, 0x102053dc0
102053b70:     	mov	x0, x19
102053b74:     	bl	0x103be97c0  SELECTOR locationInWindow
102053b78:     	fmov	d8, d0
102053b7c:     	fmov	d9, d1
102053b80:     	mov	x0, x19
102053b84:     	bl	0x103beed00  SELECTOR window
102053b88:     	b	0x102053dd4
102053b8c:     	adrp	x23, 0x1048c8000
102053b90:     	ldr	x23, [x23, #0x538]
102053b94:     	ldr	x0, [x23]
102053b98:     	bl	0x103be9ce0  SELECTOR modalWindow
102053b9c:     	cbz	x0, 0x102053ef0
102053ba0:     	adrp	x8, 0x104af8000
102053ba4:     	ldr	x8, [x8, #0xb98]
102053ba8:     	stp	x20, x8, [sp, #0x60]
102053bac:     	adrp	x8, 0x104af6000
102053bb0:     	ldr	x1, [x8, #0xd90]
102053bb4:     	add	x0, sp, #0x60
102053bb8:     	b	0x102053c6c
102053bbc:     	mov	x0, x19
102053bc0:     	bl	0x103beed00  SELECTOR window
102053bc4:     	mov	x21, x0
102053bc8:     	adrp	x8, 0x104af5000
102053bcc:     	ldr	x2, [x8, #0xb60]
102053bd0:     	bl	0x103beb600  SELECTOR respondsToSelector:
102053bd4:     	cbz	w0, 0x102053c40
102053bd8:     	mov	x0, x21
102053bdc:     	bl	0x103be7380  SELECTOR enableMouseDraggedEvent
102053be0:     	cbz	w0, 0x102053c40
102053be4:     	adrp	x8, 0x1048c8000
102053be8:     	ldr	x8, [x8, #0x538]
102053bec:     	ldr	x0, [x8]
102053bf0:     	mov	x2, x19
102053bf4:     	bl	0x103be9160  SELECTOR isTabletEvent:
102053bf8:     	cbz	w0, 0x102053c40
102053bfc:     	mov	x0, x20
102053c00:     	mov	x2, x19
102053c04:     	mov	w3, #0x1                ; =1
102053c08:     	mov	w4, #0x0                ; =0
102053c0c:     	bl	0x103bee260  SELECTOR tabletEvent:tabletEventKind:useLastPenAttitude:
102053c10:     	mov	x0, x19
102053c14:     	bl	0x103bee4c0  SELECTOR timestamp
102053c18:     	adrp	x8, 0x104af8000
102053c1c:     	ldrsw	x8, [x8, #0xd30]
102053c20:     	str	d0, [x20, x8]
102053c24:     	adrp	x8, 0x104af8000
102053c28:     	ldr	x8, [x8, #0xb98]
102053c2c:     	stp	x20, x8, [sp, #0xb0]
102053c30:     	adrp	x8, 0x104af6000
102053c34:     	ldr	x1, [x8, #0xd90]
102053c38:     	add	x0, sp, #0xb0
102053c3c:     	b	0x102053c6c
102053c40:     	mov	x0, x19
102053c44:     	bl	0x103bee4c0  SELECTOR timestamp
102053c48:     	adrp	x8, 0x104af8000
102053c4c:     	ldrsw	x8, [x8, #0xd30]
102053c50:     	str	d0, [x20, x8]
102053c54:     	adrp	x8, 0x104af8000
102053c58:     	ldr	x8, [x8, #0xb98]
102053c5c:     	stp	x20, x8, [sp]
102053c60:     	adrp	x8, 0x104af6000
102053c64:     	ldr	x1, [x8, #0xd90]
102053c68:     	mov	x0, sp
102053c6c:     	mov	x2, x19
102053c70:     	bl	0x103bdf6a4
102053c74:     	ldur	x8, [x29, #-0x80]
102053c78:     	adrp	x9, 0x1048c8000
102053c7c:     	ldr	x9, [x9, #0x4d0]
102053c80:     	ldr	x9, [x9]
102053c84:     	cmp	x9, x8
102053c88:     	b.ne	0x102054118
102053c8c:     	ldp	x29, x30, [sp, #0x1c0]
102053c90:     	ldp	x20, x19, [sp, #0x1b0]
102053c94:     	ldp	x22, x21, [sp, #0x1a0]
102053c98:     	ldp	x24, x23, [sp, #0x190]
102053c9c:     	ldp	x26, x25, [sp, #0x180]
102053ca0:     	ldp	x28, x27, [sp, #0x170]
102053ca4:     	ldp	d9, d8, [sp, #0x160]
102053ca8:     	ldp	d11, d10, [sp, #0x150]
102053cac:     	add	sp, sp, #0x1d0
102053cb0:     	ret
102053cb4:     	ldur	x8, [x29, #-0x80]
102053cb8:     	adrp	x9, 0x1048c8000
102053cbc:     	ldr	x9, [x9, #0x4d0]
102053cc0:     	ldr	x9, [x9]
102053cc4:     	cmp	x9, x8
102053cc8:     	b.ne	0x102054118
102053ccc:     	mov	x0, x20
102053cd0:     	mov	x2, x19
102053cd4:     	ldp	x29, x30, [sp, #0x1c0]
102053cd8:     	ldp	x20, x19, [sp, #0x1b0]
102053cdc:     	ldp	x22, x21, [sp, #0x1a0]
102053ce0:     	ldp	x24, x23, [sp, #0x190]
102053ce4:     	ldp	x26, x25, [sp, #0x180]
102053ce8:     	ldp	x28, x27, [sp, #0x170]
102053cec:     	ldp	d9, d8, [sp, #0x160]
102053cf0:     	ldp	d11, d10, [sp, #0x150]
102053cf4:     	add	sp, sp, #0x1d0
102053cf8:     	b	0x103bee280
102053cfc:     	tbnz	w0, #0x0, 0x102053c74
102053d00:     	mov	x0, x20
102053d04:     	bl	0x103be8880  SELECTOR inlineKeyWindow
102053d08:     	mov	x22, x0
102053d0c:     	mov	x0, x20
102053d10:     	bl	0x103be9400  SELECTOR keyWindow
102053d14:     	cbz	x22, 0x102053d34
102053d18:     	cmp	x0, x22
102053d1c:     	b.eq	0x102053d34
102053d20:     	ldr	x0, [x23, #0x778]
102053d24:     	bl	0x103be7e00  SELECTOR hasPopupMenuWindow
102053d28:     	tbnz	w0, #0x0, 0x102053d34
102053d2c:     	mov	x0, x22
102053d30:     	bl	0x103be9a60  SELECTOR makeKeyWindow
102053d34:     	mov	x0, x20
102053d38:     	bl	0x103be9080  SELECTOR isRunModal
102053d3c:     	tbnz	w0, #0x0, 0x102053d44
102053d40:     	cbnz	x22, 0x102053d50
102053d44:     	ldr	x0, [x23, #0x778]
102053d48:     	mov	x2, x19
102053d4c:     	bl	0x103be93a0  SELECTOR keyStateEvent:
102053d50:     	adrp	x8, 0x104af8000
102053d54:     	ldr	x8, [x8, #0xb98]
102053d58:     	stp	x20, x8, [sp, #0x70]
102053d5c:     	adrp	x8, 0x104af6000
102053d60:     	ldr	x1, [x8, #0xd90]
102053d64:     	add	x0, sp, #0x70
102053d68:     	mov	x2, x19
102053d6c:     	bl	0x103bdf6a4
102053d70:     	mov	x0, x20
102053d74:     	bl	0x103be8880  SELECTOR inlineKeyWindow
102053d78:     	cbnz	x0, 0x102053db0
102053d7c:     	adrp	x24, 0x1048c8000
102053d80:     	ldr	x24, [x24, #0x538]
102053d84:     	ldr	x0, [x24]
102053d88:     	bl	0x103be9400  SELECTOR keyWindow
102053d8c:     	mov	x22, x0
102053d90:     	ldr	x0, [x24]
102053d94:     	bl	0x103be99e0  SELECTOR mainWindow
102053d98:     	cmp	x22, x0
102053d9c:     	cset	w8, ne
102053da0:     	orr	w8, w8, w21
102053da4:     	tbnz	w8, #0x0, 0x102053db0
102053da8:     	ldr	x0, [x23, #0x778]
102053dac:     	bl	0x103bee920  SELECTOR updateKeyState
102053db0:     	mov	x0, x19
102053db4:     	bl	0x103be8c20  SELECTOR isARepeat
102053db8:     	tbnz	w0, #0x0, 0x102053c74
102053dbc:     	b	0x1020540f8
102053dc0:     	mov	x0, x21
102053dc4:     	bl	0x103be9ee0  SELECTOR mouseLocationOutsideOfEventStream
102053dc8:     	fmov	d8, d0
102053dcc:     	fmov	d9, d1
102053dd0:     	mov	x0, x21
102053dd4:     	fmov	d0, d8
102053dd8:     	fmov	d1, d9
102053ddc:     	bl	0x103be6580  SELECTOR convertBaseToScreen:
102053de0:     	mov	x0, x21
102053de4:     	bl	0x103be6660  SELECTOR convertScreenToBase:
102053de8:     	fmov	d8, d0
102053dec:     	fmov	d9, d1
102053df0:     	adrp	x8, 0x104af8000
102053df4:     	ldr	x20, [x8, #0x828]
102053df8:     	mov	x0, x19
102053dfc:     	bl	0x103bee740  SELECTOR type
102053e00:     	mov	x22, x0
102053e04:     	mov	x0, x19
102053e08:     	bl	0x103be9d00  SELECTOR modifierFlags
102053e0c:     	mov	x23, x0
102053e10:     	mov	x0, x19
102053e14:     	bl	0x103bee4c0  SELECTOR timestamp
102053e18:     	fmov	d10, d0
102053e1c:     	mov	x0, x21
102053e20:     	bl	0x103beee20  SELECTOR windowNumber
102053e24:     	mov	x24, x0
102053e28:     	mov	x0, x19
102053e2c:     	bl	0x103be6520  SELECTOR context
102053e30:     	mov	x25, x0
102053e34:     	mov	x0, x19
102053e38:     	bl	0x103be7540  SELECTOR eventNumber
102053e3c:     	mov	x26, x0
102053e40:     	mov	x0, x19
102053e44:     	bl	0x103bee740  SELECTOR type
102053e48:     	cmp	x0, #0x5
102053e4c:     	b.ne	0x102053e58
102053e50:     	mov	x27, #0x0               ; =0
102053e54:     	b	0x102053e64
102053e58:     	mov	x0, x19
102053e5c:     	bl	0x103be60c0  SELECTOR clickCount
102053e60:     	mov	x27, x0
102053e64:     	mov	x0, x19
102053e68:     	bl	0x103bead20  SELECTOR pressure
102053e6c:     	fmov	s3, s0
102053e70:     	mov	x0, x20
102053e74:     	mov	x2, x22
102053e78:     	fmov	d0, d8
102053e7c:     	fmov	d1, d9
102053e80:     	mov	x3, x23
102053e84:     	fmov	d2, d10
102053e88:     	mov	x4, x24
102053e8c:     	mov	x5, x25
102053e90:     	mov	x6, x26
102053e94:     	mov	x7, x27
102053e98:     	bl	0x103be9ea0  SELECTOR mouseEventWithType:location:modifierFlags:timestamp:windowNumber:context:eventNumber:clickCount:pressure:
102053e9c:     	mov	x19, x0
102053ea0:     	mov	x0, x21
102053ea4:     	bl	0x103beed40  SELECTOR windowController
102053ea8:     	bl	0x103beebc0  SELECTOR viewForRefreshDraw
102053eac:     	ldur	x8, [x29, #-0x80]
102053eb0:     	adrp	x9, 0x1048c8000
102053eb4:     	ldr	x9, [x9, #0x4d0]
102053eb8:     	ldr	x9, [x9]
102053ebc:     	cmp	x9, x8
102053ec0:     	b.ne	0x102054118
102053ec4:     	mov	x2, x19
102053ec8:     	ldp	x29, x30, [sp, #0x1c0]
102053ecc:     	ldp	x20, x19, [sp, #0x1b0]
102053ed0:     	ldp	x22, x21, [sp, #0x1a0]
102053ed4:     	ldp	x24, x23, [sp, #0x190]
102053ed8:     	ldp	x26, x25, [sp, #0x180]
102053edc:     	ldp	x28, x27, [sp, #0x170]
102053ee0:     	ldp	d9, d8, [sp, #0x160]
102053ee4:     	ldp	d11, d10, [sp, #0x150]
102053ee8:     	add	sp, sp, #0x1d0
102053eec:     	b	0x103be9e20
102053ef0:     	mov	x0, x20
102053ef4:     	bl	0x103be9080  SELECTOR isRunModal
102053ef8:     	tbnz	w0, #0x0, 0x102053f18
102053efc:     	mov	x0, x20
102053f00:     	bl	0x103be8880  SELECTOR inlineKeyWindow
102053f04:     	cbnz	x0, 0x102053f18
102053f08:     	adrp	x8, 0x104af8000
102053f0c:     	ldr	x0, [x8, #0x778]
102053f10:     	mov	x2, x19
102053f14:     	bl	0x103be93a0  SELECTOR keyStateEvent:
102053f18:     	mov	x0, x20
102053f1c:     	mov	x2, x19
102053f20:     	bl	0x103be7d60  SELECTOR handleKeyEquivalent:
102053f24:     	tbnz	w0, #0x0, 0x102053c74
102053f28:     	ldr	x0, [x23]
102053f2c:     	bl	0x103be9400  SELECTOR keyWindow
102053f30:     	mov	x21, x0
102053f34:     	ldr	x0, [x23]
102053f38:     	bl	0x103be99e0  SELECTOR mainWindow
102053f3c:     	mov	x22, x0
102053f40:     	cbz	x21, 0x102053fa4
102053f44:     	adrp	x8, 0x104af7000
102053f48:     	ldr	x2, [x8, #0x118]
102053f4c:     	mov	x0, x21
102053f50:     	bl	0x103beb600  SELECTOR respondsToSelector:
102053f54:     	cbz	w0, 0x102053fc8
102053f58:     	mov	x0, x21
102053f5c:     	b	0x102053fc0
102053f60:     	mov	x0, x20
102053f64:     	mov	x2, x19
102053f68:     	bl	0x103be7d60  SELECTOR handleKeyEquivalent:
102053f6c:     	tbnz	w0, #0x0, 0x102053c74
102053f70:     	adrp	x8, 0x104af8000
102053f74:     	ldr	x0, [x8, #0x778]
102053f78:     	mov	x2, x19
102053f7c:     	bl	0x103be93a0  SELECTOR keyStateEvent:
102053f80:     	adrp	x8, 0x104af8000
102053f84:     	ldr	x8, [x8, #0xb98]
102053f88:     	stp	x20, x8, [sp, #0x90]
102053f8c:     	adrp	x8, 0x104af6000
102053f90:     	ldr	x1, [x8, #0xd90]
102053f94:     	add	x0, sp, #0x90
102053f98:     	mov	x2, x19
102053f9c:     	bl	0x103bdf6a4
102053fa0:     	b	0x1020540f8
102053fa4:     	cbz	x22, 0x10205403c
102053fa8:     	adrp	x8, 0x104af7000
102053fac:     	ldr	x2, [x8, #0x118]
102053fb0:     	mov	x0, x22
102053fb4:     	bl	0x103beb600  SELECTOR respondsToSelector:
102053fb8:     	cbz	w0, 0x102053fc8
102053fbc:     	mov	x0, x22
102053fc0:     	mov	w2, #0x0                ; =0
102053fc4:     	bl	0x103beca60  SELECTOR setKeyUpEventHandled:
102053fc8:     	mov	x24, #0x0               ; =0
102053fcc:     	adrp	x8, 0x104af8000
102053fd0:     	ldr	x8, [x8, #0xb98]
102053fd4:     	stp	x20, x8, [sp, #0x10]
102053fd8:     	adrp	x8, 0x104af6000
102053fdc:     	ldr	x1, [x8, #0xd90]
102053fe0:     	add	x0, sp, #0x10
102053fe4:     	mov	x2, x19
102053fe8:     	bl	0x103bdf6a4
102053fec:     	adrp	x8, 0x104af6000
102053ff0:     	ldr	x2, [x8, #0x378]
102053ff4:     	cbz	x21, 0x102054018
102053ff8:     	mov	x0, x21
102053ffc:     	bl	0x103beb600  SELECTOR respondsToSelector:
102054000:     	cbz	w0, 0x1020540f8
102054004:     	mov	x0, x21
102054008:     	bl	0x103be93e0  SELECTOR keyUpEventHandled
10205400c:     	tbnz	w0, #0x0, 0x1020540f8
102054010:     	mov	x0, x21
102054014:     	b	0x1020540f0
102054018:     	cbz	x22, 0x1020540d4
10205401c:     	mov	x0, x22
102054020:     	bl	0x103beb600  SELECTOR respondsToSelector:
102054024:     	cbz	w0, 0x1020540f8
102054028:     	mov	x0, x22
10205402c:     	bl	0x103be93e0  SELECTOR keyUpEventHandled
102054030:     	tbnz	w0, #0x0, 0x1020540f8
102054034:     	mov	x0, x22
102054038:     	b	0x1020540f0
10205403c:     	ldr	x0, [x23]
102054040:     	bl	0x103bea6a0  SELECTOR orderedWindows
102054044:     	mov	x23, x0
102054048:     	movi.2d	v0, #0000000000000000
10205404c:     	stp	q0, q0, [sp, #0x20]
102054050:     	stp	q0, q0, [sp, #0x40]
102054054:     	add	x2, sp, #0x20
102054058:     	add	x3, sp, #0xc0
10205405c:     	mov	w4, #0x10               ; =16
102054060:     	bl	0x103be67a0  SELECTOR countByEnumeratingWithState:objects:count:
102054064:     	cbz	x0, 0x102053fc8
102054068:     	mov	x25, x0
10205406c:     	ldr	x8, [sp, #0x30]
102054070:     	ldr	x26, [x8]
102054074:     	mov	x27, #0x0               ; =0
102054078:     	ldr	x8, [sp, #0x30]
10205407c:     	ldr	x8, [x8]
102054080:     	cmp	x8, x26
102054084:     	b.eq	0x102054090
102054088:     	mov	x0, x23
10205408c:     	bl	0x103bdf68c
102054090:     	ldr	x8, [sp, #0x28]
102054094:     	ldr	x24, [x8, x27, lsl #3]
102054098:     	mov	x0, x24
10205409c:     	bl	0x103be5c60  SELECTOR canBecomeKeyWindow
1020540a0:     	cbnz	w0, 0x102054108
1020540a4:     	add	x27, x27, #0x1
1020540a8:     	cmp	x25, x27
1020540ac:     	b.ne	0x102054078
1020540b0:     	add	x2, sp, #0x20
1020540b4:     	add	x3, sp, #0xc0
1020540b8:     	mov	x0, x23
1020540bc:     	mov	w4, #0x10               ; =16
1020540c0:     	bl	0x103be67a0  SELECTOR countByEnumeratingWithState:objects:count:
1020540c4:     	mov	x25, x0
1020540c8:     	mov	x24, #0x0               ; =0
1020540cc:     	cbnz	x0, 0x102054074
1020540d0:     	b	0x102053fcc
1020540d4:     	mov	x0, x24
1020540d8:     	bl	0x103beb600  SELECTOR respondsToSelector:
1020540dc:     	cbz	w0, 0x1020540f8
1020540e0:     	mov	x0, x24
1020540e4:     	bl	0x103be93e0  SELECTOR keyUpEventHandled
1020540e8:     	tbnz	w0, #0x0, 0x1020540f8
1020540ec:     	mov	x0, x24
1020540f0:     	mov	x2, x19
1020540f4:     	bl	0x103bebc40  SELECTOR sendEvent:
1020540f8:     	mov	x0, x20
1020540fc:     	mov	x2, x19
102054100:     	bl	0x103be9360  SELECTOR keyEventSendLegacyMouseMovedEvent:
102054104:     	b	0x102053c74
102054108:     	mov	x0, x24
10205410c:     	mov	w2, #0x0                ; =0
102054110:     	bl	0x103beca60  SELECTOR setKeyUpEventHandled:
102054114:     	b	0x102053fcc
102054118:     	bl	0x103bdd4d8

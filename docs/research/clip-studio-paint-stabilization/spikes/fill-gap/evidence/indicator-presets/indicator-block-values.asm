
/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64:	file format mach-o arm64

Disassembly of section __TEXT,__text:

000000010000f680 <__text>:
100f28a78:     	sub	sp, sp, #0xd0
100f28a7c:     	stp	d13, d12, [sp, #0x50]
100f28a80:     	stp	d11, d10, [sp, #0x60]
100f28a84:     	stp	d9, d8, [sp, #0x70]
100f28a88:     	stp	x26, x25, [sp, #0x80]
100f28a8c:     	stp	x24, x23, [sp, #0x90]
100f28a90:     	stp	x22, x21, [sp, #0xa0]
100f28a94:     	stp	x20, x19, [sp, #0xb0]
100f28a98:     	stp	x29, x30, [sp, #0xc0]
100f28a9c:     	add	x29, sp, #0xc0
100f28aa0:     	mov	x19, x4
100f28aa4:     	fmov	d8, d1
100f28aa8:     	fmov	d9, d0
100f28aac:     	mov	x21, x1
100f28ab0:     	mov	x20, x0
100f28ab4:     	mov	x22, #0x0               ; =0
100f28ab8:     	stp	xzr, xzr, [sp, #0x38]
100f28abc:     	str	xzr, [sp, #0x48]
100f28ac0:     	cmp	w2, #0x0
100f28ac4:     	ccmp	w3, #0x2, #0x0, ne
100f28ac8:     	cset	w23, eq
100f28acc:     	adrp	x8, 0x1042ec000 <dyld_stub_binder+0x1042ec000>
100f28ad0:     	ldr	d10, [x8, #0xb78]
100f28ad4:     	adrp	x8, 0x1042ec000 <dyld_stub_binder+0x1042ec000>
100f28ad8:     	ldr	d11, [x8, #0xf58]
100f28adc:     	adrp	x24, 0x1042e4000 <dyld_stub_binder+0x1042e4000>
100f28ae0:     	add	x24, x24, #0x7a0
100f28ae4:     	mov	x25, #0x4059000000000000 ; =4636737291354636288
100f28ae8:     	fmov	d12, #10.00000000
100f28aec:     	ldr	d0, [x19, x22]
100f28af0:     	fmul	d1, d0, d10
100f28af4:     	cmp	w23, #0x0
100f28af8:     	fcsel	d0, d1, d0, ne
100f28afc:     	fcmp	d0, d9
100f28b00:     	fcsel	d0, d9, d0, gt
100f28b04:     	fcmp	d0, d8
100f28b08:     	fcsel	d0, d8, d0, mi
100f28b0c:     	cmp	w21, #0x3
100f28b10:     	b.eq	0x100f28b34 <__text+0xf194b4>
100f28b14:     	fmov	d1, x25
100f28b18:     	fmul	d1, d0, d1
100f28b1c:     	cmp	w21, #0x1
100f28b20:     	fmul	d2, d0, d12
100f28b24:     	fcsel	d0, d0, d2, ne
100f28b28:     	cmp	w21, #0x2
100f28b2c:     	fcsel	d0, d1, d0, eq
100f28b30:     	b	0x100f28b38 <__text+0xf194b8>
100f28b34:     	fmul	d0, d0, d11
100f28b38:     	fcmp	d0, #0.0
100f28b3c:     	cset	w8, mi
100f28b40:     	ldr	d1, [x24, w8, uxtw #3]
100f28b44:     	fadd	d0, d0, d1
100f28b48:     	fcvtzs	w8, d0
100f28b4c:     	str	w8, [sp, #0x34]
100f28b50:     	add	x0, sp, #0x38
100f28b54:     	add	x1, sp, #0x34
100f28b58:     	bl	0x100012414 <__text+0x2d94>
100f28b5c:     	add	x22, x22, #0x8
100f28b60:     	cmp	x22, #0x28
100f28b64:     	b.ne	0x100f28aec <__text+0xf1946c>
100f28b68:     	ldp	x9, x8, [x20]
100f28b6c:     	stp	x9, x8, [sp, #0x20]
100f28b70:     	cbz	x8, 0x100f28b80 <__text+0xf19500>
100f28b74:     	add	x8, x8, #0x8
100f28b78:     	mov	w9, #0x1                ; =1
100f28b7c:     	ldadd	w9, w8, [x8]
100f28b80:     	add	x20, sp, #0x20
100f28b84:     	stp	xzr, xzr, [sp, #0x8]
100f28b88:     	str	xzr, [sp, #0x18]
100f28b8c:     	ldp	x1, x2, [sp, #0x38]
100f28b90:     	sub	x8, x2, x1
100f28b94:     	asr	x3, x8, #2
100f28b98:     	add	x0, sp, #0x8
100f28b9c:     	bl	0x1004b7a34 <__text+0x4a83b4>
100f28ba0:     	add	x0, sp, #0x20
100f28ba4:     	add	x1, sp, #0x8
100f28ba8:     	bl	0x1032cbea8 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xacbc>
100f28bac:     	ldr	x0, [sp, #0x8]
100f28bb0:     	cbz	x0, 0x100f28bbc <__text+0xf1953c>
100f28bb4:     	str	x0, [sp, #0x10]
100f28bb8:     	bl	0x103bdd34c <dyld_stub_binder+0x103bdd34c>
100f28bbc:     	add	x0, x20, #0x8
100f28bc0:     	bl	0x10001022c <__text+0xbac>
100f28bc4:     	ldr	x0, [sp, #0x38]
100f28bc8:     	cbz	x0, 0x100f28bd4 <__text+0xf19554>
100f28bcc:     	str	x0, [sp, #0x40]
100f28bd0:     	bl	0x103bdd34c <dyld_stub_binder+0x103bdd34c>
100f28bd4:     	ldp	x29, x30, [sp, #0xc0]
100f28bd8:     	ldp	x20, x19, [sp, #0xb0]
100f28bdc:     	ldp	x22, x21, [sp, #0xa0]
100f28be0:     	ldp	x24, x23, [sp, #0x90]
100f28be4:     	ldp	x26, x25, [sp, #0x80]
100f28be8:     	ldp	d9, d8, [sp, #0x70]
100f28bec:     	ldp	d11, d10, [sp, #0x60]
100f28bf0:     	ldp	d13, d12, [sp, #0x50]
100f28bf4:     	add	sp, sp, #0xd0
100f28bf8:     	ret
100f28bfc:     	mov	x19, x0
100f28c00:     	ldr	x0, [sp, #0x8]
100f28c04:     	cbz	x0, 0x100f28c18 <__text+0xf19598>
100f28c08:     	str	x0, [sp, #0x10]
100f28c0c:     	bl	0x103bdd34c <dyld_stub_binder+0x103bdd34c>
100f28c10:     	b	0x100f28c18 <__text+0xf19598>
100f28c14:     	mov	x19, x0
100f28c18:     	add	x0, x20, #0x8
100f28c1c:     	bl	0x10001022c <__text+0xbac>
100f28c20:     	b	0x100f28c28 <__text+0xf195a8>
100f28c24:     	mov	x19, x0
100f28c28:     	ldr	x0, [sp, #0x38]
100f28c2c:     	cbz	x0, 0x100f28c38 <__text+0xf195b8>
100f28c30:     	str	x0, [sp, #0x40]
100f28c34:     	bl	0x103bdd34c <dyld_stub_binder+0x103bdd34c>
100f28c38:     	mov	x0, x19
100f28c3c:     	bl	0x103bda970 <dyld_stub_binder+0x103bda970>

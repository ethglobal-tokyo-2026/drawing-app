
/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64:	file format mach-o arm64

Disassembly of section __TEXT,__text:

0000000102a8a130 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker26PWExtensionServicePropertyEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_>:
102a9c014:     	adrp	x8, 0x104309000 <dyld_stub_binder+0x104309000>
102a9c018:     	ldr	d0, [x8, #0x1c8]
102a9c01c:     	stur	d0, [x19, #0x4]
102a9c020:     	str	w9, [x19, #0xe0]
102a9c024:     	mov	w8, #0x13ec             ; =5100
102a9c028:     	str	w8, [x19, #0x10]
102a9c02c:     	mov	w22, #0x6               ; =6
102a9c030:     	movk	w22, #0x2e, lsl #16
102a9c034:     	sub	x23, x29, #0x60
102a9c038:     	sub	x8, x29, #0x60
102a9c03c:     	add	w1, w22, #0x13
102a9c040:     	mov	x0, x20
102a9c044:     	bl	0x102e10fb0 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker18PWToneGradationBarEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0x1644>
102a9c048:     	add	x24, sp, #0x1f0
102a9c04c:     	ldur	q0, [x29, #-0x60]
102a9c050:     	stp	xzr, xzr, [x29, #-0x60]
102a9c054:     	ldur	q1, [x19, #0x18]
102a9c058:     	stur	q0, [x19, #0x18]
102a9c05c:     	str	q1, [sp, #0x1f0]
102a9c060:     	orr	x0, x24, #0x8
102a9c064:     	bl	0x10001022c <__text+0xbac>
102a9c068:     	orr	x0, x23, #0x8
102a9c06c:     	bl	0x10001022c <__text+0xbac>
102a9c070:     	sub	x8, x29, #0x60
102a9c074:     	add	w1, w22, #0x14
102a9c078:     	mov	x0, x20
102a9c07c:     	bl	0x102e10fb0 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker18PWToneGradationBarEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0x1644>
102a9c080:     	ldur	q0, [x29, #-0x60]
102a9c084:     	stp	xzr, xzr, [x29, #-0x60]
102a9c088:     	ldur	q1, [x19, #0x28]
102a9c08c:     	stur	q0, [x19, #0x28]
102a9c090:     	str	q1, [sp, #0x1f0]
102a9c094:     	orr	x0, x24, #0x8
102a9c098:     	bl	0x10001022c <__text+0xbac>
102a9c09c:     	orr	x0, x23, #0x8
102a9c0a0:     	bl	0x10001022c <__text+0xbac>
102a9c0a4:     	cmp	w21, #0x2
102a9c0a8:     	cset	w8, eq
102a9c0ac:     	dup.2s	v0, w8
102a9c0b0:     	ushll.2d	v0, v0, #0x0
102a9c0b4:     	shl.2d	v0, v0, #0x3f
102a9c0b8:     	cmlt.2d	v0, v0, #0
102a9c0bc:     	adrp	x8, 0x104552000 <__ZZN5boost13re_detail_60018basic_regex_parserIcNS_12regex_traitsIcNS_16cpp_regex_traitsIcEEEEE14add_emacs_codeEbE7s_punct+0x34149>
102a9c0c0:     	ldr	q1, [x8, #0x8e0]
102a9c0c4:     	adrp	x8, 0x104559000 <__ZZN5boost13re_detail_60018basic_regex_parserIcNS_12regex_traitsIcNS_16cpp_regex_traitsIcEEEEE14add_emacs_codeEbE7s_punct+0x3b149>
102a9c0c8:     	ldr	q2, [x8, #0xa50]
102a9c0cc:     	bsl.16b	v0, v2, v1
102a9c0d0:     	str	q0, [x19, #0x50]
102a9c0d4:     	str	w21, [x19, #0x60]
102a9c0d8:     	mov	w8, #0x13ee             ; =5102
102a9c0dc:     	b	0x102a9cce8 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker26PWExtensionServicePropertyEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0x12bb8>

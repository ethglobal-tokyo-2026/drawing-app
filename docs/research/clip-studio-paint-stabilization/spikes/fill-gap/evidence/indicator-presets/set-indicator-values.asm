
/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64:	file format mach-o arm64

Disassembly of section __TEXT,__text:

00000001032c11ec <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_>:
1032cbea8:     	sub	sp, sp, #0x30
1032cbeac:     	stp	x20, x19, [sp, #0x10]
1032cbeb0:     	stp	x29, x30, [sp, #0x20]
1032cbeb4:     	add	x29, sp, #0x20
1032cbeb8:     	mov	x19, x1
1032cbebc:     	ldp	x9, x8, [x0]
1032cbec0:     	stp	x9, x8, [sp]
1032cbec4:     	cbz	x8, 0x1032cbed4 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xace8>
1032cbec8:     	add	x8, x8, #0x8
1032cbecc:     	mov	w9, #0x1                ; =1
1032cbed0:     	ldadd	w9, w8, [x8]
1032cbed4:     	mov	x20, sp
1032cbed8:     	adrp	x0, 0x104cee000 <dyld_stub_binder+0x104cee000>
1032cbedc:     	add	x0, x0, #0xc00
1032cbee0:     	bl	0x10214de74 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker13PWContextMenuEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0x1320>
1032cbee4:     	mov	x1, x0
1032cbee8:     	mov	x0, sp
1032cbeec:     	mov	x2, x19
1032cbef0:     	bl	0x1032cbf20 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xad34>
1032cbef4:     	add	x0, x20, #0x8
1032cbef8:     	bl	0x10001022c <__text+0xbac>
1032cbefc:     	ldp	x29, x30, [sp, #0x20]
1032cbf00:     	ldp	x20, x19, [sp, #0x10]
1032cbf04:     	add	sp, sp, #0x30
1032cbf08:     	ret
1032cbf0c:     	mov	x19, x0
1032cbf10:     	add	x0, x20, #0x8
1032cbf14:     	bl	0x10001022c <__text+0xbac>
1032cbf18:     	mov	x0, x19
1032cbf1c:     	bl	0x103bda970 <dyld_stub_binder+0x103bda970>


/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64:	file format mach-o arm64

Disassembly of section __TEXT,__text:

00000001032c11ec <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_>:
1032ccbb4:     	sub	sp, sp, #0x40
1032ccbb8:     	stp	x22, x21, [sp, #0x10]
1032ccbbc:     	stp	x20, x19, [sp, #0x20]
1032ccbc0:     	stp	x29, x30, [sp, #0x30]
1032ccbc4:     	add	x29, sp, #0x30
1032ccbc8:     	mov	x20, x2
1032ccbcc:     	mov	x19, x1
1032ccbd0:     	mov	x22, sp
1032ccbd4:     	mov	x8, sp
1032ccbd8:     	bl	0x1021bb58c <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tIjPFjiRKN12Planeswalker6SRangeEENS3_4listIJNS3_5valueIjEENS_3argILi1EEEEEEEEjJS8_EE6invokeERNS1_15function_bufferES8_+0x770>
1032ccbdc:     	mov	x0, sp
1032ccbe0:     	bl	0x1032cc294 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xb0a8>
1032ccbe4:     	mov	x21, x0
1032ccbe8:     	add	x0, x22, #0x8
1032ccbec:     	bl	0x10001022c <__text+0xbac>
1032ccbf0:     	mov	x0, #0x0                ; =0
1032ccbf4:     	tbnz	w19, #0x1f, 0x1032ccc5c <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xba70>
1032ccbf8:     	cmp	w21, #0x1
1032ccbfc:     	b.lt	0x1032ccc5c <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xba70>
1032ccc00:     	mov	x1, x0
1032ccc04:     	cmp	w21, w19
1032ccc08:     	b.le	0x1032ccc78 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xba8c>
1032ccc0c:     	ldp	w8, w9, [x20]
1032ccc10:     	ldp	w10, w15, [x20, #0x8]
1032ccc14:     	sub	w11, w10, w8
1032ccc18:     	sub	w10, w11, w21
1032ccc1c:     	add	w10, w10, #0x1
1032ccc20:     	sdiv	w10, w10, w21
1032ccc24:     	mvn	w12, w10
1032ccc28:     	madd	w11, w21, w12, w11
1032ccc2c:     	add	w13, w11, #0x1
1032ccc30:     	add	w12, w10, #0x1
1032ccc34:     	mul	w14, w12, w19
1032ccc38:     	lsl	x11, x9, #32
1032ccc3c:     	lsl	x9, x15, #32
1032ccc40:     	cmp	w13, w19
1032ccc44:     	b.le	0x1032ccc64 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xba78>
1032ccc48:     	add	w8, w8, w19
1032ccc4c:     	add	w8, w8, w14
1032ccc50:     	orr	x0, x11, x8
1032ccc54:     	add	w8, w12, w8
1032ccc58:     	b	0x1032ccc74 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xba88>
1032ccc5c:     	mov	x1, x0
1032ccc60:     	b	0x1032ccc78 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xba8c>
1032ccc64:     	add	w8, w14, w8
1032ccc68:     	add	w8, w8, w13
1032ccc6c:     	orr	x0, x11, x8
1032ccc70:     	add	w8, w8, w10
1032ccc74:     	orr	x1, x9, x8
1032ccc78:     	ldp	x29, x30, [sp, #0x30]
1032ccc7c:     	ldp	x20, x19, [sp, #0x20]
1032ccc80:     	ldp	x22, x21, [sp, #0x10]
1032ccc84:     	add	sp, sp, #0x40
1032ccc88:     	ret
1032ccc8c:     	mov	x19, x0
1032ccc90:     	add	x0, x22, #0x8
1032ccc94:     	bl	0x10001022c <__text+0xbac>
1032ccc98:     	mov	x0, x19
1032ccc9c:     	bl	0x103bda970 <dyld_stub_binder+0x103bda970>

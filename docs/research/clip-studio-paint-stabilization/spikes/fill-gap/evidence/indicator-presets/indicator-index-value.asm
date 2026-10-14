
/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64:	file format mach-o arm64

Disassembly of section __TEXT,__text:

00000001032c11ec <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_>:
1032cc1ac:     	sub	sp, sp, #0x60
1032cc1b0:     	stp	x22, x21, [sp, #0x30]
1032cc1b4:     	stp	x20, x19, [sp, #0x40]
1032cc1b8:     	stp	x29, x30, [sp, #0x50]
1032cc1bc:     	add	x29, sp, #0x50
1032cc1c0:     	mov	x19, x2
1032cc1c4:     	mov	x20, x1
1032cc1c8:     	ldp	x9, x8, [x0]
1032cc1cc:     	stp	x9, x8, [sp, #0x8]
1032cc1d0:     	cbz	x8, 0x1032cc1e0 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xaff4>
1032cc1d4:     	add	x8, x8, #0x8
1032cc1d8:     	mov	w9, #0x1                ; =1
1032cc1dc:     	ldadd	w9, w8, [x8]
1032cc1e0:     	add	x21, sp, #0x8
1032cc1e4:     	add	x8, sp, #0x18
1032cc1e8:     	add	x0, sp, #0x8
1032cc1ec:     	bl	0x1032cbf84 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xad98>
1032cc1f0:     	add	x0, x21, #0x8
1032cc1f4:     	bl	0x10001022c <__text+0xbac>
1032cc1f8:     	ldp	x0, x8, [sp, #0x18]
1032cc1fc:     	sub	x8, x8, x0
1032cc200:     	asr	x8, x8, #2
1032cc204:     	cmp	w8, #0x1
1032cc208:     	b.lt	0x1032cc230 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xb044>
1032cc20c:     	ldrsw	x9, [x20]
1032cc210:     	cmp	w9, w8
1032cc214:     	b.ge	0x1032cc230 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xb044>
1032cc218:     	cmp	x8, x9
1032cc21c:     	b.ls	0x1032cc260 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xb074>
1032cc220:     	ldr	w8, [x0, x9, lsl #2]
1032cc224:     	str	w8, [x19]
1032cc228:     	mov	w19, #0x1               ; =1
1032cc22c:     	b	0x1032cc23c <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xb050>
1032cc230:     	mov	w19, #0x0               ; =0
1032cc234:     	mov	w1, #0x0                ; =0
1032cc238:     	cbz	x0, 0x1032cc248 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xb05c>
1032cc23c:     	str	x0, [sp, #0x20]
1032cc240:     	bl	0x103bdd34c <dyld_stub_binder+0x103bdd34c>
1032cc244:     	mov	x1, x19
1032cc248:     	mov	x0, x1
1032cc24c:     	ldp	x29, x30, [sp, #0x50]
1032cc250:     	ldp	x20, x19, [sp, #0x40]
1032cc254:     	ldp	x22, x21, [sp, #0x30]
1032cc258:     	add	sp, sp, #0x60
1032cc25c:     	ret
1032cc260:     	bl	0x10008869c <__text+0x7901c>
1032cc264:     	brk	#0x1
1032cc268:     	mov	x19, x0
1032cc26c:     	ldr	x0, [sp, #0x18]
1032cc270:     	cbz	x0, 0x1032cc28c <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xb0a0>
1032cc274:     	str	x0, [sp, #0x20]
1032cc278:     	bl	0x103bdd34c <dyld_stub_binder+0x103bdd34c>
1032cc27c:     	b	0x1032cc28c <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker11PWLayoutBoxEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_+0xb0a0>
1032cc280:     	mov	x19, x0
1032cc284:     	add	x0, x21, #0x8
1032cc288:     	bl	0x10001022c <__text+0xbac>
1032cc28c:     	mov	x0, x19
1032cc290:     	bl	0x103bda970 <dyld_stub_binder+0x103bda970>

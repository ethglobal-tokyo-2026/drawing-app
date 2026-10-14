
/Users/adoll/Applications/CSP Research/static-analysis/paint-arm64:	file format mach-o arm64

Disassembly of section __TEXT,__text:

0000000102a8a130 <__ZN5boost6detail8function20function_obj_invokerINS_3_bi6bind_tINS3_11unspecifiedENS_4_mfi2mfIMN12Planeswalker26PWExtensionServicePropertyEFjRNS8_7PWEventEEjS9_JSB_EEENS3_4listIJNS3_5valueIPS9_EENS_3argILi1EEEEEEEEjJSB_EE6invokeERNS1_15function_bufferESB_>:
102a9d450:     	sub	sp, sp, #0x50
102a9d454:     	stp	x22, x21, [sp, #0x20]
102a9d458:     	stp	x20, x19, [sp, #0x30]
102a9d45c:     	stp	x29, x30, [sp, #0x40]
102a9d460:     	add	x29, sp, #0x40
102a9d464:     	mov	x20, x1
102a9d468:     	ldr	x0, [x1]
102a9d46c:     	mov	w8, #0x13ed             ; =5101
102a9d470:     	str	w8, [sp, #0x10]
102a9d474:     	add	x21, sp, #0x10
102a9d478:     	str	x21, [sp, #0x18]
102a9d47c:     	adrp	x19, 0x104559000 <__ZZN5boost13re_detail_60018basic_regex_parserIcNS_12regex_traitsIcNS_16cpp_regex_traitsIcEEEEE14add_emacs_codeEbE7s_punct+0x3b149>
102a9d480:     	add	x19, x19, #0xab4
102a9d484:     	add	x1, sp, #0x10
102a9d488:     	add	x3, sp, #0x18
102a9d48c:     	add	x4, sp, #0x17
102a9d490:     	mov	x2, x19
102a9d494:     	bl	0x100b2b518 <__text+0xb1be98>
102a9d498:     	adrp	x8, 0x104314000 <dyld_stub_binder+0x104314000>
102a9d49c:     	ldr	q0, [x8, #0x720]
102a9d4a0:     	stur	q0, [x0, #0x28]
102a9d4a4:     	adrp	x8, 0x104314000 <dyld_stub_binder+0x104314000>
102a9d4a8:     	ldr	q0, [x8, #0x630]
102a9d4ac:     	stur	q0, [x0, #0x38]
102a9d4b0:     	mov	x8, #0x4034000000000000 ; =4626322717216342016
102a9d4b4:     	str	x8, [x0, #0x48]
102a9d4b8:     	mov	w8, #0x1                ; =1
102a9d4bc:     	str	w8, [x0, #0x50]
102a9d4c0:     	ldr	x0, [x20]
102a9d4c4:     	mov	w8, #0x13f7             ; =5111
102a9d4c8:     	str	w8, [sp, #0x10]
102a9d4cc:     	str	x21, [sp, #0x18]
102a9d4d0:     	add	x1, sp, #0x10
102a9d4d4:     	add	x3, sp, #0x18
102a9d4d8:     	add	x4, sp, #0x17
102a9d4dc:     	mov	x2, x19
102a9d4e0:     	bl	0x100b2b518 <__text+0xb1be98>
102a9d4e4:     	adrp	x8, 0x104559000 <__ZZN5boost13re_detail_60018basic_regex_parserIcNS_12regex_traitsIcNS_16cpp_regex_traitsIcEEEEE14add_emacs_codeEbE7s_punct+0x3b149>
102a9d4e8:     	ldr	q0, [x8, #0xa60]
102a9d4ec:     	stur	q0, [x0, #0x28]
102a9d4f0:     	adrp	x8, 0x10430b000 <dyld_stub_binder+0x10430b000>
102a9d4f4:     	ldr	q0, [x8, #0x420]
102a9d4f8:     	str	q0, [sp]
102a9d4fc:     	stur	q0, [x0, #0x38]
102a9d500:     	mov	x8, #0x4014000000000000 ; =4617315517961601024
102a9d504:     	str	x8, [x0, #0x48]
102a9d508:     	str	wzr, [x0, #0x50]
102a9d50c:     	ldr	x0, [x20]
102a9d510:     	mov	w8, #0x1400             ; =5120
102a9d514:     	str	w8, [sp, #0x10]
102a9d518:     	str	x21, [sp, #0x18]
102a9d51c:     	add	x1, sp, #0x10
102a9d520:     	add	x3, sp, #0x18
102a9d524:     	add	x4, sp, #0x17
102a9d528:     	mov	x2, x19
102a9d52c:     	bl	0x100b2b518 <__text+0xb1be98>
102a9d530:     	adrp	x8, 0x104309000 <dyld_stub_binder+0x104309000>
102a9d534:     	ldr	q0, [x8, #0x260]
102a9d538:     	stur	q0, [x0, #0x28]
102a9d53c:     	adrp	x8, 0x104559000 <__ZZN5boost13re_detail_60018basic_regex_parserIcNS_12regex_traitsIcNS_16cpp_regex_traitsIcEEEEE14add_emacs_codeEbE7s_punct+0x3b149>
102a9d540:     	ldr	q0, [x8, #0xa70]
102a9d544:     	stur	q0, [x0, #0x38]
102a9d548:     	mov	x22, #0x4059000000000000 ; =4636737291354636288
102a9d54c:     	str	x22, [x0, #0x48]
102a9d550:     	str	wzr, [x0, #0x50]
102a9d554:     	ldr	x0, [x20]
102a9d558:     	mov	w8, #0x6f               ; =111
102a9d55c:     	str	w8, [sp, #0x10]
102a9d560:     	str	x21, [sp, #0x18]
102a9d564:     	add	x1, sp, #0x10
102a9d568:     	add	x3, sp, #0x18
102a9d56c:     	add	x4, sp, #0x17
102a9d570:     	mov	x2, x19
102a9d574:     	bl	0x100b2b518 <__text+0xb1be98>
102a9d578:     	adrp	x8, 0x104314000 <dyld_stub_binder+0x104314000>
102a9d57c:     	ldr	q0, [x8, #0x470]
102a9d580:     	stur	q0, [x0, #0x28]
102a9d584:     	adrp	x8, 0x104314000 <dyld_stub_binder+0x104314000>
102a9d588:     	ldr	q0, [x8, #0x480]
102a9d58c:     	stur	q0, [x0, #0x38]
102a9d590:     	str	x22, [x0, #0x48]
102a9d594:     	str	wzr, [x0, #0x50]
102a9d598:     	ldr	x0, [x20]
102a9d59c:     	mov	w8, #0x157c             ; =5500
102a9d5a0:     	str	w8, [sp, #0x10]
102a9d5a4:     	str	x21, [sp, #0x18]
102a9d5a8:     	add	x1, sp, #0x10
102a9d5ac:     	add	x3, sp, #0x18
102a9d5b0:     	add	x4, sp, #0x17
102a9d5b4:     	mov	x2, x19
102a9d5b8:     	bl	0x100b2b518 <__text+0xb1be98>
102a9d5bc:     	ldr	q0, [sp]
102a9d5c0:     	stur	q0, [x0, #0x28]
102a9d5c4:     	adrp	x8, 0x104559000 <__ZZN5boost13re_detail_60018basic_regex_parserIcNS_12regex_traitsIcNS_16cpp_regex_traitsIcEEEEE14add_emacs_codeEbE7s_punct+0x3b149>
102a9d5c8:     	ldr	q0, [x8, #0xa80]
102a9d5cc:     	stur	q0, [x0, #0x38]
102a9d5d0:     	mov	x8, #0x4024000000000000 ; =4621819117588971520
102a9d5d4:     	str	x8, [x0, #0x48]
102a9d5d8:     	str	wzr, [x0, #0x50]
102a9d5dc:     	ldp	x29, x30, [sp, #0x40]
102a9d5e0:     	ldp	x20, x19, [sp, #0x30]
102a9d5e4:     	ldp	x22, x21, [sp, #0x20]
102a9d5e8:     	add	sp, sp, #0x50
102a9d5ec:     	ret

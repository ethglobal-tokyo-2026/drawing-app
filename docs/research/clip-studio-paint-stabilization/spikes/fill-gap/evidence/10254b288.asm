; CSP 5.1.4 ARM64, unslid range 0x10254b288:0x10254b434
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
10254b288:     	ldr	x8, [x0]
10254b28c:     	add	w9, w1, w1, lsl #1
10254b290:     	ldp	x10, x11, [x8]
10254b294:     	ldr	w12, [x10]
10254b298:     	ldr	w10, [x11]
10254b29c:     	add	w14, w12, w9
10254b2a0:     	cmp	w14, w10
10254b2a4:     	b.ge	0x10254b430
10254b2a8:     	ldr	x9, [x8, #0x18]
10254b2ac:     	ldr	x9, [x9]
10254b2b0:     	ldr	x13, [x9, #0x28]
10254b2b4:     	ldr	w11, [x9, #0x10]
10254b2b8:     	mul	w15, w11, w14
10254b2bc:     	sub	w9, w14, #0x1
10254b2c0:     	mul	w9, w11, w9
10254b2c4:     	add	x9, x13, x9
10254b2c8:     	cmp	w14, #0x0
10254b2cc:     	csel	x9, x9, xzr, gt
10254b2d0:     	sub	w10, w10, #0x1
10254b2d4:     	add	w11, w11, w15
10254b2d8:     	add	x11, x13, x11
10254b2dc:     	cmp	w14, w10
10254b2e0:     	csel	x10, x11, xzr, lt
10254b2e4:     	ldr	x11, [x8, #0x30]
10254b2e8:     	ldr	w17, [x11]
10254b2ec:     	cmp	w17, #0x1
10254b2f0:     	b.lt	0x10254b430
10254b2f4:     	mov	w11, #0x0               ; =0
10254b2f8:     	ldr	x12, [x8, #0x10]
10254b2fc:     	ldr	x12, [x12]
10254b300:     	ldr	x16, [x12, #0x28]
10254b304:     	ldr	w12, [x12, #0x10]
10254b308:     	mul	w12, w12, w14
10254b30c:     	add	x12, x16, x12
10254b310:     	add	x13, x13, x15
10254b314:     	ldp	x15, x16, [x8, #0x20]
10254b318:     	ldr	x15, [x15]
10254b31c:     	ldr	w16, [x16, #0x4]
10254b320:     	add	w14, w16, w14
10254b324:     	ldr	x16, [x15, #0x28]
10254b328:     	ldr	w15, [x15, #0x10]
10254b32c:     	mul	w14, w15, w14
10254b330:     	add	x14, x16, x14
10254b334:     	mov	w15, #0x80              ; =128
10254b338:     	mov	w16, #-0x81             ; =-129
10254b33c:     	mov	w0, w11
10254b340:     	lsr	x0, x0, #3
10254b344:     	ldrb	w3, [x12, x0]
10254b348:     	and	w1, w11, #0x7
10254b34c:     	lsr	w2, w15, w1
10254b350:     	tst	w2, w3
10254b354:     	b.eq	0x10254b370
10254b358:     	add	w11, w11, #0x1
10254b35c:     	ldr	x17, [x8, #0x30]
10254b360:     	ldr	w17, [x17]
10254b364:     	cmp	w11, w17
10254b368:     	b.lt	0x10254b33c
10254b36c:     	b	0x10254b430
10254b370:     	ldr	x3, [x8, #0x28]
10254b374:     	ldr	w3, [x3]
10254b378:     	add	w3, w11, w3
10254b37c:     	asr	w4, w3, #3
10254b380:     	ldrb	w4, [x14, w4, sxtw]
10254b384:     	and	w3, w3, #0x7
10254b388:     	lsl	w3, w4, w3
10254b38c:     	tbz	w3, #0x7, 0x10254b358
10254b390:     	cbz	w11, 0x10254b3c4
10254b394:     	sub	w3, w11, #0x1
10254b398:     	asr	w4, w3, #3
10254b39c:     	ldrb	w4, [x13, w4, sxtw]
10254b3a0:     	and	w5, w3, #0x7
10254b3a4:     	lsl	w6, w4, w5
10254b3a8:     	tbz	w6, #0x7, 0x10254b3c4
10254b3ac:     	sbfx	x17, x3, #3, #29
10254b3b0:     	asr	w3, w16, w5
10254b3b4:     	and	w3, w4, w3
10254b3b8:     	strb	w3, [x13, x17]
10254b3bc:     	ldr	x17, [x8, #0x30]
10254b3c0:     	ldr	w17, [x17]
10254b3c4:     	sub	w17, w17, #0x1
10254b3c8:     	cmp	w11, w17
10254b3cc:     	b.ge	0x10254b3f4
10254b3d0:     	add	w4, w11, #0x1
10254b3d4:     	lsr	x17, x4, #3
10254b3d8:     	ldrb	w3, [x13, x17]
10254b3dc:     	and	w4, w4, #0x7
10254b3e0:     	lsl	w5, w3, w4
10254b3e4:     	tbz	w5, #0x7, 0x10254b3f4
10254b3e8:     	asr	w4, w16, w4
10254b3ec:     	and	w3, w3, w4
10254b3f0:     	strb	w3, [x13, x17]
10254b3f4:     	cbz	x9, 0x10254b410
10254b3f8:     	ldrb	w17, [x9, x0]
10254b3fc:     	tst	w2, w17
10254b400:     	b.eq	0x10254b410
10254b404:     	asr	w3, w16, w1
10254b408:     	and	w17, w17, w3
10254b40c:     	strb	w17, [x9, x0]
10254b410:     	cbz	x10, 0x10254b358
10254b414:     	ldrb	w17, [x10, x0]
10254b418:     	tst	w2, w17
10254b41c:     	b.eq	0x10254b358
10254b420:     	asr	w1, w16, w1
10254b424:     	and	w17, w17, w1
10254b428:     	strb	w17, [x10, x0]
10254b42c:     	b	0x10254b358
10254b430:     	ret

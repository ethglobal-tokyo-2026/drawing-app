; CSP 5.1.4 ARM64, unslid range 0x10254a06c:0x10254a3fc
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
10254a06c:     	stp	x20, x19, [sp, #-0x20]!
10254a070:     	stp	x29, x30, [sp, #0x10]
10254a074:     	add	x29, sp, #0x10
10254a078:     	mov	x19, x1
10254a07c:     	mov	x20, x0
10254a080:     	cmp	w2, #0x1
10254a084:     	b.le	0x10254a0a0
10254a088:     	cmp	w2, #0x2
10254a08c:     	b.eq	0x10254a0d0
10254a090:     	cmp	w2, #0x3
10254a094:     	b.eq	0x10254a0e0
10254a098:     	cmp	w2, #0x4
10254a09c:     	b	0x10254a0bc
10254a0a0:     	cbz	w2, 0x10254a108
10254a0a4:     	cmp	w2, #0x1
10254a0a8:     	b.ne	0x10254a0bc
10254a0ac:     	ldr	x8, [x20]
10254a0b0:     	str	x8, [x19]
10254a0b4:     	str	xzr, [x20]
10254a0b8:     	b	0x10254a138
10254a0bc:     	adrp	x8, 0x104a4b000
10254a0c0:     	add	x8, x8, #0x8e0
10254a0c4:     	str	x8, [x19]
10254a0c8:     	strh	wzr, [x19, #0x8]
10254a0cc:     	b	0x10254a138
10254a0d0:     	ldr	x0, [x19]
10254a0d4:     	cbz	x0, 0x10254a100
10254a0d8:     	bl	0x103bdd34c
10254a0dc:     	b	0x10254a100
10254a0e0:     	ldr	x0, [x19]
10254a0e4:     	adrp	x1, 0x104a4b000
10254a0e8:     	add	x1, x1, #0x8e0
10254a0ec:     	bl	0x100016d30
10254a0f0:     	cbz	w0, 0x10254a100
10254a0f4:     	ldr	x8, [x20]
10254a0f8:     	str	x8, [x19]
10254a0fc:     	b	0x10254a138
10254a100:     	str	xzr, [x19]
10254a104:     	b	0x10254a138
10254a108:     	ldr	x20, [x20]
10254a10c:     	mov	w0, #0x80               ; =128
10254a110:     	bl	0x103bdd37c
10254a114:     	ldp	q0, q1, [x20]
10254a118:     	ldp	q2, q3, [x20, #0x20]
10254a11c:     	stp	q2, q3, [x0, #0x20]
10254a120:     	stp	q0, q1, [x0]
10254a124:     	ldp	q0, q1, [x20, #0x40]
10254a128:     	ldp	q2, q3, [x20, #0x60]
10254a12c:     	stp	q2, q3, [x0, #0x60]
10254a130:     	stp	q0, q1, [x0, #0x40]
10254a134:     	str	x0, [x19]
10254a138:     	ldp	x29, x30, [sp, #0x10]
10254a13c:     	ldp	x20, x19, [sp], #0x20
10254a140:     	ret
10254a144:     	sub	sp, sp, #0x1a0
10254a148:     	stp	x28, x27, [sp, #0x160]
10254a14c:     	stp	x22, x21, [sp, #0x170]
10254a150:     	stp	x20, x19, [sp, #0x180]
10254a154:     	stp	x29, x30, [sp, #0x190]
10254a158:     	add	x29, sp, #0x190
10254a15c:     	ldr	x22, [x0]
10254a160:     	ldp	x8, x9, [x22]
10254a164:     	ldrsw	x8, [x8]
10254a168:     	add	x8, x8, w1, sxtw #1
10254a16c:     	ldr	w9, [x9]
10254a170:     	cmp	w8, w9
10254a174:     	b.ge	0x10254a3bc
10254a178:     	ldr	x9, [x22, #0x10]
10254a17c:     	ldp	x9, x10, [x9]
10254a180:     	sub	x10, x10, x9
10254a184:     	cmp	x8, x10, asr #4
10254a188:     	b.hs	0x10254a3d4
10254a18c:     	ldr	q0, [x9, x8, lsl #4]
10254a190:     	stur	q0, [x29, #-0x40]
10254a194:     	ldr	x8, [x22, #0x18]
10254a198:     	ldr	x1, [x8]
10254a19c:     	add	x0, sp, #0x18
10254a1a0:     	bl	0x103690d30
10254a1a4:     	add	x0, sp, #0x18
10254a1a8:     	sub	x2, x29, #0x40
10254a1ac:     	mov	w1, #0x0                ; =0
10254a1b0:     	bl	0x103690f18
10254a1b4:     	ldp	w1, w2, [x29, #-0x40]
10254a1b8:     	add	x0, sp, #0x18
10254a1bc:     	bl	0x103690fe4
10254a1c0:     	add	x0, sp, #0x18
10254a1c4:     	bl	0x103691054
10254a1c8:     	mov	x19, x0
10254a1cc:     	cbz	x0, 0x10254a25c
10254a1d0:     	add	x0, sp, #0x18
10254a1d4:     	bl	0x10369105c
10254a1d8:     	mov	x21, x0
10254a1dc:     	add	x0, sp, #0x18
10254a1e0:     	bl	0x1036910a8
10254a1e4:     	mov	x20, x0
10254a1e8:     	add	x0, sp, #0x18
10254a1ec:     	bl	0x1036910b8
10254a1f0:     	ldr	x8, [x22, #0x20]
10254a1f4:     	ldr	w8, [x8]
10254a1f8:     	cmp	w8, #0x1
10254a1fc:     	b.ne	0x10254a3b4
10254a200:     	mov	x6, x0
10254a204:     	ldr	x8, [x22, #0x28]
10254a208:     	ldr	w8, [x8]
10254a20c:     	tbnz	w8, #0x5, 0x10254a298
10254a210:     	tbnz	w8, #0x4, 0x10254a2d4
10254a214:     	cmp	w8, #0x1
10254a218:     	b.ne	0x10254a3b4
10254a21c:     	ldp	x8, x9, [x22, #0x30]
10254a220:     	ldr	w6, [x8]
10254a224:     	ldr	x1, [x9]
10254a228:     	ldr	x8, [x22, #0x40]
10254a22c:     	ldr	x2, [x8]
10254a230:     	ldr	x8, [x22, #0x50]
10254a234:     	ldr	w7, [x8]
10254a238:     	cbz	w6, 0x10254a38c
10254a23c:     	ldr	x8, [x22, #0x78]
10254a240:     	ldr	w8, [x8]
10254a244:     	str	w8, [sp]
10254a248:     	sub	x3, x29, #0x40
10254a24c:     	mov	x0, x19
10254a250:     	mov	x4, x20
10254a254:     	bl	0x1025493e8
10254a258:     	b	0x10254a3b4
10254a25c:     	ldp	x9, x8, [x22, #0x30]
10254a260:     	ldr	x0, [x8]
10254a264:     	ldp	x8, x10, [x22, #0x40]
10254a268:     	ldr	x1, [x8]
10254a26c:     	ldr	w3, [x10]
10254a270:     	ldr	w4, [x9]
10254a274:     	ldr	x8, [x22, #0x50]
10254a278:     	ldr	w5, [x8]
10254a27c:     	ldr	x8, [x22, #0x70]
10254a280:     	ldr	w6, [x8]
10254a284:     	ldr	x8, [x22, #0x20]
10254a288:     	ldr	w7, [x8]
10254a28c:     	sub	x2, x29, #0x40
10254a290:     	bl	0x102549704
10254a294:     	b	0x10254a3b4
10254a298:     	ldp	x8, x10, [x22, #0x30]
10254a29c:     	ldr	w9, [x8]
10254a2a0:     	ldr	x2, [x10]
10254a2a4:     	ldr	x8, [x22, #0x40]
10254a2a8:     	ldr	x3, [x8]
10254a2ac:     	ldr	x8, [x22, #0x50]
10254a2b0:     	ldr	w8, [x8]
10254a2b4:     	cbz	w9, 0x10254a310
10254a2b8:     	stp	w9, w8, [sp]
10254a2bc:     	sub	x4, x29, #0x40
10254a2c0:     	mov	x0, x19
10254a2c4:     	mov	x1, x21
10254a2c8:     	mov	x5, x20
10254a2cc:     	bl	0x1025487ac
10254a2d0:     	b	0x10254a3b4
10254a2d4:     	ldp	x8, x10, [x22, #0x30]
10254a2d8:     	ldr	w9, [x8]
10254a2dc:     	ldr	x2, [x10]
10254a2e0:     	ldr	x8, [x22, #0x40]
10254a2e4:     	ldr	x3, [x8]
10254a2e8:     	ldr	x8, [x22, #0x50]
10254a2ec:     	ldr	w8, [x8]
10254a2f0:     	cbz	w9, 0x10254a354
10254a2f4:     	stp	w9, w8, [sp]
10254a2f8:     	sub	x4, x29, #0x40
10254a2fc:     	mov	x0, x19
10254a300:     	mov	x1, x21
10254a304:     	mov	x5, x20
10254a308:     	bl	0x102548e98
10254a30c:     	b	0x10254a3b4
10254a310:     	ldr	x9, [x22, #0x48]
10254a314:     	ldr	w7, [x9]
10254a318:     	ldp	x9, x10, [x22, #0x58]
10254a31c:     	ldr	w9, [x9]
10254a320:     	ldr	w10, [x10]
10254a324:     	ldp	x11, x12, [x22, #0x68]
10254a328:     	ldr	w11, [x11]
10254a32c:     	ldr	w12, [x12]
10254a330:     	stp	w11, w12, [sp, #0xc]
10254a334:     	sub	x4, x29, #0x40
10254a338:     	stp	w9, w10, [sp, #0x4]
10254a33c:     	str	w8, [sp]
10254a340:     	mov	x0, x19
10254a344:     	mov	x1, x21
10254a348:     	mov	x5, x20
10254a34c:     	bl	0x1025484dc
10254a350:     	b	0x10254a3b4
10254a354:     	ldr	x9, [x22, #0x48]
10254a358:     	ldr	w7, [x9]
10254a35c:     	ldr	x9, [x22, #0x58]
10254a360:     	ldr	w9, [x9]
10254a364:     	ldr	x10, [x22, #0x70]
10254a368:     	ldr	w10, [x10]
10254a36c:     	stp	w9, w10, [sp, #0x4]
10254a370:     	sub	x4, x29, #0x40
10254a374:     	str	w8, [sp]
10254a378:     	mov	x0, x19
10254a37c:     	mov	x1, x21
10254a380:     	mov	x5, x20
10254a384:     	bl	0x102548c90
10254a388:     	b	0x10254a3b4
10254a38c:     	ldr	x8, [x22, #0x48]
10254a390:     	ldr	w5, [x8]
10254a394:     	ldr	x8, [x22, #0x70]
10254a398:     	ldr	w8, [x8]
10254a39c:     	sub	x3, x29, #0x40
10254a3a0:     	mov	x0, x19
10254a3a4:     	mov	x4, x20
10254a3a8:     	mov	x6, x7
10254a3ac:     	mov	x7, x8
10254a3b0:     	bl	0x1025492d4
10254a3b4:     	add	x0, sp, #0x18
10254a3b8:     	bl	0x103690e78
10254a3bc:     	ldp	x29, x30, [sp, #0x190]
10254a3c0:     	ldp	x20, x19, [sp, #0x180]
10254a3c4:     	ldp	x22, x21, [sp, #0x170]
10254a3c8:     	ldp	x28, x27, [sp, #0x160]
10254a3cc:     	add	sp, sp, #0x1a0
10254a3d0:     	ret
10254a3d4:     	bl	0x10008869c
10254a3d8:     	b	0x10254a3e8
10254a3dc:     	b	0x10254a3e8
10254a3e0:     	b	0x10254a3e8
10254a3e4:     	b	0x10254a3e8
10254a3e8:     	mov	x19, x0
10254a3ec:     	add	x0, sp, #0x18
10254a3f0:     	bl	0x103690e78
10254a3f4:     	mov	x0, x19
10254a3f8:     	bl	0x103bda970

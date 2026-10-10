
FUNCTION 0x1028ebfe4 size 1276
1028ebfe4:     	sub	sp, sp, #0x100
1028ebfe8:     	stp	x28, x27, [sp, #0xa0]
1028ebfec:     	stp	x26, x25, [sp, #0xb0]
1028ebff0:     	stp	x24, x23, [sp, #0xc0]
1028ebff4:     	stp	x22, x21, [sp, #0xd0]
1028ebff8:     	stp	x20, x19, [sp, #0xe0]
1028ebffc:     	stp	x29, x30, [sp, #0xf0]
1028ec000:     	add	x29, sp, #0xf0
1028ec004:     	mov	x21, x7
1028ec008:     	mov	x20, x6
1028ec00c:     	mov	x22, x5
1028ec010:     	mov	x23, x4
1028ec014:     	mov	x26, x3
1028ec018:     	mov	x24, x2
1028ec01c:     	mov	x25, x1
1028ec020:     	mov	x19, x0
1028ec024:     	ldr	w8, [x1, #0x104]
1028ec028:     	str	w8, [x0, #0x118]
1028ec02c:     	sub	x27, x29, #0x68
1028ec030:     	sub	x8, x29, #0x68
1028ec034:     	bl	0x1026f1c00
1028ec038:     	ldur	x0, [x29, #-0x68]
1028ec03c:     	cbz	x0, 0x1028ec098
1028ec040:     	ldr	w8, [x25, #0xd8]
1028ec044:     	mov	w9, #0x3001             ; =12289
1028ec048:     	mov	w10, #0x2001            ; =8193
1028ec04c:     	cmp	w8, #0x0
1028ec050:     	csel	w8, w10, w9, eq
1028ec054:     	orr	w8, w8, w26
1028ec058:     	orr	w9, w8, #0x100
1028ec05c:     	cmp	w23, #0x0
1028ec060:     	csel	w28, w8, w9, eq
1028ec064:     	ldr	x26, [x19, #0x18]
1028ec068:     	cbz	x26, 0x1028ec0a0
1028ec06c:     	ldr	x8, [x26]
1028ec070:     	ldr	x8, [x8, #0xb8]
1028ec074:     	mov	x0, x26
1028ec078:     	blr	x8
1028ec07c:     	mov	x27, x0
1028ec080:     	ldur	x0, [x29, #-0x68]
1028ec084:     	ldr	x1, [x19, #0x18]
1028ec088:     	bl	0x102779e1c
1028ec08c:     	str	xzr, [x19, #0x18]
1028ec090:     	ldur	x0, [x29, #-0x68]
1028ec094:     	b	0x1028ec0a4
1028ec098:     	mov	x19, #0x0               ; =0
1028ec09c:     	b	0x1028ec42c
1028ec0a0:     	mov	w27, #0x0               ; =0
1028ec0a4:     	mov	x1, x28
1028ec0a8:     	bl	0x102779bc8
1028ec0ac:     	str	x0, [x19, #0x18]
1028ec0b0:     	cbz	x0, 0x1028ec424
1028ec0b4:     	ldp	x9, x8, [x25, #0x20]
1028ec0b8:     	stp	x9, x8, [sp, #0x78]
1028ec0bc:     	cbz	x8, 0x1028ec0cc
1028ec0c0:     	add	x8, x8, #0x8
1028ec0c4:     	mov	w9, #0x1                ; =1
1028ec0c8:     	ldadd	w9, w8, [x8]
1028ec0cc:     	add	x28, sp, #0x78
1028ec0d0:     	ldr	x8, [x0]
1028ec0d4:     	ldr	x8, [x8, #0xa0]
1028ec0d8:     	add	x1, sp, #0x78
1028ec0dc:     	blr	x8
1028ec0e0:     	add	x0, x28, #0x8
1028ec0e4:     	bl	0x10001022c
1028ec0e8:     	ldr	x0, [x19, #0x18]
1028ec0ec:     	ldr	d0, [x25, #0x10]
1028ec0f0:     	ldr	x8, [x0]
1028ec0f4:     	ldr	x8, [x8, #0x90]
1028ec0f8:     	blr	x8
1028ec0fc:     	ldr	x0, [x19, #0x18]
1028ec100:     	ldr	d0, [x25, #0x18]
1028ec104:     	ldr	x8, [x0]
1028ec108:     	ldr	x8, [x8, #0x80]
1028ec10c:     	blr	x8
1028ec110:     	ldr	x0, [x19, #0x18]
1028ec114:     	ldr	x8, [x0]
1028ec118:     	ldr	x8, [x8, #0x50]
1028ec11c:     	add	x1, x25, #0xa8
1028ec120:     	blr	x8
1028ec124:     	ldr	x0, [x19, #0x18]
1028ec128:     	ldr	x8, [x0]
1028ec12c:     	ldr	x8, [x8, #0x60]
1028ec130:     	add	x1, x25, #0xb4
1028ec134:     	blr	x8
1028ec138:     	cbz	x26, 0x1028ec148
1028ec13c:     	ldr	x0, [x19, #0x18]
1028ec140:     	mov	x1, x27
1028ec144:     	bl	0x102789904
1028ec148:     	ldr	w8, [x25, #0xdc]
1028ec14c:     	cbz	w8, 0x1028ec458
1028ec150:     	ldp	q0, q1, [x25, #0x50]
1028ec154:     	stur	q1, [x19, #0x78]
1028ec158:     	stur	q0, [x19, #0x68]
1028ec15c:     	ldp	q0, q1, [x25, #0x70]
1028ec160:     	ldr	q2, [x25, #0x90]
1028ec164:     	ldr	x8, [x25, #0xa0]
1028ec168:     	str	x8, [x19, #0xb8]
1028ec16c:     	stur	q2, [x19, #0xa8]
1028ec170:     	stur	q1, [x19, #0x98]
1028ec174:     	stur	q0, [x19, #0x88]
1028ec178:     	ldp	q1, q0, [x25, #0x50]
1028ec17c:     	stp	q1, q0, [x19, #0xc0]
1028ec180:     	ldp	q0, q1, [x25, #0x70]
1028ec184:     	ldr	q2, [x25, #0x90]
1028ec188:     	ldr	x8, [x25, #0xa0]
1028ec18c:     	str	x8, [x19, #0x110]
1028ec190:     	stp	q1, q2, [x19, #0xf0]
1028ec194:     	str	q0, [x19, #0xe0]
1028ec198:     	str	wzr, [x19, #0x13c]
1028ec19c:     	ldr	w8, [x25, #0xc0]
1028ec1a0:     	str	w8, [x19, #0x11c]
1028ec1a4:     	ldr	d0, [x25, #0xc8]
1028ec1a8:     	str	d0, [x19, #0x120]
1028ec1ac:     	str	xzr, [x19, #0x128]
1028ec1b0:     	ldr	d0, [x25, #0xd0]
1028ec1b4:     	adrp	x8, 0x104484000
1028ec1b8:     	ldr	d1, [x8, #0x450]
1028ec1bc:     	fdiv	d0, d1, d0
1028ec1c0:     	str	d0, [x19, #0x130]
1028ec1c4:     	ldr	w8, [x25, #0xd8]
1028ec1c8:     	str	w8, [x19, #0x138]
1028ec1cc:     	ldr	x8, [x25, #0x48]
1028ec1d0:     	str	x8, [x19, #0x140]
1028ec1d4:     	ldp	x9, x8, [x24]
1028ec1d8:     	sub	x8, x8, x9
1028ec1dc:     	asr	x8, x8, #3
1028ec1e0:     	mov	x9, #0x8ba3             ; =35747
1028ec1e4:     	movk	x9, #0xba2e, lsl #16
1028ec1e8:     	movk	x9, #0xa2e8, lsl #32
1028ec1ec:     	movk	x9, #0x2e8b, lsl #48
1028ec1f0:     	mul	x8, x8, x9
1028ec1f4:     	cmp	w8, #0x1
1028ec1f8:     	b.lt	0x1028ec30c
1028ec1fc:     	mov	x26, #0x0               ; =0
1028ec200:     	and	x27, x8, #0x7fffffff
1028ec204:     	str	xzr, [sp, #0x70]
1028ec208:     	movi.2d	v0, #0000000000000000
1028ec20c:     	stp	q0, q0, [sp, #0x50]
1028ec210:     	stp	q0, q0, [sp, #0x30]
1028ec214:     	str	q0, [sp, #0x20]
1028ec218:     	ldr	x8, [x24]
1028ec21c:     	add	x8, x8, x26
1028ec220:     	ldp	q1, q0, [x8]
1028ec224:     	stp	q1, q0, [sp, #0x20]
1028ec228:     	ldp	q1, q0, [x8, #0x30]
1028ec22c:     	ldr	x9, [x8, #0x50]
1028ec230:     	ldr	q2, [x8, #0x20]
1028ec234:     	str	x9, [sp, #0x70]
1028ec238:     	stp	q1, q0, [sp, #0x50]
1028ec23c:     	str	q2, [sp, #0x40]
1028ec240:     	add	x1, sp, #0x20
1028ec244:     	mov	x0, x19
1028ec248:     	bl	0x1028ec4e0
1028ec24c:     	ldr	x0, [x19, #0x18]
1028ec250:     	bl	0x102781770
1028ec254:     	mov	x25, x0
1028ec258:     	cbz	x0, 0x1028ec2b0
1028ec25c:     	add	x1, sp, #0x20
1028ec260:     	mov	x0, x25
1028ec264:     	bl	0x10276b190
1028ec268:     	ldrb	w8, [sp, #0x70]
1028ec26c:     	tbz	w8, #0x4, 0x1028ec27c
1028ec270:     	ldr	w8, [x25, #0x40]
1028ec274:     	orr	w8, w8, #0x1
1028ec278:     	str	w8, [x25, #0x40]
1028ec27c:     	ldr	w8, [x19, #0x138]
1028ec280:     	cbz	w8, 0x1028ec2b0
1028ec284:     	ldr	x0, [x25, #0x30]
1028ec288:     	cbz	x0, 0x1028ec2b0
1028ec28c:     	ldrb	w8, [x0, #0x40]
1028ec290:     	tbz	w8, #0x0, 0x1028ec2b0
1028ec294:     	ldr	x8, [x0, #0x30]
1028ec298:     	cbz	x8, 0x1028ec2b0
1028ec29c:     	ldr	x8, [x19, #0x18]
1028ec2a0:     	ldrb	w8, [x8, #0x21]
1028ec2a4:     	tbz	w8, #0x4, 0x1028ec2b0
1028ec2a8:     	mov	w1, #0x1                ; =1
1028ec2ac:     	bl	0x102780880
1028ec2b0:     	ldur	q0, [x19, #0x88]
1028ec2b4:     	ldur	q1, [x19, #0x98]
1028ec2b8:     	stp	q0, q1, [x19, #0xe0]
1028ec2bc:     	ldur	q0, [x19, #0xa8]
1028ec2c0:     	str	q0, [x19, #0x100]
1028ec2c4:     	ldur	q0, [x19, #0x68]
1028ec2c8:     	ldur	q1, [x19, #0x78]
1028ec2cc:     	stp	q0, q1, [x19, #0xc0]
1028ec2d0:     	ldp	q0, q1, [sp, #0x40]
1028ec2d4:     	stur	q0, [x19, #0x88]
1028ec2d8:     	stur	q1, [x19, #0x98]
1028ec2dc:     	ldr	q0, [sp, #0x60]
1028ec2e0:     	stur	q0, [x19, #0xa8]
1028ec2e4:     	ldp	q0, q1, [sp, #0x20]
1028ec2e8:     	stur	q0, [x19, #0x68]
1028ec2ec:     	ldur	x8, [x19, #0xb8]
1028ec2f0:     	str	x8, [x19, #0x110]
1028ec2f4:     	ldr	x8, [sp, #0x70]
1028ec2f8:     	stur	x8, [x19, #0xb8]
1028ec2fc:     	add	x26, x26, #0x58
1028ec300:     	stur	q1, [x19, #0x78]
1028ec304:     	subs	x27, x27, #0x1
1028ec308:     	b.ne	0x1028ec204
1028ec30c:     	sub	x27, x29, #0x68
1028ec310:     	cbz	w23, 0x1028ec35c
1028ec314:     	ldr	w8, [x19, #0x138]
1028ec318:     	cbz	w8, 0x1028ec35c
1028ec31c:     	ldr	x8, [x19, #0x18]
1028ec320:     	ldrb	w9, [x8, #0x21]
1028ec324:     	tbz	w9, #0x4, 0x1028ec35c
1028ec328:     	ldr	x0, [x8, #0x38]
1028ec32c:     	cbz	x0, 0x1028ec344
1028ec330:     	ldrb	w9, [x0, #0x40]
1028ec334:     	tbz	w9, #0x0, 0x1028ec344
1028ec338:     	mov	w1, #0x1                ; =1
1028ec33c:     	bl	0x102780880
1028ec340:     	ldr	x8, [x19, #0x18]
1028ec344:     	ldr	x0, [x8, #0x30]
1028ec348:     	cbz	x0, 0x1028ec35c
1028ec34c:     	ldrb	w8, [x0, #0x40]
1028ec350:     	tbz	w8, #0x0, 0x1028ec35c
1028ec354:     	mov	w1, #0x1                ; =1
1028ec358:     	bl	0x102780880
1028ec35c:     	stp	xzr, xzr, [sp, #0x20]
1028ec360:     	ldr	x0, [x19, #0x18]
1028ec364:     	add	x1, sp, #0x20
1028ec368:     	bl	0x10278193c
1028ec36c:     	cbz	w22, 0x1028ec41c
1028ec370:     	ldr	x8, [x19, #0x8]
1028ec374:     	cbz	x8, 0x1028ec41c
1028ec378:     	ldr	w8, [x19, #0x140]
1028ec37c:     	neg	w1, w8
1028ec380:     	ldr	w8, [x19, #0x144]
1028ec384:     	neg	w2, w8
1028ec388:     	add	x0, sp, #0x20
1028ec38c:     	bl	0x10221b4d4
1028ec390:     	ldr	x0, [x19, #0x18]
1028ec394:     	add	x1, x19, #0x28
1028ec398:     	add	x2, x19, #0x48
1028ec39c:     	bl	0x102789d20
1028ec3a0:     	ldr	x0, [x19, #0x8]
1028ec3a4:     	ldr	x1, [x19, #0x18]
1028ec3a8:     	ldp	x2, x3, [sp, #0x20]
1028ec3ac:     	ldp	x9, x8, [x21]
1028ec3b0:     	stp	x9, x8, [sp]
1028ec3b4:     	cbz	x8, 0x1028ec3c4
1028ec3b8:     	add	x8, x8, #0x8
1028ec3bc:     	mov	w9, #0x1                ; =1
1028ec3c0:     	ldadd	w9, w8, [x8]
1028ec3c4:     	mov	x21, sp
1028ec3c8:     	mov	x4, sp
1028ec3cc:     	bl	0x1024a2624
1028ec3d0:     	stp	x0, x1, [sp, #0x10]
1028ec3d4:     	add	x0, x21, #0x8
1028ec3d8:     	bl	0x10001022c
1028ec3dc:     	add	x0, sp, #0x10
1028ec3e0:     	add	x1, sp, #0x20
1028ec3e4:     	bl	0x10221b5e4
1028ec3e8:     	ldr	x0, [x19, #0x8]
1028ec3ec:     	add	x1, sp, #0x10
1028ec3f0:     	bl	0x1024a2888
1028ec3f4:     	ldr	x0, [x19, #0x8]
1028ec3f8:     	add	x1, sp, #0x10
1028ec3fc:     	mov	w2, #0x0                ; =0
1028ec400:     	bl	0x1024a292c
1028ec404:     	ldr	x0, [x19, #0x8]
1028ec408:     	add	x1, sp, #0x10
1028ec40c:     	bl	0x1024a2060
1028ec410:     	add	x1, sp, #0x10
1028ec414:     	mov	x0, x20
1028ec418:     	bl	0x10221b5e4
1028ec41c:     	ldr	x19, [x19, #0x18]
1028ec420:     	b	0x1028ec42c
1028ec424:     	mov	x19, #0x0               ; =0
1028ec428:     	sub	x27, x29, #0x68
1028ec42c:     	add	x0, x27, #0x8
1028ec430:     	bl	0x10001022c
1028ec434:     	mov	x0, x19
1028ec438:     	ldp	x29, x30, [sp, #0xf0]
1028ec43c:     	ldp	x20, x19, [sp, #0xe0]
1028ec440:     	ldp	x22, x21, [sp, #0xd0]
1028ec444:     	ldp	x24, x23, [sp, #0xc0]
1028ec448:     	ldp	x26, x25, [sp, #0xb0]
1028ec44c:     	ldp	x28, x27, [sp, #0xa0]
1028ec450:     	add	sp, sp, #0x100
1028ec454:     	ret
1028ec458:     	ldr	x0, [x19, #0x18]
1028ec45c:     	bl	0x102781770
1028ec460:     	mov	x26, x0
1028ec464:     	cbz	x0, 0x1028ec150
1028ec468:     	add	x1, x25, #0x50
1028ec46c:     	mov	x0, x26
1028ec470:     	bl	0x10276b190
1028ec474:     	ldrb	w8, [x25, #0xa0]
1028ec478:     	tbz	w8, #0x4, 0x1028ec150
1028ec47c:     	ldr	w8, [x26, #0x40]
1028ec480:     	orr	w8, w8, #0x1
1028ec484:     	str	w8, [x26, #0x40]
1028ec488:     	b	0x1028ec150
1028ec48c:     	b	0x1028ec4c8
1028ec490:     	b	0x1028ec4c8
1028ec494:     	mov	x19, x0
1028ec498:     	add	x0, x21, #0x8
1028ec49c:     	b	0x1028ec4b0
1028ec4a0:     	b	0x1028ec4c8
1028ec4a4:     	b	0x1028ec4c8
1028ec4a8:     	mov	x19, x0
1028ec4ac:     	add	x0, x28, #0x8
1028ec4b0:     	bl	0x10001022c
1028ec4b4:     	b	0x1028ec4cc
1028ec4b8:     	b	0x1028ec4c8
1028ec4bc:     	b	0x1028ec4c8
1028ec4c0:     	b	0x1028ec4c8
1028ec4c4:     	b	0x1028ec4c8
1028ec4c8:     	mov	x19, x0
1028ec4cc:     	sub	x8, x29, #0x68
1028ec4d0:     	add	x0, x8, #0x8
1028ec4d4:     	bl	0x10001022c
1028ec4d8:     	mov	x0, x19
1028ec4dc:     	bl	0x103bda970


FUNCTION 0x102cef024 size 704
102cef024:     	sub	sp, sp, #0x120
102cef028:     	stp	d9, d8, [sp, #0xb0]
102cef02c:     	stp	x28, x27, [sp, #0xc0]
102cef030:     	stp	x26, x25, [sp, #0xd0]
102cef034:     	stp	x24, x23, [sp, #0xe0]
102cef038:     	stp	x22, x21, [sp, #0xf0]
102cef03c:     	stp	x20, x19, [sp, #0x100]
102cef040:     	stp	x29, x30, [sp, #0x110]
102cef044:     	add	x29, sp, #0x110
102cef048:     	mov	x20, x1
102cef04c:     	mov	x19, x0
102cef050:     	mov	x21, x8
102cef054:     	ldr	x0, [x0, #0x20]
102cef058:     	add	x8, sp, #0x78
102cef05c:     	bl	0x102925638
102cef060:     	ldr	x0, [x19, #0x20]
102cef064:     	add	x8, sp, #0x68
102cef068:     	bl	0x10290e8e8
102cef06c:     	stp	xzr, xzr, [sp, #0x58]
102cef070:     	add	x28, sp, #0x48
102cef074:     	add	x25, sp, #0x38
102cef078:     	add	x8, sp, #0x18
102cef07c:     	add	x22, x8, #0x8
102cef080:     	add	x27, sp, #0x8
102cef084:     	add	x8, sp, #0x28
102cef088:     	add	x19, x8, #0x8
102cef08c:     	mov	w26, #0x1               ; =1
102cef090:     	add	x0, sp, #0x78
102cef094:     	add	x1, sp, #0x58
102cef098:     	bl	0x1025a92a8
102cef09c:     	cbz	w0, 0x102cef200
102cef0a0:     	ldp	x9, x8, [sp, #0x58]
102cef0a4:     	stp	x9, x8, [sp, #0x48]
102cef0a8:     	cbz	x8, 0x102cef0b4
102cef0ac:     	add	x8, x8, #0x8
102cef0b0:     	ldadd	w26, w8, [x8]
102cef0b4:     	ldp	x9, x8, [sp, #0x68]
102cef0b8:     	stp	x9, x8, [sp, #0x38]
102cef0bc:     	cbz	x8, 0x102cef0c8
102cef0c0:     	add	x8, x8, #0x8
102cef0c4:     	ldadd	w26, w8, [x8]
102cef0c8:     	add	x0, sp, #0x48
102cef0cc:     	add	x1, sp, #0x38
102cef0d0:     	mov	w2, #0x0                ; =0
102cef0d4:     	bl	0x1026b18fc
102cef0d8:     	mov	x23, x0
102cef0dc:     	add	x0, x25, #0x8
102cef0e0:     	bl	0x10001022c
102cef0e4:     	add	x0, x28, #0x8
102cef0e8:     	bl	0x10001022c
102cef0ec:     	cbz	w23, 0x102cef090
102cef0f0:     	ldp	x9, x8, [sp, #0x58]
102cef0f4:     	stp	x9, x8, [sp, #0x18]
102cef0f8:     	cbz	x8, 0x102cef104
102cef0fc:     	add	x8, x8, #0x8
102cef100:     	ldadd	w26, w8, [x8]
102cef104:     	add	x8, sp, #0x28
102cef108:     	add	x0, sp, #0x18
102cef10c:     	bl	0x1026b10f8
102cef110:     	mov	x0, x22
102cef114:     	bl	0x10001022c
102cef118:     	ldr	x0, [sp, #0x28]
102cef11c:     	cbz	x0, 0x102cef164
102cef120:     	bl	0x1026dd54c
102cef124:     	mov	x23, x0
102cef128:     	cmp	w0, #0x1
102cef12c:     	b.lt	0x102cef164
102cef130:     	mov	w24, #0x0               ; =0
102cef134:     	ldr	x0, [sp, #0x28]
102cef138:     	add	x8, sp, #0x8
102cef13c:     	mov	x1, x24
102cef140:     	bl	0x1026dd554
102cef144:     	ldr	x0, [sp, #0x8]
102cef148:     	bl	0x1026bbe00
102cef14c:     	cbnz	w0, 0x102cef170
102cef150:     	add	x0, x27, #0x8
102cef154:     	bl	0x10001022c
102cef158:     	add	w24, w24, #0x1
102cef15c:     	cmp	w23, w24
102cef160:     	b.ne	0x102cef134
102cef164:     	mov	x0, x19
102cef168:     	bl	0x10001022c
102cef16c:     	b	0x102cef090
102cef170:     	mov	w0, #0x48               ; =72
102cef174:     	bl	0x103bdd37c
102cef178:     	mov	x22, x0
102cef17c:     	bl	0x102ce87a8
102cef180:     	adrp	x8, 0x104a71000
102cef184:     	add	x8, x8, #0x428
102cef188:     	str	x8, [x22]
102cef18c:     	mov	w8, #0x14               ; =20
102cef190:     	str	w8, [x22, #0x20]
102cef194:     	movi.2d	v0, #0000000000000000
102cef198:     	mov	x23, x22
102cef19c:     	str	q0, [x23, #0x28]!
102cef1a0:     	stur	q0, [x22, #0x38]
102cef1a4:     	mov	x0, x21
102cef1a8:     	mov	x1, x22
102cef1ac:     	bl	0x102cef344
102cef1b0:     	ldr	w8, [x20, #0x14]
102cef1b4:     	str	w8, [x22, #0x24]
102cef1b8:     	ldr	q0, [x20]
102cef1bc:     	str	q0, [x23]
102cef1c0:     	ldr	x0, [sp, #0x8]
102cef1c4:     	bl	0x1026bbe20
102cef1c8:     	adrp	x8, 0x1042e6000
102cef1cc:     	ldr	d1, [x8, #0x2c0]
102cef1d0:     	fmul	d0, d0, d1
102cef1d4:     	ldr	d8, [x20]
102cef1d8:     	bl	0x103bdd4b4
102cef1dc:     	fadd	d1, d1, d8
102cef1e0:     	ldr	d2, [x20, #0x8]
102cef1e4:     	fadd	d0, d0, d2
102cef1e8:     	stp	d1, d0, [x22, #0x38]
102cef1ec:     	add	x0, x27, #0x8
102cef1f0:     	bl	0x10001022c
102cef1f4:     	mov	x0, x19
102cef1f8:     	bl	0x10001022c
102cef1fc:     	b	0x102cef204
102cef200:     	stp	xzr, xzr, [x21]
102cef204:     	add	x8, sp, #0x58
102cef208:     	add	x0, x8, #0x8
102cef20c:     	bl	0x10001022c
102cef210:     	add	x8, sp, #0x68
102cef214:     	add	x0, x8, #0x8
102cef218:     	bl	0x10001022c
102cef21c:     	add	x0, sp, #0x78
102cef220:     	bl	0x1025a9228
102cef224:     	ldp	x29, x30, [sp, #0x110]
102cef228:     	ldp	x20, x19, [sp, #0x100]
102cef22c:     	ldp	x22, x21, [sp, #0xf0]
102cef230:     	ldp	x24, x23, [sp, #0xe0]
102cef234:     	ldp	x26, x25, [sp, #0xd0]
102cef238:     	ldp	x28, x27, [sp, #0xc0]
102cef23c:     	ldp	d9, d8, [sp, #0xb0]
102cef240:     	add	sp, sp, #0x120
102cef244:     	ret
102cef248:     	mov	x20, x0
102cef24c:     	add	x0, x21, #0x8
102cef250:     	bl	0x10001022c
102cef254:     	b	0x102cef2a4
102cef258:     	mov	x20, x0
102cef25c:     	mov	x0, x22
102cef260:     	bl	0x103bdd34c
102cef264:     	b	0x102cef2a4
102cef268:     	mov	x20, x0
102cef26c:     	b	0x102cef2d4
102cef270:     	b	0x102cef2a0
102cef274:     	b	0x102cef2b0
102cef278:     	mov	x20, x0
102cef27c:     	mov	x19, x22
102cef280:     	b	0x102cef2b4
102cef284:     	mov	x20, x0
102cef288:     	add	x0, x25, #0x8
102cef28c:     	bl	0x10001022c
102cef290:     	add	x0, x28, #0x8
102cef294:     	b	0x102cef2b8
102cef298:     	mov	x20, x0
102cef29c:     	b	0x102cef2bc
102cef2a0:     	mov	x20, x0
102cef2a4:     	add	x0, x27, #0x8
102cef2a8:     	bl	0x10001022c
102cef2ac:     	b	0x102cef2b4
102cef2b0:     	mov	x20, x0
102cef2b4:     	mov	x0, x19
102cef2b8:     	bl	0x10001022c
102cef2bc:     	add	x8, sp, #0x58
102cef2c0:     	add	x0, x8, #0x8
102cef2c4:     	bl	0x10001022c
102cef2c8:     	add	x8, sp, #0x68
102cef2cc:     	add	x0, x8, #0x8
102cef2d0:     	bl	0x10001022c
102cef2d4:     	add	x0, sp, #0x78
102cef2d8:     	bl	0x1025a9228
102cef2dc:     	mov	x0, x20
102cef2e0:     	bl	0x103bda970

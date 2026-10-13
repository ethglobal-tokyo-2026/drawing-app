
FUNCTION 0x1028e11a4 size 356
1028e11a4:     	sub	sp, sp, #0xa0
1028e11a8:     	stp	d9, d8, [sp, #0x50]
1028e11ac:     	stp	x24, x23, [sp, #0x60]
1028e11b0:     	stp	x22, x21, [sp, #0x70]
1028e11b4:     	stp	x20, x19, [sp, #0x80]
1028e11b8:     	stp	x29, x30, [sp, #0x90]
1028e11bc:     	add	x29, sp, #0x90
1028e11c0:     	mov	x19, x2
1028e11c4:     	fmov	d8, d0
1028e11c8:     	mov	x20, x1
1028e11cc:     	mov	x21, x0
1028e11d0:     	ldr	x0, [x0]
1028e11d4:     	ldp	x9, x8, [x1]
1028e11d8:     	stp	x9, x8, [sp, #0x38]
1028e11dc:     	cbz	x8, 0x1028e11ec
1028e11e0:     	add	x8, x8, #0x8
1028e11e4:     	mov	w9, #0x1                ; =1
1028e11e8:     	ldadd	w9, w8, [x8]
1028e11ec:     	add	x23, sp, #0x38
1028e11f0:     	add	x2, sp, #0x38
1028e11f4:     	sub	x3, x29, #0x44
1028e11f8:     	mov	w1, #0x488              ; =1160
1028e11fc:     	bl	0x100c9e168
1028e1200:     	mov	x22, x0
1028e1204:     	add	x0, x23, #0x8
1028e1208:     	bl	0x10001022c
1028e120c:     	ldur	w8, [x29, #-0x44]
1028e1210:     	cmp	w22, #0x0
1028e1214:     	ccmp	w8, #0x2, #0x0, ne
1028e1218:     	b.eq	0x1028e1224
1028e121c:     	mov	w0, #0x0                ; =0
1028e1220:     	b	0x1028e12c8
1028e1224:     	ldr	x0, [x21]
1028e1228:     	ldp	x9, x8, [x20]
1028e122c:     	stp	x9, x8, [sp, #0x20]
1028e1230:     	cbz	x8, 0x1028e1240
1028e1234:     	add	x8, x8, #0x8
1028e1238:     	mov	w9, #0x1                ; =1
1028e123c:     	ldadd	w9, w8, [x8]
1028e1240:     	add	x23, sp, #0x20
1028e1244:     	add	x2, sp, #0x20
1028e1248:     	add	x3, sp, #0x34
1028e124c:     	mov	w1, #0x49c              ; =1180
1028e1250:     	bl	0x100f0f7cc
1028e1254:     	mov	x22, x0
1028e1258:     	add	x0, x23, #0x8
1028e125c:     	bl	0x10001022c
1028e1260:     	mov	w0, #0x0                ; =0
1028e1264:     	cbz	w22, 0x1028e12c8
1028e1268:     	ldr	w8, [sp, #0x34]
1028e126c:     	cbz	w8, 0x1028e12c8
1028e1270:     	ldr	x0, [x21]
1028e1274:     	ldp	x9, x8, [x20]
1028e1278:     	stp	x9, x8, [sp]
1028e127c:     	cbz	x8, 0x1028e128c
1028e1280:     	add	x8, x8, #0x8
1028e1284:     	mov	w9, #0x1                ; =1
1028e1288:     	ldadd	w9, w8, [x8]
1028e128c:     	mov	x21, sp
1028e1290:     	mov	x2, sp
1028e1294:     	add	x3, sp, #0x10
1028e1298:     	mov	w1, #0x49d              ; =1181
1028e129c:     	bl	0x1002a6fd0
1028e12a0:     	mov	x20, x0
1028e12a4:     	add	x0, x21, #0x8
1028e12a8:     	bl	0x10001022c
1028e12ac:     	cbz	w20, 0x1028e121c
1028e12b0:     	ldp	x0, x1, [sp, #0x10]
1028e12b4:     	mov	w2, #0x0                ; =0
1028e12b8:     	fmov	d0, d8
1028e12bc:     	bl	0x1022180a0
1028e12c0:     	str	d0, [x19]
1028e12c4:     	mov	w0, #0x1                ; =1
1028e12c8:     	ldp	x29, x30, [sp, #0x90]
1028e12cc:     	ldp	x20, x19, [sp, #0x80]
1028e12d0:     	ldp	x22, x21, [sp, #0x70]
1028e12d4:     	ldp	x24, x23, [sp, #0x60]
1028e12d8:     	ldp	d9, d8, [sp, #0x50]
1028e12dc:     	add	sp, sp, #0xa0
1028e12e0:     	ret
1028e12e4:     	mov	x19, x0
1028e12e8:     	add	x0, x21, #0x8
1028e12ec:     	b	0x1028e12fc
1028e12f0:     	b	0x1028e12f4
1028e12f4:     	mov	x19, x0
1028e12f8:     	add	x0, x23, #0x8
1028e12fc:     	bl	0x10001022c
1028e1300:     	mov	x0, x19
1028e1304:     	bl	0x103bda970

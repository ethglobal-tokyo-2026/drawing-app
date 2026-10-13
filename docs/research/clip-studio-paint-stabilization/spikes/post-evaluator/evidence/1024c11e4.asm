
FUNCTION 0x1024c11e4 size 436
1024c11e4:     	sub	sp, sp, #0x90
1024c11e8:     	stp	x22, x21, [sp, #0x60]
1024c11ec:     	stp	x20, x19, [sp, #0x70]
1024c11f0:     	stp	x29, x30, [sp, #0x80]
1024c11f4:     	add	x29, sp, #0x80
1024c11f8:     	mov	x20, x0
1024c11fc:     	mov	x19, x8
1024c1200:     	stp	xzr, xzr, [sp, #0x40]
1024c1204:     	ldr	x0, [x0]
1024c1208:     	cbz	x0, 0x1024c1290
1024c120c:     	sub	x21, x29, #0x30
1024c1210:     	sub	x8, x29, #0x30
1024c1214:     	bl	0x1036718ec
1024c1218:     	ldur	x22, [x29, #-0x30]
1024c121c:     	add	x0, x21, #0x8
1024c1220:     	bl	0x10001022c
1024c1224:     	cbz	x22, 0x1024c1290
1024c1228:     	ldr	x0, [x20]
1024c122c:     	sub	x8, x29, #0x30
1024c1230:     	bl	0x1036718ec
1024c1234:     	ldur	x0, [x29, #-0x30]
1024c1238:     	add	x8, sp, #0x30
1024c123c:     	bl	0x103674950
1024c1240:     	add	x0, x21, #0x8
1024c1244:     	bl	0x10001022c
1024c1248:     	ldr	x0, [sp, #0x30]
1024c124c:     	adrp	x1, 0x104d8f000
1024c1250:     	add	x1, x1, #0x150
1024c1254:     	add	x22, sp, #0x20
1024c1258:     	add	x8, sp, #0x20
1024c125c:     	bl	0x103676c54
1024c1260:     	ldr	q0, [sp, #0x20]
1024c1264:     	stp	xzr, xzr, [sp, #0x20]
1024c1268:     	ldr	q1, [sp, #0x40]
1024c126c:     	str	q0, [sp, #0x40]
1024c1270:     	stur	q1, [x29, #-0x30]
1024c1274:     	orr	x0, x21, #0x8
1024c1278:     	bl	0x10001022c
1024c127c:     	orr	x0, x22, #0x8
1024c1280:     	bl	0x10001022c
1024c1284:     	add	x8, sp, #0x30
1024c1288:     	add	x0, x8, #0x8
1024c128c:     	bl	0x10001022c
1024c1290:     	mov	w0, #0x740              ; =1856
1024c1294:     	bl	0x103bdd37c
1024c1298:     	mov	x21, x0
1024c129c:     	ldp	x9, x8, [sp, #0x40]
1024c12a0:     	stp	x9, x8, [sp, #0x10]
1024c12a4:     	cbz	x8, 0x1024c12b4
1024c12a8:     	add	x8, x8, #0x8
1024c12ac:     	mov	w9, #0x1                ; =1
1024c12b0:     	ldadd	w9, w8, [x8]
1024c12b4:     	ldp	x9, x8, [x20]
1024c12b8:     	stp	x9, x8, [sp]
1024c12bc:     	cbz	x8, 0x1024c12cc
1024c12c0:     	add	x8, x8, #0x8
1024c12c4:     	mov	w9, #0x1                ; =1
1024c12c8:     	ldadd	w9, w8, [x8]
1024c12cc:     	add	x20, sp, #0x10
1024c12d0:     	mov	x22, sp
1024c12d4:     	add	x1, sp, #0x10
1024c12d8:     	mov	x2, sp
1024c12dc:     	mov	x0, x21
1024c12e0:     	mov	w3, #0x0                ; =0
1024c12e4:     	bl	0x1024c0dc0
1024c12e8:     	add	x0, x22, #0x8
1024c12ec:     	bl	0x10001022c
1024c12f0:     	add	x0, x20, #0x8
1024c12f4:     	bl	0x10001022c
1024c12f8:     	mov	x0, x19
1024c12fc:     	mov	x1, x21
1024c1300:     	bl	0x1024cadb4
1024c1304:     	add	x20, sp, #0x40
1024c1308:     	ldr	x8, [x19], #0x8
1024c130c:     	str	x8, [x21, #0x58]
1024c1310:     	add	x0, x21, #0x60
1024c1314:     	mov	x1, x19
1024c1318:     	bl	0x10005a220
1024c131c:     	orr	x0, x20, #0x8
1024c1320:     	bl	0x10001022c
1024c1324:     	ldp	x29, x30, [sp, #0x80]
1024c1328:     	ldp	x20, x19, [sp, #0x70]
1024c132c:     	ldp	x22, x21, [sp, #0x60]
1024c1330:     	add	sp, sp, #0x90
1024c1334:     	ret
1024c1338:     	mov	x19, x0
1024c133c:     	add	x8, sp, #0x30
1024c1340:     	b	0x1024c134c
1024c1344:     	mov	x19, x0
1024c1348:     	sub	x8, x29, #0x30
1024c134c:     	add	x0, x8, #0x8
1024c1350:     	bl	0x10001022c
1024c1354:     	b	0x1024c1384
1024c1358:     	b	0x1024c1380
1024c135c:     	b	0x1024c1380
1024c1360:     	mov	x19, x0
1024c1364:     	add	x0, x22, #0x8
1024c1368:     	bl	0x10001022c
1024c136c:     	add	x0, x20, #0x8
1024c1370:     	bl	0x10001022c
1024c1374:     	mov	x0, x21
1024c1378:     	bl	0x103bdd34c
1024c137c:     	b	0x1024c1384
1024c1380:     	mov	x19, x0
1024c1384:     	add	x8, sp, #0x40
1024c1388:     	orr	x0, x8, #0x8
1024c138c:     	bl	0x10001022c
1024c1390:     	mov	x0, x19
1024c1394:     	bl	0x103bda970

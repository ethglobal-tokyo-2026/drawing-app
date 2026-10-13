
FUNCTION 0x1002a7ee0 size 868
1002a7ee0:     	sub	sp, sp, #0xf0
1002a7ee4:     	stp	x24, x23, [sp, #0xb0]
1002a7ee8:     	stp	x22, x21, [sp, #0xc0]
1002a7eec:     	stp	x20, x19, [sp, #0xd0]
1002a7ef0:     	stp	x29, x30, [sp, #0xe0]
1002a7ef4:     	add	x29, sp, #0xe0
1002a7ef8:     	cbz	w1, 0x1002a8124
1002a7efc:     	mov	x20, x2
1002a7f00:     	mov	x21, x1
1002a7f04:     	mov	x19, x0
1002a7f08:     	mov	x0, x2
1002a7f0c:     	bl	0x10311cc3c
1002a7f10:     	cbz	w0, 0x1002a8124
1002a7f14:     	sub	x8, x29, #0x40
1002a7f18:     	mov	x0, x21
1002a7f1c:     	mov	x1, x20
1002a7f20:     	bl	0x1032f6944
1002a7f24:     	ldur	x20, [x29, #-0x40]
1002a7f28:     	cbz	x20, 0x1002a8110
1002a7f2c:     	adrp	x1, 0x1045e3000
1002a7f30:     	add	x1, x1, #0x213 STRING 'brushsizepreset'
1002a7f34:     	add	x0, sp, #0x70
1002a7f38:     	bl	0x10311cb20
1002a7f3c:     	add	x1, sp, #0x70
1002a7f40:     	mov	x0, x20
1002a7f44:     	bl	0x1032f853c
1002a7f48:     	mov	x20, x0
1002a7f4c:     	add	x0, sp, #0x70
1002a7f50:     	bl	0x10311cb54
1002a7f54:     	cbz	w20, 0x1002a8110
1002a7f58:     	add	x0, sp, #0x60
1002a7f5c:     	bl	0x10366c4b8
1002a7f60:     	ldur	x20, [x29, #-0x40]
1002a7f64:     	adrp	x1, 0x1045e3000
1002a7f68:     	add	x1, x1, #0x213 STRING 'brushsizepreset'
1002a7f6c:     	add	x0, sp, #0x70
1002a7f70:     	bl	0x10311cb20
1002a7f74:     	add	x1, sp, #0x60
1002a7f78:     	add	x2, sp, #0x70
1002a7f7c:     	mov	x0, x20
1002a7f80:     	mov	w3, #0x0                ; =0
1002a7f84:     	bl	0x1032f8634
1002a7f88:     	add	x0, sp, #0x70
1002a7f8c:     	bl	0x10311cb54
1002a7f90:     	ldr	x20, [x19, #0x60]
1002a7f94:     	cbz	x20, 0x1002a8108
1002a7f98:     	mov	x21, x20
1002a7f9c:     	ldr	x1, [x21, #0x8]!
1002a7fa0:     	mov	x0, x20
1002a7fa4:     	bl	0x10002d4c0
1002a7fa8:     	str	x21, [x20]
1002a7fac:     	str	xzr, [x20, #0x10]
1002a7fb0:     	str	xzr, [x21]
1002a7fb4:     	add	x0, sp, #0x50
1002a7fb8:     	bl	0x10366cff4
1002a7fbc:     	add	x0, sp, #0x60
1002a7fc0:     	add	x1, sp, #0x50
1002a7fc4:     	bl	0x10366cbbc
1002a7fc8:     	cbz	w0, 0x1002a80fc
1002a7fcc:     	add	x22, sp, #0x4c
1002a7fd0:     	adrp	x20, 0x1045e3000
1002a7fd4:     	add	x20, x20, #0x223 STRING 'brushsizebrushsize'
1002a7fd8:     	add	x23, sp, #0x24
1002a7fdc:     	adrp	x21, 0x1045e3000
1002a7fe0:     	add	x21, x21, #0x236 STRING 'brushsizeviewindex'
1002a7fe4:     	str	wzr, [sp, #0x4c]
1002a7fe8:     	str	x22, [sp, #0x70]
1002a7fec:     	add	x0, sp, #0x38
1002a7ff0:     	add	x1, sp, #0x70
1002a7ff4:     	bl	0x10366ec8c
1002a7ff8:     	add	x0, sp, #0x70
1002a7ffc:     	mov	x1, x20
1002a8000:     	bl	0x10311cb20
1002a8004:     	add	x0, sp, #0x28
1002a8008:     	add	x1, sp, #0x38
1002a800c:     	bl	0x10366f51c
1002a8010:     	add	x0, sp, #0x50
1002a8014:     	add	x1, sp, #0x70
1002a8018:     	add	x2, sp, #0x28
1002a801c:     	bl	0x10366d0c4
1002a8020:     	ldr	x0, [sp, #0x30]
1002a8024:     	cbz	x0, 0x1002a8034
1002a8028:     	ldr	x8, [x0]
1002a802c:     	ldr	x8, [x8, #0x8]
1002a8030:     	blr	x8
1002a8034:     	add	x0, sp, #0x70
1002a8038:     	bl	0x10311cb54
1002a803c:     	str	wzr, [sp, #0x24]
1002a8040:     	str	x23, [sp, #0x70]
1002a8044:     	add	x0, sp, #0x10
1002a8048:     	add	x1, sp, #0x70
1002a804c:     	bl	0x10366ec8c
1002a8050:     	add	x0, sp, #0x70
1002a8054:     	mov	x1, x21
1002a8058:     	bl	0x10311cb20
1002a805c:     	mov	x0, sp
1002a8060:     	add	x1, sp, #0x10
1002a8064:     	bl	0x10366f51c
1002a8068:     	add	x0, sp, #0x50
1002a806c:     	add	x1, sp, #0x70
1002a8070:     	mov	x2, sp
1002a8074:     	bl	0x10366d0c4
1002a8078:     	ldr	x0, [sp, #0x8]
1002a807c:     	cbz	x0, 0x1002a808c
1002a8080:     	ldr	x8, [x0]
1002a8084:     	ldr	x8, [x8, #0x8]
1002a8088:     	blr	x8
1002a808c:     	add	x0, sp, #0x70
1002a8090:     	bl	0x10311cb54
1002a8094:     	add	x0, sp, #0x50
1002a8098:     	bl	0x10366d42c
1002a809c:     	ldr	x0, [x19, #0x60]
1002a80a0:     	ldr	w8, [sp, #0x4c]
1002a80a4:     	ldr	w9, [sp, #0x24]
1002a80a8:     	orr	x8, x8, x9, lsl #32
1002a80ac:     	str	x8, [sp, #0x70]
1002a80b0:     	add	x1, sp, #0x70
1002a80b4:     	add	x2, sp, #0x70
1002a80b8:     	bl	0x10002d500
1002a80bc:     	ldr	x0, [sp, #0x18]
1002a80c0:     	cbz	x0, 0x1002a80d0
1002a80c4:     	ldr	x8, [x0]
1002a80c8:     	ldr	x8, [x8, #0x8]
1002a80cc:     	blr	x8
1002a80d0:     	ldr	x0, [sp, #0x40]
1002a80d4:     	cbz	x0, 0x1002a80e4
1002a80d8:     	ldr	x8, [x0]
1002a80dc:     	ldr	x8, [x8, #0x8]
1002a80e0:     	blr	x8
1002a80e4:     	add	x0, sp, #0x60
1002a80e8:     	add	x1, sp, #0x50
1002a80ec:     	bl	0x10366cd44
1002a80f0:     	cbnz	w0, 0x1002a7fe4
1002a80f4:     	add	x0, sp, #0x60
1002a80f8:     	bl	0x10366ce00
1002a80fc:     	str	wzr, [x19, #0x8c]
1002a8100:     	add	x0, sp, #0x50
1002a8104:     	bl	0x10366d034
1002a8108:     	add	x0, sp, #0x60
1002a810c:     	bl	0x10366c50c
1002a8110:     	mov	x0, x19
1002a8114:     	bl	0x1002a83a0
1002a8118:     	sub	x8, x29, #0x40
1002a811c:     	add	x0, x8, #0x8
1002a8120:     	bl	0x10001022c
1002a8124:     	ldp	x29, x30, [sp, #0xe0]
1002a8128:     	ldp	x20, x19, [sp, #0xd0]
1002a812c:     	ldp	x22, x21, [sp, #0xc0]
1002a8130:     	ldp	x24, x23, [sp, #0xb0]
1002a8134:     	add	sp, sp, #0xf0
1002a8138:     	ret
1002a813c:     	b	0x1002a8150
1002a8140:     	mov	x19, x0
1002a8144:     	add	x0, sp, #0x70
1002a8148:     	bl	0x10311cb54
1002a814c:     	b	0x1002a8228
1002a8150:     	mov	x19, x0
1002a8154:     	b	0x1002a8228
1002a8158:     	b	0x1002a8174
1002a815c:     	b	0x1002a821c
1002a8160:     	mov	x19, x0
1002a8164:     	add	x0, sp, #0x70
1002a8168:     	bl	0x10311cb54
1002a816c:     	b	0x1002a8230
1002a8170:     	b	0x1002a8174
1002a8174:     	mov	x19, x0
1002a8178:     	b	0x1002a8230
1002a817c:     	b	0x1002a821c
1002a8180:     	b	0x1002a81b0
1002a8184:     	mov	x19, x0
1002a8188:     	b	0x1002a81a4
1002a818c:     	mov	x19, x0
1002a8190:     	ldr	x0, [sp, #0x30]
1002a8194:     	cbz	x0, 0x1002a81a4
1002a8198:     	ldr	x8, [x0]
1002a819c:     	ldr	x8, [x8, #0x8]
1002a81a0:     	blr	x8
1002a81a4:     	add	x0, sp, #0x70
1002a81a8:     	bl	0x10311cb54
1002a81ac:     	b	0x1002a8204
1002a81b0:     	mov	x19, x0
1002a81b4:     	b	0x1002a8204
1002a81b8:     	b	0x1002a81ec
1002a81bc:     	mov	x19, x0
1002a81c0:     	b	0x1002a81dc
1002a81c4:     	mov	x19, x0
1002a81c8:     	ldr	x0, [sp, #0x8]
1002a81cc:     	cbz	x0, 0x1002a81dc
1002a81d0:     	ldr	x8, [x0]
1002a81d4:     	ldr	x8, [x8, #0x8]
1002a81d8:     	blr	x8
1002a81dc:     	add	x0, sp, #0x70
1002a81e0:     	bl	0x10311cb54
1002a81e4:     	b	0x1002a81f0
1002a81e8:     	b	0x1002a81ec
1002a81ec:     	mov	x19, x0
1002a81f0:     	ldr	x0, [sp, #0x18]
1002a81f4:     	cbz	x0, 0x1002a8204
1002a81f8:     	ldr	x8, [x0]
1002a81fc:     	ldr	x8, [x8, #0x8]
1002a8200:     	blr	x8
1002a8204:     	ldr	x0, [sp, #0x40]
1002a8208:     	cbz	x0, 0x1002a8220
1002a820c:     	ldr	x8, [x0]
1002a8210:     	ldr	x8, [x8, #0x8]
1002a8214:     	blr	x8
1002a8218:     	b	0x1002a8220
1002a821c:     	mov	x19, x0
1002a8220:     	add	x0, sp, #0x50
1002a8224:     	bl	0x10366d034
1002a8228:     	add	x0, sp, #0x60
1002a822c:     	bl	0x10366c50c
1002a8230:     	sub	x8, x29, #0x40
1002a8234:     	add	x0, x8, #0x8
1002a8238:     	bl	0x10001022c
1002a823c:     	mov	x0, x19
1002a8240:     	bl	0x103bda970

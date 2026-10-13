
FUNCTION 0x102cf9f70 size 580
102cf9f70:     	sub	sp, sp, #0xc0
102cf9f74:     	stp	d11, d10, [sp, #0x60]
102cf9f78:     	stp	d9, d8, [sp, #0x70]
102cf9f7c:     	stp	x24, x23, [sp, #0x80]
102cf9f80:     	stp	x22, x21, [sp, #0x90]
102cf9f84:     	stp	x20, x19, [sp, #0xa0]
102cf9f88:     	stp	x29, x30, [sp, #0xb0]
102cf9f8c:     	add	x29, sp, #0xb0
102cf9f90:     	mov	x19, x1
102cf9f94:     	mov	x21, x0
102cf9f98:     	mov	x20, x8
102cf9f9c:     	ldr	x0, [x0, #0x20]
102cf9fa0:     	add	x23, sp, #0x50
102cf9fa4:     	add	x8, sp, #0x50
102cf9fa8:     	bl	0x10290e8e8
102cf9fac:     	ldr	x8, [sp, #0x50]
102cf9fb0:     	cbz	x8, 0x102cfa00c
102cf9fb4:     	add	x10, sp, #0x30
102cf9fb8:     	ldr	x9, [sp, #0x58]
102cf9fbc:     	add	x22, x10, #0x8
102cf9fc0:     	stp	x8, x9, [sp, #0x30]
102cf9fc4:     	cbz	x9, 0x102cf9fd4
102cf9fc8:     	add	x8, x9, #0x8
102cf9fcc:     	mov	w9, #0x1                ; =1
102cf9fd0:     	ldadd	w9, w8, [x8]
102cf9fd4:     	add	x8, sp, #0x40
102cf9fd8:     	add	x0, sp, #0x30
102cf9fdc:     	bl	0x102776078
102cf9fe0:     	mov	x0, x22
102cf9fe4:     	bl	0x10001022c
102cf9fe8:     	ldr	x8, [sp, #0x40]
102cf9fec:     	cbz	x8, 0x102cf9ff8
102cf9ff0:     	ldr	w8, [x8, #0x70]
102cf9ff4:     	cbz	w8, 0x102cfa03c
102cf9ff8:     	stp	xzr, xzr, [x20]
102cf9ffc:     	add	x8, sp, #0x40
102cfa000:     	add	x0, x8, #0x8
102cfa004:     	bl	0x10001022c
102cfa008:     	b	0x102cfa010
102cfa00c:     	stp	xzr, xzr, [x20]
102cfa010:     	add	x8, sp, #0x50
102cfa014:     	add	x0, x8, #0x8
102cfa018:     	bl	0x10001022c
102cfa01c:     	ldp	x29, x30, [sp, #0xb0]
102cfa020:     	ldp	x20, x19, [sp, #0xa0]
102cfa024:     	ldp	x22, x21, [sp, #0x90]
102cfa028:     	ldp	x24, x23, [sp, #0x80]
102cfa02c:     	ldp	d9, d8, [sp, #0x70]
102cfa030:     	ldp	d11, d10, [sp, #0x60]
102cfa034:     	add	sp, sp, #0xc0
102cfa038:     	ret
102cfa03c:     	ldp	x9, x8, [x21, #0x10]
102cfa040:     	stp	x9, x8, [sp, #0x20]
102cfa044:     	cbz	x8, 0x102cfa054
102cfa048:     	add	x8, x8, #0x8
102cfa04c:     	mov	w9, #0x1                ; =1
102cfa050:     	ldadd	w9, w8, [x8]
102cfa054:     	add	x22, sp, #0x20
102cfa058:     	add	x0, sp, #0x20
102cfa05c:     	bl	0x102992930
102cfa060:     	fmov	d8, d0
102cfa064:     	add	x0, x22, #0x8
102cfa068:     	bl	0x10001022c
102cfa06c:     	ldr	d9, [x19, #0x20]
102cfa070:     	ldr	x0, [sp, #0x50]
102cfa074:     	bl	0x102576608
102cfa078:     	adrp	x8, 0x1042ee000
102cfa07c:     	ldr	d0, [x8, #0x828]
102cfa080:     	fmul	d0, d8, d0
102cfa084:     	fdiv	d8, d9, d0
102cfa088:     	lsr	x8, x0, #32
102cfa08c:     	scvtf	d9, w0
102cfa090:     	scvtf	d10, w8
102cfa094:     	ldp	d0, d1, [x21, #0x80]
102cfa098:     	fsub	d0, d0, d9
102cfa09c:     	stp	xzr, xzr, [sp, #0x10]
102cfa0a0:     	ldp	x9, x8, [sp, #0x40]
102cfa0a4:     	fsub	d1, d1, d10
102cfa0a8:     	stp	x9, x8, [sp]
102cfa0ac:     	cbz	x8, 0x102cfa0bc
102cfa0b0:     	add	x8, x8, #0x8
102cfa0b4:     	mov	w9, #0x1                ; =1
102cfa0b8:     	ldadd	w9, w8, [x8]
102cfa0bc:     	mov	x22, sp
102cfa0c0:     	ldr	w1, [x19, #0x14]
102cfa0c4:     	mov	x0, sp
102cfa0c8:     	add	x2, sp, #0x10
102cfa0cc:     	fmov	d2, d8
102cfa0d0:     	bl	0x102cfa1b4
102cfa0d4:     	mov	x21, x0
102cfa0d8:     	add	x0, x22, #0x8
102cfa0dc:     	bl	0x10001022c
102cfa0e0:     	mov	w0, #0x58               ; =88
102cfa0e4:     	bl	0x103bdd37c
102cfa0e8:     	mov	x22, x0
102cfa0ec:     	bl	0x102ce87a8
102cfa0f0:     	adrp	x8, 0x104a71000
102cfa0f4:     	add	x8, x8, #0x7f8
102cfa0f8:     	str	x8, [x22]
102cfa0fc:     	stp	xzr, xzr, [x22, #0x38]
102cfa100:     	mov	w8, #0x64               ; =100
102cfa104:     	str	w8, [x22, #0x20]
102cfa108:     	stp	xzr, xzr, [x22, #0x28]
102cfa10c:     	stp	xzr, xzr, [x22, #0x48]
102cfa110:     	mov	x0, x20
102cfa114:     	mov	x1, x22
102cfa118:     	bl	0x102cfa508
102cfa11c:     	add	x8, sp, #0x40
102cfa120:     	ldr	w9, [x19, #0x14]
102cfa124:     	str	w9, [x22, #0x24]
102cfa128:     	str	x21, [x22, #0x40]
102cfa12c:     	str	d8, [x22, #0x28]
102cfa130:     	ldr	x9, [sp, #0x40]
102cfa134:     	str	x9, [x22, #0x30]
102cfa138:     	add	x0, x22, #0x38
102cfa13c:     	add	x1, x8, #0x8
102cfa140:     	bl	0x10005a220
102cfa144:     	stp	d9, d10, [x22, #0x48]
102cfa148:     	cbz	x21, 0x102cf9ffc
102cfa14c:     	ldp	d0, d1, [sp, #0x10]
102cfa150:     	fadd	d0, d0, d9
102cfa154:     	fadd	d1, d1, d10
102cfa158:     	stp	d0, d1, [x19]
102cfa15c:     	b	0x102cf9ffc
102cfa160:     	mov	x19, x0
102cfa164:     	mov	x0, x22
102cfa168:     	bl	0x103bdd34c
102cfa16c:     	b	0x102cfa18c
102cfa170:     	b	0x102cfa178
102cfa174:     	b	0x102cfa188
102cfa178:     	mov	x19, x0
102cfa17c:     	add	x0, x22, #0x8
102cfa180:     	bl	0x10001022c
102cfa184:     	b	0x102cfa18c
102cfa188:     	mov	x19, x0
102cfa18c:     	add	x8, sp, #0x40
102cfa190:     	add	x22, x8, #0x8
102cfa194:     	b	0x102cfa19c
102cfa198:     	mov	x19, x0
102cfa19c:     	mov	x0, x22
102cfa1a0:     	bl	0x10001022c
102cfa1a4:     	add	x0, x23, #0x8
102cfa1a8:     	bl	0x10001022c
102cfa1ac:     	mov	x0, x19
102cfa1b0:     	bl	0x103bda970

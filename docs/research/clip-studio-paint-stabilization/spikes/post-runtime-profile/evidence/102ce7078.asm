
FUNCTION 0x102ce7078 size 380
102ce7078:     	sub	sp, sp, #0x70
102ce707c:     	stp	d9, d8, [sp, #0x20]
102ce7080:     	stp	x24, x23, [sp, #0x30]
102ce7084:     	stp	x22, x21, [sp, #0x40]
102ce7088:     	stp	x20, x19, [sp, #0x50]
102ce708c:     	stp	x29, x30, [sp, #0x60]
102ce7090:     	add	x29, sp, #0x60
102ce7094:     	mov	x19, x1
102ce7098:     	mov	x21, x0
102ce709c:     	mov	x20, x8
102ce70a0:     	ldr	x0, [x0, #0x20]
102ce70a4:     	add	x23, sp, #0x10
102ce70a8:     	add	x8, sp, #0x10
102ce70ac:     	bl	0x102910dc0
102ce70b0:     	ldp	x9, x8, [sp, #0x10]
102ce70b4:     	stp	x9, x8, [sp]
102ce70b8:     	cbz	x8, 0x102ce70c8
102ce70bc:     	add	x8, x8, #0x8
102ce70c0:     	mov	w9, #0x1                ; =1
102ce70c4:     	ldadd	w9, w8, [x8]
102ce70c8:     	mov	x24, sp
102ce70cc:     	mov	x0, sp
102ce70d0:     	bl	0x102625c3c
102ce70d4:     	mov	x22, x0
102ce70d8:     	add	x0, x24, #0x8
102ce70dc:     	bl	0x10001022c
102ce70e0:     	cbz	w22, 0x102ce7170
102ce70e4:     	mov	w0, #0x70               ; =112
102ce70e8:     	bl	0x103bdd37c
102ce70ec:     	mov	x22, x0
102ce70f0:     	bl	0x102ce87a8
102ce70f4:     	adrp	x8, 0x104a70000
102ce70f8:     	add	x8, x8, #0xdd0
102ce70fc:     	str	x8, [x22]
102ce7100:     	mov	w8, #0x32               ; =50
102ce7104:     	str	w8, [x22, #0x20]
102ce7108:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
102ce710c:     	stp	xzr, xzr, [x22, #0x30]
102ce7110:     	str	x8, [x22, #0x28]
102ce7114:     	mov	x0, x20
102ce7118:     	mov	x1, x22
102ce711c:     	bl	0x102ce782c
102ce7120:     	ldr	w8, [x19, #0x14]
102ce7124:     	str	w8, [x22, #0x24]
102ce7128:     	mov	x0, x22
102ce712c:     	mov	x1, x21
102ce7130:     	bl	0x102ce71f4
102ce7134:     	ldr	w8, [x19, #0x14]
102ce7138:     	ldp	d0, d1, [x21, #0x80]
102ce713c:     	cbz	w8, 0x102ce7178
102ce7140:     	add	x2, x22, #0x38
102ce7144:     	add	x3, x22, #0x3c
102ce7148:     	mov	x0, x22
102ce714c:     	mov	w1, #0x1                ; =1
102ce7150:     	bl	0x102ce7328
102ce7154:     	fmov	d8, d0
102ce7158:     	fmov	d9, d1
102ce715c:     	add	x1, x22, #0x40
102ce7160:     	mov	x0, x21
102ce7164:     	bl	0x102ce8d3c
102ce7168:     	stp	d8, d9, [x22, #0x40]
102ce716c:     	b	0x102ce7188
102ce7170:     	stp	xzr, xzr, [x20]
102ce7174:     	b	0x102ce718c
102ce7178:     	mov	x0, x22
102ce717c:     	bl	0x102ce7420
102ce7180:     	fmov	d8, d0
102ce7184:     	fmov	d9, d1
102ce7188:     	stp	d8, d9, [x19]
102ce718c:     	add	x0, x23, #0x8
102ce7190:     	bl	0x10001022c
102ce7194:     	ldp	x29, x30, [sp, #0x60]
102ce7198:     	ldp	x20, x19, [sp, #0x50]
102ce719c:     	ldp	x22, x21, [sp, #0x40]
102ce71a0:     	ldp	x24, x23, [sp, #0x30]
102ce71a4:     	ldp	d9, d8, [sp, #0x20]
102ce71a8:     	add	sp, sp, #0x70
102ce71ac:     	ret
102ce71b0:     	b	0x102ce71b4
102ce71b4:     	mov	x19, x0
102ce71b8:     	add	x0, x20, #0x8
102ce71bc:     	b	0x102ce71d8
102ce71c0:     	mov	x19, x0
102ce71c4:     	mov	x0, x22
102ce71c8:     	bl	0x103bdd34c
102ce71cc:     	b	0x102ce71e4
102ce71d0:     	mov	x19, x0
102ce71d4:     	add	x0, x24, #0x8
102ce71d8:     	bl	0x10001022c
102ce71dc:     	b	0x102ce71e4
102ce71e0:     	mov	x19, x0
102ce71e4:     	add	x0, x23, #0x8
102ce71e8:     	bl	0x10001022c
102ce71ec:     	mov	x0, x19
102ce71f0:     	bl	0x103bda970

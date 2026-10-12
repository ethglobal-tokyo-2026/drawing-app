
FUNCTION 0x1028ed064 size 284
1028ed064:     	sub	sp, sp, #0xc0
1028ed068:     	stp	d9, d8, [sp, #0x80]
1028ed06c:     	stp	x22, x21, [sp, #0x90]
1028ed070:     	stp	x20, x19, [sp, #0xa0]
1028ed074:     	stp	x29, x30, [sp, #0xb0]
1028ed078:     	add	x29, sp, #0xb0
1028ed07c:     	fmov	d8, d1
1028ed080:     	mov	x20, x3
1028ed084:     	mov	x21, x2
1028ed088:     	fmov	d9, d0
1028ed08c:     	mov	x19, x0
1028ed090:     	cbz	w4, 0x1028ed104
1028ed094:     	add	x0, sp, #0x8
1028ed098:     	bl	0x102785dd4
1028ed09c:     	ldr	x1, [x19, #0x18]
1028ed0a0:     	adrp	x8, 0x1042ec000
1028ed0a4:     	ldr	d0, [x8, #0xb78]
1028ed0a8:     	fmul	d0, d9, d0
1028ed0ac:     	add	x0, sp, #0x8
1028ed0b0:     	mov	x2, x21
1028ed0b4:     	mov	x3, x20
1028ed0b8:     	fmov	d1, d8
1028ed0bc:     	bl	0x102785e94
1028ed0c0:     	mov	x20, x0
1028ed0c4:     	add	x0, sp, #0x8
1028ed0c8:     	bl	0x102785e34
1028ed0cc:     	cbz	x20, 0x1028ed140
1028ed0d0:     	stp	xzr, xzr, [sp, #0x8]
1028ed0d4:     	add	x1, sp, #0x8
1028ed0d8:     	mov	x0, x20
1028ed0dc:     	bl	0x10278193c
1028ed0e0:     	adrp	x1, 0x104a53000
1028ed0e4:     	add	x1, x1, #0x618
1028ed0e8:     	adrp	x2, 0x104a53000
1028ed0ec:     	add	x2, x2, #0xb98
1028ed0f0:     	mov	x0, x20
1028ed0f4:     	mov	x3, #0x0                ; =0
1028ed0f8:     	bl	0x103bdd454
1028ed0fc:     	str	x0, [x19, #0x18]
1028ed100:     	b	0x1028ed144
1028ed104:     	mov	x22, x1
1028ed108:     	add	x0, sp, #0x8
1028ed10c:     	bl	0x102786e10
1028ed110:     	ldr	x1, [x19, #0x18]
1028ed114:     	add	x0, sp, #0x8
1028ed118:     	mov	x2, x22
1028ed11c:     	fmov	d0, d9
1028ed120:     	mov	x3, x21
1028ed124:     	mov	x4, x20
1028ed128:     	fmov	d1, d8
1028ed12c:     	bl	0x1027873f4
1028ed130:     	mov	x20, x0
1028ed134:     	add	x0, sp, #0x8
1028ed138:     	bl	0x102786e94
1028ed13c:     	cbnz	x20, 0x1028ed0d0
1028ed140:     	ldr	x0, [x19, #0x18]
1028ed144:     	ldp	x29, x30, [sp, #0xb0]
1028ed148:     	ldp	x20, x19, [sp, #0xa0]
1028ed14c:     	ldp	x22, x21, [sp, #0x90]
1028ed150:     	ldp	d9, d8, [sp, #0x80]
1028ed154:     	add	sp, sp, #0xc0
1028ed158:     	ret
1028ed15c:     	mov	x19, x0
1028ed160:     	add	x0, sp, #0x8
1028ed164:     	bl	0x102786e94
1028ed168:     	b	0x1028ed178
1028ed16c:     	mov	x19, x0
1028ed170:     	add	x0, sp, #0x8
1028ed174:     	bl	0x102785e34
1028ed178:     	mov	x0, x19
1028ed17c:     	bl	0x103bda970

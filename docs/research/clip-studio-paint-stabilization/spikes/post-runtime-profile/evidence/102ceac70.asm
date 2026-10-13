
FUNCTION 0x102ceac70 size 968
102ceac70:     	sub	sp, sp, #0x190
102ceac74:     	stp	d11, d10, [sp, #0x110]
102ceac78:     	stp	d9, d8, [sp, #0x120]
102ceac7c:     	stp	x28, x27, [sp, #0x130]
102ceac80:     	stp	x26, x25, [sp, #0x140]
102ceac84:     	stp	x24, x23, [sp, #0x150]
102ceac88:     	stp	x22, x21, [sp, #0x160]
102ceac8c:     	stp	x20, x19, [sp, #0x170]
102ceac90:     	stp	x29, x30, [sp, #0x180]
102ceac94:     	add	x29, sp, #0x180
102ceac98:     	mov	x21, x1
102ceac9c:     	mov	x22, x0
102ceaca0:     	mov	x20, x8
102ceaca4:     	ldr	x0, [x0, #0x20]
102ceaca8:     	sub	x8, x29, #0xa8
102ceacac:     	bl	0x102925638
102ceacb0:     	ldr	x0, [x22, #0x20]
102ceacb4:     	sub	x8, x29, #0xb8
102ceacb8:     	bl	0x10290e8e8
102ceacbc:     	add	x8, sp, #0x78
102ceacc0:     	stp	xzr, xzr, [sp, #0xb8]
102ceacc4:     	add	x9, x8, #0x8
102ceacc8:     	add	x27, sp, #0x68
102ceaccc:     	add	x8, sp, #0x88
102ceacd0:     	add	x8, x8, #0x8
102ceacd4:     	stp	x9, x8, [sp]
102ceacd8:     	mov	w28, #0x17              ; =23
102ceacdc:     	mov	w19, #0x1               ; =1
102ceace0:     	adrp	x23, 0x104a71000
102ceace4:     	add	x23, x23, #0xb8
102ceace8:     	sub	x0, x29, #0xa8
102ceacec:     	add	x1, sp, #0xb8
102ceacf0:     	bl	0x1025a92a8
102ceacf4:     	cbz	w0, 0x102ceaf04
102ceacf8:     	ldp	x9, x8, [sp, #0xb8]
102ceacfc:     	stp	x9, x8, [sp, #0xa8]
102cead00:     	cbz	x8, 0x102cead0c
102cead04:     	add	x8, x8, #0x8
102cead08:     	ldadd	w19, w8, [x8]
102cead0c:     	ldp	x9, x8, [x29, #-0xb8]
102cead10:     	stp	x9, x8, [sp, #0x98]
102cead14:     	cbz	x8, 0x102cead20
102cead18:     	add	x8, x8, #0x8
102cead1c:     	ldadd	w19, w8, [x8]
102cead20:     	add	x0, sp, #0xa8
102cead24:     	add	x1, sp, #0x98
102cead28:     	mov	w2, #0x0                ; =0
102cead2c:     	bl	0x1026b18fc
102cead30:     	mov	x24, x0
102cead34:     	add	x8, sp, #0x98
102cead38:     	add	x0, x8, #0x8
102cead3c:     	bl	0x10001022c
102cead40:     	add	x8, sp, #0xa8
102cead44:     	add	x0, x8, #0x8
102cead48:     	bl	0x10001022c
102cead4c:     	cbz	w24, 0x102ceace8
102cead50:     	ldp	x9, x8, [sp, #0xb8]
102cead54:     	stp	x9, x8, [sp, #0x78]
102cead58:     	cbz	x8, 0x102cead64
102cead5c:     	add	x8, x8, #0x8
102cead60:     	ldadd	w19, w8, [x8]
102cead64:     	add	x8, sp, #0x88
102cead68:     	add	x0, sp, #0x78
102cead6c:     	bl	0x1026b10f8
102cead70:     	ldr	x0, [sp]
102cead74:     	bl	0x10001022c
102cead78:     	ldr	x0, [sp, #0x88]
102cead7c:     	cbz	x0, 0x102ceae9c
102cead80:     	bl	0x1026de1e0
102cead84:     	mov	x24, x0
102cead88:     	cmp	w0, #0x1
102cead8c:     	b.lt	0x102ceae9c
102cead90:     	mov	w25, #0x0               ; =0
102cead94:     	ldr	x0, [sp, #0x88]
102cead98:     	add	x8, sp, #0x68
102cead9c:     	mov	x1, x25
102ceada0:     	bl	0x1026de1e8
102ceada4:     	ldr	x0, [sp, #0x68]
102ceada8:     	bl	0x1026a7b30
102ceadac:     	cbz	w0, 0x102ceae88
102ceadb0:     	ldr	x0, [sp, #0xb8]
102ceadb4:     	bl	0x102576608
102ceadb8:     	lsr	x8, x0, #32
102ceadbc:     	scvtf	d10, w0
102ceadc0:     	scvtf	d11, w8
102ceadc4:     	ldp	d0, d1, [x21]
102ceadc8:     	fsub	d8, d0, d10
102ceadcc:     	fsub	d9, d1, d11
102ceadd0:     	stp	d8, d9, [sp, #0x58]
102ceadd4:     	mov	w0, #0xa8               ; =168
102ceadd8:     	bl	0x103bdd37c
102ceaddc:     	mov	x26, x0
102ceade0:     	bl	0x102ce983c
102ceade4:     	str	x23, [x26]
102ceade8:     	str	w28, [x26, #0x20]
102ceadec:     	mov	x0, x20
102ceadf0:     	mov	x1, x26
102ceadf4:     	bl	0x102ceb21c
102ceadf8:     	ldr	w8, [x21, #0x14]
102ceadfc:     	str	w8, [x26, #0x24]
102ceae00:     	stp	d10, d11, [x26, #0x48]
102ceae04:     	add	x1, x26, #0x78
102ceae08:     	mov	x0, x22
102ceae0c:     	bl	0x102ce8d3c
102ceae10:     	add	x8, sp, #0x48
102ceae14:     	bl	0x1026f1c00
102ceae18:     	ldp	x9, x8, [sp, #0x68]
102ceae1c:     	stp	x9, x8, [sp, #0x38]
102ceae20:     	cbz	x8, 0x102ceae2c
102ceae24:     	add	x8, x8, #0x8
102ceae28:     	ldadd	w19, w8, [x8]
102ceae2c:     	ldp	x9, x8, [sp, #0x48]
102ceae30:     	stp	x9, x8, [sp, #0x28]
102ceae34:     	cbz	x8, 0x102ceae40
102ceae38:     	add	x8, x8, #0x8
102ceae3c:     	ldadd	w19, w8, [x8]
102ceae40:     	add	x0, sp, #0x38
102ceae44:     	add	x1, sp, #0x28
102ceae48:     	add	x2, sp, #0x58
102ceae4c:     	bl	0x102ceb038
102ceae50:     	str	x0, [x26, #0x28]
102ceae54:     	add	x8, sp, #0x28
102ceae58:     	add	x0, x8, #0x8
102ceae5c:     	bl	0x10001022c
102ceae60:     	add	x8, sp, #0x38
102ceae64:     	add	x0, x8, #0x8
102ceae68:     	bl	0x10001022c
102ceae6c:     	ldr	x0, [x26, #0x28]
102ceae70:     	cbnz	x0, 0x102ceaea8
102ceae74:     	add	x8, sp, #0x48
102ceae78:     	add	x0, x8, #0x8
102ceae7c:     	bl	0x10001022c
102ceae80:     	add	x0, x20, #0x8
102ceae84:     	bl	0x10001022c
102ceae88:     	add	x0, x27, #0x8
102ceae8c:     	bl	0x10001022c
102ceae90:     	add	w25, w25, #0x1
102ceae94:     	cmp	w24, w25
102ceae98:     	b.ne	0x102cead94
102ceae9c:     	ldr	x0, [sp, #0x8]
102ceaea0:     	bl	0x10001022c
102ceaea4:     	b	0x102ceace8
102ceaea8:     	mov	w1, #0x0                ; =0
102ceaeac:     	bl	0x102781e2c
102ceaeb0:     	str	d0, [x26, #0x40]
102ceaeb4:     	stp	xzr, xzr, [sp, #0x18]
102ceaeb8:     	mov	x8, #0x848000000000     ; =145685290680320
102ceaebc:     	movk	x8, #0x412e, lsl #48
102ceaec0:     	str	x8, [sp, #0x10]
102ceaec4:     	ldr	x0, [x26, #0x28]
102ceaec8:     	add	x1, sp, #0x10
102ceaecc:     	add	x2, sp, #0x18
102ceaed0:     	add	x3, x26, #0x30
102ceaed4:     	add	x4, x26, #0x38
102ceaed8:     	fmov	d0, d8
102ceaedc:     	fmov	d1, d9
102ceaee0:     	bl	0x102782054
102ceaee4:     	add	x8, sp, #0x48
102ceaee8:     	add	x0, x8, #0x8
102ceaeec:     	bl	0x10001022c
102ceaef0:     	add	x0, x27, #0x8
102ceaef4:     	bl	0x10001022c
102ceaef8:     	ldr	x0, [sp, #0x8]
102ceaefc:     	bl	0x10001022c
102ceaf00:     	b	0x102ceaf08
102ceaf04:     	stp	xzr, xzr, [x20]
102ceaf08:     	add	x8, sp, #0xb8
102ceaf0c:     	add	x0, x8, #0x8
102ceaf10:     	bl	0x10001022c
102ceaf14:     	sub	x8, x29, #0xb8
102ceaf18:     	add	x0, x8, #0x8
102ceaf1c:     	bl	0x10001022c
102ceaf20:     	sub	x0, x29, #0xa8
102ceaf24:     	bl	0x1025a9228
102ceaf28:     	ldp	x29, x30, [sp, #0x180]
102ceaf2c:     	ldp	x20, x19, [sp, #0x170]
102ceaf30:     	ldp	x22, x21, [sp, #0x160]
102ceaf34:     	ldp	x24, x23, [sp, #0x150]
102ceaf38:     	ldp	x26, x25, [sp, #0x140]
102ceaf3c:     	ldp	x28, x27, [sp, #0x130]
102ceaf40:     	ldp	d9, d8, [sp, #0x120]
102ceaf44:     	ldp	d11, d10, [sp, #0x110]
102ceaf48:     	add	sp, sp, #0x190
102ceaf4c:     	ret
102ceaf50:     	b	0x102ceaf54
102ceaf54:     	mov	x21, x0
102ceaf58:     	b	0x102ceafc0
102ceaf5c:     	mov	x21, x0
102ceaf60:     	b	0x102ceb028
102ceaf64:     	b	0x102ceaff0
102ceaf68:     	mov	x21, x0
102ceaf6c:     	ldr	x8, [sp]
102ceaf70:     	str	x8, [sp, #0x8]
102ceaf74:     	b	0x102ceb008
102ceaf78:     	mov	x21, x0
102ceaf7c:     	add	x8, sp, #0x98
102ceaf80:     	add	x0, x8, #0x8
102ceaf84:     	bl	0x10001022c
102ceaf88:     	add	x8, sp, #0xa8
102ceaf8c:     	add	x0, x8, #0x8
102ceaf90:     	b	0x102ceb00c
102ceaf94:     	mov	x21, x0
102ceaf98:     	b	0x102ceb010
102ceaf9c:     	b	0x102ceafd0
102ceafa0:     	b	0x102ceaffc
102ceafa4:     	mov	x21, x0
102ceafa8:     	add	x8, sp, #0x28
102ceafac:     	add	x0, x8, #0x8
102ceafb0:     	bl	0x10001022c
102ceafb4:     	add	x8, sp, #0x38
102ceafb8:     	add	x0, x8, #0x8
102ceafbc:     	bl	0x10001022c
102ceafc0:     	add	x8, sp, #0x48
102ceafc4:     	add	x0, x8, #0x8
102ceafc8:     	bl	0x10001022c
102ceafcc:     	b	0x102ceafd4
102ceafd0:     	mov	x21, x0
102ceafd4:     	add	x0, x20, #0x8
102ceafd8:     	bl	0x10001022c
102ceafdc:     	b	0x102ceb000
102ceafe0:     	mov	x21, x0
102ceafe4:     	mov	x0, x26
102ceafe8:     	bl	0x103bdd34c
102ceafec:     	b	0x102ceb000
102ceaff0:     	mov	x21, x0
102ceaff4:     	b	0x102ceb008
102ceaff8:     	b	0x102ceaffc
102ceaffc:     	mov	x21, x0
102ceb000:     	add	x0, x27, #0x8
102ceb004:     	bl	0x10001022c
102ceb008:     	ldr	x0, [sp, #0x8]
102ceb00c:     	bl	0x10001022c
102ceb010:     	sub	x19, x29, #0xb8
102ceb014:     	add	x8, sp, #0xb8
102ceb018:     	add	x0, x8, #0x8
102ceb01c:     	bl	0x10001022c
102ceb020:     	add	x0, x19, #0x8
102ceb024:     	bl	0x10001022c
102ceb028:     	sub	x0, x29, #0xa8
102ceb02c:     	bl	0x1025a9228
102ceb030:     	mov	x0, x21
102ceb034:     	bl	0x103bda970

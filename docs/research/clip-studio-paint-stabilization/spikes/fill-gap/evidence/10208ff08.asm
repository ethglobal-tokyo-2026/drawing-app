; CSP 5.1.4 ARM64, unslid range 0x10208ff08:0x10208ffd0
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
10208ff08:     	sub	sp, sp, #0x60
10208ff0c:     	stp	x24, x23, [sp, #0x20]
10208ff10:     	stp	x22, x21, [sp, #0x30]
10208ff14:     	stp	x20, x19, [sp, #0x40]
10208ff18:     	stp	x29, x30, [sp, #0x50]
10208ff1c:     	add	x29, sp, #0x50
10208ff20:     	mov	x19, x2
10208ff24:     	mov	x21, x1
10208ff28:     	mov	x20, x0
10208ff2c:     	mov	w0, #0x28               ; =40
10208ff30:     	bl	0x103bdd37c
10208ff34:     	mov	x22, x0
10208ff38:     	bl	0x10310df3c
10208ff3c:     	add	w8, w21, #0x7
10208ff40:     	asr	w23, w8, #3
10208ff44:     	mov	x24, sp
10208ff48:     	mov	x0, sp
10208ff4c:     	mov	x1, x22
10208ff50:     	bl	0x1000c2694
10208ff54:     	add	x8, sp, #0x10
10208ff58:     	ldr	q0, [sp]
10208ff5c:     	stp	xzr, xzr, [sp]
10208ff60:     	ldur	q1, [x20, #0x18]
10208ff64:     	stur	q0, [x20, #0x18]
10208ff68:     	str	q1, [sp, #0x10]
10208ff6c:     	orr	x0, x8, #0x8
10208ff70:     	bl	0x10001022c
10208ff74:     	orr	x0, x24, #0x8
10208ff78:     	bl	0x10001022c
10208ff7c:     	ldr	x0, [x20, #0x18]
10208ff80:     	mul	w22, w23, w19
10208ff84:     	mov	x1, x22
10208ff88:     	bl	0x10310eed4
10208ff8c:     	str	x0, [x20, #0x28]
10208ff90:     	stp	w21, w19, [x20, #0x8]
10208ff94:     	str	w23, [x20, #0x10]
10208ff98:     	mov	w1, #0x0                ; =0
10208ff9c:     	mov	x2, x22
10208ffa0:     	bl	0x10310f1f8
10208ffa4:     	ldp	x29, x30, [sp, #0x50]
10208ffa8:     	ldp	x20, x19, [sp, #0x40]
10208ffac:     	ldp	x22, x21, [sp, #0x30]
10208ffb0:     	ldp	x24, x23, [sp, #0x20]
10208ffb4:     	add	sp, sp, #0x60
10208ffb8:     	ret
10208ffbc:     	mov	x19, x0
10208ffc0:     	mov	x0, x22
10208ffc4:     	bl	0x103bdd34c
10208ffc8:     	mov	x0, x19
10208ffcc:     	bl	0x103bda970

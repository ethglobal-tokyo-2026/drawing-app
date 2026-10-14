; CSP 5.1.4 ARM64, unslid range 0x10253cf74:0x10253d048
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
10253cf74:     	stp	x24, x23, [sp, #-0x40]!
10253cf78:     	stp	x22, x21, [sp, #0x10]
10253cf7c:     	stp	x20, x19, [sp, #0x20]
10253cf80:     	stp	x29, x30, [sp, #0x30]
10253cf84:     	add	x29, sp, #0x30
10253cf88:     	mov	x19, x0
10253cf8c:     	ldr	w21, [x0, #0x148]
10253cf90:     	ldr	w23, [x0, #0x140]
10253cf94:     	ldr	w22, [x0, #0x14c]
10253cf98:     	ldr	w24, [x0, #0x144]
10253cf9c:     	str	w23, [x0, #0x1d0]
10253cfa0:     	str	w24, [x0, #0x1d4]
10253cfa4:     	ldp	w8, w9, [x0, #0xd8]
10253cfa8:     	sub	w8, w23, w8
10253cfac:     	sub	w9, w24, w9
10253cfb0:     	orr	x8, x8, x9, lsl #32
10253cfb4:     	str	x8, [x0, #0x1d8]
10253cfb8:     	mov	w1, #0x7                ; =7
10253cfbc:     	bl	0x10253f55c
10253cfc0:     	mov	w0, #0x30               ; =48
10253cfc4:     	bl	0x103bdd37c
10253cfc8:     	mov	x20, x0
10253cfcc:     	bl	0x10208fe44
10253cfd0:     	sub	w21, w21, w23
10253cfd4:     	sub	w22, w22, w24
10253cfd8:     	add	x0, x19, #0x190
10253cfdc:     	mov	x1, x20
10253cfe0:     	bl	0x102541ac4
10253cfe4:     	ldr	x0, [x19, #0x190]
10253cfe8:     	mov	x1, x21
10253cfec:     	mov	x2, x22
10253cff0:     	bl	0x10208ff08
10253cff4:     	mov	w0, #0x30               ; =48
10253cff8:     	bl	0x103bdd37c
10253cffc:     	mov	x20, x0
10253d000:     	bl	0x10208fe44
10253d004:     	add	x0, x19, #0x1a0
10253d008:     	mov	x1, x20
10253d00c:     	bl	0x102541ac4
10253d010:     	ldr	x0, [x19, #0x1a0]
10253d014:     	mov	x1, x21
10253d018:     	mov	x2, x22
10253d01c:     	ldp	x29, x30, [sp, #0x30]
10253d020:     	ldp	x20, x19, [sp, #0x20]
10253d024:     	ldp	x22, x21, [sp, #0x10]
10253d028:     	ldp	x24, x23, [sp], #0x40
10253d02c:     	b	0x10208ff08
10253d030:     	b	0x10253d034
10253d034:     	mov	x19, x0
10253d038:     	mov	x0, x20
10253d03c:     	bl	0x103bdd34c
10253d040:     	mov	x0, x19
10253d044:     	bl	0x103bda970

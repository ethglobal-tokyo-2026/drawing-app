; CSP 5.1.4 ARM64, unslid range 0x102090f80:0x102091078
; source sha256 6c5a7c601db135171355802ee05e6f49b440a642060b0886f46833e9d02510cd
102090f80:     	subs	w10, w3, w1
102090f84:     	cset	w8, ne
102090f88:     	csinv	w8, w8, wzr, ge
102090f8c:     	subs	w9, w4, w2
102090f90:     	cneg	w9, w9, mi
102090f94:     	cmp	w10, #0x0
102090f98:     	cneg	w10, w10, mi
102090f9c:     	cmp	w9, w10
102090fa0:     	csel	w12, w9, w10, lo
102090fa4:     	csel	w13, w9, w10, hi
102090fa8:     	orr	w11, w9, w10
102090fac:     	cmp	w11, #0x0
102090fb0:     	csinc	w17, w13, wzr, ne
102090fb4:     	tbnz	w17, #0x1f, 0x102091074
102090fb8:     	stp	x22, x21, [sp, #-0x20]!
102090fbc:     	stp	x20, x19, [sp, #0x10]
102090fc0:     	lsl	w11, w12, #1
102090fc4:     	sub	w12, w12, w13
102090fc8:     	lsl	w12, w12, #1
102090fcc:     	sub	w13, w11, w13
102090fd0:     	cmp	w4, w2
102090fd4:     	cset	w14, ne
102090fd8:     	csinv	w15, w14, wzr, ge
102090fdc:     	cmp	w9, w10
102090fe0:     	csel	w14, wzr, w15, hi
102090fe4:     	csel	w15, w15, wzr, hi
102090fe8:     	csel	w16, wzr, w8, hi
102090fec:     	add	w17, w17, #0x1
102090ff0:     	mov	w3, #-0x81              ; =-129
102090ff4:     	mov	w4, #0x80               ; =128
102090ff8:     	bic	w6, w1, w1, asr #31
102090ffc:     	bic	w7, w2, w2, asr #31
102091000:     	ldr	x19, [x0, #0x28]
102091004:     	ldr	w20, [x0, #0x10]
102091008:     	mul	w7, w20, w7
10209100c:     	add	x7, x19, x7
102091010:     	and	w19, w6, #0x7
102091014:     	lsr	x6, x6, #3
102091018:     	ldrb	w20, [x7, x6]
10209101c:     	asr	w21, w3, w19
102091020:     	and	w21, w20, w21
102091024:     	lsr	w19, w4, w19
102091028:     	orr	w19, w20, w19
10209102c:     	cmp	w5, #0x0
102091030:     	csel	w19, w21, w19, eq
102091034:     	cmp	w13, #0x0
102091038:     	csel	w20, w12, w11, ge
10209103c:     	cmn	w13, #0x1
102091040:     	ccmp	w9, w10, #0x0, gt
102091044:     	strb	w19, [x7, x6]
102091048:     	bic	w6, w14, w13, asr #31
10209104c:     	csel	w7, w8, wzr, hi
102091050:     	add	w13, w20, w13
102091054:     	add	w2, w2, w15
102091058:     	add	w2, w2, w6
10209105c:     	add	w1, w1, w16
102091060:     	add	w1, w1, w7
102091064:     	subs	w17, w17, #0x1
102091068:     	b.ne	0x102090ff8
10209106c:     	ldp	x20, x19, [sp, #0x10]
102091070:     	ldp	x22, x21, [sp], #0x20
102091074:     	ret

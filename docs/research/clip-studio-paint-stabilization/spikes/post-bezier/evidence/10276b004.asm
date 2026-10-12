
FUNCTION 0x10276b004 size 104
10276b004:     	mov.d	v0[1], v1[0]
10276b008:     	mov	x8, #0x848000000000     ; =145685290680320
10276b00c:     	movk	x8, #0x412e, lsl #48
10276b010:     	dup.2d	v1, x8
10276b014:     	fmul.2d	v0, v0, v1
10276b018:     	fcmlt.2d	v1, v0, #0.0
10276b01c:     	mov	x8, #0x63b9             ; =25529
10276b020:     	movk	x8, #0x55e, lsl #16
10276b024:     	movk	x8, #0x3fe0, lsl #48
10276b028:     	dup.2d	v2, x8
10276b02c:     	mov	x8, #0x63b9             ; =25529
10276b030:     	movk	x8, #0x55e, lsl #16
10276b034:     	movk	x8, #0xbfe0, lsl #48
10276b038:     	dup.2d	v3, x8
10276b03c:     	bsl.16b	v1, v3, v2
10276b040:     	fadd.2d	v0, v0, v1
10276b044:     	fcvtzs.2d	v0, v0
10276b048:     	scvtf.2d	v0, v0
10276b04c:     	mov	x8, #0xed8d             ; =60813
10276b050:     	movk	x8, #0xa0b5, lsl #16
10276b054:     	movk	x8, #0xc6f7, lsl #32
10276b058:     	movk	x8, #0x3eb0, lsl #48
10276b05c:     	dup.2d	v1, x8
10276b060:     	fmul.2d	v0, v0, v1
10276b064:     	stur	q0, [x0, #0x8]
10276b068:     	ret

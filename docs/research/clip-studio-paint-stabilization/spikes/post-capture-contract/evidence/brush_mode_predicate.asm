
FUNCTION 0x102c709e4 size 48
102c709e4:     	ldr	w8, [x0, #0x10]
102c709e8:     	cbz	w8, 0x102c70a0c
102c709ec:     	ldr	w8, [x0]
102c709f0:     	sub	w9, w8, #0x2
102c709f4:     	mov	w10, #0x1               ; =1
102c709f8:     	cmp	w8, #0x5
102c709fc:     	cset	w8, eq
102c70a00:     	cmp	w9, #0x3
102c70a04:     	csel	w0, w10, w8, lo
102c70a08:     	ret
102c70a0c:     	mov	w0, #0x0                ; =0
102c70a10:     	ret

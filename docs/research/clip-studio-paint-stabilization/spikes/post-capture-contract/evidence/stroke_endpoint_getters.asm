
FUNCTION 0x102789774 size 28
102789774:     	ldp	x10, x9, [x0, #0x88]
102789778:     	stp	x10, x9, [x8]
10278977c:     	cbz	x9, 0x10278978c
102789780:     	add	x8, x9, #0x8
102789784:     	mov	w9, #0x1                ; =1
102789788:     	ldadd	w9, w8, [x8]
10278978c:     	ret

FUNCTION 0x102789790 size 8
102789790:     	ldr	d0, [x0, #0x98]
102789794:     	ret

FUNCTION 0x102789798 size 8
102789798:     	str	d0, [x0, #0x98]
10278979c:     	ret

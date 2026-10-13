
FUNCTION 0x1028c5438 size 24796
1028c5438:     	stp	x28, x27, [sp, #-0x60]!
1028c543c:     	stp	x26, x25, [sp, #0x10]
1028c5440:     	stp	x24, x23, [sp, #0x20]
1028c5444:     	stp	x22, x21, [sp, #0x30]
1028c5448:     	stp	x20, x19, [sp, #0x40]
1028c544c:     	stp	x29, x30, [sp, #0x50]
1028c5450:     	add	x29, sp, #0x50
1028c5454:     	sub	sp, sp, #0x9a0
1028c5458:     	mov	x19, x1
1028c545c:     	mov	x20, x0
1028c5460:     	bl	0x10339db98
1028c5464:     	mov	x21, x0
1028c5468:     	ldr	w8, [x19]
1028c546c:     	mov	w9, #-0xc350            ; =-50000
1028c5470:     	add	w9, w8, w9
1028c5474:     	lsr	w9, w9, #4
1028c5478:     	mov	w10, #0xc350            ; =50000
1028c547c:     	cmp	w9, #0xc35
1028c5480:     	csel	w22, w10, wzr, lo
1028c5484:     	sub	w8, w8, w22
1028c5488:     	cmp	w8, #0x47e
1028c548c:     	b.le	0x1028c559c
1028c5490:     	cmp	w8, #0x4d8
1028c5494:     	b.gt	0x1028c5680
1028c5498:     	cmp	w8, #0x4b1
1028c549c:     	b.gt	0x1028c579c
1028c54a0:     	cmp	w8, #0x488
1028c54a4:     	b.le	0x1028c5e58
1028c54a8:     	cmp	w8, #0x49c
1028c54ac:     	b.gt	0x1028c6430

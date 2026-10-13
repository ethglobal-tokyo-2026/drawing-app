
FUNCTION 0x102915430 size 128
102915430:     	sub	sp, sp, #0x40
102915434:     	stp	d9, d8, [sp, #0x10]
102915438:     	stp	x20, x19, [sp, #0x20]
10291543c:     	stp	x29, x30, [sp, #0x30]
102915440:     	add	x29, sp, #0x30
102915444:     	ldr	x0, [x0, #0x110]
102915448:     	cbz	x0, 0x102915468
10291544c:     	mov	x8, sp
102915450:     	bl	0x102f3cbe8
102915454:     	ldr	x0, [sp]
102915458:     	cbz	x0, 0x10291546c
10291545c:     	bl	0x1024e8320
102915460:     	fmov	d8, d0
102915464:     	b	0x102915474
102915468:     	stp	xzr, xzr, [sp]
10291546c:     	adrp	x8, 0x1042f9000
102915470:     	ldr	d8, [x8, #0x340]
102915474:     	mov	x8, sp
102915478:     	add	x0, x8, #0x8 STRING 'shared_ptrIN12Planeswalker6PWViewEEERKNSt3__16vectorINS0_IKNS1_8PWStringEEENS1_18PWSTLHeapAllocatorIS8_EEEEE'
10291547c:     	bl	0x10001022c
102915480:     	fmov	d0, d8
102915484:     	ldp	x29, x30, [sp, #0x30]
102915488:     	ldp	x20, x19, [sp, #0x20]
10291548c:     	ldp	d9, d8, [sp, #0x10]
102915490:     	add	sp, sp, #0x40
102915494:     	ret
102915498:     	mov	x19, x0
10291549c:     	mov	x8, sp
1029154a0:     	add	x0, x8, #0x8 STRING 'shared_ptrIN12Planeswalker6PWViewEEERKNSt3__16vectorINS0_IKNS1_8PWStringEEENS1_18PWSTLHeapAllocatorIS8_EEEEE'
1029154a4:     	bl	0x10001022c
1029154a8:     	mov	x0, x19
1029154ac:     	bl	0x103bda970

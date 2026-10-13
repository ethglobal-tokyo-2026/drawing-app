
FUNCTION 0x10219455c size 68
10219455c:     	adrp	x8, 0x1042e3000
102194560:     	ldr	d5, [x8, #0x688]
102194564:     	fadd	d5, d2, d5
102194568:     	adrp	x8, 0x1042e3000
10219456c:     	ldr	d6, [x8, #0x690]
102194570:     	fadd	d6, d2, d6
102194574:     	fcmp	d5, d0
102194578:     	fccmp	d6, d0, #0x8, ls
10219457c:     	b.ge	0x102194598
102194580:     	fsub	d3, d3, d1
102194584:     	fsub	d2, d2, d0
102194588:     	fdiv	d2, d3, d2
10219458c:     	fsub	d0, d4, d0
102194590:     	fmadd	d0, d2, d0, d1
102194594:     	ret
102194598:     	fmov	d0, d1
10219459c:     	ret

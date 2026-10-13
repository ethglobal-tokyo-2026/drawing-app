
FUNCTION 0x1024af6f0 size 64
1024af6f0:     	tbnz	w1, #0x4, 0x1024af710
1024af6f4:     	tbnz	w1, #0x5, 0x1024af718
1024af6f8:     	tbnz	w1, #0x6, 0x1024af720
1024af6fc:     	tbnz	w1, #0x7, 0x1024af728
1024af700:     	movi	d0, #0000000000000000
1024af704:     	tbz	w1, #0x8, 0x1024af70c
1024af708:     	ldr	s0, [x0, #0x20]
1024af70c:     	ret
1024af710:     	ldr	s0, [x0, #0xc]
1024af714:     	ret
1024af718:     	ldr	s0, [x0, #0x10]
1024af71c:     	ret
1024af720:     	ldr	s0, [x0, #0x18]
1024af724:     	ret
1024af728:     	ldr	s0, [x0, #0x1c]
1024af72c:     	ret

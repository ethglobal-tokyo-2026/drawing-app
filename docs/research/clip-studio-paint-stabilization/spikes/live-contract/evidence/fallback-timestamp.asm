
FUNCTION 0x10310f644 size 92
10310f644:     	sub	sp, sp, #0x30
10310f648:     	stp	x20, x19, [sp, #0x10]
10310f64c:     	stp	x29, x30, [sp, #0x20]
10310f650:     	add	x29, sp, #0x20
10310f654:     	mov	x0, sp
10310f658:     	bl	0x1031210f4
10310f65c:     	mov	x0, sp
10310f660:     	bl	0x1031088a4
10310f664:     	mov	x0, sp
10310f668:     	bl	0x103121190
10310f66c:     	mov	x19, x0
10310f670:     	mov	x0, sp
10310f674:     	bl	0x103121130
10310f678:     	mov	x0, x19
10310f67c:     	ldp	x29, x30, [sp, #0x20]
10310f680:     	ldp	x20, x19, [sp, #0x10]
10310f684:     	add	sp, sp, #0x30
10310f688:     	ret
10310f68c:     	mov	x19, x0
10310f690:     	mov	x0, sp
10310f694:     	bl	0x103121130
10310f698:     	mov	x0, x19
10310f69c:     	bl	0x103bda970

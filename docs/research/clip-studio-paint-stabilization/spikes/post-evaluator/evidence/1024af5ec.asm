
FUNCTION 0x1024af5ec size 60
1024af5ec:     	stp	x20, x19, [sp, #-0x20]!
1024af5f0:     	stp	x29, x30, [sp, #0x10]
1024af5f4:     	add	x29, sp, #0x10
1024af5f8:     	adrp	x19, 0x104c9d000
1024af5fc:     	add	x19, x19, #0xca8
1024af600:     	mov	x0, x19
1024af604:     	bl	0x10310cd44
1024af608:     	adrp	x0, 0x10310c000
1024af60c:     	add	x0, x0, #0xd7c STRING '3'
1024af610:     	adrp	x2, 0x100000000
1024af614:     	add	x2, x2, #0x0
1024af618:     	mov	x1, x19
1024af61c:     	ldp	x29, x30, [sp, #0x10]
1024af620:     	ldp	x20, x19, [sp], #0x20
1024af624:     	b	0x103bdd3c4

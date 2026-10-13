
FUNCTION 0x10359c490 size 344
10359c490:     	sub	sp, sp, #0x70
10359c494:     	stp	d9, d8, [sp, #0x50]
10359c498:     	stp	x29, x30, [sp, #0x60]
10359c49c:     	add	x29, sp, #0x60
10359c4a0:     	stp	d0, d1, [x29, #-0x20]
10359c4a4:     	stp	d6, d7, [sp, #0x30]
10359c4a8:     	fmov	d16, #0.37500000
10359c4ac:     	fmul	d17, d2, d16
10359c4b0:     	fmov	d18, #0.56250000
10359c4b4:     	fmadd	d19, d0, d18, d17
10359c4b8:     	mov	x8, #0x3fb0000000000000 ; =4589168020290535424
10359c4bc:     	fmov	d20, x8
10359c4c0:     	fmadd	d19, d6, d20, d19
10359c4c4:     	fmul	d21, d3, d16
10359c4c8:     	fmadd	d22, d1, d18, d21
10359c4cc:     	fmadd	d22, d7, d20, d22
10359c4d0:     	fmov	d23, #0.50000000
10359c4d4:     	fmul	d24, d2, d23
10359c4d8:     	fmov	d25, #0.25000000
10359c4dc:     	fmadd	d24, d0, d25, d24
10359c4e0:     	fmadd	d24, d6, d25, d24
10359c4e4:     	fmul	d23, d3, d23
10359c4e8:     	fmadd	d23, d1, d25, d23
10359c4ec:     	fmadd	d23, d7, d25, d23
10359c4f0:     	fmadd	d25, d0, d20, d17
10359c4f4:     	fmadd	d25, d6, d18, d25
10359c4f8:     	fmadd	d20, d1, d20, d21
10359c4fc:     	fmadd	d18, d7, d18, d20
10359c500:     	fmov	d20, #0.42187500
10359c504:     	fmul	d26, d2, d20
10359c508:     	fmadd	d26, d0, d20, d26
10359c50c:     	fmov	d27, #0.14062500
10359c510:     	fmadd	d26, d4, d27, d26
10359c514:     	mov	x8, #0x3f90000000000000 ; =4580160821035794432
10359c518:     	fmov	d28, x8
10359c51c:     	fmadd	d26, d6, d28, d26
10359c520:     	fmul	d29, d3, d20
10359c524:     	fmadd	d29, d1, d20, d29
10359c528:     	fmadd	d29, d5, d27, d29
10359c52c:     	fmadd	d29, d7, d28, d29
10359c530:     	fmov	d30, #0.12500000
10359c534:     	fmadd	d17, d0, d30, d17
10359c538:     	fmadd	d17, d4, d16, d17
10359c53c:     	fmadd	d17, d6, d30, d17
10359c540:     	fmadd	d21, d1, d30, d21
10359c544:     	fmadd	d16, d5, d16, d21
10359c548:     	fmadd	d16, d7, d30, d16
10359c54c:     	fmul	d2, d2, d27
10359c550:     	fmadd	d0, d0, d28, d2
10359c554:     	fmadd	d0, d4, d20, d0
10359c558:     	fmadd	d0, d6, d20, d0
10359c55c:     	fmul	d2, d3, d27
10359c560:     	fmadd	d1, d1, d28, d2
10359c564:     	fmadd	d1, d5, d20, d1
10359c568:     	fmadd	d1, d7, d20, d1
10359c56c:     	cmp	w0, #0x0
10359c570:     	fcsel	d2, d19, d26, eq
10359c574:     	fcsel	d3, d22, d29, eq
10359c578:     	fcsel	d4, d24, d17, eq
10359c57c:     	fcsel	d5, d23, d16, eq
10359c580:     	fcsel	d0, d25, d0, eq
10359c584:     	cmp	w0, #0x0
10359c588:     	stp	d2, d3, [sp, #0x20]
10359c58c:     	stp	d4, d5, [sp, #0x10]
10359c590:     	fcsel	d1, d18, d1, eq
10359c594:     	stp	d0, d1, [sp]
10359c598:     	sub	x0, x29, #0x20
10359c59c:     	add	x1, sp, #0x20
10359c5a0:     	bl	0x102193618
10359c5a4:     	fmov	d8, d0
10359c5a8:     	add	x0, sp, #0x20
10359c5ac:     	add	x1, sp, #0x10
10359c5b0:     	bl	0x102193618
10359c5b4:     	fadd	d8, d8, d0
10359c5b8:     	add	x0, sp, #0x10
10359c5bc:     	mov	x1, sp
10359c5c0:     	bl	0x102193618
10359c5c4:     	fadd	d8, d8, d0
10359c5c8:     	mov	x0, sp
10359c5cc:     	add	x1, sp, #0x30
10359c5d0:     	bl	0x102193618
10359c5d4:     	fadd	d0, d8, d0
10359c5d8:     	ldp	x29, x30, [sp, #0x60]
10359c5dc:     	ldp	d9, d8, [sp, #0x50]
10359c5e0:     	add	sp, sp, #0x70
10359c5e4:     	ret

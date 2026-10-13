.text
.p2align 2
.globl _csp_init
_csp_init:
L1028f2344:
    sub	sp, sp, #0x80
L1028f2348:
    stp	d13, d12, [sp, #0x10]
L1028f234c:
    stp	d11, d10, [sp, #0x20]
L1028f2350:
    stp	d9, d8, [sp, #0x30]
L1028f2354:
    stp	x24, x23, [sp, #0x40]
L1028f2358:
    stp	x22, x21, [sp, #0x50]
L1028f235c:
    stp	x20, x19, [sp, #0x60]
L1028f2360:
    stp	x29, x30, [sp, #0x70]
L1028f2364:
    add	x29, sp, #0x70
L1028f2368:
    mov	x20, x4
L1028f236c:
    fmov	d8, d4
L1028f2370:
    fmov	d9, d3
L1028f2374:
    fmov	d11, d2
L1028f2378:
    fmov	d12, d1
L1028f237c:
    fmov	d10, d0
L1028f2380:
    mov	x21, x3
L1028f2384:
    mov	x23, x2
L1028f2388:
    mov	x22, x1
L1028f238c:
    mov	x19, x0
L1028f2390:
    str	x4, [sp, #0x8]
L1028f2394:
    str	wzr, [x0, #0x8]
L1028f2398:
    str	xzr, [x0, #0x58]
L1028f239c:
    cbz	w1, L1028f2400
L1028f23a0:
    cmp	w23, #0x1
L1028f23a4:
    b.eq	L1028f2400
L1028f23a8:
    cbz	x20, L1028f2400
L1028f23ac:
    mov	w8, #0x1
L1028f23b0:
    str	w8, [x19, #0x8]
L1028f23b4:
    cmp	w23, #0x4
L1028f23b8:
    b.ne	L1028f23e4
L1028f23bc:
    bl	_csp_platform
L1028f23c0:
    cmp	w0, #0x1
L1028f23c4:
    b.eq	L1028f23f8
L1028f23c8:
    cmp	w0, #0x4
L1028f23cc:
    b.eq	L1028f23f0
L1028f23d0:
    cmp	w0, #0x3
L1028f23d4:
    b.ne	L1028f2400
L1028f23d8:
    mov	w8, #0x1
L1028f23dc:
    str	w8, [x19, #0x58]
L1028f23e0:
    b	L1028f23fc
L1028f23e4:
    mov	w8, #0x0
L1028f23e8:
    fmov	d0, #8.00000000
L1028f23ec:
    b	L1028f242c
L1028f23f0:
    mov	w8, #0x3
L1028f23f4:
    b	L1028f23fc
L1028f23f8:
    mov	w8, #0x5
L1028f23fc:
    str	w8, [x19, #0x5c]
L1028f2400:
    ldr	w8, [x19, #0x8]
L1028f2404:
    cmp	w23, #0x4
L1028f2408:
    ccmp	w23, #0x1, #0x4, ne
L1028f240c:
    mov	x9, #0x4059000000000000
L1028f2410:
    fmov	d0, x9
L1028f2414:
    fmov	d1, #20.00000000
L1028f2418:
    fcsel	d0, d0, d1, eq
L1028f241c:
    cmp	w8, #0x0
L1028f2420:
    cset	w8, eq
L1028f2424:
    fmov	d1, #8.00000000
L1028f2428:
    fcsel	d0, d0, d1, eq
L1028f242c:
    fmul	d2, d12, d11
L1028f2430:
    cmp	w22, #0x0
L1028f2434:
    fmov	d1, #1.00000000
L1028f2438:
    fcsel	d2, d2, d1, ne
L1028f243c:
    fmul	d0, d2, d0
L1028f2440:
    fdiv	d2, d0, d10
L1028f2444:
    adrp x9, Lconstant1042e3690@PAGE
L1028f2448:
    ldr d3, [x9, Lconstant1042e3690@PAGEOFF]
L1028f244c:
    fcmp	d10, d3
L1028f2450:
    fcsel	d0, d2, d0, gt
L1028f2454:
    fcmp	d0, d3
L1028f2458:
    b.le	L1028f2464
L1028f245c:
    fdiv	d0, d1, d0
L1028f2460:
    str	d0, [x19, #0x10]
L1028f2464:
    lsr	w9, w21, #1
L1028f2468:
    cmp	w21, #0x4
L1028f246c:
    csinc	w8, w8, wzr, ge
L1028f2470:
    mov	w10, #0x2
L1028f2474:
    cmp	w8, #0x0
L1028f2478:
    csel	w8, w10, w9, ne
L1028f247c:
    stp	wzr, w8, [x19, #0x48]
L1028f2480:
    ldp	x8, x9, [x19, #0x20]
L1028f2484:
    str	xzr, [x19, #0x40]
L1028f2488:
    sub	x9, x9, x8
L1028f248c:
    asr	x9, x9, #3
L1028f2490:
    cmp	x9, #0x3
L1028f2494:
    b.lo	L1028f24bc
L1028f2498:
    ldr	x0, [x8]
L1028f249c:
    bl	_csp_unexpected_free
L1028f24a0:
    ldp	x8, x9, [x19, #0x20]
L1028f24a4:
    add	x8, x8, #0x8
L1028f24a8:
    str	x8, [x19, #0x20]
L1028f24ac:
    sub	x9, x9, x8
L1028f24b0:
    asr	x9, x9, #3
L1028f24b4:
    cmp	x9, #0x2
L1028f24b8:
    b.hi	L1028f2498
L1028f24bc:
    cmp	x9, #0x1
L1028f24c0:
    b.eq	L1028f24d4
L1028f24c4:
    cmp	x9, #0x2
L1028f24c8:
    b.ne	L1028f24dc
L1028f24cc:
    mov	w8, #0x200
L1028f24d0:
    b	L1028f24d8
L1028f24d4:
    mov	w8, #0x100
L1028f24d8:
    str	x8, [x19, #0x38]
L1028f24dc:
    ldr	w8, [x19, #0x8]
L1028f24e0:
    cbz	w8, L1028f24f4
L1028f24e4:
    add	x0, x19, #0x18
L1028f24e8:
    add	x1, sp, #0x8
L1028f24ec:
    bl	_csp_append
L1028f24f0:
    ldr	x20, [sp, #0x8]
L1028f24f4:
    str	x20, [x19, #0x50]
L1028f24f8:
    stp	d9, d8, [x19, #0x68]
L1028f24fc:
    stp	d9, d8, [x19, #0x78]
L1028f2500:
    str	xzr, [x19, #0x88]
L1028f2504:
    str	wzr, [x19, #0x60]
L1028f2508:
    ldp	x29, x30, [sp, #0x70]
L1028f250c:
    ldp	x20, x19, [sp, #0x60]
L1028f2510:
    ldp	x22, x21, [sp, #0x50]
L1028f2514:
    ldp	x24, x23, [sp, #0x40]
L1028f2518:
    ldp	d9, d8, [sp, #0x30]
L1028f251c:
    ldp	d11, d10, [sp, #0x20]
L1028f2520:
    ldp	d13, d12, [sp, #0x10]
L1028f2524:
    add	sp, sp, #0x80
L1028f2528:
    ret
.p2align 2
.globl _csp_update
_csp_update:
L1028f25b0:
    sub	sp, sp, #0x60
L1028f25b4:
    stp	d9, d8, [sp, #0x20]
L1028f25b8:
    stp	x22, x21, [sp, #0x30]
L1028f25bc:
    stp	x20, x19, [sp, #0x40]
L1028f25c0:
    stp	x29, x30, [sp, #0x50]
L1028f25c4:
    add	x29, sp, #0x50
L1028f25c8:
    mov	x19, x0
L1028f25cc:
    stp	d0, d1, [sp, #0x10]
L1028f25d0:
    str	x1, [sp, #0x8]
L1028f25d4:
    ldr	w8, [x0, #0x60]
L1028f25d8:
    cbz	w8, L1028f25e4
L1028f25dc:
    ldr	d0, [x19, #0x88]
L1028f25e0:
    b	L1028f26ac
L1028f25e4:
    ldr	w8, [x19, #0x8]
L1028f25e8:
    cbz	w8, L1028f261c
L1028f25ec:
    mov	x20, x1
L1028f25f0:
    add	x0, sp, #0x10
L1028f25f4:
    add	x1, x19, #0x78
L1028f25f8:
    bl	_csp_distance
L1028f25fc:
    fmov	d8, d0
L1028f2600:
    ldr	w8, [x19, #0x58]
L1028f2604:
    cbz	w8, L1028f2630
L1028f2608:
    ldr	x8, [x19, #0x50]
L1028f260c:
    add	x8, x8, #0x5
L1028f2610:
    cmp	x8, x20
L1028f2614:
    cset	w21, gt
L1028f2618:
    b	L1028f2634
L1028f261c:
    add	x0, sp, #0x10
L1028f2620:
    add	x1, x19, #0x68
L1028f2624:
    bl	_csp_distance
L1028f2628:
    ldr	d1, [x19, #0x10]
L1028f262c:
    b	L1028f26a8
L1028f2630:
    mov	w21, #0x0
L1028f2634:
    ldr	w8, [x19, #0x5c]
L1028f2638:
    fmov	d0, #0.50000000
L1028f263c:
    fmov	d1, #1.00000000
L1028f2640:
    cmp	w8, #0x1
L1028f2644:
    fcsel	d9, d1, d0, lt
L1028f2648:
    b.lt	L1028f2690
L1028f264c:
    tbnz	w21, #0x0, L1028f2690
L1028f2650:
    bl	_csp_platform
L1028f2654:
    ldr	w8, [x19, #0x5c]
L1028f2658:
    scvtf	d0, w8
L1028f265c:
    adrp x9, Lconstant1044b80a0@PAGE
L1028f2660:
    ldr d1, [x9, Lconstant1044b80a0@PAGEOFF]
L1028f2664:
    fmov	d2, #1.00000000
L1028f2668:
    fmadd	d1, d0, d1, d2
L1028f266c:
    fmov	d3, #-0.25000000
L1028f2670:
    fmadd	d0, d0, d3, d2
L1028f2674:
    cmp	w0, #0x1
L1028f2678:
    fcsel	d0, d1, d0, eq
L1028f267c:
    fcmp	d0, #0.0
L1028f2680:
    movi	d1, #0000000000000000
L1028f2684:
    fcsel	d9, d1, d0, mi
L1028f2688:
    sub	w8, w8, #0x1
L1028f268c:
    str	w8, [x19, #0x5c]
L1028f2690:
    tbz	w21, #0x0, L1028f26e4
L1028f2694:
    ldr	d0, [x19, #0x10]
L1028f2698:
    fmul	d0, d8, d0
L1028f269c:
    fmul	d0, d9, d0
L1028f26a0:
    adrp x8, Lconstant1042ecb78@PAGE
L1028f26a4:
    ldr d1, [x8, Lconstant1042ecb78@PAGEOFF]
L1028f26a8:
    fmul	d0, d0, d1
L1028f26ac:
    ldur	q1, [x19, #0x68]
L1028f26b0:
    stur	q1, [x19, #0x78]
L1028f26b4:
    ldr	q1, [sp, #0x10]
L1028f26b8:
    stur	q1, [x19, #0x68]
L1028f26bc:
    fmov	d1, #1.00000000
L1028f26c0:
    fcmp	d0, d1
L1028f26c4:
    fcsel	d0, d1, d0, gt
L1028f26c8:
    str	d0, [x19, #0x88]
L1028f26cc:
    ldp	x29, x30, [sp, #0x50]
L1028f26d0:
    ldp	x20, x19, [sp, #0x40]
L1028f26d4:
    ldp	x22, x21, [sp, #0x30]
L1028f26d8:
    ldp	d9, d8, [sp, #0x20]
L1028f26dc:
    add	sp, sp, #0x60
L1028f26e0:
    ret
L1028f26e4:
    ldr	x10, [x19, #0x20]
L1028f26e8:
    ldr	x8, [x19, #0x38]
L1028f26ec:
    lsr	x9, x8, #6
L1028f26f0:
    and	x9, x9, #0x3fffffffffffff8
L1028f26f4:
    ldr	x9, [x10, x9]
L1028f26f8:
    and	x11, x8, #0x1ff
L1028f26fc:
    ldr	x21, [x9, x11, lsl #3]
L1028f2700:
    movi	d0, #0000000000000000
L1028f2704:
    cmp	x21, x20
L1028f2708:
    b.ge	L1028f26ac
L1028f270c:
    ldr	x9, [x19, #0x40]
L1028f2710:
    sub	x9, x9, #0x1
L1028f2714:
    add	x11, x9, x8
L1028f2718:
    lsr	x12, x11, #6
L1028f271c:
    and	x12, x12, #0x3fffffffffffff8
L1028f2720:
    ldr	x10, [x10, x12]
L1028f2724:
    and	x11, x11, #0x1ff
L1028f2728:
    ldr	x10, [x10, x11, lsl #3]
L1028f272c:
    cmp	x10, x20
L1028f2730:
    b.ge	L1028f2770
L1028f2734:
    ldp	w10, w11, [x19, #0x48]
L1028f2738:
    cmp	w10, w11
L1028f273c:
    b.ge	L1028f274c
L1028f2740:
    add	w8, w10, #0x1
L1028f2744:
    str	w8, [x19, #0x48]
L1028f2748:
    b	L1028f2760
L1028f274c:
    add	x8, x8, #0x1
L1028f2750:
    stp	x8, x9, [x19, #0x38]
L1028f2754:
    add	x0, x19, #0x18
L1028f2758:
    mov	w1, #0x1
L1028f275c:
    bl	_csp_container_maintenance
L1028f2760:
    add	x0, x19, #0x18
L1028f2764:
    add	x1, sp, #0x8
L1028f2768:
    bl	_csp_append
L1028f276c:
    ldr	x20, [sp, #0x8]
L1028f2770:
    ldr	d0, [x19, #0x10]
L1028f2774:
    fmul	d0, d8, d0
L1028f2778:
    ldr	w8, [x19, #0x48]
L1028f277c:
    scvtf	d1, w8
L1028f2780:
    fmul	d0, d9, d0
L1028f2784:
    fmul	d0, d0, d1
L1028f2788:
    sub	x8, x20, x21
L1028f278c:
    scvtf	d1, x8
L1028f2790:
    fdiv	d0, d0, d1
L1028f2794:
    b	L1028f26ac
.p2align 2
.globl _csp_distance
_csp_distance:
L102193618:
    ldp	d0, d1, [x1]
L10219361c:
    ldp	d2, d3, [x0]
L102193620:
    fsub	d0, d0, d2
L102193624:
    fsub	d1, d1, d3
L102193628:
    fmul	d1, d1, d1
L10219362c:
    fmadd	d0, d0, d0, d1
L102193630:
    fsqrt	d1, d0
L102193634:
    fcmp	d0, #0.0
L102193638:
    movi	d0, #0000000000000000
L10219363c:
    fcsel	d0, d1, d0, ne
L102193640:
    ret
.p2align 2
.globl _csp_record
_csp_record:
L10288cd3c:
    sub	sp, sp, #0x70
L10288cd40:
    stp	d9, d8, [sp, #0x20]
L10288cd44:
    stp	x24, x23, [sp, #0x30]
L10288cd48:
    stp	x22, x21, [sp, #0x40]
L10288cd4c:
    stp	x20, x19, [sp, #0x50]
L10288cd50:
    stp	x29, x30, [sp, #0x60]
L10288cd54:
    add	x29, sp, #0x60
L10288cd58:
    mov	x19, x7
L10288cd5c:
    mov	x20, x6
L10288cd60:
    mov	x22, x4
L10288cd64:
    mov	x21, x3
L10288cd68:
    mov	x24, x2
L10288cd6c:
    fmov	d8, d0
L10288cd70:
    mov	x23, x0
L10288cd74:
    stp	xzr, xzr, [x7]
L10288cd78:
    mov	x8, #0x3ff0000000000000
L10288cd7c:
    stp	xzr, xzr, [x7, #0x20]
L10288cd80:
    str	x8, [x7, #0x18]
L10288cd84:
    fmov.2d	v0, #1.00000000
L10288cd88:
    str	q0, [x7, #0x30]
L10288cd8c:
    stp	xzr, xzr, [x7, #0x48]
L10288cd90:
    str	x8, [x7, #0x40]
L10288cd94:
    str	w5, [x7, #0x54]
L10288cd98:
    ldr	d0, [x0, #0x128]
L10288cd9c:
    sshll.2d	v0, v0, #0x0
L10288cda0:
    scvtf.2d	v0, v0
L10288cda4:
    ldr	q2, [x1]
L10288cda8:
    fadd.2d	v0, v2, v0
L10288cdac:
    str	q0, [x7]
L10288cdb0:
    str	d8, [x7, #0x10]
L10288cdb4:
    ldr	w8, [x0, #0x190]
L10288cdb8:
    cbz	w8, L10288cde8
L10288cdbc:
    scvtf	d0, w8
L10288cdc0:
    fcmp	d0, d1
L10288cdc4:
    b.le	L10288cde8
L10288cdc8:
    fdiv	d0, d1, d0
L10288cdcc:
    adrp x8, Lconstant1042ef010@PAGE
L10288cdd0:
    ldr d1, [x8, Lconstant1042ef010@PAGEOFF]
L10288cdd4:
    fmul	d0, d0, d1
L10288cdd8:
    bl	_csp_lookup
L10288cddc:
    ldr	d1, [x19, #0x10]
L10288cde0:
    fmul	d0, d0, d1
L10288cde4:
    str	d0, [x19, #0x10]
L10288cde8:
    fmov	d0, #1.00000000
L10288cdec:
    fcmp	d8, d0
L10288cdf0:
    b.le	L10288cdfc
L10288cdf4:
    mov	x8, #0x3ff0000000000000
L10288cdf8:
    str	x8, [x19, #0x10]
L10288cdfc:
    scvtf	d0, w24
L10288ce00:
    adrp x8, Lconstant104552918@PAGE
L10288ce04:
    ldr d1, [x8, Lconstant104552918@PAGEOFF]
L10288ce08:
    fmul	d0, d0, d1
L10288ce0c:
    str	d0, [x19, #0x18]
L10288ce10:
    ldr	w8, [x23, #0x148]
L10288ce14:
    cbnz	w8, L10288ce24
L10288ce18:
    ldr	w8, [x23, #0x14c]
L10288ce1c:
    mov	x21, x22
L10288ce20:
    cbz	w8, L10288cec4
L10288ce24:
    scvtf	d0, w21
L10288ce28:
    str	d0, [x19, #0x28]
L10288ce2c:
    add	x8, sp, #0x10
L10288ce30:
    add	x21, x8, #0x8
L10288ce34:
    ldp	x9, x8, [x20]
L10288ce38:
    stp	x9, x8, [sp, #0x10]
L10288ce3c:
    cbz	x8, L10288ce4c
L10288ce40:
    add	x8, x8, #0x8
L10288ce44:
    mov	w9, #0x1
L10288ce48:
    ldadd	w9, w8, [x8]
L10288ce4c:
    add	x0, sp, #0x10
L10288ce50:
    bl	_csp_reflect360
L10288ce54:
    mov	x22, x0
L10288ce58:
    mov	x0, x21
L10288ce5c:
    bl	_csp_release
L10288ce60:
    cbz	w22, L10288ce78
L10288ce64:
    ldr	d0, [x19, #0x28]
L10288ce68:
    adrp x8, Lconstant1042f30b8@PAGE
L10288ce6c:
    ldr d1, [x8, Lconstant1042f30b8@PAGEOFF]
L10288ce70:
    fsub	d0, d1, d0
L10288ce74:
    str	d0, [x19, #0x28]
L10288ce78:
    mov	x8, sp
L10288ce7c:
    add	x21, x8, #0x8
L10288ce80:
    ldp	x9, x8, [x20]
L10288ce84:
    stp	x9, x8, [sp]
L10288ce88:
    cbz	x8, L10288ce98
L10288ce8c:
    add	x8, x8, #0x8
L10288ce90:
    mov	w9, #0x1
L10288ce94:
    ldadd	w9, w8, [x8]
L10288ce98:
    mov	x0, sp
L10288ce9c:
    bl	_csp_reflect180
L10288cea0:
    mov	x20, x0
L10288cea4:
    mov	x0, x21
L10288cea8:
    bl	_csp_release
L10288ceac:
    cbz	w20, L10288cec4
L10288ceb0:
    ldr	d0, [x19, #0x28]
L10288ceb4:
    adrp x8, Lconstant1042ef018@PAGE
L10288ceb8:
    ldr d1, [x8, Lconstant1042ef018@PAGEOFF]
L10288cebc:
    fsub	d0, d1, d0
L10288cec0:
    str	d0, [x19, #0x28]
L10288cec4:
    ldp	x29, x30, [sp, #0x60]
L10288cec8:
    ldp	x20, x19, [sp, #0x50]
L10288cecc:
    ldp	x22, x21, [sp, #0x40]
L10288ced0:
    ldp	x24, x23, [sp, #0x30]
L10288ced4:
    ldp	d9, d8, [sp, #0x20]
L10288ced8:
    add	sp, sp, #0x70
L10288cedc:
    ret
L10288cee0:
    b	L10288cee4
L10288cee4:
    mov	x19, x0
L10288cee8:
    mov	x0, x21
L10288ceec:
    bl	_csp_release
L10288cef0:
    mov	x0, x19
L10288cef4:
    bl	_csp_unexpected_throw
.p2align 2
.globl _csp_lookup
_csp_lookup:
L102217e30:
    fcvtzs	w8, d0
L102217e34:
    scvtf	d1, w8
L102217e38:
    fsub	d0, d0, d1
L102217e3c:
    adrp x9, Lconstant10451cbd8@PAGE
L102217e40:
    add x9, x9, Lconstant10451cbd8@PAGEOFF
L102217e44:
    add	x8, x9, w8, sxtw #3
L102217e48:
    ldp	d1, d2, [x8]
L102217e4c:
    fsub	d2, d2, d1
L102217e50:
    fmadd	d0, d2, d0, d1
L102217e54:
    ret
.section __TEXT,__const
.p2align 4
Lconstant1042e3690:
.byte 58,140,48,226,142,121,69,62
.p2align 4
Lconstant1044b80a0:
.byte 51,51,51,51,51,51,195,191
.p2align 4
Lconstant1042ecb78:
.byte 154,153,153,153,153,153,185,63
.p2align 4
Lconstant1042ef010:
.byte 0,0,0,0,0,128,86,64
.p2align 4
Lconstant104552918:
.byte 23,108,193,22,108,193,134,63
.p2align 4
Lconstant1042f30b8:
.byte 0,0,0,0,0,128,118,64
.p2align 4
Lconstant1042ef018:
.byte 0,0,0,0,0,128,102,64
.p2align 4
Lconstant10451cbd8:
.byte 0,0,0,0,0,0,0,0,27,221,137,43,11,223,145,63,43,220,247,201,88,222,161,63,9,201,239,72,199,203,170,63,40,81,106,109,143,219,177,63,4,129,194,184,214,79,182,63,74,87,60,155,96,194,186,63,177,98,79,76,212,50,191,63,9,158,141,150,108,208,193,63,122,83,168,103,11,6,196,63,125,115,11,126,26,58,198,63,86,98,118,221,109,108,200,63,234,88,66,172,217,156,202,63,117,198,205,54,50,203,204,63,39,185,228,242,75,247,206,63,149,6,147,193,125,144,208,63,38,142,50,221,10,164,209,63,204,213,131,207,55,182,210,63,72,233,47,55,239,198,211,63,225,205,0,208,27,214,212,63,250,11,138,116,168,227,213,63,55,211,206,31,128,239,214,63,129,150,229,238,141,249,215,63,175,255,152,34,189,1,217,63,205,26,6,33,249,7,218,63,75,152,55,119,45,12,219,63,193,5,190,218,69,14,220,63,5,222,68,43,46,14,221,63,124,80,36,116,210,11,222,63,236,160,239,237,30,7,223,63,0,0,0,0,0,0,224,63,18,223,253,32,49,123,224,63,43,221,172,62,25,245,224,63,28,119,112,215,174,109,225,63,20,253,17,132,232,228,225,63,120,73,124,248,188,90,226,63,93,90,117,4,35,207,226,63,180,190,85,148,17,66,227,63,54,201,189,177,127,179,227,63,194,122,72,132,100,35,228,63,26,22,60,82,183,145,228,63,210,79,56,129,111,254,228,63,214,11,226,150,132,105,229,63,39,156,140,57,238,210,229,63,14,115,224,48,164,58,230,63,200,59,127,102,158,160,230,63,55,77,165,230,212,4,231,63,126,105,200,224,63,103,231,63,192,190,51,168,215,199,231,63,55,28,161,180,148,38,232,63,57,80,207,162,111,131,232,63,41,163,21,53,97,222,232,63,210,99,244,83,98,55,233,63,22,122,162,14,108,142,233,63,164,244,151,155,119,227,233,63,73,135,21,89,126,54,234,63,167,238,168,205,121,135,234,63,220,47,174,168,99,214,234,63,69,169,205,194,53,35,235,63,219,234,118,30,234,109,235,63,174,76,88,232,122,182,235,63,200,57,211,119,226,252,235,63,8,39,109,79,27,65,236,63,110,44,61,29,32,131,236,63,202,56,86,187,235,194,236,63,104,215,45,48,121,0,237,63,150,127,255,174,195,59,237,63,108,102,44,152,198,116,237,63,84,203,151,121,125,171,237,63,7,184,255,14,228,223,237,63,24,45,82,66,246,17,238,63,204,180,254,43,176,65,238,63,3,85,68,19,14,111,238,63,27,219,123,110,12,154,238,63,129,123,94,227,167,194,238,63,18,191,72,71,221,232,238,63,33,186,121,159,169,12,239,63,13,135,78,33,10,46,239,63,131,0,122,50,252,76,239,63,194,182,56,105,125,105,239,63,23,28,129,140,139,131,239,63,94,228,47,148,36,155,239,63,119,148,48,169,70,176,239,63,139,62,162,37,240,194,239,63,195,103,248,148,31,211,239,63,166,21,24,180,211,224,239,63,244,255,112,113,11,236,239,63,31,230,18,237,197,244,239,63,105,5,191,120,2,251,239,63,136,175,245,151,192,254,239,63,0,0,0,0,0,0,240,63

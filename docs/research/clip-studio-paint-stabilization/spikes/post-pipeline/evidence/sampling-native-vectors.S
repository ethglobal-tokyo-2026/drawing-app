.section __TEXT,__text,regular,pure_instructions
.p2align 2
.globl _sample_distance
_sample_distance:
L10359b3b4:
    stp	d9, d8, [sp, #-0x40]!
L10359b3b8:
    stp	x22, x21, [sp, #0x10]
L10359b3bc:
    stp	x20, x19, [sp, #0x20]
L10359b3c0:
    stp	x29, x30, [sp, #0x30]
L10359b3c4:
    add	x29, sp, #0x30
L10359b3c8:
    mov	x19, x2
L10359b3cc:
    mov	x20, x0
L10359b3d0:
    subs	w8, w1, #0x1
L10359b3d4:
    b.lt	L10359b428
L10359b3d8:
    mov	x9, #0x0
L10359b3dc:
    mov	w21, #0x0
L10359b3e0:
    ldp	d0, d1, [x19]
L10359b3e4:
    mov	w10, w1
L10359b3e8:
    add	x11, x20, #0x8
L10359b3ec:
    mov	x12, #0x7fefffffffffffff
L10359b3f0:
    fmov	d2, x12
L10359b3f4:
    ldp	d3, d4, [x11, #-0x8]
L10359b3f8:
    fsub	d3, d3, d0
L10359b3fc:
    fsub	d4, d4, d1
L10359b400:
    fmul	d4, d4, d4
L10359b404:
    fmadd	d3, d3, d3, d4
L10359b408:
    fcmp	d3, d2
L10359b40c:
    csel	w21, w9, w21, mi
L10359b410:
    fcsel	d2, d3, d2, mi
L10359b414:
    add	x9, x9, #0x1
L10359b418:
    add	x11, x11, #0x10
L10359b41c:
    cmp	x10, x9
L10359b420:
    b.ne	L10359b3f4
L10359b424:
    b	L10359b42c
L10359b428:
    mov	w21, #0x0
L10359b42c:
    cmp	w21, w8
L10359b430:
    b.ge	L10359b450
L10359b434:
    add	x8, x20, w21, sxtw #4
L10359b438:
    ldp	d0, d1, [x8]
L10359b43c:
    ldp	d2, d3, [x8, #0x10]
L10359b440:
    ldp	d4, d5, [x19]
L10359b444:
    bl	_segment_distance
L10359b448:
    fmov	d8, d0
L10359b44c:
    b	L10359b458
L10359b450:
    mov	x8, #0x7fefffffffffffff
L10359b454:
    fmov	d8, x8
L10359b458:
    cmp	w21, #0x1
L10359b45c:
    b.lt	L10359b47c
L10359b460:
    add	x8, x20, w21, uxtw #4
L10359b464:
    ldp	d0, d1, [x8, #-0x10]
L10359b468:
    ldp	d2, d3, [x8]
L10359b46c:
    ldp	d4, d5, [x19]
L10359b470:
    bl	_segment_distance
L10359b474:
    fcmp	d0, d8
L10359b478:
    fcsel	d8, d0, d8, mi
L10359b47c:
    fmov	d0, d8
L10359b480:
    ldp	x29, x30, [sp, #0x30]
L10359b484:
    ldp	x20, x19, [sp, #0x20]
L10359b488:
    ldp	x22, x21, [sp, #0x10]
L10359b48c:
    ldp	d9, d8, [sp], #0x40
L10359b490:
    ret
.globl _sample_parameter
_sample_parameter:
L10359b240:
    sub	sp, sp, #0x70
L10359b244:
    stp	d11, d10, [sp, #0x10]
L10359b248:
    stp	d9, d8, [sp, #0x20]
L10359b24c:
    stp	x24, x23, [sp, #0x30]
L10359b250:
    stp	x22, x21, [sp, #0x40]
L10359b254:
    stp	x20, x19, [sp, #0x50]
L10359b258:
    stp	x29, x30, [sp, #0x60]
L10359b25c:
    add	x29, sp, #0x60
L10359b260:
    mov	x19, x3
L10359b264:
    mov	x20, x2
L10359b268:
    mov	x21, x0
L10359b26c:
    subs	w8, w1, #0x1
L10359b270:
    b.lt	L10359b2c4
L10359b274:
    mov	x9, #0x0
L10359b278:
    mov	w22, #0x0
L10359b27c:
    ldp	d0, d1, [x20]
L10359b280:
    mov	w10, w1
L10359b284:
    add	x11, x21, #0x8
L10359b288:
    mov	x12, #0x7fefffffffffffff
L10359b28c:
    fmov	d2, x12
L10359b290:
    ldp	d3, d4, [x11, #-0x8]
L10359b294:
    fsub	d3, d3, d0
L10359b298:
    fsub	d4, d4, d1
L10359b29c:
    fmul	d4, d4, d4
L10359b2a0:
    fmadd	d3, d3, d3, d4
L10359b2a4:
    fcmp	d3, d2
L10359b2a8:
    csel	w22, w9, w22, mi
L10359b2ac:
    fcsel	d2, d3, d2, mi
L10359b2b0:
    add	x9, x9, #0x1
L10359b2b4:
    add	x11, x11, #0x10
L10359b2b8:
    cmp	x10, x9
L10359b2bc:
    b.ne	L10359b290
L10359b2c0:
    b	L10359b2c8
L10359b2c4:
    mov	w22, #0x0
L10359b2c8:
    ldr	q0, [x21]
L10359b2cc:
    str	q0, [x19]
L10359b2d0:
    scvtf	d0, w8
L10359b2d4:
    fmov	d1, #1.00000000
L10359b2d8:
    fdiv	d8, d1, d0
L10359b2dc:
    cmp	w22, w8
L10359b2e0:
    b.ge	L10359b324
L10359b2e4:
    add	x8, x21, w22, sxtw #4
L10359b2e8:
    ldp	d0, d1, [x8]
L10359b2ec:
    ldp	d2, d3, [x8, #0x10]
L10359b2f0:
    ldp	d4, d5, [x20]
L10359b2f4:
    mov	x0, x19
L10359b2f8:
    bl	_segment_projection
L10359b2fc:
    ldp	d1, d2, [x19]
L10359b300:
    ldp	d3, d4, [x20]
L10359b304:
    fsub	d1, d1, d3
L10359b308:
    fsub	d2, d2, d4
L10359b30c:
    fmul	d2, d2, d2
L10359b310:
    fmadd	d10, d1, d1, d2
L10359b314:
    scvtf	d1, w22
L10359b318:
    fadd	d0, d0, d1
L10359b31c:
    fmul	d9, d8, d0
L10359b320:
    b	L10359b330
L10359b324:
    movi	d9, #0000000000000000
L10359b328:
    mov	x8, #0x7fefffffffffffff
L10359b32c:
    fmov	d10, x8
L10359b330:
    subs	w23, w22, #0x1
L10359b334:
    b.lt	L10359b388
L10359b338:
    add	x8, x21, w23, uxtw #4
L10359b33c:
    ldp	d0, d1, [x8]
L10359b340:
    add	x8, x21, w22, uxtw #4
L10359b344:
    ldp	d2, d3, [x8]
L10359b348:
    ldp	d4, d5, [x20]
L10359b34c:
    mov	x0, sp
L10359b350:
    bl	_segment_projection
L10359b354:
    ldp	d1, d2, [sp]
L10359b358:
    ldp	d3, d4, [x20]
L10359b35c:
    fsub	d1, d1, d3
L10359b360:
    fsub	d2, d2, d4
L10359b364:
    fmul	d2, d2, d2
L10359b368:
    fmadd	d1, d1, d1, d2
L10359b36c:
    fcmp	d1, d10
L10359b370:
    b.pl	L10359b388
L10359b374:
    ldr	q1, [sp]
L10359b378:
    str	q1, [x19]
L10359b37c:
    ucvtf	d1, w23
L10359b380:
    fadd	d0, d0, d1
L10359b384:
    fmul	d9, d8, d0
L10359b388:
    fmov	d0, #1.00000000
L10359b38c:
    fcmp	d9, d0
L10359b390:
    fcsel	d0, d0, d9, gt
L10359b394:
    ldp	x29, x30, [sp, #0x60]
L10359b398:
    ldp	x20, x19, [sp, #0x50]
L10359b39c:
    ldp	x22, x21, [sp, #0x40]
L10359b3a0:
    ldp	x24, x23, [sp, #0x30]
L10359b3a4:
    ldp	d9, d8, [sp, #0x20]
L10359b3a8:
    ldp	d11, d10, [sp, #0x10]
L10359b3ac:
    add	sp, sp, #0x70
L10359b3b0:
    ret
.globl _segment_distance
_segment_distance:
L102193940:
    fsub	d6, d2, d0
L102193944:
    fsub	d7, d3, d1
L102193948:
    fsub	d0, d4, d0
L10219394c:
    fsub	d1, d5, d1
L102193950:
    fmul	d16, d7, d1
L102193954:
    fmadd	d17, d6, d0, d16
L102193958:
    fcmp	d17, #0.0
L10219395c:
    b.ls	L102193998
L102193960:
    fmul	d16, d7, d7
L102193964:
    fmadd	d16, d6, d6, d16
L102193968:
    fcmp	d17, d16
L10219396c:
    b.ge	L102193990
L102193970:
    fnmul	d0, d0, d7
L102193974:
    fmadd	d2, d1, d6, d0
L102193978:
    fnmadd	d0, d1, d6, d0
L10219397c:
    fcmp	d2, #0.0
L102193980:
    fcsel	d0, d0, d2, mi
L102193984:
    fsqrt	d1, d16
L102193988:
    fdiv	d0, d0, d1
L10219398c:
    ret
L102193990:
    fsub	d0, d4, d2
L102193994:
    fsub	d1, d5, d3
L102193998:
    fmul	d1, d1, d1
L10219399c:
    fmadd	d0, d0, d0, d1
L1021939a0:
    fsqrt	d1, d0
L1021939a4:
    fcmp	d0, #0.0
L1021939a8:
    movi	d0, #0000000000000000
L1021939ac:
    fcsel	d0, d1, d0, ne
L1021939b0:
    ret
.globl _segment_projection
_segment_projection:
L1021944a8:
    fsub	d6, d2, d0
L1021944ac:
    fsub	d7, d3, d1
L1021944b0:
    fsub	d4, d4, d0
L1021944b4:
    fsub	d5, d5, d1
L1021944b8:
    fmul	d5, d7, d5
L1021944bc:
    fmadd	d4, d6, d4, d5
L1021944c0:
    fcmp	d4, #0.0
L1021944c4:
    b.ls	L102194500
L1021944c8:
    fmul	d5, d7, d7
L1021944cc:
    fmadd	d5, d6, d6, d5
L1021944d0:
    fcmp	d4, d5
L1021944d4:
    b.ge	L102194508
L1021944d8:
    fdiv	d4, d4, d5
L1021944dc:
    fmov	d5, #1.00000000
L1021944e0:
    fsub	d5, d5, d4
L1021944e4:
    fmul	d0, d0, d5
L1021944e8:
    fmul	d1, d1, d5
L1021944ec:
    fmul	d2, d2, d4
L1021944f0:
    fmul	d3, d3, d4
L1021944f4:
    fadd	d0, d2, d0
L1021944f8:
    fadd	d1, d3, d1
L1021944fc:
    b	L102194514
L102194500:
    movi	d4, #0000000000000000
L102194504:
    b	L102194514
L102194508:
    fmov	d4, #1.00000000
L10219450c:
    fmov	d0, d2
L102194510:
    fmov	d1, d3
L102194514:
    stp	d0, d1, [x0]
L102194518:
    fmov	d0, d4
L10219451c:
    ret
.globl _quadratic_samples
_quadratic_samples:
L10359c7f0:
    sub	sp, sp, #0x30
L10359c7f4:
    stp	x29, x30, [sp, #0x20]
L10359c7f8:
    add	x29, sp, #0x20
L10359c7fc:
    mov	x1, x0
L10359c800:
    fmov	d16, d5
L10359c804:
    fmov	d17, d4
L10359c808:
    ldr	d4, [x29, #0x10]
L10359c80c:
    stp	d7, d4, [sp, #0x8]
L10359c810:
    str	d6, [sp]
L10359c814:
    fmov	d4, d2
L10359c818:
    fmov	d5, d3
L10359c81c:
    fmov	d6, d17
L10359c820:
    fmov	d7, d16
L10359c824:
    mov	w0, #0x0
L10359c828:
    bl	_bezier_samples
L10359c82c:
    ldp	x29, x30, [sp, #0x20]
L10359c830:
    add	sp, sp, #0x30
L10359c834:
    ret
.globl _bezier_samples
_bezier_samples:
L10359c838:
    sub	sp, sp, #0x80
L10359c83c:
    stp	d15, d14, [sp, #0x20]
L10359c840:
    stp	d13, d12, [sp, #0x30]
L10359c844:
    stp	d11, d10, [sp, #0x40]
L10359c848:
    stp	d9, d8, [sp, #0x50]
L10359c84c:
    stp	x20, x19, [sp, #0x60]
L10359c850:
    stp	x29, x30, [sp, #0x70]
L10359c854:
    add	x29, sp, #0x70
L10359c858:
    mov	x19, x1
L10359c85c:
    mov	x20, x0
L10359c860:
    fmov	d8, d7
L10359c864:
    fmov	d9, d6
L10359c868:
    fmov	d11, d3
L10359c86c:
    fmov	d14, d2
L10359c870:
    fmov	d10, d1
L10359c874:
    fmov	d13, d0
L10359c878:
    ldr	d0, [x29, #0x20]
L10359c87c:
    str	d0, [sp, #0x8]
L10359c880:
    ldp	d0, d12, [x29, #0x10]
L10359c884:
    stp	d0, d5, [sp, #0x10]
L10359c888:
    fmov	d0, d13
L10359c88c:
    fmov	d15, d4
L10359c890:
    bl	_bezier_measure
L10359c894:
    ldr	d16, [sp, #0x8]
L10359c898:
    mov	x9, #0x0
L10359c89c:
    fabd	d1, d16, d12
L10359c8a0:
    fmul	d0, d1, d0
L10359c8a4:
    ldr	d1, [sp, #0x10]
L10359c8a8:
    fdiv	d0, d0, d1
L10359c8ac:
    fcvtzs	w8, d0
L10359c8b0:
    mov	w10, #0xff
L10359c8b4:
    cmp	w8, #0xff
L10359c8b8:
    csel	w8, w8, w10, lt
L10359c8bc:
    mov	w10, #0x4
L10359c8c0:
    cmp	w8, #0x4
L10359c8c4:
    csel	w8, w8, w10, gt
L10359c8c8:
    fsub	d0, d16, d12
L10359c8cc:
    ucvtf	d1, w8
L10359c8d0:
    fdiv	d0, d0, d1
L10359c8d4:
    fmov	d1, #1.00000000
L10359c8d8:
    fmov	d2, #3.00000000
L10359c8dc:
    fsub	d5, d1, d12
L10359c8e0:
    fmul	d4, d5, d5
L10359c8e4:
    fmul	d3, d12, d12
L10359c8e8:
    add	x10, x19, x9, lsl #4
L10359c8ec:
    cbz	w20, L10359c944
L10359c8f0:
    fmul	d4, d5, d4
L10359c8f4:
    fmul	d6, d5, d2
L10359c8f8:
    fmul	d5, d5, d6
L10359c8fc:
    fmul	d5, d12, d5
L10359c900:
    fmul	d6, d12, d6
L10359c904:
    fmul	d6, d12, d6
L10359c908:
    fmul	d3, d12, d3
L10359c90c:
    fmul	d7, d14, d5
L10359c910:
    fmadd	d7, d4, d13, d7
L10359c914:
    fmadd	d7, d6, d15, d7
L10359c918:
    fmadd	d7, d3, d9, d7
L10359c91c:
    fmul	d5, d11, d5
L10359c920:
    fmadd	d4, d4, d10, d5
L10359c924:
    ldr	d5, [sp, #0x18]
L10359c928:
    fmadd	d4, d6, d5, d4
L10359c92c:
    fmadd	d3, d3, d8, d4
L10359c930:
    stp	d7, d3, [x10]
L10359c934:
    add	x9, x9, #0x1
L10359c938:
    cmp	x9, x8
L10359c93c:
    b.ne	L10359c974
L10359c940:
    b	L10359c97c
L10359c944:
    fadd	d5, d5, d5
L10359c948:
    fmul	d5, d12, d5
L10359c94c:
    fmul	d6, d14, d5
L10359c950:
    fmadd	d6, d4, d13, d6
L10359c954:
    fmadd	d6, d3, d9, d6
L10359c958:
    fmul	d5, d11, d5
L10359c95c:
    fmadd	d4, d4, d10, d5
L10359c960:
    fmadd	d3, d3, d8, d4
L10359c964:
    stp	d6, d3, [x10]
L10359c968:
    add	x9, x9, #0x1
L10359c96c:
    cmp	x9, x8
L10359c970:
    b.eq	L10359c9d4
L10359c974:
    fadd	d12, d0, d12
L10359c978:
    b	L10359c8dc
L10359c97c:
    fmov	d0, #1.00000000
L10359c980:
    fsub	d0, d0, d16
L10359c984:
    fmul	d1, d0, d0
L10359c988:
    fmul	d1, d0, d1
L10359c98c:
    fmov	d2, #3.00000000
L10359c990:
    fmul	d2, d0, d2
L10359c994:
    fmul	d0, d0, d2
L10359c998:
    fmul	d3, d0, d16
L10359c99c:
    fmul	d0, d2, d16
L10359c9a0:
    fmul	d2, d0, d16
L10359c9a4:
    fmul	d0, d16, d16
L10359c9a8:
    fmul	d4, d0, d16
L10359c9ac:
    fmul	d0, d14, d3
L10359c9b0:
    fmadd	d0, d1, d13, d0
L10359c9b4:
    fmadd	d0, d2, d15, d0
L10359c9b8:
    fmadd	d0, d4, d9, d0
L10359c9bc:
    fmul	d3, d11, d3
L10359c9c0:
    fmadd	d1, d1, d10, d3
L10359c9c4:
    ldr	d3, [sp, #0x18]
L10359c9c8:
    fmadd	d1, d2, d3, d1
L10359c9cc:
    fmadd	d1, d4, d8, d1
L10359c9d0:
    b	L10359ca04
L10359c9d4:
    fmov	d0, #1.00000000
L10359c9d8:
    fsub	d0, d0, d16
L10359c9dc:
    fmul	d1, d0, d0
L10359c9e0:
    fadd	d0, d0, d0
L10359c9e4:
    fmul	d2, d0, d16
L10359c9e8:
    fmul	d3, d16, d16
L10359c9ec:
    fmul	d0, d14, d2
L10359c9f0:
    fmadd	d0, d1, d13, d0
L10359c9f4:
    fmadd	d0, d3, d9, d0
L10359c9f8:
    fmul	d2, d11, d2
L10359c9fc:
    fmadd	d1, d1, d10, d2
L10359ca00:
    fmadd	d1, d3, d8, d1
L10359ca04:
    add	x9, x19, x8, lsl #4
L10359ca08:
    stp	d0, d1, [x9]
L10359ca0c:
    add	w0, w8, #0x1
L10359ca10:
    ldp	x29, x30, [sp, #0x70]
L10359ca14:
    ldp	x20, x19, [sp, #0x60]
L10359ca18:
    ldp	d9, d8, [sp, #0x50]
L10359ca1c:
    ldp	d11, d10, [sp, #0x40]
L10359ca20:
    ldp	d13, d12, [sp, #0x30]
L10359ca24:
    ldp	d15, d14, [sp, #0x20]
L10359ca28:
    add	sp, sp, #0x80
L10359ca2c:
    ret
.globl _bezier_measure
_bezier_measure:
L10359c490:
    sub	sp, sp, #0x70
L10359c494:
    stp	d9, d8, [sp, #0x50]
L10359c498:
    stp	x29, x30, [sp, #0x60]
L10359c49c:
    add	x29, sp, #0x60
L10359c4a0:
    stp	d0, d1, [x29, #-0x20]
L10359c4a4:
    stp	d6, d7, [sp, #0x30]
L10359c4a8:
    fmov	d16, #0.37500000
L10359c4ac:
    fmul	d17, d2, d16
L10359c4b0:
    fmov	d18, #0.56250000
L10359c4b4:
    fmadd	d19, d0, d18, d17
L10359c4b8:
    mov	x8, #0x3fb0000000000000
L10359c4bc:
    fmov	d20, x8
L10359c4c0:
    fmadd	d19, d6, d20, d19
L10359c4c4:
    fmul	d21, d3, d16
L10359c4c8:
    fmadd	d22, d1, d18, d21
L10359c4cc:
    fmadd	d22, d7, d20, d22
L10359c4d0:
    fmov	d23, #0.50000000
L10359c4d4:
    fmul	d24, d2, d23
L10359c4d8:
    fmov	d25, #0.25000000
L10359c4dc:
    fmadd	d24, d0, d25, d24
L10359c4e0:
    fmadd	d24, d6, d25, d24
L10359c4e4:
    fmul	d23, d3, d23
L10359c4e8:
    fmadd	d23, d1, d25, d23
L10359c4ec:
    fmadd	d23, d7, d25, d23
L10359c4f0:
    fmadd	d25, d0, d20, d17
L10359c4f4:
    fmadd	d25, d6, d18, d25
L10359c4f8:
    fmadd	d20, d1, d20, d21
L10359c4fc:
    fmadd	d18, d7, d18, d20
L10359c500:
    fmov	d20, #0.42187500
L10359c504:
    fmul	d26, d2, d20
L10359c508:
    fmadd	d26, d0, d20, d26
L10359c50c:
    fmov	d27, #0.14062500
L10359c510:
    fmadd	d26, d4, d27, d26
L10359c514:
    mov	x8, #0x3f90000000000000
L10359c518:
    fmov	d28, x8
L10359c51c:
    fmadd	d26, d6, d28, d26
L10359c520:
    fmul	d29, d3, d20
L10359c524:
    fmadd	d29, d1, d20, d29
L10359c528:
    fmadd	d29, d5, d27, d29
L10359c52c:
    fmadd	d29, d7, d28, d29
L10359c530:
    fmov	d30, #0.12500000
L10359c534:
    fmadd	d17, d0, d30, d17
L10359c538:
    fmadd	d17, d4, d16, d17
L10359c53c:
    fmadd	d17, d6, d30, d17
L10359c540:
    fmadd	d21, d1, d30, d21
L10359c544:
    fmadd	d16, d5, d16, d21
L10359c548:
    fmadd	d16, d7, d30, d16
L10359c54c:
    fmul	d2, d2, d27
L10359c550:
    fmadd	d0, d0, d28, d2
L10359c554:
    fmadd	d0, d4, d20, d0
L10359c558:
    fmadd	d0, d6, d20, d0
L10359c55c:
    fmul	d2, d3, d27
L10359c560:
    fmadd	d1, d1, d28, d2
L10359c564:
    fmadd	d1, d5, d20, d1
L10359c568:
    fmadd	d1, d7, d20, d1
L10359c56c:
    cmp	w0, #0x0
L10359c570:
    fcsel	d2, d19, d26, eq
L10359c574:
    fcsel	d3, d22, d29, eq
L10359c578:
    fcsel	d4, d24, d17, eq
L10359c57c:
    fcsel	d5, d23, d16, eq
L10359c580:
    fcsel	d0, d25, d0, eq
L10359c584:
    cmp	w0, #0x0
L10359c588:
    stp	d2, d3, [sp, #0x20]
L10359c58c:
    stp	d4, d5, [sp, #0x10]
L10359c590:
    fcsel	d1, d18, d1, eq
L10359c594:
    stp	d0, d1, [sp]
L10359c598:
    sub	x0, x29, #0x20
L10359c59c:
    add	x1, sp, #0x20
L10359c5a0:
    bl	_point_distance
L10359c5a4:
    fmov	d8, d0
L10359c5a8:
    add	x0, sp, #0x20
L10359c5ac:
    add	x1, sp, #0x10
L10359c5b0:
    bl	_point_distance
L10359c5b4:
    fadd	d8, d8, d0
L10359c5b8:
    add	x0, sp, #0x10
L10359c5bc:
    mov	x1, sp
L10359c5c0:
    bl	_point_distance
L10359c5c4:
    fadd	d8, d8, d0
L10359c5c8:
    mov	x0, sp
L10359c5cc:
    add	x1, sp, #0x30
L10359c5d0:
    bl	_point_distance
L10359c5d4:
    fadd	d0, d8, d0
L10359c5d8:
    ldp	x29, x30, [sp, #0x60]
L10359c5dc:
    ldp	d9, d8, [sp, #0x50]
L10359c5e0:
    add	sp, sp, #0x70
L10359c5e4:
    ret
.globl _point_distance
_point_distance:
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

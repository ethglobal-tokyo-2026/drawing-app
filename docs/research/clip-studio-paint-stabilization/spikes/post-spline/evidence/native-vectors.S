.section __TEXT,__text,regular,pure_instructions
.p2align 2
.globl _csp_eval
_csp_eval:
L10359f580:
    ldp	d17, d16, [sp, #0x10]
L10359f584:
    ldr	d18, [sp, #0x20]
L10359f588:
    ldp	d20, d19, [sp]
L10359f58c:
    dup.2d	v21, v18[0]
L10359f590:
    fmov	d22, #0.50000000
L10359f594:
    fcmp	d18, d22
L10359f598:
    b.pl L10359f640
L10359f59c:
    adrp x8, Lconstant10458c660@PAGE
L10359f5a0:
    ldr q22, [x8, Lconstant10458c660@PAGEOFF]
L10359f5a4:
    adrp x8, Lconstant10458c670@PAGE
L10359f5a8:
    ldr q23, [x8, Lconstant10458c670@PAGEOFF]
L10359f5ac:
    fmla.2d	v23, v22, v21
L10359f5b0:
    adrp x8, Lconstant10458c690@PAGE
L10359f5b4:
    ldr d21, [x8, Lconstant10458c690@PAGEOFF]
L10359f5b8:
    fmul	d21, d18, d21
L10359f5bc:
    adrp x8, Lconstant10458c6a8@PAGE
L10359f5c0:
    ldr d22, [x8, Lconstant10458c6a8@PAGEOFF]
L10359f5c4:
    fmadd	d21, d21, d18, d22
L10359f5c8:
    mov	x8, #0x4051000000000000
L10359f5cc:
    fmov	d22, x8
L10359f5d0:
    mov	x8, #0x4058000000000000
L10359f5d4:
    fmov	d24, x8
L10359f5d8:
    fmadd	d22, d18, d24, d22
L10359f5dc:
    fmul	d22, d22, d18
L10359f5e0:
    fmov	d24, #-12.00000000
L10359f5e4:
    fmov	d25, #-16.00000000
L10359f5e8:
    fmadd	d24, d18, d25, d24
L10359f5ec:
    fmul	d24, d24, d18
L10359f5f0:
    fmul.2d	v23, v23, v18[0]
L10359f5f4:
    mov.d	v1[1], v2[0]
L10359f5f8:
    fmul.2d	v1, v1, v23
L10359f5fc:
    mov.d	v0[1], v3[0]
L10359f600:
    fmul.2d	v0, v0, v23
L10359f604:
    ext.16b	v0, v0, v0, #0x8
L10359f608:
    fadd.2d	v0, v1, v0
L10359f60c:
    mov.d	v5[1], v4[0]
L10359f610:
    fmul.2d	v1, v5, v21[0]
L10359f614:
    fadd.2d	v0, v1, v0
L10359f618:
    mov.d	v7[1], v6[0]
L10359f61c:
    fmul.2d	v1, v7, v22[0]
L10359f620:
    mov.d	v19[1], v20[0]
L10359f624:
    fadd.2d	v0, v1, v0
L10359f628:
    fmul.2d	v1, v19, v24[0]
L10359f62c:
    fadd.2d	v0, v1, v0
L10359f630:
    fmov	d1, #2.00000000
L10359f634:
    fmadd	d1, d18, d1, d1
L10359f638:
    fmul	d1, d1, d18
L10359f63c:
    b L10359f728
L10359f640:
    adrp x8, Lconstant10458c630@PAGE
L10359f644:
    ldr q22, [x8, Lconstant10458c630@PAGEOFF]
L10359f648:
    fmul.2d	v22, v22, v18[0]
L10359f64c:
    adrp x8, Lconstant10458c640@PAGE
L10359f650:
    ldr q23, [x8, Lconstant10458c640@PAGEOFF]
L10359f654:
    fmul.2d	v23, v23, v18[0]
L10359f658:
    mov	x8, #0x4058000000000000
L10359f65c:
    fmov	d24, x8
L10359f660:
    fmul	d24, d18, d24
L10359f664:
    adrp x8, Lconstant10458c680@PAGE
L10359f668:
    ldr d25, [x8, Lconstant10458c680@PAGEOFF]
L10359f66c:
    fmul	d25, d18, d25
L10359f670:
    fmadd	d25, d24, d18, d25
L10359f674:
    adrp x8, Lconstant10458c688@PAGE
L10359f678:
    ldr d26, [x8, Lconstant10458c688@PAGEOFF]
L10359f67c:
    fadd	d25, d25, d26
L10359f680:
    adrp x8, Lconstant10458c690@PAGE
L10359f684:
    ldr d26, [x8, Lconstant10458c690@PAGEOFF]
L10359f688:
    fmul	d26, d18, d26
L10359f68c:
    adrp x8, Lconstant10458c698@PAGE
L10359f690:
    ldr d27, [x8, Lconstant10458c698@PAGEOFF]
L10359f694:
    fmul	d27, d18, d27
L10359f698:
    fmadd	d26, d26, d18, d27
L10359f69c:
    adrp x8, Lconstant10458c6a0@PAGE
L10359f6a0:
    ldr d27, [x8, Lconstant10458c6a0@PAGEOFF]
L10359f6a4:
    fadd	d26, d26, d27
L10359f6a8:
    mov	x8, #-0x3fa1000000000000
L10359f6ac:
    fmov	d27, x8
L10359f6b0:
    fmul	d27, d18, d27
L10359f6b4:
    fmadd	d24, d24, d18, d27
L10359f6b8:
    fmov	d27, #28.00000000
L10359f6bc:
    fadd	d24, d24, d27
L10359f6c0:
    fmla.2d	v23, v21, v22
L10359f6c4:
    adrp x8, Lconstant10458c650@PAGE
L10359f6c8:
    ldr q21, [x8, Lconstant10458c650@PAGEOFF]
L10359f6cc:
    fadd.2d	v21, v23, v21
L10359f6d0:
    mov.d	v1[1], v2[0]
L10359f6d4:
    fmul.2d	v1, v1, v21
L10359f6d8:
    mov.d	v0[1], v3[0]
L10359f6dc:
    fmul.2d	v0, v0, v21
L10359f6e0:
    ext.16b	v0, v0, v0, #0x8
L10359f6e4:
    mov.d	v5[1], v4[0]
L10359f6e8:
    fadd.2d	v0, v1, v0
L10359f6ec:
    fmul.2d	v1, v5, v25[0]
L10359f6f0:
    fadd.2d	v0, v1, v0
L10359f6f4:
    mov.d	v7[1], v6[0]
L10359f6f8:
    fmul.2d	v1, v7, v26[0]
L10359f6fc:
    fadd.2d	v0, v1, v0
L10359f700:
    mov.d	v19[1], v20[0]
L10359f704:
    fmul.2d	v1, v19, v24[0]
L10359f708:
    fadd.2d	v0, v1, v0
L10359f70c:
    fmov	d1, #-14.00000000
L10359f710:
    fmul	d1, d18, d1
L10359f714:
    fmov	d2, #18.00000000
L10359f718:
    fmul	d2, d18, d2
L10359f71c:
    fmadd	d1, d1, d18, d2
L10359f720:
    fmov	d2, #-4.00000000
L10359f724:
    fadd	d1, d1, d2
L10359f728:
    mov.d	v16[1], v17[0]
L10359f72c:
    fmul.2d	v1, v16, v1[0]
L10359f730:
    fadd.2d	v0, v1, v0
L10359f734:
    mov	x8, #0xc00000000000
L10359f738:
    movk	x8, #0x4058, lsl #48
L10359f73c:
    dup.2d	v1, x8
L10359f740:
    fdiv.2d	v1, v0, v1
L10359f744:
    mov	d0, v1[1]
L10359f748:
    ret
.globl _csp_neighbor
_csp_neighbor:
L10359f8d4:
    ldp	d2, d4, [x2]
L10359f8d8:
    ldp	d1, d0, [x0]
L10359f8dc:
    fsub	d3, d2, d1
L10359f8e0:
    fsub	d2, d4, d0
L10359f8e4:
    fmul	d4, d2, d2
L10359f8e8:
    fmadd	d4, d3, d3, d4
L10359f8ec:
    mov	x8, #0x4059000000000000
L10359f8f0:
    fmov	d5, x8
L10359f8f4:
    fcmp	d4, d5
L10359f8f8:
    b.mi L10359f948
L10359f8fc:
    ldp	d5, d6, [x1]
L10359f900:
    fsub	d5, d1, d5
L10359f904:
    fsub	d6, d0, d6
L10359f908:
    fmul	d6, d6, d6
L10359f90c:
    fmadd	d5, d5, d5, d6
L10359f910:
    fmov	d6, #6.25000000
L10359f914:
    fmul	d5, d5, d6
L10359f918:
    fcmp	d4, d5
L10359f91c:
    b.mi L10359f948
L10359f920:
    fsqrt	d6, d5
L10359f924:
    fmov	d7, x8
L10359f928:
    fcmp	d5, d7
L10359f92c:
    fmov	d5, #10.00000000
L10359f930:
    fcsel	d5, d6, d5, gt
L10359f934:
    fsqrt	d4, d4
L10359f938:
    fdiv	d4, d5, d4
L10359f93c:
    fmadd	d1, d3, d4, d1
L10359f940:
    fmadd	d0, d2, d4, d0
L10359f944:
    stp	d1, d0, [x2]
L10359f948:
    ret
.globl _csp_measure
_csp_measure:
L10359fd24:
    sub	sp, sp, #0x70
L10359fd28:
    stp	d9, d8, [sp, #0x50]
L10359fd2c:
    stp	x29, x30, [sp, #0x60]
L10359fd30:
    add	x29, sp, #0x60
L10359fd34:
    ldr	d16, [x29, #0x20]
L10359fd38:
    ldr	d17, [x29, #0x10]
L10359fd3c:
    stp	d4, d5, [x29, #-0x20]
L10359fd40:
    stp	d6, d7, [sp, #0x30]
L10359fd44:
    mov.d	v0[1], v1[0]
L10359fd48:
    fmov.2d	v1, #1.62500000
L10359fd4c:
    fmul.2d	v18, v0, v1
L10359fd50:
    mov.d	v2[1], v3[0]
L10359fd54:
    fmov.2d	v3, #11.00000000
L10359fd58:
    fmul.2d	v19, v2, v3
L10359fd5c:
    fsub.2d	v18, v18, v19
L10359fd60:
    mov.d	v4[1], v5[0]
L10359fd64:
    mov	x8, #0x300000000000
L10359fd68:
    movk	x8, #0x4056, lsl #48
L10359fd6c:
    dup.2d	v5, x8
L10359fd70:
    fmul.2d	v19, v4, v5
L10359fd74:
    fadd.2d	v18, v19, v18
L10359fd78:
    mov.d	v6[1], v7[0]
L10359fd7c:
    fmov.2d	v7, #23.00000000
L10359fd80:
    fmul.2d	v19, v6, v7
L10359fd84:
    fadd.2d	v18, v19, v18
L10359fd88:
    add	x8, x29, #0x18
L10359fd8c:
    ld1.d	{ v17 }[1], [x8]
L10359fd90:
    fmov.2d	v19, #4.00000000
L10359fd94:
    fmul.2d	v20, v17, v19
L10359fd98:
    fsub.2d	v18, v18, v20
L10359fd9c:
    add	x8, x29, #0x28
L10359fda0:
    ld1.d	{ v16 }[1], [x8]
L10359fda4:
    fmov.2d	v20, #0.62500000
L10359fda8:
    fmul.2d	v21, v16, v20
L10359fdac:
    fadd.2d	v18, v21, v18
L10359fdb0:
    mov	x8, #0xc00000000000
L10359fdb4:
    movk	x8, #0x4058, lsl #48
L10359fdb8:
    dup.2d	v21, x8
L10359fdbc:
    fdiv.2d	v26, v18, v21
L10359fdc0:
    fmov.2d	v18, #1.50000000
L10359fdc4:
    fmul.2d	v22, v0, v18
L10359fdc8:
    fmov.2d	v23, #10.00000000
L10359fdcc:
    fmul.2d	v24, v2, v23
L10359fdd0:
    mov	x8, #0x404d000000000000
L10359fdd4:
    dup.2d	v25, x8
L10359fdd8:
    fsub.2d	v22, v22, v24
L10359fddc:
    fmul.2d	v24, v4, v25
L10359fde0:
    fadd.2d	v22, v24, v22
L10359fde4:
    fmul.2d	v24, v6, v25
L10359fde8:
    fadd.2d	v22, v24, v22
L10359fdec:
    fmul.2d	v23, v17, v23
L10359fdf0:
    fsub.2d	v22, v22, v23
L10359fdf4:
    fmul.2d	v18, v16, v18
L10359fdf8:
    fadd.2d	v18, v18, v22
L10359fdfc:
    fdiv.2d	v18, v18, v21
L10359fe00:
    stp	q18, q26, [sp, #0x10]
L10359fe04:
    fmul.2d	v0, v0, v20
L10359fe08:
    fmul.2d	v2, v2, v19
L10359fe0c:
    fsub.2d	v0, v0, v2
L10359fe10:
    fmul.2d	v2, v4, v7
L10359fe14:
    fadd.2d	v0, v2, v0
L10359fe18:
    fmul.2d	v2, v6, v5
L10359fe1c:
    fadd.2d	v0, v2, v0
L10359fe20:
    fmul.2d	v2, v17, v3
L10359fe24:
    fsub.2d	v0, v0, v2
L10359fe28:
    fmul.2d	v1, v16, v1
L10359fe2c:
    fadd.2d	v0, v1, v0
L10359fe30:
    fdiv.2d	v0, v0, v21
L10359fe34:
    str	q0, [sp]
L10359fe38:
    sub	x0, x29, #0x20
L10359fe3c:
    add	x1, sp, #0x20
L10359fe40:
    bl _csp_distance
L10359fe44:
    fmov	d8, d0
L10359fe48:
    add	x0, sp, #0x20
L10359fe4c:
    add	x1, sp, #0x10
L10359fe50:
    bl _csp_distance
L10359fe54:
    fadd	d8, d8, d0
L10359fe58:
    add	x0, sp, #0x10
L10359fe5c:
    mov	x1, sp
L10359fe60:
    bl _csp_distance
L10359fe64:
    fadd	d8, d8, d0
L10359fe68:
    mov	x0, sp
L10359fe6c:
    add	x1, sp, #0x30
L10359fe70:
    bl _csp_distance
L10359fe74:
    fadd	d0, d8, d0
L10359fe78:
    ldp	x29, x30, [sp, #0x60]
L10359fe7c:
    ldp	d9, d8, [sp, #0x50]
L10359fe80:
    add	sp, sp, #0x70
L10359fe84:
    ret
.globl _csp_sample
_csp_sample:
L1035a01c0:
    sub	sp, sp, #0xe0
L1035a01c4:
    stp	d15, d14, [sp, #0x60]
L1035a01c8:
    stp	d13, d12, [sp, #0x70]
L1035a01cc:
    stp	d11, d10, [sp, #0x80]
L1035a01d0:
    stp	d9, d8, [sp, #0x90]
L1035a01d4:
    stp	x28, x27, [sp, #0xa0]
L1035a01d8:
    stp	x22, x21, [sp, #0xb0]
L1035a01dc:
    stp	x20, x19, [sp, #0xc0]
L1035a01e0:
    stp	x29, x30, [sp, #0xd0]
L1035a01e4:
    add	x29, sp, #0xd0
L1035a01e8:
    mov	x19, x0
L1035a01ec:
    ldp	d18, d19, [x29, #0x20]
L1035a01f0:
    ldp	d16, d17, [x29, #0x10]
L1035a01f4:
    ldp	d12, d13, [x29, #0x38]
L1035a01f8:
    ldr	d20, [x29, #0x30]
L1035a01fc:
    stp	d20, d19, [sp, #0x28]
L1035a0200:
    stp	d18, d19, [sp, #0x10]
L1035a0204:
    stp	d18, d17, [sp, #0x38]
L1035a0208:
    stp	d16, d17, [sp]
L1035a020c:
    stp	d16, d0, [sp, #0x48]
L1035a0210:
    str	d1, [sp, #0x58]
L1035a0214:
    fmov	d11, d2
L1035a0218:
    fmov	d10, d3
L1035a021c:
    fmov	d9, d4
L1035a0220:
    fmov	d8, d5
L1035a0224:
    fmov	d15, d6
L1035a0228:
    fmov	d14, d7
L1035a022c:
    bl _csp_measure
L1035a0230:
    fabd	d1, d13, d12
L1035a0234:
    fmul	d0, d1, d0
L1035a0238:
    ldr	d1, [sp, #0x28]
L1035a023c:
    fdiv	d0, d0, d1
L1035a0240:
    fcvtzs	w8, d0
L1035a0244:
    str	d13, [sp, #0x28]
L1035a0248:
    fsub	d0, d13, d12
L1035a024c:
    mov	w9, #0xff
L1035a0250:
    cmp	w8, #0xff
L1035a0254:
    csel	w8, w8, w9, lt
L1035a0258:
    mov	w9, #0x4
L1035a025c:
    cmp	w8, #0x4
L1035a0260:
    csel	w20, w8, w9, gt
L1035a0264:
    ucvtf	d1, w20
L1035a0268:
    fdiv	d13, d0, d1
L1035a026c:
    add	x21, x19, #0x8
L1035a0270:
    mov	x22, x20
L1035a0274:
    ldp	d1, d2, [sp, #0x30]
L1035a0278:
    stp	d1, d12, [sp, #0x18]
L1035a027c:
    ldp	d1, d0, [sp, #0x40]
L1035a0280:
    stp	d1, d2, [sp, #0x8]
L1035a0284:
    str	d0, [sp]
L1035a0288:
    ldp	d0, d1, [sp, #0x50]
L1035a028c:
    fmov	d2, d11
L1035a0290:
    fmov	d3, d10
L1035a0294:
    fmov	d4, d9
L1035a0298:
    fmov	d5, d8
L1035a029c:
    fmov	d6, d15
L1035a02a0:
    fmov	d7, d14
L1035a02a4:
    bl _csp_eval
L1035a02a8:
    stp	d0, d1, [x21, #-0x8]
L1035a02ac:
    fadd	d12, d13, d12
L1035a02b0:
    add	x21, x21, #0x10
L1035a02b4:
    subs	x22, x22, #0x1
L1035a02b8:
    b.ne L1035a0274
L1035a02bc:
    ldp	d1, d0, [sp, #0x28]
L1035a02c0:
    stp	d0, d1, [sp, #0x18]
L1035a02c4:
    ldp	d1, d0, [sp, #0x38]
L1035a02c8:
    stp	d0, d1, [sp, #0x8]
L1035a02cc:
    ldp	d1, d0, [sp, #0x48]
L1035a02d0:
    str	d1, [sp]
L1035a02d4:
    ldr	d1, [sp, #0x58]
L1035a02d8:
    fmov	d2, d11
L1035a02dc:
    fmov	d3, d10
L1035a02e0:
    fmov	d4, d9
L1035a02e4:
    fmov	d5, d8
L1035a02e8:
    fmov	d6, d15
L1035a02ec:
    fmov	d7, d14
L1035a02f0:
    bl _csp_eval
L1035a02f4:
    add	x8, x19, x20, lsl #4
L1035a02f8:
    stp	d0, d1, [x8]
L1035a02fc:
    add	w0, w20, #0x1
L1035a0300:
    ldp	x29, x30, [sp, #0xd0]
L1035a0304:
    ldp	x20, x19, [sp, #0xc0]
L1035a0308:
    ldp	x22, x21, [sp, #0xb0]
L1035a030c:
    ldp	x28, x27, [sp, #0xa0]
L1035a0310:
    ldp	d9, d8, [sp, #0x90]
L1035a0314:
    ldp	d11, d10, [sp, #0x80]
L1035a0318:
    ldp	d13, d12, [sp, #0x70]
L1035a031c:
    ldp	d15, d14, [sp, #0x60]
L1035a0320:
    add	sp, sp, #0xe0
L1035a0324:
    ret
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
.globl _csp_quadratic_eval
_csp_quadratic_eval:
L10359bc34:
    fmov	d7, #1.00000000
L10359bc38:
    fsub	d7, d7, d6
L10359bc3c:
    fmul	d16, d7, d7
L10359bc40:
    fadd	d7, d7, d7
L10359bc44:
    fmul	d7, d7, d6
L10359bc48:
    fmul	d6, d6, d6
L10359bc4c:
    fmul	d2, d2, d7
L10359bc50:
    fmadd	d0, d16, d0, d2
L10359bc54:
    fmadd	d0, d6, d4, d0
L10359bc58:
    fmul	d2, d3, d7
L10359bc5c:
    fmadd	d1, d16, d1, d2
L10359bc60:
    fmadd	d1, d6, d5, d1
L10359bc64:
    ret
.globl _csp_quadratic_split
_csp_quadratic_split:
L10359d408:
    fmov	d7, #1.00000000
L10359d40c:
    fsub	d7, d7, d6
L10359d410:
    fmul	d0, d0, d7
L10359d414:
    fmul	d1, d1, d7
L10359d418:
    fmul	d16, d2, d6
L10359d41c:
    fmul	d17, d3, d6
L10359d420:
    fadd	d0, d16, d0
L10359d424:
    fadd	d1, d17, d1
L10359d428:
    mov.d	v2[1], v3[0]
L10359d42c:
    stp	d0, d1, [x0]
L10359d430:
    fmul.2d	v0, v2, v7[0]
L10359d434:
    mov.d	v4[1], v5[0]
L10359d438:
    fmul.2d	v1, v4, v6[0]
L10359d43c:
    fadd.2d	v0, v1, v0
L10359d440:
    str	q0, [x2]
L10359d444:
    ldr	q1, [x0]
L10359d448:
    fmul.2d	v1, v1, v7[0]
L10359d44c:
    fmul.2d	v0, v0, v6[0]
L10359d450:
    fadd.2d	v0, v0, v1
L10359d454:
    str	q0, [x1]
L10359d458:
    ret
.globl _csp_quadratic_length
_csp_quadratic_length:
L10359c378:
    mov	x1, x0
L10359c37c:
    fmov	d7, d5
L10359c380:
    fmov	d6, d4
L10359c384:
    fmov	d4, d2
L10359c388:
    fmov	d5, d3
L10359c38c:
    mov	w0, #0x0
L10359c390:
    b _csp_bezier_length
.globl _csp_bezier_length
_csp_bezier_length:
L10359c394:
    stp	d15, d14, [sp, #-0x60]!
L10359c398:
    stp	d13, d12, [sp, #0x10]
L10359c39c:
    stp	d11, d10, [sp, #0x20]
L10359c3a0:
    stp	d9, d8, [sp, #0x30]
L10359c3a4:
    stp	x20, x19, [sp, #0x40]
L10359c3a8:
    stp	x29, x30, [sp, #0x50]
L10359c3ac:
    add	x29, sp, #0x50
L10359c3b0:
    mov	x20, x1
L10359c3b4:
    mov	x19, x0
L10359c3b8:
    fmov	d8, d7
L10359c3bc:
    fmov	d9, d6
L10359c3c0:
    fmov	d10, d5
L10359c3c4:
    fmov	d11, d4
L10359c3c8:
    fmov	d12, d3
L10359c3cc:
    fmov	d13, d2
L10359c3d0:
    fmov	d14, d1
L10359c3d4:
    fmov	d15, d0
L10359c3d8:
    bl _csp_bezier_measure
L10359c3dc:
    cmp	w20, #0x0
L10359c3e0:
    fmov	d1, #0.50000000
L10359c3e4:
    fmov	d2, #4.00000000
L10359c3e8:
    fcsel	d1, d2, d1, eq
L10359c3ec:
    fdiv	d1, d0, d1
L10359c3f0:
    fcvtzs	w8, d1
L10359c3f4:
    cmp	w8, #0x5
L10359c3f8:
    b.ge L10359c418
L10359c3fc:
    ldp	x29, x30, [sp, #0x50]
L10359c400:
    ldp	x20, x19, [sp, #0x40]
L10359c404:
    ldp	d9, d8, [sp, #0x30]
L10359c408:
    ldp	d11, d10, [sp, #0x20]
L10359c40c:
    ldp	d13, d12, [sp, #0x10]
L10359c410:
    ldp	d15, d14, [sp], #0x60
L10359c414:
    ret
L10359c418:
    mov	w9, #0xff
L10359c41c:
    cmp	w8, #0xff
L10359c420:
    csel	w9, w8, w9, lo
L10359c424:
    cmp	w20, #0x0
L10359c428:
    csel	w1, w9, w8, eq
L10359c42c:
    fmov	d0, d15
L10359c430:
    fmov	d1, d14
L10359c434:
    fmov	d2, d13
L10359c438:
    fmov	d3, d12
L10359c43c:
    fmov	d4, d11
L10359c440:
    fmov	d5, d10
L10359c444:
    fmov	d6, d9
L10359c448:
    fmov	d7, d8
L10359c44c:
    mov	x0, x19
L10359c450:
    ldp	x29, x30, [sp, #0x50]
L10359c454:
    ldp	x20, x19, [sp, #0x40]
L10359c458:
    ldp	d9, d8, [sp, #0x30]
L10359c45c:
    ldp	d11, d10, [sp, #0x20]
L10359c460:
    ldp	d13, d12, [sp, #0x10]
L10359c464:
    ldp	d15, d14, [sp], #0x60
L10359c468:
    b _csp_bezier_sampled_length
.globl _csp_bezier_measure
_csp_bezier_measure:
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
    bl _csp_distance
L10359c5a4:
    fmov	d8, d0
L10359c5a8:
    add	x0, sp, #0x20
L10359c5ac:
    add	x1, sp, #0x10
L10359c5b0:
    bl _csp_distance
L10359c5b4:
    fadd	d8, d8, d0
L10359c5b8:
    add	x0, sp, #0x10
L10359c5bc:
    mov	x1, sp
L10359c5c0:
    bl _csp_distance
L10359c5c4:
    fadd	d8, d8, d0
L10359c5c8:
    mov	x0, sp
L10359c5cc:
    add	x1, sp, #0x30
L10359c5d0:
    bl _csp_distance
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
.globl _csp_bezier_sampled_length
_csp_bezier_sampled_length:
L10359c60c:
    sub	sp, sp, #0xa0
L10359c610:
    stp	d15, d14, [sp, #0x40]
L10359c614:
    stp	d13, d12, [sp, #0x50]
L10359c618:
    stp	d11, d10, [sp, #0x60]
L10359c61c:
    stp	d9, d8, [sp, #0x70]
L10359c620:
    stp	x20, x19, [sp, #0x80]
L10359c624:
    stp	x29, x30, [sp, #0x90]
L10359c628:
    add	x29, sp, #0x90
L10359c62c:
    stp	d0, d1, [sp, #0x30]
L10359c630:
    cmp	w1, #0x1
L10359c634:
    b.lt L10359c724
L10359c638:
    mov	x19, x1
L10359c63c:
    mov	x20, x0
L10359c640:
    fmov	d9, d7
L10359c644:
    fmov	d12, d6
L10359c648:
    fmov	d13, d4
L10359c64c:
    fmov	d14, d3
L10359c650:
    fmov	d15, d2
L10359c654:
    fmov	d10, d1
L10359c658:
    fmov	d8, d0
L10359c65c:
    scvtf	d0, w1
L10359c660:
    fmov	d16, #1.00000000
L10359c664:
    fdiv	d11, d16, d0
L10359c668:
    movi	d16, #0000000000000000
L10359c66c:
    stp	d11, d5, [sp, #0x8]
L10359c670:
    str	d16, [sp, #0x18]
L10359c674:
    fmov	d0, #1.00000000
L10359c678:
    fsub	d0, d0, d11
L10359c67c:
    fmul	d21, d0, d0
L10359c680:
    fadd	d16, d0, d0
L10359c684:
    fmul	d19, d11, d16
L10359c688:
    fmul	d17, d11, d11
L10359c68c:
    fmul	d16, d15, d19
L10359c690:
    fmadd	d16, d21, d8, d16
L10359c694:
    fmadd	d18, d17, d12, d16
L10359c698:
    fmul	d16, d14, d19
L10359c69c:
    fmadd	d16, d21, d10, d16
L10359c6a0:
    fmadd	d20, d17, d9, d16
L10359c6a4:
    fmul	d21, d0, d21
L10359c6a8:
    fmov	d16, #3.00000000
L10359c6ac:
    fmul	d16, d0, d16
L10359c6b0:
    fmul	d0, d0, d16
L10359c6b4:
    fmul	d0, d11, d0
L10359c6b8:
    fmul	d16, d11, d16
L10359c6bc:
    fmul	d16, d11, d16
L10359c6c0:
    fmul	d19, d11, d17
L10359c6c4:
    fmul	d17, d15, d0
L10359c6c8:
    fmadd	d17, d21, d8, d17
L10359c6cc:
    fmadd	d17, d16, d13, d17
L10359c6d0:
    fmadd	d17, d19, d12, d17
L10359c6d4:
    fmul	d0, d14, d0
L10359c6d8:
    fmadd	d0, d21, d10, d0
L10359c6dc:
    fmadd	d0, d16, d5, d0
L10359c6e0:
    fmadd	d0, d19, d9, d0
L10359c6e4:
    cmp	w20, #0x0
L10359c6e8:
    fcsel	d16, d18, d17, eq
L10359c6ec:
    fcsel	d0, d20, d0, eq
L10359c6f0:
    stp	d16, d0, [sp, #0x20]
L10359c6f4:
    add	x0, sp, #0x30
L10359c6f8:
    add	x1, sp, #0x20
L10359c6fc:
    bl _csp_distance
L10359c700:
    ldp	d5, d16, [sp, #0x10]
L10359c704:
    fadd	d16, d16, d0
L10359c708:
    ldr	q0, [sp, #0x20]
L10359c70c:
    str	q0, [sp, #0x30]
L10359c710:
    ldr	d0, [sp, #0x8]
L10359c714:
    fadd	d11, d0, d11
L10359c718:
    subs	w19, w19, #0x1
L10359c71c:
    b.ne L10359c670
L10359c720:
    b L10359c728
L10359c724:
    movi	d16, #0000000000000000
L10359c728:
    fmov	d0, d16
L10359c72c:
    ldp	x29, x30, [sp, #0x90]
L10359c730:
    ldp	x20, x19, [sp, #0x80]
L10359c734:
    ldp	d9, d8, [sp, #0x70]
L10359c738:
    ldp	d11, d10, [sp, #0x60]
L10359c73c:
    ldp	d13, d12, [sp, #0x50]
L10359c740:
    ldp	d15, d14, [sp, #0x40]
L10359c744:
    add	sp, sp, #0xa0
L10359c748:
    ret
.section __TEXT,__const
.p2align 4
Lconstant10458c630:
.byte 0,0,0,0,0,0,0,64,0,0,0,0,0,0,48,192
.p2align 4
Lconstant10458c640:
.byte 0,0,0,0,0,0,24,192,0,0,0,0,0,0,70,64
.p2align 4
Lconstant10458c650:
.byte 0,0,0,0,0,0,16,64,0,0,0,0,0,0,60,192
.p2align 4
Lconstant10458c660:
.byte 0,0,0,0,0,0,44,192,0,0,0,0,0,0,88,64
.p2align 4
Lconstant10458c670:
.byte 0,0,0,0,0,0,36,64,0,0,0,0,0,0,81,192
.p2align 4
Lconstant10458c680:
.byte 0,0,0,0,0,64,112,192
.p2align 4
Lconstant10458c688:
.byte 0,0,0,0,0,128,100,64
.p2align 4
Lconstant10458c690:
.byte 0,0,0,0,0,128,100,192
.p2align 4
Lconstant10458c698:
.byte 0,0,0,0,0,128,116,64
.p2align 4
Lconstant10458c6a0:
.byte 0,0,0,0,0,64,80,192
.p2align 4
Lconstant10458c6a8:
.byte 0,0,0,0,0,192,88,64

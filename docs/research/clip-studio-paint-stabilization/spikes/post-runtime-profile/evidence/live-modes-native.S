.text
.p2align 2
.globl _csp_configure
_csp_configure:
L1021366bc:
    str	w1, [x0, #0x3c]
L1021366c0:
    str	w2, [x0, #0x68]
L1021366c4:
    str	w1, [x0, #0x50]
L1021366c8:
    mov	x8, x1
L1021366cc:
    cmp	w1, #0x3
L1021366d0:
    b.lt	L102136704
L1021366d4:
    cmp	w1, w2
L1021366d8:
    csel	w8, w1, w2, lt
L1021366dc:
    asr	w8, w8, #1
L1021366e0:
    str	w8, [x0, #0x50]
L1021366e4:
    cmp	w8, #0xf
L1021366e8:
    b.le	L1021366f4
L1021366ec:
    mov	w8, #0xf
L1021366f0:
    b	L102136700
L1021366f4:
    cmp	w8, #0x1
L1021366f8:
    b.gt	L102136704
L1021366fc:
    mov	w8, #0x2
L102136700:
    str	w8, [x0, #0x50]
L102136704:
    cbz	w2, L102136718
L102136708:
    scvtf	d0, w2
L10213670c:
    fmov	d1, #1.00000000
L102136710:
    fdiv	d0, d1, d0
L102136714:
    b	L10213671c
L102136718:
    fmov	d0, #1.00000000
L10213671c:
    str	d0, [x0, #0x70]
L102136720:
    cbz	w4, L102136734
L102136724:
    adrp x9, Lconstant1042e4790@PAGE
L102136728:
    ldr d0, [x9, Lconstant1042e4790@PAGEOFF]
L10213672c:
    str	d0, [x0, #0x40]
L102136730:
    b	L102136760
L102136734:
    cmp	w1, #0x3
L102136738:
    b.lt	L10213675c
L10213673c:
    cbz	w3, L10213675c
L102136740:
    adrp x9, Lconstant1042ed458@PAGE
L102136744:
    ldr d0, [x9, Lconstant1042ed458@PAGEOFF]
L102136748:
    str	d0, [x0, #0x40]
L10213674c:
    lsl	w9, w1, #1
L102136750:
    add	w9, w9, #0x64
L102136754:
    ucvtf	d0, w9
L102136758:
    b	L102136764
L10213675c:
    str	xzr, [x0, #0x40]
L102136760:
    movi	d0, #0000000000000000
L102136764:
    scvtf	d1, w8
L102136768:
    stp	d1, d0, [x0, #0x58]
L10213676c:
    ret
.p2align 2
.globl _csp_window
_csp_window:
L102136a5c:
    sub	sp, sp, #0x110
L102136a60:
    stp	d9, d8, [sp, #0xa0]
L102136a64:
    stp	x28, x27, [sp, #0xb0]
L102136a68:
    stp	x26, x25, [sp, #0xc0]
L102136a6c:
    stp	x24, x23, [sp, #0xd0]
L102136a70:
    stp	x22, x21, [sp, #0xe0]
L102136a74:
    stp	x20, x19, [sp, #0xf0]
L102136a78:
    stp	x29, x30, [sp, #0x100]
L102136a7c:
    add	x29, sp, #0x100
L102136a80:
    mov	x21, x3
L102136a84:
    mov	x23, x2
L102136a88:
    mov	x20, x1
L102136a8c:
    mov	x22, x0
L102136a90:
    ldp	w24, w8, [x0, #0x3c]
L102136a94:
    cbz	w8, L102136b1c
L102136a98:
    ldr	w8, [x22, #0x38]
L102136a9c:
    subs	w8, w8, #0x2
L102136aa0:
    b.lt	L102136b1c
L102136aa4:
    ldr	x9, [x22, #0x28]
L102136aa8:
    add	x8, x9, x8
L102136aac:
    ldr	x9, [x22, #0x10]
L102136ab0:
    lsr	x10, x8, #4
L102136ab4:
    and	x10, x10, #0xffffffffffffff8
L102136ab8:
    ldr	x9, [x9, x10]
L102136abc:
    and	x8, x8, #0x7f
L102136ac0:
    add	x0, x9, x8, lsl #5
L102136ac4:
    ldr	x8, [x0, #0x18]
L102136ac8:
    sub	x8, x21, x8
L102136acc:
    cmp	x8, #0x3e8
L102136ad0:
    b.gt	L102136f8c
L102136ad4:
    mov	x1, x20
L102136ad8:
    bl	_csp_distance
L102136adc:
    ldp	d2, d1, [x22, #0x58]
L102136ae0:
    fsub	d0, d1, d0
L102136ae4:
    fdiv	d0, d0, d1
L102136ae8:
    fmov	d1, #0.50000000
L102136aec:
    fmul	d1, d0, d1
L102136af0:
    fcmp	d0, #0.0
L102136af4:
    fcsel	d0, d1, d0, gt
L102136af8:
    fadd	d0, d2, d0
L102136afc:
    str	d0, [x22, #0x58]
L102136b00:
    fmov	d1, #2.00000000
L102136b04:
    fcmp	d0, d1
L102136b08:
    b.mi	L102136e24
L102136b0c:
    ldr	w8, [x22, #0x88]
L102136b10:
    cbz	w8, L102136e14
L102136b14:
    ldr	w8, [x22, #0x3c]
L102136b18:
    b	L102136e18
L102136b1c:
    ldr	w8, [x22, #0x44]
L102136b20:
    cmp	w8, #0x0
L102136b24:
    ccmp	w24, #0x1e, #0x0, ne
L102136b28:
    b.le	L102136b6c
L102136b2c:
    ldr	w8, [x22, #0x88]
L102136b30:
    cbz	w8, L102136cf8
L102136b34:
    ldr	d0, [x22, #0x58]
L102136b38:
    scvtf	d1, w24
L102136b3c:
    fcmp	d0, d1
L102136b40:
    b.pl	L102136e20
L102136b44:
    fsub	d2, d1, d0
L102136b48:
    fmov	d3, #1.00000000
L102136b4c:
    fadd	d2, d2, d3
L102136b50:
    fdiv	d2, d2, d1
L102136b54:
    fmov	d3, #0.50000000
L102136b58:
    fcmp	d2, d3
L102136b5c:
    fcsel	d2, d3, d2, gt
L102136b60:
    fadd	d0, d0, d2
L102136b64:
    str	d0, [x22, #0x58]
L102136b68:
    b	L102136e1c
L102136b6c:
    ldr	x8, [x22, #0x30]
L102136b70:
    cbz	x8, L102136f8c
L102136b74:
    cbz	w4, L102136b94
L102136b78:
    ldr	d0, [x22, #0x58]
L102136b7c:
    scvtf	d1, w24
L102136b80:
    fcmp	d0, d1
L102136b84:
    b.pl	L102136b94
L102136b88:
    mov	w26, #0x0
L102136b8c:
    mov	w25, #0x1
L102136b90:
    b	L102136b9c
L102136b94:
    mov	w25, #0x0
L102136b98:
    mov	w26, #0x1
L102136b9c:
    ldr	w9, [x22, #0x38]
L102136ba0:
    cmp	w9, w8
L102136ba4:
    csel	w19, w9, w8, lt
L102136ba8:
    ldp	w10, w11, [x22, #0x48]
L102136bac:
    mov	w9, #0x1e
L102136bb0:
    cmp	w19, #0x1e
L102136bb4:
    csel	w27, w19, w9, lt
L102136bb8:
    movi.2d	v0, #0000000000000000
L102136bbc:
    stp	q0, q0, [sp, #0x70]
L102136bc0:
    sub	w9, w19, #0x1
L102136bc4:
    cmp	x8, w9, sxtw
L102136bc8:
    b.ls	L10213704c
L102136bcc:
    stp	w10, w11, [sp, #0x28]
L102136bd0:
    sxtw	x28, w9
L102136bd4:
    ldr	x8, [x22, #0x28]
L102136bd8:
    add	x8, x8, x28
L102136bdc:
    ldr	x9, [x22, #0x10]
L102136be0:
    lsr	x10, x8, #4
L102136be4:
    and	x10, x10, #0xffffffffffffff8
L102136be8:
    ldr	x9, [x9, x10]
L102136bec:
    and	x8, x8, #0x7f
L102136bf0:
    add	x8, x9, x8, lsl #5
L102136bf4:
    ldp	q1, q0, [x8]
L102136bf8:
    stp	q1, q0, [sp, #0x50]
L102136bfc:
    add	x0, sp, #0x70
L102136c00:
    add	x1, sp, #0x50
L102136c04:
    bl	_csp_include
L102136c08:
    movi	d8, #0000000000000000
L102136c0c:
    cmp	w19, #0x2
L102136c10:
    b.lt	L102136d08
L102136c14:
    str	w26, [sp, #0xc]
L102136c18:
    str	x28, [sp, #0x10]
L102136c1c:
    str	w25, [sp, #0x1c]
L102136c20:
    str	x23, [sp, #0x20]
L102136c24:
    mov	w28, #0x0
L102136c28:
    mov	w23, #0x0
L102136c2c:
    mov	w26, #0x2
L102136c30:
    cmp	w27, #0x2
L102136c34:
    csel	w8, w27, w26, gt
L102136c38:
    sub	x25, x19, #0x2
L102136c3c:
    sub	x19, x8, #0x1
L102136c40:
    ldr	x8, [x22, #0x30]
L102136c44:
    cmp	x8, x25
L102136c48:
    b.ls	L10213704c
L102136c4c:
    ldr	x8, [x22, #0x28]
L102136c50:
    add	x8, x25, x8
L102136c54:
    ldr	x9, [x22, #0x10]
L102136c58:
    lsr	x10, x8, #4
L102136c5c:
    and	x10, x10, #0xffffffffffffff8
L102136c60:
    ldr	x9, [x9, x10]
L102136c64:
    and	x8, x8, #0x7f
L102136c68:
    add	x8, x9, x8, lsl #5
L102136c6c:
    ldp	q1, q0, [x8]
L102136c70:
    stp	q1, q0, [sp, #0x30]
L102136c74:
    ldp	d0, d1, [sp, #0x30]
L102136c78:
    ldp	d2, d3, [sp, #0x50]
L102136c7c:
    fsub	d0, d0, d2
L102136c80:
    fsub	d1, d1, d3
L102136c84:
    fmul	d1, d1, d1
L102136c88:
    fmadd	d0, d0, d0, d1
L102136c8c:
    fsqrt	d0, d0
L102136c90:
    fcmp	d0, #0.0
L102136c94:
    b.le	L102136cac
L102136c98:
    fadd	d8, d8, d0
L102136c9c:
    add	w28, w28, #0x1
L102136ca0:
    add	x0, sp, #0x70
L102136ca4:
    add	x1, sp, #0x30
L102136ca8:
    bl	_csp_include
L102136cac:
    ldp	q0, q1, [sp, #0x30]
L102136cb0:
    stp	q0, q1, [sp, #0x50]
L102136cb4:
    ldr	d0, [sp, #0x40]
L102136cb8:
    fcmp	d0, #0.0
L102136cbc:
    b.ls	L102136cc8
L102136cc0:
    mov	w23, #0x1
L102136cc4:
    b	L102136cd8
L102136cc8:
    cbnz	w23, L102136d14
L102136ccc:
    ldr	w8, [x22, #0x88]
L102136cd0:
    cbz	w8, L102136d14
L102136cd4:
    mov	w23, #0x0
L102136cd8:
    add	w26, w26, #0x1
L102136cdc:
    sub	x25, x25, #0x1
L102136ce0:
    subs	x19, x19, #0x1
L102136ce4:
    b.ne	L102136c40
L102136ce8:
    mov	x26, x27
L102136cec:
    ldr	x23, [sp, #0x20]
L102136cf0:
    ldr	w25, [sp, #0x1c]
L102136cf4:
    b	L102136d3c
L102136cf8:
    ldr	w8, [x22, #0x50]
L102136cfc:
    scvtf	d0, w8
L102136d00:
    str	d0, [x22, #0x58]
L102136d04:
    b	L102136e30
L102136d08:
    mov	x26, x27
L102136d0c:
    movi	d0, #0000000000000000
L102136d10:
    b	L102136d58
L102136d14:
    cmp	w26, #0x2
L102136d18:
    ldr	x23, [sp, #0x20]
L102136d1c:
    ldr	w25, [sp, #0x1c]
L102136d20:
    b.ne	L102136d3c
L102136d24:
    movi	d0, #0000000000000000
L102136d28:
    ldr	w8, [sp, #0xc]
L102136d2c:
    tbnz	w8, #0x0, L102136d38
L102136d30:
    ldr	w8, [x22, #0x50]
L102136d34:
    scvtf	d0, w8
L102136d38:
    str	d0, [x22, #0x58]
L102136d3c:
    cmp	w28, #0x1
L102136d40:
    b.lt	L102136d50
L102136d44:
    ucvtf	d0, w28
L102136d48:
    fdiv	d0, d8, d0
L102136d4c:
    b	L102136d54
L102136d50:
    movi	d0, #0000000000000000
L102136d54:
    ldr	x28, [sp, #0x10]
L102136d58:
    fcmp	d0, #0.0
L102136d5c:
    csinc	w8, w25, wzr, le
L102136d60:
    tbz	w8, #0x0, L102136e0c
L102136d64:
    fmov	d1, #10.00000000
L102136d68:
    ldr	w8, [sp, #0x2c]
L102136d6c:
    scvtf	d2, w8
L102136d70:
    fdiv	d2, d2, d1
L102136d74:
    fsub	d0, d2, d0
L102136d78:
    fcmp	d0, #0.0
L102136d7c:
    b.le	L102136db8
L102136d80:
    ldr	w8, [sp, #0x28]
L102136d84:
    scvtf	d2, w8
L102136d88:
    fdiv	d1, d2, d1
L102136d8c:
    ldp	d2, d3, [sp, #0x80]
L102136d90:
    ldp	d4, d5, [sp, #0x70]
L102136d94:
    fsub	d2, d2, d4
L102136d98:
    fsub	d3, d3, d5
L102136d9c:
    fmul	d3, d3, d3
L102136da0:
    fmadd	d2, d2, d2, d3
L102136da4:
    fsqrt	d2, d2
L102136da8:
    fdiv	d2, d2, d8
L102136dac:
    fmul	d0, d1, d0
L102136db0:
    fmul	d0, d0, d2
L102136db4:
    fcvtzs	w24, d0
L102136db8:
    ldr	w8, [x22, #0x88]
L102136dbc:
    cmp	w8, #0x0
L102136dc0:
    mov	w8, #0x3c
L102136dc4:
    mov	w9, #0x50
L102136dc8:
    csel	x8, x9, x8, eq
L102136dcc:
    ldr	w8, [x22, x8]
L102136dd0:
    cmp	w24, w8
L102136dd4:
    csel	w8, w24, w8, gt
L102136dd8:
    cmp	w25, #0x0
L102136ddc:
    fmov	d0, #0.25000000
L102136de0:
    fmov	d1, #0.50000000
L102136de4:
    fcsel	d2, d1, d0, ne
L102136de8:
    ldr	d0, [x22, #0x58]
L102136dec:
    scvtf	d1, w8
L102136df0:
    fabd	d3, d0, d1
L102136df4:
    fcmp	d2, d3
L102136df8:
    b.gt	L102136e98
L102136dfc:
    fcmp	d0, d1
L102136e00:
    b.le	L102136e90
L102136e04:
    fsub	d1, d0, d2
L102136e08:
    b	L102136e98
L102136e0c:
    ldr	d0, [x22, #0x58]
L102136e10:
    b	L102136ee4
L102136e14:
    ldr	w8, [x22, #0x50]
L102136e18:
    scvtf	d1, w8
L102136e1c:
    fcmp	d0, d1
L102136e20:
    b.le	L102136e2c
L102136e24:
    str	d1, [x22, #0x58]
L102136e28:
    fmov	d0, d1
L102136e2c:
    fcvtzs	w8, d0
L102136e30:
    cmp	w8, #0x1
L102136e34:
    b.ge	L102136ef0
L102136e38:
    ldr	w9, [x22, #0x38]
L102136e3c:
    subs	w10, w9, #0x1
L102136e40:
    b.lt	L102136e7c
L102136e44:
    mov	x9, #0x0
L102136e48:
    ldr	x11, [x22, #0x28]
L102136e4c:
    add	x10, x11, x10
L102136e50:
    ldr	x11, [x22, #0x10]
L102136e54:
    lsr	x12, x10, #4
L102136e58:
    and	x12, x12, #0xffffffffffffff8
L102136e5c:
    ldr	x11, [x11, x12]
L102136e60:
    and	x10, x10, #0x7f
L102136e64:
    add	x10, x11, x10, lsl #5
L102136e68:
    add	x11, x10, #0x18
L102136e6c:
    movi.2d	v1, #0000000000000000
L102136e70:
    movi	d2, #0000000000000000
L102136e74:
    mov	w10, #0x1
L102136e78:
    b	L102136f98
L102136e7c:
    mov	x9, #0x0
L102136e80:
    movi.2d	v1, #0000000000000000
L102136e84:
    movi	d2, #0000000000000000
L102136e88:
    mov	w10, #0x1
L102136e8c:
    b	L102136fa0
L102136e90:
    b.pl	L102136ea0
L102136e94:
    fadd	d1, d2, d0
L102136e98:
    str	d1, [x22, #0x58]
L102136e9c:
    fmov	d0, d1
L102136ea0:
    scvtf	d1, w26
L102136ea4:
    fcmp	d0, d1
L102136ea8:
    b.lt	L102136eb4
L102136eac:
    str	d1, [x22, #0x58]
L102136eb0:
    fmov	d0, d1
L102136eb4:
    tbnz	w25, #0x0, L102136ecc
L102136eb8:
    scvtf	d1, w28
L102136ebc:
    fcmp	d0, d1
L102136ec0:
    b.lt	L102136ecc
L102136ec4:
    str	d1, [x22, #0x58]
L102136ec8:
    fmov	d0, d1
L102136ecc:
    mov	x8, #0x4059000000000000
L102136ed0:
    fmov	d1, x8
L102136ed4:
    fcmp	d0, d1
L102136ed8:
    b.lt	L102136ee4
L102136edc:
    str	x8, [x22, #0x58]
L102136ee0:
    fmov	d0, x8
L102136ee4:
    fcvtzs	w8, d0
L102136ee8:
    cmp	w8, #0x0
L102136eec:
    b.le	L102136f8c
L102136ef0:
    mov	w11, #0x0
L102136ef4:
    mov	x9, #0x0
L102136ef8:
    mov	w13, #0x0
L102136efc:
    movi.2d	v1, #0000000000000000
L102136f00:
    movi	d2, #0000000000000000
L102136f04:
    mov	w12, #-0x1
L102136f08:
    cbnz	w13, L102136f4c
L102136f0c:
    ldr	w10, [x22, #0x38]
L102136f10:
    cmp	w11, w10
L102136f14:
    b.ge	L102136f4c
L102136f18:
    add	w10, w12, w10
L102136f1c:
    ldr	x13, [x22, #0x28]
L102136f20:
    add	x10, x13, w10, sxtw
L102136f24:
    ldr	x13, [x22, #0x10]
L102136f28:
    lsr	x14, x10, #4
L102136f2c:
    and	x14, x14, #0xffffffffffffff8
L102136f30:
    ldr	x13, [x13, x14]
L102136f34:
    and	x10, x10, #0x7f
L102136f38:
    add	x14, x13, x10, lsl #5
L102136f3c:
    ldr	x10, [x14, #0x18]
L102136f40:
    sub	x10, x21, x10
L102136f44:
    cmp	x10, #0x3e9
L102136f48:
    b.lt	L102136f7c
L102136f4c:
    cbz	x9, L102136f8c
L102136f50:
    mov	w10, #0x0
L102136f54:
    mov	w13, #0x1
L102136f58:
    ldr	q3, [x9]
L102136f5c:
    fadd.2d	v1, v1, v3
L102136f60:
    ldr	d3, [x9, #0x10]
L102136f64:
    fadd	d2, d2, d3
L102136f68:
    add	w11, w11, #0x1
L102136f6c:
    sub	w12, w12, #0x1
L102136f70:
    cmp	w8, w11
L102136f74:
    b.ne	L102136f08
L102136f78:
    b	L102136f94
L102136f7c:
    mov	w13, #0x0
L102136f80:
    mov	w10, #0x1
L102136f84:
    mov	x9, x14
L102136f88:
    b	L102136f58
L102136f8c:
    mov	w0, #0x0
L102136f90:
    b	L102137028
L102136f94:
    add	x11, x9, #0x18
L102136f98:
    ldr	x11, [x11]
L102136f9c:
    str	x11, [x22, #0x80]
L102136fa0:
    scvtf	d3, w8
L102136fa4:
    fsub	d0, d0, d3
L102136fa8:
    fcmp	d0, #0.0
L102136fac:
    b.eq	L10213700c
L102136fb0:
    cbz	w10, L102136ff8
L102136fb4:
    ldr	w10, [x22, #0x38]
L102136fb8:
    cmp	w8, w10
L102136fbc:
    b.ge	L102136ff8
L102136fc0:
    mvn	w8, w8
L102136fc4:
    add	w8, w10, w8
L102136fc8:
    ldr	x10, [x22, #0x28]
L102136fcc:
    add	x8, x10, w8, sxtw
L102136fd0:
    ldr	x10, [x22, #0x10]
L102136fd4:
    lsr	x11, x8, #4
L102136fd8:
    and	x11, x11, #0xffffffffffffff8
L102136fdc:
    ldr	x10, [x10, x11]
L102136fe0:
    and	x8, x8, #0x7f
L102136fe4:
    add	x8, x10, x8, lsl #5
L102136fe8:
    ldr	x10, [x8, #0x18]
L102136fec:
    sub	x10, x21, x10
L102136ff0:
    cmp	x10, #0x3e8
L102136ff4:
    csel	x9, x9, x8, gt
L102136ff8:
    ldr	q4, [x9]
L102136ffc:
    fmla.2d	v1, v4, v0[0]
L102137000:
    ldr	d4, [x9, #0x10]
L102137004:
    fmadd	d2, d4, d0, d2
L102137008:
    fadd	d3, d0, d3
L10213700c:
    fmov	d0, #1.00000000
L102137010:
    fdiv	d0, d0, d3
L102137014:
    fmul.2d	v1, v1, v0[0]
L102137018:
    str	q1, [x20]
L10213701c:
    fmul	d0, d2, d0
L102137020:
    str	d0, [x23]
L102137024:
    mov	w0, #0x1
L102137028:
    ldp	x29, x30, [sp, #0x100]
L10213702c:
    ldp	x20, x19, [sp, #0xf0]
L102137030:
    ldp	x22, x21, [sp, #0xe0]
L102137034:
    ldp	x24, x23, [sp, #0xd0]
L102137038:
    ldp	x26, x25, [sp, #0xc0]
L10213703c:
    ldp	x28, x27, [sp, #0xb0]
L102137040:
    ldp	d9, d8, [sp, #0xa0]
L102137044:
    add	sp, sp, #0x110
L102137048:
    ret
L10213704c:
    adrp x0, Lconstant10464428e@PAGE
L102137050:
    add x0, x0, Lconstant10464428e@PAGEOFF
L102137054:
    bl	_csp_bad_index
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
.globl _csp_include
_csp_include:
L10221b72c:
    ldp	d4, d1, [x0]
L10221b730:
    ldp	d3, d0, [x0, #0x10]
L10221b734:
    ldr	d2, [x1]
L10221b738:
    fcmp	d4, d3
L10221b73c:
    fccmp	d1, d0, #0x0, mi
L10221b740:
    b.mi	L10221b768
L10221b744:
    adrp x8, Lconstant1042e3690@PAGE
L10221b748:
    ldr d0, [x8, Lconstant1042e3690@PAGEOFF]
L10221b74c:
    fadd	d1, d2, d0
L10221b750:
    ldr	d3, [x1, #0x8]
L10221b754:
    stp	d2, d3, [x0]
L10221b758:
    fadd	d0, d3, d0
L10221b75c:
    str	d1, [x0, #0x10]
L10221b760:
    str	d0, [x0, #0x18]
L10221b764:
    ret
L10221b768:
    fcmp	d2, d4
L10221b76c:
    b.pl	L10221b778
L10221b770:
    str	d2, [x0]
L10221b774:
    b	L10221b790
L10221b778:
    fcmp	d2, d3
L10221b77c:
    b.lt	L10221b790
L10221b780:
    adrp x8, Lconstant1042e3690@PAGE
L10221b784:
    ldr d3, [x8, Lconstant1042e3690@PAGEOFF]
L10221b788:
    fadd	d2, d2, d3
L10221b78c:
    str	d2, [x0, #0x10]
L10221b790:
    ldr	d2, [x1, #0x8]
L10221b794:
    fcmp	d2, d1
L10221b798:
    b.pl	L10221b7a4
L10221b79c:
    str	d2, [x0, #0x8]
L10221b7a0:
    ret
L10221b7a4:
    fcmp	d2, d0
L10221b7a8:
    b.lt	L10221b764
L10221b7ac:
    adrp x8, Lconstant1042e3690@PAGE
L10221b7b0:
    ldr d0, [x8, Lconstant1042e3690@PAGEOFF]
L10221b7b4:
    fadd	d0, d2, d0
L10221b7b8:
    b	L10221b760
.section __TEXT,__const
.p2align 4
Lconstant1042e4790:
.byte 0,0,0,0,1,0,0,0
.p2align 4
Lconstant1042ed458:
.byte 1,0,0,0,0,0,0,0
.p2align 4
Lconstant10464428e:
.byte 100,101,113,117,101,0,80,87,80,105,101,99,101,0,88,80,111,115,0,89,80,111,115,0,87,105,100,116,104,0,72,101,105,103,104,116,0,86,105,115,105,98,108,101,0,88,83,99,97,108,101,78,117,109,101,114,97,116,111,114,0,88,83,99
.p2align 4
Lconstant1042e3690:
.byte 58,140,48,226,142,121,69,62

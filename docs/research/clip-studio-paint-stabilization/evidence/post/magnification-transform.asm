
FUNCTION 0x102992930 size 180
102992930:     	sub	sp, sp, #0xd0
102992934:     	stp	d9, d8, [sp, #0xa0]
102992938:     	stp	x20, x19, [sp, #0xb0]
10299293c:     	stp	x29, x30, [sp, #0xc0]
102992940:     	add	x29, sp, #0xc0
102992944:     	ldp	x9, x8, [x0]
102992948:     	stp	x9, x8, [sp, #0x48]
10299294c:     	cbz	x8, 0x10299295c
102992950:     	add	x8, x8, #0x8
102992954:     	mov	w9, #0x1                ; =1
102992958:     	ldadd	w9, w8, [x8]
10299295c:     	add	x20, sp, #0x48
102992960:     	adrp	x0, 0x104cb6000
102992964:     	add	x0, x0, #0x90
102992968:     	bl	0x10214de74
10299296c:     	mov	x1, x0
102992970:     	fmov	d0, xzr
102992974:     	movi.2d	v1, #0000000000000000
102992978:     	stp	q1, q1, [sp]
10299297c:     	mov.d	v0[1], v0[0]
102992980:     	str	wzr, [sp, #0x40]
102992984:     	str	q0, [sp, #0x30]
102992988:     	movi.2d	v0, #0xffffffffffffffff
10299298c:     	str	d0, [sp, #0x20]
102992990:     	mov	w8, #-0x1               ; =-1
102992994:     	str	w8, [sp, #0x28]
102992998:     	add	x8, sp, #0x58
10299299c:     	add	x0, sp, #0x48
1029929a0:     	mov	x2, sp
1029929a4:     	bl	0x102991b84
1029929a8:     	ldr	d8, [sp, #0x58]
1029929ac:     	add	x0, x20, #0x8
1029929b0:     	bl	0x10001022c
1029929b4:     	fmov	d0, d8
1029929b8:     	ldp	x29, x30, [sp, #0xc0]
1029929bc:     	ldp	x20, x19, [sp, #0xb0]
1029929c0:     	ldp	d9, d8, [sp, #0xa0]
1029929c4:     	add	sp, sp, #0xd0
1029929c8:     	ret
1029929cc:     	b	0x1029929d0
1029929d0:     	mov	x19, x0
1029929d4:     	add	x0, x20, #0x8
1029929d8:     	bl	0x10001022c
1029929dc:     	mov	x0, x19
1029929e0:     	bl	0x103bda970

FUNCTION 0x102991b84 size 172
102991b84:     	sub	sp, sp, #0x40
102991b88:     	stp	x22, x21, [sp, #0x10]
102991b8c:     	stp	x20, x19, [sp, #0x20]
102991b90:     	stp	x29, x30, [sp, #0x30]
102991b94:     	add	x29, sp, #0x30
102991b98:     	mov	x19, x2
102991b9c:     	mov	x20, x8
102991ba0:     	ldp	q0, q1, [x2, #0x20]
102991ba4:     	stp	q0, q1, [x8, #0x20]
102991ba8:     	ldr	x8, [x2, #0x40]
102991bac:     	str	x8, [x20, #0x40]
102991bb0:     	ldp	q1, q0, [x2]
102991bb4:     	stp	q1, q0, [x20]
102991bb8:     	ldp	x9, x8, [x0]
102991bbc:     	stp	x9, x8, [sp]
102991bc0:     	cbz	x8, 0x102991bd0
102991bc4:     	add	x8, x8, #0x8
102991bc8:     	mov	w9, #0x1                ; =1
102991bcc:     	ldadd	w9, w8, [x8]
102991bd0:     	mov	x22, sp
102991bd4:     	mov	x0, sp
102991bd8:     	mov	x2, x20
102991bdc:     	bl	0x1029981a0
102991be0:     	mov	x21, x0
102991be4:     	add	x0, x22, #0x8
102991be8:     	bl	0x10001022c
102991bec:     	cbnz	w21, 0x102991c08
102991bf0:     	ldp	q0, q1, [x19, #0x20]
102991bf4:     	stp	q0, q1, [x20, #0x20]
102991bf8:     	ldr	x8, [x19, #0x40]
102991bfc:     	str	x8, [x20, #0x40]
102991c00:     	ldp	q1, q0, [x19]
102991c04:     	stp	q1, q0, [x20]
102991c08:     	ldp	x29, x30, [sp, #0x30]
102991c0c:     	ldp	x20, x19, [sp, #0x20]
102991c10:     	ldp	x22, x21, [sp, #0x10]
102991c14:     	add	sp, sp, #0x40
102991c18:     	ret
102991c1c:     	mov	x19, x0
102991c20:     	add	x0, x22, #0x8
102991c24:     	bl	0x10001022c
102991c28:     	mov	x0, x19
102991c2c:     	bl	0x103bda970

FUNCTION 0x1029981a0 size 120
1029981a0:     	sub	sp, sp, #0x40
1029981a4:     	stp	x22, x21, [sp, #0x10]
1029981a8:     	stp	x20, x19, [sp, #0x20]
1029981ac:     	stp	x29, x30, [sp, #0x30]
1029981b0:     	add	x29, sp, #0x30
1029981b4:     	mov	x19, x2
1029981b8:     	mov	x20, x1
1029981bc:     	mov	x21, x0
1029981c0:     	ldp	x22, x9, [x0]
1029981c4:     	mov	x8, sp
1029981c8:     	stp	x22, x9, [sp]
1029981cc:     	cbz	x9, 0x1029981dc
1029981d0:     	add	x9, x9, #0x8
1029981d4:     	mov	w10, #0x1               ; =1
1029981d8:     	ldadd	w10, w9, [x9]
1029981dc:     	add	x0, x8, #0x8
1029981e0:     	bl	0x10001022c
1029981e4:     	cbz	x22, 0x102998200
1029981e8:     	ldr	x0, [x21]
1029981ec:     	bl	0x1021c0e88
1029981f0:     	mov	x1, x20
1029981f4:     	mov	x2, x19
1029981f8:     	bl	0x1029a42f8
1029981fc:     	b	0x102998204
102998200:     	mov	w0, #0x0                ; =0
102998204:     	ldp	x29, x30, [sp, #0x30]
102998208:     	ldp	x20, x19, [sp, #0x20]
10299820c:     	ldp	x22, x21, [sp, #0x10]
102998210:     	add	sp, sp, #0x40
102998214:     	ret

FUNCTION 0x102991708 size 536
102991708:     	sub	sp, sp, #0x120
10299170c:     	stp	d9, d8, [sp, #0xd0]
102991710:     	stp	x28, x27, [sp, #0xe0]
102991714:     	stp	x22, x21, [sp, #0xf0]
102991718:     	stp	x20, x19, [sp, #0x100]
10299171c:     	stp	x29, x30, [sp, #0x110]
102991720:     	add	x29, sp, #0x110
102991724:     	mov	x21, x2
102991728:     	mov	x22, x1
10299172c:     	fmov	d8, d0
102991730:     	mov	x20, x0
102991734:     	ldp	x9, x8, [x0]
102991738:     	add	x10, sp, #0x78
10299173c:     	add	x19, x10, #0x8
102991740:     	stp	x9, x8, [sp, #0x78]
102991744:     	cbz	x8, 0x102991754
102991748:     	add	x8, x8, #0x8
10299174c:     	mov	w9, #0x1                ; =1
102991750:     	ldadd	w9, w8, [x8]
102991754:     	adrp	x0, 0x104cb6000
102991758:     	add	x0, x0, #0x90
10299175c:     	bl	0x10214de74
102991760:     	mov	x1, x0
102991764:     	fmov	d0, xzr
102991768:     	movi.2d	v1, #0000000000000000
10299176c:     	stp	q1, q1, [sp, #0x30]
102991770:     	mov.d	v0[1], v0[0]
102991774:     	str	wzr, [sp, #0x70]
102991778:     	str	q0, [sp, #0x60]
10299177c:     	movi.2d	v0, #0xffffffffffffffff
102991780:     	str	d0, [sp, #0x50]
102991784:     	mov	w8, #-0x1               ; =-1
102991788:     	str	w8, [sp, #0x58]
10299178c:     	add	x8, sp, #0x88
102991790:     	add	x0, sp, #0x78
102991794:     	add	x2, sp, #0x30
102991798:     	bl	0x102991b84
10299179c:     	mov	x0, x19
1029917a0:     	bl	0x10001022c
1029917a4:     	ldr	d0, [sp, #0x88]
1029917a8:     	fadd	d0, d0, d8
1029917ac:     	cmp	w22, #0x0
1029917b0:     	fcsel	d0, d8, d0, eq
1029917b4:     	mov	x8, #0x40b0000000000000 ; =4661225614328463360
1029917b8:     	fmov	d1, x8
1029917bc:     	fmul	d0, d0, d1
1029917c0:     	fcmp	d0, #0.0
1029917c4:     	adrp	x8, 0x1042e4000
1029917c8:     	add	x8, x8, #0x7a0
1029917cc:     	cset	w9, mi
1029917d0:     	ldr	d1, [x8, w9, uxtw #3]
1029917d4:     	fadd	d0, d0, d1
1029917d8:     	fcvtzs	w8, d0
1029917dc:     	scvtf	d0, w8, #0xc
1029917e0:     	str	d0, [sp, #0x88]
1029917e4:     	ldr	q0, [x21]
1029917e8:     	stur	q0, [sp, #0xb8]
1029917ec:     	add	x8, sp, #0x20
1029917f0:     	add	x19, x8, #0x8
1029917f4:     	ldp	x9, x8, [x20]
1029917f8:     	stp	x9, x8, [sp, #0x20]
1029917fc:     	cbz	x8, 0x10299180c
102991800:     	add	x8, x8, #0x8
102991804:     	mov	w9, #0x1                ; =1
102991808:     	ldadd	w9, w8, [x8]
10299180c:     	adrp	x0, 0x104cb5000
102991810:     	add	x0, x0, #0xf50
102991814:     	bl	0x10214de74
102991818:     	mov	x1, x0
10299181c:     	adrp	x2, 0x104554000
102991820:     	add	x2, x2, #0xfd0
102991824:     	add	x0, sp, #0x20
102991828:     	bl	0x10298fc08
10299182c:     	fmov	d8, d0
102991830:     	mov	x0, x19
102991834:     	bl	0x10001022c
102991838:     	add	x8, sp, #0x10
10299183c:     	add	x19, x8, #0x8
102991840:     	ldp	x9, x8, [x20]
102991844:     	stp	x9, x8, [sp, #0x10]
102991848:     	cbz	x8, 0x102991858
10299184c:     	add	x8, x8, #0x8
102991850:     	mov	w9, #0x1                ; =1
102991854:     	ldadd	w9, w8, [x8]
102991858:     	adrp	x0, 0x104cb5000
10299185c:     	add	x0, x0, #0xf70
102991860:     	bl	0x10214de74
102991864:     	mov	x1, x0
102991868:     	adrp	x2, 0x104554000
10299186c:     	add	x2, x2, #0xfd8
102991870:     	add	x0, sp, #0x10
102991874:     	bl	0x10298fc08
102991878:     	fmov	d9, d0
10299187c:     	mov	x0, x19
102991880:     	bl	0x10001022c
102991884:     	ldr	d0, [sp, #0x88]
102991888:     	fcmp	d8, d0
10299188c:     	fcsel	d0, d0, d8, mi
102991890:     	fcmp	d0, d9
102991894:     	fcsel	d0, d0, d9, mi
102991898:     	str	d0, [sp, #0x88]
10299189c:     	mov	x8, sp
1029918a0:     	add	x19, x8, #0x8
1029918a4:     	ldp	x9, x8, [x20]
1029918a8:     	stp	x9, x8, [sp]
1029918ac:     	cbz	x8, 0x1029918bc
1029918b0:     	add	x8, x8, #0x8
1029918b4:     	mov	w9, #0x1                ; =1
1029918b8:     	ldadd	w9, w8, [x8]
1029918bc:     	adrp	x0, 0x104cb6000
1029918c0:     	add	x0, x0, #0x90
1029918c4:     	bl	0x10214de74
1029918c8:     	mov	x1, x0
1029918cc:     	mov	x0, sp
1029918d0:     	add	x2, sp, #0x88
1029918d4:     	bl	0x102991c30
1029918d8:     	mov	x0, x19
1029918dc:     	bl	0x10001022c
1029918e0:     	ldp	x29, x30, [sp, #0x110]
1029918e4:     	ldp	x20, x19, [sp, #0x100]
1029918e8:     	ldp	x22, x21, [sp, #0xf0]
1029918ec:     	ldp	x28, x27, [sp, #0xe0]
1029918f0:     	ldp	d9, d8, [sp, #0xd0]
1029918f4:     	add	sp, sp, #0x120
1029918f8:     	ret
1029918fc:     	b	0x10299190c
102991900:     	b	0x10299190c
102991904:     	b	0x10299190c
102991908:     	b	0x10299190c
10299190c:     	mov	x20, x0
102991910:     	mov	x0, x19
102991914:     	bl	0x10001022c
102991918:     	mov	x0, x20
10299191c:     	bl	0x103bda970

FUNCTION 0x102997fac size 500
102997fac:     	sub	sp, sp, #0x120
102997fb0:     	stp	x24, x23, [sp, #0xe0]
102997fb4:     	stp	x22, x21, [sp, #0xf0]
102997fb8:     	stp	x20, x19, [sp, #0x100]
102997fbc:     	stp	x29, x30, [sp, #0x110]
102997fc0:     	add	x29, sp, #0x110
102997fc4:     	mov	x19, x2
102997fc8:     	mov	x21, x1
102997fcc:     	mov	x20, x0
102997fd0:     	adrp	x8, 0x1048c8000
102997fd4:     	ldr	x8, [x8, #0x4d0]
102997fd8:     	ldr	x8, [x8]
102997fdc:     	stur	x8, [x29, #-0x38]
102997fe0:     	add	x9, sp, #0x88
102997fe4:     	ldp	x10, x8, [x0]
102997fe8:     	add	x22, x9, #0x8
102997fec:     	stp	x10, x8, [sp, #0x88]
102997ff0:     	cbz	x8, 0x102998000
102997ff4:     	add	x8, x8, #0x8
102997ff8:     	mov	w9, #0x1                ; =1
102997ffc:     	ldadd	w9, w8, [x8]
102998000:     	sub	x8, x29, #0x78
102998004:     	add	x0, sp, #0x88
102998008:     	bl	0x1029954a0
10299800c:     	mov	x0, x22
102998010:     	bl	0x10001022c
102998014:     	ldur	x8, [x29, #-0x78]
102998018:     	cbz	x8, 0x102998120
10299801c:     	ldp	x9, x8, [x20]
102998020:     	stp	x9, x8, [sp, #0x30]
102998024:     	cbz	x8, 0x102998034
102998028:     	add	x8, x8, #0x8
10299802c:     	mov	w9, #0x1                ; =1
102998030:     	ldadd	w9, w8, [x8]
102998034:     	add	x23, sp, #0x30
102998038:     	adrp	x0, 0x104cb6000
10299803c:     	add	x0, x0, #0x90
102998040:     	bl	0x10214de74
102998044:     	mov	x1, x0
102998048:     	add	x0, sp, #0x30
10299804c:     	add	x2, sp, #0x40
102998050:     	bl	0x1029981a0
102998054:     	mov	x22, x0
102998058:     	add	x0, x23, #0x8
10299805c:     	bl	0x10001022c
102998060:     	cbnz	w22, 0x10299809c
102998064:     	sub	x8, x29, #0x68
102998068:     	movi.2d	v0, #0000000000000000
10299806c:     	stp	q0, q0, [sp, #0x40]
102998070:     	stur	xzr, [x8, #0xc]
102998074:     	stur	xzr, [x8, #0x4]
102998078:     	stur	wzr, [x29, #-0x54]
10299807c:     	movi.2d	v0, #0xffffffffffffffff
102998080:     	str	d0, [sp, #0x60]
102998084:     	mov	w8, #-0x1               ; =-1
102998088:     	str	w8, [sp, #0x68]
10299808c:     	ldur	q0, [x29, #-0x68]
102998090:     	stur	q0, [sp, #0x6c]
102998094:     	ldur	x8, [x29, #-0x58]
102998098:     	stur	x8, [sp, #0x7c]
10299809c:     	ldur	x0, [x29, #-0x78]
1029980a0:     	ldp	d0, d1, [sp, #0x40]
1029980a4:     	ldp	w1, w2, [sp, #0x50]
1029980a8:     	sub	x8, x29, #0x68
1029980ac:     	bl	0x102680acc
1029980b0:     	ldur	q0, [x29, #-0x68]
1029980b4:     	ldur	q1, [x29, #-0x58]
1029980b8:     	stp	q0, q1, [x21]
1029980bc:     	ldur	q0, [x29, #-0x48]
1029980c0:     	str	q0, [x21, #0x20]
1029980c4:     	ldur	x21, [x29, #-0x78]
1029980c8:     	ldp	x9, x8, [x20]
1029980cc:     	stp	x9, x8, [sp, #0x8]
1029980d0:     	cbz	x8, 0x1029980e0
1029980d4:     	add	x8, x8, #0x8
1029980d8:     	mov	w9, #0x1                ; =1
1029980dc:     	ldadd	w9, w8, [x8]
1029980e0:     	add	x20, sp, #0x8
1029980e4:     	add	x8, sp, #0x18
1029980e8:     	add	x0, sp, #0x8
1029980ec:     	mov	x1, #0x0                ; =0
1029980f0:     	bl	0x10267fcc4
1029980f4:     	sub	x8, x29, #0x68
1029980f8:     	add	x1, sp, #0x18
1029980fc:     	mov	x0, x21
102998100:     	bl	0x102680e08
102998104:     	ldur	q0, [x29, #-0x68]
102998108:     	ldur	q1, [x29, #-0x58]
10299810c:     	stp	q0, q1, [x19]
102998110:     	ldur	q0, [x29, #-0x48]
102998114:     	str	q0, [x19, #0x20]
102998118:     	add	x0, x20, #0x8
10299811c:     	bl	0x10001022c
102998120:     	sub	x8, x29, #0x78
102998124:     	add	x0, x8, #0x8
102998128:     	bl	0x10001022c
10299812c:     	ldur	x8, [x29, #-0x38]
102998130:     	adrp	x9, 0x1048c8000
102998134:     	ldr	x9, [x9, #0x4d0]
102998138:     	ldr	x9, [x9]
10299813c:     	cmp	x9, x8
102998140:     	b.ne	0x10299815c
102998144:     	ldp	x29, x30, [sp, #0x110]
102998148:     	ldp	x20, x19, [sp, #0x100]
10299814c:     	ldp	x22, x21, [sp, #0xf0]
102998150:     	ldp	x24, x23, [sp, #0xe0]
102998154:     	add	sp, sp, #0x120
102998158:     	ret
10299815c:     	bl	0x103bdd4d8
102998160:     	mov	x19, x0
102998164:     	b	0x102998188
102998168:     	mov	x19, x0
10299816c:     	b	0x102998190
102998170:     	mov	x19, x0
102998174:     	add	x0, x20, #0x8
102998178:     	b	0x102998184
10299817c:     	mov	x19, x0
102998180:     	add	x0, x23, #0x8
102998184:     	bl	0x10001022c
102998188:     	sub	x8, x29, #0x78
10299818c:     	add	x22, x8, #0x8
102998190:     	mov	x0, x22
102998194:     	bl	0x10001022c
102998198:     	mov	x0, x19
10299819c:     	bl	0x103bda970

FUNCTION 0x102680acc size 152
102680acc:     	sub	sp, sp, #0xa0
102680ad0:     	stp	d9, d8, [sp, #0x70]
102680ad4:     	stp	x20, x19, [sp, #0x80]
102680ad8:     	stp	x29, x30, [sp, #0x90]
102680adc:     	add	x29, sp, #0x90
102680ae0:     	mov	x5, x2
102680ae4:     	mov	x4, x1
102680ae8:     	mov	x19, x8
102680aec:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
102680af0:     	stur	x8, [x29, #-0x28]
102680af4:     	stur	wzr, [x29, #-0x2c]
102680af8:     	sub	x1, x29, #0x2c
102680afc:     	add	x2, sp, #0x30
102680b00:     	sub	x3, x29, #0x28
102680b04:     	bl	0x102680b64
102680b08:     	ldur	w20, [x29, #-0x2c]
102680b0c:     	mov	x0, x20
102680b10:     	bl	0x1025f71c0
102680b14:     	fmov	d8, d0
102680b18:     	mov	x0, x20
102680b1c:     	bl	0x1025f71c0
102680b20:     	movi	d1, #0000000000000000
102680b24:     	fmul	d2, d8, d1
102680b28:     	stp	d8, d2, [sp]
102680b2c:     	fmul	d1, d0, d1
102680b30:     	stp	d2, d1, [sp, #0x10]
102680b34:     	stp	d0, d1, [sp, #0x20]
102680b38:     	mov	x0, sp
102680b3c:     	add	x1, sp, #0x30
102680b40:     	mov	x8, x19
102680b44:     	bl	0x10221a45c
102680b48:     	mov	x0, x19
102680b4c:     	bl	0x102680dc4
102680b50:     	ldp	x29, x30, [sp, #0x90]
102680b54:     	ldp	x20, x19, [sp, #0x80]
102680b58:     	ldp	d9, d8, [sp, #0x70]
102680b5c:     	add	sp, sp, #0xa0
102680b60:     	ret

FUNCTION 0x102680b64 size 608
102680b64:     	sub	sp, sp, #0xc0
102680b68:     	stp	d11, d10, [sp, #0x50]
102680b6c:     	stp	d9, d8, [sp, #0x60]
102680b70:     	stp	x26, x25, [sp, #0x70]
102680b74:     	stp	x24, x23, [sp, #0x80]
102680b78:     	stp	x22, x21, [sp, #0x90]
102680b7c:     	stp	x20, x19, [sp, #0xa0]
102680b80:     	stp	x29, x30, [sp, #0xb0]
102680b84:     	add	x29, sp, #0xb0
102680b88:     	mov	x20, x5
102680b8c:     	mov	x21, x4
102680b90:     	mov	x22, x3
102680b94:     	mov	x19, x2
102680b98:     	fmov	d8, d1
102680b9c:     	fmov	d9, d0
102680ba0:     	mov	x23, x1
102680ba4:     	mov	x24, x0
102680ba8:     	mov	x8, #0x3ff0000000000000 ; =4607182418800017408
102680bac:     	str	x8, [x3]
102680bb0:     	str	wzr, [x1]
102680bb4:     	stp	x8, xzr, [x2]
102680bb8:     	stp	xzr, xzr, [x2, #0x10]
102680bbc:     	adrp	x8, 0x1042f3000
102680bc0:     	ldr	q0, [x8, #0x70]
102680bc4:     	str	q0, [x2, #0x20]
102680bc8:     	fmov	d0, d9
102680bcc:     	bl	0x102681050
102680bd0:     	str	w0, [x23]
102680bd4:     	tbnz	w0, #0x1f, 0x102680d60
102680bd8:     	mov	x1, x0
102680bdc:     	ldr	x0, [x24, #0x28]
102680be0:     	add	x8, sp, #0x40
102680be4:     	bl	0x1025f71d8
102680be8:     	ldr	w0, [x23]
102680bec:     	bl	0x1025f71c0
102680bf0:     	mov	x8, #0x4059000000000000 ; =4636737291354636288
102680bf4:     	fmov	d1, x8
102680bf8:     	fdiv	d1, d9, d1
102680bfc:     	fdiv	d0, d1, d0
102680c00:     	str	d0, [x22]
102680c04:     	ldr	x0, [sp, #0x40]
102680c08:     	bl	0x10368ab3c
102680c0c:     	mov	x25, x0
102680c10:     	ldr	x0, [sp, #0x40]
102680c14:     	bl	0x10368ab44
102680c18:     	scvtf	d0, w25
102680c1c:     	scvtf	d1, w0
102680c20:     	stp	xzr, xzr, [sp, #0x20]
102680c24:     	stp	d0, d1, [sp, #0x30]
102680c28:     	ldr	w8, [x24, #0x13a4]
102680c2c:     	cbz	w8, 0x102680c98
102680c30:     	ldr	x0, [x24, #0x28]
102680c34:     	mov	x8, sp
102680c38:     	bl	0x1025f7088
102680c3c:     	ldr	x0, [sp]
102680c40:     	bl	0x10368ab3c
102680c44:     	mov	x24, x0
102680c48:     	ldr	w0, [x23]
102680c4c:     	bl	0x1025f71c0
102680c50:     	fmov	d9, d0
102680c54:     	ldr	x0, [sp]
102680c58:     	bl	0x10368ab44
102680c5c:     	mov	x25, x0
102680c60:     	ldr	w0, [x23]
102680c64:     	bl	0x1025f71c0
102680c68:     	scvtf	d1, w24
102680c6c:     	fmul	d1, d9, d1
102680c70:     	fmov	d2, #0.50000000
102680c74:     	fmul	d9, d1, d2
102680c78:     	scvtf	d1, w25
102680c7c:     	fmul	d0, d0, d1
102680c80:     	fmov	d1, #0.50000000
102680c84:     	fmul	d10, d0, d1
102680c88:     	mov	x8, sp
102680c8c:     	add	x0, x8, #0x8
102680c90:     	bl	0x10001022c
102680c94:     	b	0x102680ca0
102680c98:     	movi	d9, #0000000000000000
102680c9c:     	movi	d10, #0000000000000000
102680ca0:     	ldr	d0, [x19, #0x10]
102680ca4:     	fsub	d0, d0, d9
102680ca8:     	str	d0, [x19, #0x10]
102680cac:     	ldr	d1, [x19, #0x28]
102680cb0:     	fsub	d1, d1, d10
102680cb4:     	str	d1, [x19, #0x28]
102680cb8:     	ldr	d2, [x22]
102680cbc:     	fneg	d3, d2
102680cc0:     	cmp	w21, #0x0
102680cc4:     	fcsel	d4, d2, d3, eq
102680cc8:     	cmp	w20, #0x0
102680ccc:     	fcsel	d2, d2, d3, eq
102680cd0:     	ldr	q3, [x19]
102680cd4:     	fmul.2d	v3, v3, v4[0]
102680cd8:     	str	q3, [x19]
102680cdc:     	fmul	d0, d0, d4
102680ce0:     	str	d0, [x19, #0x10]
102680ce4:     	ldur	q0, [x19, #0x18]
102680ce8:     	fmul.2d	v0, v0, v2[0]
102680cec:     	stur	q0, [x19, #0x18]
102680cf0:     	fmul	d0, d1, d2
102680cf4:     	str	d0, [x19, #0x28]
102680cf8:     	mov	x0, x19
102680cfc:     	fmov	d0, d8
102680d00:     	bl	0x10221a720
102680d04:     	ldr	d0, [x19, #0x10]
102680d08:     	fadd	d0, d9, d0
102680d0c:     	str	d0, [x19, #0x10]
102680d10:     	ldr	d0, [x19, #0x28]
102680d14:     	fadd	d0, d10, d0
102680d18:     	str	d0, [x19, #0x28]
102680d1c:     	add	x0, sp, #0x20
102680d20:     	mov	x1, x19
102680d24:     	bl	0x102681110
102680d28:     	stp	d0, d1, [sp]
102680d2c:     	stp	d2, d3, [sp, #0x10]
102680d30:     	mov	x0, sp
102680d34:     	mov	w1, #0x0                ; =0
102680d38:     	bl	0x10221b9a4
102680d3c:     	ldr	d2, [x19, #0x10]
102680d40:     	fsub	d0, d2, d0
102680d44:     	str	d0, [x19, #0x10]
102680d48:     	ldr	d0, [x19, #0x28]
102680d4c:     	fsub	d0, d0, d1
102680d50:     	str	d0, [x19, #0x28]
102680d54:     	add	x8, sp, #0x40
102680d58:     	add	x0, x8, #0x8
102680d5c:     	bl	0x10001022c
102680d60:     	ldp	x29, x30, [sp, #0xb0]
102680d64:     	ldp	x20, x19, [sp, #0xa0]
102680d68:     	ldp	x22, x21, [sp, #0x90]
102680d6c:     	ldp	x24, x23, [sp, #0x80]
102680d70:     	ldp	x26, x25, [sp, #0x70]
102680d74:     	ldp	d9, d8, [sp, #0x60]
102680d78:     	ldp	d11, d10, [sp, #0x50]
102680d7c:     	add	sp, sp, #0xc0
102680d80:     	ret
102680d84:     	b	0x102680d98
102680d88:     	b	0x102680d98
102680d8c:     	b	0x102680d98
102680d90:     	b	0x102680d98
102680d94:     	b	0x102680d98
102680d98:     	mov	x19, x0
102680d9c:     	b	0x102680db0
102680da0:     	mov	x19, x0
102680da4:     	mov	x8, sp
102680da8:     	add	x0, x8, #0x8
102680dac:     	bl	0x10001022c
102680db0:     	add	x8, sp, #0x40
102680db4:     	add	x0, x8, #0x8
102680db8:     	bl	0x10001022c
102680dbc:     	mov	x0, x19
102680dc0:     	bl	0x103bda970

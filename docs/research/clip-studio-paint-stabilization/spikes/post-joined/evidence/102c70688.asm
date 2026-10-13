
FUNCTION 0x102c70688 size 116
102c70688: ff8302d1  sub	sp, sp, #0xa0
102c7068c: f44f08a9  stp	x20, x19, [sp, #0x80]
102c70690: fd7b09a9  stp	x29, x30, [sp, #0x90]
102c70694: fd430291  add	x29, sp, #0x90
102c70698: f30300aa  mov	x19, x0
102c7069c: 202040a9  ldp	x0, x8, [x1]
102c706a0: e0a300a9  stp	x0, x8, [sp, #0x8]
102c706a4: 880000b4  cbz	x8, 0x102c706b4
102c706a8: 08210091  add	x8, x8, #0x8
102c706ac: 29008052  mov	w9, #0x1                ; =1
102c706b0: 080129b8  ldadd	w9, w8, [x8]
102c706b4: f4230091  add	x20, sp, #0x8
102c706b8: a00000b4  cbz	x0, 0x102c706cc
102c706bc: e1630091  add	x1, sp, #0x18
102c706c0: 8fab0694  bl	0x102e1b4fc
102c706c4: e04346fc  ldur	d0, [sp, #0x64]
102c706c8: 600a00fd  str	d0, [x19, #0x10]
102c706cc: 80220091  add	x0, x20, #0x8
102c706d0: d77e4e97  bl	0x10001022c
102c706d4: 601240b9  ldr	w0, [x19, #0x10]
102c706d8: fd7b49a9  ldp	x29, x30, [sp, #0x90]
102c706dc: f44f48a9  ldp	x20, x19, [sp, #0x80]
102c706e0: ff830291  add	sp, sp, #0xa0
102c706e4: c0035fd6  ret
102c706e8: f30300aa  mov	x19, x0
102c706ec: 80220091  add	x0, x20, #0x8
102c706f0: cf7e4e97  bl	0x10001022c
102c706f4: e00313aa  mov	x0, x19
102c706f8: 9ea83d94  bl	0x103bda970


FUNCTION 0x102c709c4 size 32
102c709c4: 081040b9  ldr	w8, [x0, #0x10]
102c709c8: a8000034  cbz	w8, 0x102c709dc
102c709cc: 080040b9  ldr	w8, [x0]
102c709d0: 1f050071  cmp	w8, #0x1
102c709d4: e0179f1a  cset	w0, eq
102c709d8: c0035fd6  ret
102c709dc: 00008052  mov	w0, #0x0                ; =0
102c709e0: c0035fd6  ret

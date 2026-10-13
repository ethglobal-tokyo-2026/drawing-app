# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pencil.e2e.ts >> post correction preserves every output bit across browser engines
- Location: e2e/pencil.e2e.ts:94:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 8
+ Received  + 8

@@ -9,27 +9,27 @@
        "3f9a6380fb8d650e",
        "3ff687da2fd4e0f0",
        "4010000000000000",
        "3fc3333333333334",
        "3fb0a3d70a3d70a4",
-       "400033b4222d94b9",
+       "400033b4222d94ba",
        "4024000000000000",
        "3fcec9b26c9b26cb",
        "3fbaaecdd5978804",
-       "40047419155123c1",
+       "40047419155123c2",
        "4030000000000000",
        "3fd3333333333334",
        "3fc0a3d70a3d70a4",
-       "40073f117d564a04",
+       "40073f117d564a05",
        "4033000000000000",
        "3fdc14afd6a052bf",
        "3fc77dac37dac37d",
        "400c6b4eefbebf8a",
        "403a000000000000",
        "3fe4cccccccccccc",
        "3fd0f5c28f5c28f7",
-       "401318a9c94eec4b",
+       "401318a9c94eec4a",
        "4043000000000000",
        "3feb8f41ae49703a",
        "3fd62caf02caf02d",
        "40164030dda39c25",
        "4047000000000000",
@@ -47,27 +47,27 @@
        "3f9a6380fb8d650e",
        "3ff687da2fd4e0f0",
        "4010000000000000",
        "3fc3333333333334",
        "3fb0a3d70a3d70a4",
-       "400033b4222d94b9",
+       "400033b4222d94ba",
        "4024000000000000",
        "3fcec9b26c9b26cb",
        "3fbaaecdd5978804",
-       "40047419155123c1",
+       "40047419155123c2",
        "4030000000000000",
        "3fd3333333333334",
        "3fc0a3d70a3d70a4",
-       "40073f117d564a04",
+       "40073f117d564a05",
        "4033000000000000",
        "3fdc14afd6a052bf",
        "3fc77dac37dac37d",
        "400c6b4eefbebf8a",
        "403a000000000000",
        "3fe4cccccccccccc",
        "3fd0f5c28f5c28f7",
-       "401318a9c94eec4b",
+       "401318a9c94eec4a",
        "4043000000000000",
        "3feb8f41ae49703a",
        "3fd62caf02caf02d",
        "40164030dda39c25",
        "4047000000000000",
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e8]:
      - 'button "Brown: your stats" [ref=e10] [cursor=pointer]':
        - generic [aria-hidden] [ref=e11]: B
        - generic [ref=e12]: Brown
      - region "Sticker board" [ref=e15]:
        - generic: Stickers you make or receive land here.
        - status [ref=e16]
      - generic:
        - generic:
          - generic:
            - button "Your stickers"
        - paragraph: Drag a sticker onto your board, or tap it to stick it on
        - status
    - generic [ref=e38]:
      - generic [ref=e39]:
        - 'button "Draw a new sticker: 3 daily tickets left" [ref=e40] [cursor=pointer]': Draw
        - generic [aria-hidden]:
          - generic: ×3
      - generic [aria-hidden]: Make your first sticker
    - navigation "App sections" [ref=e43]:
      - button "My board" [ref=e44] [cursor=pointer]
      - button "Explore" [ref=e48] [cursor=pointer]
      - button "Shop" [ref=e52] [cursor=pointer]
  - status
```

# Test source

```ts
  64  | async function committedInkDigest(page: Page) {
  65  |   return page.locator(".ink-layers canvas").evaluateAll(async (canvases) => {
  66  |     return Promise.all(
  67  |       canvases.map(async (element) => {
  68  |         if (!(element instanceof HTMLCanvasElement)) throw new Error("The layer is not a canvas");
  69  |         const canvas = element;
  70  |         if (canvas.width === 0 || canvas.height === 0) return `${canvas.width}x${canvas.height}`;
  71  |         const context = canvas.getContext("2d");
  72  |         if (!context) throw new Error("The committed layer has no drawing context");
  73  |         const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  74  |         const digest = await crypto.subtle.digest("SHA-256", pixels);
  75  |         return Array.from(new Uint8Array(digest), (byte) =>
  76  |           byte.toString(16).padStart(2, "0"),
  77  |         ).join("");
  78  |       }),
  79  |     );
  80  |   });
  81  | }
  82  | 
  83  | /** Two fingertips land together near the sheet's foot, and lift. */
  84  | async function twoFingerTap(fingers: Hand, box: Box) {
  85  |   const tap = [at(box, 0.3, 0.85), at(box, 0.45, 0.85)].map((point, i) => ({
  86  |     ...point,
  87  |     id: 10 + i,
  88  |     radius: FINGERTIP,
  89  |   }));
  90  |   await fingers.down(tap);
  91  |   await fingers.up();
  92  | }
  93  | 
  94  | test("post correction preserves every output bit across browser engines", async ({ page }, testInfo) => {
  95  |   const bits = (values: readonly number[]) =>
  96  |     values.map((value) => {
  97  |       const bytes = Buffer.alloc(8);
  98  |       bytes.writeDoubleBE(value);
  99  |       return bytes.toString("hex");
  100 |     });
  101 |   const cases = [0.1, 1].map((pressure) => {
  102 |     const positions = [[0, 0], [1, 0.3], [2, 1], [3, -0.2], [4, 0], [5, 2]];
  103 |     const packets = positions.map(([x, y], index) => ({
  104 |       x: x * 0.2,
  105 |       y: y * 0.2,
  106 |       pressure,
  107 |       t: 100 + index * 10,
  108 |       phase: (index === 0 ? 2 : index === positions.length - 1 ? 3 : 1) as 1 | 2 | 3,
  109 |     }));
  110 |     const input: PostCorrectionInput = {
  111 |       packets,
  112 |       renderedPoints: packets.flatMap((packet, index) => [packet.x, packet.y, index + 1, index * 10]),
  113 |       settings: { ...FIRST_POST_CORRECTION, strength: 1 },
  114 |       magnificationFraction: 1,
  115 |       brushSize: 29.5,
  116 |       pointerType: "pen",
  117 |       stabilization: 20,
  118 |     };
  119 |     const expected = correctPostStroke(input).points;
  120 |     const geometry = Array.from({ length: expected.length / 4 }, (_, index) => ({
  121 |       x: expected[index * 4],
  122 |       y: expected[index * 4 + 1],
  123 |     }));
  124 |     return {
  125 |       pressure,
  126 |       input,
  127 |       geometry,
  128 |       expected,
  129 |       expectedBits: bits(expected),
  130 |       expectedTransferBits: bits(transferStrokeAttributes(geometry, input.renderedPoints)),
  131 |     };
  132 |   });
  133 |   expect(cases[0].expected.slice(0, 4)).toEqual([0, 0, 1, 0]);
  134 |   expect(cases[1].expected[0]).toBeGreaterThan(0);
  135 |   expect(cases[0].expected).not.toEqual(cases[1].expected);
  136 |   for (const c of cases) expect(c.expected.slice(-4)).toEqual([1, 0.4, 6, 50]);
  137 | 
  138 |   await page.goto("/");
  139 |   const observed = await page.evaluate(async (inputs) => {
  140 |     // Vite serves the production module. Only test inputs and bit encoding are repeated here.
  141 |     const modulePath = "/src/sticker-creation/canvas/post-correction/core.ts";
  142 |     const correction = (await import(modulePath)) as {
  143 |       correctPostStroke: typeof correctPostStroke;
  144 |       transferStrokeAttributes: typeof transferStrokeAttributes;
  145 |     };
  146 |     const bits = (values: readonly number[]) =>
  147 |       values.map((value) => {
  148 |         const bytes = new DataView(new ArrayBuffer(8));
  149 |         bytes.setFloat64(0, value);
  150 |         return Array.from(new Uint8Array(bytes.buffer), (byte) =>
  151 |           byte.toString(16).padStart(2, "0"),
  152 |         ).join("");
  153 |       });
  154 |     return inputs.map(({ input, geometry }) => ({
  155 |       points: bits(correction.correctPostStroke(input).points),
  156 |       transferred: bits(correction.transferStrokeAttributes(geometry, input.renderedPoints)),
  157 |     }));
  158 |   }, cases.map(({ input, geometry }) => ({ input, geometry })));
  159 |   await testInfo.attach("cross-engine-correction.json", {
  160 |     body: JSON.stringify({ cases, observed }, null, 2),
  161 |     contentType: "application/json",
  162 |   });
  163 |   // This checks cross-engine consistency, separately from the native arithmetic comparisons.
> 164 |   expect(observed).toEqual(cases.map((c) => ({ points: c.expectedBits, transferred: c.expectedTransferBits })));
      |                    ^ Error: expect(received).toEqual(expected) // deep equality
  165 | });
  166 | 
  167 | test("a pen's first stroke brings the Pencil only tile; fingers then only tap, until the tile lets them draw", async ({
  168 |   page,
  169 | }) => {
  170 |   const box = await openSheet(page, "pencil-only");
  171 |   await expect(pencilOnlyTile(page)).toHaveCount(0);
  172 |   const pen = await pencil(page);
  173 |   const penRow = along(box, 0.2, 0.1, 0.4);
  174 |   await penStroke(page, pen, penRow, () => 0.5);
  175 |   await expect(undo(page)).toBeEnabled();
  176 |   await expect(pencilOnlyTile(page)).toHaveAttribute("aria-pressed", "true");
  177 | 
  178 |   const fingers = await hand(page);
  179 |   const fingerRow = along(box, 0.5, 0.6, 0.9);
  180 |   await touchStroke(page, fingers, fingerRow, FINGERTIP);
  181 |   expect(await inkAt(page, middle(fingerRow))).toBe(0);
  182 |   // Fingers still tap: two take the pen's stroke back.
  183 |   await twoFingerTap(fingers, box);
  184 |   await expect.poll(() => inkAt(page, middle(penRow))).toBe(0);
  185 | 
  186 |   await pencilOnlyTile(page).click();
  187 |   await expect(pencilOnlyTile(page)).toHaveAttribute("aria-pressed", "false");
  188 |   await touchStroke(page, fingers, fingerRow, FINGERTIP);
  189 |   expect(await inkAt(page, middle(fingerRow))).toBeGreaterThan(0);
  190 | });
  191 | 
  192 | test("a hovering pen rings where it will land, as wide as the stroke it draws, and the ring goes as it lands or leaves", async ({
  193 |   page,
  194 | }) => {
  195 |   // Off draws the brush's own width, so the stroke under the ring has one width to match.
  196 |   await page.addInitScript(() => localStorage.setItem("draw.penPressure", "off"));
  197 |   const box = await openSheet(page, "hover");
  198 |   const pen = await pencil(page);
  199 |   const ring = page.locator(".nib-ring");
  200 |   const row = along(box, 0.4, 0.2, 0.7);
  201 |   await pen.hover(row[0]);
  202 |   await expect(ring).toBeVisible();
  203 |   const shown = await ring.boundingBox();
  204 |   if (!shown) throw new Error("The ring has no box");
  205 |   expect(Math.abs(shown.x + shown.width / 2 - row[0].x)).toBeLessThan(1.5);
  206 |   expect(Math.abs(shown.y + shown.height / 2 - row[0].y)).toBeLessThan(1.5);
  207 | 
  208 |   // Pressed ever harder, a stroke under Off keeps one width: the ring's.
  209 |   await penStroke(page, pen, row, (i) => 0.1 + (0.9 * i) / row.length, 40);
  210 |   await expect(ring).toBeHidden();
  211 |   const early = await inkAt(page, row[8]);
  212 |   const late = await inkAt(page, row[row.length - 4]);
  213 |   expect(Math.abs(early - late)).toBeLessThan(1);
  214 |   expect(Math.abs(late - shown.width)).toBeLessThan(2);
  215 | 
  216 |   await pen.hover(at(box, 0.5, 0.7));
  217 |   await expect(ring).toBeVisible();
  218 |   // Above the paper, over the top bar.
  219 |   await pen.hover({ x: box.x + 30, y: box.y - 30 });
  220 |   await expect(ring).toBeHidden();
  221 | });
  222 | 
  223 | test("pen pressure: a pen whose pressure never moves draws by speed; then strokes widen as they press harder, and start as light as they land", async ({
  224 |   page,
  225 | }) => {
  226 |   const box = await openSheet(page, "pressure");
  227 |   const pen = await pencil(page);
  228 |   // The page's first strokes, at one pressure: a quick one draws thinner than a slow one.
  229 |   const slow = along(box, 0.15, 0.1, 0.4);
  230 |   const quick = along(box, 0.15, 0.6, 0.9);
  231 |   await penStroke(page, pen, slow, () => 0.5, 60);
  232 |   await penStroke(page, pen, quick, () => 0.5, 0);
  233 |   await inkShows(page, middle(slow), middle(quick));
  234 |   expect(await inkAt(page, middle(quick))).toBeLessThan(await inkAt(page, middle(slow)));
  235 | 
  236 |   // Pressure that moves sets the width: wider where it's pressed harder.
  237 |   const rising = along(box, 0.35, 0.1, 0.9);
  238 |   await penStroke(page, pen, rising, (i) => 0.1 + (0.9 * i) / rising.length);
  239 |   await inkShows(page, rising[4], rising[rising.length - 4]);
  240 |   expect(await inkAt(page, rising[4])).toBeLessThan(await inkAt(page, rising[rising.length - 4]));
  241 | 
  242 |   // From now on a stroke starts at its first sample's width: a light one starts thin.
  243 |   const light = along(box, 0.6, 0.1, 0.4);
  244 |   const firm = along(box, 0.6, 0.6, 0.9);
  245 |   await penStroke(page, pen, light, () => 0.1);
  246 |   await penStroke(page, pen, firm, () => 0.9);
  247 |   await inkShows(page, light[2], firm[2]);
  248 |   expect(await inkAt(page, light[2])).toBeLessThan(await inkAt(page, firm[2]));
  249 | });
  250 | 
  251 | test("at Smooth, a pen's line trails its nib, stays still without new packets, and finishes on release", async ({
  252 |   page,
  253 | }) => {
  254 |   const box = await openSheet(page, "smooth-pen");
  255 |   const smoothing = page.getByRole("button", {
  256 |     name: say(stickerCreation.tools.smoothing, language),
  257 |   });
  258 |   await smoothing.click();
  259 |   await page
  260 |     .getByRole("slider", { name: say(stickerCreation.tools.smoothing, language), exact: true })
  261 |     .fill("100");
  262 |   await smoothing.click();
  263 |   await expect(smoothing).toHaveAttribute("aria-expanded", "false");
  264 | 
```
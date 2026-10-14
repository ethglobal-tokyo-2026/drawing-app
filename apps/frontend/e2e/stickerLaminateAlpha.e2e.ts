import { expect, test } from "@playwright/test";
import { emptyLaminatePage } from "./stickerMaterialFixture";

// The qualified straight-alpha shader is kept only as an independent test reference.
// It predates premultiplied output; do not import the production shader into this reference.
const referenceVertex = `
attribute vec2 position;
varying vec2 uv;
void main() { uv=vec2((position.x+1.0)*.5,(1.0-position.y)*.5); gl_Position=vec4(position,0.,1.); }
`;
const referenceFragment = `
precision highp float;
varying vec2 uv;
uniform sampler2D printImage;
uniform sampler2D cutImage;
uniform sampler2D normalImage;
uniform vec2 size;
uniform mat3 normalTransform;
uniform vec2 pointTurn;
uniform float roughness;
vec2 windowAxes(vec2 p) {
  return 1.-smoothstep(vec2(.10,.145)-.015,vec2(.10,.145)+.015,abs(p-vec2(.02,-.025)));
}
float environment(vec3 r) {
  if(r.z<=0.) return .14;
  vec2 p=r.xy/r.z;
  vec2 filtered=(windowAxes(p-roughness)+2.*windowAxes(p)+windowAxes(p+roughness))*.25;
  return .14+3.06*filtered.x*filtered.y;
}
float linear(float v) { return v<=.04045?v/12.92:pow((v+.055)/1.055,2.4); }
float display(float v) { return v<=.0031308?v*12.92:1.055*pow(v,1./2.4)-.055; }
void main() {
  vec4 art=texture2D(printImage,uv);
  vec3 base=mix(vec3(1.),art.rgb,art.a);
  vec3 n=normalize(normalTransform*((texture2D(normalImage,uv).rgb*255.-128.)/127.));
  vec2 localPoint=(uv-.5)*size/min(size.x,size.y);
  vec2 point=vec2(pointTurn.x*localPoint.x-pointTurn.y*localPoint.y,
    pointTurn.y*localPoint.x+pointTurn.x*localPoint.y);
  vec3 view=normalize(vec3(-point,2.4));
  float cosine=clamp(dot(n,view),0.,1.);
  float transmitted=sqrt(1.-(1.-cosine*cosine)/2.25);
  float perpendicular=(cosine-1.5*transmitted)/(cosine+1.5*transmitted);
  float parallel=(1.5*cosine-transmitted)/(1.5*cosine+transmitted);
  float fresnel=(perpendicular*perpendicular+parallel*parallel)*.5;
  vec3 reflected=normalize(2.*dot(view,n)*n-view);
  vec3 result=clamp(vec3(linear(base.r),linear(base.g),linear(base.b))*.9*(1.-fresnel)+fresnel*environment(reflected),0.,1.);
  gl_FragColor=vec4(display(result.r),display(result.g),display(result.b),texture2D(cutImage,uv).a);
}
`;

const samples = [0, 3, 26, 94, 204, 252, 255];
const cases = [
  { print: "white", finish: "gloss", normal: false, turn: 0, tiltX: 0, tiltY: 0 },
  { print: "line art", finish: "gloss", normal: true, turn: 27, tiltX: 12, tiltY: -8 },
  { print: "gray", finish: "gloss", normal: true, turn: -31, tiltX: -9, tiltY: 14 },
  { print: "saturated ink", finish: "gloss", normal: false, turn: 113, tiltX: 8, tiltY: 5 },
  { print: "line art", finish: "matte", normal: true, turn: 43, tiltX: -12, tiltY: 7 },
  { print: "saturated ink", finish: "matte", normal: true, turn: -73, tiltX: 5, tiltY: -11 },
] as const;

test.use({ viewport: { width: 1032, height: 768 }, deviceScaleFactor: 2 });

test("premultiplied laminate preserves the qualified color and fractional cut over light and dark backgrounds", async ({
  page,
}, info) => {
  await emptyLaminatePage(page);
  await page.goto("/e2e/stickerLaminate.html");
  const observed = await page.evaluate(
    async ({ vertex, fragment, samples, cases }) => {
      const { mountSticker, updateSticker, turnSticker, whenStickerSettled } =
        await import("../src/stickers/stickerRenderer.ts");
      const width = 140;
      const height = 112;
      const contexts: WebGLRenderingContext[] = [];
      let recordingProduction = true;
      const getContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext");
      const getNativeContext: unknown = getContext?.value;
      if (!getContext || typeof getNativeContext !== "function")
        throw new Error("The native canvas context method is unavailable");
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        ...getContext,
        value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
          const context: unknown = Reflect.apply(getNativeContext, this, [kind, ...args]);
          if (recordingProduction && kind === "webgl" && context instanceof WebGLRenderingContext)
            contexts.push(context);
          return context;
        },
      });
      const png = (pixel: (x: number, y: number) => readonly number[]) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("The test bitmap context is unavailable");
        const pixels = context.createImageData(width, height);
        for (let y = 0; y < height; y++)
          for (let x = 0; x < width; x++) pixels.data.set(pixel(x, y), (y * width + x) * 4);
        context.putImageData(pixels, 0, 0);
        const url = canvas.toDataURL("image/png");
        canvas.width = canvas.height = 0;
        return url;
      };
      const cut = png((x) => [255, 255, 255, samples[Math.floor(x / 20)] ?? 0]);
      const normal = png((x, y) => [
        128 + Math.round(18 * Math.sin(x / 9)),
        128 + Math.round(12 * Math.cos(y / 13)),
        253,
        255,
      ]);
      const prints = new Map(
        cases.map(({ print }) => [
          print,
          png((x, y) => {
            if (print === "gray") return [128, 128, 128, 255];
            if (print === "saturated ink")
              return y < height / 2 ? [220, 24, 100, 255] : [17, 89, 231, 127];
            if (print === "line art" && (x % 23 < 3 || y % 29 < 2)) return [18, 18, 18, 255];
            return [255, 255, 255, 255];
          }),
        ]),
      );
      const image = async (url: string) => {
        const result = new Image();
        result.src = url;
        let timer = 0;
        try {
          await Promise.race([
            result.decode(),
            new Promise<never>((_, reject) => {
              timer = window.setTimeout(
                () => reject(new Error("Decoding an alpha reference image exceeded 10 seconds")),
                10_000,
              );
            }),
          ]);
          return result;
        } finally {
          clearTimeout(timer);
        }
      };
      const canvas = document.createElement("canvas");
      canvas.style.cssText = `position:absolute;left:20px;top:20px;width:${width}px;height:${height}px`;
      document.body.append(canvas);
      const first = cases[0];
      if (!first) throw new Error("The alpha qualification has no cases");
      const initialPrint = prints.get(first.print);
      if (!initialPrint) throw new Error("The first alpha reference print is missing");
      const release = mountSticker(canvas, {
        print: initialPrint,
        cut,
        turn: first.turn,
        finish: first.finish,
      });
      const reference = document.createElement("canvas");
      let referenceGL: WebGLRenderingContext | null = null;
      try {
        await whenStickerSettled(canvas, undefined, AbortSignal.timeout(20_000));
        if (canvas.dataset.state !== "ready")
          throw new Error("The actual laminate snapshot did not become ready");
        recordingProduction = false;
        reference.width = canvas.width;
        reference.height = canvas.height;
        const gl = reference.getContext("webgl", {
          alpha: true,
          antialias: false,
          premultipliedAlpha: false,
        });
        if (!gl) throw new Error("The old straight-alpha WebGL context is unavailable");
        referenceGL = gl;
        const shader = (kind: number, source: string) => {
          const compiled = gl.createShader(kind);
          if (!compiled) throw new Error("Allocating the old alpha reference shader failed");
          gl.shaderSource(compiled, source);
          gl.compileShader(compiled);
          if (!gl.getShaderParameter(compiled, gl.COMPILE_STATUS))
            throw new Error(
              `Compiling the old alpha reference shader failed: ${gl.getShaderInfoLog(compiled)}`,
            );
          return compiled;
        };
        const program = gl.createProgram();
        if (!program) throw new Error("Allocating the old alpha reference program failed");
        const vs = shader(gl.VERTEX_SHADER, vertex);
        const fs = shader(gl.FRAGMENT_SHADER, fragment);
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw new Error(
            `Linking the old alpha reference failed: ${gl.getProgramInfoLog(program)}`,
          );
        gl.useProgram(program);
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error("Allocating the old alpha reference geometry failed");
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
          gl.ARRAY_BUFFER,
          new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
          gl.STATIC_DRAW,
        );
        const position = gl.getAttribLocation(program, "position");
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(gl.getUniformLocation(program, "size"), width, height);
        const bind = async (unit: number, name: string, source?: string) => {
          const texture = gl.createTexture();
          if (!texture) throw new Error("Allocating an old alpha reference texture failed");
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
          if (source)
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              await image(source),
            );
          else
            gl.texImage2D(
              gl.TEXTURE_2D,
              0,
              gl.RGBA,
              1,
              1,
              0,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              new Uint8Array([128, 128, 255, 255]),
            );
          gl.uniform1i(gl.getUniformLocation(program, name), unit);
          if (gl.getError() !== gl.NO_ERROR)
            throw new Error(`Uploading old reference texture ${name} failed`);
          return texture;
        };
        const pixelsOf = (source: HTMLCanvasElement) => {
          const context = source.getContext("2d");
          if (!context) throw new Error("The alpha comparison snapshot context is unavailable");
          return context.getImageData(0, 0, source.width, source.height).data;
        };
        const composite = (source: HTMLCanvasElement, background: string) => {
          const result = document.createElement("canvas");
          result.width = source.width;
          result.height = source.height;
          const context = result.getContext("2d");
          if (!context) throw new Error("The alpha composite context is unavailable");
          context.fillStyle = background === "dark" ? "#181818" : "white";
          context.fillRect(0, 0, result.width, result.height);
          if (background === "checker") {
            context.fillStyle = "#242424";
            for (let y = 0; y < result.height; y += 16)
              for (let x = 0; x < result.width; x += 16)
                if ((x / 16 + y / 16) % 2 === 0) context.fillRect(x, y, 16, 16);
          }
          context.drawImage(source, 0, 0);
          const pixels = pixelsOf(result);
          result.width = result.height = 0;
          return pixels;
        };
        const reports = [];
        for (const material of cases) {
          const print = prints.get(material.print);
          if (!print) throw new Error(`The ${material.print} reference is missing`);
          updateSticker(canvas, {
            print,
            cut,
            normal: material.normal ? normal : undefined,
            finish: material.finish,
          });
          turnSticker(canvas, material.turn, material.tiltX, material.tiltY);
          await whenStickerSettled(canvas, undefined, AbortSignal.timeout(20_000));
          const textures = [
            await bind(0, "printImage", print),
            await bind(1, "cutImage", cut),
            await bind(2, "normalImage", material.normal ? normal : undefined),
          ];
          const turn = (material.turn * Math.PI) / 180;
          const x = (material.tiltX * Math.PI) / 180;
          const y = (material.tiltY * Math.PI) / 180;
          // Independent column matrices compose the established Rz(turn) Rx(flightX) Ry(flightY).
          const rz = [
            Math.cos(turn),
            Math.sin(turn),
            0,
            -Math.sin(turn),
            Math.cos(turn),
            0,
            0,
            0,
            1,
          ];
          const rx = [1, 0, 0, 0, Math.cos(x), Math.sin(x), 0, -Math.sin(x), Math.cos(x)];
          const ry = [Math.cos(y), 0, -Math.sin(y), 0, 1, 0, Math.sin(y), 0, Math.cos(y)];
          const multiply = (a: number[], b: number[]) =>
            Array.from({ length: 9 }, (_, index) => {
              const row = index % 3;
              const column = Math.floor(index / 3);
              return (
                a[row] * b[column * 3] +
                a[row + 3] * b[column * 3 + 1] +
                a[row + 6] * b[column * 3 + 2]
              );
            });
          gl.uniformMatrix3fv(
            gl.getUniformLocation(program, "normalTransform"),
            false,
            new Float32Array(multiply(multiply(rz, rx), ry)),
          );
          gl.uniform2f(gl.getUniformLocation(program, "pointTurn"), Math.cos(turn), Math.sin(turn));
          gl.uniform1f(
            gl.getUniformLocation(program, "roughness"),
            material.finish === "matte" ? 0.16 : 0.016,
          );
          gl.viewport(0, 0, reference.width, reference.height);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          const old = document.createElement("canvas");
          old.width = reference.width;
          old.height = reference.height;
          const oldContext = old.getContext("2d");
          if (!oldContext) throw new Error("The old alpha snapshot context is unavailable");
          oldContext.globalCompositeOperation = "copy";
          oldContext.drawImage(reference, 0, 0);
          const actualPixels = pixelsOf(canvas);
          const oldPixels = pixelsOf(old);
          let alphaMaximumDifference = 0;
          let opaqueMaximumDifference = 0;
          let opaquePixels = 0;
          for (let pixel = 0; pixel < actualPixels.length; pixel += 4) {
            alphaMaximumDifference = Math.max(
              alphaMaximumDifference,
              Math.abs(actualPixels[pixel + 3] - oldPixels[pixel + 3]),
            );
            if (oldPixels[pixel + 3] === 255) {
              opaquePixels++;
              for (let channel = 0; channel < 3; channel++)
                opaqueMaximumDifference = Math.max(
                  opaqueMaximumDifference,
                  Math.abs(actualPixels[pixel + channel] - oldPixels[pixel + channel]),
                );
            }
          }
          const backgrounds = ["white", "dark", "checker"].map((background) => {
            const a = composite(canvas, background);
            const b = composite(old, background);
            let maximumDifference = 0;
            let fractionalMaximumDifference = 0;
            let nonFractionalMaximumDifference = 0;
            for (let pixel = 0; pixel < a.length; pixel += 4) {
              const alpha = oldPixels[pixel + 3];
              for (let channel = 0; channel < 3; channel++) {
                const difference = Math.abs(a[pixel + channel] - b[pixel + channel]);
                maximumDifference = Math.max(maximumDifference, difference);
                if (alpha > 0 && alpha < 255)
                  fractionalMaximumDifference = Math.max(fractionalMaximumDifference, difference);
                else
                  nonFractionalMaximumDifference = Math.max(
                    nonFractionalMaximumDifference,
                    difference,
                  );
              }
            }
            return {
              background,
              maximumDifference,
              fractionalMaximumDifference,
              nonFractionalMaximumDifference,
            };
          });
          const alphaSamples = samples.map(
            (_, index) =>
              actualPixels[
                (Math.floor(canvas.height / 2) * canvas.width +
                  Math.floor(((index * 20 + 10) * canvas.width) / width)) *
                  4 +
                  3
              ],
          );
          reports.push({
            material,
            alphaMaximumDifference,
            opaqueMaximumDifference,
            opaquePixels,
            backgrounds,
            alphaSamples,
          });
          old.width = old.height = 0;
          for (const texture of textures) gl.deleteTexture(texture);
        }
        return { attributes: contexts.map((context) => context.getContextAttributes()), reports };
      } finally {
        release();
        canvas.remove();
        referenceGL?.getExtension("WEBGL_lose_context")?.loseContext();
        reference.width = reference.height = 0;
        Object.defineProperty(HTMLCanvasElement.prototype, "getContext", getContext);
      }
    },
    { vertex: referenceVertex, fragment: referenceFragment, samples, cases },
  );
  await info.attach("laminate-alpha-reference", {
    body: JSON.stringify(observed),
    contentType: "application/json",
  });
  console.log(
    JSON.stringify({
      engine: info.project.name,
      cases: observed.reports.length,
      alphaMaximumDifference: Math.max(
        ...observed.reports.map((report) => report.alphaMaximumDifference),
      ),
      opaqueMaximumDifference: Math.max(
        ...observed.reports.map((report) => report.opaqueMaximumDifference),
      ),
      fractionalCompositeMaximumDifference: Math.max(
        ...observed.reports.flatMap((report) =>
          report.backgrounds.map((background) => background.fractionalMaximumDifference),
        ),
      ),
      nonFractionalCompositeMaximumDifference: Math.max(
        ...observed.reports.flatMap((report) =>
          report.backgrounds.map((background) => background.nonFractionalMaximumDifference),
        ),
      ),
    }),
  );
  for (const report of observed.reports) {
    expect(report.alphaMaximumDifference, JSON.stringify(report.material)).toBe(0);
    expect(report.alphaSamples).toEqual(samples);
    expect(report.opaquePixels).toBeGreaterThan(0);
    expect(report.opaqueMaximumDifference, JSON.stringify(report.material)).toBe(0);
    for (const background of report.backgrounds) {
      expect(
        background.nonFractionalMaximumDifference,
        `${JSON.stringify(report.material)} opaque/transparent over ${background.background}`,
      ).toBe(0);
      // Moving premultiplication before 8-bit storage changes rounding order. With
      // C=round(255c), A=round(255a), |C*A/255-255ca| <= a/2+c/2+1/1020;
      // final rounding permits at most 2/255 at fractional edges. The initial 1/255
      // assertion failed in WebKit at 2/255; alpha and opaque color remain exact.
      expect(
        background.fractionalMaximumDifference,
        `${JSON.stringify(report.material)} over ${background.background}`,
      ).toBeLessThanOrEqual(2);
    }
  }
  expect(observed.attributes).toHaveLength(1);
  expect(
    observed.attributes[0]?.premultipliedAlpha,
    "The actual laminate must use the qualified premultiplied snapshot path",
  ).toBe(true);
});

test("complete material covers fractional paper edges and independent sealing amounts", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?board=1");
  const result = await page.evaluate(async () => {
    const { required, solidPng } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    const png = (alpha: number) => solidPng(32, 32, `rgba(255,255,255,${alpha / 255})`);
    const c = document.createElement("canvas");
    c.style.cssText = "position:absolute;left:20px;top:20px;width:32px;height:32px";
    document.body.append(c);
    const foil = { style: "silver" as const, size: "board" as const, mask: png(128) };
    const material = { print: png(255), cut: png(128), finish: "gloss" as const, foil };
    const release = api.mountSticker(c, { ...material, turn: 0 });
    const pixel = () =>
      Array.from(required(c.getContext("2d")).getImageData(c.width / 2, c.height / 2, 1, 1).data);
    try {
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const combined = pixel();
      api.setStickerAmounts(c, 0, 1);
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const foilOnly = pixel();
      api.setStickerAmounts(c, 1, 0);
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const paperOnly = pixel();
      api.setStickerAmounts(c, 1, 1);
      api.updateSticker(c, { ...material, cut: png(255) });
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const opaque = pixel();
      api.setStickerAmounts(c, 0, 1);
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const occluded = pixel();
      api.setStickerAmounts(c, 1, 1);
      api.updateSticker(c, { ...material, cut: png(255), foil: undefined });
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      return { combined, foilOnly, paperOnly, opaque, occluded, paper: pixel() };
    } finally {
      release();
      c.remove();
    }
  });
  expect(result.combined[3]).toBeCloseTo(192, -0.3);
  expect(result.opaque).toEqual(result.paper);
  expect(result.occluded).toEqual([0, 0, 0, 0]);
  expect(result.foilOnly[3]).toBeCloseTo(64, -0.3);
  expect(result.paperOnly[3]).toBe(128);
  for (let channel = 0; channel < 3; channel++) {
    const expected =
      (result.paperOnly[channel] * result.paperOnly[3]) / 255 +
      (result.foilOnly[channel] * result.foilOnly[3]) / 255;
    expect(
      Math.abs((result.combined[channel] * result.combined[3]) / 255 - expected),
    ).toBeLessThanOrEqual(2);
  }
});

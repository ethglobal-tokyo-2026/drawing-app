import {
  createFoilLookup,
  createFoilSourceSamples,
  type FoilStyle,
} from "../src/stickers/foilMaterial";
import { foilFragment } from "../src/stickers/foilShader";
import { stickerVertex } from "../src/stickers/stickerShader";
import { orientNormal } from "../../../docs/research/sticker-laminate/material-reference";
import "../src/styles/tokens.css";
export interface FoilFixtureOptions {
  x?: number;
  y?: number;
  turn?: number;
  grating?: number;
  style?: FoilStyle;
  room?: "source" | "removed" | "dark" | "broad";
  grid?: number;
  diagnostic?: boolean;
  geometry?: "flat" | "ramp" | "plateau";
  side?: number;
}
declare global {
  interface Window {
    foilFixture: {
      stages: Record<string, number>;
      render: (options: FoilFixtureOptions) => number[];
    };
  }
}
function present<T>(value: T | null | undefined): T {
  if (value == null) throw new Error("Required foil fixture resource is unavailable");
  return value;
}
const canvas = present(document.querySelector<HTMLCanvasElement>("#foil"));
const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
if (!gl) throw new Error("Foil fixture could not acquire WebGL");
const gpu = gl;
const program = present(gpu.createProgram());
function shader(type: number, source: string) {
  const shader = present(gpu.createShader(type));
  gpu.shaderSource(shader, source);
  gpu.compileShader(shader);
  if (!gpu.getShaderParameter(shader, gpu.COMPILE_STATUS))
    throw new Error(gpu.getShaderInfoLog(shader) ?? "Foil fixture shader failed");
  gpu.attachShader(program, shader);
}
shader(gpu.VERTEX_SHADER, stickerVertex);
shader(
  gpu.FRAGMENT_SHADER,
  `precision highp float;varying vec2 uv;uniform mat3 frame;uniform vec2 turn;uniform vec2 grating;uniform float diagnostic;uniform float geometry;uniform float side;${foilFragment}
float display(float v){return v<=.0031308?v*12.92:1.055*pow(v,1./2.4)-.055;}
void main(){
 vec3 localNormal=normalize(vec3(geometry>.5&&geometry<1.5?-.16:0.,0.,1.));
 vec3 n=normalize(frame*localNormal),t=frame*vec3(grating,0.);
 vec2 p=uv-.5;p=vec2(turn.x*p.x-turn.y*p.y,turn.y*p.x+turn.x*p.y);
 vec3 v=normalize(vec3(-p,2.4));
 if(diagnostic>.5){
 float value=foilY(foilDiffraction(n,v,t,0.,0.));
 float encoded=floor(clamp((log2(max(value,exp2(-30.)))+30.)/34.,0.,1.)*65535.+.5);
 gl_FragColor=vec4(floor(encoded/256.)/255.,mod(encoded,256.)/255.,0.,1.);return;
 }
 vec3 c=shadeFoil(uv*80.,0.,n,v,t,80./side,0.);
 gl_FragColor=vec4(display(c.r),display(c.g),display(c.b),1.);
}`,
);
gpu.linkProgram(program);
if (!gpu.getProgramParameter(program, gpu.LINK_STATUS))
  throw new Error(gpu.getProgramInfoLog(program) ?? "Foil fixture link failed");
gpu.useProgram(program);
const buffer = gpu.createBuffer();
gpu.bindBuffer(gpu.ARRAY_BUFFER, buffer);
gpu.bufferData(gpu.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gpu.STATIC_DRAW);
const position = gpu.getAttribLocation(program, "position");
gpu.enableVertexAttribArray(position);
gpu.vertexAttribPointer(position, 2, gpu.FLOAT, false, 0, 0);
const texture = gpu.createTexture();
gpu.bindTexture(gpu.TEXTURE_2D, texture);
for (const parameter of [gpu.TEXTURE_MIN_FILTER, gpu.TEXTURE_MAG_FILTER])
  gpu.texParameteri(gpu.TEXTURE_2D, parameter, gpu.LINEAR);
for (const parameter of [gpu.TEXTURE_WRAP_S, gpu.TEXTURE_WRAP_T])
  gpu.texParameteri(gpu.TEXTURE_2D, parameter, gpu.CLAMP_TO_EDGE);
const uniform = (name: string) => gpu.getUniformLocation(program, name);
const readColor = (name: string): readonly [number, number, number] => {
  const probe = document.createElement("span");
  probe.style.color = `var(--${name})`;
  document.body.append(probe);
  const matches = present(getComputedStyle(probe).color.match(/[\d.]+/g));
  probe.remove();
  return [Number(matches[0]) / 255, Number(matches[1]) / 255, Number(matches[2]) / 255];
};
const palettes = {
  holo: ["pink", "peach", "lemon", "aqua", "sky", "lilac"],
  pink: ["rose", "blush", "pearl", "candy", "orchid", "magenta"],
};
const linear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
let lastStyle: FoilStyle | undefined;
function render(options: FoilFixtureOptions = {}) {
  const start = performance.now();
  const {
    x = 0,
    y = 0,
    turn = 0,
    grating = 0,
    style = "holo",
    room = "source",
    grid = 3,
    diagnostic = false,
    geometry = "flat",
    side = 240,
  } = options;
  if (lastStyle !== style) {
    const names = style === "pink" ? palettes.pink : palettes.holo;
    const palette = names.map((name) => readColor(`foil-${name}`));
    const lookup = createFoilLookup(style, palette);
    gpu.texImage2D(
      gpu.TEXTURE_2D,
      0,
      gpu.RGBA,
      lookup.width,
      lookup.height,
      0,
      gpu.RGBA,
      gpu.UNSIGNED_BYTE,
      lookup.pixels,
    );
    const tint = style === "pink" ? readColor("foil-rose").map(linear) : [1, 1, 1];
    gpu.uniform3fv(uniform("foilTint"), tint);
    lastStyle = style;
  }
  const prepared = performance.now();
  canvas.width = side;
  canvas.height = side;
  gpu.viewport(0, 0, side, side);
  const pose = { x, y, rotationDegrees: 0 };
  const basis = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ] as const;
  gpu.uniformMatrix3fv(
    uniform("frame"),
    false,
    basis.flatMap((v) => [...orientNormal(v, turn, pose)]),
  );
  gpu.uniform2f(
    uniform("turn"),
    Math.cos((turn * Math.PI) / 180),
    Math.sin((turn * Math.PI) / 180),
  );
  gpu.uniform2f(
    uniform("grating"),
    Math.cos((grating * Math.PI) / 180),
    Math.sin((grating * Math.PI) / 180),
  );
  gpu.uniform1f(
    uniform("foilStyle"),
    ["holo", "pink", "kyoto-seika", "gold", "silver", "roseGold"].indexOf(style),
  );
  const extent = room === "broad" ? 2 : 1;
  gpu.uniform4f(uniform("foilSource"), 0.02, -0.025, 0.1 * extent, 0.145 * extent);
  gpu.uniform4fv(
    uniform("foilSources"),
    // The independent reference integrates only the window, so diagnostics leave the lamps out.
    createFoilSourceSamples(
      0.02,
      -0.025,
      0.1 * extent,
      0.145 * extent,
      grid,
      diagnostic ? [] : undefined,
    ),
  );
  gpu.uniform2f(
    uniform("foilIllumination"),
    room === "dark" ? 0 : 1,
    room === "removed" || room === "dark" ? 0 : 3.06,
  );
  gpu.uniform3fv(uniform("foilInk"), readColor("ink").map(linear));
  gpu.uniform1f(uniform("foilAspect"), 1);
  gpu.uniform1f(uniform("foilSourceGrid"), grid);
  gpu.uniform1f(uniform("diagnostic"), diagnostic ? 1 : 0);
  gpu.uniform1f(uniform("geometry"), ["flat", "ramp", "plateau"].indexOf(geometry));
  gpu.uniform1f(uniform("side"), side);
  gpu.drawArrays(gpu.TRIANGLE_STRIP, 0, 4);
  const submitted = performance.now();
  const pixels = new Uint8Array(side * side * 4);
  gpu.readPixels(0, 0, side, side, gpu.RGBA, gpu.UNSIGNED_BYTE, pixels);
  const read = performance.now();
  if (gpu.getError() !== gpu.NO_ERROR) throw new Error("Foil fixture GPU draw failed");
  canvas.dataset.ready = "true";
  const result = Array.from(pixels);
  const expanded = performance.now();
  window.foilFixture.stages = {
    side,
    preparationMs: prepared - start,
    submissionMs: submitted - prepared,
    readMs: read - submitted,
    expansionMs: expanded - read,
    totalMs: expanded - start,
  };
  return result;
}
window.foilFixture = { render, stages: {} };
const pose = present(document.querySelector<HTMLSelectElement>("#pose")),
  room = present(document.querySelector<HTMLSelectElement>("#room"));
const update = () => {
  const value = room.value;
  if (value !== "source" && value !== "removed" && value !== "dark" && value !== "broad")
    throw new Error("Unknown fixture room");
  render({ x: pose.value === "paired" ? 0.6 : 0, room: value });
};
pose.addEventListener("change", update);
room.addEventListener("change", update);
update();

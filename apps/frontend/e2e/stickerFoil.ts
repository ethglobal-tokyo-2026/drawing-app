import {
  createFoilLookup,
  FOIL_STYLES,
  gaussQuadrature,
  type FoilStyle,
} from "../src/stickers/foilMaterial";
import { coatFragment } from "../src/stickers/coat";
import { createFoilFragment, FOIL_ROOM, type FoilRoom } from "../src/stickers/foilShader";
import { STILL_POSE } from "../src/stickers/lightMode";
import { ROOM_LIGHT } from "../src/stickers/roomIrradiance";
import { roomFragment } from "../src/stickers/roomShader";
import { roomFoilSources, roomFrame } from "../src/stickers/sharedRoom";
import { stickerFoilColors } from "../src/stickers/stickerFoilMaterial";
import { glslFloat } from "../src/stickers/glsl";
import { SCREENTONE } from "../src/stickers/screentone";
import { stickerVertex } from "../src/stickers/stickerShader";
import { toneFragment } from "../src/stickers/tone";
import { orientNormal } from "../../../docs/research/sticker-laminate/material-reference";
import "../src/styles/tokens.css";
type Room = "source" | "removed" | "dark" | "broad";
export interface FoilFixtureOptions {
  /** The device's pose against gravity, which turns the room; the still pose without one. */
  beta?: number;
  gamma?: number;
  /** The foil's own turn out of the screen, as a flight turns it; normals otherwise stay put. */
  x?: number;
  y?: number;
  turn?: number;
  /** The point's angle around a sticker's band, in degrees; its grooves run along it unless `grating` turns them. */
  polar?: number;
  grating?: number;
  style?: FoilStyle;
  room?: Room;
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
/**
 * The renderer's room, then the same room with its ceiling light off, or all dark; the diffraction
 * reference lights the renderer's foil with its own window instead, twice the size in the broad room.
 */
const rooms: Record<Room, FoilRoom> = {
  source: FOIL_ROOM,
  removed: { ...FOIL_ROOM, light: 0 },
  dark: { light: 0, bounce: 0 },
  broad: FOIL_ROOM,
};
/**
 * The window docs/research/sticker-foil/material-reference.ts integrates: its center and half extent on
 * the plane one unit toward the viewer (y down), the width of its feathered edge, and its radiance.
 */
const referenceWindow = { x: 0.02, y: -0.025, halfWidth: 0.1, halfHeight: 0.145, feather: 0.015 };
const REFERENCE_RADIANCE = 3.06;
type ReferenceWindow = typeof referenceWindow;
const windows: Record<Room, ReferenceWindow> = {
  source: referenceWindow,
  removed: referenceWindow,
  dark: referenceWindow,
  broad: {
    ...referenceWindow,
    halfWidth: 2 * referenceWindow.halfWidth,
    halfHeight: 2 * referenceWindow.halfHeight,
  },
};
/** The feathered window's measure along one axis. */
function windowAxis(halfExtent: number, edge: number, count: number) {
  const steps = 512,
    extent = halfExtent + edge;
  const coordinates = Array.from(
    { length: steps },
    (_, i) => ((2 * (i + 0.5)) / steps - 1) * extent,
  );
  const weights = coordinates.map((x) => {
    const t = Math.max(0, Math.min(1, (Math.abs(x) - halfExtent + edge) / (2 * edge)));
    return ((1 - t * t * (3 - 2 * t)) * 2 * extent) / steps;
  });
  return gaussQuadrature(coordinates, weights, count);
}
/**
 * xyzw samples: the window's grid² quadrature (incident unit direction, solid angle including its
 * feather). The shader reads sixteen.
 */
function windowSamples(source: ReferenceWindow, grid: number) {
  if (!Number.isInteger(grid) || grid < 1 || grid > 4)
    throw new Error("Foil source grid must be between one and four");
  const horizontal = windowAxis(source.halfWidth, source.feather, grid),
    vertical = windowAxis(source.halfHeight, source.feather, grid);
  const samples = new Float32Array(64);
  let at = 0;
  for (const sy of vertical)
    for (const sx of horizontal) {
      const px = source.x + sx.position,
        py = source.y + sy.position,
        d = Math.hypot(px, py, 1);
      samples.set([px / d, py / d, 1 / d, (sx.weight * sy.weight) / d ** 3], at);
      at += 4;
    }
  return samples;
}
const canvas = present(document.querySelector<HTMLCanvasElement>("#foil"));
const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false });
if (!gl) throw new Error("Foil fixture could not acquire WebGL");
const gpu = gl;
if (!gpu.getExtension("OES_standard_derivatives"))
  throw new Error("Foil fixture needs standard derivatives, as the renderer does");
function shader(program: WebGLProgram, type: number, source: string) {
  const shader = present(gpu.createShader(type));
  gpu.shaderSource(shader, source);
  gpu.compileShader(shader);
  if (!gpu.getShaderParameter(shader, gpu.COMPILE_STATUS))
    throw new Error(gpu.getShaderInfoLog(shader) ?? "Foil fixture shader failed");
  gpu.attachShader(program, shader);
}
const buffer = gpu.createBuffer();
gpu.bindBuffer(gpu.ARRAY_BUFFER, buffer);
gpu.bufferData(gpu.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gpu.STATIC_DRAW);
/** The room is compiled into the foil shader, so each room has its own program. */
const programs = new Map<string, WebGLProgram>();
/** A fixture side spans as many screentone tiles as a sticker's short side. */
const tiles = glslFloat(SCREENTONE.tilesAcross);
function programForRoom(room: FoilRoom) {
  const fragment = `#extension GL_OES_standard_derivatives : enable
precision highp float;varying vec2 uv;uniform mat3 frame;uniform vec2 turn;uniform vec2 grating;uniform float polar;uniform float diagnostic;uniform float geometry;uniform float side;${roomFragment}${coatFragment}${toneFragment}${createFoilFragment(room)}
float display(float v){return v<=.0031308?v*12.92:1.055*pow(v,1./2.4)-.055;}
void main(){
 vec3 localNormal=normalize(vec3(geometry>.5&&geometry<1.5?-.16:0.,0.,1.));
 vec3 n=normalize(frame*localNormal),t=frame*vec3(grating,0.);
 vec2 p=uv-.5;p=vec2(turn.x*p.x-turn.y*p.y,turn.y*p.x+turn.x*p.y);
 if(diagnostic>.5){
 // The independent reference integrates the window at its radiance, as seen from its own eye, 2.4
 // sides out.
 float value=foilY(foilDiffraction(n,normalize(vec3(-p,2.4)),t,0.,0.))*${glslFloat(REFERENCE_RADIANCE)};
 float encoded=floor(clamp((log2(max(value,exp2(-30.)))+30.)/34.,0.,1.)*65535.+.5);
 gl_FragColor=vec4(floor(encoded/256.)/255.,mod(encoded,256.)/255.,0.,1.);return;
 }
 // The renderer's one eye, with the sample's center at the screen's center and its side in CSS px.
 vec3 v=normalize(roomEye-vec3(side*p,0.));
 vec2 lightPoint=roomPlane(normalize(2.*dot(v,n)*n-v));
 roomFootprint=max(length(dFdx(lightPoint)),length(dFdy(lightPoint)));
 vec3 c=shadeFoil(uv*${tiles},polar,n,v,t,${tiles}/side,0.);
 gl_FragColor=vec4(display(c.r),display(c.g),display(c.b),1.);
}`;
  let program = programs.get(fragment);
  if (!program) {
    program = present(gpu.createProgram());
    shader(program, gpu.VERTEX_SHADER, stickerVertex);
    shader(program, gpu.FRAGMENT_SHADER, fragment);
    gpu.linkProgram(program);
    if (!gpu.getProgramParameter(program, gpu.LINK_STATUS))
      throw new Error(gpu.getProgramInfoLog(program) ?? "Foil fixture link failed");
    programs.set(fragment, program);
  }
  gpu.useProgram(program);
  const position = gpu.getAttribLocation(program, "position");
  gpu.enableVertexAttribArray(position);
  gpu.vertexAttribPointer(position, 2, gpu.FLOAT, false, 0, 0);
  return program;
}
/** The room's light map on unit 1, as the renderer samples it; unit 0 keeps the foil lookup. */
const roomLightMap = gpu.createTexture();
gpu.activeTexture(gpu.TEXTURE1);
gpu.bindTexture(gpu.TEXTURE_2D, roomLightMap);
for (const parameter of [gpu.TEXTURE_MIN_FILTER, gpu.TEXTURE_MAG_FILTER])
  gpu.texParameteri(gpu.TEXTURE_2D, parameter, gpu.LINEAR);
gpu.texParameteri(gpu.TEXTURE_2D, gpu.TEXTURE_WRAP_S, gpu.REPEAT);
gpu.texParameteri(gpu.TEXTURE_2D, gpu.TEXTURE_WRAP_T, gpu.CLAMP_TO_EDGE);
gpu.texImage2D(
  gpu.TEXTURE_2D,
  0,
  gpu.RGBA,
  ROOM_LIGHT.width,
  ROOM_LIGHT.height,
  0,
  gpu.RGBA,
  gpu.UNSIGNED_BYTE,
  ROOM_LIGHT.pixels,
);
gpu.activeTexture(gpu.TEXTURE0);
const texture = gpu.createTexture();
gpu.bindTexture(gpu.TEXTURE_2D, texture);
for (const parameter of [gpu.TEXTURE_MIN_FILTER, gpu.TEXTURE_MAG_FILTER])
  gpu.texParameteri(gpu.TEXTURE_2D, parameter, gpu.LINEAR);
for (const parameter of [gpu.TEXTURE_WRAP_S, gpu.TEXTURE_WRAP_T])
  gpu.texParameteri(gpu.TEXTURE_2D, parameter, gpu.CLAMP_TO_EDGE);
let lastStyle: FoilStyle | undefined;
function render(options: FoilFixtureOptions = {}) {
  const start = performance.now();
  const {
    beta = STILL_POSE.beta,
    gamma = STILL_POSE.gamma,
    x = 0,
    y = 0,
    turn = 0,
    polar = 0,
    grating = polar,
    style = "holo",
    room: roomName = "source",
    grid = 3,
    diagnostic = false,
    geometry = "flat",
    side = 240,
  } = options;
  const program = programForRoom(rooms[roomName]);
  const uniform = (name: string) => gpu.getUniformLocation(program, name);
  // The renderer's palette, tint and ink for this style, read from the same design tokens.
  const colors = stickerFoilColors(document.body, { style, size: "board" });
  if (lastStyle !== style) {
    const lookup = createFoilLookup(style, colors.palette);
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
    lastStyle = style;
  }
  gpu.uniform3fv(uniform("foilTint"), colors.tint);
  gpu.uniform1i(uniform("foilLookup"), 0);
  gpu.uniform1i(uniform("roomLightMap"), 1);
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
  gpu.uniform1f(uniform("polar"), (polar * Math.PI) / 180);
  gpu.uniform1f(uniform("foilStyle"), FOIL_STYLES.indexOf(style));
  // The room as the renderer orients it for this pose, and its ceiling light as the foil's sources;
  // the diffraction reference lights the foil with its own window, in the screen's axes.
  const frame = roomFrame({ beta, gamma, screenAngle: 0 });
  for (const [name, value] of [
    ["roomUp", frame.up],
    ["roomToward", frame.toward],
    ["roomLight", frame.light],
    ["roomAcross", frame.across],
    ["roomDown", frame.down],
    ["roomEye", frame.eye],
  ] as const)
    gpu.uniform3fv(uniform(name), value);
  gpu.uniform4fv(
    uniform("foilSources"),
    diagnostic ? windowSamples(windows[roomName], grid) : roomFoilSources(frame),
  );
  gpu.uniform3fv(uniform("foilInk"), colors.ink);
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
/** Tilted back and to the side from the still pose. */
const tilted = { beta: 80, gamma: 20 };
const update = () => {
  const value = room.value;
  if (value !== "source" && value !== "removed" && value !== "dark" && value !== "broad")
    throw new Error("Unknown fixture room");
  render({ ...(pose.value === "tilted" ? tilted : {}), room: value });
};
pose.addEventListener("change", update);
room.addEventListener("change", update);
update();

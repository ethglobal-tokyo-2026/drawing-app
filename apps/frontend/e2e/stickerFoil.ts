import {
  createFoilLookup,
  createFoilSourceSamples,
  FOIL_ROOM,
  FOIL_STYLES,
  type FoilRoom,
  type FoilStyle,
} from "../src/stickers/foilMaterial";
import { createFoilFragment } from "../src/stickers/foilShader";
import { STILL_POSE } from "../src/stickers/lightMode";
import { roomFragment } from "../src/stickers/roomShader";
import { roomFoilSources, roomFrame } from "../src/stickers/sharedRoom";
import { stickerFoilColors } from "../src/stickers/stickerFoilMaterial";
import { glslFloat } from "../src/stickers/glsl";
import { SCREENTONE } from "../src/stickers/screentone";
import { stickerVertex } from "../src/stickers/stickerShader";
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
const overhead = FOIL_ROOM.window;
/**
 * The renderer's room, then the same room with its window off, all dark, or, for the diffraction
 * reference only, with a window twice the size.
 */
const rooms: Record<Room, FoilRoom> = {
  source: FOIL_ROOM,
  removed: { ...FOIL_ROOM, window: { ...overhead, radiance: 0 } },
  dark: { ...FOIL_ROOM, level: 0, window: { ...overhead, radiance: 0 } },
  broad: {
    ...FOIL_ROOM,
    window: { ...overhead, halfWidth: 2 * overhead.halfWidth, halfHeight: 2 * overhead.halfHeight },
  },
};
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
precision highp float;varying vec2 uv;uniform mat3 frame;uniform vec2 turn;uniform vec2 grating;uniform float polar;uniform float diagnostic;uniform float geometry;uniform float side;${roomFragment}${createFoilFragment(room)}
float display(float v){return v<=.0031308?v*12.92:1.055*pow(v,1./2.4)-.055;}
void main(){
 vec3 localNormal=normalize(vec3(geometry>.5&&geometry<1.5?-.16:0.,0.,1.));
 vec3 n=normalize(frame*localNormal),t=frame*vec3(grating,0.);
 vec2 p=uv-.5;p=vec2(turn.x*p.x-turn.y*p.y,turn.y*p.x+turn.x*p.y);
 if(diagnostic>.5){
 // The independent reference integrates the window as seen from its own eye, 2.4 sides out.
 float value=foilY(foilDiffraction(n,normalize(vec3(-p,2.4)),t,0.,0.));
 float encoded=floor(clamp((log2(max(value,exp2(-30.)))+30.)/34.,0.,1.)*65535.+.5);
 gl_FragColor=vec4(floor(encoded/256.)/255.,mod(encoded,256.)/255.,0.,1.);return;
 }
 // The renderer's one eye, with the sample's center at the screen's center and its side in CSS px.
 vec3 v=normalize(roomEye-vec3(side*p,0.));
 vec2 shojiPoint=roomPlane(normalize(2.*dot(v,n)*n-v));
 roomFootprint=max(length(dFdx(shojiPoint)),length(dFdy(shojiPoint)));
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
    grid = FOIL_ROOM.grid,
    diagnostic = false,
    geometry = "flat",
    side = 240,
  } = options;
  // The independent reference integrates only the window, so diagnostics leave the lamps out.
  const room = { ...rooms[roomName], grid, lamps: diagnostic ? [] : FOIL_ROOM.lamps };
  const program = programForRoom(room);
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
  // The room as the renderer orients it for this pose, and its shoji and lamps as the foil's sources;
  // the diffraction reference integrates its own window, in the screen's axes.
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
    diagnostic ? createFoilSourceSamples(room) : roomFoilSources(frame),
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

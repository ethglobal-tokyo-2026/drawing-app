import { describe, expect, it } from "vitest";
import { correctPostStroke, transferStrokeAttributes, type PostCorrectionInput } from "./core";
import { FIRST_POST_CORRECTION } from "./settings";
import { PostCorrectionError } from "./errors";
import { Stabilizer } from "../stabilizer";

const input = (overrides: Partial<PostCorrectionInput> = {}): PostCorrectionInput => ({
  packets: [
    { x: 0, y: 0, pressure: 0.5, t: 10, phase: 2 },
    { x: 20, y: 0, pressure: 0.5, t: 20, phase: 1 },
    { x: 40, y: 0, pressure: 0, t: 30, phase: 3 },
  ],
  renderedPoints: [0, 0, 2, 0, 20, 0, 4, 10, 40, 0, 3, 20],
  settings: { ...FIRST_POST_CORRECTION, strength: 5 },
  magnificationFraction: 1,
  brushSize: 7,
  pointerType: "pen",
  stabilization: 20,
  ...overrides,
});

describe("post-correction core", () => {
  it("uses the selected pressure response to retain a light short-stroke endpoint", () => {
    const draw = (pressure: number) => {
      const positions = [
        [0, 0],
        [1, 0.3],
        [2, 1],
        [3, -0.2],
        [4, 0],
        [5, 2],
      ];
      const packets = positions.map(([x, y], index) => ({
        x: x * 0.2,
        y: y * 0.2,
        pressure,
        t: 100 + index * 10,
        phase: (index === 0 ? 2 : index === positions.length - 1 ? 3 : 1) as 1 | 2 | 3,
      }));
      return correctPostStroke(
        input({
          packets,
          brushSize: 29.5,
          settings: { ...FIRST_POST_CORRECTION, strength: 1 },
          renderedPoints: packets.flatMap((packet, index) => [
            packet.x,
            packet.y,
            index + 1,
            index * 10,
          ]),
        }),
      );
    };
    const light = draw(0.1),
      firm = draw(1);
    // Synthetic short geometry makes the captured response configuration affect deletion.
    // Constructor defaults erase this distinction because their pressure response is disabled.
    expect(light.points.slice(0, 4)).toEqual([0, 0, 1, 0]);
    expect(firm.points[0]).toBeGreaterThan(0);
    expect(light.points).not.toEqual(firm.points);
    expect(light.points.slice(-4)).toEqual([1, 0.4, 6, 50]);
    expect(firm.points.slice(-4)).toEqual([1, 0.4, 6, 50]);
  });

  it("runs all completed packets through recovered source construction and samples the corrected spline directly", () => {
    const source = input();
    const before = structuredClone(source);
    const result = correctPostStroke(source);
    expect(result.sourceNodeCount).toBe(3);
    expect(result.correctedNodeCount).toBeGreaterThanOrEqual(2);
    expect(result.points.slice(0, 4)).toEqual([0, 0, 2, 0]);
    expect(result.points.slice(-4)).toEqual([40, 0, 3, 20]);
    expect(result.points.length).toBeGreaterThan(12);
    for (let i = 1; i < result.points.length; i += 4) expect(result.points[i]).toBe(0);
    expect(source).toEqual(before);
  });

  it("disabled correction preserves existing rendered points without sharing the mutable array", () => {
    const source = input({ settings: FIRST_POST_CORRECTION });
    const result = correctPostStroke(source);
    expect(result.points).toEqual(source.renderedPoints);
    expect(result.points).not.toBe(source.renderedPoints);
  });

  it("requires an explicit terminal phase and never treats the last contact as finalization", () => {
    const packets = input().packets.slice(0, -1);
    expect(() => correctPostStroke(input({ packets }))).toThrow(/phase sequence/);
    const ended = [...packets, { ...packets[1], phase: 3 as const }];
    expect(correctPostStroke(input({ packets: ended })).sourceNodeCount).toBe(3);
    expect(() => correctPostStroke(input({ packets: [ended[0], ended[0], ended[2]] }))).toThrow(
      /phase sequence/,
    );
    expect(() => correctPostStroke(input({ packets: ended.slice(1) }))).toThrow(/phase sequence/);
    expect(() => correctPostStroke(input({ packets: [...ended, ended[0]] }))).toThrow(
      /phase sequence/,
    );
    const unknown = structuredClone(ended);
    Reflect.set(unknown[1], "phase", 4);
    expect(() => correctPostStroke(input({ packets: unknown }))).toThrow(/phase sequence/);
  });

  it("retains idle release coordinates after a zero-pressure native ending without fabricating another source group", () => {
    for (const stabilization of [0, 4, 20, 100]) {
      for (const pressure of stabilization === 0 ? [0, 0.5] : [0]) {
        const stabilizer = new Stabilizer({ x: 0, y: 0, pressure, t: 100 }, stabilization, true);
        const packets = [
          stabilizer.initial,
          ...stabilizer.add({ x: 20, y: 0, pressure: 0, t: 104 }),
          ...stabilizer.finish({ x: 40, y: 0, pressure: 0, t: 108 }),
        ];
        expect(packets.map((packet) => packet.phase)).toEqual(
          stabilization === 0 ? [2, 3, 3] : [2, 3, 1],
        );
        const renderedPoints = [0, 0, 2, 0, 20, 0, 1, 4, 40, 0, 0, 8];
        const result = correctPostStroke(input({ packets, stabilization, renderedPoints }));
        const group = correctPostStroke(
          input({
            packets: packets.slice(0, 2),
            stabilization,
            renderedPoints: [0, 0, 2, 0, packets[1].x, packets[1].y, 1, 4],
          }),
        ).points;
        const geometry = Array.from({ length: group.length / 4 }, (_, index) => ({
          x: group[index * 4],
          y: group[index * 4 + 1],
        }));
        geometry.push({ x: packets[2].x, y: packets[2].y });
        expect(result.points).toEqual(transferStrokeAttributes(geometry, renderedPoints));
        expect(result.sourceNodeCount).toBe(2);
        expect(result.points.slice(-4)).toEqual([packets[2].x, packets[2].y, 0, 8]);
      }
    }
  });

  it("corrects zero-pressure startup and resumed contact as explicit native groups within one result", () => {
    for (const stabilization of [0, 4, 20, 100]) {
      const stabilizer = new Stabilizer({ x: 0, y: 0, pressure: 0, t: 100 }, stabilization, true);
      const packets = [
        stabilizer.initial,
        ...stabilizer.add({ x: 20, y: 0, pressure: 0, t: 104 }),
        ...stabilizer.add({ x: 40, y: 12, pressure: 0.5, t: 108 }),
        ...stabilizer.finish({ x: 60, y: 20, pressure: 0, t: 112 }),
      ];
      expect(packets.filter((packet) => packet.phase === 2)).toHaveLength(2);
      expect(packets.filter((packet) => packet.phase === 3)).toHaveLength(2);
      const renderedPoints = [0, 0, 0, 0, 20, 0, 0, 4, 40, 12, 5, 8, 60, 20, 0, 12];
      const result = correctPostStroke(input({ packets, renderedPoints, stabilization }));
      const secondStart = packets.findIndex((packet, index) => index > 0 && packet.phase === 2);
      const expectedGeometry = [packets.slice(0, secondStart), packets.slice(secondStart)].flatMap(
        (group) => {
          const separate = correctPostStroke(
            input({
              packets: group,
              stabilization,
              renderedPoints: group.flatMap((packet) => [
                packet.x,
                packet.y,
                1,
                packet.t - group[0].t,
              ]),
            }),
          ).points;
          return Array.from({ length: separate.length / 4 }, (_, index) => ({
            x: separate[index * 4],
            y: separate[index * 4 + 1],
          }));
        },
      );
      expect(result.points).toEqual(transferStrokeAttributes(expectedGeometry, renderedPoints));
      expect(result.sourceNodeCount).toBe(packets.length);
      expect(result.points.slice(0, 4)).toEqual([0, 0, 0, 0]);
      expect(result.points.slice(-2)).toEqual([0, 12]);
    }
  });

  it("preserves a zero-length tap and a one-packet stroke deliberately", () => {
    for (const packets of [
      [{ x: 3, y: 7, pressure: 0.5, t: 10, phase: 2 as const }],
      [
        { x: 3, y: 7, pressure: 0.5, t: 10, phase: 2 as const },
        { x: 3, y: 7, pressure: 0, t: 20, phase: 3 as const },
      ],
    ]) {
      const source = input({ packets, renderedPoints: [3, 7, 2, 0] });
      expect(correctPostStroke(source).points).toEqual([3, 7, 2, 0]);
    }
  });

  it("rejects malformed packets, unordered rendering times and an unsupported correction strength", () => {
    expect(() =>
      correctPostStroke(input({ packets: [{ x: NaN, y: 0, pressure: 1, t: 0, phase: 2 }] })),
    ).toThrow(PostCorrectionError);
    expect(() => correctPostStroke(input({ renderedPoints: [0, 0, 1, 5, 1, 0, 1, 3] }))).toThrow(
      PostCorrectionError,
    );
    expect(() =>
      correctPostStroke(input({ settings: { ...FIRST_POST_CORRECTION, strength: 41 } })),
    ).toThrow(PostCorrectionError);
  });
});

describe("Croquis width and time transfer", () => {
  it.each([1e200, 1e-200])("retains distance proportions at coordinate scale %s", (scale) => {
    const geometry = [
      { x: 0, y: 0 },
      { x: scale, y: scale },
      { x: 2 * scale, y: 2 * scale },
    ];
    expect(transferStrokeAttributes(geometry, [0, 0, 2, 0, 2 * scale, 2 * scale, 6, 20])).toEqual([
      0,
      0,
      2,
      0,
      scale,
      scale,
      4,
      10,
      2 * scale,
      2 * scale,
      6,
      20,
    ]);
  });

  it("interpolates existing widths and elapsed times by normalized distance while preserving endpoints exactly", () => {
    expect(
      transferStrokeAttributes(
        [
          { x: 0, y: 5 },
          { x: 5, y: 5 },
          { x: 10, y: 5 },
        ],
        [0, 0, 2, 0, 4, 0, 6, 8, 8, 0, 4, 20],
      ),
    ).toEqual([0, 5, 2, 0, 5, 5, 6, 8, 10, 5, 4, 20]);
  });

  it("uses point order for a zero-length corrected path and retains the full elapsed interval", () => {
    expect(
      transferStrokeAttributes(
        [
          { x: 3, y: 7 },
          { x: 3, y: 7 },
          { x: 3, y: 7 },
        ],
        [0, 0, 2, 0, 8, 0, 4, 20],
      ),
    ).toEqual([3, 7, 2, 0, 3, 7, 3, 10, 3, 7, 4, 20]);
  });
});

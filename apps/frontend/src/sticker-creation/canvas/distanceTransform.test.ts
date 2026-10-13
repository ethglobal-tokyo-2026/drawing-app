import { describe, expect, it } from "vitest";
import { squaredDistanceTransform } from "./distanceTransform";

describe("squared Euclidean distance transform", () => {
  it.each([Float32Array, Float64Array])("keeps squared distances in %s precision", (ArrayType) => {
    const distances = new ArrayType([100, 100, 100, 100, 0, 100, 100, 100, 100]);
    const nearest = new Int32Array(9);
    squaredDistanceTransform(distances, 3, 3, nearest);
    expect([...distances]).toEqual([2, 1, 2, 1, 0, 1, 2, 1, 2]);
    expect([...nearest]).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4]);
  });

  it("finds the nearest original seed across both rectangular passes", () => {
    const distances = new Float64Array([0, 100, 100, 100, 100, 100, 100, 0]);
    const nearest = new Int32Array(8);
    squaredDistanceTransform(distances, 4, 2, nearest);
    expect([...distances]).toEqual([0, 1, 2, 1, 1, 2, 1, 0]);
    expect([...nearest]).toEqual([0, 0, 7, 7, 0, 0, 7, 7]);
  });

  it("accepts finite initial squared costs rather than only binary seeds", () => {
    const distances = new Float64Array([4, 25, 25, 25]);
    squaredDistanceTransform(distances, 2, 2);
    expect([...distances]).toEqual([4, 5, 5, 6]);
  });

  it("keeps empty finite-capped seed fields finite", () => {
    const distances = new Float32Array(12).fill(16);
    const nearest = new Int32Array(12);
    squaredDistanceTransform(distances, 4, 3, nearest);
    expect([...distances]).toEqual(new Array(12).fill(16));
    expect([...nearest]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it.each([Float32Array, Float64Array])(
    "caps binary seed distances in %s precision",
    (ArrayType) => {
      const distances = new ArrayType([0, 4, 4, 4, 4, 4, 4]);
      squaredDistanceTransform(distances, 1, 7);
      expect([...distances]).toEqual([0, 1, 4, 4, 4, 4, 4]);
    },
  );

  it("retains distinct and negative finite initial costs", () => {
    const distinct = new Float64Array([9, 4, 0, 3]);
    squaredDistanceTransform(distinct, 1, 4);
    expect([...distinct]).toEqual([4, 1, 0, 1]);
    const negative = new Float64Array([-3, 7, -1, 7]);
    squaredDistanceTransform(negative, 2, 2);
    expect([...negative]).toEqual([-3, -2, -2, -1]);
  });
});

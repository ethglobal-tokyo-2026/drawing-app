export function paperReadability(pixels: ArrayLike<number>) {
  let min = 255,
    max = 0,
    missingCoverage = 0,
    tinted = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] !== 255) missingCoverage++;
    if (pixels[i + 1] !== pixels[i] || pixels[i + 2] !== pixels[i]) tinted++;
    min = Math.min(min, pixels[i]);
    max = Math.max(max, pixels[i]);
  }
  let bright = 0;
  for (let i = 0; i < pixels.length; i += 4) if (pixels[i] >= min + (max - min) / 2) bright++;
  return {
    min,
    max,
    missingCoverage,
    tinted,
    span: max - min,
    brightFraction: bright / (pixels.length / 4),
  };
}
export function paperDifference(before: ArrayLike<number>, after: ArrayLike<number>) {
  if (after.length !== before.length) throw new Error("Paper snapshot lengths differ");
  let sum = 0,
    visible = 0,
    changedPixels = 0,
    maxChannelDifference = 0;
  for (let i = 0; i < before.length; i += 4) {
    const difference = Math.abs(after[i] - before[i]);
    sum += difference;
    if (difference >= 2) visible++;
    let changed = false;
    for (let channel = 0; channel < 4; channel++) {
      const delta = Math.abs(after[i + channel] - before[i + channel]);
      if (delta) changed = true;
      maxChannelDifference = Math.max(maxChannelDifference, delta);
    }
    if (changed) changedPixels++;
  }
  const count = before.length / 4;
  return {
    mean: sum / count,
    visibleFraction: visible / count,
    changedPixels,
    maxChannelDifference,
  };
}

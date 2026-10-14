/** A number as a GLSL ES float literal, which needs a decimal point or an exponent. */
export function glslFloat(value: number) {
  if (!Number.isFinite(value)) throw new Error(`GLSL has no float literal for ${value}`);
  const text = String(value);
  return /[.e]/.test(text) ? text : `${text}.0`;
}

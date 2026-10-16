import { glslFloat as f } from "./glsl";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Unpolarized Fresnel reflectance from air into a clear film of `index`, at an incidence cosine. */
function fresnel(cosine: number, index: number) {
  const c = Math.min(1, Math.max(0, cosine));
  const transmitted = Math.sqrt(1 - (1 - c * c) / (index * index));
  const perpendicular = (c - index * transmitted) / (c + index * transmitted);
  const parallel = (index * c - transmitted) / (index * c + transmitted);
  return (perpendicular * perpendicular + parallel * parallel) / 2;
}

/** The film's reflectance for light arriving evenly from every direction outside it, cosine-weighted. */
function diffuseFresnel(index: number) {
  const steps = 1024;
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    const cosine = (i + 0.5) / steps;
    sum += fresnel(cosine, index) * 2 * cosine;
  }
  return sum / steps;
}

const index = 1.51;

/**
 * The clear coat over every sticker's print, a BOPP gloss laminate, and the paper under it:
 * - index: BOPP's refractive index, averaged over its stretched axes (US patents on BOPP film).
 * - internalReflectance: K, the share of the paper's diffuse light the coat's underside sends back,
 *   1 − (1 − r_e)/n² with r_e its diffuse reflectance from outside (OpenPBR 1.1.1, coat darkening).
 * - paperAlbedo: glossy white paper's diffuse radiance factor (Akao et al. 2010, JIST).
 * - paperWhite: lit white paper's display-linear level, seen square-on at the still pose; it sets
 *   the exposure.
 * - darkening: OpenPBR's coat darkening δ; 1 is physical.
 */
export const COAT = {
  index,
  internalReflectance: 1 - (1 - diffuseFresnel(index)) / (index * index),
  paperAlbedo: 0.855,
  paperWhite: 0.864,
  darkening: 1,
} as const;

/** The coat's reflectance at an incidence cosine; the rest passes through it. */
export const coatFresnel = (cosine: number) => fresnel(cosine, COAT.index);

/** OpenPBR's Δ: the share of a base of this albedo's light that leaves the coat after every bounce. */
const escaping = (albedo: number) =>
  (1 - COAT.internalReflectance) / (1 - albedo * COAT.internalReflectance);

/**
 * A print channel's linear albedo under the coat, against white paper's: light the coat traps returns
 * to the print and is absorbed again, so mid-tones deepen and saturate while paper white and black ink
 * stay put. `darkening` is OpenPBR's δ.
 */
export function coatDarkened(albedo: number, darkening: number = COAT.darkening) {
  const { paperAlbedo } = COAT;
  return (
    (albedo * lerp(1, escaping(paperAlbedo * albedo), darkening)) /
    lerp(1, escaping(paperAlbedo), darkening)
  );
}

/**
 * White paper's radiance factor under the coat, for light arriving at the incidence cosine `light` and
 * leaving toward the eye at `view`: the interfaced Lambertian ρ·T(light)·T(view) / (n²(1 − ρK)), its
 * albedo ρ darkened by δ. The ceiling light's radiance is π·W over this times the still pose's
 * irradiance, so white paper there shows W.
 */
export function coatedPaperReflectance(light: number, view = 1) {
  const { paperAlbedo, darkening, internalReflectance } = COAT;
  const albedo = paperAlbedo * lerp(1, escaping(paperAlbedo), darkening);
  return (
    (albedo * (1 - coatFresnel(light)) * (1 - coatFresnel(view))) /
    (COAT.index * COAT.index * (1 - internalReflectance))
  );
}

const darkenedWhite = lerp(1, escaping(COAT.paperAlbedo), COAT.darkening);

/** The coat in GLSL, from the same constants: coatFresnel, and coatDarkened per linear channel. */
export const coatFragment = `
float coatFresnel(float cosine){
 float transmitted=sqrt(1.-(1.-cosine*cosine)/${f(COAT.index * COAT.index)});
 float perpendicular=(cosine-${f(COAT.index)}*transmitted)/(cosine+${f(COAT.index)}*transmitted);
 float parallel=(${f(COAT.index)}*cosine-transmitted)/(${f(COAT.index)}*cosine+transmitted);
 return .5*(perpendicular*perpendicular+parallel*parallel);
}
vec3 coatDarkened(vec3 albedo){
 vec3 escaping=${f(1 - COAT.internalReflectance)}/(1.-${f(COAT.paperAlbedo * COAT.internalReflectance)}*albedo);
 return albedo*mix(vec3(1.),escaping,${f(COAT.darkening)})/${f(darkenedWhite)};
}
`;

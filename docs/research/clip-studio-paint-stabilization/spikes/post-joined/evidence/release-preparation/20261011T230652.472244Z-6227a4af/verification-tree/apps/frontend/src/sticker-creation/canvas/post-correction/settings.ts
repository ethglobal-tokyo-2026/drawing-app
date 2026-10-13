/** Croquis range and controls; the native settings reader supplies their arithmetic. */
export interface PostCorrectionSettings {
  strength: number;
  adjustBySpeed: boolean;
  adjustByScale: boolean;
}
export const FIRST_POST_CORRECTION: PostCorrectionSettings = {
  strength: 0,
  adjustBySpeed: false,
  adjustByScale: true,
};

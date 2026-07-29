/**
 * Plain geometry shared by the stores, renderers and services.
 *
 * Whether a value is in screen px or page px is always stated by the API that
 * takes it — the types themselves are deliberately unopinionated.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

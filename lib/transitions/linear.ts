import type {Transition} from './Base';
import {glsl} from "../utils/ShaderLib";

export const linear: Transition = glsl`
vec4 transition(vec2 uv) {
  return mix(
    getFromColor(uv),
    getToColor(uv),
    progress
  );
}
`;

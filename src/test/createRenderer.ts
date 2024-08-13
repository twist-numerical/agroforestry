import { WebGLRenderer } from "three";

export default function createRenderer(
  width: number = 1920,
  height: number = 1080
): WebGLRenderer {
  const gl = require("gl")(width, height);
  const canvas = {
    width,
    height,
    style: {},
    addEventListener() {},
    removeEventListener() {},
    getContext() {
      return gl;
    },
  };
  gl.canvas = canvas;
  const renderer = new WebGLRenderer({
    canvas: canvas,
    context: gl,
  });
  renderer.extensions.get("OES_texture_float");
  return renderer;
}

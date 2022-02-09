import { WebGLRenderer } from "three";

export default function createRenderer(
  width: number = 1920,
  height: number = 1080
): WebGLRenderer {
  const gl = require("gl")(width, height);
  gl.getExtension("OES_texture_float");
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
  return new WebGLRenderer({
    canvas: canvas,
  });
}

import {
  BufferAttribute,
  BufferGeometry,
  Material,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RawShaderMaterial,
  Renderer,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import * as THREE from "three";

const summaryMaterial = new RawShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: {
    totals: { value: 0 },
    data: { value: 0 },
    offset: { value: [0, 0] },
    size: { value: [0, 0] },
    fromZero: { value: true },
    canvasSize: { value: [0, 0] },
  },
  vertexShader: `
precision highp float;

uniform vec2 canvasSize;

attribute vec3 position;
attribute float id;

varying vec3 vPosition;
varying float vID;

void main()	{
  vPosition = position;
  vID=id;
  gl_Position = vec4( 2.0*position.xy/canvasSize - 1.0, 0, 1.0 );
}
`,
  fragmentShader: `
precision highp float;

uniform sampler2D totals;
uniform sampler2D data;
uniform vec2 canvasSize;
uniform vec2 offset;
uniform vec2 size;
uniform bool fromZero;

varying vec3 vPosition;
varying float vID;

void main()	{
  float total = fromZero
    ? 0.0
    : texture2D(totals, vPosition.xy/canvasSize).r;
  float x = vPosition.x;
  for(float y = 0.5; y < 512.0; ++y) {
    vec2 p = (offset + vec2(x, y))/size;
    if(p.x <= 1.0 && p.y <= 1.0) {
      vec4 pixel = texture2D(data, p);
      float pID = pixel.r * 63.0 + floor(0.5 + pixel.g * 63.0) * 64.0;
      if(abs(vID - pID) < 0.5)
        total += pixel.b;
    }
  }
  gl_FragColor.r = total;
}
`,
});

export default class Summarizer {
  targets: [WebGLRenderTarget, WebGLRenderTarget];
  scene: Scene;
  camera: OrthographicCamera;
  plane: Mesh;
  photosynthesisIDs: number[] = [];
  renderer: WebGLRenderer;
  width = 256;
  fromZero = true;
  buffer: Float32Array;

  constructor(renderer: WebGLRenderer, ids: number[]) {
    this.renderer = renderer;
    this.scene = new Scene();
    this.camera = new OrthographicCamera(0, this.width, 0, 1, -1, 1);
    this.plane = new Mesh(new BufferGeometry(), summaryMaterial);
    this.plane.frustumCulled = false;
    this.scene.add(this.plane);
    this.scene.add(this.camera);
    this.setIDs(ids);
  }

  setIDs(ids: number[]) {
    if (
      this.photosynthesisIDs === undefined ||
      ids.length != this.photosynthesisIDs.length
    ) {
      this.targets = [0, 1].map(
        () =>
          new WebGLRenderTarget(ids.length, this.width, {
            format: THREE.RedFormat,
            type: THREE.FloatType,
          })
      ) as [WebGLRenderTarget, WebGLRenderTarget];
      this.buffer = new Float32Array(this.width * ids.length);

      this.camera.bottom = ids.length;
      this.camera.updateProjectionMatrix();
      this.plane.geometry.dispose();
      this.plane.geometry = new BufferGeometry();

      const vertices = new BufferAttribute(
        new Float32Array(ids.length * 6 * 2),
        2
      );
      const w = this.width;
      for (let i = 0; i < ids.length; ++i) {
        vertices.set(
          [0, i, w, i, w, i + 1, 0, i, w, i + 1, 0, i + 1],
          6 * 2 * i
        );
      }

      this.plane.geometry.setAttribute("position", vertices);

      this.plane.geometry.setAttribute(
        "id",
        new BufferAttribute(new Float32Array(ids.length * 6), 1)
      );
    }

    this.photosynthesisIDs = ids;

    const idBuffer = this.plane.geometry.getAttribute("id") as BufferAttribute;
    ids.forEach((id, i) => {
      idBuffer.set([id, id, id, id, id, id], 6 * i);
    });
    this.fromZero = true;
  }

  add(texture: Texture, width: Number, height: Number) {
    const uniforms = (this.plane.material as ShaderMaterial).uniforms;
    uniforms.data.value = texture;
    uniforms.canvasSize.value = [this.width, this.photosynthesisIDs.length];
    uniforms.size.value = [width, height];

    for (let x = 0; x < width; x += this.width)
      for (let y = 0; y < height; y += 512) {
        this.targets.reverse();
        uniforms.totals.value = this.targets[1].texture;
        uniforms.offset.value = [x, y];
        uniforms.fromZero.value = this.fromZero;
        this.fromZero = false;
        this.renderer.setRenderTarget(this.targets[0]);
        this.renderer.render(this.scene, this.camera);
      }
  }

  summary() {
    const target = this.targets[0];
    const width = target.width;
    const height = target.height;
    const buffer = this.buffer;

    this.renderer.readRenderTargetPixels(target, 0, 0, width, height, buffer);

    const data = new Map();
    this.photosynthesisIDs.forEach((id, i) => {
      let total = 0;
      for (let j = 0; j < this.width; ++j) {
        total += buffer[this.width * i + j];
      }
      data.set(id, total);
    });
    return data;
  }
}

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

const blockTimesteps = 64;
const blockWidth = 256;
const blockHeight = 256;

const summaryMaterial = new RawShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: {
    data: { value: 0 },
    history: { value: 0 },
    canvasHeight: { value: 1 },
    timestep: { value: 1 },
  },
  vertexShader: `
precision highp float;

uniform float canvasHeight;

attribute vec3 position;
attribute float id;

varying vec2 vPosition;

void main()	{
  vec2 p = vec2(position.x, position.y / canvasHeight);
  vPosition = p;
  gl_Position = vec4( 2.0*p - 1.0, 0, 1.0 );
}
`,
  fragmentShader: `
precision highp float;

uniform sampler2D data;
uniform sampler2D history;
uniform float canvasHeight;
uniform float timestep;

varying vec2 vPosition;

void main()	{
  float pTimestep = vPosition.x * ${blockTimesteps.toFixed(1)};
  if(abs(pTimestep - timestep) > 0.5) {
    gl_FragColor.r = texture2D(history, vPosition).r;
  } else {
    float total = 0.0;
    float y = vPosition.y;
    for(float x = 0.5; x < ${blockWidth.toFixed(1)}; ++x) {
      vec2 p = vec2(x/${blockWidth.toFixed(1)}, y);
      total += texture2D(data, p).r;
    }
    gl_FragColor.r = total/1000.;
  }
}
`,
});

const combineMaterial = new RawShaderMaterial({
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

attribute vec2 position;
attribute float id;

varying vec2 vPosition;
varying float vID;

void main()	{
  vPosition = position;
  vID = id;
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

varying vec2 vPosition;
varying float vID;

void main()	{
  float total = fromZero
    ? 0.0
    : texture2D(totals, vPosition.xy/canvasSize).r;
  float x = vPosition.x;
  for(float y = 0.5; y < ${blockHeight.toFixed(1)}; ++y) {
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
  fromZero = true;
  timestepIndex = 0;
  summaryTargets: [WebGLRenderTarget, WebGLRenderTarget];
  summaryBuffer: Float32Array;
  private internalTimesteps: [number, number[]][] = [];
  private timesteps: [number, Map<number, number>][] = [];

  constructor(renderer: WebGLRenderer, ids: number[]) {
    this.renderer = renderer;
    this.scene = new Scene();
    this.camera = new OrthographicCamera(0, blockWidth, 0, 1, -1, 1);
    this.plane = new Mesh(new BufferGeometry(), combineMaterial);
    this.plane.frustumCulled = false;
    this.scene.add(this.plane);
    this.scene.add(this.camera);
    this.setIDs(ids);
  }

  setIDs(ids: number[]) {
    if (!this.fromZero)
      console.warn(".endTimestep() shoud be called before setting new ids");
    if (
      this.photosynthesisIDs === undefined ||
      ids.length != this.photosynthesisIDs.length
    ) {
      if (this.internalTimesteps.length != 0) this.summary();
      if (this.targets !== undefined) {
        this.targets.forEach((t) => t.dispose());
      }
      this.targets = [0, 1].map(
        () =>
          new WebGLRenderTarget(blockWidth, ids.length, {
            format: THREE.RedFormat,
            type: THREE.FloatType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
          })
      ) as [WebGLRenderTarget, WebGLRenderTarget];
      if (this.summaryTargets !== undefined) {
        this.summaryTargets.forEach((t) => t.dispose());
      }
      this.summaryTargets = [0, 1].map(
        () =>
          new WebGLRenderTarget(blockTimesteps, ids.length, {
            format: THREE.RedFormat,
            type: THREE.FloatType,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
          })
      ) as [WebGLRenderTarget, WebGLRenderTarget];
      this.summaryBuffer = new Float32Array(blockTimesteps * ids.length);

      this.camera.bottom = ids.length;
      this.camera.updateProjectionMatrix();
      this.plane.geometry.dispose();
      this.plane.geometry = new BufferGeometry();

      const vertices = new BufferAttribute(
        new Float32Array(ids.length * 6 * 2),
        2
      );
      const w = blockWidth;
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
  }

  add(texture: Texture, width: Number, height: Number) {
    this.plane.material = combineMaterial;
    const uniforms = combineMaterial.uniforms;
    uniforms.data.value = texture;
    uniforms.canvasSize.value = [blockWidth, this.photosynthesisIDs.length];
    uniforms.size.value = [width, height];

    for (let x = 0; x < width; x += blockWidth)
      for (let y = 0; y < height; y += blockHeight) {
        this.targets.reverse();
        uniforms.totals.value = this.targets[1].texture;
        uniforms.offset.value = [x, y];
        uniforms.fromZero.value = this.fromZero;
        this.fromZero = false;
        this.renderer.setRenderTarget(this.targets[0]);
        this.renderer.render(this.scene, this.camera);
      }
  }

  endTimestep() {
    this.summaryTargets.reverse();
    this.plane.material = summaryMaterial;
    const uniforms = summaryMaterial.uniforms;
    uniforms.data.value = this.targets[0].texture;
    uniforms.canvasHeight.value = this.photosynthesisIDs.length;
    uniforms.timestep.value = this.internalTimesteps.length;
    uniforms.history.value = this.summaryTargets[1].texture;
    this.renderer.setRenderTarget(this.summaryTargets[0]);
    this.renderer.render(this.scene, this.camera);

    this.internalTimesteps.push([0, this.photosynthesisIDs]);
    this.fromZero = true;

    if (this.internalTimesteps.length >= blockTimesteps) {
      this.summary();
    }
  }

  summary(): [number, Map<number, number>][] {
    this.renderer.readRenderTargetPixels(
      this.summaryTargets[0],
      0,
      0,
      blockTimesteps,
      this.photosynthesisIDs.length,
      this.summaryBuffer
    );

    this.timesteps.push(
      ...this.internalTimesteps.map(([time, ids], i): [
        number,
        Map<number, number>
      ] => {
        const data = new Map<number, number>();
        ids.forEach((id, j) => {
          data.set(id, 1000 * this.summaryBuffer[blockTimesteps * j + i]);
        });
        return [time, data];
      })
    );
    this.internalTimesteps = [];
    return this.timesteps;
  }
}

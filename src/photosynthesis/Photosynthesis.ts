import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  Color,
  DoubleSide,
  InstancedMesh,
  Material,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  RawShaderMaterial,
  Renderer,
  Scene,
  ShaderMaterial,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import * as THREE from "three";
import UVLight from "./UVLight";
import { isPhotosynthesisMesh } from "./PhotosynthesisMesh";

const black = new Color("black");
const blockWidth = 256;
const blockHeight = 256;
const summaryWidth = 256;

const summaryMaterial = new RawShaderMaterial({
  side: THREE.DoubleSide,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendDst: THREE.OneFactor,
  blendSrc: THREE.OneFactor,
  depthWrite: false,
  depthTest: false,
  uniforms: {
    dataOffset: { value: [0, 0] },
    dataSize: { value: [0, 0] },
    canvasSize: { value: [0, 0] },
    data: { value: 0 },
    pixelArea: { value: 1 },
  },
  vertexShader: `
precision highp float;

uniform vec2 dataOffset;
uniform vec2 dataSize;

uniform vec2 canvasSize;

uniform float pixelArea;
uniform sampler2D data;

attribute vec2 position;

varying float value;

float round(float f) {
  return floor(f + 0.5);
}

float getID(vec2 rg) {
  return round(63.0 * rg.r) + round(63.0 * rg.g) * 64.0;
}

void main()	{
  vec2 p = (dataOffset + position)/dataSize;
  vec3 point = texture2D(data, p).rgb;
  float id = getID(point.rg);

  float y = floor(id / ${summaryWidth.toFixed(1)});
  float x = id - y * ${summaryWidth.toFixed(1)};
  if(p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0 || id == 0.0) {
    x = 0.0;
    y = 0.0;
  }
  
  value = point.b * pixelArea;
  gl_Position = vec4((vec2(x, y) + 0.5)/canvasSize * 2.0 - 1.0, 0.0, 1.0);
}
`,
  fragmentShader: `
precision highp float;

varying float value;

void main()	{
  gl_FragColor = vec4(value, 0.0, 0.0, 1.0);
}
`,
});

function newDataRenderTarget(width: number, height: number) {
  const target = new WebGLRenderTarget(width, height, {
    format: THREE.RedFormat,
    type: THREE.FloatType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
  return target;
}

export default class Photosynthesis {
  renderer: WebGLRenderer;
  private __size: number = 0;
  private __nextID = 1;

  camera = new Camera();
  scene = new Scene();
  points = new Points(new BufferGeometry(), summaryMaterial.clone());
  summaryTarget: WebGLRenderTarget;
  private summaryBuffer: Float32Array;
  __colors = new Map<number, Color>();

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;

    this.points.frustumCulled = false;

    const positions = new Float32Array(2 * blockWidth * blockHeight);
    let k = 0;
    for (let x = 0; x < blockWidth; ++x)
      for (let y = 0; y < blockHeight; ++y) {
        positions[k++] = x + 0.5;
        positions[k++] = y + 0.5;
      }

    this.points.geometry.setAttribute(
      "position",
      new BufferAttribute(positions, 2)
    );

    this.scene.add(this.points);
  }

  getColor(photosynthesisID?: number) {
    if (!photosynthesisID) return black;
    let color = this.__colors.get(photosynthesisID);
    if (color === undefined) {
      color = new Color(
        (photosynthesisID & 63) / 63,
        (photosynthesisID >> 6) / 63,
        1
      );
      this.__colors.set(photosynthesisID, color);
    }
    return color;
  }

  private getPhotosynthesisMaterial(
    material: Material | MeshBasicMaterial,
    photosynthesisID?: number
  ): Material {
    const color = this.getColor(photosynthesisID);
    let photosynthesisMaterial = (material as any).photosynthesisMaterial;
    if (!photosynthesisMaterial) {
      photosynthesisMaterial = material.clone();
      if (!(photosynthesisMaterial instanceof MeshBasicMaterial)) {
        console.warn(
          "Material is not a MeshBasicMaterial. Provide your own photosynthesisMaterial."
        );
      }
      if ("map" in material) {
        console.warn(
          "Material does contain a map. This will be ignored. If it contains an alpha channel, use alphaMap."
        );
        material.map = null;
      }
      if ("aoMap" in material) material.aoMap = null;
      if ("envMap" in material) material.envMap = null;

      photosynthesisMaterial.side = DoubleSide;
      (material as any).photosynthesisMaterial = photosynthesisMaterial;
    }
    photosynthesisMaterial.color = color;
    return photosynthesisMaterial;
  }

  private prepareIDsBlocks() {
    if (this.__size == this.__nextID) return;
    this.__size = this.__nextID;

    const rows = Math.ceil(this.__size / summaryWidth);

    if (this.summaryTarget !== undefined) this.summaryTarget.dispose();
    this.summaryTarget = newDataRenderTarget(summaryWidth, rows);

    this.summaryBuffer = new Float32Array(summaryWidth * rows);
  }

  nextID(): number {
    return this.__nextID++;
  }

  clear() {
    this.__nextID = 1;
    this.__size = 0;
  }

  addLight(
    texture: Texture,
    width: number,
    height: number,
    pixelArea: number = 1
  ) {
    const uniforms = (this.points.material as RawShaderMaterial).uniforms;
    uniforms.data.value = texture;
    uniforms.dataSize.value = [width, height];
    uniforms.pixelArea.value = pixelArea;
    uniforms.canvasSize.value = [
      this.summaryTarget.width,
      this.summaryTarget.height,
    ];

    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;

    this.renderer.setRenderTarget(this.summaryTarget);

    for (let x = 0; x < width; x += blockWidth)
      for (let y = 0; y < height; y += blockHeight) {
        uniforms.dataOffset.value = [x, y];

        this.renderer.render(this.scene, this.camera);
      }

    this.renderer.autoClear = autoClear;
  }

  calculate(scene: Scene, lights: UVLight[]): number[] {
    const updateMaterial: any[] = [];
    scene.traverseVisible((obj) => {
      if (isPhotosynthesisMesh(obj)) {
        if (obj.photosynthesis != this) obj.blackPhotosynthesis();
        else obj.prePhotosynthesis();
        updateMaterial.push(obj);
      } else if (obj instanceof Mesh && obj.material) {
        (obj as any).photosynthesisOldMaterial = obj.material;
        obj.material = this.getPhotosynthesisMaterial(
          obj.material as Material,
          (obj as any).photosynthesisID
        );
        updateMaterial.push(obj);
      }
    });
    this.prepareIDsBlocks();

    const background = scene.background;
    scene.background = black;

    this.renderer.setRenderTarget(this.summaryTarget);
    const clearColor = this.renderer.getClearColor(new Color());
    const clearAlpha = this.renderer.getClearAlpha();
    this.renderer.clear();
    this.renderer.setClearColor(clearColor, clearAlpha);
    lights.forEach((light) => {
      light.render(this.renderer, scene, this);
    });

    this.renderer.readRenderTargetPixels(
      this.summaryTarget,
      0,
      0,
      this.summaryTarget.width,
      this.summaryTarget.height,
      this.summaryBuffer
    );

    scene.background = background;

    updateMaterial.forEach((obj) => {
      if (isPhotosynthesisMesh(obj)) obj.postPhotosynthesis();
      else obj.material = obj.photosynthesisOldMaterial;
    });

    this.renderer.setRenderTarget(null);

    return [...this.summaryBuffer.slice(0, this.__size)];
  }
}

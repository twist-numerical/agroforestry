import {
  BufferAttribute,
  BufferGeometry,
  Camera,
  Color,
  DoubleSide,
  FloatType,
  HalfFloatType,
  Material,
  Mesh,
  MeshBasicMaterial,
  Points,
  RawShaderMaterial,
  Scene,
  Texture,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import * as THREE from "three";
import UVLight from "./UVLight";
import { isPhotosynthesisMesh } from "./PhotosynthesisMesh";

const black = new Color("black");
const blockWidth = 512;
const blockHeight = 512;
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
  vertexShader: `#version 300 es
precision highp float;
precision highp int;

uniform vec2 dataOffset;
uniform vec2 dataSize;

uniform vec2 canvasSize;

uniform float pixelArea;
uniform sampler2D data;

in vec2 position;

out float value;

float round(float f) {
  return floor(f + 0.5);
}

uint getID(vec2 rg) {
  return uint(round(255.0*rg.r)) + uint(round(rg.g * 255.0)) * 256u;
}

void main()	{
  vec2 p = (dataOffset + position)/dataSize;
  vec3 point = texture(data, p).rgb;
  uint id = getID(point.rg);

  value = point.b * pixelArea;

  uint y = id / ${summaryWidth}u;
  uint x = id - y * ${summaryWidth}u;
  if(p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) {
    value = 0.0;
  }
  
  gl_Position = vec4((vec2(x, y) + 0.5)/canvasSize * 2.0 - 1.0, 0.0, 1.0);
}
`,
  fragmentShader: `#version 300 es
precision highp float;

in float value;
out vec4 fragColor;

void main()	{
  fragColor = vec4(value, 0.0, 0.0, 1.0);
}
`,
});

function mostPreciseSupportedType(renderer: WebGLRenderer) {
  if (renderer.extensions.has("EXT_color_buffer_float")) {
    // TODO detect real capabilities
    console.log("Support for FLOAT");
    return THREE.FloatType;
  } else if (renderer.extensions.has("EXT_color_buffer_half_float")) {
    console.log("Only support for HALF_FLOAT");
    return THREE.HalfFloatType;
  } else {
    console.error(
      "No support for floating point types, everything will break..."
    );
    return THREE.ByteType;
  }
}

function parseHalfFloat(f: number): number {
  const sign = f & 0b1_00000_00000_00000 ? -1 : 1;
  const exp = (f >> 10) & 0b11111;
  const mantisse = (exp ? 1 : 0) + (f & 0b11111_11111) / 1024;
  const value = sign * mantisse;
  if (exp === 0) return mantisse === 0 ? 0 : value / (1 << 14); // zero, subnormal
  if (exp === 31) return mantisse === 1 ? sign * Infinity : NaN; // inf, nan
  if (exp < 15) return value / (1 << (15 - exp)); // < 1
  return value * (1 << (exp - 15)); // >= 1
}

export default class Photosynthesis {
  renderer: WebGLRenderer;
  private __nextID = 0;

  floatType = THREE.FloatType;
  camera = new Camera();
  scene = new Scene();
  points = new Points(new BufferGeometry(), summaryMaterial.clone());
  summaryTarget: WebGLRenderTarget;
  private summaryBuffer: Float32Array | Uint16Array | Uint8Array;
  __colors = new Map<number, Color>();

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
    this.floatType = mostPreciseSupportedType(renderer);

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

  newDataRenderTarget(width: number, height: number) {
    const target = new WebGLRenderTarget(width, height, {
      format: THREE.RedFormat,
      type: this.floatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    return target;
  }

  getColor(photosynthesisID?: number) {
    if (photosynthesisID === undefined) return black;
    let color = this.__colors.get(photosynthesisID);
    if (color === undefined) {
      color = new Color(
        (photosynthesisID & 255) / 255,
        (photosynthesisID >> 8) / 255,
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
    const rows = Math.ceil(this.__nextID / summaryWidth);
    if (this.summaryTarget && rows <= this.summaryTarget.height) return;

    if (this.summaryTarget !== undefined) this.summaryTarget.dispose();
    this.summaryTarget = this.newDataRenderTarget(summaryWidth, rows);

    if (this.floatType == FloatType) {
      this.summaryBuffer = new Float32Array(summaryWidth * rows);
    } else if (this.floatType == HalfFloatType) {
      this.summaryBuffer = new Uint16Array(summaryWidth * rows);
    } else {
      this.summaryBuffer = new Uint8Array(summaryWidth * rows);
    }
  }

  nextID(): number {
    return this.__nextID++;
  }

  clear() {
    this.__nextID = 0;
    if (this.summaryTarget !== undefined) {
      this.summaryTarget.dispose();
      this.summaryTarget = undefined;
    }
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

  get idCount() {
    return this.__nextID;
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
    this.renderer.setClearColor(black);
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

    if (this.floatType === HalfFloatType) {
      return [...this.summaryBuffer.slice(0, this.__nextID)].map(
        parseHalfFloat
      );
    }
    return [...this.summaryBuffer.slice(0, this.__nextID)];
  }
}

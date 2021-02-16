import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  Material,
  Mesh,
  MeshBasicMaterial,
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
import UVLight from "./UVLight";
import { isPhotosynthesisMesh } from "./PhotosynthesisMesh";

const black = new Color("black");
const blockTimesteps = 64;
const blockWidth = 256;
const blockHeight = 256;
const idPerTexture = 256;

const summaryMaterial = new RawShaderMaterial({
  side: THREE.DoubleSide,
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendDst: THREE.OneFactor,
  blendSrc: THREE.OneFactor,
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
    gl_FragColor.rg = texture2D(history, vPosition).rg;
  } else {
    float total = 0.0;
    float y = vPosition.y;
    for(float x = 0.5; x < ${blockWidth.toFixed(1)}; ++x) {
      vec2 p = vec2(x/${blockWidth.toFixed(1)}, y);
      total += texture2D(data, p).r;
    }
    gl_FragColor.r = total;
  }
}
`,
})

const combineMaterial = new RawShaderMaterial({
  side: THREE.DoubleSide,
  uniforms: {
    totals: { value: 0 },
    data: { value: 0 },
    offset: { value: [0, 0] },
    size: { value: [0, 0] },
    fromZero: { value: true },
    canvasSize: { value: [0, 0] },
    pixelArea: { value: 1 },
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
uniform float pixelArea;

varying vec2 vPosition;
varying float vID;

void main()	{
  float x = vPosition.x;
  float total = 0.0;
  for(float y = 0.5; y < ${blockHeight.toFixed(1)}; ++y) {
    vec2 p = (offset + vec2(x, y))/size;
    if(p.x <= 1.0 && p.y <= 1.0) {
      vec4 pixel = texture2D(data, p);
      float pID = pixel.r * 63.0 + floor(0.5 + pixel.g * 63.0) * 64.0;
      if(abs(vID - pID) < 0.5)
        total +=  pixel.b;
    }
  }
  total *= pixelArea;
  if(!fromZero)
    total += texture2D(totals, vPosition.xy/canvasSize).r;
  gl_FragColor.r = total;
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

class SummaryBlock {
  targets: [WebGLRenderTarget, WebGLRenderTarget];
  summaryTargets: [WebGLRenderTarget, WebGLRenderTarget];
  photosynthesisIDs: number[];
  geometry: BufferGeometry;
  size: number;
  camera: OrthographicCamera;

  constructor(renderer: WebGLRenderer, size: number) {
    this.size = size;
    this.camera = new OrthographicCamera(0, blockWidth, 0, size, -1, 1);

    this.targets = [0, 1].map(() => newDataRenderTarget(blockWidth, size)) as [
      WebGLRenderTarget,
      WebGLRenderTarget
    ];
    this.summaryTargets = [0, 1].map(() =>
      newDataRenderTarget(blockTimesteps, size)
    ) as [WebGLRenderTarget, WebGLRenderTarget];

    const vertices = new BufferAttribute(new Float32Array(size * 6 * 2), 2);
    const w = blockWidth;
    for (let i = 0; i < size; ++i) {
      vertices.set([0, i, w, i, w, i + 1, 0, i, w, i + 1, 0, i + 1], 6 * 2 * i);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", vertices);
    geometry.setAttribute(
      "id",
      new BufferAttribute(new Float32Array(size * 6), 1)
    );

    this.geometry = geometry;
  }

  setIDs(ids: number[]) {
    if (ids.length != this.size)
      return console.error("SummaryBlock should not change in size.");
    if (this.photosynthesisIDs !== undefined) {
      let equals = true;
      ids.forEach((id, i) => {
        equals &&= id == this.photosynthesisIDs[i];
      });
      if (equals) return;
    }

    this.photosynthesisIDs = ids;
    const idBuffer = this.geometry.getAttribute("id") as BufferAttribute;
    ids.forEach((id, i) => {
      idBuffer.set([id, id, id, id, id, id], 6 * i);
    });
  }

  dispose() {
    this.geometry.dispose();
    this.targets.forEach((t) => t.dispose());
    this.summaryTargets.forEach((t) => t.dispose());
  }
}

export default class Photosynthesis {
  scene: Scene;
  plane: Mesh;
  photosynthesisIDs: number[] = [];
  idSize: number = 0;
  renderer: WebGLRenderer;
  fromZero = true;
  timestepIndex = 0;
  blocks: SummaryBlock[] = [];
  private summaryBuffer: Float32Array = new Float32Array(
    blockTimesteps * idPerTexture
  );
  private internalTimesteps: number[] = [];
  private timesteps: [number, Map<number, number>][] = [];
  __colors = new Map<number, Color>();

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
    this.scene = new Scene();
    this.plane = new Mesh(new BufferGeometry(), combineMaterial);
    this.plane.frustumCulled = false;
    this.scene.add(this.plane);
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
    if (this.photosynthesisIDs.length == this.idSize) return;
    this.idSize = this.photosynthesisIDs.length;

    this.flush();

    const ids = this.photosynthesisIDs;
    for (
      let i = 0, blockIndex = 0;
      i < ids.length;
      i += idPerTexture, ++blockIndex
    ) {
      const length = Math.min(ids.length - i, idPerTexture);

      let block: SummaryBlock = this.blocks[blockIndex];

      if (block !== undefined && block.size != length) {
        block.dispose();
        block = undefined;
      }

      if (block == undefined) {
        block = new SummaryBlock(this.renderer, length);
        this.blocks[blockIndex] = block;
      }

      block.setIDs(ids.slice(i, i + length));
    }
  }

  nextID(): number {
    const id = this.photosynthesisIDs.length + 1;
    this.photosynthesisIDs.push(id);
    return id;
  }

  clear() {
    this.idSize = 0;
    this.photosynthesisIDs = [];
    this.blocks.forEach((block) => block.dispose());
    this.blocks = [];
  }

  addLight(
    texture: Texture,
    width: number,
    height: number,
    pixelArea: number = 1
  ) {
    this.plane.material = combineMaterial;
    const uniforms = combineMaterial.uniforms;
    uniforms.data.value = texture;
    uniforms.size.value = [width, height];
    uniforms.pixelArea.value = pixelArea;

    for (let x = 0; x < width; x += blockWidth)
      for (let y = 0; y < height; y += blockHeight) {
        uniforms.offset.value = [x, y];
        uniforms.fromZero.value = this.fromZero;
        this.fromZero = false;
        this.blocks.forEach((block) => {
          block.targets.reverse();
          uniforms.canvasSize.value = [blockWidth, block.size];
          uniforms.totals.value = block.targets[1].texture;
          this.plane.geometry = block.geometry;
          this.renderer.setRenderTarget(block.targets[0]);
          this.renderer.render(this.scene, block.camera);
        });
      }
  }

  private endTimestep(time: number) {
    this.plane.material = summaryMaterial;
    const uniforms = summaryMaterial.uniforms;
    uniforms.timestep.value = this.internalTimesteps.length;

    this.blocks.forEach((block) => {
      block.summaryTargets.reverse();
      uniforms.data.value = block.targets[0].texture;
      uniforms.canvasHeight.value = block.size;
      uniforms.history.value = block.summaryTargets[1].texture;
      this.renderer.setRenderTarget(block.summaryTargets[0]);
      this.renderer.render(this.scene, block.camera);

      this.fromZero = true;
    });
    this.internalTimesteps.push(time);

    if (this.internalTimesteps.length >= blockTimesteps) {
      this.flush();
    }
  }

  flush() {
    if (this.internalTimesteps.length == 0) return;

    const data = this.internalTimesteps.map((time): [
      number,
      Map<number, number>
    ] => [time, new Map<number, number>()]);

    this.blocks.forEach((block) => {
      this.renderer.readRenderTargetPixels(
        block.summaryTargets[0],
        0,
        0,
        blockTimesteps,
        block.size,
        this.summaryBuffer
      );

      data.forEach(([time, map], i) => {
        block.photosynthesisIDs.forEach((id, j) => {
          const index = blockTimesteps * j + i;
          map.set(id, this.summaryBuffer[index]);
        });
      });
    });
    this.timesteps.push(...data);
    this.internalTimesteps = [];
  }

  getTimesteps(): [number, Map<number, number>][] {
    this.flush();
    return this.timesteps;
  }

  calculate(time: number, scene: Scene, lights: UVLight[]) {
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

    lights.forEach((light) => {
      light.render(this.renderer, scene, this);
    });

    scene.background = background;

    updateMaterial.forEach((obj) => {
      if (isPhotosynthesisMesh(obj)) obj.postPhotosynthesis();
      else obj.material = obj.photosynthesisOldMaterial;
    });

    this.endTimestep(time);
    this.renderer.setRenderTarget(null);
  }

  clearTimesteps() {
    this.flush();
    const timesteps = this.timesteps;
    this.timesteps = [];
    return timesteps;
  }
}

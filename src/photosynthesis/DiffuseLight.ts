import {
  Color,
  Material,
  Matrix4,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import * as THREE from "three";
import UVLight from "./UVLight";
import Photosynthesis from "./Photosynthesis";

const eye = new Vector3(0, 1, 0);
const center = new Vector3(0, 0, 0);
const up = new Vector3(0, 1, 0);

export default class DiffuseLight extends UVLight {
  light = new THREE.DirectionalLight(0xaaaaaa);
  camera: OrthographicCamera;
  target: WebGLRenderTarget;
  transforms: Matrix4[] = [];
  viewSize: number;

  constructor(count: number, viewSize: number, renderSize: number) {
    super(renderSize);
    this.add(this.light);

    this.camera = new OrthographicCamera(-1, 1, -1, 1);
    this.camera.matrixAutoUpdate = false;
    this.setViewSize(viewSize);
    this.add(this.camera);

    this.setCount(count);
  }

  setViewSize(viewSize: number) {
    this.viewSize = viewSize;
    this.camera.left = -viewSize / 2;
    this.camera.right = viewSize / 2;
    this.camera.bottom = -viewSize / 2;
    this.camera.top = viewSize / 2;
    this.camera.near = -10 * viewSize;
    this.camera.far = 10 * viewSize;
    this.camera.updateProjectionMatrix();
  }

  get pixelArea(): number {
    const side = this.viewSize / this.renderSize;
    return side * side;
  }

  setCount(count: number) {
    this.transforms = [];
    const phi = 0.5 * (1 + Math.sqrt(5));
    const golden_angle = 2 * Math.PI * (2 - phi);
    for (let i = 1; i <= count; ++i) {
      const lat = Math.asin(1 - i / (count + 1));
      const lon = golden_angle * i;
      eye.set(
        Math.cos(lon) * Math.cos(lat),
        Math.sin(lat),
        Math.sin(lon) * Math.cos(lat)
      );
      this.transforms.push(new Matrix4().lookAt(eye, center, up));
    }
  }

  render(
    renderer: WebGLRenderer,
    scene: Scene,
    photosynthesis: Photosynthesis
  ) {
    this.transforms.forEach((matrix) => {
      this.camera.matrix = matrix;
      this.camera.matrixWorldNeedsUpdate = true;
      renderer.setRenderTarget(this.target);
      renderer.render(scene, this.camera);
      photosynthesis.addLight(
        this.target.texture,
        this.target.width,
        this.target.height,
        this.pixelArea
      );
    });
  }
}

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

export default class DiffuseLight extends UVLight {
  light = new THREE.DirectionalLight(0xaaaaaa);
  camera: OrthographicCamera;
  target: WebGLRenderTarget;
  transforms: Matrix4[] = [];

  constructor(
    count: number,
    viewSize: number,
    renderSize: number,
    clipping = 100 * viewSize
  ) {
    super();
    this.add(this.light);

    this.camera = new OrthographicCamera(
      -viewSize,
      viewSize,
      -viewSize,
      viewSize,
      -clipping,
      clipping
    );
    this.camera.matrixAutoUpdate = false;
    this.add(this.camera);

    const eye = new Vector3(0, 1, 0);
    const center = new Vector3(0, 0, 0);
    const up = new Vector3(0, 1, 0);

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

    this.target = new WebGLRenderTarget(renderSize, renderSize);
  }

  getMaterial(photosynthesisID: number, color: Color): Material {
    return new MeshBasicMaterial({
      side: THREE.DoubleSide,
      color: color,
    });
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
        this.target.height
      );
    });
  }
}

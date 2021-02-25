import { OrthographicCamera, Scene, WebGLRenderer } from "three";
import * as THREE from "three";
import UVLight from "./UVLight";
import Photosynthesis from "./Photosynthesis";

export default class Sunlight extends UVLight {
  light = new THREE.DirectionalLight(0xaaaaaa);
  camera: OrthographicCamera;
  viewSize: number;

  constructor(viewSize: number, renderSize: number) {
    super(renderSize);
    this.add(this.light);

    this.camera = new OrthographicCamera(-1, 1, -1, 1);
    this.setViewSize(viewSize);
    this.setRenderSize(renderSize);
    this.camera.lookAt(0, 0, 1);
    this.add(this.camera);
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

  render(
    renderer: WebGLRenderer,
    scene: Scene,
    photosynthesis: Photosynthesis
  ) {
    renderer.setRenderTarget(this.target);
    renderer.render(scene, this.camera);
    photosynthesis.addLight(
      this.target.texture,
      this.target.width,
      this.target.height,
      this.pixelArea
    );
  }
}

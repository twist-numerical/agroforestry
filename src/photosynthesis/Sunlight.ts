import {
  Color,
  Material,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import * as THREE from "three";
import UVLight from "./UVLight";
import Photosynthesis from "./Photosynthesis";

export default class Sunlight extends UVLight {
  light = new THREE.DirectionalLight(0xaaaaaa);
  camera: OrthographicCamera;
  target: WebGLRenderTarget;
  pixelArea: number;

  constructor(viewSize: number, renderSize: number) {
    super();
    this.add(this.light);

    this.pixelArea = Math.pow(viewSize / renderSize, 2);
    this.camera = new OrthographicCamera(
      -viewSize / 2,
      viewSize / 2,
      -viewSize / 2,
      viewSize / 2,
      -10 * viewSize,
      10 * viewSize
    );
    this.camera.lookAt(0, 0, 1);
    this.add(this.camera);

    this.target = new WebGLRenderTarget(renderSize, renderSize);
  }

  setRenderSize(renderSize: number) {
    this.target.dispose();
    this.target = new WebGLRenderTarget(renderSize, renderSize);
  }

  setViewSize(viewSize: number) {
    this.camera.left = -viewSize / 2;
    this.camera.right = viewSize / 2;
    this.camera.bottom = -viewSize / 2;
    this.camera.top = viewSize / 2;
    this.camera.near = -10 * viewSize;
    this.camera.far = 10 * viewSize;
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

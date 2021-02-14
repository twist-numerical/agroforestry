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

  constructor(viewSize: number, renderSize: number, clipping = 2 * viewSize) {
    super();
    this.add(this.light);

    this.pixelArea = Math.pow(viewSize / renderSize, 2);
    this.camera = new OrthographicCamera(
      -viewSize / 2,
      viewSize / 2,
      -viewSize / 2,
      viewSize / 2,
      -clipping,
      clipping
    );
    this.camera.lookAt(0, 0, 1);
    this.add(this.camera);

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

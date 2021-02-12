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
import Summarizer from "./Summarizer";

export default class Sunlight extends UVLight {
  light = new THREE.DirectionalLight(0xaaaaaa);
  camera: OrthographicCamera;
  target: WebGLRenderTarget;

  constructor(viewSize: number, renderSize: number, clipping = 2 * viewSize) {
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
    this.camera.lookAt(0, -1, 0);
    this.add(this.camera);

    this.target = new WebGLRenderTarget(renderSize, renderSize);
  }

  getMaterial(photosynthesisID: number, color: Color): Material {
    return new MeshBasicMaterial({
      side: THREE.DoubleSide,
      color: color,
    });
  }

  render(renderer: WebGLRenderer, scene: Scene, summarizer: Summarizer) {
    renderer.setRenderTarget(this.target);
    renderer.render(scene, this.camera);
    return summarizer.add(
      this.target.texture,
      this.target.width,
      this.target.height
    );
  }
}

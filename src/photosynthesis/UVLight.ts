import { Object3D, Scene, WebGLRenderer, WebGLRenderTarget } from "three";
import * as THREE from "three";
import Photosynthesis from "./Photosynthesis";

export default abstract class UVLight extends Object3D {
  renderSize: number;
  target: WebGLRenderTarget;

  constructor(renderSize: number) {
    super();
    this.setRenderSize(renderSize);
  }

  setRenderSize(renderSize: number) {
    this.renderSize = renderSize;
    if (this.target) this.target.dispose();
    this.target = new WebGLRenderTarget(renderSize, renderSize, {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
    });
  }

  abstract render(
    renderer: WebGLRenderer,
    scene: Scene,
    photosynthesis: Photosynthesis
  ): void;
}

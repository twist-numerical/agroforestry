import {
  CubeCamera,
  MeshBasicMaterial,
  OrthographicCamera,
  WebGLCubeRenderTarget,
  WebGLRenderTarget,
} from "three";
import * as THREE from "three";
import UVLight from "./UVLight";

export default class DiffuseLight extends UVLight {
  constructor(renderSize) {
    super();
    this.light = new THREE.AmbientLight(0x404040);
    this.add(this.light);

    this.target = new WebGLCubeRenderTarget(renderSize);

    this.camera = new CubeCamera(0.01, 1000000, this.target);

    this.add(this.camera);
  }

  getMaterial(photosynthesisID, color) {
    return new MeshBasicMaterial({
      side: THREE.DoubleSide,
      color: color,
      depthFunc: THREE.GreaterEqualDepth,
    });
  }

  render(renderer, scene, summarize) {
    this.camera.update(renderer, scene);

    return summarize(this.target);
  }
}

import { Color, MeshBasicMaterial, WebGLRenderTarget } from "three";
import * as THREE from "three";

const blackMaterial = new MeshBasicMaterial({
  side: THREE.DoubleSide,
  color: "black",
});

export default class Photosynthesis {
  constructor(renderer, size = 1024) {
    this.size = size;
    this.renderer = renderer;
    this.renderTarget = new WebGLRenderTarget(size, size);
    this.materials = new Map();
    this.buffer = new Uint8Array(size * size * 4);
  }

  getMaterial(photosynthesisID) {
    if (photosynthesisID >= 1 << 12) console.error("To many different plants");

    if (this.materials.has(photosynthesisID))
      return this.materials.get(photosynthesisID);

    const color = new Color(
      (photosynthesisID & 63) / 63,
      (photosynthesisID >> 6) / 63,
      1
    );
    const material = new MeshBasicMaterial({
      side: THREE.DoubleSide,
      color: color,
    });
    this.materials.set(photosynthesisID, material);
    return material;
  }

  calculate(scene, camera) {
    scene.traverseVisible((obj) => {
      obj.photosynthesisOldMaterial = obj.material;
      if (obj.material) {
        obj.material = obj.photosynthesisID
          ? this.getMaterial(obj.photosynthesisID)
          : blackMaterial;
      }
    });

    this.renderer.setRenderTarget(null);
    this.renderer.render(scene, camera);

    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(scene, camera);
    this.renderer.readRenderTargetPixels(
      this.renderTarget,
      0,
      0,
      this.size,
      this.size,
      this.buffer
    );
    this.renderer.setRenderTarget(null);

    scene.traverseVisible((obj) => {
      obj.material = obj.photosynthesisOldMaterial;
    });

    const data = new Map();
    const buffer = this.buffer;
    for (let i = 0; i < buffer.length; i += 4) {
      const id =
        Math.round((buffer[i] / 255) * 63) |
        (Math.round((buffer[i + 1] / 255) * 63) << 6);
      if (id) {
        data.set(id, (data.get(id) || 0) + buffer[i + 2] / 255);
      }
    }
    return data;
  }
}

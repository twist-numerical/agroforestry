import {
  Object3D,
  MeshBasicMaterial,
  Color,
  Material,
  Scene,
  WebGLRenderer,
} from "three";
import * as THREE from "three";
import Summarizer from "./Summarizer";

export default abstract class UVLight extends Object3D {
  __materials = new Map<number, Material>();
  blackMaterial = new MeshBasicMaterial({
    side: THREE.DoubleSide,
    color: new Color("black"),
  });

  getCachedMaterial(photosynthesisID: number): Material {
    if (this.__materials.has(photosynthesisID))
      return this.__materials.get(photosynthesisID);

    if (photosynthesisID >= 1 << 12) console.error("To many different plants");

    const color = new Color(
      (photosynthesisID & 63) / 63,
      (photosynthesisID >> 6) / 63,
      1
    );
    const material = this.getMaterial(photosynthesisID, color);
    this.__materials.set(photosynthesisID, material);
    return material;
  }

  abstract getMaterial(photosynthesisID: number, color: Color): Material;

  abstract render(
    renderer: WebGLRenderer,
    scene: Scene,
    summarizer: Summarizer
  ): void;
}

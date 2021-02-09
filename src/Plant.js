import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhongMaterial,
  ParametricGeometry,
} from "three";
import * as THREE from "three";

let photosynthesisID = 1;

export default class Plant extends Group {
  constructor() {
    super();
    this.photosynthesisID = photosynthesisID++;
    this.stem = new Mesh(
      new CylinderGeometry(0.1, 0.2, 1, 9, 2),
      new MeshPhongMaterial({
        color: "brown",
      })
    );
    this.stem.position.set(0, 0.5, 0);
    this.add(this.stem);
    this.leafMaterial = new MeshPhongMaterial({
      color: "green",
      side: THREE.DoubleSide,
    });
    this.leafGeometry = new ParametricGeometry(
      (u, v, r) => {
        const angle = ((Math.PI * 2) / 6) * v;
        r.set(
          0.3 * (u - 0.5) * (1 - 0.5 * v),
          Math.cos(angle) - 1,
          Math.sin(angle)
        );
      },
      5,
      5
    );
    this.leaves = [];
    this.leafCount = 0;
  }

  addLeaves() {
    const count = Math.ceil(this.growthFactor);
    while (this.leaves.length < count) {
      const leaf = new Mesh(this.leafGeometry, this.leafMaterial);
      leaf.photosynthesisID = this.photosynthesisID;
      leaf.position.set(0, 1 - 0.1 * Math.random(), 0);
      leaf.rotateY(Math.random() * Math.PI * 2);
      const scaling = Math.pow(2, 2 * (Math.random() - 0.5));
      leaf.scale.set(scaling, scaling, scaling);
      this.add(leaf);
      this.leaves.push(leaf);
    }

    this.leaves.forEach((leaf, i) => (leaf.visible = i < count));
  }

  setGrowth(growthFactor) {
    this.growthFactor = growthFactor;
    const scale = 0.1 + Math.sqrt(growthFactor);
    this.scale.set(scale, scale, scale);
    this.addLeaves(Math.ceil(growthFactor));
  }
}

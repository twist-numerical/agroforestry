import {
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhongMaterial,
  ParametricGeometry,
} from "three";
import * as THREE from "three";

const ids = new Set();
const newID = () => {
  let id;
  do {
    id = Math.floor(Math.random() * (1 << 12));
  } while (ids.has(id));
  return id;
};

let photosynthesisID = 1;

export default class Plant extends Group {
  constructor() {
    super();
    this.photosynthesisID = newID();
    this.stem = new Mesh(
      new CylinderGeometry(0.1, 0.2, 1, 9, 2),
      new MeshPhongMaterial({
        color: "#dbd895",
      })
    );
    this.stem.position.set(0, 0.5, 0);
    this.add(this.stem);
    this.leafMaterial = new MeshPhongMaterial({
      color: "#66d453",
      side: THREE.DoubleSide,
    });
    this.leafGeometry = new ParametricGeometry(
      (u, v, r) => {
        const angle = ((Math.PI * 2) / 9) * v;
        r.set(
          0.1 * (u - 0.5) * (1 - 0.5 * v),
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
  setSize(size) {
    this.size = size;
    const scale = size;
    this.scale.set(scale, scale, scale);

    const count = 5+5 * Math.ceil(this.size);
    while (this.leaves.length < count) {
      const leaf = new Mesh(this.leafGeometry, this.leafMaterial);
      leaf.photosynthesisID = this.photosynthesisID;
      leaf.position.set(0, 1 + 0.1 * Math.random(), 0);
      const scaling = Math.pow(2, 2 * (Math.random() - 0.5));
      leaf.scale.set(scaling, scaling, 0.5 * scaling);
      leaf.rotateY(Math.random() * Math.PI * 2);
      this.add(leaf);
      this.leaves.push(leaf);
    }

    this.leaves.forEach((leaf, i) => (leaf.visible = i < count));
  }
}

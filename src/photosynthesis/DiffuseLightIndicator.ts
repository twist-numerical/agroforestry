import {
  Color,
  DoubleSide,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
} from "three";
import DiffuseLight from "./DiffuseLight";

export class DiffuseLightIndicator extends Object3D {
  setLight(light: DiffuseLight) {
    const geometry = new PlaneGeometry(5, 5);
    const material = new MeshBasicMaterial({
      color: new Color(0.5, 0.5, 0.5),
      side: DoubleSide,
    });
    const transformGeometry = new Matrix4().makeRotationZ(Math.PI/2).setPosition(0, 0, 40);
    geometry.applyMatrix4(transformGeometry);
    this.clear();
    light.transforms.forEach((m) => {
      const mesh = new Mesh(geometry, material);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(m);
      mesh.matrixWorldNeedsUpdate = true;
      this.add(mesh);
    });
  }
}
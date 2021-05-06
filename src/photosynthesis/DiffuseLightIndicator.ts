import {
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
} from "three";
import DiffuseLight from "./DiffuseLight";

export class DiffuseLightIndicator extends Object3D {
  instancedMesh?: InstancedMesh = undefined;
  color0 = new Color(1, 1, 1);
  color1 = new Color(0, 0, 1);
  material = new MeshBasicMaterial({
    color: new Color(0.5, 0.5, 0.5),
    side: DoubleSide,
  });

  setLight(light: DiffuseLight, distance: number) {
    if (this.instancedMesh) {
      this.clear();
      this.instancedMesh.geometry.dispose();
      this.instancedMesh.dispose();
    }
    const geometry = new PlaneGeometry(distance / 7, distance / 7);
    const transformGeometry = new Matrix4()
      .makeRotationZ(Math.PI / 2)
      .setPosition(0, 0, distance);
    geometry.applyMatrix4(transformGeometry);

    const mesh = new InstancedMesh(
      geometry,
      this.material,
      light.sensors.length
    );
    this.add(mesh);
    this.instancedMesh = mesh;

    const lerp = new Color();
    light.sensors.forEach(({ transform, power }, i) => {
      mesh.setMatrixAt(i, transform);
      mesh.setColorAt(
        i,
        lerp.lerpColors(this.color0, this.color1, (power - 0.3) / 0.7)
      );
    });
  }
}

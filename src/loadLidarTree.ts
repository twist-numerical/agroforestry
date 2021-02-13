import {
  BufferGeometry,
  Curve,
  CylinderGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  Material,
  Matrix4,
  Vector3,
} from "three";
import lidarTreeData from "./agroforestry.txt";

export default async () => {
  const lidar = await (await fetch(lidarTreeData)).json();

  const offset = new Vector3(lidar[0], lidar[2], lidar[1]);
  const segments: { start: Vector3; end: Vector3; radius: number }[] = [];
  for (let i = 0; i < lidar.length; i += 7) {
    segments.push({
      start: new Vector3(lidar[i + 0], lidar[i + 2], lidar[i + 1]).sub(offset),
      end: new Vector3(lidar[i + 3], lidar[i + 5], lidar[i + 4]).sub(offset),
      radius: lidar[i + 6],
    });
  }

  return {
    LidarTree: class LidarTree extends InstancedMesh {
      constructor(material: Material, radialSegments = 7) {
        const geometry = new CylinderGeometry(1, 1, 1, radialSegments, 1);
        geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2).setPosition(0,0,0.5));
        super(geometry, material, segments.length);

        const lookAt = new Matrix4();
        const matrix = new Matrix4();
        const up = new Vector3(0, 0, 1);
        segments.forEach(({ start, end, radius }, i) => {
          lookAt.lookAt(start, end, up);
          matrix.makeScale(radius, radius, start.distanceTo(end));
          lookAt.multiply(matrix);
          lookAt.setPosition(start);
          this.setMatrixAt(i, lookAt);
        });
      }
    },
  };
};

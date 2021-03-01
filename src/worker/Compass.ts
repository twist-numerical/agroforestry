import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SphereGeometry,
} from "three";

export default class Compass extends Object3D {
  compass = new Mesh(
    new ConeGeometry(1, 4),
    new MeshBasicMaterial({
      color: "blue",
    })
  );
  axes = new Group();

  constructor() {
    super();

    this.compass.rotateZ(-Math.PI / 2);
    this.compass.scale.set(0.1, 1, 1);
    this.compass.geometry.applyMatrix4(new Matrix4().setPosition(0, 2, 0));

    ([
      ["red", 1, 0],
      ["green", 0, 1],
    ] as [string, number, number][]).forEach(([color, x, y]) => {
      const axis = new Mesh(
        new CylinderGeometry(0.3, 0.3, 2),
        new MeshBasicMaterial({ color: color })
      );
      axis.geometry
        .applyMatrix4(new Matrix4().setPosition(0, -1, 0))
        .applyMatrix4(new Matrix4().makeRotationX(-Math.PI / 2));
      axis.lookAt(x, 0, y);
      axis.position.set(0, 1, 0);
      this.axes.add(axis);
    });
    this.add(this.compass, this.axes);
  }

  setRotation(rotation: number) {
    this.axes.rotation.set(0, rotation, 0);
  }
}

import {
  CylinderGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshNormalMaterial,
  MeshPhongMaterial,
  Object3D,
  Quaternion,
  Sphere,
  SphereGeometry,
  Vector3,
} from "three";

const axis = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
};
const _rotate_quat = new Quaternion();
function rotate(quat: Quaternion, axis: Vector3, angle: number) {
  return quat.multiply(_rotate_quat.setFromAxisAngle(axis, angle));
}

const _rotation = new Quaternion();
export default class Sun extends Object3D {
  dayRotation = 0;
  yearRotation = 0;
  tilt = 23.4392811 * (Math.PI / 180);
  latitudeRotation = Math.PI;

  constructor() {
    super();

    const material = new MeshNormalMaterial({});
    // this.add(new Mesh(new SphereGeometry(5, 32, 19), material));
    // this.add(new Mesh(new CylinderGeometry(0.5, 0.5, 16), material));
  }

  setSeconds(seconds: number) {
    // seconds since the 21st of december at noon
    const inDay = seconds / 60 / 60 / 24;
    this.dayRotation = Math.PI * 2 * inDay;
    const inYear = inDay / 365.242199;
    this.yearRotation = Math.PI * 2 * inYear;
  }

  setLatitude(latitude: number) {
    this.latitudeRotation = (Math.PI / 180) * (90 - latitude);
  }

  updateMatrix() {
    _rotation.identity();
    rotate(_rotation, axis.z, -this.latitudeRotation);
    rotate(_rotation, axis.y, -this.dayRotation);
    rotate(_rotation, axis.z, this.tilt);
    rotate(_rotation, axis.y, this.yearRotation);

    this.matrix.makeRotationFromQuaternion(_rotation);
    this.matrixWorldNeedsUpdate = true;
  }
}

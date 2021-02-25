import { Object3D, Quaternion, Vector3 } from "three";

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

const siderialPeriod = (23 * 60 + 56) * 60 + 4.1; // 23h 56m 4.1s
const daysPerYear = 365.242199;
const tilt = 23.4392811 * (Math.PI / 180);

export default class Sun extends Object3D {
  dayRotation = 0;
  yearRotation = 0;
  latitudeRotation = Math.PI;

  constructor() {
    super();
    this.matrixAutoUpdate = false;
  }

  setSeconds(seconds: number) {
    // seconds since the 21st of december at midnight
    seconds -= 12 * 60 * 60;
    const inDay = seconds / siderialPeriod;
    this.dayRotation = Math.PI * 2 * inDay;
    const inYear = inDay / daysPerYear;
    this.yearRotation = Math.PI * 2 * inYear;
    this.updateMatrix();
  }

  setLatitude(latitude: number) {
    this.latitudeRotation = (Math.PI / 180) * (90 - latitude);
  }

  updateMatrix() {
    _rotation.identity();
    rotate(_rotation, axis.z, -this.latitudeRotation);
    rotate(_rotation, axis.y, -this.dayRotation);
    rotate(_rotation, axis.z, tilt);
    rotate(_rotation, axis.y, this.yearRotation);

    this.matrix.makeRotationFromQuaternion(_rotation);
    this.matrixWorldNeedsUpdate = true;
  }
}

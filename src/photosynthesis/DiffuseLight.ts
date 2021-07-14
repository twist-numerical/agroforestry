import {
  Matrix3,
  Matrix4,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import * as THREE from "three";
import UVLight from "./UVLight";
import Photosynthesis from "./Photosynthesis";
import { clamp } from "../util";

const eye = new Vector3(0, 1, 0);
const center = new Vector3(0, 0, 0);
const up = new Vector3(0, 1, 0);

interface Sensor {
  transform: Matrix4;
  power: number;
}

export default class DiffuseLight extends UVLight {
  light = new THREE.DirectionalLight(0xaaaaaa);
  camera: OrthographicCamera;
  target: WebGLRenderTarget;
  sensors: Sensor[] = [];
  viewSize: number;

  constructor(count: number, viewSize: number, renderSize: number) {
    super(renderSize);
    this.add(this.light);

    this.camera = new OrthographicCamera(-1, 1, -1, 1);
    this.camera.matrixAutoUpdate = false;
    this.setViewSize(viewSize);
    this.add(this.camera);

    this.setCount(count);
  }

  setViewSize(viewSize: number) {
    this.viewSize = viewSize;
    this.camera.left = -viewSize / 2;
    this.camera.right = viewSize / 2;
    this.camera.bottom = -viewSize / 2;
    this.camera.top = viewSize / 2;
    this.camera.near = -10 * viewSize;
    this.camera.far = 10 * viewSize;
    this.camera.updateProjectionMatrix();
  }

  get pixelArea(): number {
    const side = this.viewSize / this.renderSize;
    return side * side;
  }

  setCount(count: number) {
    this.sensors = [];
    const phi = 0.5 * (1 + Math.sqrt(5));
    const golden_angle = 2 * Math.PI * (2 - phi);
    for (let i = 1; i <= count; ++i) {
      const lat = Math.asin(1 - i / (count + 1));
      const lon = golden_angle * i;
      eye.set(
        Math.cos(lon) * Math.cos(lat),
        Math.sin(lat),
        Math.sin(lon) * Math.cos(lat)
      );
      this.sensors.push({
        power: 0,
        transform: new Matrix4().lookAt(eye, center, up),
      });
    }
    this.recalculatePower();
  }

  recalculatePower() {
    const tmp = new Vector3();
    this.updateWorldMatrix(true, true);
    const world = new Matrix3().setFromMatrix4(this.matrixWorld);
    this.sensors.forEach((sensor) => {
      const lat =
        Math.PI / 2 -
        tmp
          .set(0, 0, 1)
          .applyMatrix4(sensor.transform)
          .applyMatrix3(world)
          .angleTo(up);
      sensor.power = clamp((1 + 2 * Math.sin(lat)) / 3, 0, 1); // Standard Overcast Sky
      debugger;
    });
  }

  render(
    renderer: WebGLRenderer,
    scene: Scene,
    photosynthesis: Photosynthesis
  ) {
    const pa = this.pixelArea;
    const total_power = this.sensors.reduce((s, { power }) => s + power, 0);
    this.sensors.forEach(({ transform, power }) => {
      this.camera.matrix = transform;
      this.camera.matrixWorldNeedsUpdate = true;
      renderer.setRenderTarget(this.target);
      renderer.render(scene, this.camera);
      photosynthesis.addLight(
        this.target.texture,
        this.target.width,
        this.target.height,
        (power * pa) / total_power
      );
    });
  }
}

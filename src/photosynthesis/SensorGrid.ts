import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Object3D,
  PlaneGeometry,
} from "three";

export default class SensorGrid extends Object3D {
  constructor(
    sensorsX: number,
    sensorsY: number,
    width: number = 1,
    height: number = 1
  ) {
    super();

    const sensors = [];
    const dx = width / sensorsX;
    const dy = height / sensorsY;
    let photosynthesisID = 0;

    const geometry = new PlaneGeometry(dx, dy);

    for (let i = 0; i < sensorsX; ++i) {
      const x = dx * (i + 0.5 - sensorsX / 2);
      const row = [];
      for (let j = 0; j < sensorsY; ++j) {
        const y = dy * (j + 0.5 - sensorsY / 2);
        const sensor = new Mesh(
          geometry,
          new MeshPhongMaterial({
            color: new Color().setHSL(Math.random(), 0.9, 0.6),
            side: DoubleSide,
          })
        );
        (sensor.material as any).photosynthesisMaterial = new MeshBasicMaterial(
          {
            side: DoubleSide,
          }
        );
        sensor.rotateX(Math.PI / 2);
        (sensor as any).photosynthesisID = ++photosynthesisID;
        sensor.position.set(x, 0, y);
        this.add(sensor);
        row.push(sensor);
      }
      sensors.push(row);
    }
  }
}

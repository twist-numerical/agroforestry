import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  Object3D,
  PlaneGeometry,
  RawShaderMaterial,
} from "three";
import Photosynthesis from "./Photosynthesis";
import PhotosynthesisMesh from "./PhotosynthesisMesh";

const black = new Color("black");

export default class SensorGrid
  extends InstancedMesh
  implements PhotosynthesisMesh {
  photosynthesis: Photosynthesis;
  photosynthesisColor: InstancedBufferAttribute;
  color: InstancedBufferAttribute;
  names: string[];

  constructor(
    photosynthesis: Photosynthesis,
    sensorsX: number,
    sensorsY: number,
    width: number = 1,
    height: number = 1
  ) {
    const dx = width / sensorsX;
    const dy = height / sensorsY;

    const instances = sensorsX * sensorsY;
    const geometry = new PlaneGeometry(dx, dy);
    geometry.applyMatrix4(new Matrix4().makeRotationX(-Math.PI / 2));
    super(
      geometry,
      new MeshBasicMaterial({
        side: DoubleSide,
      }),
      instances
    );
    this.names = [];
    this.photosynthesis = photosynthesis;

    this.photosynthesisColor = new InstancedBufferAttribute(
      new Float32Array(3 * instances),
      3
    );
    this.color = new InstancedBufferAttribute(
      new Float32Array(3 * instances),
      3
    );

    const matrix = new Matrix4();
    const color = new Color();
    let instanceIndex = 0;
    for (let i = 0; i < sensorsX; ++i) {
      const x = dx * (i + 0.5 - sensorsX / 2);
      for (let j = 0; j < sensorsY; ++j) {
        const y = dy * (j + 0.5 - sensorsY / 2);

        this.setMatrixAt(instanceIndex, matrix.makeTranslation(x, 0, y));

        color.setHSL(Math.random(), 0.9, 0.6),
          color.toArray(this.color.array, 3 * instanceIndex);
        const id = photosynthesis.nextID();
        photosynthesis
          .getColor(id)
          .toArray(this.photosynthesisColor.array, 3 * instanceIndex);

        this.names.push(`Sensor ${x.toFixed(6)}|${y.toFixed(6)}`);

        ++instanceIndex;
      }
    }
    this.instanceColor = this.color;
    this.instanceMatrix.needsUpdate = true;
  }

  prePhotosynthesis(): void {
    (this.material as MeshBasicMaterial).color = null;
    this.instanceColor = this.photosynthesisColor;
  }

  postPhotosynthesis(): void {
    (this.material as MeshBasicMaterial).color = null;
    this.instanceColor = this.color;
  }

  blackPhotosynthesis(): void {
    (this.material as MeshBasicMaterial).color = black;
  }

  dispose() {
    this.geometry.dispose();
    (this.material as MeshBasicMaterial).dispose();
  }
}

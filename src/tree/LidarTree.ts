import {
  CylinderGeometry,
  InstancedMesh,
  Material,
  Matrix4,
  Object3D,
  Vector3,
} from "three";
import getTreeData from "./treeConfiguration";
import TreeLeaves from "./TreeLeaves";

export type TreeParameters = {
  type?: string;
  radialSegments?: number;
  leaves?: boolean;
  leafLength?: number;
  leafWidth?: number;
  leavesPerTwig?: number;
  maxTwigRadius?: number;
  scale?: number;
};

export default class LidarTree extends Object3D {
  public leaves?: TreeLeaves;
  public tree?: InstancedMesh;
  private disposed: boolean = false;
  private growth: number = 1;
  public readonly ready: Promise<void>;

  constructor(material: Material, parameters: TreeParameters = {}) {
    super();

    parameters = {
      type: "alder_medium",
      radialSegments: 7,
      leaves: false,
      leafLength: 0.1,
      leafWidth: 0.1,
      leavesPerTwig: 5,
      maxTwigRadius: 0.1,
      scale: 1,
      ...parameters,
    };

    const geometry = new CylinderGeometry(
      1,
      1,
      1,
      parameters.radialSegments,
      1
    );
    geometry.applyMatrix4(
      new Matrix4().makeRotationX(Math.PI / 2).setPosition(0, 0, 0.5)
    );

    this.ready = getTreeData(parameters.type).then(
      ({ segments: rawSegments }) => {
        const segments = rawSegments.map(({ start, end, radius }) => ({
          start: start.clone().multiplyScalar(parameters.scale),
          end: end.clone().multiplyScalar(parameters.scale),
          radius: parameters.scale * radius,
        }));

        this.tree = new InstancedMesh(
          geometry,
          material.clone(),
          segments.length
        );

        const lookAt = new Matrix4();
        const scale = new Vector3();
        const up = new Vector3(0, 0, -1);
        segments.forEach(({ start, end, radius }, i) => {
          lookAt.lookAt(end, start, up);
          lookAt.setPosition(start);
          lookAt.scale(scale.set(radius, radius, start.distanceTo(end)));
          this.tree.setMatrixAt(i, lookAt);
        });
        this.tree.instanceMatrix.needsUpdate = true;
        this.add(this.tree);

        if (parameters.leaves) {
          this.leaves = new TreeLeaves(
            segments.filter(({ radius }) => radius < parameters.maxTwigRadius),
            {
              leafLength: parameters.leafLength,
              leafWidth: parameters.leafWidth,
              leavesPerTwig: parameters.leavesPerTwig,
            }
          );
          this.leaves.setGrowth(this.growth);
          this.add(this.leaves);
        }

        if (this.disposed) this.dispose();
      }
    );
  }

  dispose() {
    this.disposed = true;

    if (this.tree) {
      (this.tree.material as Material).dispose();
      this.tree.geometry.dispose();
      this.tree.dispose();
    }
    if (this.leaves) this.leaves.dispose();
  }

  setGrowth(growth: number) {
    this.growth = growth;
    if (this.leaves) this.leaves.setGrowth(growth);
  }
}

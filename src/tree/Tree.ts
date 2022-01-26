import { Color, Material, Mesh, Object3D } from "three";
import { TreeConfiguration } from "../data/Field";
import TreeGeometry from "./TreeGeometry";
import TreeLeaves from "./TreeLeaves";

export type LeafedTreeSettings = TreeConfiguration & {
  leafColor?: Color;
};

export default class Tree extends Object3D {
  public leaves?: TreeLeaves;
  public tree?: Mesh;
  public treeGeometry?: TreeGeometry;
  private growth: number = 1;
  private parameters: LeafedTreeSettings;

  constructor(
    treeGeometry: TreeGeometry,
    parameters: LeafedTreeSettings,
    material?: Material
  ) {
    super();

    this.parameters = parameters = {
      leafLength: 0.1,
      leafWidth: 0.1,
      leavesPerTwig: 5,
      maxTwigRadius: 0.1,
      leafColor: new Color("green"),
      ...parameters,
    };

    this.treeGeometry = treeGeometry;
    this.tree = new Mesh(treeGeometry, material);

    this.add(this.tree);

    this.leaves = new TreeLeaves(
      treeGeometry.segments.filter(
        ({ radius }) => radius < parameters.maxTwigRadius
      ),
      {
        leafLength: parameters.leafLength,
        leafWidth: parameters.leafWidth,
        leavesPerTwig: parameters.leavesPerTwig,
        leafColor: parameters.leafColor,
      }
    );
    this.leaves.setGrowth(this.growth);
    this.add(this.leaves);
  }

  setMaterial(material: Material) {
    this.tree.material = material;
  }

  dispose() {
    if (this.leaves) this.leaves.dispose();
  }

  setGrowth(growth: number) {
    this.growth = growth;
    if (this.leaves) this.leaves.setGrowth(growth);
  }

  leafArea() {
    if (!this.leaves) return 0;

    return (
      0.5 *
      this.parameters.leafLength *
      this.parameters.leafWidth *
      this.leaves.leafCount *
      this.growth
    );
  }

  boundingCylinder() {
    let radius = 0;
    let ymin = Infinity;
    let ymax = -Infinity;

    this.treeGeometry.segments.forEach((segment) => {
      [segment.start, segment.end].forEach((v) => {
        if (!isNaN(v.x) && !isNaN(v.z)) {
          radius = Math.max(radius, Math.hypot(v.x, v.z) + segment.radius);
        }
        if (!isNaN(v.y)) {
          ymin = Math.min(ymin, v.y);
          ymax = Math.max(ymax, v.y);
        }
      });
    });

    radius *= 1.05;
    ymax += (ymax - ymin) * 0.05;
    ymin -= (ymax - ymin) * 0.05;

    return { radius, ymin, ymax };
  }
}

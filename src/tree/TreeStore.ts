import { Material } from "three";
import Tree, { LeafedTreeSettings } from "./Tree";
import TreeGeometry from "./TreeGeometry";
//@ts-ignore
import trees from "./trees/*.csv";

export default class TreeStore {
  loadedGeometries: { [name: string]: Promise<TreeGeometry> } = {};

  constructor() {}

  async loadTreeGeometryFromCSV(path: string) {
    let geometry = this.loadedGeometries[path];
    if (geometry === undefined) {
      geometry = this.loadedGeometries[path] = (async () =>
        await TreeGeometry.readFromCSV(path))();
    }
    return geometry;
  }

  async loadTree(
    treeConfig: LeafedTreeSettings,
    material?: Material
  ): Promise<Tree> {
    const type = treeConfig.type;
    if (trees[type] !== undefined) {
      const geometry = await this.loadTreeGeometryFromCSV(trees[type]);
      return new Tree(geometry, treeConfig, material);
    } else {
      throw new Error(`Unknown tree: '${type}'`);
    }
  }
}

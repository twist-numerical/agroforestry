import { Material } from "three";
import { AvailableTree } from "../data/AvailableTree";
import Tree, { LeafedTreeSettings } from "./Tree";
import TreeGeometry from "./TreeGeometry";
//@ts-ignore
import treeFiles from "./trees/*.csv";

type UpdateListener = (availableTrees: AvailableTree[]) => void;

export default class TreeStore {
  geometryPromises: { [name: string]: Promise<TreeGeometry> } = {};
  loadedGeometries: { [name: string]: TreeGeometry } = {};
  listeners: UpdateListener[] = [];

  async loadTreeGeometryFromCSV(path: string, name: string) {
    let geometryPromise = this.geometryPromises[path];
    if (geometryPromise === undefined) {
      geometryPromise = TreeGeometry.readFromCSV(path);
      this.geometryPromises[path] = geometryPromise;

      const geometry = await geometryPromise;
      this.loadedGeometries[name] = geometry;
      this.updated();
      return geometry;
    } else {
      return await geometryPromise;
    }
  }

  async loadTree(
    treeConfig: LeafedTreeSettings,
    material?: Material
  ): Promise<Tree> {
    const type = treeConfig.type;
    if (treeFiles[type] !== undefined) {
      const geometry = await this.loadTreeGeometryFromCSV(
        treeFiles[type],
        type
      );
      return new Tree(geometry, treeConfig, material);
    } else {
      throw new Error(`Unknown tree: '${type}'`);
    }
  }

  get availableTrees(): AvailableTree[] {
    const trees: AvailableTree[] = Object.keys(treeFiles).map((type) => ({
      name: type,
      editable: false,
    }));

    trees.forEach((tree) => {
      const geometry = this.loadedGeometries[tree.name];
      if (geometry !== undefined) {
        tree.height = geometry.height;
        tree.segments = geometry.segments.length;
      }
    });

    return trees;
  }

  rename(from: string, to: string) {
    console.log(`Renaming '${from}' to '${to}'`);
  }

  updated() {
    const trees = this.availableTrees;
    this.listeners.forEach((l) => l(trees));
  }

  onUpdate(listener: UpdateListener) {
    this.listeners.push(listener);
  }
}

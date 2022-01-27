import { string } from "mathjs";
import { Material } from "three";
import { AvailableTree } from "../data/AvailableTree";
import Tree, { LeafedTreeSettings } from "./Tree";
import TreeGeometry from "./TreeGeometry";
//@ts-ignore
import treeFiles from "./trees/*.csv";
import { openDB, DBSchema, IDBPDatabase } from "idb";
import { offset } from "@popperjs/core";

const precomputed = {
  "Alder medium": [11.2, 3811],
  "Alder old": [16.4, 8211],
  "Alder young": [8.3, 2332],
  "Alder young alternative": [4.9, 402],
  "Birch medium": [16.3, 13254],
  "Birch medium alternative": [12.7, 1949],
  "Birch old": [17.7, 20012],
  "Birch young": [5.5, 1497],
  "Oak medium": [14.4, 8610],
  "Oak old": [21.8, 38036],
  "Oak young": [5.3, 1367],
};

interface TreeStoreSchema extends DBSchema {
  trees: {
    value: {
      id: string;
      name: string;
      geometry: ArrayBuffer;
    };
    key: string;
  };
}

type UpdateListener = (availableTrees: AvailableTree[]) => void;

type TreeGeometryData = {
  id: string;
  name: string;
  internal: boolean;
  promise: Promise<TreeGeometry>;
  geometry?: TreeGeometry;
};

function dbValueToTreeGeometryData(
  stored: TreeStoreSchema["trees"]["value"]
): TreeGeometryData {
  const geometry = TreeGeometry.fromBuffer(stored.geometry);
  return {
    id: stored.id,
    name: stored.name,
    internal: false,
    promise: new Promise((resolve) => resolve(geometry)),
    geometry: geometry,
  };
}

export default class TreeStore {
  treeGeometries: {
    [id: string]: TreeGeometryData;
  } = {};

  db: Promise<IDBPDatabase<TreeStoreSchema>> = openDB<TreeStoreSchema>(
    "tree-store",
    1,
    {
      upgrade(db) {
        db.createObjectStore("trees", {
          keyPath: "id",
        });
      },
    }
  );

  listeners: UpdateListener[] = [];

  constructor() {
    this.readFromDB();
  }

  async readFromDB() {
    const db = await this.db;
    (await db.getAll("trees")).forEach((tree) => {
      this.treeGeometries[tree.id] = dbValueToTreeGeometryData(tree);
    });
    this.updated();
  }

  async loadTreeGeometryFromCSV(path: string, id: string) {
    let tree = this.treeGeometries[id];
    if (tree === undefined) {
      const promise = (async () =>
        TreeGeometry.parseCSV(await (await fetch(path)).text()))();
      this.treeGeometries[id] = {
        name: id,
        id: id,
        internal: true,
        promise,
      };

      const geometry = await promise;
      this.treeGeometries[id].geometry = geometry;
      this.updated();
      return geometry;
    } else {
      return await tree.promise;
    }
  }

  async localStoreTreeGeometry(id: string) {
    const tree = this.treeGeometries[id];
    if (tree.internal) {
      console.warn(`Trying to store an internal tree: ${id}`);
      return;
    }
    const db = await this.db;
    await db.put("trees", {
      id: tree.id,
      name: tree.name,
      geometry: (await tree.promise).asBuffer(),
    });
  }

  async localLoadTreeGeometry(id: string) {
    const db = await this.db;

    const stored = await db.get("trees", id);
    if (!stored) return undefined;

    this.treeGeometries[id] = dbValueToTreeGeometryData(stored);
    this.updated();
  }

  async loadTreeGeometry(id: string) {
    if (this.treeGeometries[id]) {
      return await this.treeGeometries[id].promise;
    } else if (treeFiles[id] !== undefined) {
      return await this.loadTreeGeometryFromCSV(treeFiles[id], id);
    } else {
      const geometry = this.localLoadTreeGeometry(id);
      if (!geometry) throw new Error(`Unknown tree: '${id}'`);
      return geometry;
    }
  }

  async loadTree(
    treeConfig: LeafedTreeSettings,
    material?: Material
  ): Promise<Tree> {
    let geometry = await this.loadTreeGeometry(treeConfig.id);
    return new Tree(geometry, treeConfig, material);
  }

  async deleteTree(id: string) {
    const tree = this.treeGeometries[id];
    if (!tree || tree.internal) {
      console.warn(`Trying to delete an internal tree: ${id}`);
      return;
    }

    delete this.treeGeometries[id];
    this.updated();
    await (await this.db).delete("trees", id);
  }

  get availableTrees(): AvailableTree[] {
    const trees: AvailableTree[] = Object.keys(treeFiles)
      .filter((t) => this.treeGeometries[t] === undefined)
      .map((type) => ({
        id: type,
        name: type,
        editable: false,
      }));

    Object.values(this.treeGeometries).forEach((tree) => {
      const v: AvailableTree = {
        id: tree.id,
        name: tree.name,
        editable: !tree.internal,
      };
      if (tree.geometry !== undefined) {
        v.height = tree.geometry.height;
        v.segments = tree.geometry.segments.length;
      }
      trees.push(v);
    });
    trees.sort((a, b) => {
      if (a.editable != b.editable) return a.editable ? 1 : -1;
      return a.id.localeCompare(b.id);
    });
    trees.forEach((tree) => {
      if (precomputed[tree.id]) {
        const [height, segments] = precomputed[tree.id];
        if (tree.height === undefined) tree.height = height;
        if (tree.segments === undefined) tree.segments = segments;
      }
    });
    return trees;
  }

  rename(id: string, newName: string) {
    this.treeGeometries[id].name = newName;
    this.localStoreTreeGeometry(id);
    this.updated();
  }

  async updated() {
    const trees = this.availableTrees;
    this.listeners.forEach((l) => l(trees));
  }

  onUpdate(listener: UpdateListener) {
    this.listeners.push(listener);
  }

  private randomID() {
    const length = 30;
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let id = "tree_";
    for (let i = 0; i < length; ++i) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  async addTree(name: string, data: ArrayBuffer) {
    const id = this.randomID();
    const promise = (async () => {
      if (name.toLowerCase().endsWith(".obj")) {
        const obj = await new Blob([data]).text();
        return TreeGeometry.parseOBJ(obj);
      } else {
        throw new Error("Only obj files are supported.");
      }
    })();

    this.treeGeometries[id] = {
      id: id,
      name: name,
      internal: false,
      promise: promise,
    };
    this.treeGeometries[id].geometry = await promise;
    this.updated();
    this.localStoreTreeGeometry(id);
  }
}

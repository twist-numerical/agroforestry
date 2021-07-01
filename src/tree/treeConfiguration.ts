import { Vector3 } from "three";
import alder_medium_file from "./alder_medium.csv";
import alder_old_file from "./alder_old.csv";
import alder_young_file from "./alder_young.csv";
import birch_medium_file from "./birch_medium.csv";
import birch_old_file from "./birch_old.csv";
import birch_young_file from "./birch_young.csv";
import oak_medium_file from "./oak_medium.csv";
import oak_old_file from "./oak_old.csv";
import oak_young_file from "./oak_young.csv";
import birch_medium_alternative_file from "./birch_medium_alternative.csv";
import alder_young_alternative_file from "./alder_young_alternative.csv";

export type TreeSegment = { start: Vector3; end: Vector3; radius: number };
export type TreeData = { segments: TreeSegment[]; height: number };

function register_tree(segmentFile: string): () => Promise<TreeData> {
  let promise = undefined;
  return (): Promise<TreeData> => {
    if (promise !== undefined) return promise;

    return (promise = (async () => {
      const lidar = (await (await fetch(segmentFile)).text())
        .split(/\s+/)
        .map((a) => parseFloat(a));

      const offset = new Vector3(lidar[3], lidar[5], lidar[4]);
      const segments: TreeSegment[] = [];
      for (let i = 0; i < lidar.length; i += 7) {
        segments.push({
          start: new Vector3(lidar[i + 0], lidar[i + 2], lidar[i + 1]).sub(
            offset
          ),
          end: new Vector3(lidar[i + 3], lidar[i + 5], lidar[i + 4]).sub(
            offset
          ),
          radius: lidar[i + 6],
        });
      }

      return {
        segments: segments,
        height: Math.max(...segments.map((s) => s.end.y)),
      };
    })());
  };
}

const trees: { [key: string]: () => Promise<TreeData> } = {
  alder_medium: register_tree(alder_medium_file),
  alder_old: register_tree(alder_old_file),
  alder_young: register_tree(alder_young_file),
  birch_medium: register_tree(birch_medium_file),
  birch_old: register_tree(birch_old_file),
  birch_young: register_tree(birch_young_file),
  oak_medium: register_tree(oak_medium_file),
  oak_old: register_tree(oak_old_file),
  oak_young: register_tree(oak_young_file),
  alder_young_alternative: register_tree(alder_young_alternative_file),
  birch_medium_alternative: register_tree(birch_medium_alternative_file),
};

export default function getTreeData(type: string): Promise<TreeData> {
  if (trees[type] === undefined) {
    console.error(
      `Tree '${type}' is not a valid tree type. (Possible options: ${Object.keys(
        trees
      ).join(", ")})`
    );
    return trees.alder_medium();
  }
  return trees[type]();
}

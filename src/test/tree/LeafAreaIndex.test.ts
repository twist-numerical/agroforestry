import test from "ava";
import LeafAreaIndex from "../../tree/LeafAreaIndex";
import TreeStore from "../../tree/TreeStore";
import createRenderer from "../createRenderer";
import almostEqual from "../util/almostEqual";

const trees = [
  {
    id: "Oak young",
    leafLength: 0.11,
    leafWidth: 0.07,
    maxTwigRadius: 0.02,
    leavesPerTwig: 25,
    leafAreaIndex: 5.53,
  },
  {
    id: "Oak medium",
    leafLength: 0.11,
    leafWidth: 0.07,
    maxTwigRadius: 0.02,
    leavesPerTwig: 11,
    leafAreaIndex: 5.68,
  },
  {
    id: "Oak old",
    leafLength: 0.11,
    leafWidth: 0.07,
    maxTwigRadius: 0.02,
    leavesPerTwig: 14,
    leafAreaIndex: 5.49,
  },
  {
    id: "Birch young",
    leafLength: 0.07,
    leafWidth: 0.06,
    maxTwigRadius: 0.02,
    leavesPerTwig: 21,
    leafAreaIndex: 4.45,
  },
  {
    id: "Birch medium",
    leafLength: 0.07,
    leafWidth: 0.06,
    maxTwigRadius: 0.02,
    leavesPerTwig: 6,
    leafAreaIndex: 4.43,
  },
  {
    id: "Birch old",
    leafLength: 0.07,
    leafWidth: 0.06,
    maxTwigRadius: 0.02,
    leavesPerTwig: 11,
    leafAreaIndex: 4.58,
  },
  {
    id: "Alder young",
    leafLength: 0.09,
    leafWidth: 0.08,
    maxTwigRadius: 0.02,
    leavesPerTwig: 7,
    leafAreaIndex: 4.83,
  },
  {
    id: "Alder medium",
    leafLength: 0.09,
    leafWidth: 0.08,
    maxTwigRadius: 0.02,
    leavesPerTwig: 8,
    leafAreaIndex: 4.9,
  },
  {
    id: "Alder old",
    leafLength: 0.09,
    leafWidth: 0.08,
    maxTwigRadius: 0.02,
    leavesPerTwig: 9,
    leafAreaIndex: 4.66,
  },
];

test("LeafAreaIndex", async (t) => {
  const lai = new LeafAreaIndex(createRenderer());

  const store = new TreeStore();
  await Promise.all(
    trees.map(async (treeConfig) => {
      const tree = await store.loadTree({
        ...treeConfig,
        position: [0, 0],
        scale: 1,
        rotation: 0,
      });

      const got = lai.calculate(tree);
      t.truthy(
        almostEqual(treeConfig.leafAreaIndex, got, 0.05),
        `Error on ${treeConfig.id}: ${got}`
      );
    })
  );
});

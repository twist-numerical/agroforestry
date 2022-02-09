import test from "ava";
import TreeStore from "../../tree/TreeStore";
import almostEqual from "../util/almostEqual";

test("TreeStore", async (t) => {
  const store = new TreeStore();

  const tree = await store.loadTreeGeometry("Alder medium");
  const cyl = tree.boundingCylinder();

  t.truthy(almostEqual(4.28117, cyl.radius, 1e-2));
  t.truthy(almostEqual(-0.58986, cyl.ymin, 1e-2));
  t.truthy(almostEqual(11.7972, cyl.ymax, 1e-2));
});

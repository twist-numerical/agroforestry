import * as itertools from "../../util/itertools";

import test from "ava";

test("util.itertoos.range", (t) => {
  t.deepEqual([...itertools.range(0, 3)], [0, 1, 2]);

  t.deepEqual([...itertools.range(10, 20, 3)], [10, 13, 16, 19]);
});

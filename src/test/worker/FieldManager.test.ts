import test from "ava";
import { create } from "domain";
import { re } from "mathjs";
import { FieldConfiguration } from "../../data/Field";
import LeafAreaIndex from "../../tree/LeafAreaIndex";
import TreeStore from "../../tree/TreeStore";
import FieldManager from "../../worker/FieldManager";
import createRenderer from "../createRenderer";
import almostEqual from "../util/almostEqual";

const emptyField: FieldConfiguration = {
  geography: {
    inclination: 0,
    inclinationRotation: 0,
    latitude: -23.43642,
    rotation: 0,
  },
  sensors: {
    count: [4, 4],
    size: [4, 4],
    diffuseLightCount: 25,
    renderSize: 1024,
  },
  trees: [],
};

test("FieldManager sunlight", async (t) => {
  const manager = new FieldManager(createRenderer(), new TreeStore());

  manager.loadField(emptyField);

  t.timeout(1000 * 60, "The light calculation took more than one minute.");
  const moment = manager.calculateMoment(12, 0, 0);

  moment[1]
    .slice(1)
    .forEach((v: number) =>
      t.truthy(
        almostEqual(1, v, 1e-3),
        `Sunlight: with maximal sun, the sensor should detect 1, not ${v}.`
      )
    );

  moment[2]
    .slice(1)
    .forEach((v: number) =>
      t.truthy(
        almostEqual(0.57, v, 1e-1),
        `Diffuse light: on an empty field, the sensor should detect approximatly 0.57, not ${v}.`
      )
    );
});

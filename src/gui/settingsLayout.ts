import * as math from "mathjs";

export default function(guiElement: any) {
  return {
    sensors: [
      {
        name: "Size",
        value: "size",
        type: "coordinate",
        attributes: {
          get xbounds() {
            return [0, guiElement.changedField.field.size];
          },
          get ybounds() {
            return [0, guiElement.changedField.field.size];
          },
        },
      },
      {
        name: "Count",
        value: "count",
        type: "coordinate",
        attributes: {
          xbounds: [1, 256],
          ybounds: [1, 256],
          precision: 0,
        },
      },
      {
        name: "Render resolution",
        value: "renderSize",
        info:
          "To calculate incomming light the view for each of the light sources is rendered to a temporary image. This parameter expresses the size of this image in pixels. The bigger this value, the more accurate the calculations, but they take more time.",
        attributes: {
          min: 0,
          max: 1,
          precision: 1,
          convertToFloat(k: number) {
            return (Math.log2(k) - 8) / 4;
          },
          convertFromFloat(k: number) {
            return Math.pow(2, Math.round(8 + 4 * k));
          },
          parse: function(value: string) {
            let k = Math.round(Math.log2(math.evaluate(value)));
            const clamped = k < 8 ? 8 : k < 12 ? k : 12;
            return Math.pow(2, clamped);
          },
        },
      },
      {
        name: "Diffusion lights",
        value: "diffuseLightCount",
        info: "The amount of diffuse light that reaches a sensor is estimated by shining many different lights from all directions. The more diffusion lights, the more accurate and more expensive the computation.",
        attributes: {
          min: 3,
          max: 50,
          precision: 0,
        },
      },
    ],
    field: [
      {
        name: "Size",
        value: "size",
        attributes: {
          min: 1,
          max: 2000,
        },
      },
      {
        name: "Latitude",
        value: "latitude",
        attributes: {
          min: -90,
          max: 90,
        },
      },
      {
        name: "Rotation",
        value: "rotation",
        attributes: {
          min: 0,
          max: 360,
          precision: 1,
        },
      },
      {
        name: "Inclination",
        value: "inclination",
        attributes: {
          min: 0,
          max: 90,
        },
      },
      {
        name: "Uphill",
        value: "inclinationRotation",
        attributes: {
          min: 0,
          max: 360,
        },
      },
    ],
    tree: [
      {
        name: "Position",
        type: "coordinate",
        value: "position",
        attributes: {
          get xbounds() {
            return [
              -guiElement.changedField.field.size / 2,
              guiElement.changedField.field.size / 2,
            ];
          },
          get ybounds() {
            return [
              -guiElement.changedField.field.size / 2,
              guiElement.changedField.field.size / 2,
            ];
          },
        },
      },
      {
        name: "Scale",
        value: "scale",
        invalidateTree: true,
        attributes: {
          min: 0.5,
          max: 2,
          precision: 2,
        },
      },
      {
        name: "Rotation",
        value: "rotation",
        attributes: {
          min: 0,
          max: 360,
          precision: 1,
        },
      },
      {
        name: "Type",
        value: "type",
        invalidateTree: true,
        type: "select",
        attributes: {
          options: [
            { name: "Alder young", value: "alder_young" },
            { name: "Alder medium", value: "alder_medium" },
            { name: "Alder old", value: "alder_old" },
            { name: "Birch young", value: "birch_young" },
            { name: "Birch medium", value: "birch_medium" },
            { name: "Birch old", value: "birch_old" },
            { name: "Oak young", value: "oak_young" },
            { name: "Oak medium", value: "oak_medium" },
            { name: "Oak old", value: "oak_old" },
            {
              name: "Alder young alternative",
              value: "alder_young_alternative",
            },
            {
              name: "Birch medium alternative",
              value: "birch_medium_alternative",
            },
          ],
        },
      },
      {
        name: "Leaf length",
        value: "leafLength",
        info: "Each leaf is approximated by a triangle. 'Leaf length' indicates how long this triangle is on the maximum leaf growth of 100%.",
        invalidateTree: true,
        attributes: {
          min: 0,
          max: 1,
        },
      },
      {
        name: "Leaf width",
        value: "leafWidth",
        info: "Each leaf is approximated by a triangle. 'Leaf width' indicates how wide this triangle is on the maximum leaf growth of 100%.",
        invalidateTree: true,
        attributes: {
          min: 0,
          max: 1,
        },
      },
      {
        name: "Leaves per twig",
        value: "leavesPerTwig",
        info: "This value expresses how many randomly generated leaves should be present on each twig.",
        invalidateTree: true,
        attributes: {
          min: 0,
          max: 50,
          precision: 0,
        },
      },
      {
        name: "Max twig radius",
        value: "maxTwigRadius",
        info: "This value expresses how thick a branch can be and still be considered a twig. Only on the branches with a radius smaller than this value, leaves will be added.",
        invalidateTree: true,
        attributes: {
          min: 0,
          max: 0.5,
          precision: 2,
        },
      },
    ],
  };
}

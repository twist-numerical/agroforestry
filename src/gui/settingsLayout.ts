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
          { name: "Alder young alternative", value: "alder_young_alternative" },
          {
            name: "Birch medium alternative",
            value: "birch_medium_alternative",
          },
        ],
      },
      {
        name: "Leaf length",
        value: "leafLength",
        invalidateTree: true,
        attributes: {
          min: 0,
          max: 1,
        },
      },
      {
        name: "Leaf width",
        value: "leafWidth",
        invalidateTree: true,
        attributes: {
          min: 0,
          max: 1,
        },
      },
      {
        name: "Leaves per twig",
        value: "leavesPerTwig",
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

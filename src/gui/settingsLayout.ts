import * as math from "mathjs";

export default function(guiElement: any) {
  return {
    main: [
      {
        name: "Time of day",
        value: "timeOfDay",
        attributes: {
          min: 0,
          max: 24,
        },
      },
      {
        name: "Day",
        value: "day",
        attributes: {
          precision: 0,
          min: 0,
          max: 366,
        },
      },
      {
        name: "Leaf growth",
        value: "leafGrowth",
        attributes: {
          min: 0,
          max: 1,
        },
      },
    ],
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
        name: "Time step size",
        value: "timeStepSize",
        attributes: {
          min: 15,
          max: 60*12,
          precision: 0,
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
          max: 100,
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
        name: "Leaf length",
        value: "leafLength",
        attributes: {
          min: 0,
          max: 1,
        },
      },
      {
        name: "Leaf width",
        value: "leafWidth",
        attributes: {
          min: 0,
          max: 1,
        },
      },
      {
        name: "Leaves per twig",
        value: "leavesPerTwig",
        attributes: {
          min: 0,
          max: 30,
          precision: 0,
        },
      },
    ],
  };
}

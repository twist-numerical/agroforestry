import * as math from "mathjs";
import { AvailableTree } from "../data/AvailableTree";

function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value;
}

function logSlider(min: number, max: number, precision = 2) {
  const lMin = Math.log2(min);
  const lMax = Math.log2(max);
  return {
    convertToFloat(k: number) {
      return (Math.log2(k) - lMin) / (lMax - lMin);
    },
    convertFromFloat(k: number) {
      return +Math.pow(2, lMin + (lMax - lMin) * k).toFixed(precision);
    },
    parse: function(value: string) {
      return +clamp(math.evaluate(value), min, max).toFixed(precision);
    },
  };
}

export default function(guiElement: any) {
  return {
    sensors: [
      {
        name: "Size",
        value: "size",
        type: "coordinate",
        attributes: {
          ...logSlider(2, 2000, 2),
        },
      },
      {
        name: "Count",
        value: "count",
        type: "coordinate",
        attributes: {
          ...logSlider(1, 256, 0),
        },
      },
      {
        name: "Render resolution",
        value: "renderSize",
        info:
          "To calculate incoming light the view for each of the light sources is rendered to a temporary image. This parameter expresses the size of this image in pixels. The bigger this value, the more accurate the calculations, but they take more time.",
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
            return Math.pow(2, clamp(k, 8, 12));
          },
        },
      },
      {
        name: "Diffusion lights",
        value: "diffuseLightCount",
        info:
          "The amount of diffuse light that reaches a sensor is estimated by shining many different lights from all directions. The more diffusion lights, the more accurate and more expensive the computation.",
        attributes: {
          min: 3,
          max: 50,
          precision: 0,
        },
      },
    ],
    geography: [
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
            const max = guiElement.changedField.sensors.size[0] * 1.5;
            return [-max, max];
          },
          get ybounds() {
            const max = guiElement.changedField.sensors.size[1] * 1.5;
            return [-max, max];
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
        name: "Type",
        value: "id",
        invalidateTree: true,
        type: "select",
        attributes() {
          return {
            options: guiElement.availableTrees.map(
              ({ name, id }: AvailableTree) => ({
                name: name,
                value: id,
              })
            ),
          };
        },
      },
      {
        name: "Leaf length",
        value: "leafLength",
        info:
          "Each leaf is approximated by a triangle. 'Leaf length' indicates how long this triangle is on the maximum leaf growth of 100%.",
        invalidateTree: true,
        attributes: {
          min: 0,
          max: 1,
        },
      },
      {
        name: "Leaf width",
        value: "leafWidth",
        info:
          "Each leaf is approximated by a triangle. 'Leaf width' indicates how wide this triangle is on the maximum leaf growth of 100%.",
        invalidateTree: true,
        attributes: {
          min: 0,
          max: 1,
        },
      },
      {
        name: "Leaves per twig",
        value: "leavesPerTwig",
        info:
          "This value expresses how many randomly generated leaves should be present on each twig.",
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
        info:
          "This value expresses how thick a branch can be and still be considered a twig. Only on the branches with a radius smaller than this value, leaves will be added.",
        invalidateTree: true,
        attributes: {
          min: 0,
          max: 0.5,
          precision: 2,
        },
      },
      ,
    ],
    treeline: [
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
        name: "xCount",
        value: "xCount",
        attributes: {
          min: 1,
          max: 20,
          precision: 0,
        },
      },
      {
        name: "xDistance",
        value: "xDistance",
        attributes: {
          min: 0,
          max: 10,
          precision: 2,
        },
      },
      {
        name: "yCount",
        value: "yCount",
        attributes: {
          min: 1,
          max: 5,
          precision: 0,
        },
      },
      {
        name: "yDistance",
        value: "yDistance",
        attributes: {
          min: 0,
          max: 10,
          precision: 2,
        },
      },
    ],
  };
}

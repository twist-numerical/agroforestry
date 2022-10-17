export interface TreeConfiguration {
  id: string;
  position: [number, number];
  scale: number;
  rotation: number;
  leafLength: number;
  leafWidth: number;
  leavesPerTwig: number;
  maxTwigRadius: number;
}

export type TreeLineConfiguration = TreeConfiguration & {
  treeline: boolean;
  xCount: number;
  xDistance: number;
  yCount: number;
  yDistance: number;
};

export interface FieldConfiguration {
  geography: {
    latitude: number;
    rotation: number;
    inclination: number;
    inclinationRotation: number;
  };
  sensors: {
    size: [number, number];
    count: [number, number];
    renderSize: number;
    diffuseLightCount: number;
  };
  trees: TreeLineConfiguration[];
}

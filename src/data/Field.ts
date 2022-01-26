export interface TreeConfiguration {
  type: string;
  position: [number, number];
  scale: number;
  rotation: number;
  leafLength: number;
  leafWidth: number;
  leavesPerTwig: number;
  maxTwigRadius: number;
}

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
  trees: TreeConfiguration[];
}
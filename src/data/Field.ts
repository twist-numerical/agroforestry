export interface Field {
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
  trees: {
    position: [number, number];
    type: string;
    scale: number;
    rotation: number;
    leafLength: number;
    leafWidth: number;
    leavesPerTwig: number;
    maxTwigRadius: number;
  }[];
}

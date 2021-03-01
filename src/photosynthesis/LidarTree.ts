import {
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  Object3D,
  RawShaderMaterial,
  Vector3,
} from "three";
import lidarTreeData from "./agroforestry.txt";

const treeConfiguration = {
  tree_lidar_1: {
    segments: lidarTreeData,
    height: 14.2,
    stemHeight: 5.6,
  },
};

class LeafMaterial extends RawShaderMaterial {
  constructor() {
    super({
      uniforms: {
        growth: { value: 1.0 },
        color: { value: new Color("green") },
      },
      vertexShader: `
precision highp float;

uniform float growth;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec2 position;
attribute vec3 offset;
attribute vec3 rotateUp;
attribute vec3 rotateSide;

void main(){
  vec2 p = growth * position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(
    offset + p.x * rotateSide + p.y * rotateUp, 1
  );
}
`,
      fragmentShader: `
precision highp float;

uniform vec3 color;

void main() {
  gl_FragColor.a = 1.;
  gl_FragColor.rgb = color;
}
`,
      side: DoubleSide,
    });
  }
  copy(source: LeafMaterial) {
    super.copy(source);
    this.color = source.color;
    return this;
  }
  get color() {
    return this.uniforms.color.value;
  }
  set color(color) {
    this.uniforms.color.value = color;
  }
}
const leafMaterial = new LeafMaterial();

function randomOnSphere(v: Vector3) {
  let length: number;
  do {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  } while ((length = v.length()) > 1);
  return v.multiplyScalar(1 / length);
}

type Segment = { start: Vector3; end: Vector3; radius: number };

const lidarTree = (async () => {
  const lidar = await (await fetch(lidarTreeData)).json();

  const offset = new Vector3(lidar[0], lidar[2], lidar[1]);
  const segments: Segment[] = [];
  for (let i = 0; i < lidar.length; i += 7) {
    segments.push({
      start: new Vector3(lidar[i + 0], lidar[i + 2], lidar[i + 1]).sub(offset),
      end: new Vector3(lidar[i + 3], lidar[i + 5], lidar[i + 4]).sub(offset),
      radius: lidar[i + 6],
    });
  }
  return segments;
})();

class Leaves extends Mesh {
  material: RawShaderMaterial;

  constructor(
    twigs: Vector3[],
    parameters: {
      leafLength: number;
      leafWidth: number;
      leavesPerTwig: number;
    }
  ) {
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute([0, 0, -0.5, 1, 0.5, 1], 2)
    );
    const material = leafMaterial.clone();
    (material as any).photosynthesisMaterial = leafMaterial.clone();
    super(geometry, material);

    const instances = twigs.length * parameters.leavesPerTwig;
    const offset = new InstancedBufferAttribute(
      new Float32Array(3 * instances),
      3
    );
    const rotateUp = new InstancedBufferAttribute(
      new Float32Array(3 * instances),
      3
    );
    const rotateSide = new InstancedBufferAttribute(
      new Float32Array(3 * instances),
      3
    );

    const up = new Vector3();
    const side = new Vector3();
    let index = 0;
    twigs.forEach((twig) => {
      for (let i = 0; i < parameters.leavesPerTwig; ++i) {
        randomOnSphere(up);
        randomOnSphere(side).cross(up);
        const leafSize = Math.sqrt(Math.random());
        up.multiplyScalar(leafSize * parameters.leafLength).toArray(
          rotateUp.array,
          index
        );
        side
          .multiplyScalar(leafSize * parameters.leafWidth)
          .toArray(rotateSide.array, index);
        twig.toArray(offset.array, index);
        index += 3;
      }
    });
    geometry.setAttribute("offset", offset);
    geometry.setAttribute("rotateUp", rotateUp);
    geometry.setAttribute("rotateSide", rotateSide);

    this.frustumCulled = false;
  }

  setGrowth(growth: number) {
    this.material.uniforms.growth.value = growth;
    const pMaterial = (this.material as any).photosynthesisMaterial;
    if (pMaterial instanceof RawShaderMaterial)
      pMaterial.uniforms.growth.value = growth;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

type TreeParameters = {
  radialSegments?: number;
  leaves?: boolean;
  leafLength?: number;
  leafWidth?: number;
  leavesPerTwig?: number;
  maxTwigRadius?: number;
  height?: number;
  stemHeight?: number;
  type?: string;
};

export default class LidarTree extends Object3D {
  private leaves?: Leaves;
  private tree?: InstancedMesh;
  private disposed: boolean = false;
  private growth: number = 1;

  constructor(material: Material, parameters: TreeParameters = {}) {
    super();

    const treeConfig =
      treeConfiguration[parameters.type] || treeConfiguration["tree_lidar_1"];
    parameters = {
      radialSegments: 7,
      leaves: false,
      leafLength: 0.1,
      leafWidth: 0.1,
      leavesPerTwig: 5,
      maxTwigRadius: 0.1,
      height: treeConfig.height,
      stemHeight: treeConfig.stemHeight,
      ...parameters,
    };

    const geometry = new CylinderGeometry(
      1,
      1,
      1,
      parameters.radialSegments,
      1
    );
    geometry.applyMatrix4(
      new Matrix4().makeRotationX(Math.PI / 2).setPosition(0, 0, 0.5)
    );

    lidarTree.then((rawSegments) => {
      const scaleTree = parameters.height / treeConfig.height;
      const scaledStem = treeConfig.stemHeight * scaleTree;
      const transformPoint = (raw: Vector3) => {
        const v = raw.clone().multiplyScalar(scaleTree);
        if (v.y < scaledStem) {
          v.y *= parameters.stemHeight / scaledStem;
        } else {
          v.y =
            parameters.stemHeight +
            ((v.y - scaledStem) / (parameters.height - scaledStem)) *
              (parameters.height - parameters.stemHeight);
        }
        return v;
      };
      const segments = rawSegments.map(({ start, end, radius }) => ({
        start: transformPoint(start),
        end: transformPoint(end),
        radius: scaleTree * radius,
      }));

      this.tree = new InstancedMesh(
        geometry,
        material.clone(),
        segments.length
      );

      const lookAt = new Matrix4();
      const scale = new Vector3();
      const up = new Vector3(0, 0, -1);
      segments.forEach(({ start, end, radius }, i) => {
        lookAt.lookAt(end, start, up);
        lookAt.setPosition(start);
        lookAt.scale(scale.set(radius, radius, start.distanceTo(end)));
        this.tree.setMatrixAt(i, lookAt);
      });
      this.tree.instanceMatrix.needsUpdate = true;
      this.add(this.tree);

      if (parameters.leaves) {
        this.leaves = new Leaves(
          segments
            .filter(({ radius }) => radius < parameters.maxTwigRadius)
            .map(({ end }) => end),
          {
            leafLength: parameters.leafLength,
            leafWidth: parameters.leafWidth,
            leavesPerTwig: parameters.leavesPerTwig,
          }
        );
        this.leaves.setGrowth(this.growth);
        this.add(this.leaves);
      }

      if (this.disposed) this.dispose();
    });
  }

  dispose() {
    this.disposed = true;

    if (this.tree) {
      (this.tree.material as Material).dispose();
      this.tree.geometry.dispose();
      this.tree.dispose();
    }
    if (this.leaves) this.leaves.dispose();
  }

  setGrowth(growth: number) {
    this.growth = growth;
    if (this.leaves) this.leaves.setGrowth(growth);
  }
}

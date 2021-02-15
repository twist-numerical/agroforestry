import {
  BufferGeometry,
  Color,
  Curve,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  Quaternion,
  RawShaderMaterial,
  Vector3,
} from "three";
import lidarTreeData from "./agroforestry.txt";

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

export default async () => {
  const lidar = await (await fetch(lidarTreeData)).json();

  const offset = new Vector3(lidar[0], lidar[2], lidar[1]);
  const segments: { start: Vector3; end: Vector3; radius: number }[] = [];
  for (let i = 0; i < lidar.length; i += 7) {
    segments.push({
      start: new Vector3(lidar[i + 0], lidar[i + 2], lidar[i + 1]).sub(offset),
      end: new Vector3(lidar[i + 3], lidar[i + 5], lidar[i + 4]).sub(offset),
      radius: lidar[i + 6],
    });
  }

  return {
    LidarTree: class LidarTree extends InstancedMesh {
      constructor(material: Material, radialSegments = 7) {
        const geometry = new CylinderGeometry(1, 1, 1, radialSegments, 1);
        geometry.applyMatrix4(
          new Matrix4().makeRotationX(Math.PI / 2).setPosition(0, 0, 0.5)
        );
        super(geometry, material, segments.length);

        const lookAt = new Matrix4();
        const scale = new Vector3();
        const up = new Vector3(0, 0, -1);
        segments.forEach(({ start, end, radius }, i) => {
          lookAt.lookAt(end, start, up);
          lookAt.setPosition(start);
          lookAt.scale(scale.set(radius, radius, start.distanceTo(end)));
          this.setMatrixAt(i, lookAt);
        });
      }
    },
    Leaves: class Leaves extends Mesh {
      material: RawShaderMaterial;

      constructor(
        parameters: {
          leafLength?: number;
          leafWidth?: number;
          leavesPerTwig?: number;
          maxTwigRadius?: number;
        } = {}
      ) {
        const settings = {
          leafLength: 0.1,
          leafWidth: 0.1,
          leafsPerTwig: 1,
          maxTwigRadius: 0.1,
          ...parameters,
        };
        const geometry = new InstancedBufferGeometry();
        geometry.setAttribute(
          "position",
          new Float32BufferAttribute([0, 0, -0.5, 1, 0.5, 1], 2)
        );
        const twigs = segments.filter(
          ({ radius }) => radius < settings.maxTwigRadius
        );
        const instances = twigs.length * settings.leavesPerTwig;
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
        twigs.forEach(({ start, end, radius }) => {
          if (radius < settings.maxTwigRadius) {
            for (let i = 0; i < settings.leavesPerTwig; ++i) {
              randomOnSphere(up);
              randomOnSphere(side).cross(up);
              const leafSize = Math.sqrt(Math.random());
              up.multiplyScalar(leafSize * settings.leafLength).toArray(
                rotateUp.array,
                index
              );
              side
                .multiplyScalar(leafSize * settings.leafWidth)
                .toArray(rotateSide.array, index);
              end.toArray(offset.array, index);
              index += 3;
            }
          }
        });
        geometry.setAttribute("offset", offset);
        geometry.setAttribute("rotateUp", rotateUp);
        geometry.setAttribute("rotateSide", rotateSide);
        const material = leafMaterial.clone();
        (material as any).photosynthesisMaterial = leafMaterial.clone();
        super(geometry, material);

        this.frustumCulled = false;
      }

      setGrowth(growth: number) {
        this.material.uniforms.growth.value = growth;
        const pMaterial = (this.material as any).photosynthesisMaterial;
        if (pMaterial instanceof RawShaderMaterial)
          pMaterial.uniforms.growth.value = growth;
      }
    },
  };
};

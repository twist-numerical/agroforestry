import {
  Mesh,
  RawShaderMaterial,
  Vector3,
  InstancedBufferGeometry,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  Color,
  DoubleSide,
} from "three";

function randomOnSphere(v: Vector3) {
  let length: number;
  do {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  } while ((length = v.length()) > 1);
  return v.multiplyScalar(1 / length);
}

export class LeafMaterial extends RawShaderMaterial {
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

export default class TreeLeaves extends Mesh {
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
    const material = new LeafMaterial();
    (material as any).photosynthesisMaterial = new LeafMaterial();
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

import {
  CanvasTexture,
  Color,
  DoubleSide,
  ImageBitmapLoader,
  InstancedBufferAttribute,
  InstancedMesh,
  MaterialParameters,
  Matrix4,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  ShaderMaterialParameters,
} from "three";
import Photosynthesis from "./Photosynthesis";
import PhotosynthesisMesh from "./PhotosynthesisMesh";
// @ts-ignore
import digitsImage from "./digits.png";

let digitsBitmap;
if (process.env.NODE_ENV === "test") {
  digitsBitmap = new Promise(() => {});
} else {
  const loader = new ImageBitmapLoader();
  loader.setOptions({ imageOrientation: "flipY" });
  digitsBitmap = new Promise((r) =>
    loader.load(digitsImage, (bitmap) => {
      r(bitmap);
    })
  );
}

const black = new Color("black");

class SensorGridMaterial extends ShaderMaterial {
  constructor(settings: ShaderMaterialParameters) {
    super({
      uniforms: {
        digits: { value: 0 },
      },
      vertexShader: `
out vec3 vColor;
flat out uint id;
out vec2 vPosition;
out vec2 vUv;

vec3 randomColor(float i) {
  float v = sin(2346.345*i+45.345);
	return vec3(
    .3+mod(3000.*v,.7),
    .3+mod(4000.*v,.7),
    .3+mod(5000.*v,.7));
}

uint getID(vec2 rg) {
  return uint(round(255.0*rg.r)) + uint(round(rg.g * 255.0)) * 256u;
}

void main() {
  id = getID(instanceColor.rg);
  vColor = randomColor(float(id));
  vUv = uv;
  vPosition = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4( position, 1.0 );
}
  `,
      fragmentShader: `
precision highp float;

in vec3 vColor;
flat in uint id;
in vec2 vPosition;
in vec2 vUv;

uniform sampler2D digits;

uint mod(uint x, uint m) {
  return uint(mod(float(x), float(m)));
}

void main() {
  gl_FragColor.a = 1.;
  gl_FragColor.rgb = vColor;

  uint d0 = mod(id, 10u);
  uint d1 = mod(id/10u, 10u);
  uint d2 = mod(id/100u, 10u);
  uint d3 = mod(id/1000u, 10u);

  uint d = d0;
  float x = 1.2*(1.0-vUv.y)-0.2;
  if(x < 0.0) return;
  if(x < .25) {
    x *= 4.0;
    if(d3 == 0u)
      return;
    d = d3;
  } else if(x < .5) {
    x = (x - 0.25) * 4.0; 
    if(d2 == 0u && d3 == 0u)
      return;
    d = d2;
  } else if(x < .75) {
    x = (x - 0.5) * 4.0; 
    if(d1 == 0u && d2 == 0u && d3 == 0u)
      return;
    d = d1;
  } else {
    x = (x - 0.75) * 4.0; 
    d = d0;
  }
  if(vUv.x < 0.5 && texture2D(digits, vec2((float(d) + x)/10.0, vUv.x*2.0)).r < 0.5)
    gl_FragColor.rgb = vec3(0.,0.,0.);
}
  `,
      side: DoubleSide,
      ...settings,
    });
    digitsBitmap.then((bitmap) => {
      // @ts-ignore
      this.uniforms.digits.value = new CanvasTexture(bitmap);
    });
  }
}

export default class SensorGrid extends InstancedMesh
  implements PhotosynthesisMesh {
  photosynthesis: Photosynthesis;
  photosynthesisColor: InstancedBufferAttribute;
  color: InstancedBufferAttribute;
  visualMaterial: SensorGridMaterial;
  photosynthesisMaterial: MeshBasicMaterial;
  names: string[];

  constructor(
    photosynthesis: Photosynthesis,
    sensorsX: number,
    sensorsY: number,
    width: number = 1,
    height: number = 1
  ) {
    const dx = width / sensorsX;
    const dy = height / sensorsY;

    const instances = sensorsX * sensorsY;
    const geometry = new PlaneGeometry(dx, dy);
    geometry.applyMatrix4(new Matrix4().makeRotationX(-Math.PI / 2));
    const visualMaterial = new SensorGridMaterial({
      side: DoubleSide,
    });
    const photosynthesisMaterial = new MeshBasicMaterial({
      side: DoubleSide,
    });
    super(geometry, visualMaterial, instances);
    this.visualMaterial = visualMaterial;
    this.photosynthesisMaterial = photosynthesisMaterial;
    this.names = [];
    this.photosynthesis = photosynthesis;

    this.instanceColor = new InstancedBufferAttribute(
      new Float32Array(3 * instances),
      3
    );
    this.color = new InstancedBufferAttribute(
      new Float32Array(3 * instances),
      3
    );

    const matrix = new Matrix4();
    const color = new Color();
    let instanceIndex = 0;
    for (let i = 0; i < sensorsX; ++i) {
      const x = dx * (i + 0.5 - sensorsX / 2);
      for (let j = 0; j < sensorsY; ++j) {
        const y = dy * (j + 0.5 - sensorsY / 2);

        this.setMatrixAt(instanceIndex, matrix.makeTranslation(x, 0, y));

        color.setHSL(Math.random(), 0.9, 0.6),
          color.toArray(this.color.array, 3 * instanceIndex);
        const id = photosynthesis.nextID();
        photosynthesis
          .getColor(id)
          .toArray(this.instanceColor.array, 3 * instanceIndex);

        this.names.push(`S${id} ${x.toFixed(6)}|${y.toFixed(6)}`);

        ++instanceIndex;
      }
    }
    this.instanceMatrix.needsUpdate = true;
  }

  prePhotosynthesis(): void {
    this.material = this.photosynthesisMaterial;
  }

  postPhotosynthesis(): void {
    this.material = this.visualMaterial;
  }

  blackPhotosynthesis(): void {
    (this.material as MeshBasicMaterial).color = black;
  }

  dispose() {
    this.geometry.dispose();
    this.visualMaterial.dispose();
    this.photosynthesisMaterial.dispose();
  }
}

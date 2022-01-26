import {
  Color,
  DoubleSide,
  MeshBasicMaterial,
  NearestFilter,
  OrthographicCamera,
  RedFormat,
  Scene,
  UnsignedByteType,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import Tree from "./Tree";

const TARGET_WIDTH = 1024;
const TARGET_HEIGHT = 1024;
const WINDOW_WIDTH = 256;
const WINDOW_HEIGHT = 256;
const BLACK = new Color("black");
const WHITE = new Color("white");
const ANGLES = 13;

const leafDensity = (() => {
  const sum = new Uint32Array(TARGET_WIDTH * TARGET_HEIGHT);
  return (target: Uint8Array) => {
    const TW = TARGET_WIDTH;
    for (let i = 0; i < TARGET_WIDTH; ++i)
      for (let j = 0; j < TARGET_HEIGHT; ++j) {
        let r = +!!target[TW * i + j];
        if (i > 0) r += sum[TW * (i - 1) + j];
        if (j > 0) r += sum[TW * i + (j - 1)];
        if (i > 0 && j > 0) r -= sum[TW * (i - 1) + (j - 1)];
        sum[TW * i + j] = r;
      }

    let density = 0;
    for (let i = WINDOW_WIDTH; i < TARGET_WIDTH; ++i)
      for (let j = WINDOW_HEIGHT; j < TARGET_HEIGHT; ++j) {
        density = Math.max(
          density,
          sum[TW * i + j] -
            sum[TW * (i - WINDOW_WIDTH) + j] -
            sum[TW * i + (j - WINDOW_HEIGHT)] +
            sum[TW * (i - WINDOW_WIDTH) + (j - WINDOW_HEIGHT)]
        );
      }
    return density / (WINDOW_WIDTH * WINDOW_HEIGHT);
  };
})();

export default class LeafDensity {
  target: WebGLRenderTarget;
  material: MeshBasicMaterial;
  renderer: WebGLRenderer;
  targetBuffer: Uint8Array;

  constructor(renderer: WebGLRenderer) {
    this.target = new WebGLRenderTarget(TARGET_WIDTH, TARGET_HEIGHT, {
      format: RedFormat,
      type: UnsignedByteType,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
    });
    this.material = new MeshBasicMaterial({
      side: DoubleSide,
      color: WHITE,
    });
    this.renderer = renderer;
    this.targetBuffer = new Uint8Array(TARGET_WIDTH * TARGET_HEIGHT);
  }

  async calculate(tree: Tree): Promise<number[]> {
    tree.setMaterial(this.material);
    const scene = new Scene();
    scene.add(tree);

    if (tree.leaves) tree.leaves.material.color = WHITE;

    const { ymin, ymax, radius } = tree.boundingCylinder();

    const camera = new OrthographicCamera(
      -radius,
      radius,
      ymin,
      ymax,
      -radius,
      radius
    );

    const clearColor = this.renderer.getClearColor(new Color());
    const clearAlpha = this.renderer.getClearAlpha();
    this.renderer.setRenderTarget(this.target);
    this.renderer.setClearColor(BLACK);

    const densities = [];
    for (const density of [0, 0.25, 0.5, 0.75, 1]) {
      tree.setGrowth(density);

      let average = 0;

      let previousResult = Promise.resolve();
      for (let i = 0; i < ANGLES; ++i) {
        const a = (Math.PI * 2 * (i + 0.5)) / ANGLES;
        camera.lookAt(Math.sin(a), 0, Math.cos(a));

        this.renderer.clear();
        this.renderer.render(scene, camera);
        await previousResult;
        this.renderer.readRenderTargetPixels(
          this.target,
          0,
          0,
          TARGET_WIDTH,
          TARGET_HEIGHT,
          this.targetBuffer
        );
        previousResult = Promise.resolve().then(() => {
          average += leafDensity(this.targetBuffer);
        });
        await previousResult;
      }
      await previousResult;
      average /= ANGLES;
      densities.push(average);
    }

    this.renderer.setClearColor(clearColor, clearAlpha);
    this.renderer.setRenderTarget(null);

    tree.dispose();
    return densities;
  }
}

import {
  Color,
  DoubleSide,
  MeshBasicMaterial,
  NearestFilter,
  OrthographicCamera,
  RedFormat,
  Scene,
  UnsignedByteType,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import LidarTree, { TreeParameters } from "./LidarTree";
import { polygonHull, polygonArea } from "d3-polygon";

const TARGET_WIDTH = 1024;
const TARGET_HEIGHT = 1024;
const BLACK = new Color("black");
const WHITE = new Color("white");

export default class LeafAreaIndex {
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

  async calculate(treeParameters: TreeParameters): Promise<number> {
    const tree = new LidarTree(this.material, treeParameters);
    const scene = new Scene();
    scene.add(tree);

    await tree.ready;

    if (!tree.leaves) return 0;

    tree.leaves.material.color = WHITE;
    tree.setGrowth(1);

    const { ymin, ymax, radius } = tree.boundingCylinder();

    const camera = new OrthographicCamera(
      -radius,
      radius,
      -radius,
      radius,
      ymin,
      ymax
    );
    camera.lookAt(new Vector3(0, 1, 0));

    const clearColor = this.renderer.getClearColor(new Color());
    const clearAlpha = this.renderer.getClearAlpha();

    this.renderer.setRenderTarget(this.target);
    this.renderer.setClearColor(BLACK);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.renderer.readRenderTargetPixels(
      this.target,
      0,
      0,
      TARGET_WIDTH,
      TARGET_HEIGHT,
      this.targetBuffer
    );

    const points = [];
    const scaleWidth = (2 * radius) / TARGET_WIDTH;
    const scaleHeight = (2 * radius) / TARGET_HEIGHT;
    let k = 0;
    for (let j = 0.5; j < TARGET_HEIGHT; ++j)
      for (let i = 0.5; i < TARGET_WIDTH; ++i) {
        if (!!this.targetBuffer[k++])
          points.push([scaleWidth * i, scaleHeight * j]);
      }
    const groundArea = polygonArea(polygonHull(points));

    const index = tree.leafArea() / groundArea;

    this.renderer.setClearColor(clearColor, clearAlpha);
    this.renderer.setRenderTarget(null);
    tree.dispose();
    return index;
  }
}

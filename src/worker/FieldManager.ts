import {
  ArrowHelper,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Texture,
  Vector3,
  WebGLRenderer,
} from "three";
import { constant, range } from "../util";
import DiffuseLight from "../photosynthesis/DiffuseLight";
import Tree from "../tree/Tree";
import Photosynthesis from "../photosynthesis/Photosynthesis";
import SensorGrid from "../photosynthesis/SensorGrid";
import Sun from "../photosynthesis/Sun";
import Sunlight from "../photosynthesis/Sunlight";
import { DiffuseLightIndicator } from "../photosynthesis/DiffuseLightIndicator";
import Compass from "./Compass";
import { FieldConfiguration } from "../data/Field";
import TreeStore from "../tree/TreeStore";

const TREE_COLOR = new Color("brown");
const TREE_COLOR_FADED = TREE_COLOR.clone().multiplyScalar(0.5);
const LEAF_COLOR = new Color("green");
const LEAF_COLOR_FADED = LEAF_COLOR.clone().multiplyScalar(0.3);

function d2r(d: number): number {
  return (d * Math.PI) / 180;
}

export type RenderSettings = {
  seconds?: number;
  leafGrowth?: number;
  leafWidth?: number;
  leafLength?: number;
  camera?: number[];
  highlightTrees?: number[];
  display?: {
    diffuseLight?: boolean;
  };
};

function getOrDefault<T>(value: T | undefined, def: T) {
  if (value === undefined) return def;
  return value;
}

const floorGeometry = new PlaneGeometry(-0.5, 0.5, 1, 1);
floorGeometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));

export default class FieldManager {
  scene = new Scene();
  sun = new Sun();
  ground = new Mesh(
    floorGeometry,
    new MeshBasicMaterial({
      side: DoubleSide,
      color: "#8a763a",
    })
  );
  compass = new Compass();
  sensors: SensorGrid;
  photosynthesis: Photosynthesis;
  field = new Group();
  sunlight = new Sunlight(1, 1);
  camera = new PerspectiveCamera(45, 1, 1, 10000);
  diffuseLight = new DiffuseLight(1, 1, 1);
  diffuseLightIndicator = new DiffuseLightIndicator();
  sunIndicator = new Mesh(
    new SphereGeometry(1, 21, 11),
    new MeshBasicMaterial({ color: "yellow" })
  );
  width: number = 300;
  height: number = 300;
  progress: (message: string, value: number) => void;
  drawTexture: (texture: Texture) => void;
  trees: Tree[] = [];
  treeGroup = new Group();
  parameters: FieldConfiguration;

  constructor(
    public renderer: WebGLRenderer,
    public treeStore: TreeStore,
    progress: (message: string, value: number) => void
  ) {
    this.progress = progress;
    this.photosynthesis = new Photosynthesis(this.renderer);
    this.field.add(this.ground);
    this.camera.matrixAutoUpdate = false;

    this.sunlight.lookAt(new Vector3(1, 0, 0));
    this.sun.add(this.sunlight);
    this.sunIndicator.add(
      new ArrowHelper(new Vector3(1, 0, 0), new Vector3(0, 0, 0), 3, "red")
    );
    this.sun.add(this.sunIndicator);

    this.scene.add(this.field, this.camera, this.sun, this.compass);

    this.diffuseLight.add(this.diffuseLightIndicator);

    this.drawTexture = (() => {
      const scene = new Scene();
      const planeMaterial = new MeshBasicMaterial();
      const plane = new Mesh(new PlaneGeometry(2, 2), planeMaterial);
      plane.scale.set(-1, 1, 1);
      scene.add(plane);
      const camera = new OrthographicCamera(-1, 1, -1, 1, -1, 1);
      camera.lookAt(0, 0, 1);
      return (texture: Texture) => {
        this.indicatorsVisible = false;

        const size = 400;
        this.renderer.setScissor(0, 0, size, size);
        this.renderer.setViewport(0, 0, size, size);

        planeMaterial.map = texture;
        this.renderer.setScissorTest(true);
        this.renderer.render(scene, camera);
      };
    })();
  }

  resize(width: number, height: number, pixelRatio: number) {
    this.width = width;
    this.height = height;

    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(pixelRatio);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  highlightTrees(highlight?: number[]) {
    const [defaultTreeColor, defaultLeafColor] =
      !highlight || highlight.length == 0
        ? [TREE_COLOR, LEAF_COLOR]
        : [TREE_COLOR_FADED, LEAF_COLOR_FADED];
    this.trees.forEach((tree) => {
      if (tree.tree)
        (tree.tree.material as MeshBasicMaterial).color.set(defaultTreeColor);
      if (tree.leaves) tree.leaves.material.color.set(defaultLeafColor);
    });
    if (highlight)
      highlight.forEach((i) => {
        const tree = this.trees[i];
        if (!tree) return;
        if (tree.tree)
          (tree.tree.material as MeshBasicMaterial).color.set(TREE_COLOR);
        if (tree.leaves) tree.leaves.material.color.set(LEAF_COLOR);
      });
  }

  setSettings({ seconds, leafGrowth, camera, highlightTrees }: RenderSettings) {
    if (seconds !== undefined) this.sun.setSeconds(seconds);
    if (leafGrowth !== undefined) this.setGrowth(leafGrowth);
    if (camera !== undefined) {
      this.camera.matrix.fromArray(camera);
      this.camera.matrixWorldNeedsUpdate = true;
    }
    this.highlightTrees(highlightTrees);
  }

  loadField(parameters: FieldConfiguration) {
    this.parameters = parameters;
    const rotation = d2r(parameters.geography.rotation) || 0;
    const [xFieldSize, yFieldSize] = parameters.sensors.size;
    const fieldDiameter = Math.hypot(xFieldSize, yFieldSize);
    this.field.rotation.set(0, rotation, 0);
    this.compass.setRotation(rotation);
    this.compass.position.set(0.5 * xFieldSize, 0, 0.5 * yFieldSize);

    this.ground.geometry.dispose();
    this.ground.geometry = new PlaneGeometry(
      1.5 * xFieldSize,
      1.5 * yFieldSize
    );
    this.ground.geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));

    this.photosynthesis.clear();

    if (this.sensors) {
      this.sensors.dispose();
    }
    this.ground.clear();
    this.ground.add(this.diffuseLight);
    this.sensors = new SensorGrid(
      this.photosynthesis,
      ...parameters.sensors.count,
      ...parameters.sensors.size
    );
    this.sensors.position.set(0, 0.1, 0);
    this.ground.add(this.sensors);

    const inclinationRotation =
      d2r(parameters.geography.inclinationRotation) || 0;
    const inclination = d2r(parameters.geography.inclination) || 0;
    const inclinationAxis = new Vector3(
      Math.sin(inclinationRotation),
      0,
      -Math.cos(inclinationRotation)
    );
    this.ground.setRotationFromAxisAngle(inclinationAxis, inclination);

    const renderSize = getOrDefault(parameters.sensors.renderSize, 1024);
    this.sun.setLatitude(getOrDefault(parameters.geography.latitude, 10));
    this.sunlight.setViewSize(fieldDiameter);
    this.sunlight.setRenderSize(renderSize);
    this.sunIndicator.position.set(-fieldDiameter, 0, 0);
    const siScale = fieldDiameter / 20;
    this.sunIndicator.scale.set(siScale, siScale, siScale);

    this.diffuseLight.setCount(
      getOrDefault(parameters.sensors.diffuseLightCount, 13)
    );
    this.diffuseLight.setViewSize(fieldDiameter);
    this.diffuseLight.setRenderSize(renderSize);
    this.diffuseLightIndicator.setLight(this.diffuseLight, 0.8 * fieldDiameter);

    while (this.trees.length) {
      this.trees.pop().dispose();
    }

    const treeMaterial = new MeshBasicMaterial({
      color: TREE_COLOR,
    });
    for (const treeParameters of parameters.trees) {
      (async () => {
        const tree = await this.treeStore.loadTree(
          {
            ...treeParameters,
            leafColor: LEAF_COLOR,
          },
          treeMaterial.clone()
        );
        const [x, y] = treeParameters.position;
        tree.position.set(x, 0, y);
        tree.setRotationFromAxisAngle(inclinationAxis, -inclination);
        tree.rotateY(d2r(getOrDefault(treeParameters.rotation, 0)));
        const scale = treeParameters.scale;
        tree.scale.set(scale, scale, scale);
        this.trees.push(tree);
        this.ground.add(tree);
      })();
    }
  }

  setGrowth(growth: number) {
    this.trees.forEach((tree) => {
      tree.setGrowth(growth);
    });
  }

  isNight() {
    const target = new Vector3(-1, 0, 0);
    this.sun.updateWorldMatrix(true, false);
    target.applyMatrix4(this.sun.matrixWorld);

    this.ground.updateWorldMatrix(true, false);
    const plane = new Plane(new Vector3(0, 1, 0));
    plane.applyMatrix4(this.ground.matrixWorld);

    return plane.distanceToPoint(target) < 0;
  }

  calculateYear(
    stepSize: number,
    leafGrowth: number[],
    settings: RenderSettings = {}
  ) {
    const sunlight: any = [["day", "time (s)", this.sensors.names]];
    const diffuseLight: any = [["day", this.sensors.names]];
    this.progress("Calculating light", 0);
    for (const day of range(0, 366)) {
      this.setSettings(settings);
      this.setGrowth(leafGrowth[day]);
      this.indicatorsVisible = false;

      for (const time of range(0, 24 * 60 * 60, stepSize)) {
        this.sun.setSeconds(24 * 60 * 60 * day + time);

        sunlight.push([
          day,
          time,
          this.isNight()
            ? [...constant(0, this.photosynthesis.idCount)]
            : this.photosynthesis.calculate(this.scene, [this.sunlight]),
        ]);
      }

      diffuseLight.push([
        day,
        this.photosynthesis.calculate(this.scene, [this.diffuseLight]),
      ]);

      this.progress("Calculating light", day / 356);
    }
    return [sunlight, diffuseLight];
  }

  calculateMoment(
    time: number,
    day: number,
    leafGrowth: number,
    settings: RenderSettings = {}
  ) {
    const data: any = [
      [`${day}d:${time}h - ${leafGrowth.toFixed(1)}%`, ...this.sensors.names],
    ];
    data.push(["sunlight"]);
    data.push(["diffuse light"]);
    this.progress("Calculating light", 0);

    this.sun.setSeconds(60 * 60 * (24 * day + time));
    this.setSettings(settings);
    this.setGrowth(leafGrowth);
    this.indicatorsVisible = false;

    data[1].push(...this.photosynthesis.calculate(this.scene, [this.sunlight]));

    data[2].push(
      ...this.photosynthesis.calculate(this.scene, [this.diffuseLight])
    );

    return data;
  }

  set indicatorsVisible(visible: boolean) {
    this.diffuseLightIndicator.visible = visible;
    this.sunIndicator.visible = visible;
    this.compass.visible = visible;
  }

  render(settings: RenderSettings = {}) {
    this.setSettings(settings);

    if (this.isNight()) {
      this.scene.background = new Color(0.2, 0.2, 0.2);
    } else {
      this.scene.background = new Color(0.9, 0.9, 0.9);
    }

    this.indicatorsVisible = true;
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.render(this.scene, this.camera);

    /*{
      this.indicatorsVisible = false;
      this.photosynthesis.calculate(this.scene, [this.sunlight]);

      this.drawTexture(this.sunlight.target.texture);
    }*/
  }
}

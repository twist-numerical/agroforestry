import {
  Color,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  RedFormat,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { range } from "../functional";
import DiffuseLight from "../photosynthesis/DiffuseLight";
import LidarTree from "../photosynthesis/LidarTree";
import Photosynthesis from "../photosynthesis/Photosynthesis";
import SensorGrid from "../photosynthesis/SensorGrid";
import Sun from "../photosynthesis/Sun";
import Sunlight from "../photosynthesis/Sunlight";

export type RenderSettings = {
  latitude?: number;
  seconds?: number;
  leafGrowth?: number;
  leafWidth?: number;
  leafLength?: number;
  camera?: number[];
  display?: {
    diffuseLight?: boolean;
  };
};

export type FieldParameters = {
  field: {
    size: number;
    latitude: number;
    rotation?: number;
    inclination?: number;
    inclinationRotation?: number;
  };
  trees: {
    position: [number, number];
    leaves?: boolean;
    leafLength?: number;
    leafWidth?: number;
    leavesPerTwig?: number;
    maxTwigRadius?: number;
  }[];
  sensors: {
    size: [number, number];
    count: [number, number];
    renderSize?: number;
  };
};

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
  sensors: SensorGrid;
  renderer: WebGLRenderer;
  photosynthesis: Photosynthesis;
  field = new Group();
  sunlight = new Sunlight(1, 1);
  camera = new PerspectiveCamera(45, 1, 1, 10000);
  diffuseLight = new DiffuseLight(51, 1, 1);
  sunIndicator = new Mesh(
    new SphereGeometry(1, 21, 11),
    new MeshBasicMaterial({ color: "yellow" })
  );
  width: number = 300;
  height: number = 300;
  progress: (message: string, value: number) => void;
  progressDone: () => void;
  drawViewOfSun: () => void;
  trees: LidarTree[] = [];
  treeGroup = new Group();

  constructor(
    canvas: HTMLCanvasElement,
    progress: (message: string, value: number) => void,
    progressDone: () => void
  ) {
    this.progress = progress;
    this.progressDone = progressDone;
    this.renderer = new WebGLRenderer({ canvas });
    this.photosynthesis = new Photosynthesis(this.renderer);
    this.field.add(this.ground);
    this.scene.add(this.field);
    this.scene.add(this.camera);
    this.camera.matrixAutoUpdate = false;

    this.sunlight.lookAt(new Vector3(1, 0, 0));
    this.sunIndicator.position.set(-10, 0, 0);
    this.sun.add(this.sunlight);
    this.sun.add(this.sunIndicator);
    this.scene.add(this.sun);

    this.drawViewOfSun = (() => {
      const scene = new Scene();
      const planeMaterial = new MeshBasicMaterial();
      const plane = new Mesh(new PlaneGeometry(2, 2), planeMaterial);
      plane.scale.set(-1, 1, 1);
      scene.add(plane);
      const camera = new OrthographicCamera(-1, 1, -1, 1, -1, 1);
      camera.lookAt(0, 0, 1);
      return () => {
        planeMaterial.map = this.sunlight.target.texture;
        //    if (this.photosynthesis.summaryTarget) {
        //  planeMaterial.map = this.photosynthesis.summaryTarget.texture;
        this.renderer.render(scene, camera);
        //  }
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

  setSettings({ latitude, seconds, leafGrowth, camera }: RenderSettings) {
    if (latitude !== undefined) this.sun.setLatitude(latitude);
    if (seconds !== undefined) this.sun.setSeconds(seconds);
    if (leafGrowth !== undefined) this.setGrowth(leafGrowth);
    if (camera !== undefined) {
      this.camera.matrix.fromArray(camera);
      this.camera.matrixWorldNeedsUpdate = true;
    }
  }

  loadField(parameters: FieldParameters) {
    this.field.rotation.set(0, parameters.field.rotation || 0, 0);

    this.ground.geometry.dispose();
    this.ground.geometry = new PlaneGeometry(
      parameters.field.size,
      parameters.field.size
    );
    this.ground.geometry.applyMatrix4(new Matrix4().makeRotationX(Math.PI / 2));

    this.photosynthesis.clear();

    if (this.sensors) {
      this.sensors.dispose();
      this.ground.clear();
    }
    this.sensors = new SensorGrid(
      this.photosynthesis,
      ...parameters.sensors.count,
      ...parameters.sensors.size
    );
    this.sensors.position.set(0, 0.1, 0);
    this.ground.add(this.sensors);

    const inclinationRotation = parameters.field.inclinationRotation || 0;
    this.ground.setRotationFromAxisAngle(
      new Vector3(
        Math.sin(inclinationRotation),
        0,
        -Math.cos(inclinationRotation)
      ),
      parameters.field.inclination || 0
    );

    this.sunlight.setViewSize(1.5 * parameters.field.size);
    this.sunlight.setRenderSize(parameters.sensors.renderSize || 1024);

    this.diffuseLight.setViewSize(1.5 * parameters.field.size);
    this.diffuseLight.setRenderSize(parameters.sensors.renderSize || 1024);

    this.treeGroup.clear();
    while (this.trees.length) this.trees.pop().dispose();

    const treeMaterial = new MeshBasicMaterial({
      color: new Color("brown"),
    });
    for (const treeParameters of parameters.trees) {
      const tree = new LidarTree(treeMaterial, {
        leaves:
          treeParameters.leavesPerTwig !== undefined ||
          treeParameters.leafLength !== undefined ||
          treeParameters.leafWidth !== undefined,
        ...treeParameters,
      });
      const [x, y] = treeParameters.position;
      tree.position.set(x, 0, y);
      tree.rotation.set(0, Math.PI * 2 * Math.random(), 0);
      this.trees.push(tree);
      this.field.add(tree);
    }
  }

  setGrowth(growth: number) {
    this.trees.forEach((tree) => {
      tree.setGrowth(growth);
    });
  }

  calculateSunlight(settings: RenderSettings = {}) {
    this.setSettings(settings);
    this.sunIndicator.visible = false;
    // this.diffuseIndicator.visible = false;
    return this.photosynthesis.calculate(this.scene, [this.sunlight]);
  }

  calculateYear(stepSize: number, settings: RenderSettings = {}) {
    const results = [];
    this.progress("Calculating full year", 0);
    for (const day of range(0, 366)) {
      this.setSettings(settings);
      this.sunIndicator.visible = false;

      for (const time of range(0, 24 * 60 * 60, stepSize)) {
        const timestamp = 24 * 60 * 60 * day + time;
        this.sun.setSeconds(timestamp);

        if (!this.sun.isNight()) {
          results.push([
            timestamp,
            this.photosynthesis.calculate(this.scene, [this.sunlight]),
          ]);
        }
      }
      this.progress("Calculating full year", day / 355);
    }
    this.progressDone();
    return results;
  }

  render(settings: RenderSettings = {}) {
    this.setSettings(settings);

    if (this.sun.isNight()) {
      this.scene.background = new Color(0.2, 0.2, 0.2);
    } else {
      this.scene.background = new Color(0.9, 0.9, 0.9);
    }

    this.sunIndicator.visible = true;
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.render(this.scene, this.camera);

    /* {
      this.renderer.setScissorTest(true);
      const size = 300;
      this.renderer.setScissor(0, 0, size, size);
      this.renderer.setViewport(0, 0, size, size);
      this.drawViewOfSun();
    } */
  }
}

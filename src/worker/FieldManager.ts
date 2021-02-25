import {
  Color,
  DoubleSide,
  Group,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  Plane,
  PlaneGeometry,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import { constant, map, range } from "../util";
import DiffuseLight from "../photosynthesis/DiffuseLight";
import LidarTree from "../photosynthesis/LidarTree";
import Photosynthesis from "../photosynthesis/Photosynthesis";
import SensorGrid from "../photosynthesis/SensorGrid";
import Sun from "../photosynthesis/Sun";
import Sunlight from "../photosynthesis/Sunlight";
import { DiffuseLightIndicator } from "../photosynthesis/DiffuseLightIndicator";

function d2r(d: number): number {
  return (d * Math.PI) / 180;
}

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

function getOrDefault<T>(value: T | undefined, def: T) {
  if (value === undefined) return def;
  return value;
}

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
    diffuseLightCount?: number;
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
  diffuseLight = new DiffuseLight(1, 1, 1);
  diffuseLightIndicator = new DiffuseLightIndicator();
  sunIndicator = new Mesh(
    new SphereGeometry(1, 21, 11),
    new MeshBasicMaterial({ color: "yellow" })
  );
  width: number = 300;
  height: number = 300;
  progress: (message: string, value: number) => void;
  drawViewOfSun: () => void;
  trees: LidarTree[] = [];
  treeGroup = new Group();

  constructor(
    canvas: HTMLCanvasElement,
    progress: (message: string, value: number) => void
  ) {
    this.progress = progress;
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

    this.diffuseLight.add(this.diffuseLightIndicator);

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
        this.photosynthesis.calculate(this.scene, [this.diffuseLight]);
        planeMaterial.map = this.diffuseLight.target.texture;
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

  setSettings({ seconds, leafGrowth, camera }: RenderSettings) {
    if (seconds !== undefined) this.sun.setSeconds(seconds);
    if (leafGrowth !== undefined) this.setGrowth(leafGrowth);
    if (camera !== undefined) {
      this.camera.matrix.fromArray(camera);
      this.camera.matrixWorldNeedsUpdate = true;
    }
  }

  loadField(parameters: FieldParameters) {
    this.field.rotation.set(0, d2r(parameters.field.rotation) || 0, 0);

    this.ground.geometry.dispose();
    this.ground.geometry = new PlaneGeometry(
      parameters.field.size,
      parameters.field.size
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

    const inclinationRotation = d2r(parameters.field.inclinationRotation) || 0;
    this.ground.setRotationFromAxisAngle(
      new Vector3(
        Math.sin(inclinationRotation),
        0,
        -Math.cos(inclinationRotation)
      ),
      d2r(parameters.field.inclination) || 0
    );

    const renderSize = getOrDefault(parameters.sensors.renderSize, 1024);
    this.sun.setLatitude(getOrDefault(parameters.field.latitude, 10));
    this.sunlight.setViewSize(1.5 * parameters.field.size);
    this.sunlight.setRenderSize(renderSize);

    this.diffuseLight.setCount(
      getOrDefault(parameters.sensors.diffuseLightCount, 13)
    );
    this.diffuseLight.setViewSize(1.5 * parameters.field.size);
    this.diffuseLight.setRenderSize(renderSize);
    this.diffuseLightIndicator.setLight(this.diffuseLight);

    this.treeGroup.clear();
    while (this.trees.length) {
      const tree = this.trees.pop();
      this.field.remove(tree);
      tree.dispose();
    }

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

  isNight() {
    const target = new Vector3(-1, 0, 0);
    this.sun.updateWorldMatrix(true, false);
    target.applyMatrix4(this.sun.matrixWorld);

    this.ground.updateWorldMatrix(true, false);
    const plane = new Plane(new Vector3(0, 1, 0));
    plane.applyMatrix4(this.ground.matrixWorld);

    return plane.distanceToPoint(target) < 0;
  }

  calculateLight(
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
    console.log(sunlight);
    return [sunlight, diffuseLight];
  }

  set indicatorsVisible(visible: boolean) {
    this.diffuseLightIndicator.visible = visible;
    this.sunIndicator.visible = visible;
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

    /* {
      this.renderer.setScissorTest(true);
      const size = 300;
      this.renderer.setScissor(0, 0, size, size);
      this.renderer.setViewport(0, 0, size, size);
      this.drawViewOfSun();
    } */
  }
}

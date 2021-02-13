import {
  Color,
  Material,
  Mesh,
  MeshBasicMaterial,
  Scene,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import * as THREE from "three";
import Summarizer from "./Summarizer";
import UVLight from "./UVLight";

const black = new Color("black");

export default class Photosynthesis {
  renderer: WebGLRenderer;
  summarizer: Summarizer;

  constructor(renderer: WebGLRenderer) {
    this.renderer = renderer;
    this.summarizer = new Summarizer(renderer, []);
  }

  calculate(scene: Scene, lights: UVLight[]) {
    const updateMaterial: any[] = [];
    const ids = new Set<number>();
    scene.traverseVisible((obj) => {
      if (obj instanceof Mesh && obj.material) {
        (obj as any).photosynthesisOldMaterial = obj.material;
        updateMaterial.push(obj);
        if ((obj as any).photosynthesisID !== undefined)
          ids.add((obj as any).photosynthesisID);
      }
    });
    this.summarizer.setIDs(Array.from(ids));

    const background = scene.background;
    scene.background = black;

    lights.forEach((light) => {
      updateMaterial.forEach((obj) => {
        obj.material = obj.photosynthesisID
          ? light.getCachedMaterial(obj.photosynthesisID)
          : light.blackMaterial;
      });

      light.render(this.renderer, scene, this.summarizer);
    });

    scene.background = background;

    updateMaterial.forEach((obj) => {
      obj.material = obj.photosynthesisOldMaterial;
    });

    this.summarizer.endTimestep();
    this.renderer.setRenderTarget(null);
    return this.summarizer;
  }
}

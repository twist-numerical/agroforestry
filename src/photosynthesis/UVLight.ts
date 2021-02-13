import {
  Object3D,
  MeshBasicMaterial,
  Color,
  Material,
  Scene,
  WebGLRenderer,
} from "three";
import * as THREE from "three";
import Photosynthesis from "./Photosynthesis";

export default abstract class UVLight extends Object3D {
  abstract render(
    renderer: WebGLRenderer,
    scene: Scene,
    photosynthesis: Photosynthesis
  ): void;
}

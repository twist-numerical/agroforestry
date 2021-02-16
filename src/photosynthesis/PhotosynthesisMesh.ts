import Photosynthesis from "./Photosynthesis";

export default interface PhotosynthesisMesh {
  photosynthesis: Photosynthesis;
  prePhotosynthesis(): void;
  postPhotosynthesis(): void;
  blackPhotosynthesis(): void;
}

export function isPhotosynthesisMesh(object: any): object is PhotosynthesisMesh {
  return (
    "photosynthesis" in object &&
    "prePhotosynthesis" in object &&
    "postPhotosynthesis" in object &&
    "blackPhotosynthesis" in object
  );
}

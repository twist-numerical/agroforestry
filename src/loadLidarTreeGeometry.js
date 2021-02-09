import { BufferGeometry, Curve, Float32BufferAttribute, Vector3 } from "three";

export default async () => {
  const lidar = await import("./agroforestry.json");

  const offset = new Vector3(lidar[0], lidar[1], lidar[2]);
  const segments = [];
  for (let i = 0; i < lidar.length; i += 7) {
    segments.push({
      start: new Vector3(lidar[i + 0], lidar[i + 1], lidar[i + 2]).sub(offset),
      end: new Vector3(lidar[i + 3], lidar[i + 4], lidar[i + 5]).sub(offset),
      radius: lidar[i + 6],
    });
  }

  const frenetFrames = new (class extends Curve {
    getPoint(i, target = undefined) {
      if (target === undefined) target = new Vector3();
      const exact = i * (segments.length * 2 - 1);
      const index = Math.round(exact) >> 1;
      const segment = segments[index];

      return target.lerpVectors(segment.start, segment.end, exact - index * 2);
    }
  })().computeFrenetFrames(segments.length * 2 - 1, false);

  return class LidarTreeGeometry extends BufferGeometry {
    constructor(radialSegments = 7) {
      const rs = radialSegments;
      const vertices = [];
      const indices = [];
      const normals = [];

      const ringPoints = [];
      for (let i = 0; i < rs; ++i) {
        const angle = (i / rs) * Math.PI * 2;
        ringPoints.push([Math.cos(angle), Math.sin(angle)]);
      }

      const addRing = (frameIndex) => {
        const segment = segments[frameIndex >> 1];
        const radius = segment.radius;
        const middle = segment[frameIndex % 2 == 0 ? "start" : "end"];
        const normal = frenetFrames.normals[frameIndex];
        const binormal = frenetFrames.binormals[frameIndex];
        const tangent = frenetFrames.tangents[frameIndex];

        vertices.push(middle.x, middle.y, middle.z);
        if (frameIndex % 2 == 0)
          normals.push(-tangent.x, -tangent.y, -tangent.z);
        else normals.push(tangent.x, tangent.y, tangent.z);

        for (const [x, y] of ringPoints) {
          const nx = normal.x * x + binormal.x * y;
          const ny = normal.y * x + binormal.y * y;
          const nz = normal.z * x + binormal.z * y;
          vertices.push(
            middle.x + nx * radius,
            middle.y + ny * radius,
            middle.z + nz * radius
          );
          normals.push(nx, ny, nz);
        }
      };

      for (
        let frameIndex = 0;
        frameIndex < segments.length * 2;
        frameIndex += 2
      ) {
        const vertexStart = vertices.length / 3;
        addRing(frameIndex);
        addRing(frameIndex + 1);

        for (let i = 0; i < rs; ++i) {
          const la = vertexStart + i + 1;
          const lb = vertexStart + ((i + 1) % rs) + 1;
          const ua = vertexStart + i + rs + 2;
          const ub = vertexStart + ((i + 1) % rs) + rs + 2;
          indices.push(vertexStart, lb, la);
          indices.push(vertexStart + rs + 1, ua, ub);
          indices.push(la, lb, ua);
          indices.push(lb, ub, ua);
        }
      }

      super();
      this.setIndex(indices);
      this.setAttribute("position", new Float32BufferAttribute(vertices, 3));
      this.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    }
  };
};

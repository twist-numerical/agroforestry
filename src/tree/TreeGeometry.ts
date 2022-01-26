import { BufferAttribute, BufferGeometry, Matrix4, Vector3 } from "three";

export type TreeSegment = { start: Vector3; end: Vector3; radius: number };

export default class TreeGeometry extends BufferGeometry {
  readonly segments: { start: Vector3; end: Vector3; radius: number }[];
  readonly height: number;

  constructor(
    segments: { start: Vector3; end: Vector3; radius: number }[],
    radialSegments = 7
  ) {
    super();
    this.segments = segments;

    const cylinderPositions: Vector3[] = [];
    const cylinderIndex: number[] = [];

    for (let i = 0; i < radialSegments; ++i) {
      const a = ((Math.PI * 2) / radialSegments) * i;
      const sa = Math.sin(a);
      const ca = Math.cos(a);
      cylinderPositions.push(new Vector3(ca, sa, 0));

      cylinderIndex.push(
        i % radialSegments,
        (i + 1) % radialSegments,
        radialSegments + ((i + 1) % radialSegments),
        i % radialSegments,
        radialSegments + ((i + 1) % radialSegments),
        radialSegments + (i % radialSegments)
      );
    }
    for (let i = 0; i < radialSegments; ++i) {
      const c = cylinderPositions[i].clone();
      c.z = 1;
      cylinderPositions.push(c);
    }

    for (let i = 1; i < radialSegments - 1; ++i) {
      cylinderIndex.push(0, i + 1, i);
      cylinderIndex.push(
        radialSegments,
        radialSegments + i,
        radialSegments + i + 1
      );
    }

    let i = 0;
    const position = new Float32Array(2 * 3 * radialSegments * segments.length);
    const index: number[] = [];

    const vec = new Vector3();
    const scale = new Vector3();
    const mat = new Matrix4();
    const up = new Vector3(0, 0, -1);

    const addSegment = (start: Vector3, end: Vector3, radius: number) => {
      mat.lookAt(end, start, up);
      mat.setPosition(start);
      mat.scale(scale.set(radius, radius, start.distanceTo(end)));
      const j = i / 3;
      cylinderPositions.forEach((p) => {
        vec
          .copy(p)
          .applyMatrix4(mat)
          .toArray(position, i);
        i += 3;
      });
      cylinderIndex.forEach((k) => {
        index.push(j + k);
      });
    };

    segments.forEach((s) => addSegment(s.start, s.end, s.radius));
    this.height = segments
      .map(({ start, end }) => Math.max(start.y, end.y))
      .reduce((a, b) => Math.max(a, b));

    this.setAttribute("position", new BufferAttribute(position, 3));
    this.setIndex(index);
  }

  static async readFromCSV(filePath: string): Promise<TreeGeometry> {
    const csv = (await (await fetch(filePath)).text())
      .split(/\s+/)
      .map((a) => parseFloat(a));

    const segments: TreeSegment[] = [];
    for (let i = 0; i + 6 < csv.length; i += 7) {
      segments.push({
        start: new Vector3(csv[i + 3], csv[i + 5], csv[i + 4]),
        end: new Vector3(csv[i + 0], csv[i + 2], csv[i + 1]),
        radius: csv[i + 6],
      });
    }
    const offset = segments[0].start.clone();
    segments.forEach((v) => {
      v.start.sub(offset);
      v.end.sub(offset);
    });

    return new TreeGeometry(segments);
  }
}

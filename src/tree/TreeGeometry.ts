import { BufferAttribute, BufferGeometry, Matrix4, Vector3 } from "three";

export type TreeSegment = { start: Vector3; end: Vector3; radius: number };

function centerSegments(segments: TreeSegment[]): void {
  const f = (a: Vector3, b: Vector3) => (a.y < b.y ? a : b);
  const lowest = segments
    .map(({ start, end }) => f(start, end))
    .reduce(f, new Vector3(0, Infinity, 0))
    .clone();

  segments.forEach((s) => {
    s.start.sub(lowest);
    s.end.sub(lowest);
  });
}

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
      .reduce((a, b) => Math.max(a, b), -Infinity);

    this.setAttribute("position", new BufferAttribute(position, 3));
    this.setIndex(index);
  }

  asBuffer(): ArrayBuffer {
    const data = new Float32Array(this.segments.length * 7);
    this.segments.forEach((segment, i) => {
      segment.start.toArray(data, 7 * i);
      segment.end.toArray(data, 7 * i + 3);
      data[7 * i + 6] = segment.radius;
    });
    return data.buffer;
  }

  static fromBuffer(buffer: ArrayBuffer) {
    const data = new Float32Array(buffer);
    const segments: TreeSegment[] = [];

    for (let i = 0; i + 6 < data.length; i += 7) {
      segments.push({
        start: new Vector3().fromArray(data, i),
        end: new Vector3().fromArray(data, i + 3),
        radius: data[i + 6],
      });
    }

    return new TreeGeometry(segments);
  }

  static parseCSV(csvString: string): TreeGeometry {
    const csv = csvString.split(/\s+/).map((a) => parseFloat(a));

    const segments: TreeSegment[] = [];
    for (let i = 0; i + 6 < csv.length; i += 7) {
      segments.push({
        start: new Vector3(csv[i + 3], csv[i + 5], csv[i + 4]),
        end: new Vector3(csv[i + 0], csv[i + 2], csv[i + 1]),
        radius: csv[i + 6],
      });
    }

    centerSegments(segments);

    return new TreeGeometry(segments);
  }

  static parseOBJ(obj: string): TreeGeometry {
    const unknown = new Set();
    const segments: TreeSegment[] = [];
    const vertices: Vector3[] = [];
    obj.split(/[\n\r]+/).forEach((line) => {
      if (line.match(/^v\s+/i)) {
        const [_, x, y, z] = line.split(/\s+/g, 4);
        vertices.push(new Vector3(+x, +z, +y));
      } else if (line.match(/^ccyl\s+/i)) {
        const [_, si, sj, sr] = line.split(/\s+/g, 4);
        let [i, j] = [+si, +sj];
        if (i < 0) i += vertices.length;
        if (j < 0) j += vertices.length;
        segments.push({
          start: vertices[i],
          end: vertices[j],
          radius: +sr,
        });
      } else if (line.match(/^[#!]/i)) {
      } else {
        unknown.add(line.split(/\s/, 1)[0]);
      }
    });

    centerSegments(segments);

    console.warn("Unknown lines in obj: " + [...unknown].join(", "));
    if (segments.length == 0) console.warn("No segments found in obj.");
    return new TreeGeometry(segments);
  }

  boundingCylinder(): { radius: number; ymin: number; ymax: number } {
    let radius = 0;
    let ymin = Infinity;
    let ymax = -Infinity;

    this.segments.forEach((segment) => {
      [segment.start, segment.end].forEach((v) => {
        if (!isNaN(v.x) && !isNaN(v.z)) {
          radius = Math.max(radius, Math.hypot(v.x, v.z) + segment.radius);
        }
        if (!isNaN(v.y)) {
          ymin = Math.min(ymin, v.y);
          ymax = Math.max(ymax, v.y);
        }
      });
    });

    radius *= 1.05;
    ymax += (ymax - ymin) * 0.05;
    ymin -= (ymax - ymin) * 0.05;

    return { radius, ymin, ymax };
  }
}

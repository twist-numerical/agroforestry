export type Progress = {
  value: number;
  message: string;
  done: boolean;
};

function now() {
  return (performance || Date).now();
}

export class Buffer {
  private __data: Float32Array;
  private __bufferLength: number;
  private __bufferIndex: number = 0;

  constructor(bufferLength: number) {
    this.__bufferLength = bufferLength;
    this.__data = new Float32Array(bufferLength);
  }

  add(value: number) {
    this.__data[this.__bufferIndex] = value;
    this.__data[this.__bufferIndex + this.__bufferLength] = value;
    if (++this.__bufferIndex >= this.__bufferLength)
      this.__bufferIndex -= this.__bufferLength;
  }

  get data(): Float32Array {
    return this.__data.subarray(
      this.__bufferIndex,
      this.__bufferIndex + this.__bufferLength
    );
  }
}

export default class Statistics {
  progress: Progress = {
    value: 0,
    message: "",
    done: true,
  };
  private fps: Buffer;
  private msPerFrame: Buffer;
  private __startTime: number;
  private __prevFrameTime: number = 0;
  private __frames: number = 0;

  constructor(bufferLength: number) {
    this.fps = new Buffer(bufferLength);
    this.msPerFrame = new Buffer(bufferLength);
  }

  beginFrame() {
    this.__startTime = now();
  }

  endFrame() {
    const time = now();
    this.msPerFrame.add(time - this.__startTime);

    ++this.__frames;
    if (time > this.__prevFrameTime + 1000) {
      this.fps.add((this.__frames * 1000) / (time - this.__prevFrameTime));
      this.__frames = 0;
      this.__prevFrameTime = time;
    }
  }
}

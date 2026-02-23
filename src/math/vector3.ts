// S:\Git\descent\editor\node_modules\three\src\math\Vector3.js

import Matrix4 from "./matrix4";
import Quaternion from "./quaternion";

export type Vector3Tuple = [number, number, number];

class Vector3 {
  #elements: Float32Array;

  get x() { return this.#elements[0]; }
  set x(value: number) { this.#elements[0] = value; }

  get y() { return this.#elements[1]; }
  set y(value: number) { this.#elements[1] = value; }

  get z() { return this.#elements[2]; }
  set z(value: number) { this.#elements[2] = value; }

  constructor();
  constructor(x: number, y: number, z: number);
  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.#elements = new Float32Array([x, y, z]);
  }

  set(vector: Vector3): Vector3;
  set(x: number, y: number, z: number): Vector3;
  set(vectorOrX: number | Vector3, y?: number, z?: number): Vector3 {
    if (vectorOrX instanceof Vector3) {
      this.#elements.set(vectorOrX.#elements);
    } else {
      this.#elements.set([vectorOrX, y!, z!]);
    }

    return this;
  }

  setScalar(scalar: number): Vector3 {
    this.#elements.set([scalar, scalar, scalar]);

    return this;
  }

  setX(x: number): Vector3 {
    this.#elements[0] = x;

    return this;
  }

  setY(y: number): Vector3 {
    this.#elements[1] = y;

    return this;
  }

  setZ(z: number): Vector3 {
    this.#elements[2] = z;

    return this;
  }

  getComponent(index: 0 | 1 | 2): number {
    return this.#elements[index];
  }

  setComponent(index: 0 | 1 | 2, value: number): Vector3 {
    this.#elements[index] = value;

    return this;
  }

  clone(): Vector3 {
    return new Vector3(this.#elements[0], this.#elements[1], this.#elements[2]);
  }

  copy(v: Vector3): Vector3 {
    this.#elements.set(v.#elements);

    return this;
  }

  add(v: Vector3): Vector3 {
    this.#elements[0] += v.#elements[0];
    this.#elements[1] += v.#elements[1];
    this.#elements[2] += v.#elements[2];

    return this;
  }

  addScalar(scalar: number): Vector3 {
    this.#elements[0] += scalar;
    this.#elements[1] += scalar;
    this.#elements[2] += scalar;

    return this;
  }

  addVectors(a: Vector3, b: Vector3): Vector3 {
    this.#elements[0] = a.#elements[0] + b.#elements[0];
    this.#elements[1] = a.#elements[1] + b.#elements[1];
    this.#elements[2] = a.#elements[2] + b.#elements[2];

    return this;
  }

  addScaledVector(v: Vector3, scale: number): Vector3 {
    this.#elements[0] += v.#elements[0] * scale;
    this.#elements[1] += v.#elements[1] * scale;
    this.#elements[2] += v.#elements[2] * scale;

    return this;
  }

  sub(v: Vector3): Vector3 {
    this.#elements[0] -= v.#elements[0];
    this.#elements[1] -= v.#elements[1];
    this.#elements[2] -= v.#elements[2];

    return this;
  }

  subScalar(scalar: number): Vector3 {
    this.#elements[0] -= scalar;
    this.#elements[1] -= scalar;
    this.#elements[2] -= scalar;

    return this;
  }

  subVectors(a: Vector3, b: Vector3): Vector3 {
    this.#elements[0] = a.#elements[0] - b.#elements[0];
    this.#elements[1] = a.#elements[1] - b.#elements[1];
    this.#elements[2] = a.#elements[2] - b.#elements[2];

    return this;
  }

  multiply(v: Vector3): Vector3 {
    this.#elements[0] *= v.#elements[0];
    this.#elements[1] *= v.#elements[1];
    this.#elements[2] *= v.#elements[2];

    return this;
  }

  multiplyScalar(scalar: number): Vector3 {
    this.#elements[0] *= scalar;
    this.#elements[1] *= scalar;
    this.#elements[2] *= scalar;

    return this;
  }

  multiplyVectors(a: Vector3, b: Vector3): Vector3 {
    this.#elements[0] = a.#elements[0] * b.#elements[0];
    this.#elements[1] = a.#elements[1] * b.#elements[1];
    this.#elements[2] = a.#elements[2] * b.#elements[2];

    return this;
  }

  divide(v: Vector3): Vector3 {
    this.#elements[0] /= v.#elements[0];
    this.#elements[1] /= v.#elements[1];
    this.#elements[2] /= v.#elements[2];

    return this;
  }

  divideScalar(scalar: number): Vector3 {
    return this.multiplyScalar(1 / scalar);
  }

  applyMatrix4(m: Matrix4): Vector3 {
    const [x, y, z] = this.#elements;
    const w = 1 / (m.m41 * x + m.m42 * y + m.m43 * z + m.m44);

    this.#elements[0] = (m.m11 * x + m.m12 * y + m.m13 * z + m.m14) * w;
    this.#elements[1] = (m.m21 * x + m.m22 * y + m.m23 * z + m.m23) * w;
    this.#elements[2] = (m.m31 * x + m.m32 * y + m.m33 * z + m.m34) * w;

    return this;
  }

  applyQuaternion(q: Quaternion): Vector3 {
    // Quaternion q is assumed to be normalized

    const [vx, vy, vz] = this.#elements;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

    // t = 2 * cross(q.xyz, v);
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);

    // v + q.w * t + cross(q.xyz, t);
    this.#elements[0] = vx + qw * tx + qy * tz - qz * ty;
    this.#elements[1] = vy + qw * ty + qz * tx - qx * tz;
    this.#elements[2] = vz + qw * tz + qx * ty - qy * tx;

    return this;
  }

  dot(v: Vector3): number {
    return (
      this.#elements[0] * v.#elements[0]
      + this.#elements[1] * v.#elements[1]
      + this.#elements[2] * v.#elements[2]
    );
  }

  lengthSq(): number {
    return (
      this.#elements[0] * this.#elements[0]
      + this.#elements[1] * this.#elements[1]
      + this.#elements[2] * this.#elements[2]
    );
  }

  length(): number {
    return Math.sqrt(
      this.#elements[0] * this.#elements[0]
      + this.#elements[1] * this.#elements[1]
      + this.#elements[2] * this.#elements[2],
    );
  }

  setLength(length: number): Vector3 {
    return this.normalize().multiplyScalar(length);
  }

  normalize(): Vector3 {
    return this.divideScalar(this.length() || 1);
  }

  cross(v: Vector3): Vector3 {
    return this.crossVectors(this, v);
  }

  crossVectors(a: Vector3, b: Vector3): Vector3 {
    const ax = a.#elements[0], ay = a.#elements[1], az = a.#elements[2];
    const bx = b.#elements[0], by = b.#elements[1], bz = b.#elements[2];

    this.#elements[0] = ay * bz - az * by;
    this.#elements[1] = az * bx - ax * bz;
    this.#elements[2] = ax * by - ay * bx;

    return this;
  }

  equals(v: Vector3): boolean {
    return (
      v.#elements[0] === this.#elements[0]
      && v.#elements[1] === this.#elements[1]
      && v.#elements[2] === this.#elements[2]
    );
  }

  fromArray(array: ArrayLike<number>, offset = 0): Vector3 {
    this.#elements[0] = array[offset];
    this.#elements[1] = array[offset + 1];
    this.#elements[2] = array[offset + 2];

    return this;
  }

  toArray(array: number[] = [], offset = 0): number[] {
    array[offset] = this.#elements[0];
    array[offset + 1] = this.#elements[1];
    array[offset + 2] = this.#elements[2];

    return array;
  }

  *[Symbol.iterator]() {
    yield* this.#elements;
  }
}

export default Vector3;

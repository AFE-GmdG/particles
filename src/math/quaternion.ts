// S:\Git\descent\editor\node_modules\three\src\math\Quaternion.js

import Matrix4 from "./matrix4";
import Vector3 from "./vector3";

export type QuaternionTuple = [number, number, number, number];

class Quaternion {
  elements: Float32Array;

  get x() { return this.elements[0]; }
  set x(value: number) { this.elements[0] = value; }

  get y() { return this.elements[1]; }
  set y(value: number) { this.elements[1] = value; }

  get z() { return this.elements[2]; }
  set z(value: number) { this.elements[2] = value; }

  get w() { return this.elements[3]; }
  set w(value: number) { this.elements[3] = value; }

  constructor();
  constructor(x: number, y: number, z: number, w: number);
  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this.elements = new Float32Array([x, y, z, w]);
  }

  set(x: number, y: number, z: number, w: number): Quaternion {
    this.elements.set([x, y, z, w]);

    return this;
  }

  identity(): Quaternion {
    this.elements.set([0, 0, 0, 1]);

    return this;
  }

  clone(): Quaternion {
    return new Quaternion(this.elements[0], this.elements[1], this.elements[2], this.elements[3]);
  }

  copy(q: Quaternion): Quaternion {
    this.elements.set(q.elements);

    return this;
  }

  setFromAxisAngle(axis: Vector3, angle: number): Quaternion {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);

    this.elements[0] = axis.x * s;
    this.elements[1] = axis.y * s;
    this.elements[2] = axis.z * s;
    this.elements[3] = Math.cos(halfAngle);

    return this;
  }

  setFromRotationMatrix(m: Matrix4): Quaternion {
    const m11 = m.m11, m12 = m.m12, m13 = m.m13;
    const m21 = m.m21, m22 = m.m22, m23 = m.m23;
    const m31 = m.m31, m32 = m.m32, m33 = m.m33;

    const trace = m11 + m22 + m33;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);

      this.elements[3] = 0.25 / s;
      this.elements[0] = (m32 - m23) * s;
      this.elements[1] = (m13 - m31) * s;
      this.elements[2] = (m21 - m12) * s;
    } else if (m11 > m22 && m11 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33);

      this.elements[3] = (m32 - m23) / s;
      this.elements[0] = 0.25 * s;
      this.elements[1] = (m12 + m21) / s;
      this.elements[2] = (m13 + m31) / s;
    } else if (m22 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33);

      this.elements[3] = (m13 - m31) / s;
      this.elements[0] = (m12 + m21) / s;
      this.elements[1] = 0.25 * s;
      this.elements[2] = (m23 + m32) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22);

      this.elements[3] = (m21 - m12) / s;
      this.elements[0] = (m13 + m31) / s;
      this.elements[1] = (m23 + m32) / s;
      this.elements[2] = 0.25 * s;
    }

    return this;
  }

  invert(): Quaternion {
    return this.conjugate();
  }

  conjugate(): Quaternion {
    this.elements[0] *= -1;
    this.elements[1] *= -1;
    this.elements[2] *= -1;

    return this;
  }

  dot(v: Quaternion): number {
    return (
      this.elements[0] * v.elements[0]
      + this.elements[1] * v.elements[1]
      + this.elements[2] * v.elements[2]
      + this.elements[3] * v.elements[3]
    );
  }

  lengthSq(): number {
    return (
      this.elements[0] * this.elements[0]
      + this.elements[1] * this.elements[1]
      + this.elements[2] * this.elements[2]
      + this.elements[3] * this.elements[3]
    );
  }

  length(): number {
    return Math.sqrt(
      this.elements[0] * this.elements[0]
      + this.elements[1] * this.elements[1]
      + this.elements[2] * this.elements[2]
      + this.elements[3] * this.elements[3],
    );
  }

  normalize(): Quaternion {
    const ls = this.lengthSq();

    if (ls === 0) {
      this.elements[0] = 0;
      this.elements[1] = 0;
      this.elements[2] = 0;
      this.elements[3] = 1;
    } else {
      const invL = 1 / Math.sqrt(ls);

      this.elements[0] *= invL;
      this.elements[1] *= invL;
      this.elements[2] *= invL;
      this.elements[3] *= invL;
    }

    return this;
  }

  multiply(q: Quaternion): Quaternion {
    return this.multiplyQuaternions(this, q);
  }

  premultiply(q: Quaternion): Quaternion {
    return this.multiplyQuaternions(q, this);
  }

  multiplyQuaternions(a: Quaternion, b: Quaternion): Quaternion {
    const qax = a.elements[0], qay = a.elements[1], qaz = a.elements[2], qaw = a.elements[3];
    const qbx = b.elements[0], qby = b.elements[1], qbz = b.elements[2], qbw = b.elements[3];

    this.elements[0] = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
    this.elements[1] = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
    this.elements[2] = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
    this.elements[3] = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

    return this;
  }

  equals(quaternion: Quaternion): boolean {
    return (
      quaternion.elements[0] === this.elements[0]
      && quaternion.elements[1] === this.elements[1]
      && quaternion.elements[2] === this.elements[2]
      && quaternion.elements[3] === this.elements[3]
    );
  }

  fromArray(array: ArrayLike<number>, offset = 0): Quaternion {
    this.elements[0] = array[offset];
    this.elements[1] = array[offset + 1];
    this.elements[2] = array[offset + 2];
    this.elements[3] = array[offset + 3];

    return this;
  }

  toArray(array: number[] = [], offset = 0): number[] {
    array[offset] = this.elements[0];
    array[offset + 1] = this.elements[1];
    array[offset + 2] = this.elements[2];
    array[offset + 3] = this.elements[3];

    return array;
  }

  *[Symbol.iterator]() {
    yield* this.elements;
  }
}

export default Quaternion;

// S:\Git\descent\editor\node_modules\three\src\math\Matrix4.js

import Quaternion from "./quaternion";
import Vector3 from "./vector3";

export type Matrix4Tuple = [
  n11: number,
  n12: number,
  n13: number,
  n14: number,
  n21: number,
  n22: number,
  n23: number,
  n24: number,
  n31: number,
  n32: number,
  n33: number,
  n34: number,
  n41: number,
  n42: number,
  n43: number,
  n44: number,
];

/**
 * Represents a 4x4 matrix.
 *
 * The most common use of a 4x4 matrix in 3D computer graphics is as a transformation matrix.
 * For an introduction to transformation matrices as used in WebGL, check out [this tutorial]{@link https://www.opengl-tutorial.org/beginners-tutorials/tutorial-3-matrices}
 *
 * This allows a 3D vector representing a point in 3D space to undergo
 * transformations such as translation, rotation, shear, scale, reflection,
 * orthogonal or perspective projection and so on, by being multiplied by the
 * matrix. This is known as `applying` the matrix to the vector.
 *
 * A Note on Row-Major and Column-Major Ordering:
 *
 * The constructor and {@link Matrix4#set} method take arguments in
 * [row-major]{@link https://en.wikipedia.org/wiki/Row-_and_column-major_order#Column-major_order}
 * order, while internally they are stored in the {@link Matrix4#elements} array in column-major order.
 * This means that calling:
 * ```js
 * const m = new THREE.Matrix4();
 * m.set( 11, 12, 13, 14,
 *        21, 22, 23, 24,
 *        31, 32, 33, 34,
 *        41, 42, 43, 44 );
 * ```
 * will result in the elements array containing:
 * ```js
 * m.elements = [ 11, 21, 31, 41,
 *                12, 22, 32, 42,
 *                13, 23, 33, 43,
 *                14, 24, 34, 44 ];
 * ```
 * and internally all calculations are performed using column-major ordering.
 * However, as the actual ordering makes no difference mathematically and
 * most people are used to thinking about matrices in row-major order, the
 * three.js documentation shows matrices in row-major order. Just bear in
 * mind that if you are reading the source code, you'll have to take the
 * transpose of any matrices outlined here to make sense of the calculations.
 */
class Matrix4 {
  #elements: Float32Array;

  get elements() { return this.#elements; }

  get m11() { return this.#elements[0]; }
  get m12() { return this.#elements[4]; }
  get m13() { return this.#elements[8]; }
  get m14() { return this.#elements[12]; }

  get m21() { return this.#elements[1]; }
  get m22() { return this.#elements[5]; }
  get m23() { return this.#elements[9]; }
  get m24() { return this.#elements[13]; }

  get m31() { return this.#elements[2]; }
  get m32() { return this.#elements[6]; }
  get m33() { return this.#elements[10]; }
  get m34() { return this.#elements[14]; }

  get m41() { return this.#elements[3]; }
  get m42() { return this.#elements[7]; }
  get m43() { return this.#elements[11]; }
  get m44() { return this.#elements[15]; }

  constructor();
  constructor(
    n11: number, n12: number, n13: number, n14: number,
    n21: number, n22: number, n23: number, n24: number,
    n31: number, n32: number, n33: number, n34: number,
    n41: number, n42: number, n43: number, n44: number,
  );
  constructor(
    n11?: number, n12?: number, n13?: number, n14?: number,
    n21?: number, n22?: number, n23?: number, n24?: number,
    n31?: number, n32?: number, n33?: number, n34?: number,
    n41?: number, n42?: number, n43?: number, n44?: number,
  ) {
    this.#elements = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);

    if (n11 !== undefined) {
      this.#elements.set([
        n11, n21!, n31!, n41!,
        n12!, n22!, n32!, n42!,
        n13!, n23!, n33!, n43!,
        n14!, n24!, n34!, n44!,
      ]);
    }
  }

  set(
    n11: number, n12: number, n13: number, n14: number,
    n21: number, n22: number, n23: number, n24: number,
    n31: number, n32: number, n33: number, n34: number,
    n41: number, n42: number, n43: number, n44: number,
  ): Matrix4 {
    this.#elements.set([
      n11, n21, n31, n41,
      n12, n22, n32, n42,
      n13, n23, n33, n43,
      n14, n24, n34, n44,
    ]);

    return this;
  }

  identity(): Matrix4 {
    this.#elements.set([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);

    return this;
  }

  clone(): Matrix4 {
    return new Matrix4().fromArray(this.#elements);
  }

  copy(m: Matrix4): Matrix4 {
    this.#elements.set(m.#elements);

    return this;
  }

  copyPosition(m: Matrix4): Matrix4 {
    this.#elements[12] = m.#elements[12];
    this.#elements[13] = m.#elements[13];
    this.#elements[14] = m.#elements[14];

    return this;
  }

  multiply(m: Matrix4): Matrix4 {
    return this.multiplyMatrices(this, m);
  }

  premultiply(m: Matrix4): Matrix4 {
    return this.multiplyMatrices(m, this);
  }

  multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4 {
    const a11 = a.#elements[0], a12 = a.#elements[4], a13 = a.#elements[8], a14 = a.#elements[12];
    const a21 = a.#elements[1], a22 = a.#elements[5], a23 = a.#elements[9], a24 = a.#elements[13];
    const a31 = a.#elements[2], a32 = a.#elements[6], a33 = a.#elements[10], a34 = a.#elements[14];
    const a41 = a.#elements[3], a42 = a.#elements[7], a43 = a.#elements[11], a44 = a.#elements[15];

    const b11 = b.#elements[0], b12 = b.#elements[4], b13 = b.#elements[8], b14 = b.#elements[12];
    const b21 = b.#elements[1], b22 = b.#elements[5], b23 = b.#elements[9], b24 = b.#elements[13];
    const b31 = b.#elements[2], b32 = b.#elements[6], b33 = b.#elements[10], b34 = b.#elements[14];
    const b41 = b.#elements[3], b42 = b.#elements[7], b43 = b.#elements[11], b44 = b.#elements[15];

    this.#elements[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    this.#elements[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    this.#elements[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    this.#elements[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

    this.#elements[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    this.#elements[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    this.#elements[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    this.#elements[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

    this.#elements[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    this.#elements[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    this.#elements[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    this.#elements[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

    this.#elements[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    this.#elements[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    this.#elements[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    this.#elements[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

    return this;
  }

  multiplyScalar(s: number): Matrix4 {
    this.#elements[0] *= s; this.#elements[4] *= s; this.#elements[8] *= s; this.#elements[12] *= s;
    this.#elements[1] *= s; this.#elements[5] *= s; this.#elements[9] *= s; this.#elements[13] *= s;
    this.#elements[2] *= s; this.#elements[6] *= s; this.#elements[10] *= s; this.#elements[14] *= s;
    this.#elements[3] *= s; this.#elements[7] *= s; this.#elements[11] *= s; this.#elements[15] *= s;

    return this;
  }

  determinant(): number {
    const n11 = this.#elements[0], n12 = this.#elements[4], n13 = this.#elements[8], n14 = this.#elements[12];
    const n21 = this.#elements[1], n22 = this.#elements[5], n23 = this.#elements[9], n24 = this.#elements[13];
    const n31 = this.#elements[2], n32 = this.#elements[6], n33 = this.#elements[10], n34 = this.#elements[14];
    const n41 = this.#elements[3], n42 = this.#elements[7], n43 = this.#elements[11], n44 = this.#elements[15];

    return (
      n41 * (
        n14 * n23 * n32
        - n13 * n24 * n32
        - n14 * n22 * n33
        + n12 * n24 * n33
        + n13 * n22 * n34
        - n12 * n23 * n34
      ) +
      n42 * (
        n11 * n23 * n34
        - n11 * n24 * n33
        + n14 * n21 * n33
        - n13 * n21 * n34
        + n13 * n24 * n31
        - n14 * n23 * n31
      ) +
      n43 * (
        n11 * n24 * n32
        - n11 * n22 * n34
        - n14 * n21 * n32
        + n12 * n21 * n34
        + n14 * n22 * n31
        - n12 * n24 * n31
      ) +
      n44 * (
        -n13 * n22 * n31
        - n11 * n23 * n32
        + n11 * n22 * n33
        + n13 * n21 * n32
        - n12 * n21 * n33
        + n12 * n23 * n31
      )
    );
  }

  transpose(): Matrix4 {
    let tmp: number;
    tmp = this.#elements[1]; this.#elements[1] = this.#elements[4]; this.#elements[4] = tmp;
    tmp = this.#elements[2]; this.#elements[2] = this.#elements[8]; this.#elements[8] = tmp;
    tmp = this.#elements[6]; this.#elements[6] = this.#elements[9]; this.#elements[9] = tmp;

    tmp = this.#elements[3]; this.#elements[3] = this.#elements[12]; this.#elements[12] = tmp;
    tmp = this.#elements[7]; this.#elements[7] = this.#elements[13]; this.#elements[13] = tmp;
    tmp = this.#elements[11]; this.#elements[11] = this.#elements[14]; this.#elements[14] = tmp;

    return this;
  }

  compose(position: Vector3, quaternion: Quaternion, scale: Vector3): Matrix4 {
    const x = quaternion.x, y = quaternion.y, z = quaternion.z, w = quaternion.w;
    const x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2;
    const yy = y * y2, yz = y * z2, zz = z * z2;
    const wx = w * x2, wy = w * y2, wz = w * z2;

    const sx = scale.x, sy = scale.y, sz = scale.z;

    this.#elements[0x0] = (1 - (yy + zz)) * sx;
    this.#elements[0x1] = (xy - wz) * sy;
    this.#elements[0x2] = (xz + wy) * sz;
    this.#elements[0x3] = position.x;

    this.#elements[0x4] = (xy + wz) * sx;
    this.#elements[0x5] = (1 - (xx + zz)) * sy;
    this.#elements[0x6] = (yz - wx) * sz;
    this.#elements[0x7] = position.y;

    this.#elements[0x8] = (xz - wy) * sx;
    this.#elements[0x9] = (yz + wx) * sy;
    this.#elements[0xa] = (1 - (xx + yy)) * sz;
    this.#elements[0xb] = position.z;

    this.#elements[0xc] = 0;
    this.#elements[0xd] = 0;
    this.#elements[0xe] = 0;
    this.#elements[0xf] = 1;

    return this;
  }

  equals(matrix: Matrix4): boolean {
    for (let i = 0; i < 16; i++) {
      if (matrix.#elements[i] !== this.#elements[i]) {
        return false;
      }
    }

    return true;
  }

  fromArray(array: ArrayLike<number>, offset = 0): Matrix4 {
    for (let i = 0; i < 16; i++) {
      this.#elements[i] = array[i + offset];
    }

    return this;
  }

  toArray(array: number[] = [], offset = 0): number[] {
    array[offset] = this.#elements[0];
    array[offset + 1] = this.#elements[1];
    array[offset + 2] = this.#elements[2];
    array[offset + 3] = this.#elements[3];

    array[offset + 4] = this.#elements[4];
    array[offset + 5] = this.#elements[5];
    array[offset + 6] = this.#elements[6];
    array[offset + 7] = this.#elements[7];

    array[offset + 8] = this.#elements[8];
    array[offset + 9] = this.#elements[9];
    array[offset + 10] = this.#elements[10];
    array[offset + 11] = this.#elements[11];

    array[offset + 12] = this.#elements[12];
    array[offset + 13] = this.#elements[13];
    array[offset + 14] = this.#elements[14];
    array[offset + 15] = this.#elements[15];

    return array;
  }

  *[Symbol.iterator]() {
    console.log("Matrix4: Symbol.iterator was called.");
    yield* this.#elements;
  }

  /**
   * Pretty-prints the matrix to the console.
   *
   * @param name The name of the matrix. If empty, only "Matrix 4x4" will be printed.
   *             If provided, it will be prefixed to "Matrix 4x4".
   * @param precision The number of decimal places to print. Default is 3.
   * @param asColumnMajor If true, prints the matrix in column-major order. Default is false (row-major order).
   *                      "(Column Major) or "(Row Major)" will be appended to the name.
   */
  prettyPrint(
    name: string = "",
    precision: number = 3,
    asColumnMajor: boolean = false,
  ) {
    const [
      xx, yx, zx, wx,
      xy, yy, zy, wy,
      xz, yz, zz, wz,
      xw, yw, zw, ww,
    ] = this.#elements;

    const sxx = xx.toFixed(precision); const sxy = xy.toFixed(precision); const sxz = xz.toFixed(precision); const sxw = xw.toFixed(precision);
    const syx = yx.toFixed(precision); const syy = yy.toFixed(precision); const syz = yz.toFixed(precision); const syw = yw.toFixed(precision);
    const szx = zx.toFixed(precision); const szy = zy.toFixed(precision); const szz = zz.toFixed(precision); const szw = zw.toFixed(precision);
    const swx = wx.toFixed(precision); const swy = wy.toFixed(precision); const swz = wz.toFixed(precision); const sww = ww.toFixed(precision);

    const maxLength = Math.max(
      sxx.length, sxy.length, sxz.length, sxw.length,
      syx.length, syy.length, syz.length, syw.length,
      szx.length, szy.length, szz.length, szw.length,
      swx.length, swy.length, swz.length, sww.length,
    );

    if (asColumnMajor) {
      console.log(
        `${name.trim().length ? `${name} ` : ""}Matrix 4x4 (Column Major):\n` +
        `| ${sxx.padStart(maxLength)} ${syx.padStart(maxLength)} ${szx.padStart(maxLength)} ${swx.padStart(maxLength)} |\n` +
        `| ${sxy.padStart(maxLength)} ${syy.padStart(maxLength)} ${szy.padStart(maxLength)} ${swy.padStart(maxLength)} |\n` +
        `| ${sxz.padStart(maxLength)} ${syz.padStart(maxLength)} ${szz.padStart(maxLength)} ${swz.padStart(maxLength)} |\n` +
        `| ${sxw.padStart(maxLength)} ${syw.padStart(maxLength)} ${szw.padStart(maxLength)} ${sww.padStart(maxLength)} |`,
      );
    } else {
      console.log(
        `${name.trim().length ? `${name} ` : ""}Matrix 4x4 (Row Major):\n` +
        `| ${sxx.padStart(maxLength)} ${sxy.padStart(maxLength)} ${sxz.padStart(maxLength)} ${sxw.padStart(maxLength)} |\n` +
        `| ${syx.padStart(maxLength)} ${syy.padStart(maxLength)} ${syz.padStart(maxLength)} ${syw.padStart(maxLength)} |\n` +
        `| ${szx.padStart(maxLength)} ${szy.padStart(maxLength)} ${szz.padStart(maxLength)} ${szw.padStart(maxLength)} |\n` +
        `| ${swx.padStart(maxLength)} ${swy.padStart(maxLength)} ${swz.padStart(maxLength)} ${sww.padStart(maxLength)} |`,
      );
    }
  }

  /* own functions */
  // - internal vectors for re-use
  static #v1 = new Vector3();
  static #v2 = new Vector3();
  static #v3 = new Vector3();

  createCameraLookAtMatrix(eye: Vector3, target: Vector3, up: Vector3): Matrix4 {
    Matrix4.#v1.subVectors(eye, target).normalize();
    Matrix4.#v2.crossVectors(up, Matrix4.#v1).normalize();
    Matrix4.#v3.crossVectors(Matrix4.#v1, Matrix4.#v2);

    this.#elements.set([
      Matrix4.#v2.x, Matrix4.#v2.y, Matrix4.#v2.z, -Matrix4.#v2.dot(eye),
      Matrix4.#v3.x, Matrix4.#v3.y, Matrix4.#v3.z, -Matrix4.#v3.dot(eye),
      Matrix4.#v1.x, Matrix4.#v1.y, Matrix4.#v1.z, -Matrix4.#v1.dot(eye),
      0, 0, 0, 1,
    ]);

    return this;
  }

  createPerspective(left: number, right: number, top: number, bottom: number, near: number, far: number): Matrix4 {
    const x = 2 * near / (right - left);
    const y = 2 * near / (top - bottom);

    const a = (right + left) / (right - left);
    const b = (top + bottom) / (top - bottom);

    const c = -far / (far - near);
    const d = (-far * near) / (far - near);

    this.#elements.set([
      x, 0, a, 0,
      0, y, b, 0,
      0, 0, c, d,
      0, 0, -1, 0,
    ]);

    return this;
  }
}

export default Matrix4;

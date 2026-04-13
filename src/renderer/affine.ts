// Solves a 3x3 linear system Ax = b using Gaussian elimination with partial pivoting.
function solve3(
  A: [[number, number, number], [number, number, number], [number, number, number]],
  b: [number, number, number],
): [number, number, number] {
  const aug: number[][] = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < 3; col++) {
    let maxRow = col
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row
    }
    ;[aug[col], aug[maxRow]] = [aug[maxRow], aug[col]]

    for (let row = col + 1; row < 3; row++) {
      const f = aug[row][col] / aug[col][col]
      for (let j = col; j <= 3; j++) aug[row][j] -= f * aug[col][j]
    }
  }

  const x = [0, 0, 0]
  for (let row = 2; row >= 0; row--) {
    x[row] = aug[row][3]
    for (let j = row + 1; j < 3; j++) x[row] -= aug[row][j] * x[j]
    x[row] /= aug[row][row]
  }
  return x as [number, number, number]
}

// Computes the 2D affine transform [a,b,c,d,e,f] (canvas setTransform convention)
// that maps srcPts[i] → dstPts[i] for 3 point pairs.
//   x' = a*x + c*y + e
//   y' = b*x + d*y + f
export function computeAffine(
  srcPts: [[number, number], [number, number], [number, number]],
  dstPts: [[number, number], [number, number], [number, number]],
): [number, number, number, number, number, number] {
  const M = srcPts.map(([x, y]) => [x, y, 1]) as [
    [number, number, number],
    [number, number, number],
    [number, number, number],
  ]
  const dx = dstPts.map(([x]) => x) as [number, number, number]
  const dy = dstPts.map(([, y]) => y) as [number, number, number]

  const [a, c, e] = solve3(M, dx)
  const [b, d, f] = solve3(M, dy)
  return [a, b, c, d, e, f]
}

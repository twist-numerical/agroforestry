export default function almostEqual(
  exact: number,
  approx: number,
  relEps: number = 1e-12
) {
  if (Math.abs(exact) < 1) {
    return Math.abs(exact - approx) < relEps;
  } else {
    return Math.abs(exact - approx) < relEps * exact;
  }
}

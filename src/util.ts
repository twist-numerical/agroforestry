export function clamp(value: number, min: number, max: number) {
  return value < min ? min : value < max ? value : max;
}

export function* range(start: number, end: number, step = 1): Iterable<number> {
  for (let i = start; i < end; i += step) yield i;
}

export function* constant<T>(value: T, count: number = Infinity) {
  for (let i = 0; i < count; ++i) yield value;
}

export function* zip<A, B>(a: Iterable<A>, b: Iterable<B>): Iterable<[A, B]> {
  const itA: Iterator<A> = a[Symbol.iterator]();
  const itB = b[Symbol.iterator]();
  let itemA: IteratorResult<A>;
  let itemB: IteratorResult<B>;
  while (!(itemA = itA.next()).done && !(itemB = itB.next()).done) {
    yield [itemA.value, itemB.value];
  }
}

export function* map<A, B>(f: (a: A) => B, arr: Iterable<A>): Iterable<B> {
  for (const a of arr) {
    yield f(a);
  }
}

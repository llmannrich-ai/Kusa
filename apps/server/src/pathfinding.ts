import { hasLineOfSight, isWalkable, tileDistance, type Dungeon } from "@kusa/shared";

interface Point { x: number; y: number }

/** Limite de tiles visitados por busca (os mapas têm até 112×112, mas o aggro é curto). */
const MAX_VISITED = 1500;

const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

/**
 * Próximo passo (8 direções, tile a tile) de `from` até um tile a até `range` de `to`
 * com linha de visão. Busca em largura que respeita `isWalkable`, não corta quina de
 * parede na diagonal e desvia de tiles ocupados. Devolve null se não houver caminho.
 * `walkable` troca o chão que vale (a Águia Gigante voa por cima da água).
 */
export function nextStep(
  d: Dungeon,
  from: Point,
  to: Point,
  range: number,
  occupied: (x: number, y: number) => boolean,
  walkable: (x: number, y: number) => boolean = (x, y) => isWalkable(d, x, y),
): Point | null {
  const key = (x: number, y: number) => y * d.width + x;
  const start = key(from.x, from.y);
  const parent = new Map<number, number>([[start, -1]]);
  const queue: number[] = [start];

  for (let head = 0; head < queue.length && parent.size < MAX_VISITED; head++) {
    const cur = queue[head];
    const cx = cur % d.width;
    const cy = Math.floor(cur / d.width);

    if (cur !== start && tileDistance(cx, cy, to.x, to.y) <= range && hasLineOfSight(d, cx, cy, to.x, to.y)) {
      // Volta pelos pais até o primeiro passo.
      let step = cur;
      while (parent.get(step) !== start) step = parent.get(step)!;
      return { x: step % d.width, y: Math.floor(step / d.width) };
    }

    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      const k = key(nx, ny);
      if (parent.has(k) || !walkable(nx, ny) || occupied(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!walkable(nx, cy) || !walkable(cx, ny))) continue;
      parent.set(k, cur);
      queue.push(k);
    }
  }
  return null;
}

/**
 * Distância a pé (em passos de 8 direções) de cada tile até `to`, no mapa inteiro: -1 onde não dá para chegar.
 * O `nextStep` corta a busca em `MAX_VISITED` tiles (aggro curto); quem persegue longe desce este
 * campo, que custa uma busca no mapa todo e serve a todos os monstros que vão atrás do mesmo herói.
 */
export function distanceField(d: Dungeon, to: Point, walkable: (x: number, y: number) => boolean = (x, y) => isWalkable(d, x, y)): Int32Array {
  const field = new Int32Array(d.width * d.height).fill(-1);
  if (to.x < 0 || to.y < 0 || to.x >= d.width || to.y >= d.height) return field;
  const start = to.y * d.width + to.x;
  field[start] = 0;
  const queue: number[] = [start];
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    const cx = cur % d.width;
    const cy = Math.floor(cur / d.width);
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= d.width || ny >= d.height) continue;
      const k = ny * d.width + nx;
      if (field[k] !== -1 || !walkable(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!walkable(nx, cy) || !walkable(cx, ny))) continue;
      field[k] = field[cur] + 1;
      queue.push(k);
    }
  }
  return field;
}

/** Próximo passo descendo o campo de `distanceField` (o vizinho livre mais perto do destino), ou null se não há. */
export function fieldStep(
  d: Dungeon,
  field: Int32Array,
  from: Point,
  occupied: (x: number, y: number) => boolean,
  walkable: (x: number, y: number) => boolean = (x, y) => isWalkable(d, x, y),
): Point | null {
  const here = field[from.y * d.width + from.x];
  let best: Point | null = null;
  let bestValue = here < 0 ? Infinity : here;
  for (const [dx, dy] of DIRS) {
    const nx = from.x + dx;
    const ny = from.y + dy;
    if (nx < 0 || ny < 0 || nx >= d.width || ny >= d.height) continue;
    const value = field[ny * d.width + nx];
    if (value < 0 || value >= bestValue || !walkable(nx, ny) || occupied(nx, ny)) continue;
    if (dx !== 0 && dy !== 0 && (!walkable(nx, from.y) || !walkable(from.x, ny))) continue;
    best = { x: nx, y: ny };
    bestValue = value;
  }
  return best;
}

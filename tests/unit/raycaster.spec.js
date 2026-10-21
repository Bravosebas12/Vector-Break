import { test, expect } from '@playwright/test';
import { Board } from '../../src/js/system/Board.js';
import { Raycaster, REFLECT_LENGTH } from '../../src/js/system/Raycaster.js';
import { BALL_RADIUS, WALL_LEFT, WALL_RIGHT } from '../../src/js/system/Layout.js';

const hp = { standard: 3, reinforced: 30, core: 100, indestructible: undefined, multiplier: undefined };
function boardWith(...defs) {
  const blocks = defs.map(([type, col, row]) => ({
    type, col, row,
    ...(type === 'multiplier' ? { value: 1 } : hp[type] ? { hp: hp[type] } : {}),
  }));
  if (!blocks.some((b) => b.type === 'core')) blocks.push({ type: 'core', col: 0, row: 0, hp: 100 });
  return Board.fromLevel({ id: 'level-99', name: 't', grid: { cols: 9, rows: 12 }, launcher: { x: 0.5 }, shots: 5, startBalls: 3, blocks });
}
const LAUNCH = { x: 540, y: 956 };
const near = (a, b, d = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(d);

test.describe('Raycaster.cast: first contact', () => {
  test('hits the bottom face of a block offset by the ball radius, normal (0,1)', () => {
    const { contact } = Raycaster.cast(LAUNCH, { x: 0, y: -1 }, boardWith(['standard', 4, 1]));
    near(contact.x, 540);
    near(contact.y, 112 + BALL_RADIUS);
    expect([contact.nx, contact.ny]).toEqual([0, 1]);
    expect(contact.surface).toBe('block');
    expect(contact.blockType).toBe('standard');
  });

  test('hits the left wall offset by the radius when pointing up-left', () => {
    const { contact } = Raycaster.cast(LAUNCH, { x: -0.8, y: -0.6 }, boardWith());
    near(contact.x, WALL_LEFT + BALL_RADIUS);
    expect([contact.nx, contact.ny]).toEqual([1, 0]);
    expect(contact.surface).toBe('wall-left');
    expect(contact.blockType).toBeNull();
  });

  test('right wall and ceiling are reported with their own surface', () => {
    const right = Raycaster.cast(LAUNCH, { x: 0.8, y: -0.6 }, boardWith()).contact;
    near(right.x, WALL_RIGHT - BALL_RADIUS);
    expect(right.surface).toBe('wall-right');
    const ceiling = Raycaster.cast(LAUNCH, { x: 0, y: -1 }, boardWith()).contact;
    near(ceiling.y, BALL_RADIUS);
    expect([ceiling.surface, ceiling.nx, ceiling.ny]).toEqual(['ceiling', 0, 1]);
  });

  test('indestructible counts as a surface and orbs are ignored', () => {
    const board = boardWith(['indestructible', 4, 3], ['multiplier', 4, 6]);
    const { contact } = Raycaster.cast(LAUNCH, { x: 0, y: -1 }, board);
    near(contact.y, 4 * 56 + BALL_RADIUS);
    expect(contact.blockType).toBe('indestructible');
  });

  test('corner contact uses the rounded corner: diagonal normal, same geometry as the simulation', () => {
    // Ray 4 px left of the block corner (484,112): the corner circle, not the square, is hit.
    const { contact } = Raycaster.cast({ x: 480, y: 956 }, { x: 0, y: -1 }, boardWith(['standard', 4, 1]));
    const dy = Math.sqrt(BALL_RADIUS ** 2 - 16);
    near(contact.y, 112 + dy);
    near(contact.nx, -4 / BALL_RADIUS);
    near(contact.ny, dy / BALL_RADIUS);
  });

  test('a ray that passes the corner circle misses the block', () => {
    const { contact } = Raycaster.cast({ x: 484 - BALL_RADIUS - 1, y: 956 }, { x: 0, y: -1 }, boardWith(['standard', 4, 1]));
    expect(contact.surface).toBe('ceiling');
  });
});

test.describe('Raycaster.cast: single reflected segment', () => {
  test('reflects once with a fixed length along R = u - 2(u.n)n', () => {
    const res = Raycaster.cast({ x: 100, y: 700 }, { x: 0.6, y: -0.8 }, boardWith(['standard', 4, 1]));
    expect(res.contact.surface).toBe('block');
    near(res.reflected.dx, 0.6);
    near(res.reflected.dy, 0.8);
    near(Math.hypot(res.reflected.x1 - res.contact.x, res.reflected.y1 - res.contact.y), REFLECT_LENGTH);
    expect(REFLECT_LENGTH).toBe(180);
  });

  test('stays fixed-length even when it would reach another surface; never a second bounce', () => {
    const res = Raycaster.cast({ x: 900, y: 400 }, { x: 0.99, y: -0.141 }, boardWith());
    expect(res.contact.surface).toBe('wall-right');
    near(Math.hypot(res.reflected.x1 - res.contact.x, res.reflected.y1 - res.contact.y), REFLECT_LENGTH);
    expect(Object.keys(res).sort()).toEqual(['contact', 'reflected']);
  });
});

test.describe('Raycaster.aimDirection: clamp', () => {
  test('near-horizontal cursor is limited to |dir.y| = 0.05 with unit length', () => {
    const d = Raycaster.aimDirection(LAUNCH, { x: LAUNCH.x + 999.9, y: LAUNCH.y - 10 });
    near(d.y, -0.05, 1e-9);
    near(Math.hypot(d.x, d.y), 1, 1e-9);
    expect(d.x).toBeGreaterThan(0);
  });

  test('a valid angle is untouched', () => {
    const d = Raycaster.aimDirection(LAUNCH, { x: LAUNCH.x + 60, y: LAUNCH.y - 80 });
    near(d.x, 0.6, 1e-9);
    near(d.y, -0.8, 1e-9);
  });

  test('a cursor below the launcher line aims upward at the clamp, keeping the horizontal sign', () => {
    const d = Raycaster.aimDirection(LAUNCH, { x: LAUNCH.x - 300, y: LAUNCH.y + 200 });
    near(d.y, -0.05, 1e-9);
    expect(d.x).toBeLessThan(0);
    near(Math.hypot(d.x, d.y), 1, 1e-9);
  });

  test('a cursor exactly on the launcher yields no direction', () => {
    expect(Raycaster.aimDirection(LAUNCH, { x: LAUNCH.x, y: LAUNCH.y })).toBeNull();
  });
});

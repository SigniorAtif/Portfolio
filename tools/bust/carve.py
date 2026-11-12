"""Carve a point-cloud bust from two orthogonal clay renders.

No 3D model and no network: the front silhouette gives width per row, the side
silhouette gives depth per row, each row's cross-section is a superellipse
clipped by both silhouettes, and the clay shading adds surface relief.

Usage:
    python carve.py FRONT.png SIDE.png OUT_DIR [--points 60000]

Writes OUT_DIR/points.npy (N x 6 float32: x y z nx ny nz, y up, +z toward the
viewer, roughly unit height) and OUT_DIR/preview.png.
"""
import argparse
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

GRID = 256
ROUNDNESS = 2.5  # superellipse exponent: 2 = ellipse, higher = boxier
RELIEF = 2.6  # voxels of displacement at full shading contrast
RECESS = 6.0  # voxels the skin and cloth sit behind the hair surface
HAIR_LUM = 0.56  # clay hair renders darker than clay skin


def load(path):
    im = Image.open(path).convert("RGB").resize((GRID, GRID), Image.LANCZOS)
    lum = np.asarray(im).astype(np.float32).mean(-1) / 255.0
    mask = ndi.binary_fill_holes(lum < 0.91)
    mask = ndi.binary_opening(mask, iterations=1)
    return lum, mask


def row_span(mask):
    """Per row: centre and half-extent of the silhouette (0 extent when empty)."""
    idx = np.arange(mask.shape[1])
    has = mask.any(1)
    lo = np.where(has, np.where(mask, idx, mask.shape[1]).min(1), 0)
    hi = np.where(has, np.where(mask, idx, -1).max(1), 0)
    centre = (lo + hi) / 2.0
    half = np.where(has, (hi - lo) / 2.0 + 0.5, 0.0)
    return centre, half


def detail(lum, mask):
    """High-pass shading inside the silhouette: positive = catches light = bulges out."""
    filled = np.where(mask, lum, lum[mask].mean())
    hp = ndi.gaussian_filter(filled, 0.8) - ndi.gaussian_filter(filled, 5.0)
    return np.clip(hp / 0.12, -1, 1) * mask


def carve(front_mask, side_mask):
    cx, hw = row_span(front_mask)
    cz, hd = row_span(side_mask)
    x = np.arange(GRID)[None, :, None]
    z = np.arange(GRID)[None, None, :]
    u = (x - cx[:, None, None]) / np.maximum(hw, 1e-6)[:, None, None]
    v = (z - cz[:, None, None]) / np.maximum(hd, 1e-6)[:, None, None]
    occ = (np.abs(u) ** ROUNDNESS + np.abs(v) ** ROUNDNESS) <= 1.0
    occ &= front_mask[:, :, None] & side_mask[:, None, :]
    # Blur more along rows so per-row spans do not leave horizontal shelves.
    return ndi.gaussian_filter(occ.astype(np.float32), (2.6, 1.6, 1.6))


def skin(lum, mask):
    """1 where the silhouette is skin or cloth, 0 where it is hair, soft edge."""
    hair = (ndi.gaussian_filter(lum, 2.5) < HAIR_LUM) & mask
    hair = ndi.binary_opening(hair, iterations=2)
    return ndi.gaussian_filter((mask & ~hair).astype(np.float32), 2.0)


def sample_surface(field, count, rng):
    solid = field > 0.5
    shell = solid & ~ndi.binary_erosion(solid)
    vox = np.argwhere(shell)
    pick = vox[rng.integers(0, len(vox), count)].astype(np.float32)
    pick += rng.uniform(-0.5, 0.5, pick.shape).astype(np.float32)

    grad = np.stack(np.gradient(field), -1)
    for _ in range(3):  # walk each point onto the 0.5 iso-surface
        f = ndi.map_coordinates(field, pick.T, order=1)
        g = np.stack([ndi.map_coordinates(grad[..., k], pick.T, order=1) for k in range(3)], -1)
        norm = np.linalg.norm(g, axis=1, keepdims=True) + 1e-6
        pick += (0.5 - f)[:, None] * g / norm**2
    g = np.stack([ndi.map_coordinates(grad[..., k], pick.T, order=1) for k in range(3)], -1)
    normal = -g / (np.linalg.norm(g, axis=1, keepdims=True) + 1e-6)
    return pick, normal  # both in (row, col_x, col_z) voxel axes


def add_relief(pos, normal, front_detail, side_detail, front_skin, side_skin):
    rows, xs, zs = pos.T
    f = ndi.map_coordinates(front_detail, [rows, xs], order=1)
    s = ndi.map_coordinates(side_detail, [rows, zs], order=1)
    # normal axes: (row, x, z). The side image looks along x, the front along z.
    # In the side image the face is at low column index, so "toward viewer" is -z.
    w_front = np.clip(-normal[:, 2], 0, 1) ** 1.5
    w_side = np.abs(normal[:, 1]) ** 1.5
    amount = RELIEF * (f * w_front + s * w_side)
    out = pos + normal * amount[:, None]
    # Hair stands proud of the face: push skin back from each camera it faces.
    out[:, 2] += RECESS * w_front * ndi.map_coordinates(front_skin, [rows, xs], order=1)
    out[:, 1] -= np.sign(normal[:, 1]) * RECESS * 0.6 * w_side * ndi.map_coordinates(side_skin, [rows, zs], order=1)
    return out


def to_world(pos, normal):
    """(row, x, zcol) voxels -> x right, y up, z toward viewer, centred, unit-ish."""
    rows, xs, zs = pos.T
    world = np.stack([xs - GRID / 2, GRID / 2 - rows, GRID / 2 - zs], -1) / (GRID / 2)
    n = np.stack([normal[:, 1], -normal[:, 0], -normal[:, 2]], -1)
    return world.astype(np.float32), n.astype(np.float32)


def render(points, normals, yaw_deg, size=560):
    yaw = np.radians(yaw_deg)
    rot = np.array([[np.cos(yaw), 0, np.sin(yaw)], [0, 1, 0], [-np.sin(yaw), 0, np.cos(yaw)]])
    p, n = points @ rot.T, normals @ rot.T
    light = np.array([-0.4, 0.5, 0.75])
    light /= np.linalg.norm(light)
    facing = n[:, 2]
    bright = 0.30 + 0.45 * np.clip(n @ light, 0, 1)
    bright *= np.interp(facing, [-0.3, 0.25], [0.35, 1.0])
    px = ((p[:, 0] * 0.46 + 0.5) * size).astype(int)
    py = ((0.5 - p[:, 1] * 0.46) * size).astype(int)
    ok = (px >= 0) & (px < size) & (py >= 0) & (py < size)
    img = np.zeros((size, size), np.float32)
    np.add.at(img, (py[ok], px[ok]), bright[ok])
    img = ndi.gaussian_filter(img, 0.9) * 3.4
    return np.clip(img, 0, 1) ** 0.8


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("front")
    ap.add_argument("side")
    ap.add_argument("out")
    ap.add_argument("--points", type=int, default=44000)
    args = ap.parse_args()
    rng = np.random.default_rng(7)

    front_lum, front_mask = load(args.front)
    side_lum, side_mask = load(args.side)
    field = carve(front_mask, side_mask)
    pos, normal = sample_surface(field, args.points, rng)
    pos = add_relief(
        pos, normal,
        detail(front_lum, front_mask), detail(side_lum, side_mask),
        skin(front_lum, front_mask), skin(side_lum, side_mask),
    )
    points, normals = to_world(pos, normal)

    os.makedirs(args.out, exist_ok=True)
    np.save(os.path.join(args.out, "points.npy"), np.hstack([points, normals]))
    views = [render(points, normals, yaw) for yaw in (0, 35, 70, 90)]
    sheet = np.hstack(views)
    rgb = np.stack([sheet * 0.84 + 0.045, sheet * 0.86 + 0.05, sheet * 0.89 + 0.063], -1)
    Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).save(os.path.join(args.out, "preview.png"))
    print("points", len(points), "bounds", points.min(0).round(2), points.max(0).round(2))


if __name__ == "__main__":
    main()

"""Bake a bust mesh into the point file the hero loads.

Usage:
    python bake.py MESH OUT_DIR [--points 44000] [--yaw 0] [--bin PATH]

Samples points evenly over the surface (area weighted), drops loose specks,
normalises to y up / +z toward the viewer / height 2, and writes:
    OUT_DIR/points.npy   N x 6 float32 (x y z nx ny nz)
    OUT_DIR/preview.png  contact sheet at several head turns
    --bin PATH           packed file for the browser (see pack())
"""
import argparse
import os
import struct

import numpy as np
import trimesh
from PIL import Image
from scipy import ndimage as ndi


HEAD_CENTRE = np.array([0.0, 0.3, -0.02], np.float32)
SKULL_RADIUS = 0.42  # roughly where face and scalp sit; hair is whatever lies beyond
HAIR_KEEP = 0.55  # share of hair volume kept beyond the skull


def smoothstep(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def hair_weight(unit_points):
    """0 on face, neck and cloth, 1 in the hair (points in normalised bust space)."""
    beyond = np.linalg.norm(unit_points - HEAD_CENTRE, axis=1) - SKULL_RADIUS
    return smoothstep(beyond / 0.05) * smoothstep((unit_points[:, 1] + 0.15) / 0.25)


def creases(points, normals, neighbours=14):
    """0 on smooth surface, 1 where the surface folds: collar edge, placket, seams."""
    from scipy.spatial import cKDTree

    _, idx = cKDTree(points).query(points, k=neighbours)
    spread = 1 - np.linalg.norm(normals[idx].mean(1), axis=1)
    return np.clip((spread - 0.02) / 0.16, 0, 1).astype(np.float32)


def load_mesh(path, min_share=0.004, smooth=30):
    mesh = trimesh.load(path, force="mesh", process=True)
    parts = mesh.split(only_watertight=False)
    if len(parts) > 1:  # flyaway hair tips come out as tiny islands
        total = sum(p.area for p in parts)
        keep = [p for p in parts if p.area / total >= min_share]
        print(f"components {len(parts)} -> kept {len(keep)}")
        mesh = trimesh.util.concatenate(keep)
    # Melt strand-level curls into broad masses; in dots they only read as noise.
    # Hair only: the collar, placket and jaw keep every edge they came with.
    original = mesh.vertices.copy()
    trimesh.smoothing.filter_laplacian(mesh, lamb=0.5, iterations=smooth)
    lo, hi = original.min(0), original.max(0)
    unit = (original - (lo + hi) / 2) / ((hi[1] - lo[1]) / 2)
    weight = hair_weight(unit)[:, None]
    mesh.vertices = original + (mesh.vertices - original) * weight
    return mesh


def sample(mesh, count, seed=7):
    points, face = trimesh.sample.sample_surface(mesh, count, seed=seed)
    return np.asarray(points, np.float32), np.asarray(mesh.face_normals[face], np.float32)


def normalise(points, normals, yaw_deg):
    yaw = np.radians(yaw_deg)
    rot = np.array([[np.cos(yaw), 0, np.sin(yaw)], [0, 1, 0], [-np.sin(yaw), 0, np.cos(yaw)]], np.float32)
    points, normals = points @ rot.T, normals @ rot.T
    lo, hi = points.min(0), points.max(0)
    points = (points - (lo + hi) / 2) / ((hi[1] - lo[1]) / 2)
    return points, normals


CHIN_TUCK = 0.045  # how far the chin is set back, in bust units (face front sits near z = 0.5)


def tuck_chin(points):
    """Set the chin back a little. With a featureless face there is no nose in
    front of it, so an ordinary chin reads as jutting."""
    y, z = points[:, 1], points[:, 2]
    lower_face = smoothstep((0.12 - y) / 0.17) * smoothstep((y + 0.30) / 0.07)  # mouth line down to the neck
    front = smoothstep((z - 0.15) / 0.2)  # leave the back of the neck alone
    out = points.copy()
    out[:, 2] -= CHIN_TUCK * lower_face * front
    return out


def tame_hair(points, normals):
    """Pull the hair in toward the skull and drop curl surfaces that face inward.

    Curly hair has several times the surface area of the face, so sampled evenly
    it turns into a dense, fuzzy cap."""
    offset = points - HEAD_CENTRE
    dist = np.linalg.norm(offset, axis=1)
    outward = offset / np.maximum(dist, 1e-6)[:, None]
    head = np.clip((points[:, 1] + 0.15) / 0.25, 0, 1)
    head = head * head * (3 - 2 * head)  # smoothstep: nothing below the jaw moves
    beyond = np.maximum(dist - SKULL_RADIUS, 0)

    new_dist = dist - beyond * (1 - HAIR_KEEP) * head
    out = HEAD_CENTRE + outward * new_dist[:, None]

    in_hair = (beyond > 0.02) & (head > 0.5)
    facing_out = (normals * outward).sum(1) > 0.3
    # Compressing the hair packs its dots tighter; thin them back to face density.
    thin = np.random.default_rng(5).random(len(points)) < 0.6
    keep = ~in_hair | (facing_out & thin)
    print(f"hair dots {int(in_hair.sum())} -> {int((in_hair & keep).sum())}")
    return out[keep].astype(np.float32), normals[keep], keep


def face_front(points, x, y, radius=0.035):
    """Front-most z of the bust near each (x, y): the surface the frame must clear."""
    out = np.empty(len(x), np.float32)
    for i, (px, py) in enumerate(zip(x, y)):
        near = (np.abs(points[:, 0] - px) < radius) & (np.abs(points[:, 1] - py) < radius)
        out[i] = points[near, 2].max() if near.any() else -9.0
    return out


def specs(points, rng, eye_y=0.2, centre_x=0.14, half_w=0.115, half_h=0.092):
    """Thin full-rim metal frame drawn as its own dots. Wire rims have almost no
    surface area, so sampling the mesh would give them a handful of specks."""
    nose_z = face_front(points, np.zeros(1), np.full(1, eye_y))[0]

    def frame_z(x):  # one rigid curve across both lenses, wrapping a little
        return nose_z + 0.045 - 0.9 * np.maximum(0, np.abs(x) - 0.12) ** 2

    xs, ys = [], []
    t = rng.uniform(0, 2 * np.pi, 560)
    cx, sy = np.cos(t), np.sin(t)
    lx = half_w * np.sign(cx) * np.abs(cx) ** (2 / 3.2)
    ly = half_h * np.sign(sy) * np.abs(sy) ** (2 / 3.2)
    lx = lx * (1 + 0.09 * ly / half_h)  # a touch wider along the brow
    for side in (-1, 1):
        xs.append(side * centre_x + lx)
        ys.append(eye_y + ly)
    bx = rng.uniform(-(centre_x - half_w) - 0.012, centre_x - half_w + 0.012, 110)
    xs.append(bx)
    ys.append(eye_y + half_h * 0.55 + 0.012 * np.cos(bx / (centre_x - half_w) * np.pi / 2))
    x, y = np.concatenate(xs), np.concatenate(ys)
    z = np.maximum(frame_z(x), face_front(points, x, y) + 0.02)
    front = np.stack([x, y, z], -1)
    front_n = np.tile([0.0, 0.0, 1.0], (len(front), 1))

    arms, arm_n = [], []
    hinge_x = centre_x + half_w * 1.07
    hinge_y = eye_y + half_h * 0.72
    hinge_z = frame_z(np.array([hinge_x]))[0]
    for side in (-1, 1):
        u = rng.uniform(0, 1, 260) ** 0.8  # denser near the hinge
        arms.append(np.stack([
            side * (hinge_x + 0.10 * u),
            hinge_y - 0.035 * u**2,
            hinge_z - 0.62 * u,
        ], -1))
        arm_n.append(np.tile([side, 0.0, 0.25], (260, 1)))
    pts = np.vstack([front, *arms]) + rng.normal(0, 0.0022, (len(front) + 520, 3))
    return pts.astype(np.float32), np.vstack([front_n, *arm_n]).astype(np.float32)


def render(points, normals, yaw_deg, size=560):
    yaw = np.radians(yaw_deg)
    rot = np.array([[np.cos(yaw), 0, np.sin(yaw)], [0, 1, 0], [-np.sin(yaw), 0, np.cos(yaw)]])
    p, n = points @ rot.T, normals @ rot.T
    light = np.array([-0.45, 0.5, 0.74])
    light /= np.linalg.norm(light)
    bright = 0.30 + 0.5 * np.clip(n @ light, 0, 1)
    bright *= np.interp(n[:, 2], [-0.3, 0.25], [0.3, 1.0])  # far side darker
    px = ((p[:, 0] * 0.44 + 0.5) * size).astype(int)
    py = ((0.5 - p[:, 1] * 0.44) * size).astype(int)
    ok = (px >= 0) & (px < size) & (py >= 0) & (py < size)
    img = np.zeros((size, size), np.float32)
    np.add.at(img, (py[ok], px[ok]), bright[ok])
    return np.clip(ndi.gaussian_filter(img, 0.9) * 3.2, 0, 1) ** 0.8


def pack(path, points, normals, flags, edges):
    """Header 'BUST', u32 count, then int16 xyz (scale 1/32767 of +-1.25),
    int8 normal xyz, u8 flag (0 bust, 1 specs), u8 crease strength per point."""
    q = np.clip(points / 1.25, -1, 1)
    with open(path, "wb") as fh:
        fh.write(b"BUST" + struct.pack("<I", len(points)))
        fh.write((q * 32767).astype("<i2").tobytes())
        fh.write((np.clip(normals, -1, 1) * 127).astype("i1").tobytes())
        fh.write(flags.astype("u1").tobytes())
        fh.write((np.clip(edges, 0, 1) * 255).astype("u1").tobytes())
    print("packed", path, os.path.getsize(path) // 1024, "KB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mesh")
    ap.add_argument("out")
    ap.add_argument("--points", type=int, default=44000)
    ap.add_argument("--yaw", type=float, default=0.0, help="turn so the face looks along +z")
    ap.add_argument("--bin")
    args = ap.parse_args()

    mesh = load_mesh(args.mesh)
    print("faces", len(mesh.faces), "extents", mesh.extents.round(3))
    points, normals = normalise(*sample(mesh, int(args.points * 1.6)), args.yaw)
    edges = creases(points, normals) * (1 - hair_weight(points))  # hair is all crease; skip it
    points, normals, keep = tame_hair(points, normals)
    edges = edges[keep][: args.points]
    points = tuck_chin(points)
    points, normals = points[: args.points], normals[: args.points]
    print("crease dots", int((edges > 0.5).sum()))
    spec_p, spec_n = specs(points, np.random.default_rng(11))

    os.makedirs(args.out, exist_ok=True)
    np.save(os.path.join(args.out, "points.npy"), np.hstack([points, normals]))
    yaws = (0, -30, -60, 90)
    body = np.hstack([render(points, normals, yaw) for yaw in yaws])
    frame = np.hstack([render(spec_p, spec_n, yaw) for yaw in yaws])
    frame = np.clip(ndi.maximum_filter(frame, 2) * 3, 0, 1)[..., None]
    grey = np.stack([body * 0.84 + 0.045, body * 0.86 + 0.05, body * 0.89 + 0.063], -1)
    rgb = grey * (1 - frame) + np.array([0.78, 0.95, 0.41]) * frame
    Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8)).save(os.path.join(args.out, "preview.png"))
    print("bounds", points.min(0).round(2), points.max(0).round(2), "spec dots", len(spec_p))
    if args.bin:
        flags = np.r_[np.zeros(len(points), np.uint8), np.ones(len(spec_p), np.uint8)]
        pack(args.bin, np.vstack([points, spec_p]), np.vstack([normals, spec_n]), flags,
             np.r_[edges, np.zeros(len(spec_p), np.float32)])


if __name__ == "__main__":
    main()

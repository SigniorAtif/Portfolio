"""Squeeze the baked portrait for the web, losslessly.

    python tools/bust/squeeze.py tools/bust/points.bin public/bust/points.bust

Reads the 'BUST' file that bake.py packs and writes the same points, bit for
bit, in a form gzip can do something with. On their own the int16 positions
look like noise and gzip saves about 20%. Sorted along a Morton curve,
neighbouring points sit close together, so each coordinate is stored as the
difference from the one before, split into a low-byte and a high-byte plane.
That takes the file from 491 KB to about 281 KB. Drawing order does not
matter: every attribute moves with its point.

Layout before gzip ('BST2'): magic, u32 count, then for x, y and z the low
bytes and high bytes of int16 deltas (wrapping, the first one absolute);
for each normal axis the int8 deltas mod 256 (the first one from zero); then
the flag and crease bytes in sorted order. BustStage.tsx decodes it.
"""

import array
import gzip
import struct
import sys


def morton(x, y, z):
    def spread(v):
        v &= 0x3FF
        v = (v | (v << 16)) & 0x030000FF
        v = (v | (v << 8)) & 0x0300F00F
        v = (v | (v << 4)) & 0x030C30C3
        return (v | (v << 2)) & 0x09249249

    return spread(x) | (spread(y) << 1) | (spread(z) << 2)


def wrap16(v):
    return ((v + 32768) % 65536) - 32768


def squeeze(src, dst):
    raw = open(src, "rb").read()
    if raw[:4] != b"BUST":
        sys.exit(f"{src}: not a BUST file")
    count = struct.unpack_from("<I", raw, 4)[0]
    if len(raw) != 8 + count * 11:
        sys.exit(f"{src}: expected {8 + count * 11} bytes, found {len(raw)}")
    pos = array.array("h")
    pos.frombytes(raw[8 : 8 + count * 6])
    normals = array.array("b")
    normals.frombytes(raw[8 + count * 6 : 8 + count * 9])
    flags = raw[8 + count * 9 : 8 + count * 10]
    edges = raw[8 + count * 10 :]

    order = sorted(range(count), key=lambda i: morton(*((pos[i * 3 + k] + 32768) >> 6 for k in range(3))))

    out = bytearray(b"BST2" + struct.pack("<I", count))
    for axis in range(3):
        seq = [pos[i * 3 + axis] for i in order]
        deltas = array.array("h", [seq[0]] + [wrap16(seq[j] - seq[j - 1]) for j in range(1, count)]).tobytes()
        out += deltas[0::2] + deltas[1::2]
    for axis in range(3):
        seq = [normals[i * 3 + axis] for i in order]
        out += bytes((seq[j] - (seq[j - 1] if j else 0)) % 256 for j in range(count))
    out += bytes(flags[i] for i in order)
    out += bytes(edges[i] for i in order)

    packed = gzip.compress(bytes(out), 9, mtime=0)
    open(dst, "wb").write(packed)
    print(f"squeezed {src} ({len(raw) // 1024} KB) -> {dst} ({len(packed) // 1024} KB)")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    squeeze(sys.argv[1], sys.argv[2])

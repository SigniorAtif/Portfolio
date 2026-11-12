"""Print mask extents for the clay reference images (sanity check before carving)."""
import sys

import numpy as np
from PIL import Image

for path in sys.argv[1:]:
    im = np.asarray(Image.open(path).convert("RGBA")).astype(np.float32)
    alpha = im[..., 3]
    lum = im[..., :3].mean(-1)
    mask = (lum < 232) & (alpha > 10)
    ys, xs = np.nonzero(mask)
    print(
        path.split("/")[-1],
        im.shape,
        "alpha", alpha.min(), alpha.max(),
        "bbox x", xs.min(), xs.max(),
        "y", ys.min(), ys.max(),
        "fill", round(float(mask.mean()), 3),
        "corner lum", lum[5, 5],
    )

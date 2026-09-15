import { useEffect, useState } from "react";

// Drop-in replacement for react-progressive-image (dead since 2019, peers on React 16).
// Shows `placeholder` until `src` finishes loading, then swaps.
// Children is a render prop: (src, loading) => JSX
export default function ProgressiveImage({ src, placeholder = "", children }) {
  const [image, setImage] = useState(placeholder);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setImage(placeholder);
    setLoading(true);

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setImage(src);
      setLoading(false);
    };
    img.onerror = () => {
      if (cancelled) return;
      setLoading(false);
    };
    img.src = src;

    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, placeholder]);

  return children(image, loading);
}

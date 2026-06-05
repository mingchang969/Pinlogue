import React, { useEffect, useState, useRef } from "react";
import { getCroppedImg } from "../utils/cropImage";

function CroppedImage({
  imageUrl,
  cropData,
  alt = "",
  className = "",
}) {
  const [displayUrl, setDisplayUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!imageUrl) return;

      setLoading(true);

      const pixels = cropData?.croppedAreaPixels;

      if (!pixels) {
        setDisplayUrl(imageUrl);
        setLoading(false);
        return;
      }

      const url = await getCroppedImg(imageUrl, pixels);

      if (cancelled) return;

      setDisplayUrl(url);
      setLoading(false);
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [imageUrl, cropData]);

  if (!displayUrl || loading) {
    return (
      <div className="croppedImageWrapper">
        <div className="imagePlaceholder"></div>
      </div>
    );
  }

  return (
    <div className="croppedImageWrapper">

      {displayUrl && (
        <img
          src={displayUrl}
          alt={alt}
          className={`${className} ${loading ? "isLoading" : "isLoaded"}`}
          draggable={false}
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        />
      )}
    </div>
  );
}

export default CroppedImage;
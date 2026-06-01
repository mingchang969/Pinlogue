import React, { useEffect, useState } from "react";
import { getCroppedImg } from "../utils/cropImage";

function CroppedImage({
  imageUrl,
  cropData,
  alt = "",
  className = "",
}) {
  const [displayUrl, setDisplayUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let objectUrlToClean = null;

    async function buildImage() {
      setLoading(true);
      setDisplayUrl(null);

      if (!imageUrl) {
        setLoading(false);
        return;
      }

      try {

        const finalUrl = cropData?.croppedAreaPixels
          ? await getCroppedImg(imageUrl, cropData.croppedAreaPixels)
          : imageUrl;

        if (cropData?.croppedAreaPixels) {
          objectUrlToClean = finalUrl;
        }

        if (active) {
          setDisplayUrl(finalUrl);
        }
      } catch (err) {
        console.error("裁切預覽失敗:", err);

        if (active) {
          setDisplayUrl(imageUrl);
        }
      }
    }

    buildImage();

    return () => {
      active = false;
      if (objectUrlToClean) {
        URL.revokeObjectURL(objectUrlToClean);
      }
    };
  }, [imageUrl, cropData]);

  if (!displayUrl || loading) {
    <div className="croppedImageWrapper">
      <div className="imagePlaceholder"></div>
    </div>
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
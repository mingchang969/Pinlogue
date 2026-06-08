export function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.setAttribute("crossOrigin", "anonymous");
    image.onload = () => resolve(image);
    image.onerror = (error) => reject(error);
    image.src = url;
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();

    // 🚨 關鍵：避免 canvas tainted + cache weirdness
    img.crossOrigin = "anonymous";

    img.onload = () => resolve(img);
    img.onerror = reject;

    img.src = src;
  });
}

export async function getCroppedImg(
  imageSrc,
  croppedArea
) {

  const image =
    await createImage(imageSrc)

  const canvas =
    document.createElement("canvas")

  const ctx =
    canvas.getContext("2d")


  const cropX =

    image.naturalWidth *
    croppedArea?.x /
    100


  const cropY =

    image.naturalHeight *
    croppedArea?.y /
    100


  const cropWidth =

    image.naturalWidth *
    croppedArea?.width /
    100


  const cropHeight =

    image.naturalHeight *
    croppedArea?.height /
    100


  canvas.width =
    cropWidth

  canvas.height =
    cropHeight


  ctx.drawImage(

    image,

    cropX,
    cropY,

    cropWidth,
    cropHeight,

    0,
    0,

    cropWidth,
    cropHeight

  )


  return new Promise(resolve => {

    canvas.toBlob(blob => {

      if (!blob) return

      resolve(
        URL.createObjectURL(blob)
      )

    }, "image/jpeg")

  })

}
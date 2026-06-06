import imageCompression from "browser-image-compression";

export async function compressImage(
  file,
  options={}
){

 const {
   maxWidth=1600,
   maxHeight=1600,
   quality=0.82,
   outputType="image/webp",
 } = options;

 const compressed =
   await imageCompression(file,{
      maxWidthOrHeight:
         Math.max(maxWidth,maxHeight),

      initialQuality:quality,

      fileType:outputType,

      useWebWorker:true,
   });

 return compressed;
}
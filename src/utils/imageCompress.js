export async function compressImage(file, options = {}) {
    const {
        maxWidth = 1600,
        maxHeight = 1600,
        quality = 0.8,
        outputType = "image/jpeg",
    } = options;

    if (!(file instanceof File)) {
        throw new Error("不是有效的檔案");
    }

    // SVG 不處理
    if (file.type === "image/svg+xml") {
        return file;
    }

    // GIF 先不壓，避免動畫壞掉
    if (file.type === "image/gif") {
        return file;
    }

    const imageBitmap = await createImageBitmap(file);

    let { width, height } = imageBitmap;

    const ratio = Math.min(
        1,
        maxWidth / width,
        maxHeight / height,
    );

    const targetWidth = Math.round(width * ratio);
    const targetHeight = Math.round(height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("無法建立 canvas");
    }

    ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
            (result) => {
                if (!result) {
                    reject(new Error("圖片壓縮失敗"));
                    return;
                }
                resolve(result);
            },
            outputType,
            quality,
        );
    });

    const ext = outputType === "image/png" ? "png" : "jpg";
    const safeName = file.name.replace(/\.[^.]+$/, "");

    return new File(
        [blob],
        `${safeName}-compressed.${ext}`,
        { type: outputType },
    );
}
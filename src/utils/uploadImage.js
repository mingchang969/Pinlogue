import { compressImage } from "./imageCompress";

const WORKER_URL = process.env.REACT_APP_WORKER_URL;

if (!WORKER_URL) {
    console.warn("缺少 REACT_APP_WORKER_URL 環境變數");
}

const MAX_ORIGINAL_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_COMPRESSED_SIZE = 700 * 1024; // 700KB

export async function uploadImage(file, type = "poi", options = {}) {
    const {
        onStatusChange,
    } = options;

    if (!file) {
        throw new Error("沒有選到檔案");
    }

    if (!WORKER_URL) {
        throw new Error("未設定 REACT_APP_WORKER_URL");
    }

    if (!file.type.startsWith("image/")) {
        throw new Error("只能上傳圖片檔");
    }

    if (file.size > MAX_ORIGINAL_SIZE) {
        throw new Error("原始圖片不能超過 20MB");
    }

    onStatusChange?.("compressing");

    let uploadFile = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
        fileType: "image/webp"
    });

    if (uploadFile.size > MAX_COMPRESSED_SIZE) {

        uploadFile = await compressImage(uploadFile, {
            maxWidth: 1200,
            maxHeight: 1200,
            quality: 0.7,
            fileType: "image/webp",
        });

    }

    if (uploadFile.size > MAX_COMPRESSED_SIZE) {
        throw new Error("圖片太大，請換小一點的圖片");
    }

    console.log("原始大小:", file.size);
    console.log("壓縮後大小:", uploadFile.size);

    onStatusChange?.("uploading");

    const formData = new FormData();
    formData.append(
        "file",
        uploadFile,
        `image-${Date.now()}.webp`
    );
    formData.append("type", type);

    // console.log("WORKER_URL =", WORKER_URL);
    // console.log("upload URL =", `${WORKER_URL}/upload`);

    const res = await fetch(`${WORKER_URL}/upload`, {
        method: "POST",
        body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
        throw new Error(data.error || "上傳失敗");
    }

    onStatusChange?.("done");

    return data;
}

export async function deleteImageByKey(key) {
    if (!key) return;

    if (!WORKER_URL) {
        throw new Error("未設定 REACT_APP_WORKER_URL");
    }

    const res = await fetch(`${WORKER_URL}/delete`, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
        throw new Error(data.error || "刪除圖片失敗");
    }

    return data;
}
import { compressImage } from "./imageCompress";

const WORKER_URL = process.env.REACT_APP_WORKER_URL;

if (!WORKER_URL) {
    console.warn("缺少 REACT_APP_WORKER_URL 環境變數");
}

const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_COMPRESSED_SIZE = 2 * 1024 * 1024; // 2MB

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
        throw new Error("原始圖片不能超過 10MB");
    }

    onStatusChange?.("compressing");

    let outputType = "image/jpeg";
    if (file.type === "image/png") {
        outputType = "image/png";
    }

    let uploadFile = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
        outputType,
    });

    if (uploadFile.size > MAX_COMPRESSED_SIZE) {
        throw new Error("壓縮後圖片仍超過 2MB，請換小一點的圖片!");
    }

    // console.log("原始大小:", file.size);
    // console.log("壓縮後大小:", uploadFile.size);

    onStatusChange?.("uploading");

    const formData = new FormData();
    formData.append("file", uploadFile);
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
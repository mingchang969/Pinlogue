const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs"); // 👉【新增】用來確保資料夾存在
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

/* --------------------------------------------------
   👉【🆕 重點 1】改成「多資料夾管理」
-------------------------------------------------- */
const BASE_UPLOAD_DIR = path.resolve(__dirname, "uploads");

const TYPE_MAP = {
  cover: "cover",
  trip: "trip",
  poi: "poi",
};

/* --------------------------------------------------
   👉【🆕 重點 2】啟動時建立所有資料夾（避免 ENOENT）
-------------------------------------------------- */
Object.values(TYPE_MAP).forEach((type) => {
  const dir = path.join(BASE_UPLOAD_DIR, type);
  fs.mkdirSync(dir, { recursive: true });
});

/* --------------------------------------------------
   👉【重點 3】靜態資源（維持）
-------------------------------------------------- */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* --------------------------------------------------
   👉【🆕 重點 4】multer 改成讀 query type
   ⚠️ 不再使用 req.body.type，避免 multipart timing 問題
-------------------------------------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.query.type || "poi";
    const folder = TYPE_MAP[type] || "poi";
    const dir = path.join(BASE_UPLOAD_DIR, folder);

    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* --------------------------------------------------
   👉【🆕 重點 5】上傳圖片 API（支援 query type）
-------------------------------------------------- */
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "沒有收到檔案" });
    }

    const type = req.query.type || "poi";

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${type}/${req.file.filename}`;

    res.json({
      imageUrl,
      type,
      temp: true,
      uploadedAt: Date.now(),
    });
  } catch (err) {
    console.error("上傳出錯:", err);
    res.status(500).json({ error: "上傳失敗" });
  }
});

/* --------------------------------------------------
   👉（保留）圖片確認 API
-------------------------------------------------- */
app.post("/confirm-image", (req, res) => {
  res.json({ ok: true });
});

/* --------------------------------------------------
   pinList API
-------------------------------------------------- */
app.get("/pinList", async (req, res) => {
  try {
    const snapshot = await db.collection("markers").get();
    const markers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(markers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "讀取 markers 失敗" });
  }
});

/* --------------------------------------------------
   👉【🆕 重點 6】編輯地標/行程（支援多類型圖片）
   ⚠️ 這裡也改成讀 query type
-------------------------------------------------- */
app.patch("/marker/:id", upload.single("file"), async (req, res) => {
  const { id } = req.params;
  const { title, intro, markerTag } = req.body;
  const type = req.query.type || "cover";

  try {
    const docRef = db.collection("markers").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "marker 不存在" });
    }

    const oldData = docSnap.data();
    let imageUrl = oldData.imageUrl;

    if (req.file) {
      if (imageUrl) {
        const match = imageUrl.match(/uploads\/(.*?)\/(.*)$/);
        if (match) {
          const [, oldType, filename] = match;
          const oldPath = path.join(BASE_UPLOAD_DIR, oldType, filename);

          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }

      imageUrl = `${req.protocol}://${req.get("host")}/uploads/${type}/${req.file.filename}`;
    }

    await docRef.update({
      title,
      intro,
      markerTag,
      imageUrl,
      updatedAt: new Date(),
    });

    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error("編輯 marker 失敗:", err);
    res.status(500).json({ error: "編輯 marker 失敗" });
  }
});
app.patch("/trip/:id", upload.single("file"), async (req, res) => {
  const { id } = req.params;
  const { title, intro, tag, days } = req.body;
  const type = req.query.type || "trip";

  try {
    const docRef = db.collection("trips").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "trip 不存在" });
    }

    const oldData = docSnap.data();
    let imageUrl = oldData.imageUrl;

    // 如果有新圖片，先刪舊圖
    if (req.file) {
      if (imageUrl) {
        const match = imageUrl.match(/uploads\/(.*?)\/(.*)$/);
        if (match) {
          const [, oldType, filename] = match;
          const oldPath = path.join(BASE_UPLOAD_DIR, oldType, filename);

          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }

      imageUrl = `${req.protocol}://${req.get("host")}/uploads/${type}/${req.file.filename}`;
    }

    await docRef.update({
      title,
      intro,
      tag,
      days: days ? JSON.parse(days) : oldData.days,
      imageUrl,
      updatedAt: new Date(),
    });

    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error("編輯 trip 失敗:", err);
    res.status(500).json({ error: "編輯 trip 失敗" });
  }
});

/* --------------------------------------------------
   👉【🆕 重點 7】刪除地標/行程（支援多資料夾）
-------------------------------------------------- */
app.delete("/marker/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const docRef = db.collection("markers").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "marker 不存在" });
    }

    const data = docSnap.data();

    if (data.imageUrl) {
      const match = data.imageUrl.match(/uploads\/(.*?)\/(.*)$/);
      if (match) {
        const [, type, filename] = match;
        const filePath = path.join(BASE_UPLOAD_DIR, type, filename);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await docRef.delete();

    res.json({ success: true });
  } catch (err) {
    console.error("刪除 marker 失敗:", err);
    res.status(500).json({ error: "刪除 marker 失敗" });
  }
});
app.delete("/trip/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const docRef = db.collection("trips").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "trip 不存在" });
    }

    const data = docSnap.data();

    if (data.imageUrl) {
      const match = data.imageUrl.match(/uploads\/(.*?)\/(.*)$/);
      if (match) {
        const [, type, filename] = match;
        const filePath = path.join(BASE_UPLOAD_DIR, type, filename);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    await docRef.delete();

    res.json({ success: true });
  } catch (err) {
    console.error("刪除 trip 失敗:", err);
    res.status(500).json({ error: "刪除 trip 失敗" });
  }
});

/* --------------------------------------------------
   👉【🆕 重點 8】孤兒圖片清理（同時檢查 markers + trips）
-------------------------------------------------- */
async function cleanOrphanImages() {
  try {
    const usedFiles = new Set();

    // ① markers
    const markerSnapshot = await db.collection("markers").get();
    markerSnapshot.docs.forEach((doc) => {
      const imageUrl = doc.data().imageUrl;
      if (!imageUrl) return;

      const match = imageUrl.match(/uploads\/(.*?)\/(.*)$/);
      if (match) {
        const [, type, filename] = match;
        usedFiles.add(`${type}/${filename}`);
      }
    });

    // ② trips
    const tripSnapshot = await db.collection("trips").get();
    tripSnapshot.docs.forEach((doc) => {
      const imageUrl = doc.data().imageUrl;
      if (!imageUrl) return;

      const match = imageUrl.match(/uploads\/(.*?)\/(.*)$/);
      if (match) {
        const [, type, filename] = match;
        usedFiles.add(`${type}/${filename}`);
      }
    });

    // ③ 掃所有資料夾
    Object.values(TYPE_MAP).forEach((type) => {
      const dir = path.join(BASE_UPLOAD_DIR, type);
      const files = fs.readdirSync(dir);

      files.forEach((file) => {
        const key = `${type}/${file}`;
        if (!usedFiles.has(key)) {
          fs.unlinkSync(path.join(dir, file));
          console.log("🧹 刪除孤兒圖片:", key);
        }
      });
    });
  } catch (err) {
    console.error("清理孤兒圖片失敗:", err);
  }
}

// 每 10 分鐘清理一次
setInterval(cleanOrphanImages, 1000 * 60 * 10);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
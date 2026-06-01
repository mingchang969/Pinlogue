const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();
const db = admin.firestore();

/**
 * 更新指定 collection 的排行資料
 *
 * @param {string} collectionName 要更新的 collection 名稱，例如 markers 或 trips
 * @param {number} limitCount 排行榜保留前幾名
 * @return {Promise<void>}
 */
async function updateRankingByCollection(collectionName, limitCount = 200) {
  const snapshot = await db
    .collection(collectionName)
    .orderBy("clickCount", "desc")
    .limit(limitCount)
    .get();

  if (snapshot.empty) {
    console.log(`No documents found in ${collectionName}`);
    return;
  }

  const oldRankSnapshot = await db
    .collection(collectionName)
    .where("rank", "<=", limitCount)
    .get();

  const newTopIds = new Set(snapshot.docs.map((doc) => doc.id));

  let rank = 1;
  let batch = db.batch();
  let operationCount = 0;
  const commits = [];

  // 更新新的排行榜
  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data.rank !== rank) {
      batch.update(doc.ref, {
        lastRank: data.rank || 999999999,
        rank: rank,
      });
      operationCount++;
    }

    rank++;

    if (operationCount === 500) {
      commits.push(batch.commit());
      batch = db.batch();
      operationCount = 0;
    }
  }

  // 清理掉榜外的舊資料
  for (const doc of oldRankSnapshot.docs) {
    if (!newTopIds.has(doc.id)) {
      batch.update(doc.ref, {
        lastRank: doc.data().rank || 999999999,
        rank: 999999999,
      });
      operationCount++;

      if (operationCount === 500) {
        commits.push(batch.commit());
        batch = db.batch();
        operationCount = 0;
      }
    }
  }

  if (operationCount > 0) {
    commits.push(batch.commit());
  }

  await Promise.all(commits);

  console.log(`Ranking updated for ${collectionName}: Top ${limitCount}`);
}

/**
 * HTTP 觸發版本（手動觸發）
 * 用途：
 * 1. 開發時測試用
 * 2. 你可以直接用網址或 Postman 觸發
 */

exports.updateAllRankingHttp = functions.https.onRequest(async (req, res) => {
  try {
    await updateRankingByCollection("markers", 200);
    await updateRankingByCollection("trips", 200);

    res.send("Markers and trips ranking update completed");
  } catch (err) {
    console.error("Error updating rankings:", err);
    res.status(500).send("Error updating rankings: " + err.message);
  }
});

/**
 * Scheduled 版本（-即使本地端關掉- 自動每 6 小時更新排名）
 * 建議：測試階段 用完後關掉cloud function，要用再deploy!
 * 注意：firebase免費額度為： 50k reads/day 和 20k writes/day
 * 所以 當 刷新頻率 設定6小時 和 地標 超過5k個時 會開始收費！！
 */

exports.updateAllRankingAuto = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "Asia/Taipei",
  },
  async () => {
    console.log("Auto ranking scheduler triggered");

    try {
      await updateRankingByCollection("markers", 200);
      await updateRankingByCollection("trips", 200);
    } catch (err) {
      console.error(err);
    }
  },
);

/**
 * 計算多元分數
 */
function calculateDiversityScore(data) {
  const markerCount = data.markerCount || 0;
  const tripCount = data.tripCount || 0;
  const clickCount = data.clickCount || 0;

  return (
    markerCount * 4 +
    tripCount * 5 +
    Math.log10(clickCount + 1) * 3
  );
}

/**
 * 更新 maps diversityScore
 */
async function updateMapScores() {
  const snapshot = await db.collection("maps").get();

  let batch = db.batch();
  let operationCount = 0;
  const commits = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const diversityScore = calculateDiversityScore(data);

    if (data.diversityScore !== diversityScore) {
      batch.update(doc.ref, {
        diversityScore,
      });

      operationCount++;
    }

    if (operationCount === 500) {
      commits.push(batch.commit());
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    commits.push(batch.commit());
  }

  await Promise.all(commits);

  console.log("Map diversity scores updated");
}

/**
 * 通用排行榜更新器
 */
async function updateMapRanking({
  orderField,
  rankField,
  lastRankField,
  limitCount = 200,
}) {
  const snapshot = await db
    .collection("maps")
    .orderBy(orderField, "desc")
    .limit(limitCount)
    .get();

  if (snapshot.empty) {
    console.log(`No maps found for ${orderField}`);
    return;
  }

  const oldRankSnapshot = await db
    .collection("maps")
    .where(rankField, "<=", limitCount)
    .get();

  const newTopIds = new Set(snapshot.docs.map((doc) => doc.id));

  let rank = 1;
  let batch = db.batch();
  let operationCount = 0;
  const commits = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (data[rankField] !== rank) {
      batch.update(doc.ref, {
        [lastRankField]: data[rankField] || 999999999,
        [rankField]: rank,
      });

      operationCount++;
    }

    rank++;

    if (operationCount === 500) {
      commits.push(batch.commit());
      batch = db.batch();
      operationCount = 0;
    }
  }

  for (const doc of oldRankSnapshot.docs) {
    if (!newTopIds.has(doc.id)) {
      batch.update(doc.ref, {
        [lastRankField]: doc.data()[rankField] || 999999999,
        [rankField]: 999999999,
      });

      operationCount++;
    }

    if (operationCount === 500) {
      commits.push(batch.commit());
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    commits.push(batch.commit());
  }

  await Promise.all(commits);

  console.log(`${rankField} updated`);
}

/**
 * 更新全部 maps 排行
 */
async function updateAllMapRankings() {
  await updateMapScores();

  await updateMapRanking({
    orderField: "clickCount",
    rankField: "hotRank",
    lastRankField: "lastHotRank",
  });

  await updateMapRanking({
    orderField: "diversityScore",
    rankField: "diverseRank",
    lastRankField: "lastDiverseRank",
  });

  await updateMapRanking({
    orderField: "createdAt",
    rankField: "newRank",
    lastRankField: "lastNewRank",
  });
}

/**
 * HTTP 手動觸發
 */
exports.updateMapsRankingHttp = functions.https.onRequest(async (req, res) => {
  try {
    await updateAllMapRankings();
    res.send("Maps rankings updated successfully");
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

/**
 * 每 6 小時自動更新
 */
exports.updateMapsRankingAuto = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "Asia/Taipei",
  },
  async () => {
    console.log("Auto map ranking update started");

    try {
      await updateAllMapRankings();
    } catch (err) {
      console.error(err);
    }
  }
);

/**
 * ============================
 * 🔧 Ranking 更新使用說明
 * ============================
 *
 * 【一】手動更新（開發 / 測試用）
 *
 * 1️⃣ 先 deploy HTTP function
 *
 * 指令：
 * firebase deploy --only functions:updateAllRankingHttp
 *
 * 2️⃣ 取得 function URL（deploy 後終端會顯示）
 * 例如：
 * https://us-central1-你的專案.cloudfunctions.net/updateRankingHttp
 *
 * 3️⃣ 在瀏覽器開啟或用 Postman / fetch 呼叫
 *
 * 瀏覽器：
 * 直接貼網址打開即可
 *
 * 或前端呼叫：
 * fetch("https://你的URL/updateRankingHttp")
 *
 * 👉 作用：
 * 手動觸發一次 ranking 更新
 *
 *
 * ----------------------------
 *
 * 【二】自動更新（正式環境用）
 *
 * 1️⃣ deploy 排程 function
 *
 * 指令：
 * firebase deploy --only functions:updateAllRankingAuto
 *
 * 👉 deploy 完後：
 * 不需要再做任何事情，它會自動執行
 *
 *
 * 2️⃣ 排程設定（在程式內）
 *
 * schedule: "every 6 hours"
 * timeZone: "Asia/Taipei"
 *
 * 👉 表示：
 * 每 6 小時自動執行一次 ranking 更新
 *
 *
 * ----------------------------
 *
 * 【三】關閉 / 停用自動更新
 *
 * 方法 1️⃣：直接刪掉 function 再 deploy
 *
 * firebase deploy --only functions
 *
 * （把 updateRankingAuto 刪掉）
 *
 *
 * 方法 2️⃣：在 Firebase Console 手動刪除
 *
 * 步驟：
 * Firebase Console → Functions → 找到 updateRankingAuto → 刪除
 *
 *
 * ----------------------------
 *
 * 【四】注意事項（很重要⚠️）
 *
 * 1️⃣ Cloud Functions 是跑在雲端
 * 👉 就算你電腦關掉，它還是會執行
 *
 *
 * 2️⃣ 會消耗 Firestore 額度：
 *
 * - read（讀資料）
 * - write（更新 rank）
 *
 * 免費額度（約）：
 * - 50,000 reads / day
 * - 20,000 writes / day
 *
 *
 * 3️⃣ 資料越多 + 排程越頻繁 = 越容易收費
 *
 * 👉 建議：
 * 開發時用 HTTP 手動觸發
 * 正式上線才開自動排程
 *
 *
 * ----------------------------
 *
 * 【五】同時更新 markers + trips（如果你有做）
 *
 * 在 function 裡會這樣呼叫：
 *
 * await updateRankingByCollection("markers", 200);
 * await updateRankingByCollection("trips", 200);
 *
 * 👉 表示：
 * markers 排行 + trips 排行 一起更新
 *
 *
 * ============================
 */

exports.getImageKeys = functions.https.onRequest(async (req, res) => {
  try {
    const markerSnap = await db.collection("markers").get();
    const tripSnap = await db.collection("trips").get();

    const keys = [];

    markerSnap.forEach((doc) => {
      const data = doc.data();
      if (data.imageKey && typeof data.imageKey === "string") {
        keys.push(data.imageKey);
      }
    });

    tripSnap.forEach((doc) => {
      const data = doc.data();
      if (data.imageKey && typeof data.imageKey === "string") {
        keys.push(data.imageKey);
      }
    });

    res.set("Access-Control-Allow-Origin", "*");
    res.status(200).json({
      ok: true,
      keys,
    });
  } catch (err) {
    console.error("getImageKeys error:", err);
    res.status(500).json({
      ok: false,
      error: err.message || "failed to get image keys",
    });
  }
});

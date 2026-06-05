const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

const db = admin.firestore();

const LIMIT_COUNT = 200;
const OUTSIDE_RANK = 999999999;
const MAX_BATCH = 450;


/*
|--------------------------------------------------------------------------
| 更新 map subcollection 排名
|--------------------------------------------------------------------------
*/

async function updateRankingInMapSubCollection(
  mapId,
  collectionName,
  limitCount = LIMIT_COUNT,
) {

  const collectionRef =
    db.collection("maps")
      .doc(mapId)
      .collection(collectionName);

  const snapshot =
    await collectionRef
      .orderBy("clickCount", "desc")
      .get();

  if (snapshot.empty) {

    console.log(`${mapId}/${collectionName} empty`);

    return;

  }

  const topDocs =
    snapshot.docs.slice(0, limitCount);

  const rankMap =
    new Map();

  topDocs.forEach((doc, index) => {

    rankMap.set(
      doc.id,
      index + 1,
    );

  });

  let batch = db.batch();

  let operationCount = 0;

  const commits = [];

  for (const doc of snapshot.docs) {

    const data =
      doc.data();

    const newRank =
      rankMap.get(doc.id) ??
      OUTSIDE_RANK;

    if (data.rank !== newRank) {

      batch.update(
        doc.ref,
        {

          lastRank:
            data.rank ??
            OUTSIDE_RANK,

          rank:
            newRank,

        },
      );

      operationCount++;

    }

    if (
      operationCount >=
      MAX_BATCH
    ) {

      commits.push(
        batch.commit(),
      );

      batch =
        db.batch();

      operationCount = 0;

    }

  }

  if (
    operationCount > 0
  ) {

    commits.push(
      batch.commit(),
    );

  }

  await Promise.all(
    commits,
  );

  console.log(
    `${mapId}/${collectionName} updated`,
  );

}


/*
|--------------------------------------------------------------------------
| 更新所有 maps marker/trip 排名
|--------------------------------------------------------------------------
*/

async function updateAllMapSubCollectionRankings() {

  const mapsSnapshot =
    await db
      .collection("maps")
      .get();

  for (
    const mapDoc
    of mapsSnapshot.docs
  ) {

    const mapId =
      mapDoc.id;

    await Promise.all([

      updateRankingInMapSubCollection(
        mapId,
        "markers",
      ),

      updateRankingInMapSubCollection(
        mapId,
        "trips",
      ),

    ]);

  }

}


/*
|--------------------------------------------------------------------------
| HTTP 手動觸發
|--------------------------------------------------------------------------
*/

exports.updateAllRankingHttp =
functions.https.onRequest(
async(req,res)=>{

try{

 await updateAllMapSubCollectionRankings();

 res.send(
  "Ranking updated",
 );

}catch(err){

 console.error(err);

 res
 .status(500)
 .send(err.message);

}

});



/*
|--------------------------------------------------------------------------
| Scheduler 自動更新
|--------------------------------------------------------------------------
*/

exports.updateAllRankingAuto =
onSchedule(
{
 schedule:
  "every 6 hours",

 timeZone:
  "Asia/Taipei",

},
async()=>{

 try{

  console.log(
   "Auto ranking start",
  );

  await updateAllMapSubCollectionRankings();

 }catch(err){

  console.error(
   err,
  );

 }

}
);



/*
|--------------------------------------------------------------------------
| Maps ranking
|--------------------------------------------------------------------------
*/

function calculateDiversityScore(
 data,
){

 const markerCount =
  data.markerCount ||
  0;

 const tripCount =
  data.tripCount ||
  0;

 const clickCount =
  data.clickCount ||
  0;

 return (

  markerCount*4+

  tripCount*5+

  Math.log10(
   clickCount+1,
  )*3

 );

}



async function updateMapScores(){

 const snapshot =
 await db
 .collection("maps")
 .get();

 let batch =
 db.batch();

 let count=0;

 const commits=[];

 for(
  const doc
  of snapshot.docs
 ){

  const data=
  doc.data();

  const score=
  calculateDiversityScore(
   data,
  );

  if(
   data.diversityScore
   !==score
  ){

   batch.update(
    doc.ref,
    {
     diversityScore:
      score,
    },
   );

   count++;

  }

  if(
   count>=MAX_BATCH
  ){

   commits.push(
    batch.commit(),
   );

   batch=
   db.batch();

   count=0;

  }

 }

 if(count>0){

  commits.push(
   batch.commit(),
  );

 }

 await Promise.all(
  commits,
 );

}



async function updateMapRanking({
 orderField,
 rankField,
 lastRankField,
 limitCount=
 LIMIT_COUNT,
}){

 const snapshot=
 await db
 .collection("maps")
 .orderBy(
  orderField,
  "desc",
 )
 .get();

 if(snapshot.empty){

  return;

 }

 const topDocs=
 snapshot.docs.slice(
  0,
  limitCount,
 );

 const rankMap=
 new Map();

 topDocs.forEach(
 (doc,index)=>{

 rankMap.set(
 doc.id,
 index+1,
 );

 });

 let batch=
 db.batch();

 let count=0;

 const commits=[];

 for(
 const doc
 of snapshot.docs
 ){

 const data=
 doc.data();

 const newRank=

 rankMap.get(
 doc.id,
 )??

 OUTSIDE_RANK;

 if(
 data[
 rankField
 ]!==newRank
 ){

 batch.update(
 doc.ref,
 {

 [lastRankField]:

 data[
 rankField
 ]??

 OUTSIDE_RANK,

 [rankField]:

 newRank,

 }

 );

 count++;

 }

 if(
 count>=MAX_BATCH
 ){

 commits.push(
 batch.commit(),
 );

 batch=
 db.batch();

 count=0;

 }

 }

 if(count>0){

 commits.push(
 batch.commit(),
 );

 }

 await Promise.all(
 commits,
 );

}



async function updateAllMapRankings(){

 await updateMapScores();

 await updateMapRanking({

 orderField:
 "clickCount",

 rankField:
 "hotRank",

 lastRankField:
 "lastHotRank",

 });

 await updateMapRanking({

 orderField:
 "diversityScore",

 rankField:
 "diverseRank",

 lastRankField:
 "lastDiverseRank",

 });

 await updateMapRanking({

 orderField:
 "createdAt",

 rankField:
 "newRank",

 lastRankField:
 "lastNewRank",

 });

}



exports.updateMapsRankingHttp =
functions.https.onRequest(
async(req,res)=>{

try{

 await updateAllMapRankings();

 res.send(
 "maps updated",
 );

}catch(err){

 console.error(
 err,
 );

 res
 .status(500)
 .send(
 err.message,
 );

}

});



exports.updateMapsRankingAuto =
onSchedule(
{
 schedule:
 "every 6 hours",

 timeZone:
 "Asia/Taipei",

},
async()=>{

 try{

 await updateAllMapRankings();

 }catch(err){

 console.error(
 err,
 );

 }

}
);



/*
|--------------------------------------------------------------------------
| getImageKeys
|--------------------------------------------------------------------------
*/

exports.getImageKeys =
functions.https.onRequest(
async(req,res)=>{

try{

 const mapsSnap=
 await db
 .collection("maps")
 .get();

 const keys=[];

 for(
 const mapDoc
 of mapsSnap.docs
 ){

 const markerSnap=

 await mapDoc.ref
 .collection(
 "markers",
 )
 .get();

 const tripSnap=

 await mapDoc.ref
 .collection(
 "trips",
 )
 .get();

 markerSnap.forEach(
 doc=>{

 const data=
 doc.data();

 if(
 data.imageKey
 ){

 keys.push(
 data.imageKey,
 );

 }

 });

 tripSnap.forEach(
 doc=>{

 const data=
 doc.data();

 if(
 data.imageKey
 ){

 keys.push(
 data.imageKey,
 );

 }

 });

 }

 res.json({

 ok:true,

 keys,

 });

}catch(err){

 console.error(
 err,
 );

 res
 .status(500)
 .json({

 ok:false,

 error:
 err.message,

 });

}

});
import { collection, doc } from "firebase/firestore";
import { db } from "./firebase";

// collections
export const markersRef = (mapId) => {
  if (!mapId) throw new Error("mapId is required");
  return collection(db, "maps", mapId, "markers");
}

export const tripsRef = (mapId) => {
  if (!mapId) throw new Error("mapId is required");
  return collection(db, "maps", mapId, "trips");
}

export const tagsRef = (mapId) => {
  if (!mapId) throw new Error("mapId is required");
  return collection(db, "maps", mapId, "tags");
}

export const mapsRef = () => {
  return collection(db, "maps");
};

// documents
export const markerDocRef = (mapId, markerId) => {
  if (!mapId) throw new Error("mapId is required");
  return doc(db, "maps", mapId, "markers", markerId);
}


export const tripDocRef = (mapId, tripId) => {
  if (!mapId) throw new Error("mapId is required");
  return doc(db, "maps", mapId, "trips", tripId);
}


export const tagDocRef = (mapId, tagId) => {
  if (!mapId) throw new Error("mapId is required");
  return doc(db, "maps", mapId, "tags", tagId);
}


export const mapDocRef = (mapId) => {
  if (!mapId) throw new Error("mapId is required");
  return doc(db, "maps", mapId);
}

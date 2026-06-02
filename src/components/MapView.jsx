import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, Polyline } from "react-leaflet";
import { doc, collection, addDoc, updateDoc, deleteDoc, onSnapshot, increment } from "firebase/firestore";
import { db } from "../utils/firebase";
import L from "leaflet";
import ImageCropModal from "./ImageCropModal";
import VisualCover from "./VisualCover";
import { getCroppedImg } from "../utils/cropImage";

import Tag from "./Tag";
import SimpleSelect from "./SimpleSelect";
import TagSelect from "./TagSelect";
import MapEvents from "./MapEvents";
import TripItem from "./TripItem";

import { ReactComponent as Cross } from "../images/Cross.svg"
import { ReactComponent as Picture } from "../images/Picture.svg"
import { ReactComponent as Add } from "../images/Add.svg"
import { ReactComponent as Add_ } from "../images/Add_.svg"
import { ReactComponent as Edit_ } from "../images/Edit_.svg"
import { ReactComponent as Pin } from "../images/Pin.svg"
import { ReactComponent as AddPin } from "../images/AddPin.svg"
import { ReactComponent as CancelPin } from "../images/CancelPin.svg"
import { ReactComponent as SearchPin } from "../images/SearchPin.svg"
import { ReactComponent as LinkPin } from "../images/LinkPin.svg"

import { colorOptions, iconOptions, transportOptions, amenityOptions } from "../config/optionConfig";
import ReactDOMServer from 'react-dom/server';
import { uploadImage } from "../utils/uploadImage";
import {
    markersRef,
    tripsRef,
    tagsRef,
    markerDocRef,
    tripDocRef,
    tagDocRef,
    mapDocRef,
} from "../utils/mapRefs";

function MapView({
    isMobile, currentUser, mapId, markers, tags, trips, mode, tagPanelMode, setTagPanelMode, selected, setSelected, filterTag, setFilterTag,
    isEdit, setIsEdit, isCreate, setIsCreate, increaseClick, flyTarget, setFlyTarget, navigate,
    trip, setTrip, selectedDay, setSelectedDay, stepTrip, setStepTrip, editTripSelected, setEditTripSelected,
    addPlace, editPlace, view, expandHalf }) {

    const [tempPos, setTempPos] = useState(null);  // tempPos：使用者點擊地圖後的暫存座標（lat, lng）

    const [title, setTitle] = useState(""); // 新增標記的 標題
    const [intro, setIntro] = useState(""); // 新增標記的 描述
    const [markerTag, setMarkerTag] = useState("");// 新增標記的 標籤

    const [tagTitle, setTagTitle] = useState("");
    const [tagColor, setTagColor] = useState("");
    const [tagIcon, setTagIcon] = useState("");

    const fileInputRef = useRef(null);
    const [file, setFile] = useState(null);      // 存使用者選的檔案

    const fileInputRefTrip = useRef(null);
    const [fileTrip, setFileTrip] = useState(null);      // 存使用者選的檔案 (Trip用)

    const [showCropModal, setShowCropModal] = useState(false);
    const [cropData, setCropData] = useState({
        crop: { x: 0, y: 0 },
        zoom: 1,
    });
    const [croppedPreviewUrl, setCroppedPreviewUrl] = useState("");

    const [showCropModalTrip, setShowCropModalTrip] = useState(false);
    const [cropDataTrip, setCropDataTrip] = useState({
        crop: { x: 0, y: 0 },
        zoom: 1,
    });
    const [croppedPreviewUrlTrip, setCroppedPreviewUrlTrip] = useState("");

    const selectedMarker = markers?.find((m) => m.id === selected);
    const selectedTrip = trips?.find(o => o.id === selected);

    const selectedTag = tags?.find((t) => t.id === filterTag);

    const [pois, setPois] = useState([]);
    const [radarRadius, setRadarRadius] = useState(0); // 搜尋雷達半徑
    const [searchCenter, setSearchCenter] = useState(null); // 搜尋中心點
    const [isSearching, setIsSearching] = useState(false); // 搜尋中

    const [keyingWord, setKeyingWord] = useState(""); // 輸入中文字
    const [addPinMode, setAddPinMode] = useState("link"); // 地標模式
    const [amenity, setAmenity] = useState(null); // 搜尋設施條件

    const [searchMessage, setSearchMessage] = useState(""); // 提示雲字
    const searchAbortRef = useRef(null); // 中止搜尋ref

    const overpassCacheRef = useRef(new Map()); // query快取

    const tagTrip = tags?.find(t => t.id === trip?.tag) || null;

    const scrollRef = useRef(null);

    const [uploadStatus, setUploadStatus] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const [uploadError, setUploadError] = useState("");

    const lastFitKeyRef = useRef(null);

    /* --------------------------------------------------
       👉【 監聽區 】
    -------------------------------------------------- */
    useEffect(() => { // 監聽 有訊息 和 搜尋結束 時，設3秒後消失提示雲
        if (!searchMessage || isSearching) return;
        const timer = setTimeout(() => setSearchMessage(""), 3000);
        return () => clearTimeout(timer);
    }, [searchMessage, isSearching]);

    useEffect(() => { // 雷達波動半徑
        if (!searchCenter || !isSearching) { setRadarRadius(0); return };

        let r = 0;
        const max = 1000;

        const timer = setInterval(() => {
            r += 40;
            if (r > max) r = 0;
            setRadarRadius(r);
        }, 50);

        return () => clearInterval(timer);
    }, [searchCenter, isSearching]);
    /* --------------------------------------------------
       👉【 地圖系統 】
    -------------------------------------------------- */
    // 點擊 飛入地標 或 適應地標範圍
    function FlyToMarker({ markers, flyTarget, trips }) {

        const map = useMap();

        // 觸發飛入(並判斷是否手機版飛入)
        function flyToWithOffset(lat, lng, zoom = 16) {

            const target = map.project(
                [lat, lng],
                zoom
            );

            const offsetY =
                window.innerWidth <= 768
                    ? 180   // 手機往上推
                    : 0;

            const offsetPoint = L.point(
                target.x,
                target.y + offsetY
            );

            const newLatLng =
                map.unproject(
                    offsetPoint,
                    zoom
                );

            map.flyTo(
                newLatLng,
                zoom,
                {
                    animate: true,
                    duration: 1.5,
                    easeLinearity: 0.25
                }
            );
        }

        useEffect(() => {
            if (!flyTarget) return;

            // 1. 直接支援 { lat, lng }
            if (
                typeof flyTarget === "object" &&
                flyTarget.lat != null &&
                flyTarget.lng != null
            ) {
                flyToWithOffset(
                    flyTarget.lat,
                    flyTarget.lng,
                    16
                )

                setTimeout(() => {
                    setFlyTarget(null);
                }, 100);
                return;
            }

            // 2. pinListMode：維持原本 marker id flyTo
            if (mode === "pinListMode") {
                const marker = markers.find(m => m.id === flyTarget);
                if (!marker) return;

                flyToWithOffset(
                    marker.lat,
                    marker.lng,
                    16
                )

                setTimeout(() => {
                    setFlyTarget(null);
                }, 100);
                return;
            }

            // 3. postMode：trip 改成抓全部 marker 做 fitBounds
            const tripData = trips.find((trip) => trip.id === flyTarget);
            if (!tripData) return;

            const tripPoints = tripData.days
                ?.flatMap(day => day.places || [])
                .filter(place => place.type !== "transport" && place.markerId)
                .map(place => markers.find(m => m.id === place.markerId))
                .filter(Boolean)
                .map(marker => [marker.lat, marker.lng]);

            if (!tripPoints || tripPoints.length === 0) return;

            if (tripPoints.length === 1) {
                flyToWithOffset(
                    tripPoints[0][0],
                    tripPoints[0][1],
                    14
                )
            } else {
                const bounds = L.latLngBounds(tripPoints);
                map.flyToBounds(bounds, {
                    paddingTopLeft:
                        isMobile
                            ? [24, 24]
                            : [240, 120],

                    paddingBottomRight:
                        isMobile
                            ? [24, 240]
                            : [360, 120],
                    maxZoom: 14,
                    animate: true,
                    duration: 1.5,
                    easeLinearity: 0.25
                });
            }

            setTimeout(() => {
                setFlyTarget(null);
            }, 100);
        }, [flyTarget, markers, trips, map]);

        return null;
    }

    // 自動 適應地標範圍
    function FitBoundsController({ points, disabled, fitKey, lastFitKeyRef }) {
        const map = useMap();

        useEffect(() => {
            if (disabled) return;
            if (!Array.isArray(points) || points.length === 0) return;
            if (lastFitKeyRef.current === fitKey) return;

            if (points.length === 1) {
                map.flyTo(points[0], 14, {
                    animate: true,
                    duration: 1.5,
                    easeLinearity: 0.25
                });
            } else {
                const bounds = L.latLngBounds(points);
                map.flyToBounds(bounds, {
                    paddingTopLeft: [240, 120],
                    paddingBottomRight: [240, 120],
                    maxZoom: 14,
                    animate: true,
                    duration: 1.5,
                    easeLinearity: 0.25
                });
            }
            lastFitKeyRef.current = fitKey;
        }, [points, map, disabled, fitKey, lastFitKeyRef]);

        return null;
    }

    // 以下條件值 變動時，將觸發 fitBounds
    const fitKey = `${mode}-${filterTag}-${selectedDay}`;

    // 將 markers 和 trip 所有 markers座標 轉成 陣列
    const visiblePoints = useMemo(() => {

        // 當pinList模式時，回傳全部 marker座標
        if (mode === "pinListMode") {
            const targetMarkers = filterTag
                ? markers.filter(m => m.markerTag === filterTag)
                : markers;
            return targetMarkers.map(m => [m.lat, m.lng]);
        }

        // 當點選了trip時，回傳該天全部 marker 座標
        if (selectedTrip) {
            return selectedTrip.days?.[selectedDay - 1]?.places
                ?.filter(p => p.type !== "transport" && p.markerId)
                .map(p => markers.find(m => m.id === p.markerId))
                .filter(Boolean)
                .map(m => [m.lat, m.lng]) || [];
        }

        // 當tripList模式時，回傳全部 trip 的第一天第一marker 座標
        if (mode === "postMode") {
            const targetTrips = filterTag
                ? trips.filter(t => t.tag === filterTag)
                : trips;
            return targetTrips
                .map(trip => {
                    const firstMarkerId =
                        trip.days?.[0]?.places
                            ?.find(p => p.type !== "transport")
                            ?.markerId;

                    const marker = markers.find(m => m.id === firstMarkerId);

                    return marker ? [marker.lat, marker.lng] : null;
                })
                .filter(Boolean);
        }

        return [];
    }, [mode, markers, trips, selectedTrip, selectedDay, filterTag]);

    // 雷達圓
    const searchCircle = useMemo(() => {
        if (!searchCenter) return null;

        return (
            <>
                <Circle
                    center={searchCenter}
                    radius={1000}
                    pathOptions={{
                        color: "#306bd7",
                        weight: 2,
                        opacity: 0.7,
                    }}
                />
                {isSearching && <Circle
                    center={searchCenter}
                    radius={radarRadius}
                    pathOptions={{
                        color: "#e0ebff",
                        weight: 1.5,
                        opacity: 0.4,
                    }}
                />}
            </>
        )

    }, [searchCenter, radarRadius]);

    // pois 組織query條件
    function buildOverpassQuery(searchCenter, amenity, keyword) {
        const selectedAmenityObj = amenityOptions.find(o => o.value === amenity);
        const [lat, lng] = searchCenter;

        const keywordFilter = keyword
            ? `["name"~"${keyword}", i]`
            : "";

        // 全部類別＋關鍵字
        if (!selectedAmenityObj || !selectedAmenityObj.key) {
            return `
[out:json][timeout:15];
(
  node${keywordFilter}(around:1000,${lat},${lng});
  way${keywordFilter}(around:1000,${lat},${lng});
);
out center 50;
`;
        }

        // 🔥 宗教類特別處理（雙條件）
        if (selectedAmenityObj.key === "religion") {
            return `
[out:json][timeout:15];
(
  node["amenity"="place_of_worship"]["religion"="${selectedAmenityObj.value}"]${keywordFilter}
    (around:1000,${lat},${lng});
  way["amenity"="place_of_worship"]["religion"="${selectedAmenityObj.value}"]${keywordFilter}
    (around:1000,${lat},${lng});
);
out center 50;
`;
        }

        // 一般情況：依 types 動態產生
        const filters = selectedAmenityObj.types
            .map(type =>
                `${type}["${selectedAmenityObj.key}"="${selectedAmenityObj.value}"]${keywordFilter}
        (around:1000,${lat},${lng});`
            )
            .join("\n");

        return `
[out:json][timeout:15];
(
${filters}
);
out center 50;
`;
    }

    // pois 搜尋系統
    async function handleSearchArea(keyword) {
        if (!searchCenter || (!keyword && !amenity)) return;

        // 如果前一次還在搜尋 → 先中斷
        if (searchAbortRef.current) {
            searchAbortRef.current.abort();
        }

        setIsSearching(true);
        setSearchMessage("搜尋中…");


        const query = buildOverpassQuery(searchCenter, amenity, keyword);
        const cacheKey = JSON.stringify({
            center: searchCenter,
            amenity,
            keyword,
        });

        if (overpassCacheRef.current.has(cacheKey)) { // 一樣的快取不在fetch
            const cached = overpassCacheRef.current.get(cacheKey);
            setPois(cached);
            setSearchMessage(`找到 ${cached.length} 個地點（快取）`);
            setIsSearching(false);
            searchAbortRef.current = null;
            return;
        }

        const controller = new AbortController(); //每次點擊建立新的控制器，可以 fetch時 使用
        searchAbortRef.current = controller;

        try {
            // 1️⃣ 指定新的 Overpass URL
            const OVERPASS_URL = "https://overpass.kumi.systems/api/interpreter";

            // 2️⃣ fetch 用 GET + query encode
            const res = await fetch(
                `${OVERPASS_URL}?data=${encodeURIComponent(query)}`,
                { signal: controller.signal } // 可中止 fetch
            );

            // 3️⃣ 檢查 HTTP 狀態
            if (!res.ok) throw new Error(`Overpass status ${res.status}`);

            // 4️⃣ 取得文字
            const text = await res.text();

            // 5️⃣ 檢查是不是 JSON（防止 HTML 錯誤頁）
            if (!text.trim().startsWith("{")) {
                console.error("Overpass raw response:", text);
                throw new Error("Overpass did not return JSON");
            }

            // 6️⃣ 解析 JSON
            const data = JSON.parse(text);
            const elements = Array.isArray(data.elements) ? data.elements : [];

            // 7️⃣ 設定 pois 與快取
            overpassCacheRef.current.set(cacheKey, elements);
            setPois(elements);

            setSearchMessage(
                elements.length === 0
                    ? `在這個範圍內找不到「${keyword}」`
                    : `找到 ${elements.length} 個地點`
            );

        } catch (err) {
            if (err.name === "AbortError") {
                setSearchMessage("搜尋已取消");
            } else {
                console.error(err);
                setPois([])
                setSearchMessage("搜尋失敗，請再試一次");
            }
        } finally {
            setIsSearching(false);
            searchAbortRef.current = null;
        }
    }

    // 分析GoogleMaps網址，取出 座標點
    function parseGoogleMapsUrl(url) {
        try {
            const decodedUrl = decodeURIComponent(url.trim());

            // 1. 先抓 !3dlat!4dlng（地標本身最常用）
            let match = decodedUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
            if (match) {
                return {
                    lat: parseFloat(match[1]),
                    lng: parseFloat(match[2]),
                    source: "!3d!4d",
                };
            }

            // 2. 再抓 ?q=lat,lng
            const urlObj = new URL(decodedUrl);
            const q = urlObj.searchParams.get("q");
            if (q) {
                const qMatch = q.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
                if (qMatch) {
                    return {
                        lat: parseFloat(qMatch[1]),
                        lng: parseFloat(qMatch[2]),
                        source: "q",
                    };
                }
            }

            // 3. 最後才抓 @lat,lng（通常只是視角中心）
            match = decodedUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
            if (match) {
                return {
                    lat: parseFloat(match[1]),
                    lng: parseFloat(match[2]),
                    source: "@",
                };
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    // 分析GoogleMaps網址，取出 標題
    function getPlaceNameFromGoogleUrl(url) {
        try {
            const decodedUrl = decodeURIComponent(url);
            const match = decodedUrl.match(/\/place\/([^/]+)/);
            if (match) {
                return match[1].replace(/\+/g, " ");
            }
            return "";
        } catch {
            return "";
        }
    }
    // GoogleMaps網址 搜尋系統
    function handleImportGoogleMap(link) {
        const result = parseGoogleMapsUrl(link);
        const name = getPlaceNameFromGoogleUrl(link)

        if (!result) {
            setSearchMessage("❌ 無法解析連結");
            setKeyingWord("");
            return;
        }

        const { lat, lng } = result;

        setTempPos({ lat, lng });
        setFlyTarget({ lat, lng });
        setTitle(name);
        setKeyingWord("");
        setSearchMessage("✅ 已匯入地標");
    }
    /* --------------------------------------------------
       👉【 Marker / Trip 】
    -------------------------------------------------- */
    //// 新增地標
    async function addMarker(lat, lng) {
        if (!title.trim()) {
            alert("請完整填寫標題、標籤、描述");
            return;
        }

        if (!tempPos && (!lat || !lng)) {
            alert("請重試點選地標");
            return;
        }

        let uploadedUrl = "";
        let uploadedKey = "";

        if (file) {
            try {
                setUploadError("");
                setIsUploading(true);
                const result = await uploadImage(file, "poi", {
                    onStatusChange: setUploadStatus,
                });
                uploadedUrl = result.url;
                uploadedKey = result.key;
            } catch (err) {
                setUploadError(err.message || "上傳失敗");
                return; // 很重要，直接中止
            } finally {
                setIsUploading(false);
                setUploadStatus("");
            }
        }

        await addDoc(markersRef(mapId), {
            title,
            markerTag,
            intro,
            imageUrl: uploadedUrl,
            imageKey: uploadedKey,
            cropData,
            lat: lat ? lat : tempPos.lat,
            lng: lng ? lng : tempPos.lng,
            clickCount: 0,
            rank: 999999999,
            lastRank: 999999999,
            createdAt: new Date(),
        });

        await updateDoc(mapDocRef(mapId), {
            markerCount: increment(1)
        });

        setTitle("");
        setIntro("");
        setMarkerTag("");
        setTempPos(null);
        setFile(null);
        setPois([]);
        setCropData({
            crop: { x: 0, y: 0 },
            zoom: 1,
        });
    }

    //// 新增行程
    async function addTrip() {
        if (!trip.title.trim() && !trip.days.every(day => day.places.length > 0 && day.places.every(p => (p.startTime && p.endTime) || p.transportType))) {
            alert("請完整添加標題、標籤、描述、行程");
            return;
        }

        let uploadedUrl = "";
        let uploadedKey = "";

        if (fileTrip) {
            try {
                setUploadError("");
                setIsUploading(true);
                const result = await uploadImage(fileTrip, "trip", {
                    onStatusChange: setUploadStatus,
                });
                uploadedUrl = result.url;
                uploadedKey = result.key;
            } catch (err) {
                setUploadError(err.message || "上傳失敗");
                return; // 很重要，直接中止
            } finally {
                setIsUploading(false);
                setUploadStatus("");
            }
        }

        await addDoc(tripsRef(mapId), {
            ...trip,
            imageUrl: uploadedUrl,
            imageKey: uploadedKey,
            cropData: cropDataTrip,
        });

        await updateDoc(mapDocRef(mapId), {
            tripCount: increment(1)
        });

        setIsCreate(false);
        setEditTripSelected("");
        setSelectedDay(1);
        setStepTrip(1);
        // 清空暫存
        setTrip({
            title: "",
            intro: "",
            tag: "",
            imageUrl: "",
            days: [{
                places: []
            },]
        });
        setFileTrip(null);
        setCropDataTrip({
            crop: { x: 0, y: 0 },
            zoom: 1,
        });

    }

    // 上傳預覽圖
    const [previewUrl, setPreviewUrl] = useState(null);
    useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // 上傳預覽圖 (Trip用)
    const [previewUrlTrip, setPreviewUrlTrip] = useState(null);
    useEffect(() => {
        if (!fileTrip) return;
        const url = URL.createObjectURL(fileTrip);
        setPreviewUrlTrip(url);
        return () => URL.revokeObjectURL(url);
    }, [fileTrip]);

    /* --------------------------------------------------
       👉【 Tag 】
    -------------------------------------------------- */
    // 新增標籤
    async function addTag() {

        // 若沒輸入標題就不新增
        if (!tagTitle.trim() || !tagColor || !tagIcon) return;
        // 新增一筆資料到 Firestore 的 tags 集合
        const tagType = mode === "pinListMode" ? "marker" : "trip";

        await addDoc(tagsRef(mapId), {
            tagTitle,
            tagColor,
            tagIcon,
            tagType,
            createdAt: new Date(),
        });
        // 清空輸入框與暫存 popup
        setTagTitle("");
        setTagColor("");
        setTagIcon("");
        setTagPanelMode("normal");
    }

    // 編輯標籤
    async function editTag() {

        // 若沒輸入標題就不編輯
        if (!tagTitle.trim() || !tagColor || !tagIcon) return;
        // 更新資料到 Firestore 的 tags 集合裡的 文件
        if (!filterTag) return;
        await updateDoc(tagDocRef(mapId, filterTag), {
            tagTitle,
            tagColor,
            tagIcon,
            updatedAt: new Date(),
        });
        // 清空輸入框與暫存 popup
        setTagTitle("");
        setTagColor("");
        setTagIcon("");
        setTagPanelMode("normal");
    }

    // 刪除標籤
    async function deleteTag() {

        // 刪除該 Firestore 的 tags 集合裡的 文件
        if (!filterTag) return;

        await deleteDoc(tagDocRef(mapId, filterTag));
        // 清空輸入框與暫存 popup
        setFilterTag("");
        setTagTitle("");
        setTagColor("");
        setTagIcon("");
        setTagPanelMode("normal");
    }
    /* --------------------------------------------------
       👉【 Marker / Trip 圖標 】
    -------------------------------------------------- */
    // 手動 marker Icon 設定
    function createSvgIcon_original() {
        const iconSvgString = ReactDOMServer.renderToStaticMarkup(<Pin style={{ color: "#fff" }} />);
        const svg = `
<div class="marker">
  <svg width="38" height="44" viewBox="0 0 38 44"
       xmlns="http://www.w3.org/2000/svg">
    <foreignObject x="0" y="0" width="38" height="44">
      <div xmlns="http://www.w3.org/1999/xhtml" class="marker-wrap">
        <div class="marker-inner">
         <div class="pin">
          ${iconSvgString}
         </div>
        </div>
      </div>
    </foreignObject>
  </svg>
</div>
`;
        return L.divIcon({
            className: "", // 去掉預設樣式
            html: svg,
            iconSize: [38, 44],
            iconAnchor: [19, 44], // 對齊底部中心
        });
    }

    // 關鍵字 marker Icon 設定
    function createSvgIcon_pois(title) {
        const iconSvgString = ReactDOMServer.renderToStaticMarkup(<Pin style={{ color: "#333" }} />);
        const svg = `
<div class="marker">
  <svg width="38" height="44" viewBox="0 0 38 44"
       xmlns="http://www.w3.org/2000/svg">
    <foreignObject x="0" y="0" width="38" height="44">
      <div xmlns="http://www.w3.org/1999/xhtml" class="marker-wrap">
        <div class="marker-inner">
         <div class="pin">
          ${iconSvgString}
         </div>
        </div>
      </div>
    </foreignObject>
  </svg>
    <div class="marker-label" style="color:#aaa;">
    ${title}
  </div>
</div>
`;
        return L.divIcon({
            className: "", // 去掉預設樣式
            html: svg,
            iconSize: [38, 44],
            iconAnchor: [19, 44], // 對齊底部中心
        });
    }

    // 已建好的 marker
    function createSvgIcon(tagValue, title, placeNumber) {
        const tag = tags.find(t => t.id === tagValue);

        let color = "#777";
        let icon = "bi bi-question-diamond-fill";

        if (tag) {
            color = tag.color;
            icon = tag.icon;
        }

        const iconSvgString = ReactDOMServer.renderToStaticMarkup(
            <Pin style={{ color }} />
        );

        const placeNumberHtml = placeNumber
            ? `<div class="placeNumberTag">${placeNumber}</div>`
            : "";

        const iClassString = `<i class="${icon}"></i>`;

        const svg = `
<div class="marker">
  <svg width="38" height="44" viewBox="0 0 38 44"
       xmlns="http://www.w3.org/2000/svg">
    <foreignObject x="0" y="0" width="38" height="44">
      <div xmlns="http://www.w3.org/1999/xhtml" class="marker-wrap">
        <div class="marker-inner">
         <div class="pin">
          ${iconSvgString}
         </div>
         <div class="category-icon">
          ${iClassString}
         </div>
        </div>
      </div>
    </foreignObject>
  </svg>

  <div class="marker-label" style="color:${color};">
    ${placeNumberHtml}${title}
  </div>
</div>
`;

        return L.divIcon({
            className: "", // 去掉預設樣式
            html: svg,
            iconSize: [38, 44],
            iconAnchor: [19, 36], // 對齊底部中心
        });
    }

    // 已建好的 trip
    function createSvgIcon_trip(tagValue, title, daysLength) {
        const tag = tags.find(t => t.id === tagValue);

        let color = "#777";
        let icon = "bi bi-question-diamond-fill";

        if (tag) {
            color = tag.color;
            icon = tag.icon;
        }

        const iClassString = `<i class="${icon}"></i>`;

        const svg = `
<div class="trip">
      <div  class="trip-wrap" style="background-color:${color}">    
    <div class="icon">${iClassString}</div>${daysLength}日遊
      </div>
    <div class="trip-label" style="color:${color}">
      ${title}
    </div>
</div>
`;

        return L.divIcon({
            className: "", // 去掉預設樣式
            html: svg,
            iconAnchor: [0, 0], // 對齊底部中心
        });
    }

    // 列出 有加入行程的地標 清單 (對應編號)
    const editingPlaceNumberMap = useMemo(() => {
        if (mode !== "postMode" || !(isCreate && stepTrip === 2) && !isEdit) {
            return {};
        }

        const currentPlaces = trip?.days?.[selectedDay - 1]?.places || [];
        let placeNumber = 0;
        const result = {};

        currentPlaces.forEach((place) => {
            if (place.type === "transport" || !place.markerId) return;

            placeNumber += 1;
            result[place.markerId] = placeNumber;
        });

        return result;
    }, [mode, isCreate, stepTrip, isEdit, trip, selectedDay]);
    /* --------------------------------------------------
       👉【 行程系統 】
    -------------------------------------------------- */

    // 行程(一般) 將行程的地標 轉成 座標陣列
    const tripDayRoutes = useMemo(() => {
        if (mode !== "postMode" || !selectedTrip) return [];

        return selectedTrip.days.map(day =>
            (day.places || [])
                .filter(place => place.type !== "transport" && place.markerId)
                .map(place => markers.find(m => m.id === place.markerId))
                .filter(Boolean)
                .map(marker => [marker.lat, marker.lng])
        ).filter(route => route.length >= 2);
    }, [mode, selectedTrip, markers]);

    // 行程(編輯/新增) 將行程的地標 轉成 座標陣列
    const editingTripDayRoutes = useMemo(() => {
        if (mode !== "postMode" || (!(isCreate && stepTrip === 2) && !isEdit)) {
            return [];
        }

        return trip?.days?.map(day =>
            (day.places || [])
                .filter(place => place.type !== "transport" && place.markerId)
                .map(place => markers.find(m => m.id === place.markerId))
                .filter(Boolean)
                .map(marker => [marker.lat, marker.lng])
        ).filter(route => route.length >= 2) || [];
    }, [mode, isCreate, stepTrip, isEdit, trip, markers]);

    // OnChange裡 自動提放進 setTrip()
    const handleTripChange = (eOrName, value) => {

        // 如果是 input / textarea
        if (eOrName?.target) {
            const { name, value } = eOrName.target
            setTrip(prev => ({
                ...prev,
                [name]: value
            }))
        } else {
            // 如果是 TagSelect
            const name = eOrName
            setTrip(prev => ({
                ...prev,
                [name]: value
            }))
        }
    }
    // 增加天數
    const addDay = () => {
        setTrip(prev => {
            const newDay = prev.totalDay + 1;
            return {
                ...prev,
                totalDay: newDay,
                days: [
                    ...prev.days,
                    { places: [] }
                ]
            }
        })
    }
    // 刪除該天
    const deleteDay = (dayToDelete) => {
        setTrip(prev => {
            const newDays = prev.days
                .filter((_, index) => index !== dayToDelete - 1) // 過濾掉要刪除的天
            return {
                ...prev,
                totalDay: newDays.length,
                days: newDays,
            };
        });
        // 如果刪掉的天是目前選中的 day，選回上一天，如果小於0至少會停留在1
        setSelectedDay(prev => {
            if (prev === dayToDelete) return Math.max(1, prev - 1);
            return prev;
        });
    };
    // 更改交通方式
    function updateTransportType(index, type) {
        setTrip(prev => ({
            ...prev,
            days: prev.days.map((day, i) => {
                if (i !== selectedDay - 1) return day;

                const newPlaces = [...day.places];
                newPlaces[index].transportType = type;

                return {
                    ...day,
                    places: newPlaces
                };
            })
        }));
    }
    // 將 分 轉為 小時和分
    function formatDuration(mins) {
        if (mins === null) return "無法計算"

        const h = Math.floor(mins / 60);
        const m = mins % 60;

        if (h === 0) return `${m}分`;
        if (m === 0) return `${h}小時`;

        return `${h} 小時 ${m} 分`
    }

    const handleMoveEnd = useCallback((info) => {
        if (isSearching) return;

        setSearchCenter((prev) => {
            if (
                prev &&
                prev[0] === info.center[0] &&
                prev[1] === info.center[1]
            ) {
                return prev;
            }
            return info.center;
        });
    }, [isSearching]);

    const visiblePointsKey = useMemo(() => {
        return JSON.stringify(visiblePoints);
    }, [visiblePoints]);

    return (
        <>
            {/* 地標 圖片裁切 modal */}
            {showCropModal && previewUrl && (
                <ImageCropModal
                    image={previewUrl}
                    initialCropData={cropData}
                    onCancel={() => setShowCropModal(false)}
                    onSave={async (data) => {
                        // 存 cropData（未來用）
                        setCropData({
                            crop: data.crop,
                            zoom: data.zoom,
                            croppedAreaPixels: data.croppedAreaPixels,
                        });

                        // 🔥 產生裁切預覽圖
                        const croppedImg = await getCroppedImg(
                            previewUrl,
                            data.croppedAreaPixels
                        );

                        setCroppedPreviewUrl(croppedImg);

                        setShowCropModal(false);
                    }}
                />
            )}

            {/* 行程 圖片裁切 modal */}
            {showCropModalTrip && previewUrlTrip && (
                <ImageCropModal
                    image={previewUrlTrip}
                    initialCropData={cropDataTrip}
                    onCancel={() => setShowCropModalTrip(false)}
                    onSave={async (data) => {
                        setCropDataTrip({
                            crop: data.crop,
                            zoom: data.zoom,
                            croppedAreaPixels: data.croppedAreaPixels,
                        });

                        const croppedImg = await getCroppedImg(
                            previewUrlTrip,
                            data.croppedAreaPixels
                        );

                        setCroppedPreviewUrlTrip(croppedImg);

                        setShowCropModalTrip(false);
                    }}
                />
            )}

            <div className="mapContainer">

                <div className="overlayUI"> {/* UI面板 */}

                    {mode === "pinListMode" ?
                        <>
                            {/* 標籤面板 */}
                            {!selected &&
                                <div className="tagPanel">
                                    {tagPanelMode === "normal" &&
                                        <>
                                            {currentUser ? !filterTag ?
                                                <Add_ className="button" onClick={() => setTagPanelMode("add")}></Add_> :
                                                <Edit_ className="button" onClick={() => { if (!selectedTag) return; setTagPanelMode("edit"); setTagTitle(selectedTag.label); setTagColor(selectedTag.colorName); setTagIcon(selectedTag.iconName) }}></Edit_>
                                                : null
                                            }
                                            <div className="tagsContainer">
                                                {tags.filter((tag => tag.tagType === "marker")).map((tag) => {
                                                    const isSelected = filterTag === tag?.id;
                                                    return < Tag
                                                        onClick={() => { isSelected ? setFilterTag(null) : setFilterTag(tag?.id) }}
                                                        key={tag?.id}
                                                        title={tag?.label}
                                                        icon={tag?.icon}
                                                        color={tag?.color}
                                                        style={!filterTag ? null : isSelected ? { borderColor: tag?.color } : { opacity: "0.7" }}
                                                    />
                                                })}
                                            </div>

                                        </>
                                    }
                                    {currentUser && tagPanelMode === "add" &&
                                        <>
                                            <input type="text"
                                                placeholder="輸入標籤名稱"
                                                value={tagTitle}
                                                onChange={(e) => setTagTitle(e.target.value)} />
                                            <SimpleSelect
                                                mode="color"
                                                options={colorOptions}
                                                value={tagColor}
                                                onChange={(v) => setTagColor(v)}
                                            />
                                            <SimpleSelect
                                                mode="icon"
                                                options={iconOptions}
                                                value={tagIcon}
                                                onChange={(v) => setTagIcon(v)}
                                            />
                                            <div onClick={addTag} className={`buttonFinish ${tagTitle.trim() && tagColor && tagIcon ? "" : "disable"} `}>新增</div>
                                            <div onClick={() => { setTagPanelMode("normal"); setTagTitle(""); setTagColor(""); setTagIcon(""); }} className="buttonCancel"><Cross /></div>
                                        </>}
                                    {currentUser && tagPanelMode === "edit" &&
                                        <>
                                            <input type="text"
                                                placeholder="輸入標籤名稱"
                                                value={tagTitle}
                                                onChange={(e) => setTagTitle(e.target.value)} />
                                            <SimpleSelect
                                                mode="color"
                                                options={colorOptions}
                                                value={tagColor}
                                                onChange={(v) => setTagColor(v)}
                                            />
                                            <SimpleSelect
                                                mode="icon"
                                                options={iconOptions}
                                                value={tagIcon}
                                                onChange={(v) => setTagIcon(v)}
                                            />
                                            <div onClick={editTag} className={`buttonFinish ${tagTitle.trim() && tagColor && tagIcon ? "" : "disable"} `}>更新</div>
                                            <div onClick={deleteTag} className="buttonDelete">刪除</div>
                                            <div onClick={() => { setTagPanelMode("normal"); setTagTitle(""); setTagColor(""); setTagIcon(""); }} className="buttonCancel"><Cross /></div>
                                        </>}

                                </div>}


                            {/* 新增按鈕 */}
                            {currentUser &&
                                <div className="AddPinPanel">
                                    {isCreate &&
                                        <>
                                            <button
                                                style={(addPinMode === "link") ? { backgroundColor: "#bec94a", width: "50px", height: "50px" } : { width: "42px", height: "42px" }}
                                                onClick={() => { setAddPinMode("link"), setKeyingWord("") }}>
                                                <LinkPin />
                                            </button>
                                            <button
                                                style={(addPinMode === "search") ? { backgroundColor: "#bec94a", width: "50px", height: "50px" } : { width: "42px", height: "42px" }}
                                                onClick={() => { setAddPinMode("search"), setKeyingWord("") }}>
                                                <SearchPin />
                                            </button>
                                        </>
                                    }
                                    {!selected &&
                                        <button
                                            style={isCreate ? { width: "42px", height: "42px", opacity: 0.8 } : { width: "50px", height: "50px" }}
                                            onClick={() => setIsCreate(!isCreate)}>
                                            {isCreate ? <CancelPin /> : <AddPin />}
                                        </button>}

                                </div>}


                            {/* 關鍵字搜尋介面 */}
                            {isCreate && addPinMode === "search" && (
                                <div className="search-area-button">
                                    <input
                                        className="searchBarInput"
                                        placeholder="想探索什麼呢..."
                                        type="text" value={keyingWord}
                                        onChange={(e) => {
                                            setKeyingWord(e.target.value);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                                e.preventDefault(); // 保險用，避免奇怪行為
                                                if ((!keyingWord.trim() && !amenity) || !searchCenter || isSearching) return;
                                                handleSearchArea(keyingWord);
                                            }
                                        }}
                                    />

                                    <SimpleSelect mode="text" options={amenityOptions} value={amenity} onChange={(v) => { setAmenity(v) }} />
                                    {(keyingWord.trim() || amenity) && !isSearching && (
                                        <button
                                            disabled={!searchCenter}
                                            onClick={() => handleSearchArea(keyingWord)}
                                        >
                                            <SearchPin />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* googleMaps連結 搜尋介面 */}
                            {isCreate && addPinMode === "link" && (
                                <div className="search-area-button">
                                    <input
                                        className="searchBarInput"
                                        style={{ width: "400px" }}
                                        placeholder="輸入googleMaps地標連結..."
                                        type="text" value={keyingWord}
                                        onChange={(e) => {
                                            setKeyingWord(e.target.value);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                                e.preventDefault(); // 保險用，避免奇怪行為
                                                if ((!keyingWord.trim()) || isSearching) return;
                                                handleImportGoogleMap(keyingWord);
                                            }
                                        }}
                                    />
                                    {(keyingWord.trim()) && (
                                        <button
                                            onClick={() => handleImportGoogleMap(keyingWord)}
                                        >
                                            <SearchPin />
                                        </button>
                                    )}
                                </div>
                            )}

                        </>
                        :
                        <>
                            {/* 標籤面板 */}
                            {(!selected || (selected && isEdit)) &&
                                <div className="tagPanel">
                                    {tagPanelMode === "normal" &&
                                        <>
                                            {
                                                currentUser ?
                                                    !filterTag ?
                                                        <Add_ className="button" onClick={() => setTagPanelMode("add")}></Add_> :
                                                        <Edit_ className="button" onClick={() => { if (!selectedTag) return; setTagPanelMode("edit"); setTagTitle(selectedTag.label); setTagColor(selectedTag.colorName); setTagIcon(selectedTag.iconName) }}></Edit_>
                                                    : null
                                            }
                                            <div className="tagsContainer">
                                                {tags.filter((tag => tag.tagType === (isEdit || (!isEdit && stepTrip === 2) ? "marker" : "trip"))).map((tag) => {
                                                    const selectedTag = filterTag === tag?.id;
                                                    return < Tag
                                                        onClick={() => { selectedTag ? setFilterTag(null) : setFilterTag(tag?.id) }}
                                                        key={tag?.id}
                                                        title={tag?.label}
                                                        icon={tag?.icon}
                                                        color={tag?.color}
                                                        style={!filterTag ? null : selectedTag ? { borderColor: tag?.color } : { opacity: "0.7" }}
                                                    />
                                                })}
                                            </div>

                                        </>
                                    }
                                    {currentUser && tagPanelMode === "add" &&
                                        <>
                                            <input type="text"
                                                placeholder="輸入標籤名稱"
                                                value={tagTitle}
                                                onChange={(e) => setTagTitle(e.target.value)} />
                                            <SimpleSelect
                                                mode="color"
                                                options={colorOptions}
                                                value={tagColor}
                                                onChange={(v) => setTagColor(v)}
                                            />
                                            <SimpleSelect
                                                mode="icon"
                                                options={iconOptions}
                                                value={tagIcon}
                                                onChange={(v) => setTagIcon(v)}
                                            />
                                            <div onClick={addTag} className={`buttonFinish ${tagTitle.trim() && tagColor && tagIcon ? "" : "disable"} `}>新增</div>
                                            <div onClick={() => { setTagPanelMode("normal"); setTagTitle(""); setTagColor(""); setTagIcon(""); }} className="buttonCancel"><Cross /></div>
                                        </>}
                                    {currentUser && tagPanelMode === "edit" &&
                                        <>
                                            <input type="text"
                                                placeholder="輸入標籤名稱"
                                                value={tagTitle}
                                                onChange={(e) => setTagTitle(e.target.value)} />
                                            <SimpleSelect
                                                mode="color"
                                                options={colorOptions}
                                                value={tagColor}
                                                onChange={(v) => setTagColor(v)}
                                            />
                                            <SimpleSelect
                                                mode="icon"
                                                options={iconOptions}
                                                value={tagIcon}
                                                onChange={(v) => setTagIcon(v)}
                                            />
                                            <div onClick={editTag} className={`buttonFinish ${tagTitle.trim() && tagColor && tagIcon ? "" : "disable"} `}>更新</div>
                                            <div onClick={deleteTag} className="buttonDelete">刪除</div>
                                            <div onClick={() => { setTagPanelMode("normal"); setTagTitle(""); setTagColor(""); setTagIcon(""); }} className="buttonCancel"><Cross /></div>
                                        </>}

                                </div>}

                            {/* 新增按鈕 */}
                            {currentUser &&
                                <div className="AddPinPanel">
                                    {!selected && <button onClick={() => { setIsCreate(!isCreate); setEditTripSelected(null); }}>
                                        {isCreate ? <CancelPin /> : <Add />}</button>}
                                </div>}


                            {/* 行程面板 */}
                            {isCreate ?
                                !selected && stepTrip === 1 ?
                                    <div className="tripPanel">
                                        <div className="fstStep">
                                            <div className="picture" onClick={() => {
                                                fileInputRefTrip.current.click();
                                            }}>
                                                <Picture className="icon" />
                                                {fileTrip && <VisualCover image={croppedPreviewUrlTrip} />}

                                                <input type="file" name="file" ref={fileInputRefTrip} onChange={(e) => {
                                                    const selectedFile = e.target.files[0]
                                                    if (!selectedFile) return;
                                                    setUploadError("");
                                                    setFileTrip(selectedFile);
                                                    setCropDataTrip({
                                                        crop: { x: 0, y: 0 },
                                                        zoom: 1,
                                                    });
                                                    setShowCropModalTrip(true);

                                                    e.target.value = null;
                                                }} style={{ display: "none" }} />
                                            </div>
                                            <div className="add">

                                                <input
                                                    type="text"
                                                    name="title"
                                                    placeholder="輸入標題"
                                                    value={trip.title}
                                                    onChange={handleTripChange}
                                                />
                                                <TagSelect
                                                    name="tag"
                                                    options={tags.filter((tag) => tag.tagType === "trip")}
                                                    value={trip.tag ? trip.tag : ""}
                                                    onChange={handleTripChange} />

                                                <div className="contentContainer">
                                                    <textarea
                                                        name="intro"
                                                        placeholder="輸入描述"
                                                        value={trip.intro}
                                                        onChange={handleTripChange}
                                                        style={{ width: "100%", height: "100%" }}
                                                    />
                                                </div>
                                                <div className="controlContainer">
                                                    <button style={{ width: "100%" }} className={`buttonFinish ${trip.title.trim() ? "" : "disable"} `} onClick={() => setStepTrip(2)}>下一步</button>
                                                </div>

                                            </div>
                                        </div>
                                    </div>
                                    : !selected && stepTrip === 2 ?
                                        <div className="tripPanel">
                                            <div className="secStep">

                                                <div className="titleContainer">
                                                    <span>{trip.title}</span>

                                                    <i style={{ color: tagTrip?.color }} className={tagTrip?.icon || ""}></i>
                                                </div>
                                                <div className="dayContainer">
                                                    <button className="button"
                                                        onClick={() => { addDay(); setSelectedDay(Number(trip.days.length) + 1); }}><Add /></button>
                                                    <div className="selectContainer">
                                                        {trip.days.map((day, index) => {
                                                            const dayNumber = index + 1;
                                                            return (<button
                                                                key={index}
                                                                className={`buttonSelect ${selectedDay === Number(dayNumber) ? "selected" : ""}`}
                                                                onClick={() => { setSelectedDay(Number(dayNumber)); setEditTripSelected(""); }}>第 {dayNumber} 天</button>)
                                                        }
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="contentContainer" ref={scrollRef}>
                                                    {(() => {
                                                        let placeNumber = 0;
                                                        return trip.days[selectedDay - 1]?.places.map((place, index) => {

                                                            if (place.type === "transport") {
                                                                return (
                                                                    <div className="transport" key={"transport" + index}>
                                                                        <div className="transportContainer">
                                                                            <div className="type">
                                                                                <SimpleSelect
                                                                                    mode="text"
                                                                                    size="S"
                                                                                    options={transportOptions}
                                                                                    value={place.transportType}
                                                                                    onChange={(v) => updateTransportType(index, v)}
                                                                                />
                                                                            </div>
                                                                            <div className="line">
                                                                                <div className="dot"></div>
                                                                                <div className="dot"></div>
                                                                            </div>
                                                                            <div className="time">
                                                                                {place.duration > 0 ? <span>{formatDuration(place.duration)}</span>
                                                                                    : place.duration < 0 ? <span style={{ color: "#ee9144" }}>時間衝突</span>
                                                                                        : place.duration === 0 ? <span style={{ color: "#fff" }}>時間太短</span>
                                                                                            : <span style={{ color: "#da4d4d" }}>還未選擇時間</span>}
                                                                            </div>
                                                                        </div>

                                                                    </div>
                                                                );
                                                            }

                                                            placeNumber++;

                                                            return (
                                                                <TripItem
                                                                    key={place.id}
                                                                    markers={markers}
                                                                    tags={tags}
                                                                    place={place}
                                                                    placeNumber={placeNumber}
                                                                    editTripSelected={editTripSelected}
                                                                    setTrip={setTrip}
                                                                    setEditTripSelected={setEditTripSelected}
                                                                    selectedDay={selectedDay}
                                                                    scrollContainer={scrollRef.current}
                                                                    onClick={() => {
                                                                        setEditTripSelected(prev =>
                                                                            prev === place.id ? null : place.id
                                                                        );
                                                                    }} />
                                                            );
                                                        })
                                                    })()}
                                                </div>
                                                {uploadError && (
                                                    <div style={{ display: "flex", justifyContent: "center", color: "#da4d4d", margin: "8px 24px", fontSize: "12px" }}>
                                                        {uploadError}
                                                    </div>
                                                )}
                                                <div className="controlContainer">
                                                    <button style={{ width: "100%" }} className="buttonDelete"
                                                        onClick={() => {
                                                            deleteDay(selectedDay);
                                                            if (trip.days.length < 2) { addDay() };
                                                            setEditTripSelected(null);
                                                        }}>刪除此天</button>
                                                </div>
                                                <div className="controlContainer">
                                                    <button style={{ width: "100%" }} className="buttonBack"
                                                        onClick={() => { setStepTrip(1); setEditTripSelected(null); }}>上一步</button>
                                                    <button
                                                        style={{ width: "100%" }}
                                                        onClick={() => { if (isUploading) return; addTrip(); }}
                                                        className={`buttonFinish ${trip.title.trim() &&
                                                            trip.days.every(day =>
                                                                day.places.length > 0 &&
                                                                day.places.every(p => (p.startTime && p.endTime) || p.transportType)
                                                            ) && !isUploading
                                                            ? ""
                                                            : "disable"
                                                            }`}
                                                    >{isUploading
                                                        ? uploadStatus === "compressing"
                                                            ? "壓縮中..."
                                                            : "上傳中..."
                                                        : "新增"}</button>
                                                </div>

                                            </div>
                                        </div>
                                        : null

                                : selected ?
                                    !isMobile ?
                                        !isEdit ?
                                            <div className="tripPanel">
                                                <div className="secStep">

                                                    <div className="titleContainer" style={{ display: "flex", justifyContent: "center" }}>
                                                        <div >行程表</div>
                                                    </div>
                                                    <div className="dayContainer">
                                                        <div className="selectContainer">
                                                            {selectedTrip?.days.map((day, index) => {
                                                                const dayNumber = index + 1;
                                                                return (<button
                                                                    key={index}
                                                                    className={`buttonSelect ${selectedDay === Number(dayNumber) ? "selected" : ""}`}
                                                                    onClick={() => setSelectedDay(Number(dayNumber))}>第 {dayNumber} 天</button>)
                                                            }
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="contentContainer" ref={scrollRef}>
                                                        {(() => {
                                                            let placeNumber = 0;

                                                            return selectedTrip?.days[selectedDay - 1]?.places.map((place, index) => {
                                                                if (place.type === "transport") {
                                                                    return (
                                                                        <div className="transport" key={"transport-" + index}>
                                                                            <div className="transportContainer">
                                                                                <div className="type">
                                                                                    {transportOptions.find(o => o.value === place.transportType)?.text}
                                                                                </div>
                                                                                <div className="line">
                                                                                    <div className="dot"></div>
                                                                                    <div className="dot"></div>
                                                                                </div>
                                                                                <div className="time">
                                                                                    {place.duration > 0 ? (
                                                                                        <span>{formatDuration(place.duration)}</span>
                                                                                    ) : place.duration < 0 ? (
                                                                                        <span style={{ color: "#ee9144" }}>時間衝突</span>
                                                                                    ) : place.duration === 0 ? (
                                                                                        <span style={{ color: "#fff" }}>時間太短</span>
                                                                                    ) : (
                                                                                        <span style={{ color: "#da4d4d" }}>還未選擇時間</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                placeNumber++;

                                                                return (
                                                                    <TripItem
                                                                        key={place.id}
                                                                        markers={markers}
                                                                        tags={tags}
                                                                        place={place}
                                                                        placeNumber={placeNumber}
                                                                        editTripSelected={editTripSelected}
                                                                        setEditTripSelected={setEditTripSelected}
                                                                        setTrip={setTrip}
                                                                        selectedDay={selectedDay}
                                                                        scrollContainer={scrollRef.current}
                                                                        onClick={() => {
                                                                            increaseClick(place.markerId, "marker");
                                                                            navigate(`/maps/${mapId}/markers/${place.markerId}`);
                                                                        }}
                                                                    />
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                </div>
                                            </div> :
                                            <div className="tripPanel">
                                                <div className="secStep">

                                                    <div className="titleContainer" style={{ display: "flex", justifyContent: "center" }}>
                                                        <div >行程表</div>
                                                    </div>
                                                    <div className="dayContainer">
                                                        <button className="button"
                                                            onClick={() => { addDay(); setSelectedDay(Number(trip.days.length) + 1); }}><Add /></button>
                                                        <div className="selectContainer">
                                                            {trip?.days.map((day, index) => {
                                                                const dayNumber = index + 1;
                                                                return (<button
                                                                    key={index}
                                                                    className={`buttonSelect ${selectedDay === Number(dayNumber) ? "selected" : ""}`}
                                                                    onClick={() => setSelectedDay(Number(dayNumber))}>第 {dayNumber} 天</button>)
                                                            }
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="contentContainer" ref={scrollRef}>
                                                        {(() => {
                                                            let placeNumber = 0;

                                                            return trip?.days[selectedDay - 1]?.places.map((place, index) => {

                                                                // transport
                                                                if (place.type === "transport") {
                                                                    return (
                                                                        <div className="transport" key={"transport-" + index}>
                                                                            <div className="transportContainer">

                                                                                <div className="type">
                                                                                    <SimpleSelect
                                                                                        mode="text"
                                                                                        size="S"
                                                                                        options={transportOptions}
                                                                                        value={place.transportType}
                                                                                        onChange={(v) => updateTransportType(index, v)}
                                                                                    />
                                                                                </div>

                                                                                <div className="line">
                                                                                    <div className="dot"></div>
                                                                                    <div className="dot"></div>
                                                                                </div>

                                                                                <div className="time">
                                                                                    {place.duration > 0 ? (
                                                                                        <span>{formatDuration(place.duration)}</span>
                                                                                    ) : place.duration < 0 ? (
                                                                                        <span style={{ color: "#ee9144" }}>
                                                                                            時間衝突
                                                                                        </span>
                                                                                    ) : place.duration === 0 ? (
                                                                                        <span style={{ color: "#fff" }}>
                                                                                            時間太短
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span style={{ color: "#da4d4d" }}>
                                                                                            還未選擇時間
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                // 景點編號只算 place
                                                                placeNumber++;

                                                                return (
                                                                    <TripItem
                                                                        key={place.id}
                                                                        markers={markers}
                                                                        tags={tags}
                                                                        place={place}
                                                                        placeNumber={placeNumber}
                                                                        editTripSelected={editTripSelected}
                                                                        setEditTripSelected={setEditTripSelected}
                                                                        setTrip={setTrip}
                                                                        selectedDay={selectedDay}
                                                                        scrollContainer={scrollRef.current}
                                                                        onClick={() => {
                                                                            setEditTripSelected(prev =>
                                                                                prev === place.id ? null : place.id
                                                                            );
                                                                        }}
                                                                    />
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                    <div className="controlContainer">
                                                        <button style={{ width: "100%" }} className="buttonDelete"
                                                            onClick={() => {
                                                                deleteDay(selectedDay);
                                                                if (trip.days.length < 2) { addDay() };
                                                                setEditTripSelected(null);
                                                            }}>刪除此天</button>
                                                    </div>
                                                </div>
                                            </div>
                                        :
                                        !isEdit ?
                                            null :
                                            <div className="tripPanel">
                                                <div className="secStep">

                                                    <div className="titleContainer" style={{ display: "flex", justifyContent: "center" }}>
                                                        <div >行程表</div>
                                                    </div>
                                                    <div className="dayContainer">
                                                        <button className="button"
                                                            onClick={() => { addDay(); setSelectedDay(Number(trip.days.length) + 1); }}><Add /></button>
                                                        <div className="selectContainer">
                                                            {trip?.days.map((day, index) => {
                                                                const dayNumber = index + 1;
                                                                return (<button
                                                                    key={index}
                                                                    className={`buttonSelect ${selectedDay === Number(dayNumber) ? "selected" : ""}`}
                                                                    onClick={() => setSelectedDay(Number(dayNumber))}>第 {dayNumber} 天</button>)
                                                            }
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="contentContainer" ref={scrollRef}>
                                                        {(() => {
                                                            let placeNumber = 0;

                                                            return trip?.days[selectedDay - 1]?.places.map((place, index) => {

                                                                // transport
                                                                if (place.type === "transport") {
                                                                    return (
                                                                        <div className="transport" key={"transport-" + index}>
                                                                            <div className="transportContainer">

                                                                                <div className="type">
                                                                                    <SimpleSelect
                                                                                        mode="text"
                                                                                        size="S"
                                                                                        options={transportOptions}
                                                                                        value={place.transportType}
                                                                                        onChange={(v) => updateTransportType(index, v)}
                                                                                    />
                                                                                </div>

                                                                                <div className="line">
                                                                                    <div className="dot"></div>
                                                                                    <div className="dot"></div>
                                                                                </div>

                                                                                <div className="time">
                                                                                    {place.duration > 0 ? (
                                                                                        <span>{formatDuration(place.duration)}</span>
                                                                                    ) : place.duration < 0 ? (
                                                                                        <span style={{ color: "#ee9144" }}>
                                                                                            時間衝突
                                                                                        </span>
                                                                                    ) : place.duration === 0 ? (
                                                                                        <span style={{ color: "#fff" }}>
                                                                                            時間太短
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span style={{ color: "#da4d4d" }}>
                                                                                            還未選擇時間
                                                                                        </span>
                                                                                    )}
                                                                                </div>

                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }

                                                                // 景點編號只算 place
                                                                placeNumber++;

                                                                return (
                                                                    <TripItem
                                                                        key={place.id}
                                                                        markers={markers}
                                                                        tags={tags}
                                                                        place={place}
                                                                        placeNumber={placeNumber}
                                                                        editTripSelected={editTripSelected}
                                                                        setEditTripSelected={setEditTripSelected}
                                                                        setTrip={setTrip}
                                                                        selectedDay={selectedDay}
                                                                        scrollContainer={scrollRef.current}
                                                                        onClick={() => {
                                                                            setEditTripSelected(prev =>
                                                                                prev === place.id ? null : place.id
                                                                            );
                                                                        }}
                                                                    />
                                                                );
                                                            });
                                                        })()}
                                                    </div>
                                                    <div className="controlContainer">
                                                        <button style={{ width: "100%" }} className="buttonDelete"
                                                            onClick={() => {
                                                                deleteDay(selectedDay);
                                                                if (trip.days.length < 2) { addDay() };
                                                                setEditTripSelected(null);
                                                            }}>刪除此天</button>
                                                    </div>
                                                </div>
                                            </div>
                                    : null}
                        </>
                    }

                    {/* 提示雲 */}
                    {searchMessage && (
                        <div className="search-hint">
                            {isSearching && (
                                <button
                                    className="cancel-search"
                                    onClick={() => {
                                        if (searchAbortRef.current) {
                                            searchAbortRef.current.abort(); // 終止繼續 fetch
                                        }
                                    }}
                                >
                                    <Cross />
                                </button>
                            )}
                            {searchMessage}
                        </div>
                    )}
                </div>

                <MapContainer
                    center={[25.033, 121.565]}
                    zoom={13}
                    style={{ height: "100%", width: "100%" }}>

                    {/* 底圖（OpenStreetMap） */}
                    <TileLayer
                        attribution='Tiles &copy; Esri &mdash; Source: Esri, USGS'
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.carto.com/">CARTO</a> contributors'
                        subdomains="abcd"
                        maxZoom={19}
                        opacity={0.6}
                    />

                    {/* 點選 飛入/適應地標範圍 */}
                    <FlyToMarker markers={markers} trips={trips} flyTarget={flyTarget} />

                    {/* 自動 適應地標範圍 */}
                    <FitBoundsController
                        points={visiblePoints}
                        disabled={!!flyTarget}
                        fitKey={fitKey}
                        lastFitKeyRef={lastFitKeyRef}
                    />

                    {/* 偵測 地圖點擊.移動.視窗出現 事件 */}
                    {<MapEvents
                        onMoveEnd={handleMoveEnd}
                        setTempPos={setTempPos}
                        setIsEdit={setIsEdit}
                        tempPos={tempPos}
                    />}

                    {/* 搜尋範圍圓圈 */}
                    {mode === "pinListMode" && isCreate && (addPinMode === "search") && searchCircle}

                    {/* 手動 / googleMap 連結  區 */}
                    {mode === "pinListMode" && isCreate && addPinMode === "link" && tempPos && !selected && (
                        <Marker position={[tempPos.lat, tempPos.lng]} icon={createSvgIcon_original()}>
                            <Popup className="popupContainer">
                                <>
                                    <div className="picture" onClick={() => {
                                        fileInputRef.current.click();
                                    }}>
                                        <Picture className="icon" />
                                        {file && <VisualCover image={croppedPreviewUrl} />}

                                        <input type="file" name="file" ref={fileInputRef} onChange={(e) => {
                                            const selectedFile = e.target.files[0];
                                            if (!selectedFile) return;

                                            setUploadError("");
                                            setFile(selectedFile);
                                            setCropData({
                                                crop: { x: 0, y: 0 },
                                                zoom: 1,
                                            });
                                            setShowCropModal(true);

                                            e.target.value = null;
                                        }} style={{ display: "none" }} />
                                    </div>
                                    <div className="add">
                                        <div className="titleContainer">
                                            <input
                                                type="text"
                                                name="markerTitle"
                                                placeholder="輸入標題"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                style={{ width: "145px" }}
                                            />
                                            <TagSelect
                                                options={tags.filter((tag) => tag.tagType === "marker")}
                                                value={markerTag}
                                                onChange={(v) => setMarkerTag(v)} />
                                        </div>
                                        <div className="contentContainer">
                                            <textarea
                                                name="markerTitleInfo"
                                                placeholder="輸入描述"
                                                value={intro}
                                                onChange={(e) => setIntro(e.target.value)}
                                                style={{ width: "100%", height: "100%" }}
                                            />
                                        </div>
                                        {uploadError && (
                                            <div style={{ display: "flex", justifyContent: "center", color: "#da4d4d", margin: "6px 0", fontSize: "12px" }}>
                                                {uploadError}
                                            </div>
                                        )}
                                        <div className="controlContainer">
                                            <button style={{ width: "100%" }}
                                                className={`buttonFinish ${title.trim() && !isUploading ? "" : "disable"} `}
                                                onClick={() => { if (isUploading) return; addMarker(); }}>{isUploading
                                                    ? uploadStatus === "compressing"
                                                        ? "壓縮中..."
                                                        : "上傳中..."
                                                    : "新增"}</button>
                                        </div>

                                    </div>
                                </>
                            </Popup>
                        </Marker>
                    )}

                    {/* 關鍵字新增 marker 區 */}
                    {mode === "pinListMode" && isCreate && (addPinMode === "search") && Array.isArray(pois) &&
                        pois.map((poi) => {
                            const lat = poi.lat ?? poi.center?.lat;
                            const lng = poi.lon ?? poi.center?.lon;

                            if (lat == null || lng == null) return null; // 座標不存在就跳過

                            return (
                                <Marker
                                    key={`poi-${poi.id}`}
                                    position={[lat, lng]}
                                    icon={createSvgIcon_pois(poi.tags?.name || "?")}
                                    eventHandlers={{
                                        click: () => setTitle(poi.tags?.name || "?")
                                    }}
                                >
                                    <Popup className="popupContainer">
                                        <>
                                            <div className="picture" onClick={() => {
                                                fileInputRef.current.click();
                                            }}>
                                                <Picture className="icon" />
                                                {file && <VisualCover image={croppedPreviewUrl} />}

                                                <input type="file" name="file" ref={fileInputRef} onChange={(e) => {
                                                    const selectedFile = e.target.files[0];
                                                    if (!selectedFile) return;

                                                    setUploadError("");
                                                    setFile(selectedFile);
                                                    setCropData({
                                                        crop: { x: 0, y: 0 },
                                                        zoom: 1,
                                                    });
                                                    setShowCropModal(true);

                                                    e.target.value = null;
                                                }} style={{ display: "none" }} />
                                            </div>
                                            <div className="add">
                                                <div className="titleContainer">
                                                    <input
                                                        type="text"
                                                        name="markerTitle"
                                                        placeholder="輸入標題"
                                                        value={title}
                                                        onChange={(e) => setTitle(e.target.value)}
                                                        style={{ width: "160px" }}
                                                    />
                                                    <TagSelect
                                                        options={tags.filter((tag) => tag.tagType === "marker")}
                                                        value={markerTag}
                                                        onChange={(v) => setMarkerTag(v)} />
                                                </div>
                                                <div className="contentContainer">
                                                    <textarea
                                                        name="markerTitleInfo"
                                                        placeholder="輸入描述"
                                                        value={intro}
                                                        onChange={(e) => setIntro(e.target.value)}
                                                        style={{ width: "100%", height: "100%" }}
                                                    />
                                                </div>
                                                {uploadError && (
                                                    <div style={{ display: "flex", justifyContent: "center", color: "#da4d4d", margin: "6px 0", fontSize: "12px" }}>
                                                        {uploadError}
                                                    </div>
                                                )}
                                                <div className="controlContainer">
                                                    <button style={{ width: "100%" }} className={`buttonFinish ${title.trim() && !isUploading ? "" : "disable"} `}
                                                        onClick={() => { if (isUploading) return; addMarker(lat, lng); }}>{isUploading
                                                            ? uploadStatus === "compressing"
                                                                ? "壓縮中..."
                                                                : "上傳中..."
                                                            : "新增"}</button>
                                                </div>

                                            </div>
                                        </>
                                    </Popup>
                                </Marker>
                            );
                        })}

                    {/* trip 的 行程線條 區 */}
                    {mode === "postMode" && (
                        (isEdit || (isCreate && stepTrip === 2))
                            ? editingTripDayRoutes.map((route, index) => (
                                <Polyline
                                    key={`editing-trip-route-${index}`}
                                    positions={route}
                                    pathOptions={{
                                        color: "#da4d4d",
                                        weight: 2,
                                        opacity: 0.85,
                                        dashArray: "8 8",
                                    }}
                                />
                            ))
                            : selectedTrip && tripDayRoutes.map((route, index) => (
                                <Polyline
                                    key={`trip-route-${index}`}
                                    positions={route}
                                    pathOptions={{
                                        color: "#da4d4d",
                                        weight: 2,
                                        opacity: 0.85,
                                    }}
                                />
                            ))
                    )}

                    {/* 已新增 marker 區 */}
                    {
                        mode === "postMode" ?
                            isCreate && stepTrip === 2 || isEdit ?
                                filterTag ?
                                    markers.filter(marker => marker.markerTag === filterTag || editingPlaceNumberMap[marker.id]).map((m) => (
                                        <Marker
                                            eventHandlers={{
                                                click: () => {
                                                    if (editTripSelected) {
                                                        editPlace(editTripSelected, m.id);
                                                    } else {
                                                        addPlace(m.id);
                                                    }
                                                }
                                            }}
                                            key={m.id}
                                            position={[m.lat, m.lng]}
                                            icon={createSvgIcon(
                                                m.markerTag,
                                                m.title,
                                                editingPlaceNumberMap[m.id]
                                            )}
                                        >
                                        </Marker>
                                    ))
                                    :
                                    markers.map((m) => (
                                        <Marker
                                            eventHandlers={{
                                                click: () => {
                                                    if (editTripSelected) {
                                                        editPlace(editTripSelected, m.id);
                                                    } else {
                                                        addPlace(m.id);
                                                    }
                                                }
                                            }}
                                            key={m.id}
                                            position={[m.lat, m.lng]}
                                            icon={createSvgIcon(
                                                m.markerTag,
                                                m.title,
                                                editingPlaceNumberMap[m.id]
                                            )}
                                        >
                                        </Marker>
                                    ))
                                : selectedTrip ?
                                    selectedTrip.days?.[selectedDay - 1]?.places
                                        ?.filter((p) => p.type !== "transport" && p.markerId)
                                        .map((p, index) => {
                                            const markerData = markers.find((m) => m.id === p.markerId);
                                            if (!markerData) return null;

                                            return (
                                                <Marker
                                                    key={p.id}
                                                    position={[markerData.lat, markerData.lng]}
                                                    icon={createSvgIcon(markerData.markerTag, markerData.title, index + 1)}
                                                    eventHandlers={{
                                                        click: () => {
                                                            increaseClick(markerData.id, "marker");
                                                            navigate(`/maps/${mapId}/markers/${markerData.id}`);
                                                            expandHalf();
                                                        }
                                                    }}
                                                />
                                            );
                                        })
                                    :
                                    filterTag ?
                                        trips.filter((trip) => trip.tag === filterTag).map((trip) => {
                                            const fstPlaceData = markers.find((m) => m.id === trip.days[0].places[0].markerId)
                                            if (!fstPlaceData) return null;
                                            return (
                                                <Marker
                                                    eventHandlers={{
                                                        click: () => {
                                                            increaseClick(trip.id, "trip");
                                                            navigate(`/maps/${mapId}/trips/${trip.id}`);
                                                            setIsCreate(false);
                                                            expandHalf();
                                                        }
                                                    }}
                                                    key={trip.days[0].places[0].id}
                                                    position={[fstPlaceData.lat, fstPlaceData.lng]}
                                                    icon={createSvgIcon_trip(trip.tag, trip.title, trips.length)}
                                                />);
                                        })
                                        : trips.map((trip) => {
                                            const fstPlaceData = markers.find((m) => m.id === trip.days[0].places[0].markerId)
                                            if (!fstPlaceData) return null;
                                            return (
                                                <Marker
                                                    eventHandlers={{
                                                        click: () => {
                                                            increaseClick(trip.id, "trip");
                                                            navigate(`/maps/${mapId}/trips/${trip.id}`);
                                                            setIsCreate(false);
                                                            expandHalf();
                                                        }
                                                    }}
                                                    key={trip.days[0].places[0].id}
                                                    position={[fstPlaceData.lat, fstPlaceData.lng]}
                                                    icon={createSvgIcon_trip(trip.tag, trip.title, trips.length)}
                                                />);
                                        })
                            :
                            selectedMarker ?
                                <Marker
                                    eventHandlers={{
                                        click: () => {
                                            setTempPos(null);
                                            navigate(`/maps/${mapId}/markers/${selectedMarker.id}`);
                                        }
                                    }
                                    }
                                    key={selectedMarker.id}
                                    position={[selectedMarker.lat, selectedMarker.lng]}
                                    icon={createSvgIcon(selectedMarker.markerTag, selectedMarker.title)} />
                                :
                                filterTag ?
                                    (markers.filter(m => m.markerTag === filterTag).map((m) => (
                                        <Marker eventHandlers={{
                                            click: () => {
                                                setTempPos(null);
                                                increaseClick(m.id, "marker");
                                                navigate(`/maps/${mapId}/markers/${m.id}`);
                                                setIsCreate(false);
                                                expandHalf();
                                            }
                                        }}
                                            key={m.id}
                                            position={[m.lat, m.lng]}
                                            icon={createSvgIcon(m.markerTag, m.title)} />
                                    ))) :
                                    (markers.map((m) => (
                                        <Marker eventHandlers={{
                                            click: () => {
                                                setTempPos(null);
                                                increaseClick(m.id, "marker");
                                                navigate(`/maps/${mapId}/markers/${m.id}`);
                                                setIsCreate(false);
                                                expandHalf();
                                            }
                                        }} key={m.id} position={[m.lat, m.lng]} icon={createSvgIcon(m.markerTag, m.title)

                                        }>
                                            {/* <Popup
                            className="popupContainer"
                            eventHandlers={{ open: () => setTempPos(null) }}
                        >
                            <h2>{m.title}</h2>
                            <p>{m.intro}</p>

                            <button>編輯</button>
                            <button
                                onClick={() => deleteMarker(m.id)}
                                style={{ background: "red", color: "white", marginTop: "10px" }}
                            >
                                刪除
                            </button>
                        </Popup> */}
                                        </Marker>
                                    )))

                    }


                </MapContainer >

            </div >
        </>
    );

}

export default MapView

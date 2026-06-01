import React, { useState, useEffect, useRef } from 'react'
import { doc, updateDoc, increment, collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "../utils/firebase";
import MapView from '../components/MapView'
import Panel from '../components/Panel'
import MobileHeader from '../components/MobileHeader';
import MobileSheet from '../components/MobileSheet';
import { colorOptions, iconOptions } from "../config/optionConfig";
import { useParams, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import {
    markersRef,
    tripsRef,
    tagsRef,
    markerDocRef,
    tripDocRef,
    tagDocRef,
    mapDocRef
} from "../utils/mapRefs";

function Mainframe({ currentUser, mode }) {

    const [selected, setSelected] = useState(null);
    const [isEdit, setIsEdit] = useState(false);
    const [isCreate, setIsCreate] = useState(false); // 新增地標模式中
    const [filterTag, setFilterTag] = useState(null);
    const [tagPanelMode, setTagPanelMode] = useState("normal");

    const [markers, setMarkers] = useState([]);
    const [tags, setTags] = useState([]);
    const [trips, setTrips] = useState([]);

    const [flyTarget, setFlyTarget] = useState(null);
    const navigate = useNavigate();

    const { mapId, markerId, tripId } = useParams();

    // console.log("目前地圖 ID:", mapId);
    // console.log("目前選取 ID:", currentId);

    const [trip, setTrip] = useState({
        title: "",
        intro: "",
        tag: "",
        imageUrl: "",
        days: [{
            places: []
        },],
        clickCount: 0,
        rank: 999999999,
        lastRank: 999999999,
        createdAt: new Date(),
    });
    const [stepTrip, setStepTrip] = useState(1);
    const [selectedDay, setSelectedDay] = useState(1);
    const [editTripSelected, setEditTripSelected] = useState(null);

    const VIEW = {
        MAP_INFO: "MAP_INFO",
        LIST: "LIST",
        DETAIL: "DETAIL",
        EDIT: "EDIT",
    };
    const [view, setView] = useState(VIEW.LIST);

    const [currentMap, setCurrentMap] = useState(null);

    const [isMapInfo, setIsMapInfo] = useState(false);

    /* --------------------------------------------------
       👉【 ＲＷＤ切換區 】
    -------------------------------------------------- */
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        }

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    /* --------------------------------------------------
       👉【 資料監聽區 】
    -------------------------------------------------- */

    useEffect(() => { // 監聽 網址裡的 地標id，去變化到 該頁 和 畫面位置

        const currentId = markerId || tripId;

        if (currentId) {
            setView(VIEW.DETAIL);
            setSelected(currentId);
            setFlyTarget(currentId);
        } else {
            setView(VIEW.LIST);
            setSelected(null);
            setIsEdit(false);
        }
    }, [markerId, tripId, mode]);

    useEffect(() => { // 監聽 Firestore 的 "markers" 集合，任何資料變化都會觸發

        if (!mapId) return;
        const q = query(collection(db, "maps", mapId, "markers"), orderBy("rank", "asc"));

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            setMarkers(data);
            // console.log(data)
        });

        // 回傳清除監聽的函式（元件 unmount 時執行）
        return () => unsub();

    }, [mapId]);

    useEffect(() => { // 監聽 Firestore 的 "tags" 集合，任何資料變化都會觸發

        if (!mapId) return;
        const unsub = onSnapshot(collection(db, "maps", mapId, "tags"), (snapshot) => {
            // 將 snapshot 轉成 JS 陣列，每筆資料都包含 id + 資料內容

            const data = snapshot.docs.map((d) => {
                const raw = d.data();
                const colorInfo = colorOptions.find(c => c.value === raw.tagColor);
                const iconInfo = iconOptions.find(i => i.value === raw.tagIcon);
                return {
                    id: d.id,
                    value: d.id,
                    label: raw.tagTitle,
                    color: colorInfo?.color,
                    icon: iconInfo?.icon,
                    colorName: raw.tagColor,
                    iconName: raw.tagIcon,
                    tagType: raw.tagType,
                }
            });
            // 更新 React state → 觸發 UI 重新 render
            setTags(data);
        });

        // 回傳清除監聽的函式（元件 unmount 時執行）
        return () => unsub();

    }, [mapId]);

    useEffect(() => { // 監聽 Firestore 的 "trips" 集合，任何資料變化都會觸發

        if (!mapId) return;
        const q = query(collection(db, "maps", mapId, "trips"));

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((d) => ({
                id: d.id,
                ...d.data(),
            }));
            setTrips(data);
            // console.log(data)
        });

        // 回傳清除監聽的函式（元件 unmount 時執行）
        return () => unsub();

    }, [mapId]);

    useEffect(() => { // 監聽 Firestore 的 "maps"集合裡 符合"mapId" 文件，儲為 現在開啟的地圖 currentMap
        if (!mapId) return;

        const unsub = onSnapshot(mapDocRef(mapId), (snap) => {
            if (snap.exists()) {
                setCurrentMap({
                    id: snap.id,
                    ...snap.data(),
                });
            }
        }, (err) => {
            console.error("讀取 map 失敗:", err);
        });

        return () => unsub();
    }, [mapId]);

    // 增加 點擊數
    async function increaseClick(id, type) {
        if (!id || !mapId) return;

        try {
            if (type === "marker") {
                await updateDoc(markerDocRef(mapId, id), {
                    clickCount: increment(1),
                    updatedAt: new Date()
                });
                return;
            }

            if (type === "trip") {
                await updateDoc(tripDocRef(mapId, id), {
                    clickCount: increment(1),
                    updatedAt: new Date()
                });
            }
        } catch (err) {
            console.error("update failed:", err);
        }
    }
    // 增加 行程地標
    function addPlace(markerId) {
        setTrip(prev => ({
            ...prev,
            days: prev.days.map((day, index) => {
                if (index !== selectedDay - 1) return day;

                const newPlace = {
                    id: uuidv4(),
                    markerId,
                    startTime: "",
                    endTime: ""
                }

                const newPlaces = [...day.places];
                const last = newPlaces[newPlaces.length - 1];

                if (last && last.markerId) {
                    newPlaces.push({
                        type: "transport",
                        transportType: null,
                        duration: null
                    });
                }

                newPlaces.push(newPlace);

                return {
                    ...day,
                    places: newPlaces
                };
            })
        }));
    }
    // 編輯 行程地標
    function editPlace(placeId, newMarkerId) {
        setTrip(prev => ({
            ...prev,
            days: prev.days.map((day, index) => {
                if (index !== selectedDay - 1) return day;
                return {
                    ...day,
                    places: day.places.map((p) => {
                        if (p.id !== placeId) return p;

                        return {
                            ...p,
                            markerId: newMarkerId
                        }
                    })
                };
            })
        }));
    }

    const SHEET_MAX = 72;
    const SHEET_HALF = window.innerHeight * 0.5;
    const SHEET_MIN = window.innerHeight - 72;

    const [sheetPosition, setSheetPosition] = useState(SHEET_MIN);

    function expandHalf() {
        setSheetPosition(
            SHEET_HALF
        );
    }

    function expandFull() {
        setSheetPosition(
            SHEET_MAX
        );
    }

    function collapseSheet() {
        setSheetPosition(
            SHEET_MIN
        );
    }

    const sharedProps = {
        isMobile,
        currentUser,
        mapId,
        currentMap,
        markers,
        tags,
        trips,
        mode,
        tagPanelMode,
        setTagPanelMode,
        selected,
        setSelected,
        filterTag,
        setFilterTag,
        isEdit,
        setIsEdit,
        isCreate,
        setIsCreate,
        increaseClick,
        navigate,
        trip,
        setTrip,
        selectedDay,
        setSelectedDay,
        stepTrip,
        setStepTrip,
        editTripSelected,
        setEditTripSelected,
        addPlace,
        editPlace,
        VIEW,
        view,
        setView,
        flyTarget,
        setFlyTarget,
        isMapInfo,
        setIsMapInfo,
        sheetPosition,
        setSheetPosition,
        expandHalf,
        expandFull,
        collapseSheet,
    };

    if (!currentMap) return null;

    return (
        <div className='container'>
            {isMobile ?
                <>
                    <MobileHeader {...sharedProps} />
                    <MapView
                        {...sharedProps}
                    />
                    <MobileSheet  {...sharedProps} />
                </>
                :
                <>
                    <Panel
                        {...sharedProps}
                    />
                    <MapView
                        {...sharedProps}
                    />
                </>}


        </div>
    )
}

export default Mainframe

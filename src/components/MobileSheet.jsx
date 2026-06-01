import React, { useState, useEffect, useRef } from 'react'
import { animate } from "motion/react"
import { Link } from 'react-router-dom'
import { ReactComponent as PinList_default } from "../images/PinList_default.svg"
import { ReactComponent as PinList_selected } from "../images/PinList_selected.svg"
import { ReactComponent as Post_default } from "../images/Post_default.svg"
import { ReactComponent as Post_selected } from "../images/Post_selected.svg"

import { doc, getDocs, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "../utils/firebase";
import PinListItem from './PinListItem'
import TagSelect from './TagSelect';
import { uploadImage, deleteImageByKey } from "../utils/uploadImage";
import CroppedImage from "../components/CroppedImage";
import ImageCropModal from "./ImageCropModal";
import VisualCover from "./VisualCover";
import { getCroppedImg } from "../utils/cropImage";
import {
    markersRef,
    tripsRef,
    tagsRef,
    markerDocRef,
    tripDocRef,
    tagDocRef,
    mapDocRef,
} from "../utils/mapRefs";

import MapInfoPanel from '../pages/MapInfoPanel';
import ListPanel_m from '../pages/ListPanel_m';
import DetailPanel_m from '../pages/DetailPanel_m';
import EditPanel_m from '../pages/EditPanel_m';

// motion：可動畫的 div
// useDragControls：讓你可以「指定哪個區域可以拖」
// useMotionValue：真正控制位置的核心（比 useState 更適合動畫）
import {
    motion,
    useDragControls,
    useMotionValue
} from "motion/react";

function MobileSheet({ currentUser, mapId, currentMap, markers, tags, trips, mode, setTagPanelMode, selected, setSelected,
    filterTag, setFilterTag, isEdit, setIsEdit, isCreate, setIsCreate,
    increaseClick, navigate, trip, setTrip, setSelectedDay, stepTrip, addPlace, editPlace, editTripSelected, setEditTripSelected,
    VIEW, view, setView, selectedDay, isMapInfo, setIsMapInfo, sheetPosition, setSheetPosition }) {

    // 最上面（幾乎全開）
    const SHEET_MAX = 72;

    // 半開（畫面 50% 高度）
    const SHEET_HALF = window.innerHeight * 0.5;

    // 最下（收起狀態）
    const SHEET_MIN = window.innerHeight - 72;


    // 是專門給動畫/拖曳用的狀態
    const y = useMotionValue(0);

    // 📌 控制「只能從 drag bar 拖」
    const dragControls = useDragControls();

    const [contentHeight, setContentHeight] = useState(window.innerHeight - sheetPosition)

    // 📌 觸發展合Sheet
    function snapSheet(targetY) {

        setContentHeight(window.innerHeight - targetY);

        animate(y, targetY, {
            type: "spring",
            stiffness: 400,
            damping: 40,
        });
    }

    // 📌 當sheetPosition變化，觸發展合Sheet
    useEffect(() => {

        if (y.get() === sheetPosition) return;
        snapSheet(sheetPosition);

    }, [sheetPosition])

    // 📌 當拖曳結束時，觸發展合Sheet
    function onDragEnd() {

        // 目前 sheet 的 y 位置（即時值）
        const currentY = y.get();

        // 三個吸附點
        const snapPoints = [
            SHEET_MAX,
            SHEET_HALF,
            SHEET_MIN,
        ];

        // 先假設第一個是最近的
        let closest = snapPoints[0];

        // 找出「最接近目前位置」的 snap point
        snapPoints.forEach(point => {

            if (
                Math.abs(point - currentY)
                <
                Math.abs(closest - currentY)
            ) {
                closest = point;
            }
        });
        setSheetPosition(closest);
    }

    /////////////////////// 功能區 ///////////////////////

    const selectedMarker = markers.find(o => o.id === selected);
    const selectedTrip = trips.find(o => o.id === selected);

    const [editTitle, setEditTitle] = useState("");
    const [editIntro, setEditIntro] = useState("");
    const [editTag, setEditTag] = useState("");

    const fileInputRef = useRef(null);

    const [file, setFile] = useState(null);

    const [uploadStatus, setUploadStatus] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");

    const [showCropModal, setShowCropModal] = useState(false); // 裁切面板狀態
    const [cropData, setCropData] = useState({ // 裁切參數
        crop: { x: 0, y: 0 },
        zoom: 1,
    });
    const [croppedPreviewUrl, setCroppedPreviewUrl] = useState(""); // 裁切後的本地預覽圖
    const [editCropSource, setEditCropSource] = useState(""); // 舊圖裁切時的來源網址

    const tag = tags.find((o) => o.id === (mode === "pinListMode" ? selectedMarker?.markerTag : selectedTrip?.tag) || null);

    useEffect(() => {
        resetImageState();
        if (isMapInfo) {
            setEditTitle(currentMap.title || "");
            setEditIntro(currentMap.intro || "");
            setEditTag("");
            return;
        }
        else if (selectedMarker) {
            setEditTitle(selectedMarker.title || "");
            setEditIntro(selectedMarker.intro || "");
            setEditTag(selectedMarker.markerTag || "");
            return;
        }
        else if (selectedTrip) {
            setTrip(selectedTrip);
            return;
        }
        else {
            setEditTitle("");
            setEditIntro("");
            setEditTag("");
            setTrip({
                title: "",
                intro: "",
                tag: "",
                imageUrl: "",
                days: [{
                    places: []
                },]
            });
        }
    }, [isMapInfo, selectedMarker, selectedTrip]);

    // 上傳預覽圖
    const [previewUrl, setPreviewUrl] = useState(null);
    useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    // 編輯地標
    async function editMarker(markerId) {
        if (!editTitle.trim() || !editIntro.trim() || !editTag) return;

        try {
            const oldImageKey = selectedMarker?.imageKey || "";
            let nextImageUrl = selectedMarker?.imageUrl || "";
            let nextImageKey = selectedMarker?.imageKey || "";

            if (file) {
                try {
                    setUploadError("");
                    setIsUploading(true);
                    const uploadResult = await uploadImage(file, "poi", {
                        onStatusChange: setUploadStatus,
                    });
                    nextImageUrl = uploadResult.url;
                    nextImageKey = uploadResult.key;

                    if (oldImageKey) {
                        await deleteImageByKey(oldImageKey);
                    }
                } catch (err) {
                    setUploadError(err.message || "上傳失敗");
                    return; // 很重要，直接中止
                } finally {
                    setIsUploading(false);
                    setUploadStatus("");
                }
            }

            await updateDoc(markerDocRef(mapId, markerId), {
                title: editTitle,
                intro: editIntro,
                markerTag: editTag,
                imageUrl: nextImageUrl,
                imageKey: nextImageKey,
                cropData: croppedPreviewUrl ? cropData : (selectedMarker?.cropData || cropData),
                updatedAt: new Date(),
            });

            setIsEdit(false);
            setEditTitle("");
            setEditIntro("");
            setEditTag("");
            resetImageState();

        } catch (err) {
            console.error(err);
            alert("編輯失敗");
        }
    }

    // 刪除地標
    async function deleteMarker(markerId) {
        if (!window.confirm("確定要刪除這個地標嗎？")) return;

        try {
            const imageKey = selectedMarker?.imageKey || "";

            if (imageKey) {
                await deleteImageByKey(imageKey);
            }

            await deleteDoc(markerDocRef(mapId, markerId));

            await updateDoc(mapDocRef(mapId), {
                markerCount: increment(-1)
            });

            setEditTitle("");
            setEditIntro("");
            setEditTag("");
            setIsEdit(false);
            navigate(`/maps/${mapId}/pinList`);
        } catch (err) {
            console.error(err);
            alert("刪除失敗");
        }
    }

    // 編輯行程
    async function editTrip(tripId, trip, file) {
        try {
            const oldImageKey = selectedTrip?.imageKey || "";
            let nextImageUrl = selectedTrip?.imageUrl || "";
            let nextImageKey = selectedTrip?.imageKey || "";

            if (file) {
                try {
                    setUploadError("");
                    setIsUploading(true);
                    const uploadResult = await uploadImage(file, "trip", {
                        onStatusChange: setUploadStatus,
                    });
                    nextImageUrl = uploadResult.url;
                    nextImageKey = uploadResult.key;

                    if (oldImageKey) {
                        await deleteImageByKey(oldImageKey);
                    }
                } catch (err) {
                    setUploadError(err.message || "上傳失敗");
                    return; // 很重要，直接中止
                } finally {
                    setIsUploading(false);
                    setUploadStatus("");
                }
            }

            await updateDoc(tripDocRef(mapId, tripId), {
                title: trip.title,
                intro: trip.intro,
                tag: trip.tag,
                days: trip.days,
                imageUrl: nextImageUrl,
                imageKey: nextImageKey,
                cropData: croppedPreviewUrl ? cropData : (selectedTrip?.cropData || cropData),
                updatedAt: new Date(),
            });

            setIsEdit(false);
            setTrip({
                title: "",
                intro: "",
                tag: "",
                imageUrl: "",
                days: [{ places: [] }],
            });
            setEditTripSelected(null);
            resetImageState();

        } catch (err) {
            console.error(err);
            alert("編輯 trip 失敗");
        }
    }

    // 刪除行程
    async function deleteTrip(tripId) {
        try {
            const imageKey = selectedTrip?.imageKey || "";

            if (imageKey) {
                await deleteImageByKey(imageKey);
            }

            await deleteDoc(tripDocRef(mapId, tripId));

            await updateDoc(mapDocRef(mapId), {
                tripCount: increment(-1)
            });

            setIsEdit(false);
            setTrip({
                title: "",
                intro: "",
                tag: "",
                imageUrl: "",
                days: [{ places: [] }],
            });
            setEditTripSelected(null);
            navigate(`/maps/${mapId}/tripList`);
        } catch (err) {
            console.error(err);
            alert("刪除 trip 失敗");
        }
    }

    // 編輯地圖
    async function editMap(mapId) {
        if (!editTitle.trim() || !editIntro.trim()) return;
        try {
            const oldImageKey = currentMap?.imageKey || "";
            let nextImageUrl = currentMap?.imageUrl || "";
            let nextImageKey = currentMap?.imageKey || "";

            if (file) {
                try {
                    setUploadError("");
                    setIsUploading(true);
                    const uploadResult = await uploadImage(file, "map", {
                        onStatusChange: setUploadStatus,
                    });
                    nextImageUrl = uploadResult.url;
                    nextImageKey = uploadResult.key;

                    if (oldImageKey) {
                        await deleteImageByKey(oldImageKey);
                    }
                } catch (err) {
                    setUploadError(err.message || "上傳失敗");
                    return; // 很重要，直接中止
                } finally {
                    setIsUploading(false);
                    setUploadStatus("");
                }
            }

            await updateDoc(mapDocRef(mapId), {
                title: editTitle,
                intro: editIntro,
                imageUrl: nextImageUrl,
                imageKey: nextImageKey,
                cropData: croppedPreviewUrl ? cropData : (currentMap?.cropData || cropData),
                updatedAt: new Date(),
            });

            setIsEdit(false);
            setEditTitle("");
            setEditIntro("");
            setEditTag("");
            resetImageState();

        } catch (err) {
            console.error(err);
            alert("編輯 map 失敗");
        }
    }

    // 刪除地圖
    async function deleteMap(mapId) {
        if (!window.confirm("確定要刪除此地圖嗎？")) return;

        try {
            // 1. 刪 markers
            const markersSnap = await getDocs(markersRef(mapId));
            for (const markerDoc of markersSnap.docs) {
                const markerData = markerDoc.data();

                if (markerData.imageKey) {
                    await deleteImageByKey(markerData.imageKey);
                }

                await deleteDoc(markerDoc.ref);
            }

            // 2. 刪 trips
            const tripsSnap = await getDocs(tripsRef(mapId));
            for (const tripDoc of tripsSnap.docs) {
                const tripData = tripDoc.data();

                if (tripData.imageKey) {
                    await deleteImageByKey(tripData.imageKey);
                }

                await deleteDoc(tripDoc.ref);
            }

            // 3. 刪 tags
            const tagsSnap = await getDocs(tagsRef(mapId));
            for (const tagDoc of tagsSnap.docs) {
                await deleteDoc(tagDoc.ref);
            }

            // 4. 刪 map 封面圖
            if (currentMap?.imageKey) {
                await deleteImageByKey(currentMap.imageKey);
            }

            // 5. 刪 map 本體
            await deleteDoc(mapDocRef(mapId));

            // Reset UI
            setEditTitle("");
            setEditIntro("");
            setEditTag("");
            setIsEdit(false);

            navigate(`/home`);

        } catch (err) {
            console.error(err);
            alert("刪除 map 失敗");
        }
    }


    // 清空預覽圖片暫存資料（返回時用）
    function resetImageState() {

        setFile(null);
        setPreviewUrl(null);
        setCroppedPreviewUrl("");
        setEditCropSource("");
        setCropData({
            crop: { x: 0, y: 0 },
            zoom: 1,
        });
    }

    function renderPanel() {
        if (view === VIEW.MAP_INFO) {
            return (
                <MapInfoPanel
                    currentUser={currentUser}
                    currentMap={currentMap}
                    onBack={() => { setView(VIEW.LIST); setIsMapInfo(false); }}
                    onEdit={() => { setIsMapInfo(true); setView(VIEW.EDIT); setIsEdit(true); }}
                />
            );
        }

        if (view === VIEW.LIST) {
            return (
                <ListPanel_m
                    mode={mode}
                    currentMap={currentMap}
                    markers={markers}
                    trips={trips}
                    trip={trip}
                    selectedDay={selectedDay}
                    tags={tags}
                    filterTag={filterTag}
                    setFilterTag={setFilterTag}
                    isCreate={isCreate}
                    stepTrip={stepTrip}
                    editTripSelected={editTripSelected}
                    mapId={mapId}
                    setIsCreate={setIsCreate}
                    setTagPanelMode={setTagPanelMode}
                    setEditTripSelected={setEditTripSelected}
                    onBack={() => { navigate(`/home`); setIsMapInfo(false); }}
                    onInfo={() => { setView(VIEW.MAP_INFO); setIsMapInfo(true); }}
                    addPlace={addPlace}
                    editPlace={editPlace}
                    onSelectMarker={(marker) => {
                        navigate(`/maps/${mapId}/markers/${marker.id}`);
                        increaseClick(marker.id, "marker");
                        setIsCreate(false);
                    }}
                    onSelectTrip={(trip) => {
                        navigate(`/maps/${mapId}/trips/${trip.id}`);
                        increaseClick(trip.id, "trip");
                        setIsCreate(false);
                    }}
                />
            );
        }

        if (view === VIEW.DETAIL) {
            return (
                <DetailPanel_m
                    currentUser={currentUser}
                    hasDayTag={mode !== "pinListMode" ? true : false}
                    tag={tag}
                    selectedMarker={selectedMarker}
                    selectedTrip={selectedTrip}
                    selectedDay={selectedDay}
                    setSelectedDay={setSelectedDay}
                    markers={markers}
                    tags={tags}
                    trip={trip}
                    mode={mode}
                    onEdit={() => { setView(VIEW.EDIT); setTrip(selectedTrip); setIsEdit(true); }
                    }
                    onBack={() => { navigate(-1); }
                    }
                />
            );
        }

        if (currentUser && view === VIEW.EDIT) {
            return (
                <EditPanel_m
                    currentMap={currentMap}
                    mode={mode}
                    tags={tags}
                    file={file}
                    fileInputRef={fileInputRef}
                    trip={trip}
                    setTrip={setTrip}
                    croppedPreviewUrl={croppedPreviewUrl}
                    selectedMarker={selectedMarker}
                    selectedTrip={selectedTrip}
                    isUploading={isUploading}
                    uploadError={uploadError}
                    uploadError={uploadError}
                    editTag={editTag}
                    setEditTag={setEditTag}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    editIntro={editIntro}
                    setEditIntro={setEditIntro}
                    isMapInfo={isMapInfo}
                    onChangeFile={(e) => {
                        const selectedFile = e.target.files[0];
                        if (!selectedFile) return;

                        setUploadError("");
                        setFile(selectedFile);
                        setCroppedPreviewUrl("");
                        setCropData({
                            crop: { x: 0, y: 0 },
                            zoom: 1,
                        });
                        setShowCropModal(true);

                        e.target.value = null;
                    }}
                    onPickPic={() => fileInputRef.current.click()}
                    onCut={(selectedItem) => {
                        const source = previewUrl || selectedItem?.imageUrl;
                        if (!source) return;

                        setEditCropSource(source);

                        setCropData(
                            file
                                ? cropData
                                : selectedItem?.cropData || {
                                    crop: { x: 0, y: 0 },
                                    zoom: 1,
                                }
                        );

                        setShowCropModal(true);
                    }}
                    onCancel={() => {
                        setIsEdit(false);
                        resetImageState();

                        setUploadError("");
                        if (isMapInfo) {
                            setEditTitle("");
                            setEditIntro("");
                            setEditTag("");
                            setView(VIEW.MAP_INFO);
                        } else {
                            if (mode === "pinListMode") {
                                setEditTitle("");
                                setEditIntro("");
                                setEditTag("");
                            }
                            else {
                                setEditTripSelected("");
                                setSelectedDay(1);
                                setTrip({
                                    title: "",
                                    intro: "",
                                    tag: "",
                                    imageUrl: "",
                                    days: [{
                                        places: []
                                    },]
                                });
                            }
                            setView(VIEW.DETAIL);
                        }
                    }}
                    onSave={async () => {
                        if (isUploading) return;

                        if (isMapInfo) {
                            await editMap(currentMap.id);
                            if (!uploadError) setView(VIEW.MAP_INFO);
                        }
                        else {
                            if (mode === "pinListMode") {
                                await editMarker(selectedMarker.id);
                            } else {
                                await editTrip(selectedTrip.id, trip, file);
                            }
                            if (!uploadError) setView(VIEW.DETAIL);
                        }


                    }
                    }
                    onDelete={() => {
                        if (isMapInfo) {
                            deleteMap(currentMap.id)
                        }
                        else {
                            if (mode === "pinListMode") {
                                deleteMarker(selectedMarker.id)
                            } else {
                                deleteTrip(selectedTrip.id);
                            }
                        }
                    }
                    }
                />
            );
        }

        return null;
    }

    return (
        <>
            {showCropModal && (previewUrl || editCropSource) && (
                <ImageCropModal
                    image={previewUrl || editCropSource}
                    initialCropData={cropData}
                    onCancel={() => setShowCropModal(false)}
                    onSave={async (data) => {
                        const source = previewUrl || editCropSource;

                        setCropData({
                            crop: data.crop,
                            zoom: data.zoom,
                            croppedAreaPixels: data.croppedAreaPixels,
                        });

                        const croppedImg = await getCroppedImg(
                            source,
                            data.croppedAreaPixels
                        );

                        setCroppedPreviewUrl(croppedImg);
                        setShowCropModal(false);
                    }}
                />
            )}

            <motion.div
                className="mobileSheet"
                drag="y" // 📌 允許上下拖曳
                dragControls={dragControls} // 📌 只有 dragControls 可以觸發拖曳，（避免整個 sheet 都能拖）
                dragListener={false}
                dragConstraints={{ // 📌 限制拖曳範圍（避免拖出畫面）
                    top: SHEET_MAX,
                    bottom: SHEET_MIN,
                }}
                dragElastic={0.08}// 📌 拖曳彈性（越大越彈）

                style={{// 📌 用 motion value 控制位置
                    y
                }}
                onDragEnd={onDragEnd}// 📌 放開手時做 snap
            >

                <div
                    className="dragBarArea"
                    onPointerDown={(e) =>
                        dragControls.start(e)}>
                    <div className="dragBar" />
                </div>

                <div className="sheetContent">

                    {view === VIEW.LIST &&
                        <div className="modeButtonContainer">
                            <div className="buttonContainer"
                                onClick={() => { setIsCreate(false); setTagPanelMode("normal"); setEditTripSelected(null); setFilterTag(null); }}>
                                <Link to={`/maps/${mapId}/pinList`} style={{ textDecoration: "none" }}>
                                    <div className={`pinListButton ${mode === "pinListMode" ? "selected" : ""}`}>
                                        地標
                                        {mode === "pinListMode" ?
                                            <PinList_selected fill="#131c21" />
                                            :
                                            <PinList_default fill="#bec94a" />}
                                    </div>
                                </Link>
                            </div>
                            <div className="buttonContainer"
                                onClick={() => { setIsCreate(false); setTagPanelMode("normal"); setEditTripSelected(null); setFilterTag(null); }}>
                                <Link to={`/maps/${mapId}/tripList`} style={{ textDecoration: "none" }}>
                                    <div className={`pinListButton ${mode !== "pinListMode" ? "selected" : ""}`}>
                                        行程
                                        {mode !== "pinListMode" ?
                                            <Post_selected fill="#131c21" />
                                            :
                                            <Post_default fill="#bec94a" />}
                                    </div>
                                </Link>
                            </div>
                        </div>
                    }

                    <div className="ContentContainer"
                        style={{ height: contentHeight + (view === VIEW.LIST && - 61) }}//只有LIST模式，要刪掉模式按鈕的高度
                        onPointerDown={(e) => e.stopPropagation()}>
                        {renderPanel()}
                    </div>

                </div>

            </motion.div>
        </>
    )
}

export default MobileSheet
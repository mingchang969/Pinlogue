import React, { useState, useEffect, useRef } from 'react'
import { doc, getDocs, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "../utils/firebase";
import PinListItem from './PinListItem'
import { ReactComponent as Add } from "../images/Add.svg"
import { ReactComponent as Edit } from "../images/Edit.svg"
import { ReactComponent as Image } from "../images/Image.svg"
import { ReactComponent as Crop } from "../images/Crop.svg"

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
import ListPanel from '../pages/ListPanel';
import DetailPanel from '../pages/DetailPanel';
import EditPanel from '../pages/EditPanel';

function Panel({ currentUser, mapId, currentMap, markers, tags, trips, mode, setTagPanelMode, selected, setSelected,
    filterTag, setFilterTag, isEdit, setIsEdit, isCreate, setIsCreate,
    increaseClick, navigate, trip, setTrip, setSelectedDay, stepTrip, addPlace, editPlace, editTripSelected, setEditTripSelected,
    VIEW, view, setView }) {

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

    const cropDataRef = useRef(null);

    const [croppedPreviewUrl, setCroppedPreviewUrl] = useState(""); // 裁切後的本地預覽圖
    const [editCropSource, setEditCropSource] = useState(""); // 舊圖裁切時的來源網址

    const [isMapInfo, setIsMapInfo] = useState(false);

    const tag = tags.find((o) => o.id === (mode === "pinListMode" ? selectedMarker?.markerTag : selectedTrip?.tag) || null);

    useEffect(() => {

        // resetImageState();
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
    }, [isMapInfo, selected]);

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
        if (!editTitle.trim()) return;

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
            console.log("SAVE CHECK", {
                imageUrl: nextImageUrl,
                cropData: cropDataRef.current,
            });
            await updateDoc(markerDocRef(mapId, markerId), {
                title: editTitle,
                intro: editIntro,
                markerTag: editTag,
                imageUrl: nextImageUrl,
                imageKey: nextImageKey,
                cropData:
                    cropDataRef.current ?? selectedMarker?.cropData,
                updatedAt: new Date(),
            });

            // setIsEdit(false);
            // setEditTitle("");
            // setEditIntro("");
            // setEditTag("");
            // resetImageState();

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
                cropData:
                    cropDataRef.current ?? selectedTrip?.cropData,
                updatedAt: new Date(),
            });

            setIsEdit(false);
            // setTrip({
            //     title: "",
            //     intro: "",
            //     tag: "",
            //     imageUrl: "",
            //     days: [{ places: [] }],
            // });
            setEditTripSelected(null);
            // resetImageState();

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
                cropData:
                    cropDataRef.current ?? currentMap?.cropData,
                updatedAt: new Date(),
            });

            // setIsEdit(false);
            // setEditTitle("");
            // setEditIntro("");
            // setEditTag("");
            // resetImageState();

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
        cropDataRef.current = null;
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
                <ListPanel
                    mode={mode}
                    currentMap={currentMap}
                    markers={markers}
                    trips={trips}
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
                <DetailPanel
                    currentUser={currentUser}
                    hasDayTag={mode !== "pinListMode" ? true : false}
                    tag={tag}
                    trip={trip}
                    selectedMarker={selectedMarker}
                    selectedTrip={selectedTrip}
                    mode={mode}
                    onEdit={() => { setView(VIEW.EDIT); setTrip(selectedTrip); setIsEdit(true); }}
                    onBack={() => { navigate(-1); }}
                />
            );
        }

        if (currentUser && view === VIEW.EDIT) {
            return (
                <EditPanel
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
                    uploadStatus={uploadStatus}
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

                        cropDataRef.current = null;
                        setShowCropModal(true);

                        e.target.value = null;
                    }}
                    onPickPic={() => fileInputRef.current.click()}
                    onCut={(selectedItem) => {
                        const source = previewUrl || selectedItem?.imageUrl;
                        if (!source) return;

                        setEditCropSource(source);

                        const nextCrop =
                            cropDataRef.current ??
                            selectedItem?.cropData ??
                            undefined;

                        cropDataRef.current = nextCrop;
                        setShowCropModal(true);
                    }}
                    onCancel={() => {
                        setIsEdit(false);
                        setUploadError("");
                        if (isMapInfo) {
                            // setEditTitle("");
                            // setEditIntro("");
                            // setEditTag("");
                            setView(VIEW.MAP_INFO);
                        } else {
                            // if (mode === "pinListMode") {
                            //     setEditTitle("");
                            //     setEditIntro("");
                            //     setEditTag("");
                            // }
                            // else {
                            //     setEditTripSelected("");
                            //     setSelectedDay(1);
                            //     setTrip({
                            //         title: "",
                            //         intro: "",
                            //         tag: "",
                            //         imageUrl: "",
                            //         days: [{
                            //             places: []
                            //         },]
                            //     });
                            // }
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
                    key={previewUrl || editCropSource}
                    image={previewUrl || editCropSource}
                    initialCropData={cropDataRef.current}
                    onCancel={() => setShowCropModal(false)}
                    onSave={async (data) => {
                        const source = previewUrl || editCropSource;

                        const nextCropData = {
                            crop: data.crop,
                            zoom: data.zoom,
                            croppedAreaPixels: data.croppedAreaPixels,
                        }

                        cropDataRef.current = nextCropData

                        const croppedImg = await getCroppedImg(
                            source,
                            data.croppedAreaPixels
                        );

                        setCroppedPreviewUrl(croppedImg);
                        setShowCropModal(false);
                    }}
                />
            )}

            <div className='panelContainer'>
                {renderPanel()}
            </div >
        </>

    )
}

export default Panel

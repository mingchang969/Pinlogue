import React, { useState, useEffect, useRef } from 'react'
import { doc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "../utils/firebase";
import PinListItem from './PinListItem'
import { ReactComponent as Add } from "../images/Add.svg"
import { ReactComponent as Edit } from "../images/Edit.svg"
import { ReactComponent as Image } from "../images/Image.svg"
import { ReactComponent as Crop } from "../images/Crop.svg"

import TagSelect from './TagSelect';
import { compressImage } from "../utils/imageCompress";
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
    const fileInputRefTrip = useRef(null);
    const [file, setFile] = useState(null);
    const [fileTrip, setFileTrip] = useState(null);

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

    const [showCropModalTrip, setShowCropModalTrip] = useState(false);
    const [cropDataTrip, setCropDataTrip] = useState({
        crop: { x: 0, y: 0 },
        zoom: 1,
    });
    const [croppedPreviewUrlTrip, setCroppedPreviewUrlTrip] = useState("");
    const [editCropSourceTrip, setEditCropSourceTrip] = useState("");

    const tag = tags.find((o) => o.id === (mode === "pinListMode" ? selectedMarker?.markerTag : selectedTrip?.tag) || null);

    function renderPanel() {
        if (view === VIEW.MAP_INFO) {
            return (
                <MapInfoPanel
                    currentUser={currentUser}
                    currentMap={currentMap}
                    onBack={() => setView(VIEW.LIST)}
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
                    onBack={() => navigate(`/home`)}
                    onInfo={() => setView(VIEW.MAP_INFO)}
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
                    tag={tag}
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
                    mode={mode}
                    tags={tags}
                    file={file}
                    fileInputRef={fileInputRef}
                    fileInputRefTrip={fileInputRefTrip}
                    fileTrip={fileTrip}
                    trip={trip}
                    setTrip={setTrip}
                    croppedPreviewUrl={croppedPreviewUrl}
                    croppedPreviewUrlTrip={croppedPreviewUrlTrip}
                    selectedMarker={selectedMarker}
                    selectedTrip={selectedTrip}
                    isUploading={isUploading}
                    uploadError={uploadError}
                    editTag={editTag}
                    setEditTag={setEditTag}
                    editTitle={editTitle}
                    setEditTitle={setEditTitle}
                    editIntro={editIntro}
                    setEditIntro={setEditIntro}
                    onChangeFile={(e) => {
                        const selectedFile = e.target.files[0];
                        if (!selectedFile) return;

                        setUploadError("");

                        if (mode === "pinListMode") {
                            setFile(selectedFile);
                            setCroppedPreviewUrl("");
                            setCropData({
                                crop: { x: 0, y: 0 },
                                zoom: 1,
                            });
                            setShowCropModal(true);
                        } else {
                            setFileTrip(selectedFile);
                            setCroppedPreviewUrlTrip("");
                            setCropDataTrip({
                                crop: { x: 0, y: 0 },
                                zoom: 1,
                            });
                            setShowCropModalTrip(true);
                        }

                        e.target.value = null;
                    }}
                    onPickPic={() => mode === "pinListMode" ? fileInputRef.current.click() : fileInputRefTrip.current.click()}
                    onCut={(selectedMarker, file) => {
                        const source = previewUrl || selectedMarker?.imageUrl;
                        if (!source) return;

                        setEditCropSource(source);
                        setCropData(
                            file
                                ? cropData
                                : selectedMarker?.cropData || {
                                    crop: { x: 0, y: 0 },
                                    zoom: 1,
                                }
                        );

                        setShowCropModal(true);
                    }}
                    onCutTrip={(selectedTrip, fileTrip) => {
                        const source = previewUrlTrip || selectedTrip?.imageUrl;
                        if (!source) return;

                        setEditCropSourceTrip(source);
                        setCropDataTrip(
                            fileTrip
                                ? cropDataTrip
                                : selectedTrip?.cropData || {
                                    crop: { x: 0, y: 0 },
                                    zoom: 1,
                                }
                        );

                        setShowCropModalTrip(true);
                    }}
                    onCancel={() => {
                        setIsEdit(false);
                        resetImageState();
                        setView(VIEW.DETAIL);
                        setUploadError("");
                        if (mode === "pinListMode") {
                            setEditTitle(selectedMarker?.title || "");
                            setEditIntro(selectedMarker?.intro || "");
                            setEditTag(selectedMarker?.markerTag || "");
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
                    }}
                    onSave={async () => {
                        if (isUploading) return;

                        if (mode === "pinListMode") {
                            await editMarker(selectedMarker.id);
                        } else {
                            await editTrip(selectedTrip.id, trip, fileTrip);
                        }

                        setView(VIEW.DETAIL);
                    }}
                    onDelete={() => mode === "pinListMode" ?
                        deleteMarker(selectedMarker.id) :
                        deleteTrip(selectedTrip.id)}
                />
            );
        }

        return null;
    }

    useEffect(() => {
        if (selectedMarker) {
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
    }, [selectedMarker, selectedTrip]);

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
    async function editTrip(tripId, trip, fileTrip) {
        try {
            const oldImageKey = selectedTrip?.imageKey || "";
            let nextImageUrl = selectedTrip?.imageUrl || "";
            let nextImageKey = selectedTrip?.imageKey || "";

            if (fileTrip) {
                try {
                    setUploadError("");
                    setIsUploading(true);
                    const uploadResult = await uploadImage(fileTrip, "trip", {
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
                cropData: croppedPreviewUrlTrip ? cropDataTrip : (selectedTrip?.cropData || cropDataTrip),
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
            setFileTrip(null);
            setEditTripSelected(null);
            navigate(`/maps/${mapId}/tripList`);
        } catch (err) {
            console.error(err);
            alert("刪除 trip 失敗");
        }
    }

    // 清空預覽圖片暫存資料（返回時用）
    function resetImageState() {
        // marker
        setFile(null);
        setPreviewUrl(null);
        setCroppedPreviewUrl("");
        setEditCropSource("");
        setCropData({
            crop: { x: 0, y: 0 },
            zoom: 1,
        });

        // trip
        setFileTrip(null);
        setPreviewUrlTrip(null);
        setCroppedPreviewUrlTrip("");
        setEditCropSourceTrip("");
        setCropDataTrip({
            crop: { x: 0, y: 0 },
            zoom: 1,
        });
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

            {showCropModalTrip && (previewUrlTrip || editCropSourceTrip) && (
                <ImageCropModal
                    image={previewUrlTrip || editCropSourceTrip}
                    initialCropData={cropDataTrip}
                    onCancel={() => setShowCropModalTrip(false)}
                    onSave={async (data) => {
                        const source = previewUrlTrip || editCropSourceTrip;

                        setCropDataTrip({
                            crop: data.crop,
                            zoom: data.zoom,
                            croppedAreaPixels: data.croppedAreaPixels,
                        });

                        const croppedImg = await getCroppedImg(
                            source,
                            data.croppedAreaPixels
                        );

                        setCroppedPreviewUrlTrip(croppedImg);
                        setShowCropModalTrip(false);
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

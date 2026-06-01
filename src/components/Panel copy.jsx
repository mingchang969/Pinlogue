import React, { useState, useEffect, useRef } from 'react'
import { doc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "../utils/firebase";
import { Link } from 'react-router-dom'
import PinListItem from './PinListItem'
import { ReactComponent as Arrow } from "../images/Arrow_.svg"
import { ReactComponent as Add } from "../images/Add.svg"
import { ReactComponent as Edit } from "../images/Edit.svg"
import { ReactComponent as Leave } from "../images/Leave.svg"
import { ReactComponent as PinList_default } from "../images/PinList_default.svg"
import { ReactComponent as PinList_selected } from "../images/PinList_selected.svg"
import { ReactComponent as Post_default } from "../images/Post_default.svg"
import { ReactComponent as Post_selected } from "../images/Post_selected.svg"
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

function Panel({ mapId, currentMap, markers, tags, trips, mode, setTagPanelMode, selected, setSelected,
    filterTag, isEdit, setIsEdit, isCreate, setIsCreate,
    increaseClick, navigate, trip, setTrip, setSelectedDay, stepTrip, addPlace, editPlace, editTripSelected, setEditTripSelected }) {

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

    const [isMapInfo, setIsMapInfo] = useState(false);

    const tag = tags.find((o) => o.id === (mode === "pinListMode" ? selectedMarker?.markerTag : selectedTrip?.tag) || null);

    useEffect(() => {
        if (selectedMarker) {
            setEditTitle(selectedMarker.title || "");
            setEditIntro(selectedMarker.intro || "");
            setEditTag(selectedMarker.markerTag || "");
            return;
        }
        else if (selectedTrip) {
            return;
        }
        else {
            setEditTitle("");
            setEditIntro("");
            setEditTag("");
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
                {isMapInfo ?
                    <>
                        <div className="markerControlContainer">
                            <div className="return">
                                <div className="button">
                                    <Arrow
                                        onClick={() => {
                                            setIsMapInfo(false);
                                        }} />
                                </div>
                            </div>
                            <div className="title word-break">
                                <span>{currentMap?.title}</span>
                            </div>
                            <div className="edit"><Edit className='button' />
                            </div>
                        </div>
                        <div className="markerInfoContainer">
                            <div className="info">
                                <div className="picture">
                                    <div className="visualCoverFrame">
                                        <CroppedImage
                                            imageUrl={currentMap?.imageUrl}
                                            cropData={currentMap?.cropData}
                                            alt={currentMap?.title}
                                            className="visualCoverImage"
                                        />
                                    </div>
                                </div>
                                <div className="context word-break">{currentMap.intro}</div>
                            </div>
                        </div>
                    </>
                    :
                    !selected ?
                        <>
                            <div className="groupInfoContainer">
                                <div className="groupInfo">
                                    <div className="picture" onClick={() => { setIsMapInfo(true); }}>
                                        <div className="pictureContainer">
                                            <div className="visualCoverFrame">
                                                <CroppedImage
                                                    imageUrl={currentMap?.imageUrl || "/assets/ex_picture.png"}
                                                    cropData={currentMap?.cropData}
                                                    alt={currentMap?.title}
                                                    className="visualCoverImage"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="title word-break">{currentMap?.title || "未命名地圖"}</div>
                                    <div className="button"><Leave onClick={() => { navigate(`/home`) }} /></div>
                                </div>
                            </div>
                            <div className="contentContainer">
                                {
                                    mode === "pinListMode" ?
                                        <>     {
                                            filterTag ?
                                                markers.filter(marker => marker.markerTag === filterTag).slice(0, 200).map((marker) => {
                                                    const tagId = marker.markerTag;
                                                    if (!tagId) return;
                                                    const tag = tags.find((o) => o.id === tagId) || null
                                                    return (
                                                        <PinListItem key={marker.id} data={marker} tag={tag}
                                                            onClick={() => {
                                                                increaseClick(marker.id, "marker");
                                                                navigate(`/maps/${mapId}/markers/${marker.id}`);
                                                                setIsCreate(false);
                                                            }
                                                            } />
                                                    )
                                                }
                                                )
                                                :
                                                markers.slice(0, 200).map((marker) => {
                                                    const tagId = marker.markerTag;
                                                    if (!tagId) return;
                                                    const tag = tags.find((o) => o.id === tagId) || null
                                                    return (
                                                        <PinListItem key={marker.id} data={marker} tag={tag}
                                                            onClick={() => {
                                                                increaseClick(marker.id, "marker");
                                                                navigate(`/maps/${mapId}/markers/${marker.id}`);
                                                                setIsCreate(false);
                                                            }} />
                                                    )
                                                }
                                                )
                                        } </>
                                        : isCreate && stepTrip === 2 ?
                                            filterTag ?
                                                markers.filter(marker => marker.markerTag === filterTag).slice(0, 200).map((marker) => {
                                                    const tagId = marker.markerTag;
                                                    if (!tagId) return;
                                                    const tag = tags.find((o) => o.id === tagId) || null
                                                    return (
                                                        <PinListItem key={marker.id} id={marker.id} data={marker} tag={tag}
                                                            onClick={() => {
                                                                if (editTripSelected) {
                                                                    editPlace(editTripSelected, marker.id);
                                                                } else {
                                                                    addPlace(marker.id);
                                                                }
                                                            }}
                                                        />
                                                    )
                                                }
                                                )
                                                :
                                                markers.slice(0, 200).map((marker) => {
                                                    const tagId = marker.markerTag;
                                                    if (!tagId) return;
                                                    const tag = tags.find((o) => o.id === tagId) || null
                                                    return (
                                                        <PinListItem key={marker.id} id={marker.id} data={marker} tag={tag}
                                                            onClick={() => {
                                                                if (editTripSelected) {
                                                                    editPlace(editTripSelected, marker.id);
                                                                } else {
                                                                    addPlace(marker.id);
                                                                }
                                                            }} />
                                                    )
                                                }
                                                )
                                            : filterTag ?
                                                trips.filter(trip => trip.tag === filterTag).slice(0, 200).map((trip) => {
                                                    const tagId = trip.tag;
                                                    if (!tagId) return;
                                                    const tag = tags.find((o) => o.id === tagId) || null
                                                    return (
                                                        <PinListItem key={trip.id} id={trip.id} data={trip} tag={tag} hasDayTag={true}
                                                            onClick={() => {
                                                                increaseClick(trip.id, "trip");
                                                                navigate(`/maps/${mapId}/trips/${trip.id}`);
                                                                setIsCreate(false);
                                                            }}
                                                        />
                                                    )
                                                }
                                                )
                                                :
                                                trips.slice(0, 200).map((trip) => {
                                                    const tagId = trip.tag;
                                                    if (!tagId) return;
                                                    const tag = tags.find((o) => o.id === tagId) || null
                                                    return (
                                                        <PinListItem key={trip.id} id={trip.id} data={trip} tag={tag} hasDayTag={true}
                                                            onClick={() => {
                                                                increaseClick(trip.id, "trip");
                                                                navigate(`/maps/${mapId}/trips/${trip.id}`);
                                                                setIsCreate(false);
                                                            }} />
                                                    )
                                                }
                                                )
                                }
                            </div>
                            <div className="modeButtonContainer">
                                <div className="buttonContainer"
                                    onClick={() => { setIsCreate(false); setTagPanelMode("normal"); setEditTripSelected(null); }}>
                                    <Link to={`/maps/${mapId}/pinList`} style={{ textDecoration: "none" }}>
                                        <div className={`pinListButton ${mode === "pinListMode" ? "selected" : ""}`}>{mode === "pinListMode" ? <PinList_selected /> : <PinList_default />} </div>
                                    </Link>
                                </div>
                                <div className="buttonContainer"
                                    onClick={() => { setIsCreate(false); setTagPanelMode("normal"); setEditTripSelected(null); }}>
                                    <Link to={`/maps/${mapId}/tripList`} style={{ textDecoration: "none" }}>
                                        <div className={`pinListButton ${mode !== "pinListMode" ? "selected" : ""}`}>{mode !== "pinListMode" ? <Post_selected /> : <Post_default />}</div>
                                    </Link>
                                </div>

                            </div>
                        </>
                        :
                        !isEdit ?
                            <>
                                <div className="markerControlContainer">
                                    <div className="return">
                                        <div className="button">
                                            <Arrow
                                                onClick={() => {
                                                    navigate(-1)
                                                }} />
                                        </div>
                                    </div>
                                    <div className="title word-break">
                                        <i style={{ color: tag?.color }} className={tag?.icon || ""}></i>
                                        <span>{mode === "pinListMode" ? selectedMarker?.title : selectedTrip?.title}</span>
                                    </div>
                                    <div className="edit"><Edit className='button'
                                        onClick={() => {
                                            setIsEdit(true);
                                            setTrip(selectedTrip);
                                        }} />
                                        {/* <Add className='button' /> */}
                                    </div>
                                </div>
                                <div className="markerInfoContainer">
                                    <div className="info">
                                        <div className="picture">
                                            <div className="visualCoverFrame">
                                                <CroppedImage
                                                    imageUrl={selectedMarker?.imageUrl}
                                                    cropData={selectedMarker?.cropData}
                                                    alt={selectedMarker?.title}
                                                    className="visualCoverImage"
                                                />
                                            </div>
                                        </div>
                                        <div className="context word-break">{mode === "pinListMode" ? selectedMarker?.intro : selectedTrip?.intro}</div>
                                    </div>
                                    <div className="discussion"></div>
                                </div>
                            </>
                            :
                            <>
                                <div className="markerControlContainer">
                                    <div className="return">
                                        <div className="button"><Arrow onClick={() => {
                                            resetImageState();
                                            setIsEdit(false);
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
                                        }} /></div>
                                    </div>
                                    <div className="isEdit">
                                        <TagSelect
                                            style={{ width: "138px", flex: "none" }}
                                            options={
                                                tags.filter((tag) => tag.tagType === (mode === "pinListMode" ? "marker" : "trip"))
                                            }
                                            value={mode === "pinListMode" ? editTag : trip?.tag ? trip.tag : ""}
                                            onChange={mode === "pinListMode" ? (v) => setEditTag(v) : handleTripChange} />
                                        <input
                                            type="text"
                                            name="title"
                                            placeholder="輸入標題"
                                            value={mode === "pinListMode" ? editTitle : trip?.title}
                                            onChange={mode === "pinListMode" ? (e) => setEditTitle(e.target.value) : handleTripChange}
                                            style={{ width: "100%" }}
                                        />
                                    </div>
                                </div>
                                <div className="markerInfoContainer">
                                    <div className="info">
                                        <div className="editPicture">
                                            <div className="editControl">
                                                <div className="button" onClick={() => mode === "pinListMode" ? fileInputRef.current.click() : fileInputRefTrip.current.click()}><Image />選圖</div>
                                                {mode === "pinListMode"
                                                    ? (file || selectedMarker?.imageUrl) && (
                                                        <div
                                                            className="button"
                                                            onClick={() => {
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
                                                        >
                                                            <Crop />裁切
                                                        </div>
                                                    )
                                                    : (fileTrip || selectedTrip?.imageUrl) && (
                                                        <div
                                                            className="button"
                                                            onClick={() => {
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
                                                        >
                                                            <Crop />裁切
                                                        </div>
                                                    )}
                                            </div>
                                            <div className="visualCoverFrame">
                                                {mode === "pinListMode" ? (
                                                    croppedPreviewUrl ? (
                                                        <VisualCover image={croppedPreviewUrl} />
                                                    ) : (
                                                        <CroppedImage
                                                            imageUrl={selectedMarker?.imageUrl}
                                                            cropData={selectedMarker?.cropData}
                                                            alt={selectedMarker?.title}
                                                            className="visualCoverImage"
                                                        />
                                                    )
                                                ) : (
                                                    croppedPreviewUrlTrip ? (
                                                        <VisualCover image={croppedPreviewUrlTrip} />
                                                    ) : (
                                                        <CroppedImage
                                                            imageUrl={selectedTrip?.imageUrl}
                                                            cropData={selectedTrip?.cropData}
                                                            alt={selectedTrip?.title}
                                                            className="visualCoverImage"
                                                        />
                                                    )
                                                )}
                                            </div>
                                            <input
                                                type="file"
                                                ref={mode === "pinListMode" ? fileInputRef : fileInputRefTrip}
                                                style={{ display: "none" }}
                                                onChange={(e) => {
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
                                            />
                                        </div>
                                        <div className="context">
                                            <textarea
                                                rows="6"
                                                name="intro"
                                                placeholder="輸入描述"
                                                value={mode === "pinListMode" ? editIntro : trip?.intro}
                                                onChange={mode === "pinListMode" ? (e) => setEditIntro(e.target.value) : handleTripChange}
                                                style={{ width: "100%", height: "100%" }}
                                            />
                                        </div>
                                    </div>
                                    <div className="editControl">
                                        <div
                                            onClick={() => {
                                                if (isUploading) return;
                                                return mode === "pinListMode"
                                                    ? editMarker(selectedMarker.id)
                                                    : editTrip(selectedTrip.id, trip, fileTrip);
                                            }}
                                            className={`buttonFinish ${isUploading ? "disable" : ""}`} >更新
                                        </div>
                                        <div onClick={() => mode === "pinListMode" ?
                                            deleteMarker(selectedMarker.id) :
                                            deleteTrip(selectedTrip.id)
                                        } className="buttonDelete">刪除</div>
                                    </div>
                                    {uploadError && (
                                        <div style={{ display: "flex", justifyContent: "center", color: "#da4d4d", margin: "8px 24px", fontSize: "12px" }}>
                                            {uploadError}
                                        </div>
                                    )}
                                </div>

                            </>
                }

            </div >
        </>

    )
}

export default Panel

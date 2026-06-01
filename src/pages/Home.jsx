import React, { useEffect, useState, useRef } from 'react';
import { addDoc, updateDoc, increment, collection, onSnapshot, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "../utils/firebase";
import { auth } from "../utils/firebase";

import { ReactComponent as Logo } from "../images/Logo.svg"
import { ReactComponent as Hot } from "../images/Hot.svg"
import { ReactComponent as Stack } from "../images/Stack.svg"
import { ReactComponent as New } from "../images/New.svg"
import { ReactComponent as Add } from "../images/Add.svg"
import { ReactComponent as Picture } from "../images/Picture.svg"
import { ReactComponent as CancelPin } from "../images/CancelPin.svg"
import { ReactComponent as Arrow } from "../images/Arrow_.svg"

import ImageCropModal from '../components/ImageCropModal';
import VisualCover from '../components/VisualCover';
import { getCroppedImg } from "../utils/cropImage";
import { uploadImage } from "../utils/uploadImage";

import { mapsRef, mapDocRef } from "../utils/mapRefs";

import MapListItem from '../components/MapListItem';
import { Link, useNavigate } from "react-router-dom";
import { reload, signOut } from "firebase/auth";
import { button } from 'motion/react-client';

function LookMoreBtn({ onClick }) {
    return (
        <div className="lookMoreBtn" onClick={onClick}>
            查看更多
        </div>
    );
}

function Home({ currentUser }) {

    const [hotMaps, setHotMaps] = useState([]);
    const [diverseMaps, setDiverseMaps] = useState([]);
    const [newMaps, setNewMaps] = useState([]);

    const [keyingWord, setKeyingWord] = useState("");
    const [isCreate, setIsCreate] = useState(false);

    const [title, setTitle] = useState("");
    const [intro, setIntro] = useState("");
    const [publicity, setPublicity] = useState("public");

    const fileInputRefTrip = useRef(null);
    const [file, setFile] = useState(null);

    const [showCropModal, setShowCropModal] = useState(false);
    const [cropData, setCropData] = useState({
        crop: { x: 0, y: 0 },
        zoom: 1,
    });
    const [croppedPreviewUrl, setCroppedPreviewUrl] = useState("");

    const [uploadStatus, setUploadStatus] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");

    const [previewUrl, setPreviewUrl] = useState(null);

    const navigate = useNavigate();

    const [filterMode, setFilterMode] = useState("");

    useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(() => {
        const hotQuery = query(
            collection(db, "maps"),
            orderBy("hotRank", "asc"),
            limit(200)
        );

        const diverseQuery = query(
            collection(db, "maps"),
            orderBy("diverseRank", "asc"),
            limit(200)
        );

        const newQuery = query(
            collection(db, "maps"),
            orderBy("newRank", "asc"),
            limit(200)
        );

        const unsubHot = onSnapshot(hotQuery, (snapshot) => {
            setHotMaps(
                snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }))
            );
        });

        const unsubDiverse = onSnapshot(diverseQuery, (snapshot) => {
            setDiverseMaps(
                snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }))
            );
        });

        const unsubNew = onSnapshot(newQuery, (snapshot) => {
            setNewMaps(
                snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }))
            );
        });

        return () => {
            unsubHot();
            unsubDiverse();
            unsubNew();
        };
    }, []);

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

    async function increaseClick(id) {
        if (!id) return;

        await updateDoc(mapDocRef(id), {
            clickCount: increment(1),
            updatedAt: new Date()
        });
        return;

    }

    async function addMap() {
        if (!title.trim() || !intro.trim()) {
            alert("請完整填寫標題、描述");
            return;
        }

        let uploadedUrl = "";
        let uploadedKey = "";

        if (file) {
            try {
                setUploadError("");
                setIsUploading(true);
                const result = await uploadImage(file, "map", {
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

        await addDoc(mapsRef(), {
            title,
            intro,
            imageUrl: uploadedUrl,
            imageKey: uploadedKey,
            cropData,
            publicity,
            clickCount: 0,
            markerCount: 0,
            tripCount: 0,
            hotRank: 999999999,
            lastHotRank: 999999999,
            diverseRank: 999999999,
            lastDiverseRank: 999999999,
            newRank: 999999999,
            lastNewRank: 999999999,
            diversityScore: 0,
            createdAt: new Date(),
        });

        setIsCreate(false);
        setTitle("");
        setIntro("");
        setPublicity("public");
        setFile(null);
        setCropData({
            crop: { x: 0, y: 0 },
            zoom: 1,
        });
    }

    return (
        <div className='home'>

            <div className="headerContainer" >
                <div className="return">
                    {filterMode !== "" && <Arrow onClick={() => { setFilterMode(""); }} />}
                </div>
                <div className="logo">
                    <Logo />
                </div>
                <div className="control">
                    {/* <input
                    className="searchBarInput"
                    placeholder="想探索什麼呢..."
                    type="text"
                    value={keyingWord}
                    onChange={(e) => {
                        setKeyingWord(e.target.value);
                    }}
                /> */}
                    {currentUser &&
                        <button className='buttonDelete' onClick={() => { signOut(auth); }}>登出</button>}
                </div>
            </div>

            <div className="contentContainer">

                <div className="leftContainer"></div>

                <div className="mainContainer">
                    {(filterMode === "" || filterMode === "hotMode") &&
                        <div className="categoryContainer">
                            <div style={{ backgroundColor: "#4A2A35" }} className="titleHeader">
                                <Hot />熱門
                            </div>
                            <div className="listContainer">

                                {isMobile && filterMode === "" ?
                                    hotMaps.slice(0, 5).map((map) => {
                                        return (
                                            <MapListItem
                                                key={map.id}
                                                data={map}
                                                rank={map.hotRank}
                                                lastRank={map.lastHotRank}
                                                onClick={() => {
                                                    increaseClick(map.id);
                                                    navigate(`/maps/${map.id}/pinList`);
                                                }} />
                                        )
                                    }) :
                                    hotMaps.slice(0, 200).map((map) => {
                                        return (
                                            <MapListItem
                                                key={map.id}
                                                data={map}
                                                rank={map.hotRank}
                                                lastRank={map.lastHotRank}
                                                onClick={() => {
                                                    increaseClick(map.id);
                                                    navigate(`/maps/${map.id}/pinList`);
                                                }} />
                                        )
                                    })}
                                {isMobile && hotMaps.length > 5 && filterMode === "" ? <LookMoreBtn onClick={() => { setFilterMode("hotMode"); }} /> : null}
                            </div>
                        </div>}
                    {(filterMode === "" || filterMode === "diverseMode") &&
                        <div className="categoryContainer">
                            <div style={{ backgroundColor: "#4A422D" }} className="titleHeader">
                                <Stack />多元
                            </div>
                            <div className="listContainer">
                                {isMobile && filterMode === "" ?
                                    diverseMaps.slice(0, 5).map((map) => {
                                        return (
                                            <MapListItem
                                                key={map.id}
                                                data={map}
                                                rank={map.diverseRank}
                                                lastRank={map.lastDiverseRank}
                                                onClick={() => {
                                                    increaseClick(map.id);
                                                    navigate(`/maps/${map.id}/pinList`);
                                                }} />
                                        )
                                    }) :
                                    diverseMaps.slice(0, 200).map((map) => {
                                        return (
                                            <MapListItem
                                                key={map.id}
                                                data={map}
                                                rank={map.diverseRank}
                                                lastRank={map.lastDiverseRank}
                                                onClick={() => {
                                                    increaseClick(map.id);
                                                    navigate(`/maps/${map.id}/pinList`);
                                                }} />
                                        )
                                    })}
                                {isMobile && diverseMaps.length > 5 && filterMode === "" ? <LookMoreBtn onClick={() => { setFilterMode("diverseMode"); }} /> : null}
                            </div>
                        </div>}

                    {(filterMode === "" || filterMode === "newMode") &&
                        <div className="categoryContainer">
                            <div style={{ backgroundColor: "#243E54" }} className="titleHeader">
                                <New />最新
                            </div>
                            <div className="listContainer">
                                {isMobile && filterMode === "" ?
                                    newMaps.slice(0, 5).map((map) => {
                                        return (
                                            <MapListItem
                                                key={map.id}
                                                data={map}
                                                rank={map.newRank}
                                                lastRank={map.lastNewRank}
                                                onClick={() => {
                                                    increaseClick(map.id);
                                                    navigate(`/maps/${map.id}/pinList`);
                                                }} />
                                        )
                                    }) : newMaps.slice(0, 200).map((map) => {
                                        return (
                                            <MapListItem
                                                key={map.id}
                                                data={map}
                                                rank={map.newRank}
                                                lastRank={map.lastNewRank}
                                                onClick={() => {
                                                    increaseClick(map.id);
                                                    navigate(`/maps/${map.id}/pinList`);
                                                }} />
                                        )
                                    })}
                                {isMobile && newMaps.length > 5 && filterMode === "" ? <LookMoreBtn onClick={() => { setFilterMode("newMode"); }} /> : null}
                            </div>
                        </div>}

                </div>

                <div className="leftContainer"></div>
            </div>

            {showCropModal && previewUrl && (
                <ImageCropModal
                    image={previewUrl}
                    initialCropData={cropData}
                    onCancel={() => setShowCropModal(false)}
                    onSave={async (data) => {
                        setCropData({
                            crop: data.crop,
                            zoom: data.zoom,
                            croppedAreaPixels: data.croppedAreaPixels,
                        });

                        const croppedImg = await getCroppedImg(
                            previewUrl,
                            data.croppedAreaPixels
                        );

                        setCroppedPreviewUrl(croppedImg);

                        setShowCropModal(false);
                    }}
                />
            )}

            {currentUser &&
                <div className="addButton">
                    <button onClick={() => setIsCreate(!isCreate)}>
                        {isCreate ? <CancelPin /> : <Add />}
                    </button>
                </div>}

            {
                isCreate &&
                <div className="addPanel">
                    <div className="picture" onClick={() => {
                        fileInputRefTrip.current.click();
                    }}>
                        <Picture className="icon" />
                        {file && <VisualCover image={croppedPreviewUrl} />}

                        <input type="file" name="file" ref={fileInputRefTrip} onChange={(e) => {
                            const selectedFile = e.target.files[0]
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

                        <input
                            type="text"
                            name="title"
                            placeholder="輸入標題"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />

                        <div className="contentContainer">
                            <textarea
                                name="intro"
                                placeholder="輸入描述"
                                value={intro}
                                onChange={(e) => setIntro(e.target.value)}
                                style={{ width: "100%", height: "100%" }}
                            />
                        </div>
                        {uploadError && (
                            <div style={{ display: "flex", justifyContent: "center", color: "#da4d4d", margin: "8px 24px", fontSize: "12px" }}>
                                {uploadError}
                            </div>
                        )}
                        <div className="controlContainer">
                            <button
                                style={{ width: "100%" }}
                                className={`buttonFinish ${title.trim() && intro ? "" : "disable"} `}
                                onClick={() => { if (isUploading) return; addMap() }} >
                                {isUploading
                                    ? uploadStatus === "compressing"
                                        ? "壓縮中..."
                                        : "上傳中..."
                                    : "新增"}
                            </button>
                        </div>

                    </div>
                </div>
            }


        </div >
    )
}

export default Home

import React from 'react';
import { ReactComponent as Arrow } from "../images/Arrow_.svg";
import { ReactComponent as Image } from "../images/Image.svg";
import { ReactComponent as Crop } from "../images/Crop.svg";

import TagSelect from '../components/TagSelect';
import VisualCover from '../components/VisualCover';
import CroppedImage from '../components/CroppedImage';
function EditPanel({
    currentMap,
    mode,
    file,
    fileInputRef,
    croppedPreviewUrl,
    trip,
    selectedMarker,
    selectedTrip,
    tags,
    setTrip,
    editTag,
    setEditTag,
    editTitle,
    setEditTitle,
    editIntro,
    setEditIntro,
    isUploading,
    uploadStatus,
    uploadError,
    onChangeFile,
    onPickPic,
    onCut,
    onCancel,
    onSave,
    onDelete,
    isMapInfo
}) {
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

    const selected = isMapInfo
        ? currentMap
        : selectedMarker
            ? selectedMarker
            : selectedTrip;

    return (
        <>
            <div className="markerControlContainer">
                <div className="return">
                    <div className="button"><Arrow onClick={onCancel} /></div>
                </div>
                <div className="isEdit">
                    {!isMapInfo &&
                        <TagSelect
                            style={{ width: "138px", flex: "none" }}
                            options={
                                tags.filter((tag) => tag.tagType === (mode === "pinListMode" ? "marker" : "trip"))
                            }
                            value={mode === "pinListMode" ? editTag : trip?.tag ? trip.tag : ""}
                            onChange={mode === "pinListMode" ? (v) => setEditTag(v) : (v) => handleTripChange("tag", v)} />}

                    <input
                        type="text"
                        name="title"
                        placeholder="輸入標題"
                        value={mode === "pinListMode" || isMapInfo ? editTitle : trip?.title || ""}
                        onChange={mode === "pinListMode" || isMapInfo ? (e) => setEditTitle(e.target.value) : handleTripChange}
                        style={{ width: "100%" }}
                    />
                </div>
            </div>
            <div className="markerInfoContainer">
                <div className="info">
                    <div className="editPicture">
                        <div className="editControl">
                            <div className="button" onClick={onPickPic}><Image />選圖</div>
                            {(file || selected?.imageUrl) && (
                                <div
                                    className="button"
                                    onClick={() => {
                                        onCut(selected)
                                    }}
                                >
                                    <Crop />裁切
                                </div>
                            )}
                        </div>
                        <div className="visualCoverFrame">
                            {croppedPreviewUrl ? (
                                <VisualCover image={croppedPreviewUrl} />
                            ) : (
                                <CroppedImage
                                    imageUrl={selected?.imageUrl}
                                    cropData={selected?.cropData}
                                    alt={selected?.title}
                                    className="visualCoverImage"
                                />
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={onChangeFile}
                        />
                    </div>
                    <div className="context">
                        <textarea
                            rows="6"
                            name="intro"
                            placeholder="輸入描述"
                            value={mode === "pinListMode" || isMapInfo ? editIntro : trip?.intro || ""}
                            onChange={mode === "pinListMode" || isMapInfo ? (e) => setEditIntro(e.target.value) : handleTripChange}
                            style={{ width: "100%", height: "100%" }}
                        />
                    </div>
                </div>
                <div className="editControl">
                    <div
                        onClick={() => { if (isUploading) return; onSave(); }}
                        className={`buttonFinish ${isUploading ? "disable" : ""}`} >{
                            isUploading ? uploadStatus === "compressing"
                                ? "壓縮中..."
                                : "上傳中..."
                                : "更新"}
                    </div>
                    <div onClick={onDelete} className="buttonDelete">刪除</div>
                </div>
                {uploadError && (
                    <div style={{ display: "flex", justifyContent: "center", color: "#da4d4d", margin: "8px 24px", fontSize: "12px" }}>
                        {uploadError}
                    </div>
                )}
            </div>
        </>
    )
}

export default EditPanel

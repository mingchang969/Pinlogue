import React, { useCallback, useState } from "react";
import Cropper from "react-easy-crop";

function ImageCropModal({ image, initialCropData, onCancel, onSave }) {
    const [crop, setCrop] = useState(initialCropData?.crop || { x: 0, y: 0 });
    const [zoom, setZoom] = useState(initialCropData?.zoom || 1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const stopEvent = (e) => {
        e.stopPropagation();
    };

    return (
        <div className="cropModalBackdrop" onClick={onCancel}>
            <div
                className="cropModal"
                onClick={stopEvent}
                onMouseDown={stopEvent}
                onTouchStart={stopEvent}
                onPointerDown={stopEvent}
                onWheel={stopEvent}
            >
                <div
                    className="cropContainer"
                    onMouseDown={stopEvent}
                    onTouchStart={stopEvent}
                    onPointerDown={stopEvent}
                    onWheel={stopEvent}
                >
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        showGrid={false}
                    />
                </div>

                <div className="cropControls">
                    <span>縮放</span>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                    />
                </div>

                <div className="cropButtons">
                    <button style={{ backgroundColor: "#aaa" }} type="button" onClick={onCancel}>取消</button>
                    <button
                        style={{ backgroundColor: "#bec94a" }}
                        type="button"
                        onClick={() =>
                            onSave({
                                crop,
                                zoom,
                                croppedAreaPixels,
                            })
                        }
                    >
                        儲存
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ImageCropModal;
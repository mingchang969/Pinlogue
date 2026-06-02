import React from 'react'
import CroppedImage from './CroppedImage'
import { ReactComponent as Leave } from "../images/Leave.svg"

function MobileHeader({ currentMap, navigate, VIEW, setView, setIsMapInfo, expandHalf }) {
    return (
        <div className="mobileHeader">
            <div className="groupInfoContainer">
                <div className="groupInfo">
                    <div className="picture" onClick={() => { setView(VIEW.MAP_INFO); setIsMapInfo(true); expandHalf(); }}>
                        <div className="pictureContainer">
                            <div className="visualCoverFrame">
                                <CroppedImage
                                    imageUrl={currentMap?.imageUrl}
                                    cropData={currentMap?.cropData}
                                    alt={currentMap?.title}
                                    className="visualCoverImage"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="title word-break">{currentMap?.title || "未命名地圖"}</div>
                    <div className="button"><Leave onClick={() => { navigate("/home") }} /></div>
                </div>
            </div>
        </div>
    )
}

export default MobileHeader

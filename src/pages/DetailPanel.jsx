import React from 'react'
import { ReactComponent as Arrow } from "../images/Arrow_.svg"
import { ReactComponent as Edit } from "../images/Edit.svg"
import CroppedImage from '../components/CroppedImage'

function DetailPanel({ currentUser, tag, selectedMarker, selectedTrip, mode, onBack, onEdit, trip, hasDayTag }) {
    return (
        <>
            <div className="markerControlContainer">
                <div className="return">
                    <div className="button">
                        <Arrow
                            onClick={onBack} />
                    </div>
                </div>
                <div className="title word-break">
                    <div className={(hasDayTag && "tag") || ""} style={{ borderColor: hasDayTag && tag?.color }}>
                        <div className="icon">
                            <i style={{ color: tag?.color || "#777" }} className={tag?.icon || "bi bi-question-diamond-fill"}></i>
                        </div>
                        {hasDayTag ?
                            <div className="dayTag" style={{ color: tag?.color }}>{`${trip?.days.length}日遊`}</div> : null}
                    </div>
                    <span>{mode === "pinListMode" ? selectedMarker?.title : selectedTrip?.title}</span>
                </div>
                {currentUser &&
                    <div className="edit"><Edit className='button'
                        onClick={onEdit} />
                    </div>}
            </div>
            <div className="markerInfoContainer">
                <div className="info">
                    <div className="picture">
                        <div className="visualCoverFrame">
                            <CroppedImage
                                imageUrl={
                                    mode === "pinListMode"
                                        ? selectedMarker?.imageUrl
                                        : selectedTrip?.imageUrl
                                }
                                cropData={
                                    mode === "pinListMode"
                                        ? selectedMarker?.cropData
                                        : selectedTrip?.cropData
                                }
                                alt={
                                    mode === "pinListMode"
                                        ? selectedMarker?.title
                                        : selectedTrip?.title
                                }
                                className="visualCoverImage"
                            />
                        </div>
                    </div>
                    <div className="context word-break">{mode === "pinListMode" ? selectedMarker?.intro : selectedTrip?.intro}</div>
                </div>
                <div className="discussion"></div>
            </div>
        </>
    )
}

export default DetailPanel

import React from 'react'
import { ReactComponent as Arrow } from "../images/Arrow_.svg"
import { ReactComponent as Edit } from "../images/Edit.svg"
import { ReactComponent as Add } from "../images/Add.svg"
import CroppedImage from '../components/CroppedImage'
import TripItem from '../components/TripItem'

import { transportOptions } from "../config/optionConfig";

function DetailPanel_m({ mapId, currentUser, tag, selectedMarker, selectedTrip, mode, onBack, onEdit,
    markers, tags, trip, scrollRef, selectedDay, setSelectedDay, hasDayTag, increaseClick, navigate }) {

    // 將 分 轉為 小時和分
    function formatDuration(mins) {
        if (mins === null) return "無法計算"

        const h = Math.floor(mins / 60);
        const m = mins % 60;

        if (h === 0) return `${m}分`;
        if (m === 0) return `${h}小時`;

        return `${h} 小時 ${m} 分`
    }

    return (
        <>
            <div className="markerControlContainer">

                {currentUser &&
                    <div className="edit"><Edit className='button'
                        onClick={onEdit} />
                    </div>}


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

                <div className="return">
                    <div className="button">
                        <Arrow
                            onClick={onBack} />
                    </div>
                </div>
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
                {mode === "pinListMode" ?
                    <div className="discussion"></div>
                    :
                    <div className="tripPanel">
                        <div className="secStep">

                            <div className="titleContainer" style={{ display: "flex", justifyContent: "center" }}>
                                <div >行程表</div>
                                <div className="dayContainer">
                                    {/* <button className="button"
                                    onClick={() => { addDay(); setSelectedDay(Number(trip.days.length) + 1); }}><Add /></button> */}
                                    <div className="selectContainer">
                                        {trip?.days.map((day, index) => {
                                            const dayNumber = index + 1;
                                            return (<button
                                                key={index}
                                                className={`buttonSelect ${selectedDay === Number(dayNumber) ? "selected" : ""}`}
                                                onClick={() => setSelectedDay(Number(dayNumber))}>第 {dayNumber} 天</button>)
                                        }
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="contentContainer" ref={scrollRef}>

                                {(() => {
                                    let placeNumber = 0;

                                    return selectedTrip?.days[selectedDay - 1]?.places.map((place, index) => {
                                        if (place.type === "transport") {
                                            return (
                                                <div className="transport" key={"transport-" + index}>
                                                    <div className="transportContainer">
                                                        <div className="type">
                                                            {transportOptions.find(o => o.value === place.transportType)?.text}
                                                        </div>
                                                        <div className="line">
                                                            <div className="dot"></div>
                                                            <div className="dot"></div>
                                                        </div>
                                                        <div className="time">
                                                            {place.duration > 0 ? (
                                                                <span>{formatDuration(place.duration)}</span>
                                                            ) : place.duration < 0 ? (
                                                                <span style={{ color: "#ee9144" }}>時間衝突</span>
                                                            ) : place.duration === 0 ? (
                                                                <span style={{ color: "#fff" }}>時間太短</span>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        placeNumber++;

                                        return (
                                            <TripItem
                                                key={place.id}
                                                markers={markers}
                                                tags={tags}
                                                place={place}
                                                placeNumber={placeNumber}
                                                selectedDay={selectedDay}
                                                onClick={() => {
                                                    increaseClick(place.markerId, "marker");
                                                    navigate(`/maps/${mapId}/markers/${place.markerId}`);
                                                }}
                                            />
                                        );
                                    });
                                })()}
                            </div>
                            <div className="controlContainer">

                            </div>
                        </div>
                    </div>
                }

            </div>
        </>
    )
}

export default DetailPanel_m

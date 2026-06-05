import React, { useEffect, useState, useRef } from 'react'
import TimePicker from './TimePicker';
import CroppedImage from './CroppedImage';
import { ReactComponent as Cross } from "../images/Cross.svg"

function TripItem({ markers, tags, place, placeNumber, onClick, editTripSelected, setEditTripSelected, setTrip, selectedDay, scrollContainer, isEdit = false }) {

    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [isSelected, setIsSelected] = useState(place.id === editTripSelected ? true : false);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    const marker = markers.find((m) => m.id === place.markerId);
    const tag = tags.find((t) => t.id === marker?.markerTag);

    const startRef = useRef(null);
    const endRef = useRef(null);


    useEffect(() => {
        setIsSelected(place.id === editTripSelected);
    }, [editTripSelected, place.id])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                !startRef.current?.contains(e.target) &&
                !endRef.current?.contains(e.target)
            ) {
                setShowStartPicker(false);
                setShowEndPicker(false);
            }
        };

        window.addEventListener("click", handleClickOutside);

        return () => window.removeEventListener("click", handleClickOutside);
    }, []);

    // 順著ref去更新新位置
    function updatePosition() {
        let target = null;
        if (showStartPicker) target = startRef.current;
        if (showEndPicker) target = endRef.current;
        if (!target) return;

        const rect = target.getBoundingClientRect();

        setPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX
        });
    }


    // 監聽當 拖動視窗時 ，順著ref去更新新位置
    useEffect(() => {
        if (!showStartPicker && !showEndPicker) return;

        updatePosition(); //  初始也要算一次
        window.addEventListener("resize", updatePosition);

        return () => {
            window.removeEventListener("resize", updatePosition);
        };
    }, [showStartPicker, showEndPicker]);

    // 監聽當 當滾動timePicker以外時 ，關掉視窗
    useEffect(() => {
        if (!scrollContainer) return;

        const handleScroll = (e) => {

            const timePickerEl = document.querySelector(".timePicker");
            if (!timePickerEl) return;

            if (!timePickerEl.contains(e.target)) {
                setShowStartPicker(false);
                setShowEndPicker(false);
            }
        };

        scrollContainer.addEventListener("scroll", handleScroll);

        return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }, [scrollContainer]);

    function calcTransport(prePlace, nextPlace) {
        if (!prePlace.endTime || !nextPlace.startTime) return null;

        const toMin = (t) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + m;
        }

        const diff = toMin(nextPlace.startTime) - toMin(prePlace.endTime);

        return diff;
    }

    function updateTransport(day) {
        const places = day.places;

        return places
            .map((item, i) => {
                if (item.type !== "transport") return item;

                const prev = places[i - 1];
                const next = places[i + 1];

                if (prev && next) {
                    return {
                        ...item,
                        duration: calcTransport(prev, next)
                    };
                }

                return item;
            })
            .filter(Boolean);

    }

    function deletePlace(placeId) {
        if (!window.confirm("確定要刪除這個行程嗎？")) return;

        setTrip(prev => ({
            ...prev,
            days: prev.days.map((day, index) => {
                if (index !== selectedDay - 1) return day;

                const places = [...day.places];
                const targetIndex = places.findIndex(p => p.id === placeId);

                if (targetIndex === -1) return day;

                const newPlaces = places.filter((p, i) => {
                    // 剛點要刪的 place，就刪掉
                    if (p.id === placeId) return false;
                    // 如果是 倒數第二 ， 且是transport，且後面一個也是剛點要刪的 place，就刪掉
                    if (places.length - 2 === i &&
                        places[i + 1]?.id === placeId &&
                        p.type === "transport") return false;
                    // 如果是 transport，且前面一個 也是剛點要刪的 place，就刪掉
                    if (
                        places[i - 1]?.id === placeId &&
                        p.type === "transport"
                    ) return false;
                    // 其餘的都留下
                    return true;
                });

                const newDay = {
                    ...day,
                    places: newPlaces
                };

                return {
                    ...newDay,
                    places: updateTransport(newDay)
                    // 當被 updateTransport()後，最後是只return places，所以要在重包成一個 Day
                };
            })
        }));

        setEditTripSelected("");

    }

    function timeToMinutes(t) { // 將 時間00:00字串 轉成分鐘
        if (!t) return null;
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    }

    function getDuration(start, end) {// 計算起始與結束間的分鐘數
        const s = timeToMinutes(start);
        const e = timeToMinutes(end);

        if (s === null || e === null) return null;
        if (e < s) return null;

        return e - s;
    }

    function formatDuration(mins) {
        if (mins === null) return "無法計算"

        const h = Math.floor(mins / 60);
        const m = mins % 60;

        if (h === 0) return `${m}分`;
        if (m === 0) return `${h}小時`;

        return `${h} 小時 ${m} 分`
    }

    return (
        <div
            className={`tripItem${editTripSelected ? isSelected ? "" : " unselected" : ""}`}
            style={
                isSelected ? { borderColor: tag?.color } : { borderColor: "transparent" }
            }
            onClick={onClick}>

            {editTripSelected === place.id &&
                <div className="deleteButton"
                    onClick={(e) => {
                        if (isSelected) e.stopPropagation()
                        deletePlace(place.id);
                    }}><Cross /></div>}
            {placeNumber && <div className="placeNumberTag" style={{ position: "absolute", top: "0", left: "0" }}>{placeNumber}</div>}
            <div className="pictureContainer">
                <div className="visualCoverFrame">
                    <CroppedImage
                        imageUrl={marker?.imageUrl}
                        cropData={marker?.cropData}
                        alt={marker?.title}
                        className="visualCoverImage"
                    />
                </div>
            </div>
            <div className="infoContainer">
                {(isEdit || (!isEdit && place.startTime)) &&
                    <div className="timeBar"
                        ref={startRef}
                        style={{
                            backgroundColor: isSelected ? "transparent" : tag?.color,
                            borderColor: tag?.color
                        }}
                        onClick={(e) => {
                            if (isSelected) e.stopPropagation();
                            updatePosition();
                            setShowStartPicker((prev) => !prev);
                            setShowEndPicker(false);
                        }}
                    >
                        {place.startTime || (isSelected ? "選擇時間" : "未選擇")}

                        {isSelected && showStartPicker && (
                            <TimePicker
                                position={position}
                                initialTime={place.startTime}
                                minTime={null}
                                maxTime={place.endTime}
                                onSelect={(time) => {

                                    setTrip(prev => ({
                                        ...prev,
                                        days: prev.days.map((day, i) => {
                                            if (i !== selectedDay - 1) return day;

                                            const updatedDay = {
                                                ...day,
                                                places: day.places.map(p =>
                                                    p.id === place.id
                                                        ? { ...p, startTime: time }
                                                        : p
                                                )
                                            };

                                            return {
                                                ...updatedDay,
                                                places: updateTransport(updatedDay)
                                            };
                                        })
                                    }));
                                }}
                            />
                        )}
                    </div>
                }
                <div className="mainBar">
                    <div className="info">
                        <div className="title">
                            <i style={{ color: tag?.color }} className={tag?.icon || "bi bi-question-diamond-fill"}></i>
                            <span className="word-break">{marker?.title}</span>
                        </div>
                        {(isEdit || (!isEdit && place.startTime && place.endTime)) &&
                            <div className="time">
                                {
                                    formatDuration(getDuration(place.startTime, place.endTime))
                                }
                            </div>
                        }

                    </div>
                </div>

                {(isEdit || (!isEdit && place.endTime)) &&
                    <div className="timeBar"
                        ref={endRef}
                        style={{
                            backgroundColor: isSelected ? "transparent" : tag?.color,
                            borderColor: tag?.color
                        }}
                        onClick={(e) => {
                            if (isSelected) e.stopPropagation();
                            updatePosition();
                            setShowEndPicker((prev) => !prev);
                            setShowStartPicker(false);
                        }}
                    >
                        {place.endTime || (isSelected ? "選擇時間" : "未選擇")}

                        {isSelected && showEndPicker && (
                            <TimePicker
                                position={position}
                                initialTime={place.endTime}
                                minTime={place.startTime}
                                maxTime={null}
                                onSelect={(time) => {

                                    setTrip(prev => ({
                                        ...prev,
                                        days: prev.days.map((day, i) => {
                                            if (i !== selectedDay - 1) return day;

                                            const updatedDay = {
                                                ...day,
                                                places: day.places.map(p =>
                                                    p.id === place.id
                                                        ? { ...p, endTime: time }
                                                        : p
                                                )
                                            };

                                            return {
                                                ...updatedDay,
                                                places: updateTransport(updatedDay)
                                            };
                                        })
                                    }));
                                }}
                            />
                        )}
                    </div>
                }

            </div>
        </div >

    )
}

export default TripItem

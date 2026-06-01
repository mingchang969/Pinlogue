import React, { useState, useEffect, useRef } from "react";

function TimePicker({ position, initialTime, minTime, maxTime, onSelect }) {
    const [selectedHour, setSelectedHour] = useState("00");
    const [selectedMinute, setSelectedMinute] = useState("00");

    const selectedHourRef = useRef(null);
    const selectedMinuteRef = useRef(null);

    useEffect(() => {
        if (initialTime) {
            const [h, m] = initialTime.split(":");
            setSelectedHour(h);
            setSelectedMinute(m);
        }
    }, [initialTime]);

    useEffect(() => {
        if (selectedHourRef.current) {
            selectedHourRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        if (selectedMinuteRef.current) {
            selectedMinuteRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }, [selectedHour, selectedMinute]);


    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

    const handleHourClick = (h) => {
        setSelectedHour(h);
        onSelect(`${h}:${selectedMinute}`);
    };

    const handleMinuteClick = (m) => {
        setSelectedMinute(m);
        onSelect(`${selectedHour}:${m}`);
    };

    function timeToMinutes(t) { // 將 時間00:00字串 轉成分鐘
        if (!t) return null;
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
    }

    function isDisabled(hour, minute) {
        const current = timeToMinutes(`${hour}:${minute}`);
        const min = timeToMinutes(minTime);
        const max = timeToMinutes(maxTime);

        if (min !== null && current < min) return true;
        if (max !== null && current > max) return true;

        return false;
    }

    return (
        <div
            className="timePicker"
            style={{
                position: "fixed",
                top: position.top + 4,
                left: position.left,
                zIndex: 9999
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* 小時 */}
            <div className="optionContainer" style={{ marginRight: "8px" }}>
                {hours.map((h) => {
                    const disabled = isDisabled(h, selectedMinute);

                    return (
                        <div
                            className="hour"
                            key={h}
                            ref={h === selectedHour ? selectedHourRef : null}
                            onClick={(e) => { handleHourClick(h); e.stopPropagation(); }}
                            style={{
                                background: h === selectedHour ? "#bec94a" : "transparent",
                                opacity: disabled ? 0.3 : 1,
                                pointerEvents: disabled ? "none" : "auto",
                                cursor: disabled ? "not-allowed" : "pointer"
                            }}
                        >
                            {h}
                        </div>
                    );
                }
                )}
            </div>

            {/* 分鐘 */}
            <div className="optionContainer">
                {minutes.map((m) => {
                    const disabled = isDisabled(selectedHour, m);

                    return (
                        <div
                            className="minute"
                            key={m}
                            ref={m === selectedMinute ? selectedMinuteRef : null}
                            onClick={(e) => { handleMinuteClick(m); e.stopPropagation(); }}
                            style={{
                                background: m === selectedMinute ? "#bec94a" : "transparent",
                                opacity: disabled ? 0.3 : 1,
                                pointerEvents: disabled ? "none" : "auto",
                                cursor: disabled ? "not-allowed" : "pointer"
                            }}
                        >
                            {m}
                        </div>
                    );
                }
                )}
            </div>
        </div>
    );
}

export default TimePicker;
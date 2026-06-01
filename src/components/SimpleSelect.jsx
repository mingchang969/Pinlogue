import { useState } from "react";
import { ReactComponent as Arrow } from "../images/Arrow.svg";
import { ReactComponent as Check } from "../images/Check.svg";
import Tag from "./Tag";

export default function SimpleSelect({ mode, options, value, onChange, size = "M" }) {
    const [open, setOpen] = useState(false);

    const selected = options.find(o => o.value === value);

    return (
        <div className={size !== "S" ? "select" : "select mini"} onClick={() => setOpen(!open)}>
            <div className={size !== "S" ? "select-display" : "select-display mini"}>
                {
                    (selected && mode === "color" ? <div style={{ backgroundColor: selected.color }} className="colorDot"></div> :
                        selected && mode === "icon" ? <i className={selected.icon}></i> : selected && mode === "text" ? <span>{selected.text}</span> : "請選擇")}

                <Arrow className={`arrow ${open ? "" : "upside"} `} />
            </div>

            {
                open && (
                    <div className={size !== "S" ? "select-options" : "select-options mini"}>
                        {options.map(o => (
                            <div
                                key={o.value}
                                className={[
                                    "select-option",
                                    (o.value === value) ? "selected" : "",
                                    (size !== "S") ? "" : "mini",
                                ].filter(Boolean).join(" ")}
                                onClick={() => {
                                    onChange(o.value);
                                    setOpen(false);
                                }}
                            >

                                {mode === "color" ? <div style={{ backgroundColor: o.color }} className="colorDot"></div> :
                                    mode === "icon" ? <i className={o.icon}></i> : mode === "text" ? <span>{o.text}</span> : null}
                                {o.value === value && <Check />}
                            </div>
                        ))}
                    </div>
                )
            }
        </div >
    );
}
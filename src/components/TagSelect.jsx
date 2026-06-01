import { useState } from "react";
import { ReactComponent as Arrow } from "../images/Arrow.svg";
import { ReactComponent as Check } from "../images/Check.svg";
import Tag from "./Tag";

export default function TagSelect({ style, options, name, value, onChange }) {
    const [open, setOpen] = useState(false);

    const selected = options.find(o => o.value === value);

    return (
        <div
            style={{ ...style }}
            className="tagSelect"
            onClick={(e) => { e.stopPropagation(); }
            }>
            <div className="select-display" onClick={() => setOpen(o => !o)}>
                {selected ? <Tag title={selected.label} icon={selected.icon} color={selected.color} noBorder={true} /> : "選擇標籤"}
                <Arrow className={`arrow ${open ? "" : "upside"} `} />
            </div>

            {
                open && (
                    <div className="select-options">
                        {options.length > 0 ?
                            (options.map(o => (
                                <div
                                    key={o.value}
                                    className={[
                                        "select-option",
                                        (o.value === value) ? "selected" : ""
                                    ].filter(Boolean).join(" ")}
                                    onClick={() => {
                                        !name ? onChange(o.value) : onChange(name, o.value)
                                        setOpen(false);
                                    }}
                                >
                                    <Tag title={o.label} icon={o.icon} color={o.color} noBorder={true} />
                                    {o.value === value && <Check />}
                                </div>
                            )))
                            :
                            <div style={{ color: "#da4d4d" }}>
                                無
                            </div>
                        }
                    </div>
                )
            }
        </div >
    );
}
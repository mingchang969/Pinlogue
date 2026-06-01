import React from 'react'

function Tag({ title, icon, color, noBorder, onClick, style }) {
    return (
        <div onClick={onClick} className="tagContainer" style={noBorder ? { ...style, border: "none", padding: "0" } : style}>
            <div className='tag' style={{ backgroundColor: [color] }}>
                <i className={icon}></i>
                <span style={{ textWrap: "nowrap" }}>{title}</span>
            </div>
        </div>

    )
}

export default Tag

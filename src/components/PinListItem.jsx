import React from 'react'
import RankIcon from './RankIcon';
import CroppedImage from './CroppedImage';

function PinListItem({ data, tag, onClick, hasDayTag = false }) {

    function safeCut(text, limit) {
        const arr = [...text];
        return arr.length > limit ? arr.slice(0, limit).join("") + "..." : text;
    };

    return (
        <div className='pinListItem' onClick={onClick}>
            <div className="pictureContainer">
                <div className="visualCoverFrame">
                    <CroppedImage
                        imageUrl={data?.imageUrl}
                        cropData={data?.cropData}
                        alt={data?.title}
                        className="visualCoverImage"
                    />
                </div>
            </div>

            <div className="infoContainer">

                <div className="titleContainer">
                    <div className="title word-break">
                        <div className={(hasDayTag && "tag") || ""} style={{ borderColor: hasDayTag && tag?.color }}>
                            <div className="icon">
                                <i style={{ color: tag?.color || "#777" }} className={tag?.icon || "bi bi-question-diamond-fill"}></i>
                            </div>
                            {hasDayTag ?
                                <div className="dayTag" style={{ color: tag?.color }}>{`${data.days.length}日遊`}</div> : null}
                        </div>
                        {safeCut(data.title, 6)}
                    </div>
                    <div className="ranking"><RankIcon rank={data.rank || null} lastRank={data.lastRank || null} /></div>
                </div>
                <div className="contextContainer word-break">{safeCut(data.intro, 24)}</div>
            </div>

        </div >
    )
}

export default PinListItem

import React from 'react'
import RankIcon from './RankIcon';
import CroppedImage from './CroppedImage';
import { ReactComponent as Marker } from "../images/Marker.svg"
import { ReactComponent as Trip } from "../images/Trip.svg"

function MapListItem({ data, onClick, rank, lastRank }) {

    function safeCut(text, limit) {
        const arr = [...text];
        return arr.length > limit ? arr.slice(0, limit).join("") + "..." : text;
    };

    function formatCount(num) {
        if (num == null || isNaN(num)) return "0";

        if (num >= 1000000) {
            return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + "M";
        }

        if (num >= 1000) {
            return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + "K";
        }

        return num.toString();
    }

    return (
        <div className='clubListItem' onClick={onClick}>
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
                        <RankIcon rank={rank} lastRank={lastRank} />{data?.title}
                    </div>
                    <div className="numberInfoContainer">
                        <div className='numberInfo'><Marker />{formatCount(data?.markerCount)}</div>
                        <div className='numberInfo'><Trip />{formatCount(data?.tripCount)}</div>
                    </div>
                </div>
                <div className="contextContainer word-break">
                    {data?.intro}
                </div>
            </div>

        </div >
    )
}

export default MapListItem

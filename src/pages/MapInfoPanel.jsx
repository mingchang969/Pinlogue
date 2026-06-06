import React from 'react'
import { ReactComponent as Arrow } from "../images/Arrow_.svg"
import { ReactComponent as Edit } from "../images/Edit.svg"
import CroppedImage from '../components/CroppedImage'

function MapInfoPanel({ currentUser, currentMap, onBack, onEdit }) {
    return (
        <>
            <div className="markerControlContainer">
                
                {currentUser &&
                    <div className="edit" onClick={
                        onEdit
                    }><Edit className='button' />
                    </div>}

                <div className="title word-break">
                    <span>{currentMap?.title}</span>
                </div>
                <div className="return">
                    <div className="button">
                        <Arrow
                            onClick={onBack} />
                    </div>
                </div>
            </div >
            <div className="markerInfoContainer">
                <div className="info">
                    <div className="picture">
                        <div className="visualCoverFrame">
                            <CroppedImage
                                imageUrl={currentMap?.imageUrl}
                                cropData={currentMap?.cropData}
                                alt={currentMap?.title}
                                className="visualCoverImage"
                            />
                        </div>
                    </div>
                    <div className="context word-break">{currentMap.intro}</div>
                </div>
            </div>

        </>
    )
}

export default MapInfoPanel

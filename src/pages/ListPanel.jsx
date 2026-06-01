import React from 'react'
import CroppedImage from '../components/CroppedImage';
import { ReactComponent as Leave } from "../images/Leave.svg"
import { ReactComponent as PinList_default } from "../images/PinList_default.svg"
import { ReactComponent as PinList_selected } from "../images/PinList_selected.svg"
import { ReactComponent as Post_default } from "../images/Post_default.svg"
import { ReactComponent as Post_selected } from "../images/Post_selected.svg"
import { ReactComponent as Arrow } from "../images/Arrow_.svg"
import PinListItem from '../components/PinListItem';
import { Link } from 'react-router-dom'

function ListPanel({ mode, currentMap, markers, trips, tags, filterTag, setFilterTag, isCreate, stepTrip, setIsCreate, editTripSelected, setEditTripSelected, setTagPanelMode, onBack, onInfo, addPlace, editPlace, onSelectMarker, onSelectTrip, mapId }) {
    return (
        <>
            <div className="groupInfoContainer">
                <div className="groupInfo">
                    <div className="picture" onClick={onInfo}>
                        <div className="pictureContainer">
                            <div className="visualCoverFrame">
                                <CroppedImage
                                    imageUrl={currentMap?.imageUrl || "/assets/ex_picture.png"}
                                    cropData={currentMap?.cropData}
                                    alt={currentMap?.title}
                                    className="visualCoverImage"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="title word-break">{currentMap?.title || "未命名地圖"}</div>
                    <div className="button"><Leave onClick={onBack} /></div>
                </div>
            </div>
            <div className="contentContainer">
                {
                    mode === "pinListMode" ?
                        <>     {
                            filterTag ?
                                markers.filter(marker => marker.markerTag === filterTag).slice(0, 200).map((marker) => {
                                    const tagId = marker.markerTag;
                                    if (!tagId) return;
                                    const tag = tags.find((o) => o.id === tagId) || null
                                    return (
                                        <PinListItem key={marker.id} data={marker} tag={tag}
                                            onClick={() => onSelectMarker(marker)} />
                                    )
                                }
                                )
                                :
                                markers.slice(0, 200).map((marker) => {
                                    const tagId = marker.markerTag;
                                    if (!tagId) return;
                                    const tag = tags.find((o) => o.id === tagId) || null
                                    return (
                                        <PinListItem key={marker.id} data={marker} tag={tag}
                                            onClick={() => onSelectMarker(marker)} />
                                    )
                                }
                                )
                        } </>
                        : isCreate && stepTrip === 2 ?
                            filterTag ?
                                markers.filter(marker => marker.markerTag === filterTag).slice(0, 200).map((marker) => {
                                    const tagId = marker.markerTag;
                                    if (!tagId) return;
                                    const tag = tags.find((o) => o.id === tagId) || null
                                    return (
                                        <PinListItem key={marker.id} id={marker.id} data={marker} tag={tag}
                                            onClick={() => {
                                                if (editTripSelected) {
                                                    editPlace(editTripSelected, marker.id);
                                                } else {
                                                    addPlace(marker.id);
                                                }
                                            }}
                                        />
                                    )
                                }
                                )
                                :
                                markers.slice(0, 200).map((marker) => {
                                    const tagId = marker.markerTag;
                                    if (!tagId) return;
                                    const tag = tags.find((o) => o.id === tagId) || null
                                    return (
                                        <PinListItem key={marker.id} id={marker.id} data={marker} tag={tag}
                                            onClick={() => {
                                                if (editTripSelected) {
                                                    editPlace(editTripSelected, marker.id);
                                                } else {
                                                    addPlace(marker.id);
                                                }
                                            }} />
                                    )
                                }
                                )
                            : filterTag ?
                                trips.filter(trip => trip.tag === filterTag).slice(0, 200).map((trip) => {
                                    const tagId = trip.tag;
                                    if (!tagId) return;
                                    const tag = tags.find((o) => o.id === tagId) || null
                                    return (
                                        <PinListItem key={trip.id} id={trip.id} data={trip} tag={tag} hasDayTag={true}
                                            onClick={() => onSelectTrip(trip)}
                                        />
                                    )
                                }
                                )
                                :
                                trips.slice(0, 200).map((trip) => {
                                    const tagId = trip.tag;
                                    if (!tagId) return;
                                    const tag = tags.find((o) => o.id === tagId) || null
                                    return (
                                        <PinListItem key={trip.id} id={trip.id} data={trip} tag={tag} hasDayTag={true}
                                            onClick={() => onSelectTrip(trip)} />
                                    )
                                }
                                )
                }
            </div>
            <div className="modeButtonContainer">
                <div className="buttonContainer"
                    onClick={() => { setIsCreate(false); setTagPanelMode("normal"); setEditTripSelected(null); setFilterTag(null); }}>
                    <Link to={`/maps/${mapId}/pinList`} style={{ textDecoration: "none" }}>
                        <div className={`pinListButton ${mode === "pinListMode" ? "selected" : ""}`}>
                            地標
                            {mode === "pinListMode" ?
                                <PinList_selected fill="#131c21" />
                                :
                                <PinList_default fill="#bec94a" />}
                        </div>
                    </Link>
                </div>
                <div className="buttonContainer"
                    onClick={() => { setIsCreate(false); setTagPanelMode("normal"); setEditTripSelected(null); setFilterTag(null); }}>
                    <Link to={`/maps/${mapId}/tripList`} style={{ textDecoration: "none" }}>
                        <div className={`pinListButton ${mode !== "pinListMode" ? "selected" : ""}`}>
                            行程
                            {mode !== "pinListMode" ?
                                <Post_selected fill="#131c21" />
                                :
                                <Post_default fill="#bec94a" />}
                        </div>
                    </Link>
                </div>

            </div>
        </>
    )
}

export default ListPanel

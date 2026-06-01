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

function ListPanel_m({ mode, currentMap, markers, trips, tags, filterTag, setFilterTag, isCreate, stepTrip, setIsCreate, editTripSelected, setEditTripSelected, setTagPanelMode, onBack, onInfo, addPlace, editPlace, onSelectMarker, onSelectTrip, mapId }) {
    return (
      <div className="listContainer">

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
    )
}

export default ListPanel_m

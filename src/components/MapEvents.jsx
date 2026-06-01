import { useMapEvents } from "react-leaflet";

export default function MapEvents({
    onMoveEnd,
    setTempPos,
    setIsEdit,
    tempPos,
}) {
    useMapEvents({// useMapEvents 可以監聽 Leaflet 地圖事件

        click(e) {
            // e.latlng = Leaflet 給的座標，格式為 { lat: xx, lng: xx }
            setTempPos(e.latlng);
            // setIsEdit(false);
        },

        popupopen(e) {
            if (!tempPos) return;

            const popupLatLng = e.popup.getLatLng();
            const isTempPopup =
                tempPos.lat === popupLatLng.lat &&
                tempPos.lng === popupLatLng.lng;
            // 只有非 tempPos popup 打開才關掉 tempPos
            if (!isTempPopup) {
                setTempPos(null);
            }
        },

        moveend(e) {
            const map = e.target;
            const center = map.getCenter();

            onMoveEnd?.({
                center: [center.lat, center.lng],
                zoom: map.getZoom(),
            });
        },
    });

    return null; // 此元件不渲染任何東西
}
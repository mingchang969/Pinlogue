import React, { useState, useEffect } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Outlet,
    Navigate,
} from "react-router-dom";
import 'leaflet/dist/leaflet.css';
import MainFrame from "./pages/Mainframe";
import Home from "./pages/Home";
import Login from "./pages/Login";
import "./App.scss"
import "bootstrap-icons/font/bootstrap-icons.css";
import { auth } from "./utils/firebase";
import { onAuthStateChanged } from "firebase/auth";

function App() {
    const [user, setUser] = useState(null);
    useEffect(() => {
        const unSubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // console.log(currentUser.uid);
            }

        });

        return () => unSubscribe();
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                {/* 預設進入大廳 */}
                <Route path="/" element={<Navigate to="/home" replace />} />

                {/* 大廳：顯示很多組地圖 */}
                <Route path="/home" element={<Home currentUser={user} />} />

                {/* 登入頁：目前不顯示外面，只給有權限的用 */}
                <Route path="/login" element={<Login />} />

                {/* 進入某一張地圖後 */}

                <Route path="/maps/:mapId/pinList" element={<MainFrame mode="pinListMode" currentUser={user} />} />
                <Route path="/maps/:mapId/markers/:markerId" element={<MainFrame mode="pinListMode" currentUser={user} />} />

                <Route path="/maps/:mapId/tripList" element={<MainFrame mode="postMode" currentUser={user} />} />
                <Route path="/maps/:mapId/trips/:tripId" element={<MainFrame mode="postMode" currentUser={user} />} />
            </Routes>
        </BrowserRouter>

    )

}
export default App;

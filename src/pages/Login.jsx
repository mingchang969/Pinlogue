import React, { useState } from 'react';
import { auth } from "../utils/firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
} from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";

function Login() {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    function onSubmit() {

        if (!email || !password) return;

        setIsLoading(true);
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                navigate("/home");
                setIsLoading(false);
            })
            .catch((error) => {
                setIsLoading(false);
                switch (error.code) {
                    case "auth/invalid-email":
                        setErrorMessage("信箱格式不正確");
                        break;

                    case "auth/user-not-found":
                        setErrorMessage("信箱不存在");
                        break;

                    case "auth/wrong-password":
                        setErrorMessage("密碼錯誤");
                        break;

                    case "auth/invalid-credential":
                        setErrorMessage("密碼錯誤");
                        break;

                    default:
                        setErrorMessage("登入失敗：" + error.message);
                    // console.log("錯誤代碼：", error.code);
                    // console.log("錯誤訊息：", error.message);
                    // console.log("完整錯誤物件：", error);
                }
            })
    }

    const navigate = useNavigate();
    return (
        <div className='login'>

            <form
                className="inputPanel"
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}>
                <div className="inputContainer">
                    <div className="title">
                        <i className="bi bi-person"></i>
                        帳號
                    </div>
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); }}
                        placeholder="請輸入信箱" />
                    <div className="title">
                        <i className="bi bi-key"></i>
                        密碼
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value) }}
                        placeholder="請輸入密碼"
                    />
                </div>

                <div className="buttonContainer">
                    <button
                        className={`buttonFinish ${!email || !password || isLoading ? "disable" : ""}`}
                        onClick={() => { onSubmit() }}>
                        登入
                    </button>
                    <button className='buttonBack' onClick={() => { navigate(`/home`) }}>回首頁</button>
                </div>


                {errorMessage && <div style={{ display: "flex", justifyContent: "center", color: "#da4d4d", margin: "8px 24px", fontSize: "12px" }}>
                    {errorMessage}
                </div>}

            </form>

        </div>
    )
}

export default Login

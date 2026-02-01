import { useEffect } from "react";
import Home from "./Home/Home";
import { Route, Routes, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard/Dashboard";
import FileDownload from "./FileDownload";
import { useDispatch, useSelector } from "react-redux";
import { loadUserFromStorage } from "./redux/slice/auth/authSlice";
import RequireAuth from "./components/Auth/RequireAuth";
import NoRequireAuth from "./components/Auth/NotRequireAuth";
import DownloadPage from "./components/DownloadPage";
import Download from "./components/Download";
import GuestHomePage from "./components/Guest/GuestHomePage";
import GuestHome from "./components/Guest/Download/GuestHome";
import AliasDownloadPage from "./components/AliasDownloadPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const dispatch = useDispatch();
  const { isLoggedIn } = useSelector((state) => state.auth || {});

  useEffect(() => {
    dispatch(loadUserFromStorage());
  }, [dispatch]);

  return (
    <ErrorBoundary>
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
      />
      <Routes>
        
        {/* Protected Routes - Require Authentication */}
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>

        {/* Public Routes - Accessible by everyone (logged in or not) */}
        <Route path="/upload" element={<GuestHomePage />} />
        <Route path="/f/:shortCode" element={<Download />} />
        <Route path="/g/:shortCode" element={<GuestHome />} />
        <Route path="/s/:alias" element={<AliasDownloadPage />} />

        {/* Home redirect - go to dashboard if logged in, guest upload if not */}
        <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Navigate to="/upload" replace />} />

        {/* Non-auth-only Routes - Only for non-logged in users */}
        <Route element={<NoRequireAuth />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../../../config/axiosInstance";
import axios from "axios";
import { FaDownload } from "react-icons/fa";

const GuestDownload = () => {
  const { shortCode } = useParams();
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
  const controller = new AbortController();

  const fetchFile = async () => {
    try {
      const res = await axiosInstance.get(`/files/g/${shortCode}`, {
        signal: controller.signal,
      });

      const data = res.data;
      setFile(data);
      setIsProtected(data.isPasswordProtected);
      setIsLoading(false);

      if (data.isPasswordProtected) {
        toast.info("🔒 This file is password protected. Please enter the password.");
      } 

    } catch (err) {
      if (!axios.isCancel(err)) {
        setError(err.response?.data?.error || err.message);
        setIsLoading(false);
      }
    }
  };

  fetchFile();

  return () => controller.abort();
}, [shortCode]);


  const handleDownload = async () => {
    try {
      // Fetch the file as a blob
      const response = await fetch(file.downloadUrl || file.path);
      const blob = await response.blob();
      
      // Create a blob URL and trigger download with correct filename
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = file.name; // This sets the correct filename with extension
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };





  const verifyFile = async () => {
    if (!password) {
      toast.warn("Please enter a password.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/files/verifyGuestFilePassword`, {
        shortCode, password
      });

      const result = res.data;
      console.log(result);
      if (result.success) {
        toast.success("✅ Password verified! You can now download the file.");
        setIsVerified(true);
      } else {
        toast.error("❌ Incorrect password. Try again.");
      }
    } catch (err) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (error) return <div className="text-red-500">{error}</div>;
  if (isLoading || !file) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="w-full max-w-4xl mx-auto bg-[var(--bg-color)] rounded shadow-lg p-6 flex flex-col gap-6">
      
      {/* File Info Header */}
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold text-[var(--text-color)]">{file.name}</h3>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <span><strong>Size:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</span>
          <span><strong>Type:</strong> {file.type}</span>
          <span><strong>Uploaded:</strong> {new Date(file.createdAt).toLocaleDateString()}</span>
          <span><strong>By:</strong> {file.uploadedBy}</span>
        </div>
      </div>

      {/* Preview Section */}
      <div className="w-full">
        <h2 className="text-lg font-semibold text-[var(--primary-text)] mb-2">File Preview</h2>

        {/* Protected Message */}
        {isProtected && !isVerified ? (
          <div className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-400 p-6 rounded bg-gray-100 dark:bg-gray-800 text-center">
            <img
              src="https://cdn-icons-png.flaticon.com/128/18427/18427887.png"
              alt="Protected File"
              className="w-32 h-32 mb-4"
            />
            <p className="text-gray-700 dark:text-gray-200 text-base">
              🔒 This file is password protected. Please verify to preview or download.
            </p>
          </div>
        ) : (
          <>
            {file.type.startsWith("image/") && (
              <img src={file.path} alt={file.name} className="w-full h-auto rounded mb-4" />
            )}
            {file.type.startsWith("video/") && (
              <video controls className="w-full h-auto rounded mb-4">
                <source src={file.path} type={file.type} />
                Your browser does not support the video tag.
              </video>
            )}
            {file.type.startsWith("audio/") && (
              <audio controls className="w-full h-auto rounded mb-4">
                <source src={file.path} type={file.type} />
                Your browser does not support the audio element.
              </audio>
            )}
            {file.type === "application/pdf" && (
              <iframe 
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(file.path)}&embedded=true`} 
                title="PDF Preview" 
                className="w-full h-[600px] rounded mb-4"
              ></iframe>
            )}
            {!file.type.startsWith("image/") && !file.type.startsWith("video/") && !file.type.startsWith("audio/") && file.type !== "application/pdf" && (
              <div className="flex flex-col items-center justify-center p-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <FaDownload className="text-6xl text-gray-400 mb-4" />
                <p className="text-gray-500 font-medium">No preview available for this file type</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Password Protected UI */}
      {isProtected && !isVerified && (
        <div className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 border rounded bg-[var(--bg-color)] text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={verifyFile}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            🔐 Verify Password
          </button>
        </div>
      )}

      {/* Download Button */}
      {(!isProtected || isVerified) && (
        <button
          onClick={handleDownload}
          className="w-full bg-green-600 text-white text-center px-4 py-2 rounded hover:bg-green-700"
        >
          ⬇️ Download
        </button>
      )}
    </div>
  );
};

export default GuestDownload;

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../config/axiosInstance";
import axios from "axios";
import { FaDownload, FaFile, FaImage, FaVideo, FaFilePdf, FaFileAudio, FaLock } from "react-icons/fa";

const AliasDownloadPage = () => {
  const { alias } = useParams();
  const [aliasData, setAliasData] = useState(null);
  const [error, setError] = useState("");
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchAlias = async () => {
      try {
        const res = await axiosInstance.get(`/alias/s/${alias}`, {
          signal: controller.signal,
        });

        const data = res.data;
        setAliasData(data);
        setIsProtected(data.isPasswordProtected);
        setIsLoading(false);

        if (data.isPasswordProtected) {
          toast.info("🔒 This share link is password protected.");
        }
      } catch (err) {
        if (!axios.isCancel(err)) {
          setError(err.response?.data?.error || err.message);
          setIsLoading(false);
        }
      }
    };

    fetchAlias();
    return () => controller.abort();
  }, [alias]);

  const handleDownload = async (file) => {
    try {
      toast.info(`Downloading ${file.name}...`);
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
      toast.success(`Downloaded ${file.name}`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error(`Failed to download ${file.name}`);
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < aliasData.files.length; i++) {
      await handleDownload(aliasData.files[i]);
      // Small delay between downloads
      if (i < aliasData.files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const verifyPassword = async () => {
    if (!password) {
      toast.warn("Please enter a password.");
      return;
    }

    try {
      const res = await axiosInstance.post(`/alias/verify-password`, {
        alias, password
      });

      if (res.data.success) {
        toast.success("✅ Password verified!");
        setIsVerified(true);
      } else {
        toast.error("❌ Incorrect password.");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Verification failed.");
    }
  };

  const getFileIcon = (type) => {
    if (type?.startsWith('image/')) return <FaImage className="text-blue-500" />;
    if (type?.startsWith('video/')) return <FaVideo className="text-purple-500" />;
    if (type?.startsWith('audio/')) return <FaFileAudio className="text-green-500" />;
    if (type === 'application/pdf') return <FaFilePdf className="text-red-500" />;
    return <FaFile className="text-gray-500" />;
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading files...</p>
        </div>
      </div>
    );
  }

  // Password protection screen
  if (isProtected && !isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full mx-4">
          <FaLock className="text-5xl text-indigo-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Protected</h2>
          <p className="text-gray-600 mb-6">This share link requires a password to access.</p>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
            className="w-full p-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={verifyPassword}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition"
          >
            🔐 Unlock Files
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">📁 Shared Files</h1>
              <p className="text-gray-500 mt-1">
                {aliasData.totalFiles} file{aliasData.totalFiles !== 1 ? 's' : ''} • {formatSize(aliasData.totalSize)}
              </p>
            </div>
            {aliasData.files.length > 1 && (
              <button
                onClick={handleDownloadAll}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <FaDownload /> Download All
              </button>
            )}
          </div>
          
          {aliasData.expiresAt && (
            <p className="text-sm text-orange-600 mt-3">
              ⏰ Expires: {new Date(aliasData.expiresAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* File List */}
        <div className="space-y-4">
          {aliasData.files.map((file, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
            >
              <div className="flex items-center gap-4">
                {/* File Icon / Preview */}
                <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {file.type?.startsWith('image/') ? (
                    <img
                      src={file.path}
                      alt={file.name}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setSelectedFile(file)}
                    />
                  ) : (
                    <span className="text-2xl">{getFileIcon(file.type)}</span>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800 truncate" title={file.name}>
                    {file.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatSize(file.size)} • {file.type?.split('/')[1]?.toUpperCase() || 'FILE'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {(file.type?.startsWith('image/') || file.type?.startsWith('video/') || file.type === 'application/pdf') && (
                    <button
                      onClick={() => setSelectedFile(file)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      Preview
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(file)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                  >
                    <FaDownload /> Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Downloaded {aliasData.downloadCount} time{aliasData.downloadCount !== 1 ? 's' : ''}</p>
          <p className="mt-1">Shared on {new Date(aliasData.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedFile(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium truncate">{selectedFile.name}</h3>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              {selectedFile.type?.startsWith('image/') && (
                <img
                  src={selectedFile.path}
                  alt={selectedFile.name}
                  className="max-w-full max-h-[70vh] mx-auto"
                />
              )}
              {selectedFile.type?.startsWith('video/') && (
                <video
                  src={selectedFile.path}
                  controls
                  className="max-w-full max-h-[70vh] mx-auto"
                />
              )}
              {selectedFile.type === 'application/pdf' && (
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedFile.path)}&embedded=true`}
                  className="w-full h-[70vh]"
                  title={selectedFile.name}
                />
              )}
            </div>
            <div className="p-4 border-t">
              <button
                onClick={() => handleDownload(selectedFile)}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
              >
                <FaDownload /> Download {selectedFile.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AliasDownloadPage;

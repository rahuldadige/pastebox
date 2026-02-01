import React, { useRef, useState } from "react";
import "./GuestFileUpload.css";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import axiosInstance from "../../config/axiosInstance";

const MAX_ALIAS_SIZE = 100 * 1024 * 1024; // 100 MB

const GuestFileUpload = ({guestFiles, updateFiles}) => {
  const fileInputRef = useRef(null);
  const dispatch = useDispatch();
  const [loading ,setLoading] = useState(false);

  const [files, setFiles] = useState(guestFiles || []);
  const [enablePassword, setEnablePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  
  // Alias configuration
  const [useCustomAlias, setUseCustomAlias] = useState(false);
  const [customAlias, setCustomAlias] = useState("");
  const [aliasStatus, setAliasStatus] = useState(null);

  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList).filter(
      (file) => file.size <= 25 * 1024 * 1024
    );
    
    // Check total size against alias limit
    const currentTotal = files.reduce((acc, f) => acc + f.size, 0);
    const newTotal = newFiles.reduce((acc, f) => acc + f.size, 0);
    
    if (currentTotal + newTotal > MAX_ALIAS_SIZE) {
      toast.error(`Total size exceeds the 100 MB limit per share link`);
      return;
    }
    
    setFiles((prev) => [...prev, ...newFiles]);
    toast.success("File(s) added!");
  };

  const handleFileInputChange = (e) => {
    handleFiles(e.target.files);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add("dragover");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove("dragover");
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    toast.info("File removed");
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  // Check alias availability for guests
  const checkAlias = async (alias) => {
    if (!alias || alias.length < 2) {
      setAliasStatus(null);
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(alias.toLowerCase())) {
      setAliasStatus('error');
      toast.error('Alias can only contain lowercase letters, numbers, hyphens, and underscores');
      return;
    }

    setAliasStatus('checking');
    try {
      const res = await axiosInstance.get(`/alias/check-guest/${alias.toLowerCase()}`);
      if (res.data.available) {
        setAliasStatus('available');
      } else {
        setAliasStatus('taken');
        toast.error(res.data.error || 'Alias is taken');
      }
    } catch (err) {
      setAliasStatus('error');
      toast.error('Error checking alias availability');
    }
  };

  const handleAliasChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setCustomAlias(value);
    setAliasStatus(null);
  };

  const handleUpload = async () => {
    setLoading(true);
    if (files.length === 0) {
      toast.error("Please upload at least one file.");
      setLoading(false);
      return;
    }

    // Validate alias if custom
    if (useCustomAlias && customAlias) {
      if (aliasStatus === 'taken') {
        toast.error("This alias is already taken. Choose a different one.");
        setLoading(false);
        return;
      }
      if (aliasStatus === 'error') {
        toast.error("Please fix the alias before uploading.");
        setLoading(false);
        return;
      }
    }

    // Check total size
    if (totalSize > MAX_ALIAS_SIZE) {
      toast.error(`Total size (${(totalSize / (1024 * 1024)).toFixed(2)} MB) exceeds the 100 MB limit`);
      setLoading(false);
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    
    if (useCustomAlias && customAlias) {
      formData.append("alias", customAlias.toLowerCase());
    }
    
    formData.append("hasExpiry", enableExpiry);

    if (enableExpiry && expiryDate) {
      const hours = Math.ceil(
        (new Date(expiryDate) - new Date()) / (1000 * 60 * 60)
      );
      formData.append("expiresAt", hours);
    }

    formData.append("isPassword", enablePassword);
    if (enablePassword && password) {
      formData.append("password", password);
    }

    try {
      const response = await axiosInstance.post("/alias/upload-guest", formData);
      console.log("Files uploaded:", response);
      if (response.data.message) {
        toast.success(`Files uploaded! Share link: ${window.location.origin}/s/${response.data.alias}`);
        
        // Copy to clipboard
        navigator.clipboard.writeText(`${window.location.origin}/s/${response.data.alias}`);
        toast.info("Share link copied to clipboard!");
        
        // Update parent state with properly structured file objects
        const newFiles = (response.data.files || []).map(f => ({
          id: f.id || Date.now() + Math.random(),
          name: f.name || 'Unknown file',
          size: f.size || 0,
          type: f.type || 'application/octet-stream',
          path: f.path || '',
          shortUrl: `/s/${response.data.alias}`,
          expiresAt: response.data.expiresAt || new Date(Date.now() + 2 * 24 * 3600000),
        }));
        const updatedFiles = [...(guestFiles || []), ...newFiles];
        updateFiles(updatedFiles);
        
        setFiles([]);
        setCustomAlias("");
        setAliasStatus(null);
        setLoading(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
      setLoading(false);
    }
  };

  return (
    <div className="container bg-[var(--bg-color)] text-[var(--text-color)] p-6 rounded-lg shadow-md">
      <div className="header bg-[var(--bg-color)] text-[var(--text-color)] text-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--primary-text)] mb-4">File Upload</h1>
        <p className="font-bold text-[var(--primary-text)] mb-4">Drag & drop files or click to browse</p>
      </div>

      <div
        className="dropbox"
        onClick={handleBrowseClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="dropbox-icon">📁</div>
        <div className="dropbox-text">Drop files here</div>
        <div className="dropbox-subtext">
          Supported formats: Images, Videos, Documents, Archives (Max 100MB per share link)
        </div>
        <button
          className="browse-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleBrowseClick();
          }}
        >
          Browse Files
        </button>
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".jpg,.jpeg,.webp,.png,.mp4,.avi,.mov,.mkv,.mk3d,.mks,.mka,.pdf"
          onChange={handleFileInputChange}
        />
      </div>

      <div className="extra-options bg-[var(--bg-color)] text-[var(--text-color)] mt-6">
        {/* Alias Configuration */}
        <div className="switch-container" style={{ marginBottom: '20px' }}>
          <label className="switch-label">
            <span className="label-text">Custom Share Link Alias</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={useCustomAlias}
                onChange={(e) => {
                  setUseCustomAlias(e.target.checked);
                  if (!e.target.checked) {
                    setCustomAlias("");
                    setAliasStatus(null);
                  }
                }}
              />
              <span className="slider"></span>
            </label>
          </label>
          {useCustomAlias && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ color: '#666' }}>{window.location.origin}/s/</span>
                <input
                  type="text"
                  className="password-input"
                  placeholder="my-files"
                  value={customAlias}
                  onChange={handleAliasChange}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => checkAlias(customAlias)}
                  disabled={!customAlias || aliasStatus === 'checking'}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '4px',
                    border: 'none',
                    background: '#4f46e5',
                    color: 'white',
                    cursor: customAlias ? 'pointer' : 'not-allowed',
                    opacity: customAlias ? 1 : 0.5,
                  }}
                >
                  {aliasStatus === 'checking' ? 'Checking...' : 'Check'}
                </button>
              </div>
              {aliasStatus && (
                <div style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  borderRadius: '4px',
                  background: aliasStatus === 'available' ? '#d1fae5' : aliasStatus === 'taken' ? '#fee2e2' : '#fef3c7',
                  color: aliasStatus === 'available' ? '#065f46' : aliasStatus === 'taken' ? '#991b1b' : '#92400e',
                }}>
                  {aliasStatus === 'available' && '✅ Alias is available!'}
                  {aliasStatus === 'taken' && '❌ Alias is already taken'}
                  {aliasStatus === 'error' && '⚠️ Invalid alias format'}
                  {aliasStatus === 'checking' && '⏳ Checking availability...'}
                </div>
              )}
              <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                Use lowercase letters, numbers, hyphens (-) and underscores (_) only. Max 100 MB per share link.
              </p>
            </div>
          )}
        </div>

        <div className="switch-container">
          <label className="switch-label">
            <span className="label-text">Set Password</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={enablePassword}
                onChange={(e) => setEnablePassword(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </label>
          {enablePassword && (
            <input
              type="password"
              className="password-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </div>

        <div className="switch-container">
          <label className="switch-label">
            <span className="label-text">Set Expiry Date</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={enableExpiry}
                onChange={(e) => setEnableExpiry(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </label>
          {enableExpiry && (
            <input
              type="datetime-local"
              className="expiry-input"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="upload-stats">
          <div className="stats-header">
            <div className="stats-title">Upload Summary</div>
          </div>
          <div className="stats-info">
            <div className="stat-item">
              <div className="stat-value">{files.length}</div>
              <div className="stat-label">Files</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {(totalSize / 1024).toFixed(2)} KB
              </div>
              <div className="stat-label">Total Size</div>
            </div>
          </div>
          <div className="progress-bar" style={{ marginTop: "15px" }}>
            <div
              className="progress-fill"
              style={{
                width: `${Math.min(
                  (totalSize / MAX_ALIAS_SIZE) * 100,
                  100
                )}%`,
                backgroundColor: totalSize > MAX_ALIAS_SIZE ? '#ef4444' : '#22c55e',
              }}
            />
          </div>
          <p style={{ fontSize: '12px', color: totalSize > MAX_ALIAS_SIZE ? '#ef4444' : '#666', marginTop: '5px' }}>
            {(totalSize / (1024 * 1024)).toFixed(2)} MB / 100 MB limit
          </p>
        </div>
      )}

      {files.length === 0 ? (
        <div className="empty-state">No files uploaded yet</div>
      ) : (
        <div className="file-previews">
          {files.map((file, index) => (
            <div className="file-preview" key={index}>
              <div className="preview-img-container">
                {file.type.startsWith("image") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="preview-img"
                  />
                ) : file.type.startsWith("video") ? (
                  <video
                    src={URL.createObjectURL(file)}
                    className="preview-video"
                    controls
                    muted
                    width="100"
                    height="80"
                  />
                ) : (
                  <div className="file-icon">📄</div>
                )}
              </div>
              <div className="file-info">
                <div className="file-name" title={file.name}>
                  {(() => {
                    const dotIndex = file.name.lastIndexOf(".");
                    const name = file.name.slice(0, dotIndex);
                    const ext = file.name.slice(dotIndex);
                    return name.length > 30
                      ? `${name.slice(0, 27)}...${ext}`
                      : file.name;
                  })()}
                </div>
                <div className="file-size">
                  {file.size > 1024 * 1024
                    ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                    : `${(file.size / 1024).toFixed(2)} KB`}
                </div>
                <div className="file-actions">
                  <button
                    className="remove-btn"
                    onClick={() => removeFile(index)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="upload-action">
        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={loading || files.length === 0}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
};

export default GuestFileUpload;

import express, { Router } from "express"
import upload from "../middlewares/upload.middlewares.js";
import { deleteFile, downloadInfo, downloadFile, generateQR, generateShareShortenLink, getDownloadCount, getFileDetails, getUserFiles, resolveShareLink, searchFiles, sendLinkEmail, showUserFiles, updateAllFileExpiry, updateFileExpiry, updateFilePassword, updateFileStatus, uploadFiles, verifyFilePassword, uploadFilesGuest, guestDownloadInfo, verifyGuestFilePassword } from "../controllers/file.controller.js";
import authenticate from "../middlewares/auth.middlewares.js";
import { uploadLimiter } from "../app.js";


const router = Router();

// Upload routes with rate limiting
router.post("/upload", authenticate, uploadLimiter, upload.array('files'), uploadFiles);
router.post("/upload-guest", uploadLimiter, upload.array('files'), uploadFilesGuest);

// Download and file operations
router.get("/download/:fileId", downloadFile);
router.delete("/delete/:fileId", authenticate, deleteFile);
router.put("/update/:fileId", authenticate, updateFileStatus);
router.get("/getFileDetails/:fileId", authenticate, getFileDetails);
router.post('/generateShareShortenLink', authenticate, generateShareShortenLink);
router.post('/sendLinkEmail', authenticate, sendLinkEmail);

// File management
router.post('/updateFileExpiry', authenticate, updateFileExpiry);
router.post('/updateAllFileExpiry', authenticate, updateAllFileExpiry);
router.post('/updateFilePassword', authenticate, updateFilePassword);
router.get('/searchFiles', authenticate, searchFiles);
router.get('/showUserFiles', authenticate, showUserFiles);

// QR and stats
router.get('/generateQR/:fileId', authenticate, generateQR);
router.get('/getDownloadCount/:fileId', authenticate, getDownloadCount);

// Public download routes
router.get('/f/:shortCode', downloadInfo);
router.get('/g/:shortCode', guestDownloadInfo);

// Share link resolution
router.get('/resolveShareLink/:code', resolveShareLink);
router.post('/verifyFilePassword', verifyFilePassword);
router.post('/verifyGuestFilePassword', verifyGuestFilePassword);

// User files
router.get('/getUserFiles/:userId', authenticate, getUserFiles);

export default router;
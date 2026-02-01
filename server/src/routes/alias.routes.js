import { Router } from "express";
import upload from "../middlewares/upload.middlewares.js";
import authenticate from "../middlewares/auth.middlewares.js";
import { uploadLimiter } from "../app.js";
import {
  uploadToAlias,
  uploadToAliasGuest,
  getAliasInfo,
  verifyAliasPassword,
  checkAliasAvailability,
  getUserAliases,
  deleteAlias,
  updateAlias,
  deleteFileFromAlias,
} from "../controllers/alias.controller.js";

const router = Router();

// ============================================
// AUTHENTICATED ROUTES (require login)
// ============================================

// Upload files to an alias (creates new or adds to existing owned alias)
router.post("/upload", authenticate, uploadLimiter, upload.array('files'), uploadToAlias);

// Get all aliases owned by the authenticated user
router.get("/my-aliases", authenticate, getUserAliases);

// Delete an alias (owner only)
router.delete("/:alias", authenticate, deleteAlias);

// Delete a single file from an alias (owner only)
router.delete("/:alias/file/:fileName", authenticate, deleteFileFromAlias);

// Update alias settings (owner only)
router.put("/:alias", authenticate, updateAlias);

// Check alias availability (with user context for ownership check)
router.get("/check/:alias", authenticate, checkAliasAvailability);


// ============================================
// PUBLIC ROUTES (no authentication required)
// ============================================

// Upload files as guest (with rate limiting)
router.post("/upload-guest", uploadLimiter, upload.array('files'), uploadToAliasGuest);

// Get alias info for download page (PUBLIC)
router.get("/s/:alias", getAliasInfo);

// Verify password for protected alias (PUBLIC)
router.post("/verify-password", verifyAliasPassword);

// Check alias availability for guests (no auth)
router.get("/check-guest/:alias", async (req, res) => {
  const { alias } = req.params;
  try {
    const { Alias } = await import("../models/alias.models.js");
    const existing = await Alias.findOne({ alias: alias.toLowerCase() });
    
    if (!existing) {
      return res.status(200).json({ available: true });
    }
    
    return res.status(200).json({ 
      available: false, 
      error: 'This alias is already taken' 
    });
  } catch (error) {
    return res.status(500).json({ available: false, error: 'Server error' });
  }
});

export default router;

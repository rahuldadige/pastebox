import { Alias, MAX_ALIAS_SIZE_BYTES } from '../models/alias.models.js';
import cloudinary from "../config/cloudinary.js";
import bcrypt from "bcryptjs";
import shortid from "shortid";
import { User } from '../models/user.models.js';
import path from "path";

// Allowed file types for upload (whitelist)
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  'application/pdf', 'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  'text/plain', 'text/csv', 'application/json'
];

// Maximum file size per file (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Sanitize filename to prevent path traversal
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .substring(0, 255);
};

// Validate file type
const isAllowedFileType = (mimetype) => {
  return ALLOWED_MIME_TYPES.includes(mimetype);
};

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    uploadStream.end(buffer);
  });
};

// Helper function to get resource type from mimetype
const getResourceType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'raw';
};

// Helper to generate URL-safe alias
const generateAlias = () => {
  return shortid.generate().toLowerCase().replace(/[^a-z0-9_-]/g, '');
};

// Validate alias format
const isValidAlias = (alias) => {
  return /^[a-z0-9_-]+$/.test(alias.toLowerCase());
};

/**
 * Upload files to an alias (authenticated users only)
 * POST /api/alias/upload
 */
const uploadToAlias = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const { alias: userAlias, isPassword, password, hasExpiry, expiresAt } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Validate all files first
    for (const file of req.files) {
      if (!isAllowedFileType(file.mimetype)) {
        return res.status(400).json({ error: `File type not allowed: ${file.mimetype}` });
      }
      if (file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: `File too large: ${file.originalname}. Max size is 50MB` });
      }
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate total size of incoming files
    const incomingSize = req.files.reduce((sum, file) => sum + file.size, 0);

    // Determine alias (user-defined or auto-generated)
    let alias = userAlias?.trim().toLowerCase();
    
    if (alias) {
      // Validate alias format
      if (!isValidAlias(alias)) {
        return res.status(400).json({ 
          error: 'Invalid alias format. Use only lowercase letters, numbers, hyphens, and underscores.' 
        });
      }

      // Check alias availability
      const availability = await Alias.isAliasAvailable(alias, userId);
      if (!availability.available) {
        return res.status(409).json({ error: availability.error });
      }

      // If alias exists and belongs to user, check size limit
      if (availability.existing) {
        const remainingSpace = MAX_ALIAS_SIZE_BYTES - availability.existing.totalSize;
        if (incomingSize > remainingSpace) {
          return res.status(400).json({ 
            error: `Upload exceeds the 100 MB limit for this alias. Remaining space: ${(remainingSpace / (1024 * 1024)).toFixed(2)} MB` 
          });
        }
      }
    } else {
      // Auto-generate unique alias
      alias = generateAlias();
      while (await Alias.findOne({ alias })) {
        alias = generateAlias();
      }
    }

    // Check if incoming files alone exceed limit for new alias
    if (incomingSize > MAX_ALIAS_SIZE_BYTES) {
      return res.status(400).json({ 
        error: `Total upload size (${(incomingSize / (1024 * 1024)).toFixed(2)} MB) exceeds the 100 MB limit per alias.` 
      });
    }

    // Find existing alias or prepare to create new one
    let aliasDoc = await Alias.findOne({ alias });
    const isNewAlias = !aliasDoc;

    if (isNewAlias) {
      // Create new alias document
      aliasDoc = new Alias({
        alias,
        files: [],
        totalSize: 0,
        createdBy: userId,
        isGuest: false,
        hasExpiry: hasExpiry === 'true',
        expiresAt: hasExpiry === 'true' && expiresAt
          ? new Date(Date.now() + parseInt(expiresAt) * 3600000)
          : new Date(Date.now() + 2 * 24 * 3600000), // Default 2 days
      });

      if (isPassword === 'true' && password) {
        aliasDoc.isPasswordProtected = true;
        aliasDoc.password = await bcrypt.hash(password, 10);
      }
    }

    // Upload files to Cloudinary and add to alias
    const uploadedFiles = [];
    
    for (const file of req.files) {
      const originalName = file.originalname;
      const extension = path.extname(originalName);
      const uniqueSuffix = shortid.generate();
      const finalFileName = `${originalName.replace(/\s+/g, '_')}_${uniqueSuffix}`;

      const resourceType = getResourceType(file.mimetype);
      
      const cloudinaryResult = await uploadToCloudinary(file.buffer, {
        folder: `file-share-app/alias/${alias}`,
        public_id: finalFileName,
        resource_type: resourceType,
      });

      const fileObj = {
        path: cloudinaryResult.secure_url,
        name: finalFileName + extension,
        originalName: originalName,
        publicId: cloudinaryResult.public_id,
        resourceType: resourceType,
        type: file.mimetype,
        size: file.size,
      };

      aliasDoc.files.push(fileObj);
      aliasDoc.totalSize += file.size;
      uploadedFiles.push(fileObj);

      // Update user stats
      user.totalUploads += 1;
      if (file.mimetype.startsWith('image/')) user.imageCount += 1;
      else if (file.mimetype.startsWith('video/')) user.videoCount += 1;
      else if (file.mimetype.startsWith('application/')) user.documentCount += 1;
    }

    await aliasDoc.save();
    await user.save();

    return res.status(201).json({
      message: "Files uploaded successfully",
      alias: alias,
      shareUrl: `/s/${alias}`,
      totalFiles: aliasDoc.files.length,
      totalSize: aliasDoc.totalSize,
      remainingSpace: MAX_ALIAS_SIZE_BYTES - aliasDoc.totalSize,
      files: uploadedFiles.map(f => ({
        name: f.originalName,
        size: f.size,
        type: f.type,
      })),
    });

  } catch (error) {
    console.error("Alias upload error:", error);
    res.status(500).json({ error: "File upload failed" });
  }
};

/**
 * Upload files as guest (no authentication required)
 * POST /api/alias/upload-guest
 */
const uploadToAliasGuest = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const { alias: userAlias, isPassword, password, hasExpiry, expiresAt } = req.body;

  try {
    // Calculate total size of incoming files
    const incomingSize = req.files.reduce((sum, file) => sum + file.size, 0);

    // Check if incoming files alone exceed limit
    if (incomingSize > MAX_ALIAS_SIZE_BYTES) {
      return res.status(400).json({ 
        error: `Total upload size (${(incomingSize / (1024 * 1024)).toFixed(2)} MB) exceeds the 100 MB limit per alias.` 
      });
    }

    // Determine alias
    let alias = userAlias?.trim().toLowerCase();
    
    if (alias) {
      if (!isValidAlias(alias)) {
        return res.status(400).json({ 
          error: 'Invalid alias format. Use only lowercase letters, numbers, hyphens, and underscores.' 
        });
      }

      // For guests, check if alias exists at all
      const existing = await Alias.findOne({ alias });
      if (existing) {
        return res.status(409).json({ error: 'This alias is already taken. Please choose a different one.' });
      }
    } else {
      alias = generateAlias();
      while (await Alias.findOne({ alias })) {
        alias = generateAlias();
      }
    }

    // Create new alias document for guest
    const aliasDoc = new Alias({
      alias,
      files: [],
      totalSize: 0,
      createdBy: null,
      isGuest: true,
      hasExpiry: hasExpiry === 'true',
      expiresAt: hasExpiry === 'true' && expiresAt
        ? new Date(Date.now() + parseInt(expiresAt) * 3600000)
        : new Date(Date.now() + 2 * 24 * 3600000), // Default 2 days for guests
    });

    if (isPassword === 'true' && password) {
      aliasDoc.isPasswordProtected = true;
      aliasDoc.password = await bcrypt.hash(password, 10);
    }

    // Upload files
    const uploadedFiles = [];
    
    for (const file of req.files) {
      const originalName = file.originalname;
      const extension = path.extname(originalName);
      const uniqueSuffix = shortid.generate();
      const finalFileName = `${originalName.replace(/\s+/g, '_')}_${uniqueSuffix}`;

      const resourceType = getResourceType(file.mimetype);
      
      const cloudinaryResult = await uploadToCloudinary(file.buffer, {
        folder: `file-share-app-guest/alias/${alias}`,
        public_id: finalFileName,
        resource_type: resourceType,
      });

      const fileObj = {
        path: cloudinaryResult.secure_url,
        name: finalFileName + extension,
        originalName: originalName,
        publicId: cloudinaryResult.public_id,
        resourceType: resourceType,
        type: file.mimetype,
        size: file.size,
      };

      aliasDoc.files.push(fileObj);
      aliasDoc.totalSize += file.size;
      uploadedFiles.push(fileObj);
    }

    await aliasDoc.save();

    return res.status(201).json({
      message: "Files uploaded successfully",
      alias: alias,
      shareUrl: `/s/${alias}`,
      totalFiles: aliasDoc.files.length,
      totalSize: aliasDoc.totalSize,
      files: uploadedFiles.map(f => ({
        name: f.originalName,
        size: f.size,
        type: f.type,
        path: f.path,
      })),
    });

  } catch (error) {
    console.error("Guest alias upload error:", error);
    res.status(500).json({ error: "File upload failed" });
  }
};

/**
 * Get alias info for download (PUBLIC - no auth required)
 * GET /api/alias/s/:alias
 */
const getAliasInfo = async (req, res) => {
  const { alias } = req.params;

  try {
    const aliasDoc = await Alias.findOne({ alias: alias.toLowerCase() });
    
    if (!aliasDoc) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    if (aliasDoc.status !== 'active') {
      return res.status(403).json({ error: 'This share link is no longer active' });
    }

    if (aliasDoc.expiresAt && new Date(aliasDoc.expiresAt) < new Date()) {
      // Delete the expired alias to free it up for others
      await Alias.deleteOne({ _id: aliasDoc._id });
      return res.status(410).json({ error: 'This share link has expired' });
    }

    // Build download info - client will handle download with proper filename
    const filesWithDownloadUrl = aliasDoc.files.map(file => {
      return {
        name: file.originalName,
        size: file.size,
        type: file.type,
        path: file.path,
        downloadUrl: file.path,
      };
    });

    // Increment download count
    aliasDoc.downloadCount += 1;
    await aliasDoc.save();

    return res.status(200).json({
      alias: aliasDoc.alias,
      files: filesWithDownloadUrl,
      totalFiles: aliasDoc.files.length,
      totalSize: aliasDoc.totalSize,
      isPasswordProtected: aliasDoc.isPasswordProtected,
      expiresAt: aliasDoc.expiresAt,
      downloadCount: aliasDoc.downloadCount,
      createdAt: aliasDoc.createdAt,
      isGuest: aliasDoc.isGuest,
    });

  } catch (error) {
    console.error("Get alias info error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Verify password for protected alias (PUBLIC - no auth)
 * POST /api/alias/verify-password
 */
const verifyAliasPassword = async (req, res) => {
  const { alias, password } = req.body;

  try {
    const aliasDoc = await Alias.findOne({ alias: alias.toLowerCase() });
    
    if (!aliasDoc) {
      return res.status(404).json({ success: false, error: 'Share link not found' });
    }

    if (!aliasDoc.isPasswordProtected) {
      return res.status(400).json({ success: false, error: 'This share link is not password protected' });
    }

    const isMatch = await bcrypt.compare(password, aliasDoc.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Incorrect password' });
    }

    return res.status(200).json({ success: true, message: 'Password verified' });

  } catch (error) {
    console.error("Verify alias password error:", error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};

/**
 * Check alias availability (PUBLIC)
 * GET /api/alias/check/:alias
 */
const checkAliasAvailability = async (req, res) => {
  const { alias } = req.params;
  const userId = req.user?.userId; // Optional - may be null for guests

  try {
    if (!isValidAlias(alias)) {
      return res.status(400).json({ 
        available: false, 
        error: 'Invalid alias format' 
      });
    }

    const availability = await Alias.isAliasAvailable(alias, userId);
    
    if (availability.available) {
      const remainingSpace = availability.existing 
        ? MAX_ALIAS_SIZE_BYTES - availability.existing.totalSize 
        : MAX_ALIAS_SIZE_BYTES;
      
      return res.status(200).json({ 
        available: true,
        isOwned: !!availability.existing,
        remainingSpace: remainingSpace,
        remainingSpaceMB: (remainingSpace / (1024 * 1024)).toFixed(2),
      });
    }

    return res.status(200).json({ 
      available: false, 
      error: availability.error 
    });

  } catch (error) {
    console.error("Check alias error:", error);
    return res.status(500).json({ available: false, error: 'Server error' });
  }
};

/**
 * Get user's aliases (authenticated)
 * GET /api/alias/my-aliases
 */
const getUserAliases = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Filter out expired aliases - only show aliases that haven't expired
    const currentDate = new Date();
    const aliases = await Alias.find({ 
      createdBy: userId,
      $or: [
        { expiresAt: { $gt: currentDate } },  // Not expired yet
        { expiresAt: null },                   // No expiry set
        { expiresAt: { $exists: false } }      // expiresAt field doesn't exist
      ]
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      count: aliases.length,
      aliases: aliases.map(a => ({
        alias: a.alias,
        shareUrl: `/s/${a.alias}`,
        totalFiles: a.files.length,
        totalSize: a.totalSize,
        downloadCount: a.downloadCount,
        isPasswordProtected: a.isPasswordProtected,
        hasExpiry: a.hasExpiry,
        expiresAt: a.expiresAt,
        status: a.status,
        createdAt: a.createdAt,
        files: a.files.map(f => ({
          name: f.originalName,
          size: f.size,
          type: f.type,
          path: f.path,
        })),
      })),
    });

  } catch (error) {
    console.error("Get user aliases error:", error);
    return res.status(500).json({ error: 'Error fetching aliases' });
  }
};

/**
 * Delete an alias (authenticated - owner only)
 * DELETE /api/alias/:alias
 */
const deleteAlias = async (req, res) => {
  const { alias } = req.params;
  const userId = req.user.userId;

  try {
    const aliasDoc = await Alias.findOne({ alias: alias.toLowerCase() });
    
    if (!aliasDoc) {
      return res.status(404).json({ error: 'Alias not found' });
    }

    if (!aliasDoc.createdBy || aliasDoc.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this alias' });
    }

    // Delete files from Cloudinary
    for (const file of aliasDoc.files) {
      if (file.publicId) {
        try {
          await cloudinary.uploader.destroy(file.publicId, { resource_type: file.resourceType });
        } catch (err) {
          console.error(`Failed to delete ${file.publicId} from Cloudinary:`, err);
        }
      }
    }

    await Alias.deleteOne({ _id: aliasDoc._id });

    return res.status(200).json({ message: 'Alias and all files deleted successfully' });

  } catch (error) {
    console.error("Delete alias error:", error);
    return res.status(500).json({ error: 'Error deleting alias' });
  }
};

/**
 * Update alias settings (authenticated - owner only)
 * PUT /api/alias/:alias
 */
const updateAlias = async (req, res) => {
  const { alias } = req.params;
  const { newPassword, removePassword, hasExpiry, expiresAt } = req.body;
  const userId = req.user.userId;

  try {
    const aliasDoc = await Alias.findOne({ alias: alias.toLowerCase() });
    
    if (!aliasDoc) {
      return res.status(404).json({ error: 'Alias not found' });
    }

    if (!aliasDoc.createdBy || aliasDoc.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to update this alias' });
    }

    // Update password
    if (removePassword === 'true') {
      aliasDoc.isPasswordProtected = false;
      aliasDoc.password = null;
    } else if (newPassword) {
      aliasDoc.isPasswordProtected = true;
      aliasDoc.password = await bcrypt.hash(newPassword, 10);
    }

    // Update expiry
    if (hasExpiry !== undefined) {
      aliasDoc.hasExpiry = hasExpiry === 'true' || hasExpiry === true;
      if (aliasDoc.hasExpiry && expiresAt) {
        aliasDoc.expiresAt = new Date(Date.now() + parseInt(expiresAt) * 3600000);
      }
    }

    await aliasDoc.save();

    return res.status(200).json({ 
      message: 'Alias updated successfully',
      alias: aliasDoc.alias,
      isPasswordProtected: aliasDoc.isPasswordProtected,
      hasExpiry: aliasDoc.hasExpiry,
      expiresAt: aliasDoc.expiresAt,
    });

  } catch (error) {
    console.error("Update alias error:", error);
    return res.status(500).json({ error: 'Error updating alias' });
  }
};

/**
 * Delete a single file from an alias (authenticated - owner only)
 * DELETE /api/alias/:alias/file/:fileName
 */
const deleteFileFromAlias = async (req, res) => {
  const { alias, fileName } = req.params;
  const userId = req.user.userId;

  try {
    const aliasDoc = await Alias.findOne({ alias: alias.toLowerCase() });
    
    if (!aliasDoc) {
      return res.status(404).json({ error: 'Alias not found' });
    }

    if (!aliasDoc.createdBy || aliasDoc.createdBy.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete files from this alias' });
    }

    // Find the file in the alias
    const fileIndex = aliasDoc.files.findIndex(f => f.originalName === fileName || f.name === fileName);
    
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found in this alias' });
    }

    const fileToDelete = aliasDoc.files[fileIndex];

    // Delete file from Cloudinary
    if (fileToDelete.publicId) {
      try {
        await cloudinary.uploader.destroy(fileToDelete.publicId, { resource_type: fileToDelete.resourceType });
      } catch (err) {
        console.error(`Failed to delete ${fileToDelete.publicId} from Cloudinary:`, err);
      }
    }

    // Update totalSize
    aliasDoc.totalSize -= fileToDelete.size;
    
    // Remove the file from the array
    aliasDoc.files.splice(fileIndex, 1);

    // If no files left, delete the entire alias
    if (aliasDoc.files.length === 0) {
      await Alias.deleteOne({ _id: aliasDoc._id });
      return res.status(200).json({ message: 'File deleted. Alias removed as it had no more files.', aliasDeleted: true });
    }

    await aliasDoc.save();

    return res.status(200).json({ 
      message: 'File deleted successfully',
      aliasDeleted: false,
      remainingFiles: aliasDoc.files.length 
    });

  } catch (error) {
    console.error("Delete file from alias error:", error);
    return res.status(500).json({ error: 'Error deleting file' });
  }
};

export {
  uploadToAlias,
  uploadToAliasGuest,
  getAliasInfo,
  verifyAliasPassword,
  checkAliasAvailability,
  getUserAliases,
  deleteAlias,
  updateAlias,
  deleteFileFromAlias,
};

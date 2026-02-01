
import express, { Router } from "express"
import multer from "multer";
import rateLimit from "express-rate-limit";

const router = Router();
import { getUsers, getUserById, registerUser, loginUser, updateUser, deleteUser, logoutUser } from "../controllers/user.controller.js";
import authenticate from "../middlewares/auth.middlewares.js";

// Rate limiter for auth routes to prevent brute force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register attempts per 15 minutes
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for profile picture uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for profile pictures
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes
router.get("/user", getUsers);
router.get("/user/:userId", getUserById);

// Auth routes with rate limiting
router.post("/register", authLimiter, registerUser);
router.post("/login", authLimiter, loginUser);
router.get('/logout', logoutUser);

// Protected routes
router.put("/user/:userId", authenticate, upload.single('profilePic'), updateUser);
router.delete("/user/:userId", authenticate, deleteUser);

export default router;

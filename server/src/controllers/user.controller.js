import { User } from "../models/user.models.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import shortid from "shortid";
import cloudinary from "../config/cloudinary.js";

// Sanitize input to prevent NoSQL injection
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.replace(/[\$\{\}]/g, '');
  }
  return input;
};

const generateUniqueId = () => {
  return shortid.generate();
};

// Function to create a new user
const registerUser = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

    // Validate required fields
    if (!fullname || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Sanitize inputs
    const cleanEmail = sanitizeInput(email.toLowerCase().trim());
    const cleanFullname = sanitizeInput(fullname.trim());

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: "Invalid email format." });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    // Validate fullname length
    if (cleanFullname.length < 6) {
      return res.status(400).json({ message: "Fullname must be at least 6 characters long." });
    }

    // Check for existing user
    const existedUser = await User.findOne({ email: cleanEmail });
    if (existedUser) {
      return res.status(400).json({ message: "Email already in use." });
    }

    // Generate username
    const cleanedFullname = cleanFullname.replace(/\s+/g, '');
    const username = `${cleanedFullname.substring(0, 4).toLowerCase()}${generateUniqueId().substring(0, 5)}`;

    // Generate random profile picture
    const pic = Math.floor(Math.random() * 100) + 1;
    const profilePic = `https://avatar.iran.liara.run/public/${pic}`;

    const newUser = new User({
      fullname: cleanFullname,
      username,
      email: cleanEmail,
      password,
      profilePic
    });

    await newUser.save();
    return res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Error during registration:", error.message);
    return res.status(500).json({ message: "Error during registration" });
  }
};

// logoutUser
const logoutUser = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Error during logout" });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
};

const getUserById = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user" });
  }
};

// Update user profile
const updateUser = async (req, res) => {
  const { userId } = req.params;
  const { username } = req.body;

  try {
    const updateData = {};
    
    // Handle username update
    if (username) {
      updateData.username = username;
    }

    // Handle profile picture upload
    if (req.file) {
      try {
        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "profile-pictures",
              resource_type: "image",
              transformation: [
                { width: 300, height: 300, crop: "fill", gravity: "face" }
              ]
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(req.file.buffer);
        });
        
        updateData.profilePic = result.secure_url;
      } catch (uploadError) {
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({ message: "Failed to upload profile picture" });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No data to update" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Error updating user" });
  }
};

// Fix deleteUser
const deleteUser = async (req, res) => {
  const { userId } = req.params;

  try {
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validate at least one identifier is provided
    if (!email && !username) {
      return res.status(400).json({ message: "Email or username is required" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required" });
    }

    // Sanitize inputs
    const cleanEmail = email ? sanitizeInput(email.toLowerCase().trim()) : null;
    const cleanUsername = username ? sanitizeInput(username.trim()) : null;

    const user = await User.findOne({
      $or: [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(cleanUsername ? [{ username: cleanUsername }] : [])
      ],
    });

    if (!user) {
      // Use generic message to prevent user enumeration
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "24h",
    });
    
    user.lastLogin = new Date();
    await user.save();

    // Set token in cookie with proper security settings
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Error logging in" });
  }
};


const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    req.userId = decoded.userId;
    next();
  });
};

export {
  registerUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  loginUser,
  verifyToken,
  generateUniqueId,
  logoutUser,
};

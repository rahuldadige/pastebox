import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullname: { 
    type: String, 
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters'],
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  username: { 
    type: String, 
    required: [true, 'Username is required'],
    trim: true,
    lowercase: true,
    index: true
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  totalUploads: { type: Number, default: 0, min: 0 },
  totalDownloads: { type: Number, default: 0, min: 0 },
  videoCount: { type: Number, default: 0, min: 0 },
  imageCount: { type: Number, default: 0, min: 0 },
  documentCount: { type: Number, default: 0, min: 0 },
  profilePic: { 
    type: String, 
    default: 'https://avatar.iran.liara.run/public/1'
  },
  lastLogin: { type: Date, default: Date.now },
}, {
  timestamps: true
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);

export {User};
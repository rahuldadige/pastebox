import mongoose, { Schema } from "mongoose";

const MAX_ALIAS_SIZE = 100 * 1024 * 1024; // 100 MB

const aliasSchema = new Schema({
  // The unique alias/shortcode for the URL
  alias: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9_-]+$/, 'Alias can only contain lowercase letters, numbers, hyphens, and underscores'],
  },

  // Files associated with this alias
  files: [{
    path: { type: String, required: true },
    name: { type: String, required: true },
    originalName: { type: String, required: true },
    publicId: { type: String, default: null },
    resourceType: { type: String, enum: ['image', 'video', 'raw'], default: 'raw' },
    type: { type: String, required: true },
    size: { type: Number, required: true },
  }],

  // Total size of all files in this alias (in bytes)
  totalSize: {
    type: Number,
    default: 0,
    max: [MAX_ALIAS_SIZE, 'Total size cannot exceed 100 MB'],
  },

  // Download count
  downloadCount: {
    type: Number,
    default: 0,
  },

  // Password protection
  isPasswordProtected: {
    type: Boolean,
    default: false,
  },
  password: {
    type: String,
    default: null,
  },

  // Expiry settings
  hasExpiry: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    default: null,
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'expired'],
    default: 'active',
  },

  // Owner - null for guest uploads, ObjectId for authenticated users
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  // Flag for guest uploads
  isGuest: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });

// Index for efficient queries
aliasSchema.index({ alias: 1 });
aliasSchema.index({ createdBy: 1 });
aliasSchema.index({ expiresAt: 1 });

// Static method to check if alias is available
aliasSchema.statics.isAliasAvailable = async function(alias, userId = null) {
  const existing = await this.findOne({ alias: alias.toLowerCase() });
  if (!existing) return { available: true };
  
  // Check if the alias has expired - if so, delete it and make it available
  if (existing.expiresAt && new Date(existing.expiresAt) < new Date()) {
    // Delete the expired alias to free it up for others
    await this.deleteOne({ _id: existing._id });
    return { available: true };
  }
  
  // If owned by same user, they can add to it
  if (userId && existing.createdBy && existing.createdBy.toString() === userId.toString()) {
    return { available: true, existing: existing };
  }
  
  return { available: false, error: 'This alias is already taken by another user' };
};

// Static method to calculate remaining space
aliasSchema.statics.getRemainingSpace = async function(alias) {
  const existing = await this.findOne({ alias: alias.toLowerCase() });
  if (!existing) return MAX_ALIAS_SIZE;
  return MAX_ALIAS_SIZE - existing.totalSize;
};

// Constants export
export const MAX_ALIAS_SIZE_BYTES = MAX_ALIAS_SIZE;

export const Alias = mongoose.model("Alias", aliasSchema);

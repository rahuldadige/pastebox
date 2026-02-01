import React, { useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { deleteUser, updateUser } from "../../redux/slice/auth/authThunk";
import { FaCamera } from "react-icons/fa";
import { toast } from "react-toastify";

const UserProfile = () => {
  const { user, loading } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || "");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Handle both id and _id formats
  const userId = user?._id || user?.id;

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleUpdate = async () => {
    const updateData = { userId };
    
    // Always include username
    updateData.username = newUsername;
    
    if (selectedImage) {
      updateData.profilePic = selectedImage;
    }
    
    try {
      await dispatch(updateUser(updateData)).unwrap();
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile: ' + error);
    }
    
    setEditModalOpen(false);
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleDelete = () => {
    dispatch(deleteUser(userId));
    setDeleteModalOpen(false);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setNewUsername(user?.username || "");
    setSelectedImage(null);
    setImagePreview(null);
  };

  if (!user) {
    return <div className="p-6 text-center">Loading user data...</div>;
  }

  return (
    <div className="p-6 bg-white shadow-lg rounded-xl mx-auto mt-10">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">User Profile</h2>

      <div className="flex items-center gap-6">
        <img
          src={user.profilePic}
          alt="Profile"
          className="w-28 h-28 rounded-full border-4 border-blue-500 shadow object-cover"
        />
        <div className="flex-1 space-y-1">
          <h3 className="text-xl font-semibold text-gray-900">{user.fullname}</h3>
          <p className="text-gray-600">@{user.username}</p>
          <p className="text-gray-700">{user.email}</p>
          <p className="text-sm text-gray-500">
            User ID: <span className="text-xs text-gray-700">{userId}</span>
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col md:flex-row gap-4">
        <button
          onClick={() => setEditModalOpen(true)}
          className="w-full md:w-1/2 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded shadow"
        >
          Edit Profile
        </button>
        <button
          onClick={() => setDeleteModalOpen(true)}
          className="w-full md:w-1/2 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded shadow"
        >
          Delete Account
        </button>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96 space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Edit Profile</h3>
            
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <img
                  src={imagePreview || user.profilePic}
                  alt="Profile Preview"
                  className="w-24 h-24 rounded-full border-4 border-blue-500 shadow object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                >
                  <FaCamera size={14} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <p className="text-xs text-gray-500">Click camera icon to change photo (max 5MB)</p>
            </div>

            {/* Username Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={handleCloseEditModal}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80 space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Confirm Deletion</h3>
            <p className="text-gray-600">Are you sure you want to delete your account?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;

# 📦 PasteBox - A Secure File Sharing Platform

PasteBox is a modern, full-stack file-sharing platform that allows users to securely upload, share, and manage files with advanced features like password protection, custom aliases, and auto-expiry.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🚀 Features

### 👤 For Registered Users
- **Personal Dashboard:** Track all your uploads, downloads, and storage stats.
- **Custom Aliases:** Create easy-to-remember links like `pastebox.com/s/my-project`.
- **Advanced Management:** Update passwords, change expiry dates, or delete files anytime.
- **QR Code Generation:** Instantly generate QR codes for any shared file.

### 🌐 For Guest Users
- **Fast Upload:** Share files quickly without creating an account.
- **Secure Links:** Still get password protection and expiry options.

### 🛡️ Security & Performance
- **Password Protection:** Encrypt shared links with BCrypt hashing.
- **Auto-Expiry:** Files automatically become unavailable after the set time.
- **Production Ready:** Implements `Helmet` (security), `Rate Limiting` (anti-abuse), and `Compression` (performance).
- **Blob Downloads:** Ensures files are downloaded with their original names and extensions.
- **Global Error Handling:** Robust error boundaries and server-side graceful shutdown.

---

## 🛠️ Tech Stack

**Frontend:**
- React (Vite)
- Redux Toolkit (State Management)
- Tailwind CSS (Styling)
- React Router (Routing)

**Backend:**
- Node.js & Express
- MongoDB with Mongoose
- Cloudinary (File Storage)
- JWT (Authentication)
- Multer (File Handling)

---

## ⚙️ Getting Started

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas account
- Cloudinary account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rahuldadige/pastebox.git
   cd pastebox
   ```

2. **Setup Backend:**
   ```bash
   cd server
   npm install
   ```
   Create a `.env` file in the `server` directory:
   ```env
   PORT=6600
   MONGODB_URL=your_mongodb_url
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development
   ```

3. **Setup Frontend:**
   ```bash
   cd ../client
   npm install
   ```
   Create a `.env` file in the `client` directory:
   ```env
   VITE_API_BASE_URL=http://localhost:6600/api
   ```

### Running the App

1. **Start Server:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start Client:**
   ```bash
   cd client
   npm run dev
   ```

---

## 📄 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/users/register` | Register a new user |
| `POST` | `/api/users/login` | Login and receive JWT |
| `POST` | `/api/files/upload` | Upload files (Auth required) |
| `GET` | `/api/files/f/:code` | Get file info via short code |
| `POST` | `/api/alias/upload` | Create file collection with custom alias |

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.

Developed by **[Rahul Dadige]** 🚀

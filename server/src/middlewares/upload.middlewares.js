import multer from 'multer';
import path from 'path';

const storage = multer.memoryStorage();

const allowedExtensions = [
  '.jpg', '.jpeg', '.webp', '.png', '.gif', '.svg', '.bmp', '.ico',
  '.mp4', '.avi', '.mov', '.mkv', '.webm', '.flv',
  '.mp3', '.wav', '.ogg', '.m4a',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt',
  '.zip', '.rar', '.7z', '.tar', '.gz'
];

const upload = multer({
  storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100 MB per file (alias total is checked in controller)
    files: 20 // Max 20 files per upload
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error(`❌ Unsupported file type: ${ext}`));
    }
    cb(null, true);
  }
});

export default upload;

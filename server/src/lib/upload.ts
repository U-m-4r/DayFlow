/** Shared Multer upload config — local disk storage with type + size restrictions (§9). */
import crypto from 'crypto';
import path from 'path';
import multer from 'multer';

export const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg', 'image/png', 'application/pdf'].includes(file.mimetype));
  },
});

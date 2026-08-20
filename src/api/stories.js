import express from 'express';
import { uploadToCloudinary } from '../../utils/cloudinaryUpload.js'; // adjust path if needed
import { pool } from '../db.js'; // however you import your pg pool
import { authenticate } from '../middleware/auth.js'; // your auth middleware

const router = express.Router();

// POST /stories — upload directly to Cloudinary
router.post(
  '/',
  authenticate,
  uploadToCloudinary.single('media'), // ← uses your multer-storage-cloudinary config
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No media file provided' });
      }

      // multer-storage-cloudinary puts the Cloudinary URL here:
      const mediaUrl = req.file.path || req.file.secure_url;
      const mediaType = req.file.resource_type || 
                        (req.file.mimetype?.startsWith('video/') ? 'video' : 'image');

      const userId = req.user.id;
      const caption = req.body.caption || '';

      const result = await pool.query(
        `INSERT INTO stories (user_id, media_url, media_type, caption, created_at, expires_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '24 hours')
         RETURNING *`,
        [userId, mediaUrl, mediaType, caption]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Story upload error:', err);
      res.status(500).json({ error: 'Failed to create story' });
    }
  }
);

// GET /stories — fetch non-expired stories
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM stories 
       WHERE expires_at > NOW() 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch stories error:', err);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

export default router;
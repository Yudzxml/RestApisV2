import express from 'express';
import axios from 'axios';

const router = express.Router();

function validateMediaLink(url, format, quality) {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") return { valid: false, error: "URL harus HTTPS." };
  } catch {
    return { valid: false, error: "URL tidak valid." };
  }

  const validFormats = ["audio", "video"];
  if (!validFormats.includes(format.toLowerCase())) return { valid: false, error: "Format harus audio atau video." };

  if (format.toLowerCase() === "audio") {
    if (quality !== 128) return { valid: false, error: "Quality audio harus 128." };
  } else {
    const validVideoQualities = [360, 480, 720, 1080, 1440];
    if (!validVideoQualities.includes(quality)) return { valid: false, error: "Quality video harus salah satu dari 360, 480, 720, 1080, atau 1440." };
  }

  return { valid: true };
}

const base = {
  submitDownload: "https://api.grabtheclip.com/submit-download",
  getDownload: "https://api.grabtheclip.com/get-download/"
};

router.post('/', async (req, res) => {
  const { url, format, quality } = req.body;

  if (!url || !format || !quality) {
    return res.status(400).json({ error: 'url, format, dan quality harus diisi' });
  }

  const validation = validateMediaLink(url, format, quality);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const payload = {
      height: quality,
      media_type: format,
      url: url
    };

    const { data: { task_id } } = await axios.post(base.submitDownload, payload);

    let d;
    do {
      const ress = await axios.get(base.getDownload + task_id);
      d = ress.data;
      if (d.status !== "Success") {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } while (d.status !== "Success");

    return res.status(200).json({
      author: "Yudzxml",
      data: {
        downloadUrl: d.result.url
      }
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Terjadi kesalahan server' });
  }
});

export default router;
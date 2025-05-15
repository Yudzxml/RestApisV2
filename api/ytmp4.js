import express from 'express';
import axios from 'axios';

const router = express.Router();

const cache = new Map(); // simple cache { task_id: result }

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
    if (parseInt(quality) !== 128) return { valid: false, error: "Quality audio harus 128." };
  } else {
    const validVideoQualities = [360, 480, 720, 1080, 1440];
    if (!validVideoQualities.includes(parseInt(quality))) return { valid: false, error: "Quality video harus salah satu dari 360, 480, 720, 1080, atau 1440." };
  }

  return { valid: true };
}

const base = {
  submitDownload: "https://api.grabtheclip.com/submit-download",
  getDownload: "https://api.grabtheclip.com/get-download/"
};

async function pollDownload(task_id, maxTries = 20, interval = 500) {
  if (cache.has(task_id)) {
    return cache.get(task_id);
  }

  for (let i = 0; i < maxTries; i++) {
    try {
      const response = await axios.get(base.getDownload + task_id);
      const data = response.data;

      if (data.status === "Success") {
        cache.set(task_id, data); // simpan cache
        return data;
      }
    } catch (e) {
      // Bisa log error, tapi tetap coba polling ulang
      console.error("Error polling:", e.message);
    }
    await new Promise(res => setTimeout(res, interval));
  }

  throw new Error('Timeout polling download');
}

router.get('/', async (req, res) => {
  const { url, format, quality } = req.query;

  if (!url || !format || !quality) {
    return res.status(400).json({ error: 'url, format, dan quality harus diisi' });
  }

  const validation = validateMediaLink(url, format, parseInt(quality));
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    const payload = {
      height: parseInt(quality),
      media_type: format,
      url: url
    };

    const { data: { task_id } } = await axios.post(base.submitDownload, payload);

    const d = await pollDownload(task_id);

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
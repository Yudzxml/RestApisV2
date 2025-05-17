import express from 'express';
import axios from 'axios';

const router = express.Router();

const token = process.env.GITHUB_TOKEN;
const owner = 'Yudzxml';
const repo = 'Runbot';
const path = 'ngokntlm.json';

router.get('/', async (req, res) => {
  try {
    const headers = {
      Authorization: `token ${token}`,
      'User-Agent': 'Vercel Function'
    };

    const getRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers
    });

    const { content } = getRes.data;

    if (!content) {
      return res.status(500).json({ error: 'Gagal membaca file dari GitHub.' });
    }

    const decoded = Buffer.from(content, 'base64').toString('utf-8');
    const json = JSON.parse(decoded);

    return res.status(200).json(json);
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan saat mengambil data: ' + err.message });
  }
});

export default router;
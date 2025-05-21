import express from 'express';
import axios from 'axios';
import cheerio from 'cheerio';

const router = express.Router();

async function fetchInitialPage(initialUrl) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; RMX2185) AppleWebKit/537.36 Chrome/136.0.7103.60 Mobile Safari/537.36',
    'Referer': initialUrl,
  };

  const response = await axios.get(initialUrl, { headers });
  const $ = cheerio.load(response.data);
  const csrfToken = $('meta[name="csrf-token"]').attr('content');

  if (!csrfToken) throw new Error('Token keamanan tidak ditemukan');

  const cookies = response.headers['set-cookie']?.join('; ') || '';
  return { csrfToken, cookies };
}

async function postDownloadRequest(downloadUrl, userUrl, csrfToken, cookies) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/136.0.7103.60 Mobile Safari/537.36',
    'Referer': 'https://on4t.com/online-video-downloader',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Accept': '*/*',
    'X-Requested-With': 'XMLHttpRequest',
    'Cookie': cookies
  };

  const postData = new URLSearchParams();
  postData.append('_token', csrfToken);
  postData.append('link[]', userUrl);

  const response = await axios.post(downloadUrl, postData.toString(), { headers });

  if (response.data?.result && Array.isArray(response.data.result)) {
    return response.data.result.map(item => ({
      title: item.title,
      thumbnail: item.image,
      video_file_url: item.video_file_url,
      preview_image: item.videoimg_file_url,
    }));
  } else {
    throw new Error('Data dari server tidak valid');
  }
}

// Route GET /api/download-video?url=...
router.get('/', async (req, res) => {
  const url = req.query.url;

  if (!url) return res.status(400).json({ error: 'Parameter URL wajib diisi' });

  try {
    const initialUrl = 'https://on4t.com/online-video-downloader';
    const downloadUrl = 'https://on4t.com/all-video-download';

    const { csrfToken, cookies } = await fetchInitialPage(initialUrl);
    const result = await postDownloadRequest(downloadUrl, url, csrfToken, cookies);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
import axios from 'axios';
import express from 'express';

const router = express.Router();

// ===== Konstanta =====
export const formatAudio = [320, 256, 192, 128];
export const formatVideo = [1080, 720, 480, 360];
export const formatInput = ["audio", "video"];

// ===== Helper Functions =====
export function extractYoutubeId(input) {
  try {
    if (input.includes("youtube.com") || input.includes("youtu.be")) {
      const url = new URL(input);
      return url.searchParams.get("v") || url.pathname.split("/").pop();
    }
    return input.trim();
  } catch {
    return input.trim();
  }
}

export async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function auth() {
  const authRes = await axios.post('https://api.cdnframe.com/api/v5/auth', null, {
    headers: {
      accept: '*/*',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      origin: 'https://clickapi.net',
      cookie: ''
    }
  });

  const token = authRes.data?.token;
  if (!token) return { success: false, step: 'auth', message: authRes.data || 'No token returned' };
  return { success: true, token };
}

export async function Info(id) {
  const { token } = await auth();
  const infoRes = await axios.get(`https://api.cdnframe.com/api/v5/info/${id}`, {
    headers: {
      accept: 'application/json',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      authorization: `Bearer ${token}`,
      cookie: '',
      origin: 'https://clickapi.net'
    }
  });

  return { success: true, token, data: infoRes.data };
}

export async function convertVideo(videoId, quality, format) {
  const infoJson = await Info(videoId);
  let formatToken;

  if (format === "audio") {
    const audioObj = infoJson.data.formats.audio.find(a => a.quality === quality);
    if (!audioObj) throw new Error("Audio quality tidak ditemukan");
    formatToken = audioObj.token;
  } else if (format === "video") {
    const videoObj = infoJson.data.formats.video.find(v => v.quality === quality);
    if (!videoObj) throw new Error("Video quality tidak ditemukan");
    formatToken = videoObj.token;
  } else {
    throw new Error("Format harus 'audio' atau 'video'");
  }

  const res = await fetch("https://api.cdnframe.com/api/v5/convert", {
    method: "POST",
    headers: {
      accept: 'application/json',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      authorization: `Bearer ${infoJson.token}`,
      cookie: '',
      'content-type': 'application/json',
      origin: 'https://clickapi.net'
    },
    body: JSON.stringify({ token: formatToken })
  });

  const job = await res.json();
  return { jobId: job.jobId, token: infoJson.token };
}

export async function getLinkDownload(input, quality, format) {
  const id = extractYoutubeId(input);
  const { jobId, token } = await convertVideo(id, quality, format);

  try {
    let statusData;
    while (true) {
      const url = `https://api.cdnframe.com/api/v5/status/${jobId}`;
      const response = await axios.get(url, {
        headers: {
          accept: "application/json",
          'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          authorization: `Bearer ${token}`,
          'content-type': "application/json",
          origin: "https://clickapi.net"
        }
      });
      statusData = response.data;
      console.log("Cek status:", statusData.status);
      if (statusData.status === "completed" || statusData.downloadUrl) break;
      await delay(3000);
    }

    return {
      title: statusData.title,
      duration: statusData.duration,
      quality: statusData.quality,
      format: statusData.fileFormat,
      downloadUrl: statusData.downloadUrl
    };
  } catch (error) {
    console.error('Error saat cek status:', error.message);
    return null;
  }
}

// ===== API Route =====
router.get('/', async (req, res) => {
  const { url, format, quality } = req.query;

  if (!url) {
    return res.status(400).json({
      status: 400,
      author: 'Yudzxml',
      error: 'Parameter "url" tidak ditemukan.'
    });
  }

  const normalizedFormat = format?.toLowerCase();
  const isAudio = formatAudio.includes(Number(quality)) && normalizedFormat === 'audio';
  const isVideo = formatVideo.includes(Number(quality)) && normalizedFormat === 'video';

  if (!isAudio && !isVideo) {
    return res.status(400).json({
      status: 400,
      author: 'Yudzxml',
      error: 'Format audio atau kualitas video tidak valid.'
    });
  }

  try {
    const result = await getLinkDownload(url, Number(quality), normalizedFormat);

    if (!result) {
      return res.status(500).json({
        status: 500,
        author: 'Yudzxml',
        error: 'Gagal mendapatkan link download.'
      });
    }

    return res.status(200).json({
      status: 200,
      author: 'Yudzxml',
      data: result
    });
  } catch (err) {
    console.error('[YTDL] Fatal error:', err.message);
    return res.status(500).json({
      status: 500,
      author: 'Yudzxml',
      error: err.message || 'Terjadi kesalahan internal.'
    });
  }
});

export default router;

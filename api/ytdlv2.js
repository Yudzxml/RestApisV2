import express from 'express';
import axios from 'axios';

const router = express.Router();

// Format audio yang didukung
const SUPPORTED_AUDIO_FORMATS = ["mp3", "m4a", "webm", "aac", "flac", "ogg", "wav"];

// Kualitas video yang didukung
const SUPPORTED_VIDEO_QUALITIES = {
    low: "360",
    medium: "480",
    hd: "720",
    fullHd: "1080",
    hdHigh: "1440",
    ultraHd: "4k",
};

// Fungsi generate API key acak (dummy)
function generateSimilarString() {
    const hexChars = '0123456789abcdef';
    const nonHexChars = 'gjkmnpqrstuvwxyz';
    const allChars = hexChars + nonHexChars;

    let str = '';
    for (let i = 0; i < 16; i++) {
        str += hexChars[Math.floor(Math.random() * hexChars.length)];
    }

    const pattern = [
        { chars: hexChars, length: 1 },
        { chars: nonHexChars, length: 3 },
        { chars: allChars, length: 4 },
        { chars: hexChars, length: 2 }
    ];

    pattern.forEach(section => {
        for (let i = 0; i < section.length; i++) {
            str += section.chars[Math.floor(Math.random() * section.chars.length)];
        }
    });

    const lastPart = () => {
        let part = hexChars.substr(Math.floor(Math.random() * 6), 1);
        part += Math.floor(Math.random() * 10);
        part += Array(4).fill(Math.floor(Math.random() * 10)).join('');
        part += Array(4).fill(part[part.length - 1]).join('');
        return part;
    };

    str += lastPart().substr(0, 16);
    return str.substr(0, 32);
}

const ApiKeys = generateSimilarString();
const RETRY_DELAY_MS = 3000;

const ytdl = {
    request: async (url, format, quality) => {
        try {
            const encodedUrl = encodeURIComponent(url);

            // Audio
            if (format && SUPPORTED_AUDIO_FORMATS.includes(format)) {
                console.log(`[YTDL] Requesting audio: format=${format}, url=${url}`);
                const { data, status } = await axios.get(
                    `https://p.oceansaver.in/ajax/download.php?format=${format}&url=${encodedUrl}`
                );

                if (status !== 200 || !data || data.error) {
                    console.error(`[YTDL] Failed audio download:`, data?.error || 'Unknown error');
                    return null;
                }

                return data;

            // Video
            } else if (quality && SUPPORTED_VIDEO_QUALITIES[quality]) {
                console.log(`[YTDL] Requesting video: quality=${quality}, url=${url}`);
                const { data, status } = await axios.get(
                    `https://p.oceansaver.in/ajax/download.php?copyright=0&format=${SUPPORTED_VIDEO_QUALITIES[quality]}&url=${encodedUrl}&api=${ApiKeys}`
                );

                if (status !== 200 || !data || data.error) {
                    console.error(`[YTDL] Failed video download:`, data?.error || 'Unknown error');
                    return null;
                }

                return data;
            }

            console.error('[YTDL] Invalid format or quality');
            return null;

        } catch (error) {
            console.error(`[YTDL] Error in request: ${error.message}`);
            return null;
        }
    },

    convert: async (taskId) => {
        try {
            const { data } = await axios.get(
                `https://p.oceansaver.in/ajax/progress.php?id=${taskId}`
            );
            return data;
        } catch (error) {
            console.error(`[YTDL] Error in convert: ${error.message}`);
            return null;
        }
    },

    repeatRequest: async (taskId) => {
        while (true) {
            const response = await ytdl.convert(taskId);
            if (response && response.download_url) {
                return { videoLinks: response.download_url };
            }
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
    },

    requestWithRetry: async (url, format, quality) => {
        let attempt = 1;
        while (true) {
            const response = await ytdl.request(url, format, quality);
            if (response && response.id) {
                return response;
            }
            console.warn(`[YTDL] Attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS / 1000}s...`);
            attempt++;
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
};

// Endpoint utama
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
    const isAudio = SUPPORTED_AUDIO_FORMATS.includes(normalizedFormat);
    const isVideo = quality && SUPPORTED_VIDEO_QUALITIES[quality];

    if (!isAudio && !isVideo) {
        return res.status(400).json({
            status: 400,
            author: 'Yudzxml',
            error: 'Format audio atau kualitas video tidak valid.'
        });
    }

    try {
        const response = await ytdl.requestWithRetry(url, normalizedFormat, quality);

        const downloadLink = await ytdl.repeatRequest(response.id);

        return res.status(200).json({
            status: 200,
            author: 'Yudzxml',
            data: {
               downloadUrl: downloadLink.videoLinks
            }
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
import express from 'express';
import yts from 'yt-search';

const router = express.Router();

const searchYouTube = async (query) => {
    try {
        const results = await yts({ query });
        if (results && results.videos.length > 0) {
            const video = results.videos[0];
            return {
                title: video.title,
                videoUrl: video.url,
                thumbnailUrl: video.thumbnail,
                duration: video.duration,
                views: video.views,
            };
        } else {
            throw new Error('No videos found.');
        }
    } catch (error) {
        console.error(`[YTS] Error while searching for video: ${error.message}`);
        throw error;
    }
};

const getVideoMetadataFromUrl = async (url) => {
    try {
        const videoId = url.split('v=')[1]?.split('&')[0];
        if (!videoId) throw new Error('Invalid YouTube URL.');
        const results = await yts({ query: videoId });
        if (results && results.videos.length > 0) {
            const video = results.videos[0];
            return {
                title: video.title,
                videoUrl: video.url,
                thumbnailUrl: video.thumbnail,
                duration: video.duration,
                views: video.views,
            };
        } else {
            throw new Error('Video not found.');
        }
    } catch (error) {
        console.error(`[YTS] Error while extracting video metadata from URL: ${error.message}`);
        throw error;
    }
};

router.get('/', async (req, res) => {
    const { query, url } = req.query;

    if (!query && !url) {
        return res.status(400).json({
            status: 400,
            author: 'Yudzxml',
            error: 'Parameter "query" atau "url" harus disertakan.',
        });
    }

    try {
        const videoData = url
            ? await getVideoMetadataFromUrl(url)
            : await searchYouTube(query);

        if (videoData) {
            return res.status(200).json({
                status: 200,
                author: 'Yudzxml',
                data: videoData,
            });
        } else {
            return res.status(404).json({
                status: 404,
                author: 'Yudzxml',
                error: 'Video tidak ditemukan.',
            });
        }
    } catch (err) {
        console.error('[YTS] Fatal error:', err.message);
        return res.status(500).json({
            status: 500,
            author: 'Yudzxml',
            error: err.message || 'Terjadi kesalahan internal.',
        });
    }
});

export default router;
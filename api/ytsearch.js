import express from 'express'; import yts from 'yt-search';

const router = express.Router();

const parseYouTubeUrl = (urlString) => { try { const url = new URL(urlString); const host = url.hostname.replace('www.', ''); const path = url.pathname;

if (host === 'youtu.be') {
  return { type: 'video', id: path.slice(1) };
}

if (path.startsWith('/embed/')) {
  return { type: 'video', id: path.split('/embed/')[1] };
}

if (path.startsWith('/shorts/')) {
  return { type: 'video', id: path.split('/shorts/')[1] };
}

if (url.searchParams.has('list') && !url.searchParams.has('v')) {
  return { type: 'playlist', id: url.searchParams.get('list') };
}

if (path === '/watch' && url.searchParams.has('v')) {
  return { type: 'video', id: url.searchParams.get('v') };
}

if (path.startsWith('/channel/') || path.startsWith('/c/') || path.startsWith('/user/')) {
  return { type: 'channel', id: path.split('/')[2] };
}

return { type: null, id: null };

} catch { return { type: null, id: null }; } };

const fetchVideoById = async (videoId) => { const res = await yts({ query: videoId }); if (!res?.videos?.length) throw new Error('Video not found.'); const v = res.videos[0]; return { title: v.title, videoUrl: v.url, thumbnailUrl: v.thumbnail, duration: v.duration, views: v.views, }; };

const fetchChannelUploads = async (channelId) => { const res = await yts({ query: channel:${channelId} }); if (!res?.videos?.length) throw new Error('Channel or uploads not found.'); return res.videos.slice(0, 5).map(v => ({ title: v.title, videoUrl: v.url, thumbnailUrl: v.thumbnail, duration: v.duration, views: v.views, })); };

const searchYouTube = async (query) => { const res = await yts({ query }); if (!res?.videos?.length) throw new Error('No videos found.'); const v = res.videos[0]; return { title: v.title, videoUrl: v.url, thumbnailUrl: v.thumbnail, duration: v.duration, views: v.views, }; };

router.get('/', async (req, res) => { const { url, query } = req.query;

if (!url && !query) { return res.status(400).json({ status: 400, author: 'Yudzxml', error: 'Parameter "query" atau "url" harus disertakan.', }); }

try { let data;

if (url) {
  const { type, id } = parseYouTubeUrl(url);
  if (!type) throw new Error('Invalid YouTube URL.');

  if (type === 'video') {
    data = await fetchVideoById(id);
  } else if (type === 'playlist') {
    throw new Error('Playlist fetching is not supported.');
  } else if (type === 'channel') {
    data = { uploads: await fetchChannelUploads(id) };
  }
} else {
  data = await searchYouTube(query);
}

return res.status(200).json({
  status: 200,
  author: 'Yudzxml',
  data,
});

} catch (err) { console.error('[YTS] Fatal error:', err.message); const isNotFound = ['Video not found.', 'No videos found.', 'Channel or uploads not found.'].includes(err.message); return res.status(isNotFound ? 404 : 500).json({ status: isNotFound ? 404 : 500, author: 'Yudzxml', error: err.message, }); } });

export default router;


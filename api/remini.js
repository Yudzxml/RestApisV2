const express = require('express');
const router = express.Router();
const axios = require('axios');
const { fromBuffer } = require('file-type');
const qs = require('qs');

const tool = ['removebg', 'enhance', 'upscale', 'restore', 'colorize'];

const pxpic = {
  upload: async (buffer, mime) => {
    const fileName = Date.now() + '.' + mime.split('/')[1];
    const folder = "uploads";

    const responsej = await axios.post("https://pxpic.com/getSignedUrl", { folder, fileName }, {
      headers: { "Content-Type": "application/json" },
    });

    const { presignedUrl } = responsej.data;

    await axios.put(presignedUrl, buffer, {
      headers: { "Content-Type": mime },
    });

    const cdnDomain = "https://files.fotoenhancer.com/uploads/";
    return cdnDomain + fileName;
  },

  create: async (url, tools) => {
    if (!tool.includes(tools)) {
      return { status: 400, error: `Pilih salah satu dari tools ini: ${tool.join(', ')}` };
    }

    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const contentType = response.headers['content-type'];
      if (!contentType.startsWith('image/')) throw new Error('URL tidak mengarah ke gambar yang valid.');

      const buffer = Buffer.from(response.data);
      const { mime } = await fromBuffer(buffer) || {};
      if (!mime) throw new Error('Tipe gambar tidak dapat ditentukan.');

      const imageUrl = await pxpic.upload(buffer, mime);

      const data = qs.stringify({
        imageUrl,
        targetFormat: 'png',
        needCompress: 'no',
        imageQuality: '100',
        compressLevel: '6',
        fileOriginalExtension: mime.split('/')[1],
        aiFunction: tools,
        upscalingLevel: ''
      });

      const config = {
        method: 'POST',
        url: 'https://pxpic.com/callAiFunction',
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': '*/*',
          'Content-Type': 'application/x-www-form-urlencoded',
          'accept-language': 'id-ID'
        },
        data
      };

      const api = await axios.request(config);
      return { status: 200, author: 'Yudzxml', data: api.data };

    } catch (err) {
      return { status: 400, error: err.message };
    }
  }
};

router.get('/', async (req, res) => {
  const { url, tools } = req.query;
  if (!url) return res.status(400).json({ error: 'URL tidak valid. Pastikan URL yang diberikan benar!' });

  const result = await pxpic.create(url, tools);
  res.status(result.status || 500).json(result);
});

module.exports = router;

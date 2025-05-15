import express from 'express';
import axios from 'axios';
import qs from 'qs';
import { fromBuffer } from 'file-type';

const router = express.Router();
const tool = ['removebg', 'enhance', 'upscale', 'restore', 'colorize'];

const pxpic = {
  upload: async (buffer, mime) => {
    const fileName = Date.now() + '.' + mime.split('/')[1];
    const folder = "uploads";

    const responsej = await axios.post("https://pxpic.com/getSignedUrl", { folder, fileName }, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const { presignedUrl } = responsej.data;

    await axios.put(presignedUrl, buffer, {
      headers: {
        "Content-Type": mime,
      },
    });

    const cdnDomain = "https://files.fotoenhancer.com/uploads/";
    const sourceFileUrl = cdnDomain + fileName;

    return sourceFileUrl;
  },
  create: async (url, tools) => {
    if (!tool.includes(tools)) {
      return { status: 400, error: `Pilih salah satu dari tools ini: ${tool.join(', ')}` };
    }

    try {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const contentType = response.headers['content-type'];

      if (!contentType.startsWith('image/')) {
        throw new Error('URL tidak mengarah ke gambar yang valid.');
      }

      const buffer = Buffer.from(response.data);
      const { mime } = await fromBuffer(buffer) || {};

      if (!mime) {
        throw new Error('Tipe gambar tidak dapat ditentukan.');
      }

      const imageUrl = await pxpic.upload(buffer, mime);

      let data = qs.stringify({
        'imageUrl': imageUrl,
        'targetFormat': 'png',
        'needCompress': 'no',
        'imageQuality': '100',
        'compressLevel': '6',
        'fileOriginalExtension': mime.split('/')[1],
        'aiFunction': tools,
        'upscalingLevel': ''
      });

      let config = {
        method: 'POST',
        url: 'https://pxpic.com/callAiFunction',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
          'Accept': '*/*',
          'Content-Type': 'application/x-www-form-urlencoded',
          'accept-language': 'id-ID'
        },
        data: data
      };

      const api = await axios.request(config);
      return { 
        status: 200,
        author: 'Yudzxml',
        data: api.data
      };
    } catch (err) {
      return { status: 400, error: err.message };
    }
  }
}

router.get('/', async (req, res) => {
  const { url, tools } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL tidak valid. Pastikan URL yang diberikan benar!' });
  }

  const result = await pxpic.create(url, tools);
  res.status(result.status).json(result);
});

export default router;
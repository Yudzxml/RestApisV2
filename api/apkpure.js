import axios from "axios";
import * as cheerio from "cheerio";
import express from "express";
const router = express.Router();

const HEADERS = {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'referer': 'https://www.google.com/',
        'sec-ch-ua': '"Google Chrome";v="116", "Not;A=Brand";v="24", "Chromium";v="116"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
      };

const apkpure = {
  async search(query) {
    const url = `https://apkpure.net/search?q=${encodeURIComponent(query)}`;
    try {
      const response = await axios.get(url, { headers: HEADERS });
      const html = response.data;
      const $ = cheerio.load(html);
      const results = [];

      $(".search-brand-container").each((_, el) => {
        const title = $(el).find(".title-wrap a.top").attr("title")?.trim() || null;
        const linkPath = $(el).find(".title-wrap a.top").attr("href") || "";
        const link = linkPath.startsWith("http") ? linkPath : `https://apkpure.net${linkPath}`;
        const icon = $(el).find("img.app-icon-img").attr("data-original") || null;
        const developer = $(el).find(".developer").text().trim() || null;
        const updated = $(el).find(".time").text().trim() || null;
        const rating = $(el).find(".stars").first().text().trim() || null;
        const size = $(el).find('li[data-dt-desc="FileSize"] .head').text().trim() || null;
        const android = $(el).find('li[data-dt-desc="AndroidOS"] .head').text().trim() || null;
        const downloadPath = $(el).find(".brand-bottom a").attr("href");
        const download = downloadPath ? `https://apkpure.net${downloadPath}` : null;

        results.push({ title, developer, icon, link, rating, size, android, updated, download });
      });

      const terkait = [];
      $(".apk-list .apk-item").each((_, el) => {
        const title = $(el).attr("title") || null;
        const pkg = $(el).attr("data-dt-pkg") || null;
        const linkPath = $(el).attr("href") || "";
        const link = linkPath.startsWith("http") ? linkPath : `https://apkpure.net${linkPath}`;
        const icon = $(el).find("img").attr("data-original") || null;
        const developer = $(el).find(".dev").text().trim() || null;
        const rating = $(el).find(".stars").text().trim() || null;
        terkait.push({ title, package: pkg, icon, developer, rating, link });
      });

      return { results, terkait };
    } catch (error) {
      return {
        status: 500,
        error: error.message || "Terjadi kesalahan tak terduga saat memuat data dari ApkPure."
      };
    }
  },

  async detail(url) {
    try {
      const response = await axios.get(url, { headers: HEADERS });
      const html = response.data;
      const $ = cheerio.load(html);

      const download = $("a.download_apk");
      const downloadTitle = download.attr("title")?.trim() || null;
      const downloadUrl = download.attr("href")?.trim() || null;
      const shortDesc = $(".description-short").text().trim() || null;
      const lastUpdated = $(".whats-new-timer").text().trim() || null;
      const whatsNew = $(".whats-new-content").text().trim() || null;

      const screenshots = [];
      $(".screen-swiper-list .swiper-item a.screen-pswp img").each((_, el) => {
        const img = $(el).attr("data-original");
        if (img) screenshots.push(img);
      });

      return {
        title: downloadTitle,
        download_url: downloadUrl,
        description: shortDesc,
        last_updated: lastUpdated,
        whats_new: whatsNew,
        screenshots,
      };
    } catch (error) {
      return {
        status: 500,
        error: error.message || "Terjadi kesalahan tak terduga saat memuat detail aplikasi."
      };
    }
  },

  async detailapk(url) {
    try {
      const response = await axios.get(url, { headers: HEADERS });
      const html = response.data;
      const $ = cheerio.load(html);
      const result = {};

      const title = $("a.btn.download-start-btn").attr("title") || $(".title").first().text().trim();
      const versionText = $(".version-tips").text().trim();
      const latestVersion = versionText.match(/([\d.]+)/)?.[1] || null;
      const mainDownload = $("a.btn.download-start-btn").attr("href");
      const packageName = mainDownload?.match(/b\/APK\/([^?]+)/)?.[1]?.split("?")[0] || null;

      const versions = [];
      $(".version-item").each((_, el) => {
        const version = $(el).find(".version-info a").text().trim();
        const href = $(el).find(".version-info a").attr("href");
        const size = $(el).find(".size").text().trim();
        const date = $(el).find(".update").text().trim();
        if (href) versions.push({ version, size, date, href });
      });

      const allVersionsLink = $("a.more-version").attr("href");

      result.name = title || null;
      result.package = packageName || null;
      result.latest_version = latestVersion;
      result.download_url = mainDownload
        ? mainDownload.startsWith("http")
          ? mainDownload
          : `https://d.apkpure.net${mainDownload}`
        : null;
      result.all_versions = versions;
      result.all_versions_link = allVersionsLink
        ? `https://apkpure.net${allVersionsLink}`
        : null;

      return result;
    } catch (error) {
      return {
        status: 500,
        error: error.message || "Terjadi kesalahan tak terduga saat memuat detail aplikasi."
      };
    }
  },

  async download(url) {
    try {
      const res = await axios.get(url, {
        headers: HEADERS,
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 200
      });
      const location = res.headers.location;
      return { downloadUrl: location };
    } catch (error) {
      return {
        status: 500,
        error: error.message || "Gagal mendapatkan link unduhan dari ApkPure."
      };
    }
  }
};

router.get("/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Parameter 'q' wajib diisi" });

  try {
    const data = await apkpure.search(q);
    res.status(200).json({
      status: 200,
      author: "Yudzxml",
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Gagal memuat data pencarian.",
    });
  }
});

// 📄 Detail aplikasi utama (halaman app)
router.get("/detail", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Parameter 'url' wajib diisi" });

  try {
    const data = await apkpure.detail(url);
    res.status(200).json({
      status: 200,
      author: "Yudzxml",
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Gagal memuat detail aplikasi.",
    });
  }
});

// 🧩 Detail versi file APK (halaman download)
router.get("/detailapk", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Parameter 'url' wajib diisi" });

  try {
    const data = await apkpure.detailapk(url);
    res.status(200).json({
      status: 200,
      author: "Yudzxml",
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Gagal memuat detail versi APK.",
    });
  }
});

// ⬇️ Dapatkan link download langsung
router.get("/download", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Parameter 'url' wajib diisi" });

  try {
    const data = await apkpure.download(url);
    res.status(200).json({
      status: 200,
      author: "Yudzxml",
      data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Gagal mendapatkan link unduhan.",
    });
  }
});

export default router;
import express from "express";
import FormData from "form-data";
const router = express.Router();
const btoa = (str) => Buffer.from(str, "utf8").toString("base64");

function encodeBase64(obj) {
  const json = JSON.stringify(obj);
  const urlEncoded = encodeURIComponent(json);
  return btoa(urlEncoded);
}

function generateFileId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function getLinkDownload(trackUrl) {
  try {
    const token = generateFileId();
    const form = new FormData();
    form.append("post_id", "25");
    form.append("form_id", "45dddc7");
    form.append("referer_title", "Free Spotify Music Downloads - SpotiDownloads");
    form.append("queried_id", "25");
    form.append("form_fields[music_url]", trackUrl);
    form.append("action", "elementor_pro_forms_send_form");
    form.append("referrer", `https://spotidownloads.com/downloads/?file=${token}`);

    const response = await fetch("https://spotidownloads.com/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "cache-control": "no-cache",
        pragma: "no-cache",
        "x-requested-with": "XMLHttpRequest",
        referer: `https://spotidownloads.com/downloads/?file=${token}`,
        "referrer-policy": "strict-origin-when-cross-origin",
      },
      body: form,
    });

    const rawCookie = response.headers.get("set-cookie");
    const cookie = rawCookie ? rawCookie.split(";")[0] : null;

    const resPonSe = await response.json();
    const redirectUrl = resPonSe.data.data["1"].redirect_url;
    const afterEqual = redirectUrl.split("=").pop();

    return { uuid: afterEqual, cookie };
  } catch (err) {
    throw new Error(`Gagal request: ${err.message}`);
  }
}

async function downloadMusic(spoUrl) {
  if (!spoUrl) throw new Error("Spotify URL kosong");

  const { uuid, cookie } = await getLinkDownload(spoUrl);

  const api = await (
    await fetch(`https://yydz.my.id/api/spotify?url=${spoUrl}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 11; CPH2209) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
        Accept: "application/json",
      },
    })
  ).json();

  const resultSearch = api.data[0];
  const buffer = encodeBase64(resultSearch);

  const url = `https://spotidownloads.com/wp-admin/admin-ajax.php?action=process_music_download&data=${buffer}`;
  const headers = {
    accept: "*/*",
    "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    "cache-control": "no-cache",
    pragma: "no-cache",
    Referer: `https://spotidownloads.com/download/?file=${uuid}`,
    cookie,
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };

  try {
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    throw new Error("❌ Download failed: " + err.message);
  }
}

// 🎵 Router GET
router.get("/", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "URL tidak valid. Pastikan URL Spotify ada!" });
  }

  try {
    const buffer = await downloadMusic(url);
    if (!buffer) return res.status(500).json({ error: "Gagal ambil file musik" });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Disposition", "attachment; filename=spotify.mp3");
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
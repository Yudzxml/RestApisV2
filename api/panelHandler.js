import express from 'express';
import axios from 'axios';

const router = express.Router();

const PANEL_DOMAIN = process.env.PANEL_DOMAIN;
const PANEL_API_KEY = process.env.PANEL_API_KEY;
const ALLOWED_DOMAIN = (process.env.ALLOWED_DOMAIN || '').split(',').map(o => o.trim()).filter(Boolean);
function onlyFromAllowedOrigins(req, res, next) {
  const origin = req.get('Origin') || req.get('Referer') || '';
  if (ALLOWED_DOMAIN.length === 0) return next();
  const isAllowed = ALLOWED_DOMAIN.some(allowed => origin === allowed || origin.startsWith(allowed));
  if (isAllowed) {
    return next();
  }
  return res.status(403).json({ error: 'Access forbidden: invalid origin' });
}

const ramConfig = {
  '1gb': { ram: '1125', disk: '1125', cpu: '40' },
  '2gb': { ram: '2125', disk: '2125', cpu: '60' },
  '3gb': { ram: '3125', disk: '3125', cpu: '80' },
  '4gb': { ram: '4125', disk: '4125', cpu: '100' },
  '5gb': { ram: '5125', disk: '5125', cpu: '120' },
  '6gb': { ram: '6125', disk: '6125', cpu: '140' },
  '7gb': { ram: '7125', disk: '7125', cpu: '160' },
  '8gb': { ram: '8125', disk: '8125', cpu: '180' },
  '9gb': { ram: '9125', disk: '9125', cpu: '200' },
  '10gb': { ram: '10125', disk: '10125', cpu: '220' },
  'unli': { ram: '0', disk: '0', cpu: '0' }
};

function formatTanggal(date) {
  const bulanNama = [
    'JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI',
    'JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER'
  ];
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  return `${day} - ${bulanNama[month]} - ${year}`;
}

router.post(
  '/create-panel',
  onlyFromAllowedOrigins,
  async (req, res) => {
    try {
      const { ram, username, password } = req.body;
      if (!ram || !username || !password) {
        return res.status(400).json({ error: 'Field tidak lengkap' });
      }

      const config = ramConfig[ram.toLowerCase()];
      if (!config) {
        return res.status(400).json({ error: 'Paket RAM tidak valid' });
      }

      const email = `${username}@gmail.com`;

      const userRes = await axios.post(
        `${PANEL_DOMAIN}/api/application/users`,
        { email, username, first_name: username, last_name: username, language: 'en', password },
        { headers: { Authorization: `Bearer ${PANEL_API_KEY}`, Accept: 'application/json', 'Content-Type': 'application/json' } }
      );
      const userId = userRes.data.attributes.id;

      const eggRes = await axios.get(
        `${PANEL_DOMAIN}/api/application/nests/5/eggs/15`,
        { headers: { Authorization: `Bearer ${PANEL_API_KEY}`, Accept: 'application/json' } }
      );
const today = new Date();
const expDate = new Date(today);
expDate.setDate(expDate.getDate() + 30);
const day   = String(expDate.getDate()).padStart(2, '0');
const month = expDate.toLocaleString('default', { month: 'short' }).toUpperCase(); 
const year  = expDate.getFullYear();
const formattedExp = `${day} ${month} ${year}`;
const descriptionText = `EXP ${formattedExp}`;
const serverRes = await axios.post(
  `${PANEL_DOMAIN}/api/application/servers`,
  {
    name: username,
    description: descriptionText,
    user: userId,
    egg: 15,
    docker_image: 'ghcr.io/parkervcp/yolks:nodejs_18',
    startup: eggRes.data.attributes.startup,
    environment: {
      INST: 'npm',
      USER_UPLOAD: '0',
      AUTO_UPDATE: '0',
      CMD_RUN: 'npm start'
    },
    limits: {
      memory: config.ram,
      swap: 0,
      disk: config.disk,
      io: 500,
      cpu: config.cpu
    },
    feature_limits: {
      databases: 0,
      backups: 0,
      allocations: 0
    },
    deploy: {
      locations: [1],
      dedicated_ip: false,
      port_range: []
    }
  },
  {
    headers: {
      Authorization: `Bearer ${PANEL_API_KEY}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  }
);

      const createdAtFormatted = formatTanggal(new Date());

      return res.json({
        success: true,
        loginUrl: PANEL_DOMAIN,
        username,
        email,
        password,
        userId,
        serverId: serverRes.data.attributes.id,
        ram: config.ram,
        disk: config.disk,
        cpu: config.cpu,
        createdAt: createdAtFormatted
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
);

router.post('/delete-panel', async (req, res) => {
  try {
    const { userId, serverId } = req.body;
    if (!userId || !serverId) {
      return res.status(400).json({ error: 'Field tidak lengkap' });
    }

    await axios.delete(
      `${PANEL_DOMAIN}/api/application/servers/${serverId}`,
      { headers: { Authorization: `Bearer ${PANEL_API_KEY}`, Accept: 'application/json' } }
    );

    await axios.delete(
      `${PANEL_DOMAIN}/api/application/users/${userId}`,
      { headers: { Authorization: `Bearer ${PANEL_API_KEY}`, Accept: 'application/json' } }
    );

    return res.json({ success: true, message: 'Panel berhasil dihapus' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${PANEL_DOMAIN}/api/application/users`, {
      headers: { Authorization: `Bearer ${PANEL_API_KEY}` }
    });

    return res.json({ active: true, maintenance: false });
  } catch (error) {
    return res.json({ active: false, maintenance: true });
  }
});

export default router;
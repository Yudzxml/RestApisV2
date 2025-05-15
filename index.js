import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const loadRoutes = async () => {
  const apiDir = path.join(__dirname, 'api');
  const files = fs.readdirSync(apiDir);

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const routeName = file.replace('.js', '');
    const routePath = `/api/${routeName}`;
    const { default: routeModule } = await import(`./api/${file}`);
    app.use(routePath, routeModule);
  }
};

app.get('/', (req, res) => {
  res.send('Multi API Server Aktif (ESM)');
});

loadRoutes().then(() => {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Gagal load API routes:', err);
});
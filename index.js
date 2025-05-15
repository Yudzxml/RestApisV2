const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

fs.readdirSync(path.join(__dirname, 'api')).forEach((file) => {
  const routeName = file.replace('.js', '');
  const routePath = `/api/${routeName}`;
  const routeModule = require(`./api/${file}`);
  app.use(routePath, routeModule);
});

app.get('/', (req, res) => {
  res.send('Multi API Server Aktif');
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});

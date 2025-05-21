# Gunakan image Node.js LTS
FROM node:18

# Set direktori kerja dalam container
WORKDIR /app

# Salin file dependency definition
COPY package*.json ./

# Install dependencies
RUN npm install

# Salin seluruh project ke container
COPY . .

# Pastikan port sesuai
EXPOSE 3000

# Jalankan dengan mode module
CMD ["node", "index.js"]
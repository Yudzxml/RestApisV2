import express from 'express';
import multer from 'multer';
import JavaScriptObfuscator from 'javascript-obfuscator';

const router = express.Router();
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 } 
});

const sendJson = (res, status, data) => {
  res.status(status).json({
    status,
    author: 'Yudzxml',
    data
  });
};

router.get('/', (req, res) => {
  const code = req.query.code;
  if (!code || typeof code !== 'string' || code.trim() === '') {
    return sendJson(res, 400, { error: 'Query parameter "code" is required and must be non-empty text.' });
  }

  try {
    const obfuscationOptions = {
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: true,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
    };
    const result = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
    const obfCode = result.getObfuscatedCode();
    return sendJson(res, 200, { code: obfCode });
  } catch (err) {
    console.error('[Obfuscator GET] Error:', err.message);
    return sendJson(res, 500, { error: 'Error during obfuscation: ' + err.message });
  }
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file || !req.file.buffer) {
    return sendJson(res, 400, { error: 'No file uploaded. Please attach a JavaScript file under field name "file".' });
  }

  const code = req.file.buffer.toString('utf-8');
  if (code.trim() === '') {
    return sendJson(res, 400, { error: 'Uploaded file is empty or invalid.' });
  }

  try {
    const obfuscationOptions = {
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: true,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
    };
    const result = JavaScriptObfuscator.obfuscate(code, obfuscationOptions);
    const obfCode = result.getObfuscatedCode();
    return sendJson(res, 200, { code: obfCode });
  } catch (err) {
    console.error('[Obfuscator POST] Error:', err.message);
    return sendJson(res, 500, { error: 'Error during obfuscation: ' + err.message });
  }
});

// handle multer file size limit errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return sendJson(res, 400, { error: 'File too large. Maximum size is 5MB.' });
  }
  next(err);
});

export default router;

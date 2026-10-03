const express = require('express');
const { analyzeRepository, explain, chat, generateReadme } = require('../controller/analyzeController');

const router = express.Router();

router.post('/analyze', analyzeRepository);
router.post('/explain', explain);
router.post('/chat', chat);
router.post('/readme', generateReadme);

module.exports = router;


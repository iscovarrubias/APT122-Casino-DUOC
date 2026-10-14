const express = require('express');
const { login, yo, loginDuoc, configPublica } = require('../controllers/auth.controller');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/duoc', loginDuoc);
router.get('/config', configPublica);
router.get('/yo', autenticar, yo);

module.exports = router;

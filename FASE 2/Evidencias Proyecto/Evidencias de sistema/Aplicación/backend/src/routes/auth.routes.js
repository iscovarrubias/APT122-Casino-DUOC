const express = require('express');
const { login, yo } = require('../controllers/auth.controller');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/yo', autenticar, yo);

module.exports = router;

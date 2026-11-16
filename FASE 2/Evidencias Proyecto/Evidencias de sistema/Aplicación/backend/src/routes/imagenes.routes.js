const express = require('express');
const controller = require('../controllers/imagenes.controller');
const router = express.Router();

router.get('/:id', controller.ver);

module.exports = router;

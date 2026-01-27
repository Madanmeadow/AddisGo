const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlist.controller');

router.post('/request', waitlistController.requestAccess);

module.exports = router;

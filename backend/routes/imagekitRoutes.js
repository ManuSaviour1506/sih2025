const express = require('express');
const ImageKit = require('imagekit');
const router = express.Router();
require('dotenv').config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

router.get('/auth', (req, res) => {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    res.status(200).json(authenticationParameters);
  } catch (error) {
    console.error('Error generating ImageKit auth parameters:', error);
    res.status(500).json({ msg: 'Server error generating auth parameters.' });
  }
});

module.exports = router;
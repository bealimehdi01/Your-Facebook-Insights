const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const app = require('./index.js');  // Import your existing Express app

const PORT = process.env.PORT || 3001;

// Certificate setup for local HTTPS
const certOptions = {
    key: fs.readFileSync(path.resolve(__dirname, 'certs/key.pem')),
    cert: fs.readFileSync(path.resolve(__dirname, 'certs/cert.pem'))
};

https.createServer(certOptions, app).listen(PORT, () => {
    console.log(`Server running on https://localhost:${PORT}`);
});

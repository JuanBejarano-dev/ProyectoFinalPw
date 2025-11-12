const express = require('express');
const connection = require('./database');
const path = require('path');
const{ connect } = require('http2');
const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'FrontEnd')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'FrontEnd', 'index.html'));
});

app.listen(3000, () => {
    console.log('El servidor está corriendo en el puerto 3000');
});




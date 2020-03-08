const https = require('https');
const fs = require('fs');

const options = {
    cert: fs.readFileSync('localhost.cert'),
    key: fs.readFileSync('localhost.key')
};

module.exports = {
    start: function () {
        https.createServer(options, (req, res) => {
            res.writeHead(200);
            //TODO: Write main page
            res.end('hello world\n');
        }).listen(443);
        console.log('Web server started.');
    }
};


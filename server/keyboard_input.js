const ReadLineInstance = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
});

ReadLineInstance.on("SIGINT", function () {
    process.emit("SIGINT");
});

module.exports = ReadLineInstance;
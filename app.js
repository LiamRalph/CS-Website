const pug = require("pug");
const express = require('express');


//Setup Express
const app = express();
app.use(express.static('public'))


require('./routes')(app);
app.set("view engine", "pug");
app.listen(3000);
console.log("Server listening at http://localhost:3000");

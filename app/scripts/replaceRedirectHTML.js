var fs = require('fs')
var redirectHTML = fs.readFileSync(__dirname + '/../public/redirect.html')
var swBase = fs.readFileSync(__dirname + '/../public/sw-base.js')
fs.writeFileSync(__dirname + '/../public/sw.js', swBase.toString().replace('REDIRECT_HTML', redirectHTML.toString()))

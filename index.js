//npm link @magaya/hyperion-express-middleware
const hyperion = require('@magaya/hyperion-express-middleware').middleware(process.argv, 'danfecloud');
const app = require('express')();
//const express = require('express');
const program = require('commander');
const fs = require('fs')
const packageJson = require('./package.json');
const path = require('path');
const api = require(path.join(__dirname, 'api/api'));
const tempDirectory = require('temp-dir');
app.use(hyperion);
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
program.version(packageJson.version)
    .option('-p, --port <n>', 'running port', parseInt)
    .option('-r, --root <value>', 'startup root for api')
    .option('-s, --service-name <value>', 'name for service')
    .option('-g, --gateway', 'dictates if we should be through gateway')
    .option('-i, --network-id <n>', 'magaya network id', parseInt)
    .option('--connection-string <value>', 'connection endpoint for database')
    .option('--no-daemon', 'pm2 no daemon option')
    .parse(process.argv);
app.get(`${program.root}/test`, function (request, response) {
    response.send('Conectado');
});
app.get(`${program.root}/danfe-pdf/:guid`, async (request, response) => {            
    var ret = await api.danfe_pdf(request.dbx, request.algorithm, request.params.guid, response, request);
    if (ret == "ok") {
        let filename = tempDirectory + '\\danfe-' + request.params.guid + '.pdf';
        var file = fs.createReadStream(filename);
        var stat = fs.statSync(filename);
            response.setHeader('Content-Length', stat.size);
            response.setHeader('Content-Type', 'application/pdf');
            file.pipe(response);
    }
    else {
        response.send('erro');
    }
});
app.get(`${program.root}/danfe-simplificado-pdf/:guid`, async (request, response) => {
    var ret = await api.danfe_simplificado_pdf(request.dbx, request.algorithm, request.params.guid, response, request);
    if (ret == "ok") {        
        let filename = tempDirectory + '\\danfe-simplificado-' + request.params.guid + '.pdf';
        var file = fs.createReadStream(filename);
        var stat = fs.statSync(filename);
            response.setHeader('Content-Length', stat.size);
            response.setHeader('Content-Type', 'application/pdf');
            file.pipe(response);
    }
    else {
        response.send('erro');
    }
});
app.get(`${program.root}/attachments`, async (request, response) => {
    var ret = await api.getCargoReleaseList(request.dbx);
    response.send(ret);
});
app.listen(program.port, () => {
    console.log(`Server started on port ${program.port}...`);
    console.log(`roots ${program.root}...`);
});    
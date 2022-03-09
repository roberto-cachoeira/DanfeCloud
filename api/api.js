const fs = require('fs')
const fetch = require('node-fetch');
const util = require('util');
const stream = require('stream');
const tempDirectory = require('temp-dir');
let Writable = stream.Writable || require('readable-stream').Writable;
let memStore = {};

function WMStrm(key, options) {
    // allow use without new operator
    if (!(this instanceof WMStrm)) {
        return new WMStrm(key, options);
    }
    Writable.call(this, options); // init super
    this.key = key; // save key
    memStore[key] = new Buffer(''); // empty
}
util.inherits(WMStrm, Writable);
WMStrm.prototype._write = function (chunk, enc, cb) {
    // our memory store stores things in buffers
    var buffer = (Buffer.isBuffer(chunk)) ?
        chunk :  // already is Buffer use it
        new Buffer(chunk, enc);  // string, convert

    // concat to the buffer already there
    memStore[this.key] = Buffer.concat([memStore[this.key], buffer]);
    cb();
};

module.exports = {
    saveCargoAttachment: async (CargoGuid, request, file) => {
        if (!file)
            return { success: false, error: 'Invalid file' };
        let filename = file.path;
        if (!fs.existsSync(filename))
            return { success: false, error: 'Invalid file' };
        const dbx = request.dbx; // hyperion namespaces
        const algorithm = request.algorithm; // hyperion algorithms
        const dbw = request.dbw; // hyperion write access
        const whrList = dbx.Warehousing.CargoRelease.ListByGuid;
        const whr = await algorithm.find(dbx.using(whrList).from(CargoGuid)).where(i => {
            return true;
        });
        if (!whr) {
            return { success: false, error: 'Cargo Release does not exist' };
        }
        try {
            let edited = dbx.edit(whr);
            let att = new request.dbx.DbClass.Attachment(filename);
            dbx.insert(edited.Attachments, att);
            await dbw.save(edited);
        }
        catch (ex) {
            return { success: false, error: 'Unexpected error' };
        }
        return { success: true };
    },
    danfe_simplificado_pdf: async (dbx, algorithm, guid, response, request) => {
        var attachment;
        let writeStream = new WMStrm('foo');
        var xml_conteudo;
        var retorno;
        if (dbx != null) {
            const cts = dbx.Warehousing.CargoRelease.ListByGuid;
            await algorithm.find(dbx.using(cts))
                .where(function (ct) {
                    if (ct.GUID == guid) {
                        const anexos = ct.Attachments;
                        dbx.using(anexos)
                            .iterate(function (anexo) {
                                if (anexo.Extension == 'xml')
                                    attachment = anexo;
                            });
                    }
                });
            if (!attachment) {
                response.end();
                return;
            }
            await algorithm.streamAttachmentContent(attachment, writeStream).then(_ => {
                writeStream.end();
            }).then(_ => {
                xml_conteudo = memStore.foo.toString();
            });
            await fetch('https://magaya-brazil.azure-api.net/danfe-simplificado/pdf',
                {
                    method: 'post',
                    body: xml_conteudo,
                    headers: {
                        'Content-Type': 'text/plain',
                        'Ocp-Apim-Subscription-Key': '019000f00b6b4fc9bf3d71fa5b498d0d'
                    }
                })
                .then(async response => {
                    var ret = await module.exports.geraPDF(guid, request, response, "danfe-simplificado");
                    if (ret == "ok") {
                        retorno = "ok";
                    } else {
                        retorno = "erro";
                    }
                })
        }
        return retorno;
    },
    danfe_pdf: async (dbx, algorithm, guid, response, request) => {
        var attachment;
        let writeStream = new WMStrm('foo');
        var xml_conteudo;
        var retorno;
        if (dbx != null) {
            const cts = dbx.Warehousing.CargoRelease.ListByGuid;
            await algorithm.find(dbx.using(cts))
                .where(function (ct) {
                    if (ct.GUID == guid) {
                        const anexos = ct.Attachments;
                        dbx.using(anexos)
                            .iterate(function (anexo) {
                                if (anexo.Extension == 'xml')
                                    attachment = anexo;
                            });
                    }
                });
            if (!attachment) {
                response.end();
                return;
            }
            await algorithm.streamAttachmentContent(attachment, writeStream).then(_ => {
                writeStream.end();
            }).then(_ => {
                xml_conteudo = memStore.foo.toString();
            });
            await fetch('https://magaya-brazil.azure-api.net/danfe/pdf',
                {
                    method: 'post',
                    body: xml_conteudo,
                    headers: {
                        'Content-Type': 'text/plain',
                        'Ocp-Apim-Subscription-Key': '019000f00b6b4fc9bf3d71fa5b498d0d'
                    }
                })
                .then(async response => {
                    var ret = await module.exports.geraPDF(guid, request, response, "danfe");
                    if (ret == "ok") {
                        retorno = "ok";
                    } else {
                        retorno = "erro";
                    }
                })
        }
        return retorno;
    },
    geraPDF: async (guid, request, response, name) => {
        return new Promise((resolve, reject) => {
            let filename = tempDirectory + '\\' + name + '-' + request.params.guid + '.pdf';
            var pdf = fs.createWriteStream(filename);
            var end_res = response.body.pipe(pdf);
            end_res.on("finish", async function () {
                //var strFile = fs.readFileSync(pdf.path, { encoding: 'base64' });
                var cargoAtt = await module.exports.saveCargoAttachment(guid, request, pdf);
                if (cargoAtt.success == true) {
                    resolve("ok");
                }
                else {
                    resolve("erro");
                }
            })
        });
    },
    //fica definido que o logo da nota será através do Attachment do Cliente que está no Cargo release. O nome da imagem tem que ser: logo
    getCustomerLogo: async (dbx, algorithm, guid, response) => {
        var attachment;
        if (dbx != null) {
            const cts = dbx.Warehousing.CargoRelease.ListByGuid;
            await algorithm.find(dbx.using(cts))
                .where(function (ct) {
                    if (ct.GUID == guid) {
                        const ctsCustomer = dbx.Entity.Customer.List;
                        //ct.ReleasedTo.GUID
                        dbx.using(ctsCustomer)
                            .iterate(function (cliente) {
                                if (cliente.GUID == ct.ReleasedTo.GUID) {
                                    const anexos = cliente.Attachments;
                                    dbx.using(anexos)
                                        .iterate(function (anexo) {
                                            if (anexo.Name.toUpperCase() == 'LOGO')
                                                attachment = anexo;

                                        });
                                }

                            });
                    }
                });
            if (!attachment) {
                response.end();
                return;
            }
            algorithm.streamAttachmentContent(attachment, response).then(_ => response.end());
        }
    },
    getCargoReleaseList: async (dbx) => {
        let result = [];
        if (dbx != null) {
            dbx.using(dbx.Warehousing.CargoRelease.ListByGuid)
                .iterate(function (model) {
                    if (model.Attachments.Count > 0) {
                        result.push({ Guid: model.GUID, Number: model.Number });
                    };
                });            
        }        
        return result;
    },
    //busca o LOGO que está cadastrado no MAGAYA (configuration)
    getCompanyInfo: async function (dbx) {
        return {
            name: dbx.Company.Name,
            networkId: dbx.Company.NetworkID
        };
    }
}

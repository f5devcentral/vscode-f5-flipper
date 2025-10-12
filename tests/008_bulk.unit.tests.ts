// import fast from '@f5devcentral/f5-fast-core';
import assert from 'assert';
// import { fstat, readFileSync } from 'fs';
// import path from 'path';
// import yaml from 'js-yaml'; // Add this import for YAML parsing
// const jsdom = require("jsdom");
// const { JSDOM } = jsdom;
// import { JSONEditor } from '@json-editor/json-editor'


const events = [];
const parsedFileEvents: any[] = []
const parsedObjEvents: any[] = []

// log test file name - makes it easier for troubleshooting
console.log('----------------------------------------------------------');
console.log('---------- file:', __filename);

// todo:  revisit bulk/afton conversion 

describe('fast tests', function () {

    before(async function () {

        // clear the events arrays
        parsedFileEvents.length = 0
        parsedObjEvents.length = 0

    });

    afterEach(function () {
        events.length = 0;
    })



    it(`afton render`, async () => {


        // const localPath = path.join(__dirname, '..', 'templates');

        // const provider = new fast.FsTemplateProvider(localPath)
        // provider.invalidateCache();

        // console.log('localPath', localPath)

        // const templateOriginal = readFileSync(path.join(localPath, 'ns', 'http.yaml'), "utf-8");
        // const templateJson = yaml.load(templateOriginal); // Convert YAML to JSON
        // const templateSchema = templateJson;
        
        // const resp = await provider.fetch('ns/http')
        //     .then((template) => {
        //         // get the schema for the template
        //         const schema = template.getParametersSchema();
        //         // get the default values for the template
        //         const defaultParams = template.getCombinedParameters();
        //         const html = fast.guiUtils.generateHtmlPreview(schema, defaultParams)

        //         // const element = document.getElementById('editor_holder');
        //         // const defaults = { "virtual_port": "443", "tenant_name": "starlord_offload_lb_vs", "app_name": "starlord_offload_lb_vs", "virtual_address": "192.168.86.142", "pool_members": [{ "serverAddress": "1.2.3.5", "servicePort": "80" }, { "serverAddress": "1.2.3.4", "servicePort": "80" }] };

        //         // const editor = new JSONEditor(element, {
        //         //     schema,
        //         //     startval: defaults,
        //         //     compact: true,
        //         //     show_errors: 'always',
        //         //     disable_edit_json: true,
        //         //     disable_properties: true,
        //         //     disable_collapse: true,
        //         //     array_controls_top: true,
        //         //     theme: 'bootstrap4'
        //         // });

        //         // const dom = new JSDOM(html, { runScripts: "dangerously" });

        //         // const x = dom.window.document.getElementById('editor');


        //         // const win = dom.window;
        //         // const document = win.document
        //         // // const y = x.getValue();
        //         // const y = x.innerHTML;
        //         // document.addEventListener('load', () => {
        //         //     const b = document.getElementsByTagName('body').innerHTML;
        //         //     b;
        //         // });
        //         // dom;
        //         // html;
        //         return { schema, defaultParams }
        //     })
        //     .catch(e => {
        //         console.log(e);
        //     })

        assert.ok('resp');
    })

    // <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js" integrity="sha384-DfXdz2htPH0lsSSs5nCTpuj/zy4C+OGpamoFVy38MVBnE+IbbVYUew+OrCXaRkfj" crossorigin="anonymous"></script>
    // <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-ho+j7jyWK8fNQe+A12Hb8AhRq26LrZ/JpcUGGOn+Y7RsweNrtN/tE3MoK7ZeZDyx" crossorigin="anonymous"></script>

    const html = `
    <script src="jsoneditor.min.js"></script>

    <script>
    const schema = {"type":"object","properties":{"tenant_name":{"type":"string","title":"Tenant Name","description":"The *tenant* is the high-level grouping in an AS3 declaration. FAST deploys all configuration for a given tenant in a BIG-IP partition of the same name.","minLength":1,"maxLength":255,"pattern":"^[A-Za-z][0-9A-Za-z_.-]*$","immutable":true,"propertyOrder":0},"app_name":{"type":"string","title":"Application Name","description":"The *application* is the low-level grouping in an AS3 declaration. FAST deploys all configuration for a given application in a BIG-IP folder within the tenant partition.","minLength":1,"maxLength":255,"pattern":"^[A-Za-z][0-9A-Za-z_.-]*$","immutable":true,"propertyOrder":1},"virtual_address":{"type":"string","title":"Virtual Server IP Address","description":"This IP address, combined with the port you specify below, becomes the BIG-IP virtual server address and port, which clients use to access the application. The system uses this IP:Port for distributing requests to the web servers.","propertyOrder":2},"virtual_port":{"type":"integer","minimum":0,"maximum":65535,"title":"Virtual Server Port","default":443,"propertyOrder":3},"pool_members":{"type":"array","title":"Pool Members","description":"The pool members are the servers that receive traffic from the virtual server (upstream). To share nodes between pools see K88250015: AS3 expected behavior of 'shareNodes' in declarations.   https://my.f5.com/manage/s/article/K88250015","uniqueItems":true,"items":{"type":"object","properties":{"serverAddress":{"type":"string","title":"Server Address"},"servicePort":{"type":"integer","minimum":0,"maximum":65535,"title":"Server Port","default":80},"shareNodes":{"type":"boolean","title":"Share Node","default":false,"format":"checkbox"}},"required":["serverAddress"]},"skip_xform":true,"propertyOrder":4,"format":"table"}},"required":["tenant_name","app_name","virtual_address","pool_members"],"dependencies":{"serverAddress":["pool_members"],"servicePort":["pool_members"],"shareNodes":["pool_members"]},"title":"Flipper -> AS3 HTTP Application Template","description":"This template aims to provide a jumping point for taking an NS app config and converting it to AS3.","definitions":{}};
    const defaults = {"virtual_port":"443","tenant_name":"starlord_offload_lb_vs","app_name":"starlord_offload_lb_vs","virtual_address":"192.168.86.142","pool_members":[{"serverAddress":"1.2.3.5","servicePort":"80"},{"serverAddress":"1.2.3.4","servicePort":"80"}]};
    const editor = new JSONEditor(document.getElementById('editor'), {
        schema,
        startval: defaults,
        compact: true,
        show_errors: 'always',
        disable_edit_json: true,
        disable_properties: true,
        disable_collapse: true,
        array_controls_top: true,
        theme: 'bootstrap4'
    });
</script>`



    it(`load fast template set`, async () => {

        // const localPath = path.join(__dirname, '..', 'templates');

        // const provider = new fast.FsTemplateProvider(localPath)
        // provider.invalidateCache();

        // console.log('localPath', localPath)

        // const resp = await provider.fetch('ns/http')
        //     .then((template) => {
        //         // console.log(template.getParametersSchema());
        //         // console.log(template.render({
        //         //     var: "value",
        //         //     boolVar: false
        //         // }));
        //         // get the schema for the template
        //         const schema = template.getParametersSchema();
        //         // get the default values for the template
        //         const defaultParams = template.getCombinedParameters();
        //         // const html = fast.guiUtils.generateHtmlPreview(schema, defaultParams)
        //         // html;
        //         return { schema, defaultParams }
        //     })
        //     .catch(e => {
        //         console.log(e);
        //     })

        // assert.ok(resp);
    })





});


const appJson = {
    "name": "fn-2187-vip_http",
    "protocol": "HTTP",
    "ipAddress": "208.208.208.13",
    "type": "lb",
    "opts": {
        "-persistenceType": "NONE",
        "-cltTimeout": "180"
    },
    "port": "80",
    "lines": [
        "add lb vserver fn-2187-vip_http HTTP 208.208.208.13 80 -persistenceType NONE -cltTimeout 180 -devno 70647808",
        "bind lb vserver fn-2187-vip_http fn-2187_http_svg",
        "add serviceGroup fn-2187_http_svg HTTP -maxClient 0 -maxReq 0 -cip DISABLED -usip NO -useproxyport YES -cltTimeout 180 -svrTimeout 360 -CKA NO -TCPB NO -CMP YES -devno 63504384",
        "bind serviceGroup fn-2187_http_svg bb8-03.jaku.dev 80 -devno 111411200",
        "add server bb8-03.jaku.dev bb8-03.jaku.dev -devno 11764",
        "bind serviceGroup fn-2187_http_svg bb8-01.jaku.dev 80 -state DISABLED -devno 111345664",
        "add server bb8-01.jaku.dev bb8-01.jaku.dev -state DISABLED -devno 11761",
        "bind serviceGroup fn-2187_http_svg bb8-05 80 -state DISABLED -devno 111312896",
        "add server bb8-05 28.28.28.97 -state DISABLED -devno 11819",
        "bind serviceGroup fn-2187_http_svg bb8-06.jaku.dev 80 -devno 111280128",
        "add server bb8-06.jaku.dev 28.28.28.96 -devno 11684",
        "bind serviceGroup fn-2187_http_svg bb8-08 80 -devno 111247360",
        "add server bb8-08 28.28.28.40 -devno 11821",
        "bind serviceGroup fn-2187_http_svg bb8-07.jaku.dev 80 -devno 111214592",
        "add server bb8-07.jaku.dev 28.28.28.39 -devno 11685",
        "bind serviceGroup fn-2187_http_svg bb8-09.jaku.dev 80 -devno 111181824",
        "add server bb8-09.jaku.dev 28.28.28.29 -devno 11728",
        "bind serviceGroup fn-2187_http_svg -monitorName ping -devno 111443968"
    ],
    "bindings": {
        "serviceGroup": [
            {
                "name": "fn-2187_http_svg",
                "protocol": "HTTP",
                "-maxClient": "0",
                "-maxReq": "0",
                "-cip": "DISABLED",
                "-usip": "NO",
                "-useproxyport": "YES",
                "-cltTimeout": "180",
                "-svrTimeout": "360",
                "-CKA": "NO",
                "-TCPB": "NO",
                "-CMP": "YES",
                "servers": [
                    {
                        "name": "bb8-03.jaku.dev",
                        "port": "80",
                        "hostname": "bb8-03.jaku.dev"
                    },
                    {
                        "name": "bb8-01.jaku.dev",
                        "port": "80",
                        "hostname": "bb8-01.jaku.dev"
                    },
                    {
                        "name": "bb8-05",
                        "port": "80",
                        "address": "28.28.28.97"
                    },
                    {
                        "name": "bb8-06.jaku.dev",
                        "port": "80",
                        "address": "28.28.28.96"
                    },
                    {
                        "name": "bb8-08",
                        "port": "80",
                        "address": "28.28.28.40"
                    },
                    {
                        "name": "bb8-07.jaku.dev",
                        "port": "80",
                        "address": "28.28.28.39"
                    },
                    {
                        "name": "bb8-09.jaku.dev",
                        "port": "80",
                        "address": "28.28.28.29"
                    }
                ]
            }
        ]
    },
    "diagnostics": [],
    "fastTempParams": {
        "tenant_name": "fn-2187-vip_http",
        "app_name": "fn-2187-vip_http",
        "type": "lb",
        "protocol": "HTTP",
        "virtual_address": "208.208.208.13",
        "virtual_port": "80",
        "pool_members": [
            {
                "hostname": {
                    "hostname": "bb8-03.jaku.dev"
                },
                "name": {
                    "name": "bb8-03.jaku.dev"
                },
                "port": {
                    "port": "80"
                }
            },
            {
                "hostname": {
                    "hostname": "bb8-01.jaku.dev"
                },
                "name": {
                    "name": "bb8-01.jaku.dev"
                },
                "port": {
                    "port": "80"
                }
            },
            {
                "address": {
                    "address": "28.28.28.97"
                },
                "name": {
                    "name": "bb8-05"
                },
                "port": {
                    "port": "80"
                }
            },
            {
                "address": {
                    "address": "28.28.28.96"
                },
                "name": {
                    "name": "bb8-06.jaku.dev"
                },
                "port": {
                    "port": "80"
                }
            },
            {
                "address": {
                    "address": "28.28.28.40"
                },
                "name": {
                    "name": "bb8-08"
                },
                "port": {
                    "port": "80"
                }
            },
            {
                "address": {
                    "address": "28.28.28.39"
                },
                "name": {
                    "name": "bb8-07.jaku.dev"
                },
                "port": {
                    "port": "80"
                }
            },
            {
                "address": {
                    "address": "28.28.28.29"
                },
                "name": {
                    "name": "bb8-09.jaku.dev"
                },
                "port": {
                    "port": "80"
                }
            }
        ],
        "persistence": {
            "NONE": "NONE"
        },
        "cltTimeout": {
            "180": "180"
        }
    }
}
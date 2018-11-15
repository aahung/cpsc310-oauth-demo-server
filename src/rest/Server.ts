/**
 * Created by rtholmes on 2016-06-19. Modified by sam on 2018-11-14.
 */

import fs = require("fs");
import restify = require("restify");
const https = require('https');

/**
 * This configures the REST endpoints for the server.
 */

let credential = JSON.parse(fs.readFileSync('./credential.json').toString());

export default class Server {

    private port: number;
    private rest: restify.Server;
    private authToken: string;

    constructor(port: number) {
        this.port = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {

                that.rest = restify.createServer({
                    name: "OAuth",
                });
                that.rest.use(restify.queryParser());
                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // http://localhost:4321/
                that.rest.get("/", async (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    console.log('that.rest.get ' + req.url)

                    // request user info
                    let userInfo = await Server.makeGETJSONRequest(
                        'github.ugrad.cs.ubc.ca', 
                        '/api/v3/user?access_token=' + that.authToken);
                    console.log('user info got');

                    if (userInfo.login === undefined) {
                        res.write(`<html><body>
                            <a href="https://github.ugrad.cs.ubc.ca/login/oauth/authorize?client_id=${credential.client_id}">Login with GitHub</a>
                            </body></html>`);
                        res.end();
                    } else {
                        res.write('Hi ' + userInfo.login);
                        res.end();
                    }
                    
                    return next();
                });

                // callback url: http://localhost:4321/ohyeah
                that.rest.get("/ohyeah", async (req: restify.Request, res: restify.Response, next: restify.Next) => {
                    console.log('that.rest.get ' + req.url)
                    
                    let tmpCode = req.params['code'];

                    let data = {
                        client_id: credential.client_id,
                        client_secret: credential.client_secret,
                        code: tmpCode
                    };
                    let postResult = await Server.makePOSTJSONRequest(
                        'github.ugrad.cs.ubc.ca', 
                        '/login/oauth/access_token',
                        data);

                    let authToken = postResult['access_token'];
                    console.log('token got ' + authToken);

                    // request user info
                    let userInfo = await Server.makeGETJSONRequest(
                        'github.ugrad.cs.ubc.ca', 
                        '/api/v3/user?access_token=' + authToken);
                    console.log('user info got');

                    if (userInfo.login !== undefined) {
                        that.authToken = authToken;
                    }

                    res.write(JSON.stringify(userInfo, null, '  '));
                    res.end();

                    return next();
                });

                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    reject(err);
                });

            } catch (err) {
                reject(err);
            }
        });
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        res.write('getStatic ' + req.url);
        res.end();
        return next();
    }

    private static makePOSTJSONRequest(hostname: string, path: string, data: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let json = JSON.stringify(data);

            const options = {
                hostname: hostname,
                port: 443,
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': json.length,
                    'Accept': 'application/json'
                }
            }

            let str = '';

            const httpRequest = https.request(options, (httpResponse: any) => {

                httpResponse.on('data', (chunk: any) => {
                    str += chunk;
                })

                httpResponse.on('end', () => {
                    try {
                        resolve(JSON.parse(str));
                    } catch (err) {
                        console.log(str);
                        reject(err);
                    }
                })
            });

            httpRequest.on('error', (err: any) => {
                reject(err);
            })

            console.log(json);
            httpRequest.write(json);
            httpRequest.end();
        });
    }

    private static makeGETJSONRequest(hostname: string, path: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const options = {
                hostname: hostname,
                port: 443,
                path: path,
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            }

            let str = '';

            const httpRequest = https.request(options, (httpResponse: any) => {

                httpResponse.on('data', (chunk: any) => {
                    str += chunk;
                })

                httpResponse.on('end', () => {
                    try {
                        resolve(JSON.parse(str));
                    } catch (err) {
                        console.log(str);
                        reject(err);
                    }
                })
            });

            httpRequest.on('error', (err: any) => {
                reject(err);
            })

            httpRequest.end();
        });
    }

}

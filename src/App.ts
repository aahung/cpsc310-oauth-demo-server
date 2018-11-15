/**
 * Created by rtholmes on 2016-06-19. Modified by sam on 2018-11-14.
 */

import Server from "./rest/Server";

/**
 * Main app class that is run with the node command. Starts the server.
 */
export class App {
    public initServer(port: number) {

        const server = new Server(port);
        server.start().then(function (val: boolean) {
        }).catch(function (err: Error) {
        });
    }
}

// This ends up starting the whole system and listens on a hardcoded port (4321)
const app = new App();
app.initServer(4321);

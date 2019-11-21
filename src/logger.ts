import { config } from "winston";

let consoleReference: Console;

export function overrideConsole() {

    consoleReference = console;


    console = {

        log: (e) => {
            consoleReference.log(e)
        },
        info: (e) => {
            consoleReference.info(e)
        },
        debug: (e) => {
            consoleReference.debug(e)
        },
        error: (e) => {
            consoleReference.error(e)
        }


    }

}
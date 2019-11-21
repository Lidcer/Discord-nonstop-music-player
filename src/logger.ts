import { config } from '.';
import * as moment from 'moment';

let consoleReference: Console;

export function overrideConsole() {

    consoleReference = console;

    //@ts-ignore
    console = {
        log: (...args: any[]) => {
            if (arguments.length === 0) return;


            consoleReference.log(`[${moment().format('lll')}] [log]`, Array.from(arguments));
        },
        info: (...args: any[]) => {
            if (arguments.length === 0) return;

            consoleReference.info(`[${moment().format('lll')}] [info]`, Array.from(arguments));
        },
        warn: (...args: any[]) => {
            if (arguments.length === 0) return;

            consoleReference.info(`[${moment().format('lll')}] [info]`, Array.from(arguments));
        },
        debug: (...args: any[]) => {
            if (arguments.length === 0) return;

            consoleReference.debug(`[${moment().format('lll')}] [debug]`, Array.from(arguments));
        },
        error: (...args: any[]) => {
            if (arguments.length === 0) return;

            consoleReference.error(`[${moment().format('lll')}] [error]`, Array.from(arguments));
        }


    }

}
import { config } from '.';
import * as moment from 'moment';

let consoleReference: Console = console;

export function overrideConsole() {
	const format = 'D MMM YYYY hh:mm:ss';
	//@ts-ignore
	console = {
		error: (...args: any[]) => {
			if (args.length === 0) return;
			if (config.LOG_LEVEL <= 0) return;
			consoleReference.error(`[${moment().format(format)}] [error]`, args[1] ? args : args[0]);
		},
		warn: (...args: any[]) => {
			if (args.length === 0) return;
			if (config.LOG_LEVEL <= 1) return;
			consoleReference.warn(`[${moment().format(format)}] [info]`, args[1] ? args : args[0]);
		},
		info: (...args: any[]) => {
			if (args.length === 0) return;
			if (config.LOG_LEVEL <= 2) return;
			consoleReference.info(`[${moment().format(format)}] [info]`, args[1] ? args : args[0]);
		},
		log: (...args: any[]) => {
			if (args.length === 0) return;
			if (config.LOG_LEVEL <= 3) return;
			consoleReference.log(`[${moment().format(format)}] [log]`, args[1] ? args : args[0]);
		},
		debug: (...args: any[]) => {
			if (args.length === 0) return;
			if (config.LOG_LEVEL <= 4) return;
			consoleReference.debug(`[${moment().format(format)}] [debug]`, args[1] ? args : args[0]);
		},
	}
}


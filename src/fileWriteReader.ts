import { readFile, writeFile } from 'fs';
import * as path from 'path';
import { Settings } from './interface';
import { youtubeRegExp } from './onMessage';
import { log, config } from '.';
const songsTXT = path.join(__dirname, '../songs.txt');
const settingsJson = path.join(__dirname, '../settings.json');
const configJson = path.join(__dirname, '../config.json');


//const beautify = require('beautify');
export function loadTracks(): Promise<string[]> {
	return new Promise((resolve, reject) => {
		readFile(songsTXT, 'utf8', (err, data) => {
			if (err) {
				reject(err);
				return;
			}
			const urls = data.toString().match(youtubeRegExp)
			log.info(`Loaded ${urls.length} tracks`);
			resolve(urls);
			return;
		})
	})
}

export function loadSettingsConfig(): Promise<Settings> {
	return new Promise((resolve, reject) => {
		readFile(settingsJson, 'utf8', (err, data) => {
			if (err) {
				writeFile(settingsJson, JSON.stringify({}), (err) => {
					if (err) reject(err as any);
					else resolve({});
				})
			}
			try {
				const settings = JSON.parse(data);
				return resolve(settings);
			} catch (error) {
				writeFile(settingsJson, JSON.stringify({}), (err) => {
					if (err) reject(err as any);
					else resolve({});
				})
			}
		})
	})
}

export function writeSettings(newSettings: Settings): Promise<void> {
	return new Promise((resolve, reject) => {
		writeFile(settingsJson, JSON.stringify(newSettings), (err) => {
			if (err) {
				log.error(err.stack);
				reject(err as any);
			}
			else {
				log.debug('settings has been written');
				resolve()
			};
		});
	});
}

export function writeTracks(newTracks: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		writeFile(songsTXT, newTracks.join('\n'), (err) => {
			if (err) {
				log.error(err.stack);
				reject(err as any);
			}
			else {
				log.debug('Tracks has been written');
				resolve();
			}
		});
	});
}

export function writeConfig(): Promise<void> {
	return new Promise((resolve, reject) => {
		const newConfig = JSON.stringify(config)
			.replace(/{/g, '{\n')
			.replace(/,/g, '\n	')
			.replace(/}/g, '}\n')

		writeFile(configJson, newConfig, (err) => {
			if (err) {
				log.error(err.stack);
				reject(err as any);
			}
			else {
				log.debug('Config has been written');
				resolve()
			};
		});
	});
}



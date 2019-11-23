import { readFile, writeFile } from 'fs';
import * as path from 'path';
import { Settings } from './interface';
import { youtubeRegExp } from './onMessage';
import { config } from '.';
export const songsTXT = path.join(__dirname, '../songs.txt');
const settingsJson = path.join(__dirname, '../settings.json');
const configJson = path.join(__dirname, '../config.json');

export function loadTracks(): Promise<string[]> {
	return new Promise((resolve, reject) => {
		readFile(songsTXT, 'utf8', (err, data) => {
			if (err) {
				reject(err);
				return;
			}
			const urls = data.toString().match(youtubeRegExp)
				.map(r => r)
				.filter((line, index, array) => {
					return array.indexOf(line) == index;
				})

			urls.sort(() => Math.round(Math.random()) - 0.5);
			console.info(`Loaded ${urls.length} tracks`);
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
				console.error(err.stack);
				reject(err as any);
			}
			else {
				console.debug('settings has been written');
				resolve()
			};
		});
	});
}

export function writeTracks(newTracks: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		writeFile(songsTXT, newTracks.join('\n'), (err) => {
			if (err) {
				console.error(err.stack);
				reject(err as any);
			}
			else {
				console.debug('Tracks has been written');
				resolve();
			}
		});
	});
}

export function writeConfig(): Promise<void> {
	return new Promise((resolve, reject) => {
		const newConfig = JSON.stringify(config)
			.replace(/{/g, '{\n	')
			.replace(/,/g, ',\n	')
			.replace(/}/g, '\n}')
			.replace(/":/g, '": ')

		writeFile(configJson, newConfig, (err) => {
			if (err) {
				console.error(err.stack);
				reject(err as any);
			}
			else {
				console.debug('Config has been written');
				resolve()
			};
		});
	});
}



import { readFile, writeFile } from 'fs';
import * as path from 'path';
import { rejects } from 'assert';
import { resolve } from 'dns';
import { Settings } from './interface';
const songsTXT = path.join(__dirname, '../songs.txt');
const settingsJson = path.join(__dirname, '../settings.json');
const youtubeTester = new RegExp(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/g);

export function loadTracks(): Promise<string[]> {
	return new Promise((resolve, reject) => {
		readFile(songsTXT, (err, data) => {
			if (err) return reject(err)

			const urls = data.toString().match(youtubeTester)

			console.info(`Loaded ${urls.length} tracks`)
			return resolve(urls)
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
			if (err) reject(err as any);
			else resolve();
		});
	});
}

export function writeTracks(newTracks: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		writeFile(songsTXT, newTracks.join('\n'), (err) => {
			if (err) reject(err as any);
			else resolve();
		});
	});
}





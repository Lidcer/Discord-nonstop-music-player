
export const config: ConfigFile = require('../config.json');
import { Client, Guild, TextChannel } from 'discord.js';
import { loadTracks, loadSettingsConfig, writeSettings } from './fileWriteReader';
import { onMessage } from './onMessage';
import { ConfigFile, Settings } from './interface';
import { onStartup, leaveAllVoiceChannels } from './player';
import * as winston from 'winston';
export const log = winston.createLogger({
	level: 'silly',
	transports: [
		new winston.transports.Console(),
		new winston.transports.File({ filename: 'combined.log' })
	]
})

const discordToken = config.DISCORD_TOKEN;
export const youtubeKey = config.YOUTUBE_API_KEY;
export const owner = config.OWNER;
let prefix = config.PREFIX;

if (!discordToken) throw new Error('Config file is not setup properly');
if (prefix) prefix = prefix.toLowerCase();
if (!prefix && prefix.length > 10) throw new Error('Prefix is not valid');
let debug = config.DEBUG || !!process.env.DEBUG;

export let tracks: string[];
export let settings: Settings;

const client = new Client();

export let invite = '';

client.on('ready', async () => {
	log.info(`Logged in as ${client.user.tag}!`)
	invite = await client.generateInvite(['SEND_MESSAGES', 'PRIORITY_SPEAKER', 'CONNECT', 'EMBED_LINKS']);
	log.info(`Invite link ${invite}`);
	onStartup(client);
});

client.on('guildCreate', guild => {
	let channel = guild.defaultChannel;
	if (!channel) {
		channel = guild.channels.find(c => c.type === 'text' && c.permissionsFor(guild.me).has('SEND_MESSAGES')) as TextChannel;
	}
	if (channel) {
		channel.send(`Sup. I'm bot my name is ${client.user.username}. And my purpose is to play music 24/7. At least that what my contract is saying.`).then(() => {
			setTimeout(() => {
				channel.send(`Oh yeah I almost forgot to tell ya. You have to set me up. Join voice channel if you are admin or have manage channel permission and type \`${prefix}voicechannel\`. And I will play music for yall`)
					.then(e => {
						setTimeout(() => {
							channel.send(`And that's not all you can use \`${prefix}np\` to check current song. Or if you are still confused you can also use \`${prefix}help\``)
						}, 60000);
					})
					.catch(() => {/* do nothing */ })
			}, 20000);
		}).catch(() => {/* do nothing */ })
	}
})

client.on('debug', data => {
	if (debug) log.debug(data);
})

client.on('error', err => {
	if (err.stack) log.error(err.stack);
	else log.error(err.toString());
})

client.on('guildDelete', guild => {
	if (settings[guild.id]) {
		delete settings[guild.id]
		writeSettings(settings);
		log.info(`Bot was removed from guild ${guild.id}`)
	}
});

client.on('message', message => {
	onMessage(message, prefix);
});

process.on('beforeExit', () => destroy());
process.on('SIGINT', () => destroy());
process.on('SIGTERM', () => destroy());
//process.on('SIGKILL', () => destroy());

process.on('uncaughtException', async err => {
	log.error(err.stack);
	await sendErrorToOwner(err.stack).catch(err => { log.warn(err.toString()) });
	destroy();
});
process.on('unhandledRejection', err => {
	client.emit('error', err);
});

export async function destroy() {
	await client.destroy();
	await leaveAllVoiceChannels(client);
	process.exit(1);
}

loadTracks()
	.then(async t => {
		if (t.length === 0) throw new Error('No tracks found!');
		tracks = t;
		settings = await loadSettingsConfig()
			.catch(err => { throw new Error(err) });
		login();
	})
	.catch(error => {
		throw error;
	});

function sendErrorToOwner(message: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const user = client.users.find(u => u.id === owner)
		if (!user) {
			reject(new Error('User not found'));
			return
		};
		user.createDM()
			.then(channel => {
				channel.send(message)
					.then(() => { resolve() })
					.catch(err => reject(err))
			})
			.catch(err => {
				reject(err);
			})
	});
}

function login() {
	client.login(discordToken).catch(error => {
		throw error
	});
}

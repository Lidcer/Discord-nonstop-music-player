// tslint:disable-next-line: no-var-requires
const config: ConfigFile = require('../config.json');
import { Client, Guild, TextChannel } from 'discord.js';
import { loadTracks, loadSettingsConfig, writeSettings } from './fileWriteReader';
import { onMessage } from './onMessage';
import { ConfigFile, Settings } from './interface';
import { onStartup, leaveAllVoiceChannels } from './player';

const discordToken = config.DISCORD_TOKEN || process.env.DISCORD_TOKEN;
export const youtubeKey = config.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEY;
export const owner = config.OWNER || process.env.OWNER;
let prefix = config.PREFIX || process.env.PREFIX;

if (!discordToken) throw new Error('Config file is not setup properly');
if (prefix) prefix = prefix.toLowerCase();
if (!prefix && prefix.length > 10) throw new Error('Prefix is not valid');
let debug = config.DEBUG || !!process.env.DEBUG;

export let tracks: string[];
export let settings: Settings;

const client = new Client();

export let invite = '';

client.on('ready', async () => {
	console.info(`Logged in as ${client.user.tag}!`);
	invite = await client.generateInvite(['SEND_MESSAGES', 'PRIORITY_SPEAKER', 'CONNECT', 'EMBED_LINKS']);
	console.info(`Invite link ${invite}`);
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
				channel.send(`Oh yeah I almost forgot to tell ya. You have to set me up. Join voice channel if you are admin or have manage channel permission and type \`${prefix}voicechannel\`. And I will play music yall`)
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
	if (debug) console.log(data);
})

client.on('error', console.error)

client.on('guildDelete', guild => {
	if (settings[guild.id]) {
		delete settings[guild.id]
		writeSettings(settings);
		console.log(`Bot was removed from guild ${guild.id}`)
	}
});

client.on('message', message => {
	onMessage(message, prefix);
});

process.on('beforeExit', () => destroy());
process.on('SIGINT', () => destroy());
process.on('SIGTERM', () => destroy());
// process.on('SIGKILL', () => destroy());

process.on('uncaughtException', err => {
	console.error(err);
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
		settings = await loadSettingsConfig().catch(err => { throw new Error(err) });
		client.login(discordToken).catch(error => { throw new Error(error); });
	})
	.catch(error => {
		throw error;
	});

process.on('uncaughtException', () => {
	process.exit(1);
});

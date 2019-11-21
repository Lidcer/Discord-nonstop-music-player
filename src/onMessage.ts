import { Message, GuildChannel, } from 'discord.js';
import { settings, owner, tracks, destroy, invite, config } from '.';
import { writeSettings, writeTracks, writeConfig } from './fileWriteReader';
import { startMusicPlayer, infoSong, nextSong, replaySong, previousSong, executeForcePlayUrl } from './player';
export const youtubeRegExp = new RegExp(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/g);

const cooldown = new Set();
const nowPlaying = new Set();
const COOLDOWN_TIME = 5000;
const NOW_WAIT = 1000 * 30;

const commands = {
	owner: {
		playlistAdd: 'playlist add',
		playlistRemove: 'playlist remove',
		shutDown: 'shutdown',
		next: 'next',
		previous: 'previous',
		replay: 'replay',
		forcePlay: 'force play',
		disableInvite: 'disable invite',
		setPrefix: 'set prefix',
		uploadSongsTxt: 'playlist upload'
	},
	admins: {
		addVoiceChannel: 'voiceadd',
		removeVoiceChannel: 'voiceremove',
	},
	users: {
		help: 'help',
		nowPlaying: 'np',
		invite: 'invite'
	}
}


export async function onMessage(message: Message, prefix: string) {
	if (message.guild) {
		const guildChannel = message.channel as GuildChannel;
		if (!guildChannel.permissionsFor(message.guild.me).has('SEND_MESSAGES')) return;
	}
	if (message.content === message.client.user.toString()) {
		message.channel.send(`My prefix is ${config.PREFIX}`);
		return;
	}

	if (cooldown.has(message.author.id)) return;
	let content = message.content.toLowerCase().replace(/  /g, '').trim();
	if (!content.startsWith(prefix)) return;
	content = content.slice(prefix.length);

	cooldown.add(message.author.id);

	setTimeout(() => {
		cooldown.delete(message.author.id);
	}, COOLDOWN_TIME);


	if (content.startsWith('help')) {
		const member = message.member;

		const startEnd = '```';

		const commandsInfo = [
			`${prefix}${commands.users.help} - this message`,
			`${prefix}${commands.users.nowPlaying} - what is playing`,
		];

		if (config.INVITE) {
			commandsInfo.push(`${prefix}${commands.users.invite} - Invite me in to you server`);
		}

		if (message.guild && member.hasPermission('MANAGE_CHANNELS')) {
			commandsInfo.push(`${prefix}${commands.admins.addVoiceChannel} - setup guild voice channel `);
			commandsInfo.push(`${prefix}${commands.admins.removeVoiceChannel} - Remove guild voice channel`);
		} else if (message.author.id === owner) {
			commandsInfo.push(`${prefix}${commands.owner.playlistAdd} <youtube url> - adds song from playlist and updates songs.txt`);
			commandsInfo.push(`${prefix}${commands.owner.playlistRemove} <youtube url> - removes song from playlist and updates songs.txt`);
			commandsInfo.push(`${prefix}${commands.owner.forcePlay} <youtube url> - stops and forcefully plays songs`);
			commandsInfo.push(`${prefix}${commands.owner.setPrefix} <prefix> - changes prefix`);
			commandsInfo.push(`${prefix}${commands.owner.disableInvite} <boolean> - enabled/disabled invite`);
			commandsInfo.push(`${prefix}${commands.owner.shutDown} - shutdowns bot`);
			commandsInfo.push(`${prefix}${commands.owner.next} - next song`);
			commandsInfo.push(`${prefix}${commands.owner.previous} - previous song`);
			commandsInfo.push(`${prefix}${commands.owner.replay} - replay song`);
			commandsInfo.push(`${prefix}${commands.owner.uploadSongsTxt} - replaces songs.txt (requires songs.txt attachment)`);
		}
		message.channel.send(`${startEnd}\n${commandsInfo.join('\n')}${startEnd}`).catch(() => {/* ignored */ });
	}


	if (message.author.id === owner) {

		if (content.startsWith(commands.owner.playlistAdd)) {
			const links = message.content.match(youtubeRegExp);
			if (links) {
				if (!tracks.includes(links[0])) {
					tracks.push(links[0]);
					await writeTracks(tracks);
					message.channel.send(`Track added to playlist. Total Tracks ${tracks.length}`);
				} else {
					message.channel.send(`This track is already on playlist`);
				}

			} else {
				message.channel.send('Please specify url')
			}
			return;
		}
		if (content.startsWith(commands.owner.playlistRemove)) {
			const links = message.content.match(youtubeRegExp);
			if (links) {
				const index = tracks.indexOf(links[0]);
				if (index === -1) {
					message.channel.send(`This track is not on playlist`);
					return;
				}
				tracks.splice(index, 1)
				await writeTracks(tracks);
				message.channel.send(`Track removed from playlist. Total Tracks ${tracks.length}`);
			} else {
				message.channel.send('Please specify url')
			}
			return;
		}
		if (content.startsWith(commands.owner.forcePlay)) {
			const links = message.content.match(youtubeRegExp);
			if (links) {
				executeForcePlayUrl(message, links[0])
			} else {
				message.channel.send('Please specify url')
			}
			return;
		}
		if (content.startsWith(commands.owner.shutDown)) {
			message.channel.send(`Shuting down`).then(() => {
				destroy();
			}).catch(() => { /* do nothing */ });
			return;
		}
		if (content.startsWith(commands.owner.disableInvite)) {
			const boolean = content.slice(commands.owner.disableInvite.length).trim();
			if (boolean === 'true' || boolean === 'enable') {
				if (config.INVITE) {
					message.channel.send(`Invite command is already enabled`).catch(() => { });
					return;
				}
				config.INVITE = true;
				await writeConfig()
				message.channel.send(`Invite command is now enabled`).catch(() => { });
			}
			else if (boolean === 'false' || boolean === 'disable') {
				if (!config.INVITE) {
					message.channel.send(`Invite command is already disabled`).catch(() => { });
					return;
				}
				config.INVITE = false;
				await writeConfig()
				message.channel.send(`Invite command is now disabled`).catch(() => { });
			} else {
				message.channel.send(`${prefix}${commands.owner.disableInvite} <boolean> - enabled/disabled invite`).catch(() => { });
			}
		}
		if (content.startsWith(commands.owner.setPrefix)) {
			const prefix = content.slice(commands.owner.disableInvite.length).trim();
			if (config.PREFIX === prefix) {
				message.channel.send(`*Tom Reading The Newspaper*`).catch(() => { });
				return;
			}
			config.PREFIX = prefix;
			await writeConfig()
			message.channel.send(`Prefix changed to: \`${prefix}\``)
		}
		if (content.startsWith(commands.owner.next)) {
			nextSong(message);
			return;
		}
		if (content.startsWith(commands.owner.previous)) {
			previousSong(message);
			return;
		}
		if (content.startsWith(commands.owner.replay)) {
			replaySong(message);
			return;
		}

	}
	if (!message.guild) return;

	if (content.startsWith(commands.admins.addVoiceChannel)) {
		if (message.author.id !== owner) {
			if (!message.member.hasPermission('MANAGE_CHANNELS')) {
				message.reply('Sorry but you need `MANAGE_CHANNELS` permission to use that commend').catch(() => { });
				return;
			}
		}

		if (message.member.voiceChannel) {
			const voiceChannel = message.member.voiceChannel;
			if (!voiceChannel.joinable) {
				message.reply("Sorry but I'm unable to join this voice channel 😥").catch(() => { });
				return;
			}
			if (settings[message.guild.id] === voiceChannel.id) {
				message.channel.send("🤔 Hold on. I'm already configured for this channel.").catch(() => { });
				return;
			}
			const switchingChannel = !!settings[message.guild.id];

			settings[message.guild.id] = voiceChannel.id;
			await writeSettings(settings).catch(() => { });

			if (switchingChannel)
				message.channel.send("Voice Channel has been successfully changed. I'm going to join when current song ends.").catch(() => { });
			else
				message.channel.send('🤗 Alright all set up. I will connect when its going to be possible.').catch(() => { });
			startMusicPlayer(message.client)
			return;
		}

		message.channel.send('Please join voice channel then try use this command again.').catch(() => { });
		return

	}
	if (content.startsWith(commands.admins.removeVoiceChannel)) {
		if (message.author.id !== owner) {
			if (!message.member.hasPermission('MANAGE_CHANNELS')) {
				message.reply('Sorry but you need `MANAGE_CHANNELS` permission to use that commend');
				return;
			}
		}
		if (settings[message.guild.id]) {
			delete settings[message.guild.id];
			await writeSettings(settings).catch(() => { });
			if (message.guild.voiceConnection) {
				await message.guild.voiceConnection.channel.leave();
			}
			message.channel.send('🤨 Alright then. No more music.').catch(() => { });
		}
		else {
			message.channel.send('🤔 There is nothing to remove.').catch(() => { });
		}
	}

	if (content.startsWith(commands.users.nowPlaying)) {
		if (nowPlaying.has(message.author.id)) {
			message.channel.send(`Please wait ${NOW_WAIT / 1000}s before using this command again`).catch(() => { });
			return;
		}
		nowPlaying.add(message.author.id)
		setTimeout(() => {
			nowPlaying.delete(message.author.id)
		}, NOW_WAIT);
		infoSong(message);
	}
	if (config.INVITE && content.startsWith('invite')) {
		message.channel.send(`Sure... here is my invite code for ya **<${invite}>**`).catch(() => { });
	}
}

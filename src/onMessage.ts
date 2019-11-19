import { Message, Guild } from 'discord.js';
import { settings, owner, tracks, destroy, invite } from '.';
import { writeSettings, loadSettingsConfig, writeTracks } from './fileWriteReader';
import { Youtube } from './Youtube';
import { startMusicPlayer, infoSong, nextSong, replaySong, previousSong } from './player';
//import { infoSong, nextSong, previousSong, replaySong } from './_player';
const youtubeRegExp = new RegExp(/http(?:s?):\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)([\w\-\_]*)(&(amp;)?‌​[\w\?‌​=]*)?/g);


export async function onMessage(message: Message, prefix: string) {
	let content = message.content.toLowerCase().replace(/  /g, '').trim();
	if (!content.startsWith(prefix)) return;
	content = content.slice(prefix.length);
	if (message.author.id === owner) {

		if (content.startsWith('playlistadd')) {
			const links = content.match(youtubeRegExp);
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
		if (content.startsWith('playlistremove')) {
			const links = content.match(youtubeRegExp);
			if (links) {
				if (tracks.includes(links[0])) {
					const index = tracks.indexOf(links[0]);
					if (index === -1) {
						message.channel.send(`This track is not on playlist`);
						return;
					}
					tracks.splice(index, 1)
					await writeTracks(tracks);
					message.channel.send(`Track removed from playlist. Total Tracks ${tracks.length}`);

				}

			} else {
				message.channel.send('Please specify url')
			}
			return;
		}
		if (content.startsWith('shutdown')) {
			message.channel.send(`Shuting down`).then(() => {
				destroy();
			}).catch(() => { /* do nothing */ });
			return;
		}
		if (content.startsWith('next')) {
			nextSong(message);
			return;
		}
		if (content.startsWith('previous')) {
			previousSong(message);
			return;
		}
		if (content.startsWith('replay')) {
			replaySong(message);
			return;
		}

	}
	if (!message.guild) return;

	if (content.startsWith('voicechannel')) {
		if (message.author.id !== owner) {
			if (!message.member.hasPermission('MANAGE_CHANNELS')) {
				message.reply('Sorry but you need `MANAGE_CHANNELS` permission to use that commend');
				return;
			}
		}
		const channel = content.match(/<#[0-9]*>/gi)

		if (channel && channel.length > 1) {
			message.reply('🤔 Please mention one voice channel to prevent confusion!').catch(() => { });
			return;
		}
		else if (channel) {
			const voiceChannelId = channel[0].replace(/<|#|>/g, '');
			const voiceChannel = message.guild.channels.find(c => c.id === voiceChannelId);
			if (!voiceChannel) {
				message.reply(`😐 Something went wrong. I'm unable to find this channel...`).catch(() => { });
				return;
			}
			if (voiceChannel.type !== 'voice') {
				message.reply('👀 Emm. This is not voice channel im not going to do anything!').catch(() => { });
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
			await writeSettings(settings).catch(err => {
				console.error(`UNABLE TO WRITE SETTINGS: UNABLE TO WRITE FILES ${err}`);
			})

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
	if (content.startsWith('removevoicechannel')) {
		if (message.author.id !== owner) {
			if (!message.member.hasPermission('MANAGE_CHANNELS')) {
				message.reply('Sorry but you need `MANAGE_CHANNELS` permission to use that commend');
				return;
			}
		}
		if (settings[message.guild.id]) {
			delete settings[message.guild.id];
			await writeSettings(settings).catch(err => {
				console.error(`UNABLE TO WRITE SETTINGS: UNABLE TO WRITE FILES ${err}`);
			})
			if (message.guild.voiceConnection) {
				await message.guild.voiceConnection.channel.leave();
			}
			message.channel.send('🤨 Alright then. No more music.').catch(() => { });
		}
		else {
			message.channel.send('🤔 There is nothing to remove.').catch(() => { });
		}
	}

	if (content.startsWith('np')) {
		infoSong(message);
	}
	if (content.startsWith('invite')) {
		message.channel.send(`Sure... here is my invite code for ya **<${invite}>**`);

	}

	if (content.startsWith('help')) {
		const member = message.member;

		const startEnd = '```';

		const allMembers = [
			`${prefix}help - this message`,
			`${prefix}np - what is playing`,
			`${prefix}invite - Invite me in to you server`
		];

		if (member.hasPermission('MANAGE_CHANNELS')) {
			allMembers.push(`${prefix}voicechannel - setup guild voice channel `)
			allMembers.push(`${prefix}removevoicechannel - Remove guild voice channel`)
		}
		message.channel.send(`${startEnd}\n${allMembers.join('\n')}${startEnd}`)
	}

}



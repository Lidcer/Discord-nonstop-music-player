import { Client, VoiceChannel, StreamDispatcher, Message, TextChannel, RichEmbed } from "discord.js";
import { settings, tracks, youtubeKey, sendErrorToOwner } from ".";
import { writeSettings } from "./fileWriteReader";
import { Youtube, VideoData } from './Youtube';
import { getStream } from './yt-code-discord';
import { getInfo } from "ytdl-core";
import ytdl = require("ytdl-core");


let indexPlaying = 0;
let trackStart: Date;
let trackInfo: ytdl.videoInfo;
let playing = false;
let forcePlayUrl = '';
let currentUrl = '';
let currentVideoData: VideoData;

export async function onStartup(client: Client) {
	setPresence(client, `Initializing player`)
	getNextTrackInfo();
	const guilds = client.guilds.map(g => g);

	const settingsKeys = Object.keys(settings);

	for (const guildID of settingsKeys) {
		const guildIDs = guilds.map(g => g.id);

		if (!guildIDs.includes(guildID)) {
			if (settings[guildID]) {
				delete settings[guildID];
				console.log(`Guild ${guildID} has been removed from settings because bot is no longer in this guild`);
			}
		}
	}
	await leaveAllVoiceChannels(client);
	await joinVoiceChannels(client, true);
	writeSettings(settings).catch(err => { });
	startMusicPlayer(client);
}

function joinVoiceChannels(client: Client, ignoreSettingsRewrite = false, forceJoin = true): Promise<void> {
	return new Promise(async (resolve, rejects) => {
		const oldSettings = JSON.stringify(settings);

		const guilds = client.guilds.map(g => g);
		for (const guild of guilds) {
			const voiceChannelId = settings[guild.id];
			const voiceChannel = guild.channels.find(c => c.id === voiceChannelId) as VoiceChannel;
			if (!forceJoin && guild.voiceConnection) break;
			if (!voiceChannel) {
				if (settings[guild.id])
					console.log(`Guild ${guild.id} has been removed from settings because voice channel doesn't exist`);
				delete settings[guild.id];
			} else {
				await voiceChannel.join()
					.catch(err => {
						console.warn(`Problem while trying to join the channel.`, err);
					});
			}
		}

		if (!ignoreSettingsRewrite && oldSettings !== JSON.stringify(settings)) {
			writeSettings(settings).catch(err => { });
		}

		resolve();
	});
}

export function leaveAllVoiceChannels(client: Client) {
	return new Promise(resolve => {
		const voiceConnections = client.voiceConnections;
		for (const voiceConnection of voiceConnections) {
			voiceConnection[1].channel.leave();
		}
		setTimeout(() => {
			resolve();
		}, 5000);
	});
}

export function startMusicPlayer(client: Client) {
	if (!playing) {
		playing = true;
		shuffleTracks();
		play(client);
	}
}

export function shuffleTracks() {
	if (tracks.length <= 1) return;
	tracks.sort(() => Math.round(Math.random()) - 0.5);
}


async function getNextTrackInfo(index = 0, client?: Client) {
	const url = forcePlayUrl ? forcePlayUrl : tracks[indexPlaying];
	const isForcePlayed = !!forcePlayUrl;
	forcePlayUrl = '';
	trackInfo = undefined;
	try {
		console.log(`Fetching info about ${url}`);
		trackInfo = await getInfo(url);
		console.log(`Info fetched about ${url} ${trackInfo.title}`);
		if (client) forceEndTrackInAllPlayers(client);
	} catch (error) {
		console.error('Unable to play tracks!');
		if (isForcePlayed) {
			sendErrorToOwner('Force play failed!');
			return;
		}

		if (index > 10) {
			shuffleTracks();
			indexPlaying = 0;
			setTimeout(() => {
				getNextTrackInfo(++index);
			}, 60000);
			return;
		}
		playlistIncrementor();
		console.warn(`Broken track ${url}`);
		setTimeout(() => {
			getNextTrackInfo(++index);
		}, 5000);
	}
}


async function play(client: Client) {
	if (!trackInfo) {
		setPresence(client, 'Technical issues!');
		setTimeout(() => {
			play(client);
		}, 15000);
		return;
	}

	await joinVoiceChannels(client, false, false);
	let streamDispatcher = undefined;
	currentUrl = trackInfo.video_url;
	currentVideoData = undefined;
	const title = trackInfo.title;
	if (client.voiceConnections.map(m => m).length === 0) {
		console.warn('voiceConnections not found playing suspended!');
		playing = false;
		return;
	}
	for (const voiceConnection of client.voiceConnections) {
		const dispatcher = voiceConnection[1].playOpusStream(getStream(trackInfo));
		if (!streamDispatcher) streamDispatcher = dispatcher;
	}
	getNextTrackInfo();
	streamDispatcher.on('end', () => {
		const WAIT = 1000 * 2; // waits 2 seconds
		setTimeout(() => {
			playlistIncrementor();
			play(client);
		}, WAIT);
	});
	streamDispatcher.on('start', () => {
		console.info(`Track ${indexPlaying + 1} / ${tracks.length} ${tracks[indexPlaying]} ${title}`);
		trackStart = new Date(Date.now());
		setPresence(client, title);
	});
	streamDispatcher.on('error', err => {
		throw err;
	});
}

function playlistIncrementor() {
	indexPlaying++;
	if (tracks.length - 1 < indexPlaying) {
		shuffleTracks();
		indexPlaying = 0;
	}
}

function setPresence(client: Client, content: string) {
	client.user.setPresence({
		game: {
			name: `${content}`,
			type: 'PLAYING',
		},
	});
}

export async function infoSong(message: Message) {
	if (youtubeKey && canEmbed(message.channel as TextChannel)) {
		if (!currentVideoData) {
			try {
				await message.channel.startTyping();
				currentVideoData = await Youtube.getVideoInfo(youtubeKey, currentUrl)
			} catch (_) { /* Ignore */ }
			finally {
				message.channel.stopTyping();
			}
		}

		if (!currentVideoData) {
			message.channel.send(songInfoEmbed(currentVideoData))
				.catch(err => {
					console.warn(err.toString())
				});
		} else {
			message.channel.send(songInfoEmbed(currentVideoData))
				.catch(err => {
					console.warn(err.toString())
				});
		}

	} else {
		message.channel.send(`**${currentUrl}**`)
			.catch(err => {
				console.warn(err.toString())
			});
	}
}

function canEmbed(channel: TextChannel) {
	return channel.permissionsFor(channel.guild.me).has('EMBED_LINKS');
}

function songInfoEmbed(video: VideoData) {
	const embed = new RichEmbed();
	const language = {
		video: {
			comments: 'Comments',
			downvote: '👎',
			duration: 'Duration',
			monthsName: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
			playlistStatus: 'Playlist status',
			progress: 'Progress',
			published: 'Published',
			rating: 'Rating',
			upvote: '👍',
			views: 'Views',
		},
	};

	embed.setAuthor(video.channel.title, video.channel.thumbnail, `https://www.youtube.com/channel/${video.channel.id}`);
	embed.setTitle(video.title);
	embed.setColor('RED');
	embed.setURL(video.url);
	embed.setThumbnail(video.thumbnail);

	const date = video.publishedAt;

	const day = date.getDate();
	const month = language.video.monthsName[date.getMonth()];
	const year = date.getFullYear();
	embed.addField(language.video.published, `${day} ${month} ${year}`, true);

	const views =
		video.statistics.viewCount < 10000
			? video.statistics.viewCount
			: video.statistics.viewCount
				.toString()
				.match(/.{1,3}/g)
				.join(',');
	const comments =
		video.statistics.commentCount < 10000
			? video.statistics.commentCount
			: video.statistics.commentCount
				.toString()
				.match(/.{1,3}/g)
				.join(',');
	let likes =
		video.statistics.likeCount < 1000
			? video.statistics.likeCount.toString()
			: (video.statistics.likeCount / 1000).toFixed(1) + 'K';
	let disLike =
		video.statistics.dislikeCount < 1000
			? video.statistics.dislikeCount.toString()
			: (video.statistics.dislikeCount / 1000).toFixed(1) + 'K';

	if (likes.includes('K') && likes.slice(likes.length - 3, likes.length - 1) === '.0') {
		likes = likes.slice(0, likes.length - 3) + 'K';
	}
	if (disLike.includes('K') && disLike.slice(disLike.length - 3, disLike.length - 1) === '.0') {
		disLike = disLike.slice(0, disLike.length - 3) + 'K';
	}

	embed.addField(language.video.views, views, true);
	embed.addField(
		language.video.rating,
		`${language.video.upvote}${likes}  ${language.video.downvote}${disLike}`,
		true,
	);

	const dateVideo = new Date(Date.now() - trackStart.getTime());

	embed.addField(language.video.comments, comments, true);
	const progress = `${getYoutubeTime(dateVideo)} / ${getYoutubeTime(new Date(video.duration))}`;

	embed.setColor('WHITE');
	embed.addField(language.video.playlistStatus, `${indexPlaying + 1} / ${tracks.length}`, true);
	embed.addField(language.video.progress, progress, true);
	return embed;
}


function getYoutubeTime(date: Date) {
	let seconds: any = date.getSeconds();
	let minutes: any = date.getMinutes();
	let hours: any = Math.floor(date.getTime() / 1000 / 60 / 60);

	seconds = seconds < 10 ? `0${seconds}` : seconds;
	minutes = minutes < 10 ? `0${minutes}` : minutes;

	if (hours) hours = hours < 10 ? `0${hours}:` : `${hours}:`;
	else hours = '';

	return `${hours}${minutes}:${seconds}`;
}

export function nextSong(message: Message) {
	forceEndTrackInAllPlayers(message.client);
	message.channel.send(`➡️ ️Switching to next song.`)
		.catch(err => {
			console.warn(err.toString());
		});
}

export function previousSong(message: Message) {
	indexPlaying -= 2;
	if (indexPlaying < 0) indexPlaying = 0;
	getNextTrackInfo(0, message.client);

	message.channel.send(`⬅️ ️Switching to previous song`)
		.catch(err => {
			console.warn(err.toString());
		});
}
export function replaySong(message: Message) {
	indexPlaying--;
	if (indexPlaying === -1) indexPlaying = tracks.length;
	getNextTrackInfo(0, message.client);
	message.channel.send(`🔄 Replaying`)
		.catch(err => {
			console.warn(err.toString());
		});
}

export function executeForcePlayUrl(message: Message, url: string) {
	forcePlayUrl = url;
	getNextTrackInfo(0, message.client)
	message.channel.send(`Initiating force replay.`)
		.catch(err => {
			console.error(err.toString())
		});
}

function forceEndTrackInAllPlayers(client: Client) {
	for (const voiceConnection of client.voiceConnections) {
		voiceConnection[1].dispatcher.end();
	}
}

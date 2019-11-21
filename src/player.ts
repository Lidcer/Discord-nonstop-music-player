import * as axios from 'axios';
import { Client, VoiceChannel, StreamDispatcher, Message, TextChannel, RichEmbed } from "discord.js";
import { settings, tracks, youtubeKey, log } from ".";
import { writeSettings } from "./fileWriteReader";
import * as ytdl from 'ytdl-core-discord';
import * as jsdom from 'jsdom';
import { Youtube, VideoData } from './Youtube';
const { JSDOM } = jsdom;

let streamDispatcher: StreamDispatcher;
let indexPlaying = 0;
let trackStart: Date;
let playing = false;
let forcePlayUrl = '';
// this should fix song ending 10 second before end
const streamPatch = {
	filter: 'audioonly',
	highWaterMark: 1 << 25
};
export async function onStartup(client: Client) {
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
	writeSettings(settings).catch(err => {
		console.error(`UNABLE TO WRITE SETTINGS: UNABLE TO WRITE FILES ${err}`);
	})

	startMusicPlayer(client)
}


function joinVoiceChannels(client: Client, ignoreSettingsRewrite = false): Promise<void> {
	return new Promise(async (resolve, rejects) => {
		const oldSettings = JSON.stringify(settings);

		const guilds = client.guilds.map(g => g);
		for (const guild of guilds) {
			const voiceChannelId = settings[guild.id];
			const voiceChannel = guild.channels.find(c => c.id === voiceChannelId) as VoiceChannel;
			if (!voiceChannel) {
				if (settings[guild.id])
					console.log(`Guild ${guild.id} has been removed from settings because voice channel doesn't exist`);
				delete settings[guild.id];
			} else {
				await voiceChannel.join()
					.catch(err => {
						const owner = guild.owner;
						if (owner) {
							owner.createDM().then(channel => {
								channel.send(`I am having problems in guild ${guild.name}. Your configuration was removed. Error ${err}`)
									.catch(() => {/* Do nothing */ })
							});
						}
						delete settings[guild.id];
						console.log(`Problem while trying to join the channel. Error`, err);
					});
			}
		}

		if (!ignoreSettingsRewrite && oldSettings !== JSON.stringify(settings)) {
			writeSettings(settings).catch(err => {
				console.error(`UNABLE TO WRITE SETTINGS: UNABLE TO WRITE FILES ${err}`);
			})
		}

		resolve();
	});
}

export function leaveAllVoiceChannels(client: Client) {
	return new Promise(resolve => {
		const voiceConnections = client.voiceConnections
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


async function play(client: Client, index = 0) {
	const url = forcePlayUrl ? forcePlayUrl : tracks[indexPlaying];
	forcePlayUrl = '';
	ytdl(url, streamPatch)
		.then(async stream => {
			await joinVoiceChannels(client)
			let dispatcher: StreamDispatcher;
			streamDispatcher = undefined;
			if (client.voiceConnections.map(m => m).length === 0) {
				console.log('voiceConnections not found playing suspended!');
				playing = false;
				return
			}
			for (const voiceConnection of client.voiceConnections) {
				if (!dispatcher) {
					const voiceDispatcher = voiceConnection[1].playOpusStream(stream)
					streamDispatcher = voiceDispatcher;
					dispatcher = voiceDispatcher;
				} else {
					ytdl(tracks[indexPlaying])
						.then(stream => {
							voiceConnection[1].playOpusStream(stream)
						}).catch(() => {
							console.error('this should not happen');
						})
				}
			}
			dispatcher.on('end', () => {
				const WAIT = 1000 * 2; // waits 2 seconds
				setTimeout(() => {
					indexPlaying++;
					if (tracks.length - 1 < indexPlaying) {
						shuffleTracks();
						indexPlaying = 0;
					}
					play(client);
				}, WAIT);
			});
			dispatcher.on('start', () => {
				console.info(`Track ${indexPlaying + 1} / ${tracks.length} ${tracks[indexPlaying]}`);
				trackStart = new Date(Date.now());
				updateStatus(client);
			});

			dispatcher.on('error', err => {
				throw err;
			});
		})
		.catch(async x => {
			const WAIT = 1000 * 5; // 5 seconds
			const WAIT_ONE_MINUTE = 1000 * 60; // 1 minute
			indexPlaying++;
			if (tracks.length - 1 < indexPlaying) {
				shuffleTracks();
				indexPlaying = 0;
			}

			if (index > 10) {
				console.error('SOMETHING IS VERY WRONG', x)
				client.user.setPresence({
					game: {
						name: `Technical issues. Waiting for things to get resolved by its own.`,
						type: 'PLAYING',
					},
				});
				await leaveAllVoiceChannels(client);
				setTimeout(() => {
					play(client, ++index);

				}, WAIT_ONE_MINUTE);

			}

			// Waits for 5 seconds then tries again
			setTimeout(() => {
				play(client, ++index);

			}, WAIT);
		});
}


async function updateStatus(client: Client) {
	let title = 'Unknown';

	await axios.default
		.get(tracks[indexPlaying])
		.then(d => {
			const dom = new JSDOM(d.data);
			const document = dom.window.document as Document;
			console.log(document.title);
			if (document.title && typeof document.title === 'string') title = document.title;
		})
		.catch(err => {
			console.error(err);
		});

	client.user.setPresence({
		game: {
			name: `${title}`,
			type: 'PLAYING',
		},
	});
}

export async function infoSong(message: Message) {
	await message.channel.startTyping();
	if (youtubeKey && canEmbed(message.channel as TextChannel)) {
		await Youtube.getVideoInfo(youtubeKey, tracks[indexPlaying])
			.then((video: VideoData) => {
				message.channel.send(songInfoEmbed(new RichEmbed(), video))
					.catch(err => {
						log.log(err.toString())
					});
			})
			.catch(error => {
				console.error(error);
				message.channel.send('Unable to get information')
					.catch(err => {
						log.log(err.toString())
					});
			});
	} else message.channel.send(tracks[indexPlaying])
		.catch(err => {
			log.log(err.toString())
		});

	message.channel.stopTyping();
}

function canEmbed(channel: TextChannel) {
	return channel.permissionsFor(channel.guild.me).has('EMBED_LINKS');
}

function songInfoEmbed(embed: RichEmbed, video: VideoData) {
	const language = {
		video: {
			comments: 'Comments',
			downvote: '👎',
			duration: 'Duration',
			monthsName: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
			playlistStatus: 'Playlist status',
			progress: 'Progress',
			published: 'Published',
			rateing: 'Raiting',
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
		language.video.rateing,
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
	if (!streamDispatcher) return;
	streamDispatcher.end();
	message.channel.send(`➡️ ️Switching to next song.`)
		.catch(err => {
			log.log(err.toString())
		});
}

export function previousSong(message: Message) {
	if (!streamDispatcher) return;
	indexPlaying -= 3;
	if (indexPlaying < 0) indexPlaying = 0;
	streamDispatcher.end();

	message.channel.send(`⬅️ ️Switching to previous song`)
		.catch(err => {
			log.log(err.toString())
		});
}
export function replaySong(message: Message) {
	if (!streamDispatcher) return;
	indexPlaying--;
	if (indexPlaying === -1) indexPlaying = tracks.length;
	streamDispatcher.end();
	message.channel.send(`🔄 Replaying`)
		.catch(err => {
			log.log(err.toString())
		});
}

export function executeForcePlayUrl(message: Message, url: string) {
	if (!streamDispatcher) return;
	streamDispatcher.end();
	message.channel.send(`Initiating force replay.`)
		.catch(err => {
			log.log(err.toString())
		});
}

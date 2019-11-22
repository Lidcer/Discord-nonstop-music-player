import ytdl = require("ytdl-core");

export interface ConfigFile {
	DISCORD_TOKEN: string;
	YOUTUBE_API_KEY: string;
	OWNER: string;
	PREFIX: string;
	DEBUG: boolean;
	INVITE: boolean;
	MESSAGE_ON_GUILD_JOIN: boolean;
	LOG_LEVEL: number;
}

export interface Settings {
	[key: string]: string;
}

export interface ytdlCache {
	[key: string]: ytdl.videoInfo;
}
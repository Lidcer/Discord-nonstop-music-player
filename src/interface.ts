export interface ConfigFile {
	DISCORD_TOKEN: string;
	YOUTUBE_API_KEY: string;
	OWNER: string;
	PREFIX: string;
	DEBUG: boolean;
	INVITE: boolean;
	LOG_LEVEL: boolean;
}

export interface Settings {
	[key: string]: string;
} 
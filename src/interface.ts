export interface ConfigFile {
	DISCORD_TOKEN: string;
	YOUTUBE_API_KEY: string;
	OWNER: string;
	PREFIX: string;
	DEBUG: boolean;
}

export interface Settings {
	[key: string]: string;
} 
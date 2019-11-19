export interface ConfigFile {
	DISCORD_TOKEN: string;
	YOUTUBE_API_KEY: string;
	OWNER: string;
	PREFIX: string;
}

export interface Settings {
	[key: string]: string;
} 
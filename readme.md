# 24/7 GUILD PLAYER

24/7 is a discord music bot that is plays from youtube nonstop and it is very easy to setup<br/><br/>

add your favorite songs in file `songs.txt`.<br/>
create file based on `config.template.json`.<br/>

```
{
	"DISCORD_TOKEN": "",
	"YOUTUBE_API_KEY": "",
	"PREFIX": "!",
	"OWNER": "000000000000000000",
	"INVITE": true, 
	"MESSAGE_ON_GUILD_JOIN": false,
	"LOG_LEVEL": 5 
}
```

`DISCORD_TOKEN` Your discord token duh. You can get here https://discordapp.com/developers/applications/<br/>
`YOUTUBE_API_KEY` is optional but if you want to get more info about the video 'prefix'np command you should get one here https://console.cloud.google.com/home/<br/>
`PREFIX` is prefix for your command.<br/>
`OWNER` owner id. You can get id of user account by enabling developer mode in discord settings then just right click on user and `Copy id`.<br/>
`INVITE` users get get invite by command 'prefix'invite
`MESSAGE_ON_GUILD_JOIN` welcome message when bot joins guild.
`LOG_LEVEL` consol lever logger -1 for not logging 5 for logging every single thing.

### Then you type in terminal
```
npm install
npm run build
npm start
```



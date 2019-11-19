import { RichEmbed } from "discord.js";

export class Embeds {

    static infoEmbed(msg: string, title = 'Info') {
        const embed = basicEmbed();
        embed.setColor('GOLD');
        embed.addField(title, msg);
        return embed
    }

    static errorEmbed(msg: string, title = 'Info') {
        const embed = basicEmbed();
        embed.setColor('RED');
        embed.addField(title, msg);
        return embed
    }

}

function basicEmbed() {
    const embed = new RichEmbed();
    embed.setTimestamp(Date.now());
    return embed;
}
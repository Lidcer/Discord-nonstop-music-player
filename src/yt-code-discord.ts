import * as ytdl from 'ytdl-core';
import { FFmpeg, opus } from 'prism-media';
import { ytdlCache } from './interface';

interface ytdlCustomParameters {
	title: string,
	stream: opus.Encoder | opus.WebmDemuxer;
}
const cache: ytdlCache = {};


function filter(format) {
	return format.audioEncoding === 'opus' &&
		format.container === 'webm' &&
		format.audio_sample_rate == 48000;
}

function nextBestFormat(formats) {
	formats = formats
		.filter(format => format.audioBitrate)
		.sort((a, b) => b.audioBitrate - a.audioBitrate);
	return formats.find(format => !format.bitrate) || formats[0];
}

export function ytdlCustom(url): Promise<ytdlCustomParameters> {
	return new Promise((resolve, reject) => {
		const urlInfo = cache[url];

		if (urlInfo) {
			resolve(resolver(urlInfo));
			return;
		}

		ytdl.getInfo(url, (err, info) => {
			if (err) return reject(err);
			cache[url] = info;

			resolve(resolver(info));

			setTimeout(() => {
				delete cache[url];
			}, 10000); //clear cache
		});
	});
}

function resolver(info: ytdl.videoInfo): ytdlCustomParameters {
	let options;
	const lengthSeconds = parseInt(info.length_seconds)
	// Prefer opus
	const format = info.formats.find(filter);
	const canDemux = format && lengthSeconds !== 0;
	if (canDemux) options = { ...options, filter };
	else if (lengthSeconds !== 0) options = { filter: 'audioonly' };
	if (canDemux) {
		const demuxer = new opus.WebmDemuxer();
		const webmDemuxer = ytdl.downloadFromInfo(info, options)
			.pipe(demuxer)
			.on('end', () => demuxer.destroy())
		return ({
			title: info.title,
			stream: webmDemuxer
		});
	} else {
		const transcoder = new FFmpeg({
			args: [
				'-reconnect', '1',
				'-reconnect_streamed', '1',
				'-reconnect_delay_max', '5',
				'-i', nextBestFormat(info.formats).url,
				'-analyzeduration', '0',
				'-loglevel', '0',
				'-f', 's16le',
				'-ar', '48000',
				'-ac', '2',
			],
		});
		const opusEncoder = new opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });
		const stream = transcoder.pipe(opusEncoder);
		stream.on('close', () => {
			transcoder.destroy();
			opusEncoder.destroy();
		});
		return ({
			title: info.title,
			stream: stream
		});
	}

}
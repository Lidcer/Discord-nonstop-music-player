import * as ytdl from 'ytdl-core';
import { FFmpeg, opus } from 'prism-media';
import { ytdlCache } from './interface';

interface ytdlCustomParameters {
	title: string,
	stream: opus.Encoder | opus.WebmDemuxer;
}


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

export function getYInfo(url): Promise<ytdl.videoInfo> {
	return new Promise((resolve, reject) => {
		ytdl.getInfo(url, (err, info) => {
			if (err) return reject(err);
			resolve(info);
		});
	});
}

export function getStream(info: ytdl.videoInfo): opus.Encoder | opus.WebmDemuxer {
	let options;

	const lengthSeconds = parseInt(info.length_seconds)
	// Prefer opus
	const format = info.formats.find(filter);
	const canDemux = format && lengthSeconds !== 0;
	if (canDemux) options = { ...options, filter, highWaterMark: 1 << 25 };
	else if (lengthSeconds !== 0) options = { filter: 'audioonly', };
	if (canDemux) {
		const demuxer = new opus.WebmDemuxer();
		const webmDemuxer = ytdl.downloadFromInfo(info, options)
			.pipe(demuxer)
			.on('end', () => demuxer.destroy())
		return webmDemuxer;
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
		return stream;
	}

}
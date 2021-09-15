const ytdl = require('ytdl-core');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const Stream = require('stream');
const spawn = require('child_process').spawn;

module.exports = (payload) => {
    const readableStream = new Stream.Readable()
    readableStream._read = () => {}
    return new Promise(async (res, rej) => {
        try {
            const { top = 0, bottom = 0, left = 0, right = 0 } = payload.cutPoints || {};
            const width = 1 - (left/100) - (right/100);
            const height = 1 - (top/100) - (bottom/100);
            const basicInfo = await ytdl.getBasicInfo(payload.link, { format: 'mp4' });

            const args = [
                '-ss', payload.startTime,
                '-i', basicInfo.player_response.streamingData.formats[0].url,
                '-t', payload.duration,
                '-filter:v', `crop=iw*${width}:ih*${height}:iw*${left / 100}:ih*${top / 100}`,
                '-movflags', 'frag_keyframe+empty_moov',
                '-f', 'mp4', 'pipe:1'
            ];

            const proc = spawn(ffmpegPath, args);

            proc.on('error', (err) => {
                console.log('Cut file error', err)
                rej(err);
            });
            proc.stderr.setEncoding('utf8');
            let output = '';
            proc.stderr
                .on('data', c => { output += c; });
            proc.stdout
                .on('data', c => {
                    readableStream.push(c);
                });

            proc.on('exit', (code) => {
                if (code) {
                    rej({ code: code, message: output });
                } else {
                    readableStream.push(null);
                    res(readableStream);
                }
            });

            proc.on('close', function() {
                console.log('kill')
                proc.kill();
            });
          } catch(err) {
            rej(err);
          }
    });
};

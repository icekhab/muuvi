const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const path = require('path');
const Stream = require('stream');
const spawn = require('child_process').spawn;

module.exports = (videoStream, callback) => {
    const readableStream = new Stream.Readable()
    readableStream._read = () => {}
    try {
        const logoPath = path.join(__dirname, '../static/muuvi_text.png');
        const args = [
            '-i', 'pipe:0',
            '-i', logoPath,
            "-filter_complex" ,"[1:v][0:v]scale2ref=iw*0.13:(iw*0.13)*0.2[logo1][base]; [logo1]lut=a=val*0.6[a]; [base][a]overlay=x=W-w-10:y=H-h-10:format=rgb,format=yuv420p",
            '-movflags', 'frag_keyframe+empty_moov',
            '-f', 'mp4', 'pipe:1'
        ];

        const proc = spawn(ffmpegPath, args);

        videoStream.pipe(proc.stdin);

        proc.on('error', (err) => {
            console.log('Cut file error', err)
            callback(err);
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
                callback({ code: code, message: output });
            } else {
                readableStream.push(null);
                callback(null, readableStream);
            }
        });

        proc.on('close', function() {
            console.log('kill')
            proc.kill();
        });
    } catch(err) {
        callback(err);
    }
};

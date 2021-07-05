const ytdl = require('ytdl-core');
const ffmpeg = require('./ffmpeg');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid').v4;

const writeVideo = (stream) => {
  const filename = `${uuid()}.mp4`
  const filePath = path.join(__dirname, '../.temporary/input', filename);

  return new Promise((resolve, reject) =>
    stream
      .on('error', reject)
      .pipe(fs.createWriteStream(filePath))
      .on('error', reject)
      .on("finish", () => resolve({ filePath }))
  );
};

module.exports = (payload) => {
    return new Promise(async (res, rej) => {
        try {
            console.log('start');
            const { top = 0, bottom = 0, left = 0, right = 0 } = payload.cutPoints || {};
            const width = 1 - (left/100) - (right/100);
            const height = 1 - (top/100) - (bottom/100);
        
            const stream = ytdl(payload.link, { format: 'mp4' });
          
            const outputFilename = `${uuid()}.mp4`
            const outputFilePath = path.join(__dirname, '../.temporary/output', outputFilename);
          
            const { filePath } = await writeVideo(stream);
            console.log('write video');
          
            ffmpeg(filePath)
              .inputFormat('mp4')
              .videoFilters(`crop=iw*${width}:ih*${height}:iw*${left/100}:ih*${top/100}`)
              .setStartTime(payload.startTime)
              .setDuration(payload.duration)
              .outputFormat('mp4')
              .output(outputFilePath)
              .on('end', () => res(fs.createReadStream(outputFilePath)))
              .on('error', rej)
              .run();
          } catch(err) {
            rej(err);
          }
    });
};

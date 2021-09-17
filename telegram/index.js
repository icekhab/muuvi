const { Telegraf, Markup } = require('telegraf');
const cutFile = require('../services/cutFile');
const Analytics = require('../services/analytics');
const welcomeLetter = require('./welcomeLetter');


const { TOKEN: token } = process.env;
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}

let state = {};

const bot = new Telegraf(token)

bot.use(Telegraf.log());
bot.use((ctx, next) => {
  const userId = ctx.chat.id;
  ctx.analytics = new Analytics(userId);

  return next();
});

const menu = (ctx) => {
  const userId = ctx.chat.id;
  state[userId] = undefined;
  return ctx.reply('Choose how to trim video', Markup.inlineKeyboard([
        Markup.button.callback('By time', 'cut_time'),
        Markup.button.callback('By time and size', 'cut_time_and_size'),
      ])
  );
}


bot.command('menu', (ctx) => {
  ctx.analytics.menu();
  return menu(ctx);
});

bot.start((ctx) => {
  ctx.analytics.start();
  const userId = ctx.chat.id;
  state[userId] = undefined;
  return ctx.reply(welcomeLetter)
});

bot.action('menu',  (ctx) => {
  ctx.analytics.menuAfterFinish();
  return menu(ctx);
});

bot.action('cut_time', async (ctx) => {
  // ctx.answerCbQuery();
  ctx.analytics.editByTheTime();
  const userId = ctx.chat.id;
  if (!state[userId])
    state[userId] = {};
  state[userId].action = 'cut_time';
  state[userId].step = 1;
  
  ctx.reply('Enter youtube link');
  return true;
});

bot.action('cut_time_and_size', async (ctx) => {
  // ctx.answerCbQuery();
  ctx.analytics.editByTheTimeAndSize();
  const userId = ctx.chat.id;
  if (!state[userId])
    state[userId] = {};
  state[userId].action = 'cut_time_and_size';
  state[userId].step = 1;
  
  ctx.reply('Enter youtube link');
  return true;
});

const youtubeRegex = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;
const startTimeRegex = /^([0-9]+(\.([0-9])?[0-9])?)$|^((([0-1]?[0-9]|2[0-3]):)?[0-5][0-9]:[0-5][0-9]+(\.([0-9])?[0-9])?)$/;
const durationRegex = /^([0-9]+(\.([0-9])?[0-9])?)$/;
const cutPointsRegex = /^(([0-9])?[0-9])$|^100$/;

const convertTime = (time) => {
  const partsTime = time.toString().split('.');
  if(partsTime.length === 1) return time;

  let ms = (1000*Number(`0.${partsTime[1]}`)).toString();
  if(ms.length > 3) {
    ms = ms.substring(0, 3);
  } else if (ms.length < 3) {
    const zeros = new Array(3 - ms.length).fill('0');
    ms = [...zeros, ms].join('');
  }

  return `${partsTime[0]}.${ms.toString()}`;
};

const processVideo = async (ctx) => {
  const userId = ctx.message.from.id;
  ctx.reply('Video processing has started, please wait, it may take a few minutes');
  const file = await cutFile(state[userId].payload);

  await ctx.replyWithVideo({
    source: file,
  }, Markup.inlineKeyboard([
    Markup.button.callback('Main menu', 'menu'),
    Markup.button.callback('Edit result', 'edit_result'),
  ]));

  ctx.analytics.finish();

  return true;
}

bot.on('text', async ctx => {
  try {
    const text = ctx.message.text;
    const userId = ctx.message.from.id;

    const action = state[userId]?.action;
    const step = state[userId]?.step;

    switch (action) {
      case 'cut_time': {
        switch(step) {
          case 1: {
            if(youtubeRegex.test(text)) {
              ctx.analytics.enteredYoutubeLink();

              state[userId].payload = {
                link: text
              };

              state[userId].step = 2;

              return ctx.reply('Enter start time (in seconds or mm:ss or hh:mm:ss)');
            }

            return ctx.reply('Incorrect youtube link, try again');
          }
          case 2: {
            if(startTimeRegex.test(text)) {
              ctx.analytics.enteredStartTime();
              state[userId].payload = {
                ...state[userId].payload,
                startTime: convertTime(text)
              };

              state[userId].step = 3;

              return ctx.reply('Enter duration (in seconds)');
            }

            return ctx.reply('Incorrect start time (in seconds or mm:ss or hh:mm:ss), try again');
          }
          case 3: {
            if(durationRegex.test(text)) {
              ctx.analytics.enteredDuration();
              state[userId].payload = {
                ...state[userId].payload,
                duration: Number(text)
              };
              await processVideo(ctx);
              return true;
            }

            return ctx.reply('Incorrect duration (in seconds), try again');
          }
        }
        break;
      }
      case 'cut_time_and_size': {
        switch(step) {
          case 1: {
            if(youtubeRegex.test(text)) {
              ctx.analytics.enteredYoutubeLink();
              state[userId].payload = {
                link: text
              };

              state[userId].step = 2;

              return ctx.reply('Enter start time (in seconds or mm:ss or hh:mm:ss)');
            }

            return ctx.reply('Incorrect youtube link, try again');
          }
          case 2: {
            if(startTimeRegex.test(text)) {
              ctx.analytics.enteredStartTime();
              state[userId].payload = {
                ...state[userId].payload,
                startTime: convertTime(text),
              };

              state[userId].step = 3;

              return ctx.reply('Enter duration (in seconds)');
            }

            return ctx.reply('Incorrect start time (in seconds or mm:ss or hh:mm:ss), try again');
          }
          case 3: {
            if(durationRegex.test(text)) {
              ctx.analytics.enteredDuration();
              state[userId].payload = {
                ...state[userId].payload,
                duration: Number(text)
              };

              state[userId].step = 4;

              return ctx.reply('How much to cut from the top (in percents)');
            }

            return ctx.reply('Value must be from 0 to 100, try again');
          }
          case 4: {
            if(cutPointsRegex.test(text)) {
              ctx.analytics.enteredCutPointTop();
              state[userId].payload = {
                ...state[userId].payload,
                cutPoints: {
                  top: Number(text)
                },
              };

              state[userId].step = 5;

              return ctx.reply('from the bottom (in percents)');
            }

            return ctx.reply('Value must be from 0 to 100, try again');
          }
          case 5: {
            if(cutPointsRegex.test(text)) {
              ctx.analytics.enteredCutPointBottom();
              state[userId].payload = {
                ...state[userId].payload,
                cutPoints: {
                  ...state[userId].payload.cutPoints,
                  bottom: Number(text)
                },
              };

              state[userId].step = 6;

              return ctx.reply('from the left (in percents)');
            }

            return ctx.reply('Value must be from 0 to 100, try again');
          }
          case 6: {
            if(cutPointsRegex.test(text)) {
              ctx.analytics.enteredCutPointLeft();
              state[userId].payload = {
                ...state[userId].payload,
                cutPoints: {
                  ...state[userId].payload.cutPoints,
                  left: Number(text)
                },
              };

              state[userId].step = 7;

              return ctx.reply('from the right (in percents)');
            }

            return ctx.reply('Value must be from 0 to 100, try again');
          }
          case 7: {
            if(cutPointsRegex.test(text)) {
              ctx.analytics.enteredCutPointRight();
              state[userId].payload = {
                ...state[userId].payload,
                cutPoints: {
                  ...state[userId].payload.cutPoints,
                  right: Number(text)
                },
              };

              await processVideo(ctx);
              return true;
            }

            return ctx.reply('Value must be from 0 to 100, try again');
          }
        }
        break;
      }
      case 'edit_start': {
        if(durationRegex.test(text)) {
          const timeline = state[userId].timeline;
          const startTime = state[userId].payload.startTime;
          const parts = startTime.split('.');

          const [seconds, ...rest] = parts[0].split(':').reverse();
          const ms = parts[1];

          const time = ms ? Number(seconds) + (Number(ms) / 1000) : Number(seconds);
          let result;
          if (timeline === 'left') {
            ctx.analytics.enteredMoveTimeToLeftAfterFinish();
            result = Number(time) - Number(text);
            state[userId].payload.duration += Number(text);
          } else {
            ctx.analytics.enteredMoveTimeToRightAfterFinish();
            result = Number(time) + Number(text);
            state[userId].payload.duration -= Number(text);
          }

          state[userId].payload.startTime = [...(rest.reverse()), convertTime(result)].join(':');

          await processVideo(ctx);
          return true;
        }

        return ctx.reply('Incorrect offset (in seconds), try again');
      }
      case 'edit_end': {
        if(durationRegex.test(text)) {
          const timeline = state[userId]?.timeline;
          if (timeline === 'left') {
            ctx.analytics.enteredMoveTimeToLeftAfterFinish();
            state[userId].payload.duration -= Number(text);
          } else if (timeline === 'right') {
            ctx.analytics.enteredMoveTimeToRightAfterFinish();
            state[userId].payload.duration += Number(text);
          }

          await processVideo(ctx);
          return true;
        }

        return ctx.reply('Incorrect offset (in seconds), try again');
      }
      case 'edit_trim': {
        switch(step) {
          case 1: {
            if(cutPointsRegex.test(text)) {
              ctx.analytics.enteredCutPointTopAfterFinish();
              state[userId].payload = {
                ...state[userId].payload,
                cutPoints: {
                  top: Number(text)
                },
              };

              state[userId].step = 2;

              return ctx.reply('from the bottom (in percents)');
            }

            return ctx.reply('Value must be from 0 to 100, try again');
          }
          case 2: {
            if(cutPointsRegex.test(text)) {
              ctx.analytics.enteredCutPointBottomAfterFinish();
              state[userId].payload = {
                ...state[userId].payload,
                cutPoints: {
                  ...state[userId].payload.cutPoints,
                  bottom: Number(text)
                },
              };

              state[userId].step = 3;

              return ctx.reply('from the left (in percents)');
            }

            return ctx.reply('Value must be from 0 to 100, try again');
          }
          case 3: {
            if(cutPointsRegex.test(text)) {
              ctx.analytics.enteredCutPointLeftAfterFinish();
              state[userId].payload = {
                ...state[userId].payload,
                cutPoints: {
                  ...state[userId].payload.cutPoints,
                  left: Number(text)
                },
              };

              state[userId].step = 4;

              return ctx.reply('from the right (in percents)');
            }

            return ctx.reply('Value must be from 0 to 100, try again');
          }
          case 4: {
            if(cutPointsRegex.test(text)) {
              ctx.analytics.enteredCutPointRightAfterFinish();
              state[userId].payload = {
                ...state[userId].payload,
                cutPoints: {
                  ...state[userId].payload.cutPoints,
                  right: Number(text)
                },
              };

              await processVideo(ctx);
              return true;
            }

            return ctx.reply('Value must be from 0 to 100, try again');
          }
        }
        break;
      }
      default:
        ctx.reply('Enter /menu to select options');
    }
  } catch (e) {
    console.log(e);
    await ctx.reply('Oops, error :( You could try again');
    return menu(ctx);
  }
});

bot.action('edit_result',  (ctx) => {
  ctx.analytics.editAfterFinish();
  return ctx.reply('Edit time or trim?', Markup.inlineKeyboard([
        Markup.button.callback('Time', 'edit_time'),
        Markup.button.callback('Trim', 'edit_trim'),
      ]));
});

bot.action('edit_time',  (ctx) => {
  ctx.analytics.editTimeAfterFinish();
  return ctx.reply('Edit start or end time?', Markup.inlineKeyboard([
    Markup.button.callback('Start', 'edit_start'),
    Markup.button.callback('End', 'edit_end'),
  ]));
});

bot.action('edit_start',  (ctx) => {
  ctx.analytics.editStartTimeAfterFinish();
  const userId = ctx.chat.id;
  state[userId].action = 'edit_start';
  return ctx.reply('Move timeline to the left or to the right', Markup.inlineKeyboard([
    Markup.button.callback('Left', 'timeline_left'),
    Markup.button.callback('Right', 'timeline_right'),
  ]));
});


bot.action('edit_end',  (ctx) => {
  ctx.analytics.editEndTimeAfterFinish();
  const userId = ctx.chat.id;
  state[userId].action = 'edit_end';
  return ctx.reply('Move timeline to the left or to the right', Markup.inlineKeyboard([
    Markup.button.callback('Left', 'timeline_left'),
    Markup.button.callback('Right', 'timeline_right'),
  ]));
});

bot.action('timeline_left',  (ctx) => {
  ctx.analytics.moveTimeToLeftAfterFinish();
  const userId = ctx.chat.id;
  state[userId].timeline = 'left';
  return ctx.reply('Enter offset in seconds (for example 2.5)');
});

bot.action('timeline_right',  (ctx) => {
  ctx.analytics.moveTimeToRightAfterFinish();
  const userId = ctx.chat.id;
  state[userId].timeline = 'right';
  return ctx.reply('Enter offset in seconds (for example 1.5)');
});


bot.action('edit_trim',  (ctx) => {
  ctx.analytics.editTrimAfterFinish();
  const userId = ctx.chat.id;
  state[userId].action = 'edit_trim';
  state[userId].step = 1;
  return ctx.reply('How much to cut from the top (in percents)');
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

module.exports = bot;
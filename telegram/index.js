const { Telegraf, Markup } = require('telegraf');
const cutFile = require('../services/cutFile');

const { TOKEN: token } = process.env;
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}

let state = {};

const bot = new Telegraf(token)

bot.use(Telegraf.log());
bot.command('menu', async (ctx) => {
  return await ctx.reply('Choose how to trim video', Markup.inlineKeyboard([
    Markup.button.callback('By time', 'cut_time'),
    Markup.button.callback('By time and size', 'cut_time_and_size'),
  ])
  )
});

bot.action('cut_time', async (ctx) => {
  // ctx.answerCbQuery();
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
  const userId = ctx.chat.id;
  if (!state[userId])
    state[userId] = {};
  state[userId].action = 'cut_time_and_size';
  state[userId].step = 1;
  
  ctx.reply('Enter youtube link');
  return true;
});

const youtubeRegex = /^(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;
const startTimeRegex = /^([0-9]+(.([0-9])?[0-9])?)$|^((([0-1]?[0-9]|2[0-3]):)?[0-5][0-9]:[0-5][0-9]+(.([0-9])?[0-9])?)$/;
const durationRegex = /^([0-9]+)$/;
const cutPointsRegex = /^(([0-9])?[0-9])$|^100$/;

const convertTime = (time) => {
  const partsTime = time.split('.');
  if(partsTime.length === 1) return time;

  const ms = 1000/Number(partsTime[1]);
  return `${partsTime[0]}.${ms}`;
};

bot.on('text', async ctx => {
  const text = ctx.message.text;
  const userId = ctx.message.from.id;

  const action = state[userId]?.action;
  const step = state[userId]?.step;

  switch (action) {
    case 'cut_time': {
      switch(step) {
        case 1: {
          if(youtubeRegex.test(text)) {
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
            state[userId].payload = {
              ...state[userId].payload,
              startTime: text
            };
  
            state[userId].step = 3;
  
            return ctx.reply('Enter duration (in seconds)');
          }

          return ctx.reply('Incorrect start time (in seconds or mm:ss or hh:mm:ss), try again');
        }
        case 3: {
          if(durationRegex.test(text)) {
            state[userId].payload = {
              ...state[userId].payload,
              duration: text
            };
  
            try {
              ctx.reply('Video processing has started, please wait, it may take a few minutes');
              const file = await cutFile(state[userId].payload);
  
              return ctx.replyWithVideo({
                source: file,
              });
            } catch(err) {
              console.log(err);
              return ctx.reply('Oops, error');
            } finally {
              state[userId] = undefined;
            }
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
            state[userId].payload = {
              ...state[userId].payload,
              duration: text
            };
  
            state[userId].step = 4;
  
            return ctx.reply('How much to cut from the top (in percents)');
          }

          return ctx.reply('Value must be from 0 to 100, try again');
        }
        case 4: {
          if(cutPointsRegex.test(text)) {
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
            state[userId].payload = {
              ...state[userId].payload,
              cutPoints: {
                ...state[userId].payload.cutPoints,
                right: Number(text)
              },
            };
  
            try {
              cutFile(state[userId].payload)
              .then((file) => ctx.replyWithVideo({ source: file }))
              .catch((err) => {
                console.log(err);
                return ctx.reply('Oops, error');
              })
              .finally(() => { state[userId] = undefined });

              return ctx.reply('Video processing has started, please wait, it may take a few minutes');
            } catch(err) {
              console.log(err);
              return ctx.reply('Oops, error');
            }
          }

          return ctx.reply('Value must be from 0 to 100, try again');
        }
      }
      break;
    }
    default:
      ctx.reply('Enter /menu to select options');
  }
})


bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

module.exports = bot;
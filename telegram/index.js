const { Telegraf, Markup } = require('telegraf');
const cutFile = require('../services/cutFile');

const { TOKEN: token } = process.env;
if (token === undefined) {
  throw new Error('BOT_TOKEN must be provided!')
}

let state = {};

const bot = new Telegraf(token)

bot.use(Telegraf.log());
bot.command('menu', (ctx) => {
  const userId = ctx.chat.id;
  state[userId] = undefined;
  return ctx.reply('Choose how to trim video', Markup.inlineKeyboard([
    Markup.button.callback('By time', 'cut_time'),
    Markup.button.callback('By time and size', 'cut_time_and_size'),
  ])
  )
});

bot.action('menu',  (ctx) => {
  const userId = ctx.chat.id;
  state[userId] = undefined;
  return ctx.reply('Choose how to trim video', Markup.inlineKeyboard([
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
const durationRegex = /^([0-9]+(.([0-9])?[0-9])?)$/;
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
              startTime: convertTime(text)
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
              duration: Number(text)
            };
  
            try {
              ctx.reply('Video processing has started, please wait, it may take a few minutes');
              const file = await cutFile(state[userId].payload);
  
              return ctx.replyWithVideo({
                source: file,
              }, Markup.inlineKeyboard([
                Markup.button.callback('Main menu', 'menu'),
                Markup.button.callback('Edit result', 'edit_result'),
              ]));
            } catch(err) {
              console.log(err);
              return ctx.reply('Oops, error');
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
              duration: Number(text)
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
              ctx.reply('Video processing has started, please wait, it may take a few minutes');
              const file = await cutFile(state[userId].payload);

              return ctx.replyWithVideo({
                source: file,
              }, Markup.inlineKeyboard([
                Markup.button.callback('Main menu', 'menu'),
                Markup.button.callback('Edit result', 'edit_result'),
              ]));
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
          result = Number(time) - Number(text);
          state[userId].payload.duration += Number(text);
        } else {
          result = Number(time) + Number(text);
          state[userId].payload.duration -= Number(text);
        }

        state[userId].payload.startTime = [...(rest.reverse()), convertTime(result)].join(':');

        try {
          ctx.reply('Video processing has started, please wait, it may take a few minutes');
          const file = await cutFile(state[userId].payload);

          return ctx.replyWithVideo({
            source: file,
          }, Markup.inlineKeyboard([
            Markup.button.callback('Main menu', 'menu'),
            Markup.button.callback('Edit result', 'edit_result'),
          ]));
        } catch(err) {
          console.log(err);
          return ctx.reply('Oops, error');
        }
      }

      return ctx.reply('Incorrect offset (in seconds), try again');
    }
    case 'edit_end': {
      if(durationRegex.test(text)) {
        const timeline = state[userId]?.timeline;
        if (timeline === 'left') {
          state[userId].payload.duration -= Number(text);
        } else if (timeline === 'right') {
          state[userId].payload.duration += Number(text);
        }

        try {
          ctx.reply('Video processing has started, please wait, it may take a few minutes');
          const file = await cutFile(state[userId].payload);

          return ctx.replyWithVideo({
            source: file,
          }, Markup.inlineKeyboard([
            Markup.button.callback('Main menu', 'menu'),
            Markup.button.callback('Edit result', 'edit_result'),
          ]));
        } catch(err) {
          console.log(err);
          return ctx.reply('Oops, error');
        }
      }

      return ctx.reply('Incorrect offset (in seconds), try again');
    }
    case 'edit_trim': {
      switch(step) {
        case 1: {
          if(cutPointsRegex.test(text)) {
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
            state[userId].payload = {
              ...state[userId].payload,
              cutPoints: {
                ...state[userId].payload.cutPoints,
                right: Number(text)
              },
            };

            try {
              ctx.reply('Video processing has started, please wait, it may take a few minutes');
              const file = await cutFile(state[userId].payload);

              return ctx.replyWithVideo({
                source: file,
              }, Markup.inlineKeyboard([
                Markup.button.callback('Main menu', 'menu'),
                Markup.button.callback('Edit result', 'edit_result'),
              ]));
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
});

bot.action('edit_result',  (ctx) => {
  return ctx.reply('Edit time or trim?', Markup.inlineKeyboard([
        Markup.button.callback('Time', 'edit_time'),
        Markup.button.callback('Trim', 'edit_trim'),
      ]));
});

bot.action('edit_time',  (ctx) => {
  return ctx.reply('Edit start or end time?', Markup.inlineKeyboard([
    Markup.button.callback('Start', 'edit_start'),
    Markup.button.callback('End', 'edit_end'),
  ]));
});

bot.action('edit_start',  (ctx) => {
  const userId = ctx.chat.id;
  state[userId].action = 'edit_start';
  return ctx.reply('Move timeline to the left or to the right', Markup.inlineKeyboard([
    Markup.button.callback('Left', 'timeline_left'),
    Markup.button.callback('Right', 'timeline_right'),
  ]));
});


bot.action('edit_end',  (ctx) => {
  const userId = ctx.chat.id;
  state[userId].action = 'edit_end';
  return ctx.reply('Move timeline to the left or to the right', Markup.inlineKeyboard([
    Markup.button.callback('Left', 'timeline_left'),
    Markup.button.callback('Right', 'timeline_right'),
  ]));
});

bot.action('timeline_left',  (ctx) => {
  const userId = ctx.chat.id;
  state[userId].timeline = 'left';
  return ctx.reply('Enter offset in seconds (for example 2.5)');
});

bot.action('timeline_right',  (ctx) => {
  const userId = ctx.chat.id;
  state[userId].timeline = 'right';
  return ctx.reply('Enter offset in seconds (for example 1.5)');
});


bot.action('edit_trim',  (ctx) => {
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
const { Telegraf, Markup } = require('telegraf');
const { Client } = require('basic-ftp');
const axios = require('axios');
const stream = require('stream');

const bot = new Telegraf('6657683018:AAFusuEEsWkJn2Bdq3piVuagfefEl4M6TA4');
const ftp = new Client();

// Используем переменную извне для хранения выбранной папки
let selectedFolder = null;

bot.start((ctx) => {
  const userName = ctx.message.from.first_name;
  ctx.reply(
    `Привет, ${userName}! Выбери район а потом отправь мне видео, и я все сделаю.`,
    Markup.inlineKeyboard([
      Markup.button.callback('Советский р-н', 'folder_sovet'),
      Markup.button.callback('Фjjокинский р-н', 'folder_fok'),
    ])
  );
});

bot.action('folder_sovet', (ctx) => {
  selectedFolder = 'sovet';
  ctx.answerCbQuery('Выбрана папка sovet');
});

bot.action('folder_fok', (ctx) => {
  selectedFolder = 'fok';
  ctx.answerCbQuery('Выбрана папка fok');
});

bot.on('video', async (ctx) => {
  // Проверяем, выбрана ли папка
  if (!selectedFolder) {
    return ctx.reply('Пожалуйста, выберите папку для загрузки сначала.');
  }

  const video = ctx.message.video;

  try {
    // Получаем прямую ссылку на файл
    const fileLink = await ctx.telegram.getFileLink(video.file_id);

    // Извлекаем имя файла из URL
    const urlObject = new URL(fileLink);
    const fileName = urlObject.pathname.split('/').pop();

    // Подключаемся к FTP серверу
    await ftp.access({
      host: '31.132.164.205',
      user: 'ded',
      password: 'xrentebe3220!',
    });

    // Отправляем видео файл напрямую на FTP сервер
    const response = await axios.get(fileLink, { responseType: 'stream' });
    const videoStream = response.data;

    // Создаем поток на основе видео потока
    const readStream = stream.PassThrough();
    videoStream.pipe(readStream);

    // Загружаем файл на FTP сервер в выбранную папку
    await ftp.uploadFrom(readStream, `/video/${selectedFolder}/${fileName}`);

    // Закрываем соединение с FTP сервером

    // Отвечаем пользователю
    ctx.reply(`Видео "${fileName}" успешно загружено в папку "${selectedFolder}"!`);

    // Сбрасываем выбранную папку
    selectedFolder = null;
  } catch (error) {
    console.error('Произошла ошибка:', error);
    ctx.reply('Произошла ошибка при загрузке видео на FTP сервер.');
  } finally {
    // Закрываем соединение с FTP сервером в любом случае
    await ftp.close();
  }
});

bot.launch();

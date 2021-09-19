/** @format */
/* eslint-disable require-jsdoc */

const p5 = require('node-p5');
const request = require('request');
const fs = require('fs');
const {Storage} = require('@google-cloud/storage');
const winston = require('winston');
const {LoggingWinston} = require('@google-cloud/logging-winston');
const loggingWinston = new LoggingWinston();

// initialize all constants
const side = 1440;
const numSlices = 3;
const slice = side / numSlices;
const circleSize = side / (numSlices + 1);
const randomLimit = 100000;
const dir = 'images/';
const canvasName = getRandomInt(randomLimit).toString();
const storage = new Storage({keyFilename: 'key.json'});
const gcsPrefix = 'https://storage.googleapis.com/';
let filePath;

// initialize Winston logger

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    loggingWinston,
  ],
});

// Writes some log entries
logger.error('warp nacelles offline');
logger.info('shields at 99%');

// helper function for random integer generation
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

// create image
function sketch(p) {
  p.setup = () => {
    const canvas = p.createCanvas(side, side);
    p.colorMode(p.HSB);
    p.background(p.random(255), p.random(255), p.random(255));
    p.strokeWeight(0);
    p.noLoop();
    setTimeout(() => {
      p.saveCanvas(canvas, dir.concat(canvasName), 'jpg').then((filename) => {
        console.log(`saved the canvas as ${filename}`);
        const destFileName = canvasName + '.jpg';
        filePath = filename;
        config = parseConfig();
        bucketName = config.bucket_name;
        caption = createCaption(canvasName, config);
        uploadFile(bucketName, filePath, destFileName).catch(console.error);
        const gcsImagePath = gcsPrefix + bucketName + '/' + destFileName;
        createIGMedia(config, gcsImagePath, caption);
      });
    }, 100);
  };
  p.draw = () => {
    for (let i = 0; i < numSlices + 1; i++) {
      for (let j = 0; j < numSlices + 1; j++) {
        p.fill(p.random(255), p.random(255), p.random(255));
        p.stroke(0);
        p.circle(i * slice, j * slice, circleSize);
      }
    }
  };
}

p5.createSketch(sketch);

// parse config file
function parseConfig() {
  const rawdata = fs.readFileSync('config.json');
  const config = JSON.parse(rawdata);
  return config;
}

// upload file to GCS for public download
async function uploadFile(bucketName, filePath, destFileName) {
  await storage.bucket(bucketName).upload(filePath, {
    destination: destFileName,
  });
  console.log(`${filePath} uploaded to ${bucketName}`);
}

// create media container
function createIGMedia(config, imageURL, caption) {
  const containerCreationURL =
    'https://graph.facebook.com/' + config.ig_user_id + '/media?';
  console.log(caption);
  request.post(
      {
        url: containerCreationURL,
        form: {
          image_url: imageURL,
          access_token: config.access_token,
          caption: caption,
        },
      },
      function(error, response, body) {
        const bodyObj = JSON.parse(body);
        console.log(bodyObj);
        const mediaContainerID = bodyObj.id;
        if (mediaContainerID != null) {
          publishMediaContainer(mediaContainerID, config);
        }
      },
  );
}

// publish media container
function publishMediaContainer(mediaContainerID, config) {
  const containerPublishURL =
    'https://graph.facebook.com/' + config.ig_user_id + '/media_publish?';
  request.post(
      {
        url: containerPublishURL,
        form: {
          creation_id: mediaContainerID,
          access_token: config.access_token,
        },
      },
      function(error, response, body) {
        const bodyObj = JSON.parse(body);
        console.log(bodyObj);
        if (bodyObj.error !== 'undefined') {
          console.log('Posting success!');
        }
        const igMediaID = bodyObj.id;
        commentOnMedia(config, igMediaID);
      },
  );
}

function createCaption(canvasName, config) {
  // You can't store template literals in a JSON config, so had to split
  // the caption string as follows to introduce a dynamic value.
  const caption = config.caption.start + canvasName + config.caption.end;
  return caption;
}

function commentOnMedia(config, igMediaID) {
  const commentMediaURL =
    'https://graph.facebook.com/' + igMediaID + '/comments?';
  setTimeout(() => {
    request.post(
        {
          url: commentMediaURL,
          form: {
            message: config.hashtags,
            access_token: config.access_token,
          },
        },
        function(error, response, body) {
          const bodyObj = JSON.parse(body);
          console.log(bodyObj);
          if (bodyObj.error !== 'undefined') {
            console.log('Comment success!');
          }
        },
    );
  }, 1000);
}

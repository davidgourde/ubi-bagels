
'use strict'

const express = require('express')
const proxy = require('express-http-proxy')
const bodyParser = require('body-parser')
const _ = require('lodash')
const config = require('./config')

// Mongodb (database)
const MongoClient = require('mongodb').MongoClient
const url = config('MONGODB_URL')
const mongoDbName = config('MONGODB_NAME')

// Nexmo (SMS)
const Nexmo = require('nexmo');
const nexmo = new Nexmo({
  apiKey: config('NEXMO_API_KEY'),
  apiSecret: config('NEXMO_API_SECRET')
});
const sender_number = config('SMS_SENDER_NUMBER')

let app = express()

if (config('PROXY_URI')) {
  app.use(proxy(config('PROXY_URI'), {
    forwardPath: (req, res) => { return require('url').parse(req.url).path }
  }))
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Inbound SMS Webhook
app.get('/inboundsms', function (req, res) {
  // Make sure it's not a Delivery Confirmation
  if (!req.query['status'] || !req.query['messageId']) {
    // Calling the numberInsight API to get the countryCode of the caller
    nexmo.numberInsight.get({ level: 'basic', number: req.query['msisdn'] }, function (err, insight) {
      if (err) throw err;
      // Make sure it's a Canadian number
      if (insight['country_code_iso3'] == 'CAN') {
        if (req.query['keyword'] != 'STOP') {
          let name = req.query['keyword'];
          if (name != null && name.length > 1) {
            name = name.charAt(0) + name.toLowerCase().slice(1);
          } else {
            name = '';
          }
          addToDb(name, req.query['msisdn']);
          res.sendStatus(201);
        } else {
          removeFromDb(req.query['msisdn']);
          res.sendStatus(204);
        }
      }
    });

  }
});

// Web page
app.use(express.static(__dirname + '/public'))
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.locals.sender_number = sender_number
app.get('/', function (req, res) {
  res.render('index.ejs')
});

app.listen(config('PORT'), (err) => {
  if (err) throw err

  console.log(`\n🚀  ubi-bagels LIVES on PORT ${config('PORT')}`);
})

function addToDb(name, number) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(mongoDbName);
    dbo.collection("users").updateOne({ "_id": number }, { '$set': { "_id": number, "name": name } }, { 'upsert': true }, function (err, res) {
      if (err) throw err;
      let message = 'Hello ' + name + ', you subscribed to Ubi-bagels notifications.\n\nText "STOP" to cancel.';
      sendConfirmationSMS(number, message);
      db.close();
    });
  });
}

function removeFromDb(number) {
  MongoClient.connect(url, function (err, db) {
    if (err) throw err;
    var dbo = db.db(mongoDbName);
    dbo.collection("users").deleteOne({ "_id": number }, function (err, res) {
      if (err) throw err;
      let message = 'You have been unregistered.\n\nReply with your name to register again.';
      sendConfirmationSMS(number, message);
      db.close();
    });
  });
}

function sendConfirmationSMS(number, message) {
  nexmo.message.sendSms(
    sender_number, number, message,
    (err, responseData) => {
      if (err) {
        console.log(err);
      } else {
        console.dir(responseData);
      }
    }
  );
}
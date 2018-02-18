
'use strict'

const _ = require('lodash')
const config = require('../config')
const Botkit = require('botkit')
// Nexmo (SMS)
const Nexmo = require('nexmo');
const nexmo = new Nexmo({
  apiKey: config('NEXMO_API_KEY'),
  apiSecret: config('NEXMO_API_SECRET')
});

const sender_number = config('SMS_SENDER_NUMBER')

var controller = Botkit.slackbot({})
var bot = controller.spawn({
  incoming_webhook: {
    url: config('WEBHOOK_URL')
  }
})

// Mongodb (database)
const MongoClient = require('mongodb').MongoClient
const url = config('MONGODB_URL')
const mongoDbName = config('MONGODB_NAME')

if (lastFriday()) {
  // Slack notification
  bot.sendWebhook({
    text: 'Last Friday of the month means... BAAAAAGEL TIME!!',
    channel: '#general',
  }, function (err, res) {
    if (err) {
      console.log(err)
    }
  });

  //SMS notifications using Mongodb users
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    var dbo = db.db(mongoDbName);
    // Getting the list of all users
    dbo.collection("users").find({}).toArray(function(err, result) {
      if (err) throw err;
      // Sending an SMS to every user (_id is the user phone number)
      result.forEach(function(user, index) {
        // 1.5s delay between calls, Canadian SMS limitation
        setTimeout(function(){ sendSMS(user._id, user.name); }, index * 1500);
      });
      db.close();
    });
  });
}

// A function to send SMS
function sendSMS(number, name) {
  nexmo.message.sendSms(
    sender_number, number, 'Last Friday of the month means... BAAAAAGEL TIME!!  Yeah that\'s right ' + name + ', free bagels!',
    (err, responseData) => {
      if (err) {
        console.log(err);
      } else {
        console.dir(responseData);
      }
    }
  );
}

// A function to test if we are the last friday of the month
function lastFriday() {
  var date = new Date();

  var year = date.getFullYear();
  var month = date.getMonth();
  var day = date.getDate();

  var i, last_day;
  i = 0;
  while (true) {
    last_day = new Date(year, month + 1, i);
    if (last_day.getDay() === 5) {
      if (day === last_day.getDate()) {
        return true;
      } else {
        return false;
      }
    }
    i -= 1;
  }
};
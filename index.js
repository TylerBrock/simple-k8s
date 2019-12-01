const express = require('express');
const MongoClient = require('mongodb');
const useragent = require('useragent');
const assert = require('assert');

const app = express();
const port = 3000;

const mongouri = process.env.MONGO_URI || 'mongodb://localhost:27017';

// express server ref
let server;

// mongodb refs
let mongoclient;
let db;
let visitors;
let counters;

// keep track of number of requests
let counter = 0;

// fetch latest useragents
useragent(true);

app.get('/', (req, res) => {
  const agent = useragent.parse(req.headers['user-agent'], req.query.jsuseragent);
  const date = new Date();
  const data = Object.assign(agent.toJSON(), { ts: date });
  visitors.insertOne(data);
  counters.findOneAndUpdate(
    { _id: 'visitors' },
    { $inc: { count: 1 } },
    { upsert: true, returnOriginal: false }
  ).then((result) => {
    res.send(`Hello World! ${result.value.count}`);
  });
});

MongoClient.connect(mongouri, { useNewUrlParser:true }, (err, client) => {
  if (err) {
    console.error(`Could not connect to MongoDB at ${mongouri}`);
    process.exit(2);
  }
  mongoclient = client;
  db = client.db('k8s-test');
  visitors = db.collection('visitors');
  counters = db.collection('counters');
  server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));
});


function shutDown() {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
      mongoclient.close().then(() => {
        console.log('Closed out remaining connections');
        process.exit(0);
      });
    });

    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

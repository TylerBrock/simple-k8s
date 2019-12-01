const express = require('express');
const Sequelize = require('sequelize');
const useragent = require('useragent');
const assert = require('assert');

const app = express();
const port = 3000;

const pgurl = process.env.PG_URI || 'postgres://localhost:5432';

// express server ref
let server;

// keep track of number of requests
let counter = 0;

// fetch latest useragents
useragent(true);

const sequelize = new Sequelize(pgurl);

class Visitor extends Sequelize.Model {}
Visitor.init({
  data: Sequelize.JSONB,
}, { sequelize, modelName: 'visitor' });

class Counter extends Sequelize.Model {}
Counter.init({
  type: Sequelize.STRING,
  count: Sequelize.INTEGER,
}, { sequelize, modelName: 'counter' });

sequelize
  .authenticate()
  .then(async () => {
    console.log('Connected to database sucessfully');
    await Visitor.sync();
    await Counter.sync();
    console.log('Synchronized models');
    server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

app.get('/', async (req, res) => {
  const agent = useragent.parse(req.headers['user-agent'], req.query.jsuseragent);
  const date = new Date();
  const data = Object.assign(agent.toJSON(), { ts: date });

  await Visitor.create({ data });

  const [counter, created] = await Counter.findOrCreate({
    where: { type: 'visitor' },
    defaults: { count: 0 },
  });

  counter.count++;
  await counter.save();

  res.send(`Hello World! ${counter.count}`);
});

function shutDown() {
    console.log('Received kill signal, shutting down gracefully');
    server.close(() => {
      console.log('Closed Express server');
      sequelize.close().then(() => {
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

const express = require('express');
const path = require('path');
const fs = require('fs');

const routes = express.Router();

routes.get('/', (req, res, next) => {
  res.send({ 'msg': 'Server is up and running !' })
})

/**
 * Reads from the data file game-data.json and returns the contents
 */
routes.get('/gameInfo', async(req, res, next) => {
  fs.readFile(path.join(__dirname, '../data/game-data.json'), (err, data) => {
    if (err) {
      res.send({});
    }
    return res.json(JSON.parse(data))
  })
});

routes.get('*', (req, res, next) => {
  res.status(404).send({ 'msg': 'not found' })
})


module.exports = routes;
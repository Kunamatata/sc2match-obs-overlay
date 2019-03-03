const express = require('express');
const axios = require('axios');
const fs = require('fs');
const StarcraftManager = require('./libs/StarcraftManager');

const app = express();
const port = 3000;
const routes = require('./routes/');

const clientGameURL = 'http://localhost:6119/game';
const unmaskedURL = 'http://sc2unmasked.com/API/Player?';

const conf = require('./configs/conf.json');

const starcraftManager = new StarcraftManager();

app.use(express.static('public'));
app.use('/api', routes);

app.listen(port, () => console.log(`Listening on port: ${port}!`));

function writeFile(file, obj) {
  fs.writeFile(file, obj, (err) => {
    if (err) {
      throw err;
    }
    console.log('The file was written to.');
  });
}

async function getClientData() {
  try {
    const { data } = await axios.get(clientGameURL);
    return data;
  } catch (err) {
    throw new Error('No game data available from the starcraft 2 client server');
  }
}

function processClientData(data) {
  let gameInfo = {};
  if (data !== null && data.players.length > 1) {
    gameInfo = {
      server: conf.server,

      players: [{
          name: data.players[0].name,
          race: data.players[0].race,
        },
        {
          name: data.players[1].name,
          race: data.players[1].race,
        },
      ],
    };

    return gameInfo;
  }
  return gameInfo.players = [];
}

/**
 * Allows to get the data of both players on unmasked and potentially unmask a barcode or smurf
 */
async function getUnmaskedData(gameInfo) {
  const queries = [];
  gameInfo.players.forEach((player) => {
    console.log(player);
    queries.push(`${unmaskedURL}name=${player.name}&race=${player.race[0]}&server=${gameInfo.server}`);
  });
  console.log(queries);
  const response = await Promise.all(queries.map(query => axios.get(query)));
  // console.log(response[0].data, response[1].data);

  if (response[0].data.players.length > 0 && response[1].data.players.length > 0) {
    // Allows to sort a list of players recognized from unmasked by sorting by last_played. We are taking the player in the list that has most recently played. (Might want to use .filter)
    response[0].data.players.sort((a, b) => b.last_played.replace(/[a-zA-Z()/]*/ig, '') - a.last_played.replace(/[a-zA-Z()/]*/ig, ''));
    response[1].data.players.sort((a, b) => b.last_played.replace(/[a-zA-Z()/]*/ig, '') - a.last_played.replace(/[a-zA-Z()/]*/ig, ''));


    const players = response.reduce((prev, curr) => {
      const { data } = curr;
      prev.push({
        acc_name: data.players[0].acc_name,
        displayName: data.players[0].display_name,
        mmr: data.players[0].mmr,
      });
      return prev;
    }, []);
    return players;
  }
  throw new Error('One or more players could not be found');
}

/**
 * When a game starts the event emitter emits "game-joined"
 * event which kickstarts the process to get data about the players.
 */
starcraftManager.on('game-joined', async() => {
  console.log('new game entered');
  const data = await getClientData();
  const gameInfo = processClientData(data);
  const unmaskedData = await getUnmaskedData(gameInfo);
  writeFile('./data/game-data.json', JSON.stringify(unmaskedData));
  console.log(unmaskedData);
});


/**
 * When a game ends and we return to the menu, the event emitter emits the "game-left"
 * event so we can plug into that event.
 */
starcraftManager.on('game-left', () => {
  console.log('in menus');
});

/**
 * Allows to add a retry mechanism to the callback function given to it.
 */
async function retry(delay = 5000, limit = 30000, callback) {
  if (callback !== null) {
    try {
      await callback();
      setTimeout(() => {
        retry(delay, limit, callback);
      }, delay);
    } catch (e) {
      console.log(e);
      setTimeout(() => {
        delay >= limit ? limit : delay * 2;
        retry(delay, limit, callback);
      }, delay);
    }
  }
}

retry(5000, 30000, starcraftManager.checkGameState);

// Testing the unmasked function
// getUnmaskedData(debugInfo).then(data => console.log(data)).catch(e => console.log(e))
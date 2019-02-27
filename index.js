const express = require('express');
const axios = require('axios');
const { EventEmitter } = require('events');
const fs = require('fs');

const app = express();
const port = 3000
const scEventEmitter = new EventEmitter;

const clientGameURL = 'http://localhost:6119/game';
const clientUiURL = 'http://localhost:6119/ui';
const unmaskedURL = 'http://sc2unmasked.com/API/Player?'

const conf = require('./conf.json');
let previousGameState = "inMenu";

let debugInfo = {
  server: conf.server,

  players: [{
      name: 'Kunamatata',
      race: 'T'
    },
    {
      name: "Uzikoti",
      race: "T"
    }
  ]
}

app.use(express.static('public'));

app.listen(port, () => console.log(`Listening on port: ${port}!`))


async function getClientData() {
  try {
    let { data } = await axios.get(clientGameURL);
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
          race: data.players[1].race
        }
      ]
    }

    return gameInfo;
  }
  return gameInfo.players = [];
}

/**
 * Allows to get the data of both players on unmasked and potentially unmask a barcode or smurf
 */
async function getUnmaskedData(gameInfo) {
  let queries = [];
  gameInfo.players.forEach(player => {
    console.log(player)
    queries.push(`${unmaskedURL}name=${player.name}&race=${player.race[0]}&server=${gameInfo.server}`)
  });
  console.log(queries);
  let response = await Promise.all(queries.map(query => axios.get(query)));
  // console.log(response[0].data, response[1].data);

  if (response[0].data.players.length > 0 && response[1].data.players.length > 0) {
    // Allows to sort a list of players recognized from unmasked by sorting by last_played. We are taking the player in the list that has most recently played. (Might want to use .filter)
    response[0].data.players.sort((a, b) => {
      return b.last_played.replace(/[a-zA-Z()/]*/ig, '') - a.last_played.replace(/[a-zA-Z()/]*/ig, '');
    })
    response[1].data.players.sort((a, b) => {
      return b.last_played.replace(/[a-zA-Z()/]*/ig, '') - a.last_played.replace(/[a-zA-Z()/]*/ig, '');
    })


    let players = response.reduce((prev, curr) => {
      let { data } = curr;
      prev.push({
        acc_name: data.players[0].acc_name,
        displayName: data.players[0].display_name,
        mmr: data.players[0].mmr
      })
      return prev;
    }, []);
    return players;
  }
  throw new Error('One or more players could not be found');
}



app.get('/gameInfo', async(req, res, next) => {
  fs.readFile('./game-data.json', (err, data) => {
    if (err) {
      res.send({});

    }
    return res.json(JSON.parse(data))
  })
});

async function checkGameState() {
  try {
    let { data } = await axios.get(clientUiURL);
    if (data.activeScreens.length === 0 && previousGameState !== "gameJoined") {
      console.log('emitting gameJoined event')
      scEventEmitter.emit('gameJoined')
      previousGameState = "gameJoined"
    } else if (data.activeScreens.length !== 0 && previousGameState !== "inMenu") {
      scEventEmitter.emit('gameLeft');
      previousGameState = "inMenu"
    }
  } catch (e) {
    throw new Error('Starcraft is not running!');
  }
}



/**
 * When a game starts the event emitter emits "gameJoined" event which kickstarts the process to get data about the players.
 */
scEventEmitter.on('gameJoined', async() => {
  console.log('new game entered');
  let data = await getClientData();
  let gameInfo = processClientData(data);
  let unmaskedData = await getUnmaskedData(gameInfo);
  writeFile('./game-data.json', JSON.stringify(unmaskedData));
  console.log(unmaskedData)
})


/**
 * When a game ends and we return to the menu, thee event emitter emits the "gameLeft" event so we can plug in to that event.
 */
scEventEmitter.on('gameLeft', () => {
  console.log('in menus');
})

/**
 * Allows to add a retry mechanism to the callback function given to it.
 */
async function retry(delay = 5000, limit = 30000, callback) {
  if (callback !== null) {
    try {
      await callback();
      setTimeout(() => {
        retry(delay, limit, callback)
      }, delay)
    } catch (e) {
      console.log(e)
      setTimeout(() => {
        delay >= limit ? limit : delay * 2;
        retry(delay, limit, callback);
      }, delay)
    }
  }
}

retry(5000, 30000, checkGameState)


function writeFile(file, obj) {
  fs.writeFile(file, obj, (err) => {
    if (err) {
      throw err;
    }
    console.log('The file was written to.');
  });
}

// Testing the unmasked function
// getUnmaskedData(debugInfo).then(data => console.log(data)).catch(e => console.log(e))
const { EventEmitter } = require('events');
const axios = require('axios');

const clientUiURL = 'http://localhost:6119/ui';

class StarcraftManager extends EventEmitter {
  constructor() {
    super();
    this.previousGameState = 'in-menu';
  }

  async checkGameState() {
    try {
      const { data } = await axios.get(clientUiURL);
      if (data.activeScreens.length === 0 && this.previousGameState !== 'game-joined') {
        console.log('emitting game-joined event');
        this.emit('game-joined');
        this.previousGameState = 'game-joined';
      } else if (data.activeScreens.length !== 0 && this.previousGameState !== 'in-menu') {
        this.emit('game-left');
        this.previousGameState = 'in-menu';
      }
    } catch (e) {
      throw Error('Starcraft is not running!');
    }
  }
}

module.exports = StarcraftManager;

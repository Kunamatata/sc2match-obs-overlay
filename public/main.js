const gameInfoURL = 'http://localhost:3000/api/gameInfo';

let glitchTextEl;
let containerEl;

document.addEventListener('DOMContentLoaded', async (e) => {
  containerEl = document.querySelector('.container');
  glitchTextEl = document.querySelectorAll('.glitch');
});

async function getGameInfo() {
  const response = await fetch(gameInfoURL);
  return response.json();
}

// When game state changes (/UI on starcraft client ) call getGameInfo again
// When out of game =>  containerEl.classList.toggle('fade')

async function renderPlayerInfos() {
  const players = await getGameInfo();
  const [player1, player2] = [...players];

  player1.name = player1.displayName ? player1.displayName : player1.acc_name;
  player2.name = player2.displayName ? player2.displayName : player2.acc_name;

  glitchTextEl[0].innerHTML = `${player1.name} (${player1.mmr})`;
  glitchTextEl[0].dataset.text = `${player1.name} (${player1.mmr})`;
  glitchTextEl[2].innerHTML = `${player2.name} (${player2.mmr})`;
  glitchTextEl[2].dataset.text = `${player2.name} (${player2.mmr})`;
}

renderPlayerInfos();

setInterval(async () => {
  renderPlayerInfos();
}, 10000);

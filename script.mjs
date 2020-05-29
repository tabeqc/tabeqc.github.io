'use strict';
import * as service from "./game-service.mjs";

class Game {
    constructor(result, yourPick, enemyPick) {
        this.result = result;
        this.yourPick = yourPick;
        this.enemyPick = enemyPick;
    }
}

class Player {
    constructor(name, wins) {
        this.name = name;
        if (wins === undefined) {
            this.wins = 0;
        } else {
            this.wins = wins;
        }
    }
    rank;
}

let local = true;
let localRanking = [];
let serverRanking = [];
let history = [];

const textValMappings = {0: "Stein", 1: "Papier", 2: "Schere", 3: "Brunnen", 4: "Streichholz"};

function createPlayer() {
    const playerName = getPlayerName();
    local ? localRanking.push(new Player(playerName)) : serverRanking.push(new Player(playerName));
    return playerName;
}

function playLocalGame() {
    const yourPick = getYourPick();
    const enemyPickVal = Math.round(Math.random() * 4);
    const enemyPickText = textValMappings[enemyPickVal];
    const resultText = evaluateLocalGame(yourPick[0], enemyPickVal);
    displayAndWait(yourPick[1], enemyPickText, resultText);
}

async function playServerGame() {
    const yourPick = getYourPick();
    const serverPlayerName = serverRanking[serverRanking.length - 1].name;
    const gameResult = await evaluateServerGame(yourPick[1], serverPlayerName);
    const enemyPickText = gameResult.enemyPick;
    const resultText = gameResult.result;
    displayAndWait(yourPick[1], enemyPickText, resultText);
}

async function evaluateServerGame(yourPick, playerName) {
    const serverGame = await service.getServerGame(yourPick, playerName);
    const choice = serverGame.enemyPick;
    let result = serverGame.result;
    switch (result) {
        case true:
            result = "Gewonnen";
            break;
        case false:
            result = "Verloren";
            break;
        case undefined:
            result = "Unentschieden";
            break;
    }
    return {
        enemyPick: choice,
        result: result
    };
}

function evaluateLocalGame(yourPick, enemyPick) {
    if (yourPick === enemyPick) {
        return "Unentschieden";
    } else if ((yourPick + 1) % 5 === enemyPick || (yourPick + 3) % 5 === enemyPick) {
        return "Verloren";
    } else {
        localRanking[localRanking.length - 1].wins++;
        return "Gewonnen";
    }
}

function getYourPick() {
    const yourPick = getPick();
    const yourPickVal = Math.round(yourPick.value);
    const yourPickText = textValMappings[yourPickVal];
    return [yourPickVal, yourPickText];
}

async function loadServerRanking() {
    const sRanking = await service.getServerRanking();
    for (const [key, value] of sRanking) {
        serverRanking.push(new Player(value.user, value.win));
    }
}

function sortAndRank(ranking) {
    ranking.sort((p1, p2) => {
        return p2.wins - p1.wins;
    });
    let ranks = [ranking.length];
    ranks[0] = 1;
    for (let i = 1; i < ranking.length; i++) {
        if (ranking[i].wins === ranking[i - 1].wins) {
            ranks[i] = ranks[i - 1];
        } else {
            ranks[i] = i + 1;
        }
    }
    for (let i = 0; i < ranking.length; i++) {
        ranking[i].rank = ranks[i];
    }
}

document.addEventListener('DOMContentLoaded', loadRankingView);

const gameSection = document.querySelector("#gameSection")
const startSection = document.querySelector("#rankingSection");
const startBtn = document.querySelector("#startBtn");
const backBtn = document.querySelector("#backBtn");
const playBtn = document.querySelector("#playBtn");
const modeBtn = document.querySelector("#modeBtn");
const historyList = document.querySelector("#historyList");
const rankingList = document.querySelector("#rankingList");
const nameInputBox = document.querySelector("#nameInputBox");
const playerNameField = document.querySelector("#playerName");
const resultField = document.querySelector("#resultField");
const enemyPickField = document.querySelector("#enemyPickField");
const timerField = document.querySelector("#timerField");
const gameModeField = document.querySelector("#gameModeField");
const rankingModeField = document.querySelector("#rankingModeField");

function getPick() {
    return document.querySelector('input[name="pick"]:checked');
}

function getPlayerName() {
    const playerName = nameInputBox.value;
    if (playerName.length <= 0) {
        alert("Bitte Namen eingeben");
        return null;
    }
        return playerName;
}

function displayMode() {
    local ? gameModeField.innerHTML = "Spielmodus: lokal  |  " : gameModeField.innerHTML = "Spielmodus: Server  |  ";
}

function displayEnemyPickAndResult(enemyPickText, resultText) {
    enemyPickField.innerHTML = `Gegnerische Hand: ${enemyPickText}`;
    resultField.innerHTML = `Resultat: ${resultText}`;
}

function switchPageView() {
    if (startSection.hidden) {
        startSection.hidden = false;
        gameSection.classList.add("hidden")
    } else {
        startSection.hidden = true;
        gameSection.classList.remove("hidden")
    }
}

function loadRankingView() {
    if (local) {
        modeBtn.innerHTML = "zu Server wechseln";
        rankingModeField.innerHTML = "lokales Ranking"
        updateLocalRanking();
    } else {
        modeBtn.innerHTML = "zu lokal wechseln";
        rankingModeField.innerHTML = "Server Ranking"
        updateServerRanking();
    }
    updateHistory();
}

function clear() {
    history.length = 0;
    serverRanking.length = 0;
    playerNameField.innerHTML = "";
    resultField.innerHTML = "";
    enemyPickField.innerHTML = "";
}

function displayPlayerName(playerName) {
    playerNameField.innerHTML = `Spieler Name: ${playerName}`;
}

function historyEntryHTMLString(game) {
    return `<li> Resultat: ${game.result} | Deine Hand: ${game.yourPick} | Gegnerische Hand: ${game.enemyPick} </li>`;
}

function rankingEntryHTMLString(player) {
    return `<li> ${player.rank}. Rang mit ${player.wins} Siegen: ${player.name}</li>`;
}

function historyHTMLString() {
    if (history.length === 0) {
        return `<h3>Nock kein Spiel gespielt</h3>`;
    }
    let historyHTMLString = "";
    for (let i = 0; i < history.length; i++) {
        historyHTMLString += historyEntryHTMLString(history[i]);
        if (i >= 14) {
            break;
        }
    }
    return historyHTMLString;
}

function rankingHTMLString(ranking) {
    if (ranking.length === 0) {
        return `<h3>Nock kein Ranking vorhanden</h3>`;
    }
    let rankingHTMLString = "";
    for (let i = 0; i < ranking.length; i++) {
        rankingHTMLString += rankingEntryHTMLString(ranking[i]);
        if (i >= 9) {
            break;
        }
    }
    return rankingHTMLString;
}

function updateHistory() {
    historyList.innerHTML = historyHTMLString();
}

async function updateServerRanking() {
    await loadServerRanking();
    sortAndRank(serverRanking);
    rankingList.innerHTML = rankingHTMLString(serverRanking);
}

function updateLocalRanking() {
    sortAndRank(localRanking);
    rankingList.innerHTML = rankingHTMLString(localRanking);
}

// get to Game Screen
startBtn.addEventListener('click', function () {
    const playerName = createPlayer();
    if (playerName !== null) {
    displayPlayerName(playerName);
    displayMode();
    switchPageView();
    }
    else {
        return;
    }
});

// go back
backBtn.addEventListener('click', function () {
    clear();
    loadRankingView();
    switchPageView();
});

// play and evaluate Game
playBtn.addEventListener('click', async function () {
    local ? playLocalGame() : await playServerGame();
});

// switch mode
modeBtn.addEventListener('click', function () {
    local = !local;
    loadRankingView();
});

function displayAndWait(yourPickText, enemyPickText, resultText) {
    displayEnemyPickAndResult(enemyPickText, resultText);
    history.unshift(new Game(resultText, yourPickText, enemyPickText));
    updateHistory();
    evokeTimeout();
}

async function evokeTimeout() {
    playBtn.disabled = true;
    timerField.classList.remove("hidden");
    setTimeout(() => {
        playBtn.disabled = false;
        timerField.classList.add("hidden");
    }, 3000);
    for (let i = 3; i > 0; i--) {
        timerField.innerHTML = `Nächstes Spiel in: ${i}`;
        await sleep(1000);
    }
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
};
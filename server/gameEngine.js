/**
 * Poker Engine & Room Manager for Poker Bank
 * Strictly handles chips, pots, side pots, blind rotations, and hand history.
 */

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const rooms = new Map();

/**
 * Create a new Room
 */
export function createRoom(socketId, { roomName, startingChips, smallBlind, bigBlind, maxPlayers }) {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const room = {
    code,
    name: roomName || 'Poker Room',
    hostSocketId: socketId,
    settings: {
      startingChips: Math.max(100, parseInt(startingChips) || 10000),
      smallBlind: Math.max(1, parseInt(smallBlind) || 50),
      bigBlind: Math.max(2, parseInt(bigBlind) || 100),
      maxPlayers: Math.min(9, Math.max(2, parseInt(maxPlayers) || 9))
    },
    status: 'LOBBY',
    players: [],
    hand: null,
    gameHistory: [],
    transactionLogs: [],
    countdownInterval: null
  };

  rooms.set(code, room);
  return room;
}

/**
 * Add a player to a room
 */
export function joinRoom(roomCode, socketId, { nickname, avatar }) {
  const room = rooms.get(roomCode?.toUpperCase());
  if (!room) {
    return { error: 'Room not found' };
  }

  if (room.players.length >= room.settings.maxPlayers) {
    return { error: 'Room is full' };
  }

  let player = room.players.find(p => p.id === socketId || p.name.toLowerCase() === nickname.trim().toLowerCase());
  
  if (player) {
    player.id = socketId;
    player.isConnected = true;
    player.name = nickname.trim();
    if (avatar) player.avatar = avatar;
  } else {
    const occupiedSeats = new Set(room.players.map(p => p.seatIndex));
    let seatIndex = 0;
    while (occupiedSeats.has(seatIndex)) seatIndex++;

    player = {
      id: socketId,
      name: nickname.trim(),
      avatar: avatar || '♠️',
      seatIndex,
      stack: room.settings.startingChips,
      currentBet: 0,
      totalBetInHand: 0,
      folded: false,
      allIn: false,
      hasActedInStreet: false,
      isConnected: true,
      lastAction: null,
      stats: {
        handsPlayed: 0,
        handsWon: 0,
        startingStack: room.settings.startingChips,
        totalWon: 0,
        totalLost: 0
      }
    };
    room.players.push(player);

    logTransaction(room, player.name, 'JOIN', 0, `Joined room with ${room.settings.startingChips.toLocaleString()} Virtual Chips`);
  }

  return { room, player };
}

export function logTransaction(room, playerName, type, amount, detail) {
  const log = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    playerName,
    type,
    amount: amount || 0,
    detail,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
  room.transactionLogs.unshift(log);
  if (room.transactionLogs.length > 200) room.transactionLogs.pop();
}

/**
 * Start a game session / hand
 */
export function startNewHand(room) {
  if (room.countdownInterval) {
    clearInterval(room.countdownInterval);
    room.countdownInterval = null;
  }

  if (room.players.length < 2) {
    return { error: 'Need at least 2 players to play' };
  }

  const activePlayers = room.players.filter(p => p.stack > 0);
  if (activePlayers.length < 2) {
    return { error: 'Need at least 2 players with chips > 0' };
  }

  room.status = 'PLAYING';

  let handNumber = room.hand ? room.hand.handNumber + 1 : 1;
  let dealerSeat = 0;
  
  if (room.hand) {
    const prevDealerIndex = room.players.findIndex(p => p.seatIndex === room.hand.dealerSeat);
    let nextIndex = (prevDealerIndex + 1) % room.players.length;
    while (room.players[nextIndex].stack <= 0) {
      nextIndex = (nextIndex + 1) % room.players.length;
    }
    dealerSeat = room.players[nextIndex].seatIndex;
  } else {
    dealerSeat = room.players[0].seatIndex;
  }

  const sortedPlayers = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const dealerIdx = sortedPlayers.findIndex(p => p.seatIndex === dealerSeat);

  let sbIdx, bbIdx, firstTurnIdx;

  if (sortedPlayers.length === 2) {
    sbIdx = dealerIdx;
    bbIdx = (dealerIdx + 1) % 2;
    firstTurnIdx = sbIdx;
  } else {
    sbIdx = (dealerIdx + 1) % sortedPlayers.length;
    bbIdx = (dealerIdx + 2) % sortedPlayers.length;
    firstTurnIdx = (dealerIdx + 3) % sortedPlayers.length;
  }

  const sbPlayer = sortedPlayers[sbIdx];
  const bbPlayer = sortedPlayers[bbIdx];
  const firstTurnPlayer = sortedPlayers[firstTurnIdx];

  room.players.forEach(p => {
    p.currentBet = 0;
    p.totalBetInHand = 0;
    p.folded = p.stack <= 0;
    p.allIn = false;
    p.hasActedInStreet = false;
    p.lastAction = null;
    if (p.stack > 0) p.stats.handsPlayed++;
  });

  const sbAmount = Math.min(sbPlayer.stack, room.settings.smallBlind);
  const bbAmount = Math.min(bbPlayer.stack, room.settings.bigBlind);

  // Post SB & BB
  sbPlayer.stack -= sbAmount;
  sbPlayer.currentBet = sbAmount;
  sbPlayer.totalBetInHand = sbAmount;
  if (sbPlayer.stack === 0) sbPlayer.allIn = true;
  sbPlayer.lastAction = `SB ${sbAmount}`;

  bbPlayer.stack -= bbAmount;
  bbPlayer.currentBet = bbAmount;
  bbPlayer.totalBetInHand = bbAmount;
  if (bbPlayer.stack === 0) bbPlayer.allIn = true;
  bbPlayer.lastAction = `BB ${bbAmount}`;

  const currentHighestBet = Math.max(sbAmount, bbAmount);

  room.hand = {
    handNumber,
    phase: 'PRE-FLOP',
    dealerSeat,
    sbSeat: sbPlayer.seatIndex,
    bbSeat: bbPlayer.seatIndex,
    currentTurnSeat: firstTurnPlayer.seatIndex,
    highestBet: currentHighestBet,
    minRaise: room.settings.bigBlind * 2,
    pot: sbAmount + bbAmount,
    actionHistory: [
      { handNo: handNumber, player: sbPlayer.name, action: `Small Blind ${sbAmount}`, phase: 'PRE-FLOP', timestamp: formatTime() },
      { handNo: handNumber, player: bbPlayer.name, action: `Big Blind ${bbAmount}`, phase: 'PRE-FLOP', timestamp: formatTime() }
    ],
    sidePots: [],
    showdownWinners: null,
    countdown: 0
  };

  logTransaction(room, sbPlayer.name, 'BET', -sbAmount, `Posted SB ${sbAmount}`);
  logTransaction(room, bbPlayer.name, 'BET', -bbAmount, `Posted BB ${bbAmount}`);

  recalculatePots(room);
  return { room };
}

/**
 * Handle Player Action
 */
export function handlePlayerAction(room, socketId, { action, amount }) {
  if (!room || !room.hand || room.status !== 'PLAYING') {
    return { error: 'No active hand in progress' };
  }

  const player = room.players.find(p => p.id === socketId);
  if (!player) return { error: 'Player not found' };

  if (room.hand.currentTurnSeat !== player.seatIndex && room.hand.phase !== 'SHOWDOWN') {
    return { error: 'Not your turn' };
  }

  if (player.folded || player.allIn) {
    return { error: 'Player cannot act' };
  }

  const hand = room.hand;
  const currentHighest = hand.highestBet;
  const neededToCall = currentHighest - player.currentBet;
  let actionLogText = '';

  player.hasActedInStreet = true;

  switch (action.toUpperCase()) {
    case 'FOLD':
      player.folded = true;
      player.lastAction = 'FOLD';
      actionLogText = `${player.name} Folded`;
      logTransaction(room, player.name, 'FOLD', 0, 'Folded hand');
      break;

    case 'CHECK':
      if (neededToCall > 0) {
        return { error: `Cannot check, must call ${neededToCall}` };
      }
      player.lastAction = 'CHECK';
      actionLogText = `${player.name} Checked`;
      break;

    case 'CALL':
      if (neededToCall <= 0) {
        player.lastAction = 'CHECK';
        actionLogText = `${player.name} Checked`;
      } else {
        const callAmount = Math.min(neededToCall, player.stack);
        player.stack -= callAmount;
        player.currentBet += callAmount;
        player.totalBetInHand += callAmount;
        hand.pot += callAmount;

        if (player.stack === 0) {
          player.allIn = true;
          player.lastAction = `ALL-IN ${player.currentBet}`;
          actionLogText = `${player.name} Called ${callAmount} (ALL-IN)`;
        } else {
          player.lastAction = `CALL ${callAmount}`;
          actionLogText = `${player.name} Called ${callAmount}`;
        }
        logTransaction(room, player.name, 'CALL', -callAmount, `Called ${callAmount}`);
      }
      break;

    case 'BET':
    case 'RAISE':
      const targetTotalBet = parseInt(amount);
      if (isNaN(targetTotalBet) || targetTotalBet <= currentHighest) {
        return { error: `Bet/Raise must be greater than current highest bet (${currentHighest})` };
      }

      const additionalChips = targetTotalBet - player.currentBet;
      if (additionalChips > player.stack) {
        return { error: `Not enough chips. Stack is ${player.stack}` };
      }

      player.stack -= additionalChips;
      player.currentBet = targetTotalBet;
      player.totalBetInHand += additionalChips;
      hand.pot += additionalChips;

      hand.minRaise = targetTotalBet + (targetTotalBet - currentHighest);
      hand.highestBet = targetTotalBet;

      // Reset hasActedInStreet for ALL OTHER active players because highest bet was raised!
      room.players.forEach(p => {
        if (p.id !== player.id && !p.folded && !p.allIn) {
          p.hasActedInStreet = false;
        }
      });

      if (player.stack === 0) {
        player.allIn = true;
        player.lastAction = `ALL-IN ${targetTotalBet}`;
        actionLogText = `${player.name} Raised to ${targetTotalBet} (ALL-IN)`;
      } else {
        player.lastAction = action === 'BET' ? `BET ${targetTotalBet}` : `RAISE ${targetTotalBet}`;
        actionLogText = `${player.name} ${action} ${targetTotalBet}`;
      }
      logTransaction(room, player.name, action, -additionalChips, `${action} ${targetTotalBet}`);
      break;

    case 'ALL-IN':
      if (player.stack <= 0) return { error: 'No chips to go all-in' };
      const allInAmount = player.stack;
      const totalAllInBet = player.currentBet + allInAmount;

      player.stack = 0;
      player.currentBet = totalAllInBet;
      player.totalBetInHand += allInAmount;
      hand.pot += allInAmount;
      player.allIn = true;

      if (totalAllInBet > hand.highestBet) {
        hand.highestBet = totalAllInBet;
        // Reset hasActedInStreet for others if this All-In raised the bet
        room.players.forEach(p => {
          if (p.id !== player.id && !p.folded && !p.allIn) {
            p.hasActedInStreet = false;
          }
        });
      }

      player.lastAction = `ALL-IN ${totalAllInBet}`;
      actionLogText = `${player.name} went ALL-IN (${totalAllInBet})`;
      logTransaction(room, player.name, 'ALL-IN', -allInAmount, `Went ALL-IN with ${allInAmount}`);
      break;

    default:
      return { error: 'Invalid action type' };
  }

  hand.actionHistory.push({
    handNo: hand.handNumber,
    player: player.name,
    action: actionLogText,
    phase: hand.phase,
    timestamp: formatTime()
  });

  recalculatePots(room);

  // Check if hand ends due to all folded except 1
  const nonFolded = room.players.filter(p => !p.folded);
  if (nonFolded.length === 1) {
    const winner = nonFolded[0];
    awardPotToSingleWinner(room, winner);
    return { room };
  }

  // Advance turn or street phase
  advanceTurn(room);

  return { room };
}

/**
 * Advance turn or advance street phase when all active players acted and equalized highest bet
 */
export function advanceTurn(room) {
  const hand = room.hand;
  if (!hand) return;

  const nonFolded = room.players.filter(p => !p.folded);
  const playersWhoCanAct = nonFolded.filter(p => !p.allIn);

  // Check if street round is complete:
  // 1. All players who can act have acted at least once in this street (hasActedInStreet)
  // 2. All non-folded players have equalized current highest bet or are all-in
  const allActed = playersWhoCanAct.every(p => p.hasActedInStreet);
  const allBetsEqual = nonFolded.every(p => p.allIn || p.currentBet === hand.highestBet);

  if (allActed && allBetsEqual) {
    if (hand.phase !== 'SHOWDOWN') {
      advancePhase(room);
      return;
    }
  }

  if (playersWhoCanAct.length <= 1) {
    // If 0 or 1 player can act (everyone else all in or folded)
    if (hand.phase !== 'SHOWDOWN') {
      advancePhase(room);
      return;
    }
  }

  // Move turn to next active player who is not folded and not all-in
  const sortedPlayers = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
  let currentIdx = sortedPlayers.findIndex(p => p.seatIndex === hand.currentTurnSeat);
  
  for (let i = 1; i <= sortedPlayers.length; i++) {
    const nextPlayer = sortedPlayers[(currentIdx + i) % sortedPlayers.length];
    if (!nextPlayer.folded && !nextPlayer.allIn) {
      hand.currentTurnSeat = nextPlayer.seatIndex;
      break;
    }
  }
}

/**
 * Advance Phase: PRE-FLOP -> FLOP -> TURN -> RIVER -> SHOWDOWN
 */
export function advancePhase(room) {
  const hand = room.hand;
  if (!hand) return;

  // Reset street current bets & acted flags
  room.players.forEach(p => {
    p.currentBet = 0;
    p.hasActedInStreet = false;
  });
  hand.highestBet = 0;

  const phases = ['PRE-FLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN'];
  const currentIdx = phases.indexOf(hand.phase);

  if (currentIdx < phases.length - 1) {
    hand.phase = phases[currentIdx + 1];

    // Set turn to first active player to left of dealer
    const sortedPlayers = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
    const dealerIdx = sortedPlayers.findIndex(p => p.seatIndex === hand.dealerSeat);
    
    for (let i = 1; i <= sortedPlayers.length; i++) {
      const nextPlayer = sortedPlayers[(dealerIdx + i) % sortedPlayers.length];
      if (!nextPlayer.folded && !nextPlayer.allIn) {
        hand.currentTurnSeat = nextPlayer.seatIndex;
        break;
      }
    }
  }

  recalculatePots(room);
}

/**
 * Side Pot Calculator Engine
 */
export function recalculatePots(room) {
  const hand = room.hand;
  if (!hand) return;

  const activePlayers = room.players.filter(p => p.totalBetInHand > 0);
  if (activePlayers.length === 0) {
    hand.mainPot = 0;
    hand.sidePots = [];
    return;
  }

  const allInCaps = Array.from(new Set(
    activePlayers.filter(p => p.allIn).map(p => p.totalBetInHand)
  )).sort((a, b) => a - b);

  if (allInCaps.length === 0) {
    hand.mainPot = hand.pot;
    hand.sidePots = [];
    return;
  }

  let pots = [];
  let prevCap = 0;

  for (let cap of allInCaps) {
    if (cap <= prevCap) continue;

    let potAmount = 0;
    let eligiblePlayerNames = [];

    activePlayers.forEach(p => {
      const contribution = Math.min(p.totalBetInHand, cap) - Math.min(p.totalBetInHand, prevCap);
      potAmount += Math.max(0, contribution);
      if (!p.folded && p.totalBetInHand >= cap) {
        eligiblePlayerNames.push(p.name);
      }
    });

    if (potAmount > 0) {
      pots.push({
        amount: potAmount,
        eligiblePlayers: eligiblePlayerNames
      });
    }

    prevCap = cap;
  }

  let excessPot = 0;
  let topEligibles = [];
  activePlayers.forEach(p => {
    if (p.totalBetInHand > prevCap) {
      excessPot += (p.totalBetInHand - prevCap);
      if (!p.folded) topEligibles.push(p.name);
    }
  });

  if (excessPot > 0) {
    pots.push({
      amount: excessPot,
      eligiblePlayers: topEligibles
    });
  }

  hand.mainPot = pots[0] ? pots[0].amount : hand.pot;
  hand.sidePots = pots.slice(1);
}

function awardPotToSingleWinner(room, winner) {
  const hand = room.hand;
  const potWon = hand.pot;

  winner.stack += potWon;
  winner.stats.handsWon++;
  winner.stats.totalWon += potWon;

  logTransaction(room, winner.name, 'WIN', potWon, `Won Pot of ${potWon.toLocaleString()} (All folded)`);

  room.gameHistory.unshift({
    handNumber: hand.handNumber,
    winner: winner.name,
    pot: potWon,
    summary: `${winner.name} won ${potWon.toLocaleString()} Chips (Fold victory)`,
    actionHistory: hand.actionHistory,
    timestamp: formatTime()
  });

  hand.phase = 'SHOWDOWN';
  hand.showdownWinners = {
    mainPotWinner: winner.name,
    potWon
  };
}

/**
 * Distribute Showdown Pots to selected Winners (ONLY Host can call)
 */
export function distributeShowdownPots(room, socketId, { mainPotWinners, sidePotWinners }) {
  if (!room || !room.hand || room.hand.phase !== 'SHOWDOWN') {
    return { error: 'Game is not in Showdown phase' };
  }

  if (socketId !== room.hostSocketId) {
    return { error: 'เฉพาะคนสร้างห้อง (Host) เท่านั้นที่เป็นคนแจกชิปให้ผู้ชนะ' };
  }

  const hand = room.hand;
  recalculatePots(room);

  const potsToDistribute = [
    { name: 'Main Pot', amount: hand.mainPot, winners: mainPotWinners || [] },
    ...(hand.sidePots || []).map((sp, idx) => ({
      name: `Side Pot #${idx + 1}`,
      amount: sp.amount,
      winners: sidePotWinners && sidePotWinners[idx] ? sidePotWinners[idx] : []
    }))
  ];

  const sortedPlayers = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const dealerIdx = sortedPlayers.findIndex(p => p.seatIndex === hand.dealerSeat);

  const sortWinnersByLeftOfDealer = (winnerNames) => {
    return [...winnerNames].sort((a, b) => {
      const idxA = sortedPlayers.findIndex(p => p.name === a);
      const idxB = sortedPlayers.findIndex(p => p.name === b);
      const distA = (idxA - dealerIdx + sortedPlayers.length) % sortedPlayers.length;
      const distB = (idxB - dealerIdx + sortedPlayers.length) % sortedPlayers.length;
      return distA - distB;
    });
  };

  let summaryText = [];

  potsToDistribute.forEach(p => {
    if (!p.winners || p.winners.length === 0) return;

    const orderedWinners = sortWinnersByLeftOfDealer(p.winners);
    const splitCount = orderedWinners.length;
    const baseShare = Math.floor(p.amount / splitCount);
    let remainder = p.amount % splitCount;

    orderedWinners.forEach((winnerName) => {
      const player = room.players.find(pl => pl.name === winnerName);
      if (!player) return;

      let awarded = baseShare;
      if (remainder > 0) {
        awarded += 1;
        remainder -= 1;
      }

      player.stack += awarded;
      player.stats.handsWon++;
      player.stats.totalWon += awarded;

      logTransaction(room, player.name, 'WIN', awarded, `Won ${awarded.toLocaleString()} Chips from ${p.name}`);
      summaryText.push(`${player.name} won ${awarded.toLocaleString()} (${p.name})`);
    });
  });

  room.gameHistory.unshift({
    handNumber: hand.handNumber,
    winner: mainPotWinners ? mainPotWinners.join(', ') : 'Multiple',
    pot: hand.pot,
    summary: summaryText.join(' | '),
    actionHistory: hand.actionHistory,
    timestamp: formatTime()
  });

  hand.showdownWinners = {
    summary: summaryText.join(' • '),
    completed: true
  };

  // Start 5-second countdown to automatic next hand!
  hand.countdown = 5;

  return { room };
}

export function resetSession(room) {
  if (room.countdownInterval) {
    clearInterval(room.countdownInterval);
    room.countdownInterval = null;
  }

  room.players.forEach(p => {
    p.stack = room.settings.startingChips;
    p.currentBet = 0;
    p.totalBetInHand = 0;
    p.folded = false;
    p.allIn = false;
    p.hasActedInStreet = false;
    p.lastAction = null;
  });

  room.hand = null;
  room.status = 'LOBBY';
  logTransaction(room, 'SYSTEM', 'RESET', 0, `Session reset. All player stacks set to ${room.settings.startingChips.toLocaleString()}`);
  return room;
}

export function updateRoomSettings(room, { smallBlind, bigBlind, startingChips }) {
  if (smallBlind) room.settings.smallBlind = parseInt(smallBlind);
  if (bigBlind) room.settings.bigBlind = parseInt(bigBlind);
  if (startingChips) room.settings.startingChips = parseInt(startingChips);
  logTransaction(room, 'HOST', 'SETTINGS', 0, `Blinds updated: ${room.settings.smallBlind}/${room.settings.bigBlind}, Starting Chips: ${room.settings.startingChips}`);
  return room;
}

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

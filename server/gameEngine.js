/**
 * Poker Engine & Room Manager for Poker Bank
 * Strictly handles chips, pots, side pots, blind rotations, and hand history.
 */

// Helper: Generate 5-character alphanumeric room code
export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// In-memory store for active rooms
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
    status: 'LOBBY', // 'LOBBY', 'PLAYING', 'PAUSED'
    players: [],
    hand: null,
    gameHistory: [],
    transactionLogs: []
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

  // Check if player with same socket or nickname rejoining
  let player = room.players.find(p => p.id === socketId || p.name.toLowerCase() === nickname.trim().toLowerCase());
  
  if (player) {
    player.id = socketId;
    player.isConnected = true;
    player.name = nickname.trim();
    if (avatar) player.avatar = avatar;
  } else {
    // Find first available seat index 0..maxPlayers-1
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

/**
 * Helper to log chip transactions
 */
export function logTransaction(room, playerName, type, amount, detail) {
  const log = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    playerName,
    type, // 'JOIN', 'BET', 'CALL', 'RAISE', 'WIN', 'RESET', 'HOST_ADJUST'
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
  if (room.players.length < 2) {
    return { error: 'Need at least 2 players to play' };
  }

  // Filter connected or active players with chips > 0
  const activePlayers = room.players.filter(p => p.stack > 0);
  if (activePlayers.length < 2) {
    return { error: 'Need at least 2 players with chips > 0' };
  }

  room.status = 'PLAYING';

  // Determine Dealer, SB, BB positions
  let handNumber = room.hand ? room.hand.handNumber + 1 : 1;
  let dealerSeat = 0;
  
  if (room.hand) {
    // Rotate dealer button to next seat
    const prevDealerIndex = room.players.findIndex(p => p.seatIndex === room.hand.dealerSeat);
    let nextIndex = (prevDealerIndex + 1) % room.players.length;
    while (room.players[nextIndex].stack <= 0) {
      nextIndex = (nextIndex + 1) % room.players.length;
    }
    dealerSeat = room.players[nextIndex].seatIndex;
  } else {
    dealerSeat = room.players[0].seatIndex;
  }

  // Find SB and BB seats relative to Dealer
  const sortedPlayers = [...room.players].sort((a, b) => a.seatIndex - b.seatIndex);
  const dealerIdx = sortedPlayers.findIndex(p => p.seatIndex === dealerSeat);

  let sbIdx, bbIdx, firstTurnIdx;

  if (sortedPlayers.length === 2) {
    // Heads-up: Dealer is SB, other player is BB
    sbIdx = dealerIdx;
    bbIdx = (dealerIdx + 1) % 2;
    firstTurnIdx = sbIdx; // Pre-flop dealer acts first in heads-up
  } else {
    sbIdx = (dealerIdx + 1) % sortedPlayers.length;
    bbIdx = (dealerIdx + 2) % sortedPlayers.length;
    firstTurnIdx = (dealerIdx + 3) % sortedPlayers.length;
  }

  const sbPlayer = sortedPlayers[sbIdx];
  const bbPlayer = sortedPlayers[bbIdx];
  const firstTurnPlayer = sortedPlayers[firstTurnIdx];

  // Reset players for new hand
  room.players.forEach(p => {
    p.currentBet = 0;
    p.totalBetInHand = 0;
    p.folded = p.stack <= 0;
    p.allIn = false;
    p.lastAction = null;
    if (p.stack > 0) p.stats.handsPlayed++;
  });

  const sbAmount = Math.min(sbPlayer.stack, room.settings.smallBlind);
  const bbAmount = Math.min(bbPlayer.stack, room.settings.bigBlind);

  // Post Small Blind
  sbPlayer.stack -= sbAmount;
  sbPlayer.currentBet = sbAmount;
  sbPlayer.totalBetInHand = sbAmount;
  if (sbPlayer.stack === 0) sbPlayer.allIn = true;
  sbPlayer.lastAction = `SB ${sbAmount}`;

  // Post Big Blind
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
    showdownWinners: null
  };

  logTransaction(room, sbPlayer.name, 'BET', -sbAmount, `Posted SB ${sbAmount}`);
  logTransaction(room, bbPlayer.name, 'BET', -bbAmount, `Posted BB ${bbAmount}`);

  recalculatePots(room);
  return { room };
}

/**
 * Handle Player Action (FOLD, CHECK, CALL, BET, RAISE, ALL-IN)
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
        // Equivalent to check
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
    // Award pot to last remaining player!
    const winner = nonFolded[0];
    awardPotToSingleWinner(room, winner);
    return { room };
  }

  // Advance turn or phase
  advanceTurn(room);

  return { room };
}

/**
 * Advance turn to next active player or shift phase if street complete
 */
export function advanceTurn(room) {
  const hand = room.hand;
  if (!hand) return;

  const activePlayers = room.players.filter(p => !p.folded && !p.allIn);

  // Check if street round is complete:
  // All active players have matched highest bet or are all in
  const nonFolded = room.players.filter(p => !p.folded);
  const streetComplete = nonFolded.every(p => p.allIn || p.currentBet === hand.highestBet);
  
  // Count players who can still act
  const playersWhoCanAct = room.players.filter(p => !p.folded && !p.allIn);

  if (streetComplete && playersWhoCanAct.length <= 1) {
    // Auto advance phase if no further bets possible
    if (hand.phase !== 'SHOWDOWN') {
      advancePhase(room);
      return;
    }
  }

  if (streetComplete) {
    // Advance to next street phase
    advancePhase(room);
    return;
  }

  // Move to next player to act
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

  // Reset street current bets
  room.players.forEach(p => {
    p.currentBet = 0;
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
 * Accurately divides main pot and side pots based on player contributions
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

  // Find all distinct all-in contribution levels
  const allInCaps = Array.from(new Set(
    activePlayers.filter(p => p.allIn).map(p => p.totalBetInHand)
  )).sort((a, b) => a - b);

  if (allInCaps.length === 0) {
    // Single main pot
    hand.mainPot = hand.pot;
    hand.sidePots = [];
    return;
  }

  // Build pots by capping contributions
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

  // Any remaining chips beyond the highest all-in cap belong to the top side pot
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

/**
 * Award Pot to single surviving player (when everyone else folds)
 */
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
 * Distribute Showdown Pots to selected Winners (Supports Split Pots & Odd Chip Rule)
 */
export function distributeShowdownPots(room, { mainPotWinners, sidePotWinners }) {
  const hand = room.hand;
  if (!hand || hand.phase !== 'SHOWDOWN') {
    return { error: 'Game is not in Showdown phase' };
  }

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

  // Helper to order split winners starting from first position left of Dealer
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
    let remainder = p.amount % splitCount; // Odd chips

    orderedWinners.forEach((winnerName, idx) => {
      const player = room.players.find(pl => pl.name === winnerName);
      if (!player) return;

      let awarded = baseShare;
      if (remainder > 0) {
        awarded += 1;
        remainder -= 1; // Odd chip awarded to closest left of dealer
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

  return { room };
}

/**
 * Reset all player stacks back to starting chips (Host Action)
 */
export function resetSession(room) {
  room.players.forEach(p => {
    p.stack = room.settings.startingChips;
    p.currentBet = 0;
    p.totalBetInHand = 0;
    p.folded = false;
    p.allIn = false;
    p.lastAction = null;
  });

  room.hand = null;
  room.status = 'LOBBY';
  logTransaction(room, 'SYSTEM', 'RESET', 0, `Session reset. All player stacks set to ${room.settings.startingChips.toLocaleString()}`);
  return room;
}

/**
 * Host updates room settings
 */
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

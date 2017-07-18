//board and outcome default to hidden
$(document).ready(function() {
  $("#board").hide();
  $("#outcome").hide();
  $("#score").text("Player: 0 | CPU: 0");

  //player chooses to play as X
  $("#X-btn").click(function() {
    globals.player = "X";

    var aiPlayer = new CPU();
    globals.game = new Game(aiPlayer);
    globals.game.start();
    aiPlayer.plays(globals.game);

    ui.display($("#player-choice"), $("#board"));
  });

  //player chooses to play as O
  $("#O-btn").click(function() {
    globals.player = "O";

    var aiPlayer = new CPU();
    globals.game = new Game(aiPlayer);
    globals.game.start();
    aiPlayer.plays(globals.game);

    //if user chooses to play O, the AI will always choose the top-left corner but it takes a while to dig through 9x more possibilities. We manually make the decision for the AI to save time.
    globals.game.state.board[0] = "X";
    $("#cell0").text("X");
    $("#cell0").addClass("occupied");
    globals.game.state.turn = "O";

    ui.display($("#player-choice"), $("#board"));
  });

  //setting up click functions for each tile
  $(".cell").each(function() {
    var $this = $(this);

    $this.click(function() {
      if (globals.game.status === "running" && !$this.hasClass("occupied")) {
        var index = parseInt($this.data("index"));
        var next = globals.game.state;

        next.board[index] = next.turn;
        ui.insertAt(index, next.turn);
        next.switch();

        globals.game.advance(next);
      }
    });
  });

  //allow user to restart at the end of the game
  $("#restart").click(function() {
    $(".cell").each(function() {
      $(this).text("");
      $(this).removeClass("occupied");
    });

    globals.game.state.turn = "";
    globals.game.state.board = ["E", "E", "E", "E", "E", "E", "E", "E", "E"];

    ui.display($("#outcome"), $("#player-choice"));
  });
});

//ui object to handle all ui methods
var ui = {};

//method to place player's letter on the board
ui.insertAt = function(index, symbol) {
  var board = $('.cell');
  var target = $(board[index]);

  //only place the letter if the space isn't already taken
  if (!target.hasClass('occupied')) {
    target.html(symbol);
    target.addClass("occupied");
  }

};

//method to hide the current screen and show the desired one
ui.display = function(hide, show) {
  hide.hide();
  show.delay(200).show();
};

ui.updateScore = function(player) {
  if(player === "player")
    globals.player_score++;

  else globals.cpu_score++;

  $("#score").text("Player: " + globals.player_score + " | CPU: " + globals.cpu_score)
}

//various variable that can be accessed app-wide
var globals = {cpu_score: 0, player_score: 0 };

//method to increment o moves and apply new state
var AIAction = function(position) {
  this.movePos = position;
  this.minimax = 0;

  this.applyTo = function(state) {
    var next = new State(state);

    next.board[this.movePos] = state.turn;


    if (state.turn === "O")
      next.o++;

      next.switch();
    return next;
  };
};

//sort minimax values from smallest to largest (used for minimizing player)
AIAction.ASC = function(first, second) {
  if (first.minimax < second.minimax) {
    return -1;
  } else if (first.minimax > second.minimax) {
    return 1;
  } else return 0;
};

//sort minimax values from largest to smallest (used for maximizing player)
AIAction.DES = function(first, second) {
  if (first.minimax > second.minimax) {
    return -1;
  } else if (first.minimax < second.minimax) {
    return 1;
  } else return 0;
}

//the AI we play against
var CPU = function() {
  var game = {};

  //tell the app what game the AI is playing
  this.plays = function(_game) {
    game = _game;
  };

  //algorithm used to determine best move
  function minimax(state) {

    //base case: the game has ended. We use 10 - state.o because this will make the AI take into account how long it will take to win or lose
    if (state.isEnded()) {
      if (state.winner === globals.player) {
        return 10 - state.o;
      } else if (state.winner === "draw") {
        return 0;
      } else return -10 + state.o;
    }

    //if the game isn't over
    else {
      var score;

      if (state.turn === globals.player) {
        score = -100
      } else {
        score = 100
      }

      //find available places to put the letter
      var availableSpots = state.emptyTiles();

      //start working through next set of states
      var nextStates = availableSpots.map(function(pos) {
        var action = new AIAction(pos);
        var nextState = action.applyTo(state);
        return nextState;
      });

      //minimax is recursive - the AI will keep going deeper until it reaches terminal states
      nextStates.forEach(function(curr) {
        var nextScore = minimax(curr);

        if (state.turn === globals.player) {
          if (nextScore > score) {
            score = nextScore;
          }
        } else {
          if (nextScore < score) {
            score = nextScore;
          }
        }

      });

      return score;
    }
  }

  //AI move function
  function move(turn) {
    var available = game.state.emptyTiles();

    var availableActions = available.map(function(pos) {
      var action = new AIAction(pos);
      var next = action.applyTo(game.state);

      action.minimax = minimax(next);

      return action;
    });

    //player wants to maximize his/her score
    if(turn === globals.player)
      availableActions.sort(AIAction.DES);

    //AI wants to minimize player's score
    else
      availableActions.sort(AIAction.ASC);

    //the first element of the array will be the best choice, so apply this choice then hand over to player
    var choice = availableActions[0];
    var next = choice.applyTo(game.state);
    ui.insertAt(choice.movePos, turn);

    game.advance(next);
  }

  //let the AI know that it is time to make a move
  this.notify = function(turn) {
    move(turn);
  };
};

//object that handles various information about the state of the game
var State = function(old) {
  this.board = [];
  this.turn = "";
  this.o = 0;

  //if an old state is being brought in, import the old information
  if (typeof old !== "undefined") {
    var len = old.board.length;
    this.board = new Array(len);

    for (var i = 0; i < len; i++) {
      this.board[i] = old.board[i];
    }

    this.turn = old.turn;
    this.winner = old.winner;
    this.o = old.o;
  }

  //change turns
  this.switch = function() {
    this.turn = this.turn === "X" ? "O" : "X";
  }

  this.winner = "unknown"; //property to keep track of who won

  //check to see if the game is over
  this.isEnded = function() {
    var board = this.board;

    //check rows
    for (var i = 0; i <= 6; i += 3) {
      if (board[i] !== "E" && board[i] === board[i + 1] && board[i] === board[i + 2]) {
        this.winner = board[i];
        return true;
      }
    }

    //check columns
    for (var i = 0; i <= 2; i++) {
      if (board[i] !== "E" && board[i] === board[i + 3] && board[i] === board[i + 6]) {
        this.winner = board[i];
        return true;
      }
    }

    //check diagonals
    for (var i = 0, j = 4; i <= 2; i += 2, j -= 2) {
      if (board[i] !== "E" && board[i] === board[i + j] && board[i] === board[i + 2 * j]) {
        this.winner = board[i];
        return true;
      }
    }

    var empty = this.emptyTiles();

    //checking for a draw
    if (empty.length === 0) {
      this.winner = "draw";
      return true;
    } else return false;

  }; //end isEnded

  //generates an array that includes all empty tiles
  this.emptyTiles = function() {
    var indices = [];
    for (var i = 0; i < 9; i++) {
      if (this.board[i] === "E") {
        indices.push(i);
      }
    }

    return indices;
  };
}; //end State

//object that stores various information about the game
var Game = function(cpu) {

  this.ai = cpu;

  this.state = new State();

  this.state.board = ["E", "E", "E", "E", "E", "E", "E", "E", "E"]; //board starts out empty
  this.state.turn = "X"; //X will always play first

  this.status = "start"; //game has not yet started

  //function to start running the game
  this.start = function() {
    if (this.status === "start") {
      this.status = "running";
    }
  };

  this.advance = function(_state) {
    this.state = _state;

    //if the game is over, display the appropriate screen and message
    if (_state.isEnded()) {
      if (_state.winner === globals.player) {
        $("#outcome-text").text("Great job! You won!");
        ui.display($("#board"), $("#outcome"));
        ui.updateScore("player");
      } else if (_state.winner === "draw") {
        $("#outcome-text").text("It was a draw.");
        ui.display($("#board"), $("#outcome"));
      } else {
        $("#outcome-text").text("Sorry, you lost.");
        ui.display($("#board"), $("#outcome"));
        ui.updateScore("cpu");
      }
    } else {
      if (this.state.turn === globals.player);

      //if the player just played, then let the AI know that it's up
      else {
        var turn = globals.player === "X" ? "O" : "X";
        this.ai.notify(turn);
      }
    }
  };
}; //end Game

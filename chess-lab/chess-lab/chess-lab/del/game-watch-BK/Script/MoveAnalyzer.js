function Move(pgn, src, dst, clr)
{
	this.pgn = pgn;
	this.src = Number(src);
	this.dst = Number(dst);
	if (isNaN(this.src))
		PgnParcer.ThrowError("Move source isNaN: ");
	if (isNaN(this.dst))
		PgnParcer.ThrowError("Move destination isNaN: ");
	var p = pgn.indexOf('=');
	this.isPromotion = p != -1;
	this.promotion = p != -1 ? pgn.substr(p + 1) : null;
	var c = pgn[0];
	this.rank = "RNBQK".indexOf(c) != -1 ? c : 'P';
	if (clr == 'b')
		this.rank = this.rank.toLowerCase();

	this.GetSquare = function (id)
	{
		if (PgnCtrl.isBoardInverted)
			id = 63 - id;
		return Get("b" + id);
	},

	this.Unmark = function ()
	{
		this.DoUnmark(this.src);
		this.DoUnmark(this.dst);
	}
	this.DoUnmark = function (id)
	{
		var n = parseInt(id / 8) + parseInt(id % 8);
		this.GetSquare(id).style.backgroundColor = (n & 1) ? PgnCtrl.colorBlack : PgnCtrl.colorWhite;
	},

	this.Mark = function (old)
	{
		if (old)
			old.Unmark();
		this.GetSquare(this.src).style.backgroundColor = "#eeeeff";
		this.GetSquare(this.dst).style.backgroundColor = "#eeeeff";
	}
}

var MoveAnalyzer =
{
	state: [],
	pgn: "",
	clr: "",
	moveId: 0,
	rank: "",
	x: -1,
	y: -1, // Y axis goes down, so that 'a1' -> (0, 7), 'h8' -> (7, 0) 
	src: -1,
	dst: -1,
	stop: false,
	enPassant: -1,
	
	// Calc new state using previous state, current move's pgn and clr
	Analyze: function (id, clr, pgn)
	{
		this.moveId = id;
		this.clr = clr;
		this.state = PgnCtrl.states[id - 1];
		this.pgn = pgn;
		this.enPassant = -1;

		pgn = this.ClearPgn(pgn); // Clear emotions (!, ?, +, #)
		if (pgn == "O-O" || pgn == "O-O-O")
		{
			this.DoCastling(pgn);
			return;
		}
		this.GetPieceRank(pgn);
		if (this.rank.toLowerCase() == 'p')
		{
			this.Pawn(pgn);
			return;
		}
		if (!this.ParseDst(pgn.substr(-2, 2))) // Derive move destination square
			return;

		var  
			pos = pgn.indexOf('x'), // Is this a capturing move?
			src = pos != -1 ? pgn.substr(1, pos - 1) : pgn.substr(1, pgn.length - 3);
		if (!this.ParseSrc(src)) // Derive move source square
			return;
		this.CreateMove();
	},

	ClearPgn: function (pgn)
	{
		var last = pgn.length - 1;
		if (pgn[last] == '+' || pgn[last] == '#' || pgn[last] == '!' || pgn[last] == '?')
			pgn = pgn.substr(0, last);
		return pgn;
	},

	GetPieceRank: function(pgn)
	{
		var 
			c = pgn[0],
			isPawn = "abcdefgh".indexOf(c) != -1;
		if ("RNBQK".indexOf(c) == -1 && !isPawn)
		{
			PgnParcer.ThrowError("MoveAnalyzer: Wrong first pgn symbol.\r\n");
			return;
		}
		this.rank = isPawn ?
			(this.clr == 'w' ? 'P' : 'p') :
			(this.clr == 'b' ? c.toLowerCase() : c);
	},

	ParseDst: function (d)
	{
		var msg = "MoveAnalyzer: Wrong destination field. \r\n";
		if (d.length < 2)
		{
			PgnParcer.ThrowError(msg);
			return false;
		}
		this.x = this.ToX(d[0]);
		this.y = this.ToY(d[1]);
		if (this.x < 0 || 7 < this.x || this.y < 0 || 7 < this.y)
		{
			PgnParcer.ThrowError(msg);
			return false;
		}
		this.dst = this.y * 8 + this.x;
		return true;
	},

	ParseSrc: function (s) // s may be: "", "b", "b1" in: Nc3, Nbc3, Nb1c3
	{
		var msg = "MoveAnalyzer: Wrong source field. \r\n";
		if (s.length > 2)
		{
			PgnParcer.ThrowError(msg);
			return false;
		}

		this.stop = false;
		var c = s.length == 1 ? s : null; // Prompt b in Nbc3
		if (s.length < 2)
		{
			var r = this.rank.toLowerCase();
			return (
				r == 'r' ? this.Rook(c) :
				r == 'n' ? this.Knight(c) :
				r == 'b' ? this.Bishop(c) :
				r == 'q' ? this.Queen(c) :
				r == 'k' ? this.King() : false);
		}
		var
			x = this.ToX(s[0]),
			y = this.ToY(s[1]);
		if (x < 0 || 7 < x || y < 0 || 7 < y)
		{
			PgnParcer.ThrowError(msg);
			return false;
		}
		this.src = y * 8 + x;
		return true;
	},

	Pawn: function(pgn) // pgn is cleared of emotions (but this.pgn is not!)
	{
		var len = pgn.length;
		if (len < 2 || 6 < len) // pgn must be one of: 'e4', 'exd4', 'e3xd4', 'exd8=Q'
		{
			PgnParcer.ThrowError("Pawn move error ");
			return;
		}
		var y = pgn[1];
		if ("abcdefgh".indexOf(y) != -1) // Some authors use 'ed' for capturing pawn
		{
			PgnParcer.ThrowError("Please, correct pgn. It must be one of: 'e4', 'exd4', 'e3xd4'");
			return;
		}
		var pos = pgn.indexOf('x');
		if (pos != -1) // In case of 'exd4' or 'e3xd4'
		{
			var d = pgn.substr(pos + 1);	// 'd4'
			if (!this.ParseDst(d)) // Derive destination square
				return;
			if (this.state[this.dst] == '.') // In case of en passant
			{
				this.enPassant = this.SearchEnPassant(d.substr(0,1)); // 'd'
				if (this.enPassant == null)
					return;
			}
		}
		else // In case of 'e4' or 'e8=Q'
		{
			if (!this.ParseDst(pgn))
				return;
		}
		if (!this.SearchPawn(pgn[0])) // Derive source square
			return;
		pos = pgn.indexOf('=');
		if (pos != -1)
		{
			this.DoPromotion(pgn.substr(pos + 1));
			return;
		}
		this.CreateMove();
	},
	SearchPawn: function(x)
	{
		x = this.ToX(x);
		var 
			d = this.clr == 'w' ? 1 : -1,
			y = this.y + d,  // Go back one row
			src = y * 8 + x,
			c = this.state[src]; // Test for pawn
		if (c != this.rank)
		{
			y += d;  // Go back one more row
			src = y * 8 + x;
			c = this.state[src];
			if (c != this.rank || y != 1 && y != 6)
			{
				PgnParcer.ThrowError("Pawn move error ");
				return false;
			}
		}
		this.src = src;
		return true;
	},

	SearchEnPassant: function (x)
	{
		var msg = "Pawn en passant error ";
		if (this.y != 2 && this.y != 5)
		{
			PgnParcer.ThrowError(msg);
			return null;
		}
		var
			d = this.clr == 'w' ? 1 : -1,
			y = this.y + d,  // Go back one row
			src = y * 8 + this.ToX(x),
			c = PgnCtrl.states[this.moveId - 1][src]; // Take pawn from previous move
		if (c != (this.rank == 'P' ? 'p' : 'P'))
		{
			PgnParcer.ThrowError(msg);
			return null;
		}
		return src;
	},

	Rook: function(c)
	{
		if (!this.SearchNESW(c))
		{
			PgnParcer.ThrowError(PgnParcer.error);
			return false;
		}
		return true;
	},

	Bishop: function (c)
	{
		if (!this.SearchNWNE(c))
		{
			PgnParcer.ThrowError(PgnParcer.error);
			return false;
		}
		return true;
	},

	Queen: function (c)
	{
		if (!this.SearchNESW(c))
			if (!this.SearchNWNE(c))
			{
				PgnParcer.ThrowError(PgnParcer.error);
				return false;
			}
		return true;
	},

	Knight: function (c) { return this.SearchEight([[-1,-2], [1,-2], [-2,-1], [2,-1], [-2, 1], [2, 1], [-1, 2], [1, 2]], c); },
	King: function () { return this.SearchEight([[-1,-1], [0,-1], [1,-1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]); },

	DoCastling: function(pgn)
	{
		var rookSrc, rookDst, rook;
		if (this.clr == 'w')
		{
			this.rank = "K";
			rook = "R";
			this.src = 60;
			if (pgn == "O-O")
			{
				this.dst = 62;
				rookSrc = 63;
				rookDst = 61;
			}
			else
			{
				this.dst = 58;
				rookSrc = 56;
				rookDst = 59;
			}
		}
		else
		{
			this.rank = "k";
			rook = "r";
			this.src = 4;
			if (pgn == "O-O")
			{
				this.dst = 6;
				rookSrc = 7;
				rookDst = 5;
			}
			else
			{
				this.dst = 2;
				rookSrc = 0;
				rookDst = 3;
			}
		}
		this.state = this.state.ReplaceAt(rookSrc, '.');
		this.state = this.state.ReplaceAt(rookDst, rook);
		this.CreateMove();
	},

	SearchEight: function (d, c)
	{
		var
			found = false,
			o = null, x, y;
		for (var i = 0; i < d.length && !found; i++)
		{
			if ((x = this.x + d[i][0]) < 0 || 7 < x)
				continue;
			if ((y = this.y + d[i][1]) < 0 || 7 < y)
				continue;
			this.src = y * 8 + x;
			o = this.state[this.src] || null;
			found = o != null && o != '.' && o == this.rank;
			if (found && c != null)
				found = this.TestPrompt(c);
		}
		if (!found)
		{
			PgnParcer.ThrowError(PgnParcer.error);
			return false;
		}
		return true;
	},

	TestFound: function(c)
	{
		var
			o = this.state[this.src] || null,
			found = o != null && o != '.' && o == this.rank;
		if (!found && o != '.')
		{
			this.stop = true;
			return found;
		}
		if (found && c != null)
			found = this.TestPrompt(c);
		return found;
	},
	TestPrompt: function (c)
	{
		var found = false;
		if ("abcdefgh".indexOf(c) != -1)
		{
			c = this.ToX(c);
			found = this.src % 8 == c;
		}
		else
		{
			c = this.ToY(c);
			found = parseInt(this.src / 8) == c;
		}
		return found;
	},
	SearchNESW: function (c)
	{
		if (!this.SearchNorth(c))
			if (!this.SearchEast(c))
				if (!this.SearchSouth(c))
					if (!this.SearchWest(c))
						return false;
		return true;
	},

	SearchNWNE: function (c)
	{
		if (!this.SearchNW(c))
			if (!this.SearchNE(c))
				if (!this.SearchSE(c))
					if (!this.SearchSW(c))
						return false;
		return true;
	},

	SearchEast: function (c)
	{
		var found = false;
		this.stop = false;
		for (var i = 1; i < 8 - this.x && !this.stop && !found; i++)
		{
			this.src = this.dst + i;
			found = this.TestFound(c);
		}
		return found;
	},

	SearchWest: function(c)
	{
		var found = false;
		this.stop = false;
		for (var i = 1; i <= this.x && !this.stop && !found; i++)
		{
			this.src = this.dst - i;
			found = this.TestFound(c);
		}
		return found;
	},

	SearchSouth: function(c)
	{
		var found = false;
		this.stop = false;
		for (var i = 1; i < 8 - this.y && !this.stop && !found; i++)
		{
			this.src = this.dst + i * 8;
			found = this.TestFound(c);
		}
		return found;
	},

	SearchNorth: function(c)
	{
		var found = false;
		this.stop = false;
		for (var i = 1; i <= this.y && !this.stop && !found; i++)
		{
			this.src = this.dst - i * 8;
			found = this.TestFound(c);
		}
		return found;
	},

	SearchNW: function (c)
	{
		var found = false;
		this.stop = false;
		for (var i = 1; i <= this.x && i <= this.y && !this.stop && !found; i++)
		{
			this.src = this.dst - i * 8 - i;
			found = this.TestFound(c);
		}
		return found;
	},

	SearchNE: function (c)
	{
		var found = false;
		this.stop = false;
		for (var i = 1; i < 8 - this.x && i <= this.y && !this.stop && !found; i++)
		{
			this.src = this.dst - i * 8 + i;
			found = this.TestFound(c);
		}
		return found;
	},

	SearchSE: function (c)
	{
		var found = false;
		this.stop = false;
		for (var i = 1; i < 8 - this.x && i < 8 - this.y && !this.stop && !found; i++)
		{
			this.src = this.dst + i * 8 + i;
			found = this.TestFound(c);
		}
		return found;
	},

	SearchSW: function (c)
	{
		var found = false;
		this.stop = false;
		for (var i = 1; i <= this.x && i < 8 - this.y && !this.stop && !found; i++)
		{
			this.src = this.dst + i * 8 - i;
			found = this.TestFound(c);
		}
		return found;
	},

	SetCaptures: function()
	{
		var id = this.moveId;
		PgnCtrl.captures[id] = [];
		var o = PgnCtrl.captures[id - 1];
		if (o && o.length > 0)
		{
			for (var i = 0; i < o.length; i++)
				PgnCtrl.captures[id].push(o[i]);
		}
		if (this.pgn.indexOf('x') != -1)
			PgnCtrl.captures[id].push(this.state[this.dst]);
	},

	ToX: function (c) { return c.charCodeAt(0) - 97; },
	ToY: function (c) { return 8 - Number(c); },

	CreateMove: function()
	{
		this.SetCaptures();
		this.state = this.state.ReplaceAt(this.src, '.');
		this.state = this.state.ReplaceAt(this.dst, this.rank);
		if (this.enPassant != -1)
			this.state = this.state.ReplaceAt(this.enPassant, '.');
		
		PgnCtrl.states[this.moveId] = this.state;
		PgnCtrl.moves[this.moveId] = new Move(this.pgn, this.src, this.dst, this.clr);
	},
	DoPromotion: function (piece)
	{
		if (this.clr == 'b')
			piece = piece.toLowerCase();
		this.SetCaptures();
		this.state = this.state.ReplaceAt(this.src, '.');
		this.state = this.state.ReplaceAt(this.dst, piece);
		PgnCtrl.states[this.moveId] = this.state;
		PgnCtrl.moves[this.moveId] = new Move(this.pgn, this.src, this.dst, this.clr);
	},
};

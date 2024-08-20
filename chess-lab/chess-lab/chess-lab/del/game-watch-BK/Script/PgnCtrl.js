
var PgnCtrl =
{
	startFen: "rnbqkbnrpppppppp................................PPPPPPPPRNBQKBNR",
	states: [],
	moves: [],
	captures: [[]],
	comments: [],
	headers: [],
	timerId: null,

	moveId: 0,
	boardDiv: null,
	isBoardInverted: false,
	isHeadersVisible: false,
	isHighlighted: false,
	moveOld: null,
	colorBlack: "#b58863",
	colorWhite: "#f0d9b5",

	Init: function (pgn)
	{
		this.states.push(this.startFen);
		this.SetBoard();
		this.SetButtons();
		this.SetCaptured();
		this.SetInfo();
		this.SetPieces();
	},

	SetBoard: function ()
	{
		var
			mainDiv = Append("div", document.body, "id=mainDiv;",
				"width:542px;height:368px;margin:0px;margin-left:4px;border:solid 1px #ccc;overflow: auto;"),
			pgnDiv = Append("div", mainDiv, "id=pgnDiv;",
				"position:absolute;left:380px;top:14px;width:160px;height:360px;margin:0px;margin-left:4px;border:none;overflow: auto;");
		Append("table", pgnDiv, "id=myTable", "float:right;color:#666;margin-right:2px;border:solid 1px #ccc;width:140px;");

		this.boardDiv = Append("div", mainDiv, "id=board;", 
			"width:352px;height:352px;border:solid 1px #797979;position:relative;top:7px;left:7px;");
		for (var i = 0; i < 64; i++)
		{
			var
				x = i % 8,
				y = parseInt(i / 8),
				clr = ((x + y) & 1) ? this.colorBlack : this.colorWhite;
			Append("div", this.boardDiv, "id=b" + i,
				"border:1px solid #ccc;background:" + clr + ";width:44px;height:44px;position:absolute;left:"
				+ x * 44 + "px;top:" + y * 44 + "px;");
		}
	},

	SetButtons: function ()
	{
		var ctrlDiv = Append("div", document.body, "id=ctrlDiv;", 
			"width:542px;height:38px;margin:0px;margin-left:4px;background:#dedede;border:solid 1px #888;");
		var me = this;
		this.AddButton(ctrlDiv, "First", function ()
		{
			if (me.moveId == 0)
				return;
			clearInterval(me.timerId);
			me.moveId = 0;
			me.AnimateTransition(me.states[0]);
		});
		this.AddButton(ctrlDiv, "Prev", function ()
		{
			if (me.moveId == 0)
				return;
			clearInterval(me.timerId);
			me.AnimateTransition(me.states[--me.moveId]);
		});
		this.AddButton(ctrlDiv, "Play", function ()
		{
			clearInterval(me.timerId);
			var delay = 2000;
			me.timerId = setInterval(function ()
			{
				me.AnimateTransition(me.states[++me.moveId]);
				if (me.moveId == me.moves.length - 1)
					clearInterval(me.timerId);
			}, delay);
		});
		
		this.AddButton(ctrlDiv, "Next", function ()
		{
			if (me.moveId == me.moves.length - 1)
				return;
			clearInterval(me.timerId);
			me.AnimateTransition(me.states[++me.moveId]);
		});
		this.AddButton(ctrlDiv, "Last", function ()
		{
			var lastId = me.moves.length - 1;
			if (me.moveId == lastId)
				return;
			clearInterval(me.timerId);
			me.AnimateTransition(me.states[me.moveId = lastId]);
		});
		this.AddButton(ctrlDiv, "Info", function () { ToggleBlock("infoDiv"); });
		this.AddButton(ctrlDiv, "Rotate Board", function ()
		{
			clearInterval(me.timerId);
			if (me.moveOld)
				me.moveOld.Unmark();
			me.isBoardInverted = !me.isBoardInverted;
			me.SetPieces();
		});
	},

	AddButton: function (div, val, action)
	{
		var 
			dx = (val == "First" ? "40px;" : val == "Info" ? "80px;" : "4px;"),
			o = Append("input", div, "type=button;value=" + val, 
				"background:#fdfdfd;border:solid 1px #aaa;border-radius:30%;padding:4px;margin:6px;margin-left:" + dx);
		o.onclick = action;
	},

	SetCaptured: function ()
	{
		var div = Append("div", document.body, "id=capturedDiv",
			"margin:0px;margin-left:4px;width:542px;height:50px;border:solid 1px #888;overflow:auto;");
		Append("div", div, "id=whitesDiv", "width:542px;height:25px;background:#dedede;overflow:auto;");
		Append("div", div, "id=blacksDiv", "width:542px;height:25px;background:#dedede;overflow:auto;");
		Append("div", document.body, "id=commentsDiv", "padding:2px;width:542px;height:60px;border:solid 1px #888;overflow:auto;display:none");
	},

	SetInfo: function ()
	{
		var
			infoDiv = Append("div", document.body, "id=infoDiv",
				"height:366px;display:" + (this.isHeadersVisible ? "block;" : "none")),
			tbl = Append("table", infoDiv, "id=infoTbl",
				"margin:4px;margin-bottom:0px;width:542px;border-collapse:collapse;");
	},

	ResetInfo: function ()
	{
		var tbl = Get("infoTbl");
		Clear(tbl);
		style = "padding-left:4px;border:solid 1px #ccc;", tr = null;
		for (var i = 0; i < this.headers.length; i++)
		{
			tr = Append("tr", tbl, null, null);
			Append("td", tr, null, style).innerHTML = this.headers[i]["key"];
			Append("td", tr, null, style).innerHTML = this.headers[i]["val"];
		}
	},

	SetPieces: function ()
	{
		var o = this.boardDiv;
		while (o.childNodes.length > 64)
			o.removeChild(o.lastChild);
		for (var i = 0; i < 64; i++)
		{
			var rank = this.states[this.moveId].charAt(i);
			if (rank == '.')
				continue;
			this.CreatePiece(rank + i);
		}
	},

	ResetControls: function ()
	{
		if (this.moveOld)
			this.moveOld.Unmark();
		Clear(Get("myTable"));
		Clear(Get("commentsDiv"));
		Clear(Get("whitesDiv"));
		Clear(Get("blacksDiv"));
		var me = this;
		me.moves.length = 0;
		me.comments.length = 0;
		me.headers.length = 0;
		me.captures = [[]];
		me.states.length = 0;
		me.states.push(this.startFen);
		me.moveId = 0;
		me.SetPieces();
	},

	ResetPgn: function()
	{
		var
			tbl = Get("myTable"),
			me = this, tr, td;
		for (var i = 1; i < this.moves.length; i++)
		{
			if (i % 2 != 0)
			{
				tr = Append("tr", tbl, null, null);
				td = Append("td", tr, null, "width:20px;text-align:right;border:solid 1px #eee;font-weight:bold;");
				AppendText(Math.ceil(i / 2) + ".", td);
			}
			td = Append("td", tr, "id=pgn" + i,
				"padding:2px;text-align:center;cursor:pointer;border:solid 1px #888;");
			td.innerHTML = this.moves[i].pgn;
			td.onclick = function (e)
			{
				clearInterval(me.timerId);
				me.moveId = parseInt(e.target.id.substr(3));
				me.AnimateTransition(me.states[me.moveId]);
			};
		}
		me.ResetInfo();
	},

	ToPixelX: function (id)
	{
		var n = Number(id) % 8;
		return (this.isBoardInverted ? 7 - n : n) * 44;
	},

	ToPixelY: function (id)
	{
		var n = Math.floor(id / 8);
		return (this.isBoardInverted ? 7 - n : n) * 44;
	},

	ShowCaptures: function()
	{
		var
			wDiv = Get("whitesDiv"),
			bDiv = Get("blacksDiv");
		Clear(wDiv);
		Clear(bDiv);

		var captures = this.captures[this.moveId];
		if (captures == null || captures.length == 0)
			return;
		var
			white = null,
			black = null,
			w = "QRNBP",
			b =	"qrnbp",
			j = 0, key, c, p;
		for (var i = 0; i < captures.length; i++)
		{
			c = captures[i];
			p = w.indexOf(c);
			if (p != -1) // White piece captured
			{
				if (white == null)
					white = { Q: 0, R: 0, N: 0, B: 0, P: 0 };
				white[w[p]]++;
			}

			p = b.indexOf(c);
			if (p != -1) // Black piece captured
			{
				if (black == null)
					black = { q: 0, r: 0, n: 0, b: 0, p: 0 };
				black[b[p]]++;
			}
		}
		if (white != null)
		{
			for (key in white)
			{
				for (j = 0; j < white[key]; j++)
					Append("img", wDiv, "width=20;height=20;src=" + this.GetImg(key) + ";", null);
			}
		}
		if (black != null)
		{
			for (key in black)
			{
				for (j = 0; j < black[key]; j++)
					Append("img", bDiv, "width=20;height=20;src=" + this.GetImg(key) + ";", null);
			}
		}
	},
	CreatePiece: function (id)
	{
		var
			n = id.substr(1), // e.g. for pawn e2: id = P52, we need 52
			x = PgnCtrl.ToPixelX(n),
			y = PgnCtrl.ToPixelY(n),
			property = "width=44;height=44;id=" + id + ";src=" + this.GetImg(id),
			style = "z-index:100;position:absolute;left:" + x + "px;top:" + y + "px;";
		Append("img", this.boardDiv, property, style);
	},

	AnimateTransition: function (state)
	{
		this.isHighlighted = false;
		var piecesOnBoard = [], needsAnimating = [];
		for (var i = 64; i < this.boardDiv.childNodes.length; i++)
			piecesOnBoard.push({ o: this.boardDiv.childNodes[i], to: "" });

		for (i = 0; i < 64; i++) // Mark empty cells and pieces already in place
		{
			needsAnimating[i] = true;
			var
				ch = state.charAt(i),
				empty = ch == '.',
				found = false, rank, src;
			for (var j = 0; j < piecesOnBoard.length; j++)
			{
				if (piecesOnBoard[j] == null)
					continue;
				rank = piecesOnBoard[j].o.id.substr(0, 1);
				src = piecesOnBoard[j].o.id.substr(1);
				if (Number(src) == i) // Is this piece already in place?
				{
					found = true;
					if (rank == ch)
					{
						piecesOnBoard[j] = null; // Forget the piece
						needsAnimating[i] = false;
						break;
					}
				}
				if (empty && !found) // This square is empty and must stay empty
					needsAnimating[i] = false;
			}
		}

		var
			piece = null,
			move = this.moves[this.moveId],
			pawnToPromote = null,
			canPromote = false;
		for (i = 0; i < 64; i++) // Create new pieces and find cells to move to
		{
			if (!needsAnimating[i])
				continue;
			ch = state.charAt(i);
			if (ch == '.')
				continue;
			id = ch + i;
			if (move)
			{
				canPromote = move.isPromotion && i == move.dst;
				if (canPromote) // Temporarily change piece to promote back to pawn
					id = (ch = move.rank) + i;
			}
			found = false;
			for (j = 0; j < piecesOnBoard.length; j++)
			{
				piece = piecesOnBoard[j];
				if (piece == null)
					continue;
				rank = piece.o.id.substr(0, 1);
				if (rank == ch && piece.to == "") // free to move
				{
					piece.to = id;
					if (canPromote)
						pawnToPromote = piece.o;

					found = true;
					break;
				}
			}
			if (!found)
				this.CreatePiece(id);
		}

		for (j = 0; j < piecesOnBoard.length; j++) // Do animate or remove a piece
		{
			piece = piecesOnBoard[j];
			if (piece == null)
				continue;
			if (piece.to != "")
			{
				var
					n = piece.to.substr(1),
					x = this.ToPixelX(n),
					y = this.ToPixelY(n);
				new MoverTimer(piece.o, { x: x, y: y }, piece.to, 500, this.Highlight, this, pawnToPromote);
			}
			else
				piece.o.parentNode.removeChild(piece.o);
		}
	},

	Highlight: function (pawnToPromote)
	{
		if (this.isHighlighted)
			return;
		for (var i = 1; i < this.moves.length; i++) // Unmark pgn
			Get("pgn" + i).style.backgroundColor = "#ffffff";

		var 
			move = this.moves[this.moveId],
			div = Get("commentsDiv"),
			comment = this.comments[this.moveId];
		if (this.moveId > 0)
		{
			var td = Get("pgn" + this.moveId);
			td.style.backgroundColor = "#acffac"; // Mark pgn
			td.focus();
			move.Mark(this.moveOld); // Mark Path
		}
		else if (this.moveOld)
			this.moveOld.Unmark(); // Unmark Path
		this.moveOld = move;
			
		if (comment)
		{
			div.style.display = "block";
			div.innerHTML = comment;
		}
		else
			div.style.display = "none";
		if (pawnToPromote != null)
		{
			pawnToPromote.parentNode.removeChild(pawnToPromote);
			this.CreatePiece(this.states[this.moveId].charAt(move.dst) + move.dst);
		}
		this.ShowCaptures();
		this.isHighlighted = true;
	},
	GetImg: function (o)
	{
		o = o.substr(0, 1);
		var s =
			o == 'r' ? "RB" :
			o == 'R' ? "RW" :
			o == 'n' ? "NB" :
			o == 'N' ? "NW" :
			o == 'b' ? "BB" :
			o == 'B' ? "BW" :
			o == 'q' ? "QB" :
			o == 'Q' ? "QW" :
			o == 'k' ? "KB" :
			o == 'K' ? "KW" :
			o == 'p' ? "PB" :
			o == 'P' ? "PW" : "";
		return "Images/" + s + ".png;";
	},
};
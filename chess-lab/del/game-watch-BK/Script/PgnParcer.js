var PgnParcer =
{
	text: "",
	token: "",
	key: "",
	value: "",
	pos: 0,
	len: 0,
	moveNo: 0,
	moveId: 1,
	error: "PGN-syntax error: ",
	
	Reset: function()
	{
		this.token = this.key = this.value = "";
		this.pos = this.moveNo = 0;
		this.moveId = 1;
	},
	Process: function (pgn)
	{
		try
		{
			this.text = pgn.trim();
			this.len = this.text.length;
			while (this.ParseInfo())
				PgnCtrl.headers.push({ key: this.key, val: this.value });
			while (this.ParseMove())
				;
		}
		catch (e) { alert(e.message); }
	},

	ParseInfo: function()
	{
		this.SkipSpace();
		if (!isNaN(this.Peek()))
			return false;
		if (this.Peek() == null)
			this.ThrowError(this.error);
		var c = this.Get();
		if (c == '[')
		{
			if (!this.GetToken())
				this.ThrowError(this.error);
			this.key = this.token;
			this.token = "";
			this.SkipSpace();
			if (this.Peek() == null)
				this.ThrowError(this.error);
			while ((c = this.Get()) != null && c != ']')
				this.token += c;
			if (c == null)
				this.ThrowError(this.error);
			this.value = this.token;
			this.token = "";
			return true;
		}
		return false;
	},

	ParseMove: function()
	{
		if (!this.ParseNumber())
			return false;
		this.GetMove('w');
		if (!this.GetMove('b'))
			return false;
		return true;
	},

	ParseNumber: function()
	{
		var c;
		this.token = "";
		this.SkipSpace();
		if (this.Peek() == null)
			return false;
		while (!isNaN(c = this.Get()))
			this.token += c;
		var n = parseInt(this.token);
		if (isNaN(n))
			this.ThrowError("Number is expected: ");
		if (n != this.moveNo + 1)
		{
			this.token += c;
			if ((c = this.GetToken()) == null)
			{
				if (this.IsEndOfGame(this.token))
					return false;
			}
			this.ThrowError("Wrong number: ");
		}
		this.moveNo = n;
		if (c != '.')
			this.ThrowError("Point is expected: ");
		return true;
	},

	GetToken: function()
	{
		var c = null;
		while ((c = this.Get()) != null && c != ' ' && c != '\t' && c != '\r' && c != '\n')
			this.token += c;
		return c;
	},

	GetMove: function(clr)
	{
		var c;
		this.token = "";
		this.SkipSpace();
		if (this.Peek() == null)
		{
			if (clr == 'w')
				this.ThrowError(this.error);
			else
				return false;
		}
		this.GetToken();
		if (this.token.length == 0)
			this.ThrowError(this.error);
		if (this.IsEndOfGame(this.token))
			return false;
		MoveAnalyzer.Analyze(this.moveId, clr, this.token);
		this.ParseComment();
		this.moveId++;
		return true;
	},

	ParseComment: function()
	{
		this.token = "";
		var c = "";
		this.SkipSpace();
		if (this.Peek() == '{')
		{
			c = this.Get(); // Skip '{'
			while ((c = this.Get()) != null && c != '}')
				this.token += c;
			if (c == null)
				this.ThrowError("Move comment error: ");
			PgnCtrl.comments[this.moveId] = this.token;
		}
	},
	
	SkipSpace: function()
	{
		var c = "";
		while (this.pos < this.len && ((c = this.text[this.pos]) == ' ' || c == '\r' || c == '\n' || c == '\t'))
			this.pos++;
	},
	Peek: function() { return this.pos < this.len ? this.text[this.pos] : null; },
	Get: function() { return this.pos < this.len ? this.text[this.pos++] : null; },
	ThrowError: function (msg)
	{
		throw new TypeError(msg + this.token + "\r\nmoveId: " + this.moveId);
	},
	IsEndOfGame: function(s) 
	{
		s = s.Strip();
		return s == "0-1" || s == "1-0" || s == "1/2-1/2";
	},
};
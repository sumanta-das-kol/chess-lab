String.prototype.Trim = function ()
{
	return this.replace(/(^\s*)|(\s*$)/g, "");
}

String.prototype.Clean = function ()
{
	return this.Trim().replace(/\s+/g, " ");
}

String.prototype.Strip = function ()
{
	return this.Trim().replace(/\s+/g, "");
}

String.prototype.Contains = function (s, b)
{
	return (b) ? (b + this + b).indexOf(b + s + b) > -1 : this.indexOf(s) > -1;
}

String.prototype.Enclose = function (c)
{
	return c + this + c;
}

String.prototype.ReplaceAt = function (i, c)
{
	if (i < 0 || this.length - 1 < i)
		return this;
	return this.substr(0, i) + c + this.substr(i + 1);
}

function Append(name, into, properpies, style)
{
	var o = document.createElement(name);
	if (properpies != null)
		AddProperties(o, properpies);
	if (style != null)
		AddProperties(o.style, style);
	into.appendChild(o);
	return o;
}

function AppendText(text, into)
{
	var o = document.createTextNode(text);
	into.appendChild(o);
	return o;
}

function Insert(name, into, before, properpies, style)
{
	var o = document.createElement(name);
	if (properpies != null)
		AddProperties(o, properpies);
	if (style != null)
		AddProperties(o.style, style);
	into.insertBefore(o, before);
	return o;
}

function AddProperties(o, properpies)
{
	var pairs = properpies.split(";");
	if (pairs.length == 0)
		return;
	for (var i = 0; i < pairs.length; i++)
	{
		if (pairs[i] == "")
			continue;
		var pair = pairs[i].split(":");
		if (pair.length < 2)
			pair = pairs[i].split("=");
		if (pair.length < 2)
			return;
		o[pair[0].Trim()] = pair[1].Trim();
	}
}

function GetPropArray(o)
{
	var s = "[";
	for (var p in o)
		if (typeof o[p] != "function")
			s += o[p] + ", ";
	s = s.substr(0, s.length - 2);
	s += "]";
	return s;
}

function Copy(o)
{
	var copy = Object.create(Object.getPrototypeOf(o));
	var propNames = Object.getOwnPropertyNames(o);
	propNames.forEach(function(name)
	{
		var desc = Object.getOwnPropertyDescriptor(o, name);
		Object.defineProperty(copy, name, desc);
	});
	return copy;
}


function Get(el)
{
	return document.getElementById(el) || null;
}

function ToggleBlock(id)
{
	var o = document.getElementById(id);
	with (o.style)
		display = (display == "block" ? "none" : "block");
}


function Clear(control)
{
	var o = typeof control !== "undefined" ? control : document.body;
	var children = o.childNodes;
	while (o.childNodes.length > 0)
		o.removeChild(o.firstChild);
}

function ToggleDiv(e)
{
	var id = e.target.target;
	if (id == null)
		return;
	var d = document.getElementById(id);
	if (d == null)
		return;
	d.style.display = d.style.display == 'block' ? 'none' : 'block';
	e.target.innerHTML = d.style.display == 'block' ? "&nbsp Hide" : "&nbsp Show";
}

function MoverTimer(target, destination, dstId, duration, task, thisArg, pawnPromotion)
{
	if (!(this && this instanceof MoverTimer))
		return;
	if (arguments.length < 2)
		throw new TypeError("MoverTimer - not enough arguments");
	this.target = target;
	if (destination.x == undefined || destination.y == undefined)
		throw new TypeError("MoverTimer - destination must be { x:x, y:y } ");
	this.destination = destination;
	this.dstId = dstId;
	this.duration = 1000;
	if (!isNaN(duration) && duration > 10)
		this.duration = Math.floor(duration);
	this.task = task;

	this.timerId = -1;
	this.style = target.style;
	var
		x = this.style.left,
		y = this.style.top,
		p = x.indexOf('p');
	x = Number(x.substr(0, p));
	p = y.indexOf('p');
	y = Number(y.substr(0, p));
		
	this.dx = 10 * (destination.x - x) / this.duration;
	this.dy = 10 * (destination.y - y) / this.duration;
	this.stop = false;
	
	this.OnTick = function (o)
	{
		o.duration -= 10;
		this.stop = o.duration < 10;
		
		if (this.stop)
		{
			o.style.left = o.destination.x + "px";
			o.style.top = o.destination.y + "px";
			o.target.id = o.dstId;
			o.task.call(thisArg, pawnPromotion);
			clearInterval(o.timerId);
		}
		else
		{
			o.style.left = (x += o.dx) + "px";
			o.style.top = (y += o.dy) + "px";
		}
		return !this.stop;
	};
	this.timerId = setInterval(this.OnTick, 10, this);
}

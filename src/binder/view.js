var Collection = require('../collection');
var Events = require('../events');
var Global = require('../global');

var PATH = Global.rPath;
var PREFIX = Global.rPrefix;
var MODIFIERS = Global.rModifier;
var ATTRIBUTE_ACCEPTS = Global.rAttributeAccepts;
var ELEMENT_ACCEPTS = Global.rElementAccepts;
var ELEMENT_REJECTS = Global.rElementRejects;
var ELEMENT_REJECTS_CHILDREN = Global.rElementRejectsChildren;

function View () {
	Events.call(this);
}

View.prototype = Object.create(Events.prototype);
View.prototype.constructor = View;

View.prototype.glance = function (element) {
	return element.outerHTML
	.replace(/\/?>([\s\S])*/, '')
	.replace(/^</, '');
};

View.prototype.eachElement = function (elements, callback) {
	var element, glance;

	for (var i = 0; i < elements.length; i++) {
		element = elements[i];
		glance = this.glance(element);

		if (ELEMENT_REJECTS.test(glance)) {
			i += element.querySelectorAll('*').length;
		} else if (ELEMENT_REJECTS_CHILDREN.test(glance)) {
			i += element.querySelectorAll('*').length;
			callback.call(this, element);
		} else if (ELEMENT_ACCEPTS.test(glance)) {
			callback.call(this, element);
		}
	}
};

View.prototype.eachAttribute = function (element, callback) {
	var attributes = element.attributes, attribute;

	for (var i = 0; i < attributes.length; i++) {
		attribute = {};
		attribute.name = attributes[i].name;
		attribute.value = attributes[i].value;

		if (ATTRIBUTE_ACCEPTS.test(attribute.name)) {
			attribute.path = attribute.value.replace(PATH, '');
			attribute.opts = attribute.path.split('.');
			attribute.command = attribute.name.replace(PREFIX, '');
			attribute.cmds = attribute.command.split('-');
			attribute.key = attribute.opts.slice(-1);

			if (attribute.value.indexOf('|') === -1) {
				attribute.modifiers = [];
			} else {
				attribute.modifiers = attribute.value.replace(MODIFIERS, '').split(' ');
			}

			callback.call(this, attribute);
		}

	}
};

View.prototype.removeAll = function (pattern) {
	pattern = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

	this.data.forEach(function (paths, path) {
		paths.forEach(function (unit) {
			if (pattern.test(path)) {
				unit.unrender();
			}
		}, this);
	}, this);
};

View.prototype.renderAll = function (pattern) {
	pattern = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

	this.data.forEach(function (paths, path) {
		paths.forEach(function (unit) {
			if (pattern.test(path)) {
				// it is possible that sorting the shortest or first will allow the render to take place upon array replace and re insert
				console.log(path);
				unit.render();
			}
		}, this);
	}, this);
};

View.prototype.addOne = function (element) {
	var self = this;

	self.eachAttribute(element, function (attribute) {

		if (!self.data.has(attribute.path)) {
			self.data.set(attribute.path, new Collection());
		}

		self.emit('add', element, attribute);
	});
};

View.prototype.addAll = function (elements) {
	this.eachElement(elements, function (element) {
		this.addOne(element);
	});
};

View.prototype.setup = function (elements) {
	this.addAll(elements);
	return this;
};

View.prototype.create = function () {
	this.data = new Collection();
	// this.events = {};
	return this;
};

module.exports = function () {
	return new View().create();
};

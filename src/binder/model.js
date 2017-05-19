var Utility = require('../utility');
var Events = require('../events');

function Model () {
	Events.call(this);
}

Model.prototype = Object.create(Events.prototype);
Model.prototype.constructor = Model;

Model.prototype.join = function () {
	return Array.prototype.join
	.call(arguments, '.')
	.replace(/\.{2,}/g, '.')
	.replace(/^\.|\.$/g, '');
};

Model.prototype.every = function (data, callback, index, path) {
	if (data && (data.constructor.name === 'Object' || data.constructor.name === 'Array')) {
		index === undefined ? 0 : index;

		Object.keys(data).slice(index).forEach(function (key) {
			this.every(data[key], callback, 0, this.join(path, key));
			callback.call(this, data, this.join(path, key), key);
		}, this);
	}
};

Model.prototype.clone = function (source, target) {
	target = target || source.constructor();

	Object.keys(source).forEach(function (key) {
		if (source[key] && source[key].constructor.name === 'Object' || source[key].constructor.name === 'Array') {
			target[key] = this.clone(source[key]);
		} else {
			target[key] = source[key];
		}
	}, this);

	return target;
};

Model.prototype.defineArrayMethod = function (context, method, path, argument) {
	var self = this, result, index;

	if (method === 'splice') {
		Array.prototype.slice.call(argument, 2).forEach(function (value) {
			if (value && (value.constructor.name === 'Object' || value.constructor.name === 'Array')) value = self.define(path, value, true);
			Array.prototype.splice.call(context.meta, argument[0], argument[1], value);
			self.defineProperty(path, context, context.meta.length-1);
		});

		self.every(context, function (d, p, k) {
			self.emit('change', self.join(path, p), d, k);
		}, argument[0] < 0  && argument[1] === 0 ? argument[0]-1 : argument[0]);

	} else if (method === 'push' || method === 'unshift') {
		index = method === 'push' ? -1 : 0;

		Array.prototype.forEach.call(argument, function (value) {
			if (value && (value.constructor.name === 'Object' || value.constructor.name === 'Array')) value = self.define(path, value);
			result = Array.prototype[method].call(context.meta, value);
			self.defineProperty(path, context, context.meta.length-1);
		});

		self.emit('change', self.join(path), context);

		// self.every(context, function (d, p, k) {
		// 	self.emit('change', self.join(path, p), d, k);
		// }, index);

	} else if (method === 'pop' || method === 'shift') {
		index = context.length.toString();
		result = Array.prototype[method].call(context);

		// self.every(result, function (d, p, k) {
		// 	d[k] = undefined;
		// 	self.emit('change', self.join(path, index, p), d, k);
		// });

		self.emit('change', self.join(path, index), undefined);

		// if (method === 'shift') {
		// 	self.every(context, function (d, p, k) {
		// 		self.emit('change', self.join(path, p), d, k);
		// 	});
		// }
	}

	return result;
};

Model.prototype.defineArray = function (path, data) {
	var self = this;

	return Object.defineProperties(data, {
		splice: {
			value: function () {
				return self.defineArrayMethod(this, 'splice', path, arguments);
			}
		},
		push: {
			value: function () {
				return self.defineArrayMethod(this, 'push', path, arguments);
			}
		},
		unshift: {
			value: function () {
				return self.defineArrayMethod(this, 'unshift', path, arguments);
			}
		},
		pop: {
			value: function () {
				return self.defineArrayMethod(this, 'pop', path);
			}
		},
		shift: {
			value: function () {
				return self.defineArrayMethod(this, 'shift', path);
			}
		}
	});
};

Model.prototype.defineObject = function (path, data) {
	var self = this;

	return Object.defineProperties(data, {
		set: {
			value: function (key, value) {
				if (value && (value.constructor.name === 'Object' || value.constructor.name === 'Array')) {
					this.meta[key] = self.define(path, value, true);
				} else {
					this.meta[key] = value;
				}

				self.emit('change', self.join(path, key), this, key);
			}
		},
		remove: {
			value: function (key) {
				delete this[key];
				self.emit('change', self.join(path, key), this, key);
			}
		}
	});
};

Model.prototype.defineProperty = function (path, data, key) {
	var self = this;

	return Object.defineProperty(data, key, {
		enumerable: true,
		configurable: true,
		get: function () {
			return this.meta[key];
		},
		set: function (value) {
			if (value === undefined) {
				var item = this[key];
				delete this[key];
				delete this.meta[key];

				self.every(item, function (d, p) {
					self.emit('change', self.join(key, path, p), undefined);
				});

				self.emit('change', self.join(key, path), undefined);
			} else {
				if (value && (value.constructor.name === 'Object' || value.constructor.name === 'Array')) {
					this.meta[key] = self.define(self.join(path, key), value, true);
				} else {
					this.meta[key] = value;
				}

				self.emit('change', self.join(path, key), data, key);
			}
		}
	});
};

Model.prototype.define = function (path, source, emit) {
	var type = source ? source.constructor.name : '';
	if (type !== 'Object' && type !== 'Array' ) return source;

	var target = this.clone(source);

	if (type === 'Object') {
		this.defineObject(path, target);
	} else if (type === 'Array') {
		this.defineArray(path, target);
	}

	Object.defineProperty(target, 'meta', {
		writable: true,
		configurable: true,
		value: target.constructor()
	});

	Object.keys(target).forEach(function (key) {
		if (target[key] !== undefined) {

			if (target[key] && (target[key].constructor.name === 'Object' || target[key].constructor.name === 'Array')) {
				target[key] = this.define(path, target[key]);
			}

			target.meta[key] = target[key];
			this.defineProperty(path, target, key);
			if (emit) this.emit('change', this.join(path, key), target, key);
		}
	}, this);

	return target;
};

Model.prototype.set = function (path, value) {
	return Utility.setByPath(this.data, path, value);
};

Model.prototype.get = function (path) {
	return Utility.getByPath(this.data, path);
};

Model.prototype.setup = function (data) {
	this.data = this.define('', data);
	return this;
};

Model.prototype.create = function () {
	this.events = {};
	return this;
};

module.exports = function (data) {
	return new Model().create(data);
};

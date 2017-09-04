
export default function Loader (options) {
	this.files = {};
	this.modules = {};
	this.setup(options);
}

Loader.prototype.LOADED = 3;
Loader.prototype.LOADING = 2;

Loader.prototype.patterns = {
	imps: /import\s+\w+\s+from\s+(?:'|").*?(?:'|")/g,
	imp: /import\s+(\w+)\s+from\s+(?:'|")(.*?)(?:'|")/,
	exps: /export\s+(?:default\s*)?(?:function)?\s+(\w+)/g,
	exp: /export\s+(?:default\s*)?(?:function)?\s+(\w+)/,
};

Loader.prototype.setup = function (options) {
	options = options || {};
	this.esm = options.esm || false;
	for (var i = 0, l = options.loads.length; i < l; i++) {
		this.run(options.loads[i]);
	}
};

Loader.prototype.getFile = function (data, callback) {
	var self = this;

	if (data.file in self.modules && data.status) {
		if (data.status === self.LOADED) {
			if (callback) callback();
		} else if (data.status === self.LOADING) {
			if (!data.tag) {
				data.xhr.addEventListener('readystatechange', function () {
					if (data.xhr.readyState === 4) {
						if (data.xhr.status >= 200 && data.xhr.status < 400) {
							if (callback) callback(data);
						} else {
							throw data.xhr.responseText;
						}
					}
				});
			} else {
				data.element.addEventListener('load', function () {
					if (callback) callback(data);
				});
			}
		}

		return;
	}

	if (!data.tag) {
		data.xhr = new XMLHttpRequest();
		data.xhr.addEventListener('readystatechange', function () {
			if (data.xhr.readyState === 4) {
				if (data.xhr.status >= 200 && data.xhr.status < 400) {
					data.status = self.LOADED;
					data.text = data.xhr.responseText;
					if (callback) callback(data);
				} else {
					throw data.xhr.responseText;
				}
			}
		});
		data.xhr.open('GET', data.file);
		data.xhr.send();
	}

	data.status = self.LOADING;
};

Loader.prototype.interpret = function (data) {
	return (function(d, l, w) { 'use strict';
		return new Function('Loader', 'window', d)(l, w);
	}(data, this, window));
};

Loader.prototype.getImports = function (data) {
	var imp, imports = [];
	var imps = data.match(this.patterns.imps) || [];
	for (var i = 0, l = imps.length; i < l; i++) {
		imp = imps[i].match(this.patterns.imp);
		imports[i] = {
			raw: imp[0],
			name: imp[1],
			file: imp[2]
		};
	}
	return imports;
};

Loader.prototype.getExports = function (data) {
	return data.match(this.patterns.exps) || [];
};

Loader.prototype.handleImports = function (ast) {
	for (var i = 0, l = ast.imports.length; i < l; i++) {
		ast.cooked = ast.cooked.replace(ast.imports[i].raw, 'var ' + ast.imports[i].name + ' = Loader.modules[\'' + ast.imports[i].file + '\']');
	}
};

Loader.prototype.handleExports = function (ast) {
	ast.cooked = ast.cooked.replace('export default', 'return');
};

Loader.prototype.toAst = function (data) {
	var ast = {};
	ast.raw = data;
	ast.imports = this.getImports(ast.raw);
	ast.exports = this.getExports(ast.raw);
	ast.cooked = ast.raw;
	this.handleImports(ast);
	this.handleExports(ast);
	return ast;
};

Loader.prototype.run = function (data, callback) {
	var self = this;

	if (data.constructor === String) data = { file: data };

	self.files[data.file] = data;

	self.getFile(data, function (d) {
		var ast = self.toAst(d.text);

		if (self.esm) {
			if (ast.imports.length) {
				var meta = {
					count: 0,
					imports: ast.imports,
					total: ast.imports.length,
					listener: function () {
						if (++meta.count === meta.total) {
							self.interpret(ast.cooked);
							if (callback) callback();
						}
					}
				};

				for (var i = 0, l = meta.imports.length; i < l; i++) {
					self.run(meta.imports[i].file, meta.listener);
				}
			} else {
				self.modules[d.file] = self.interpret(ast.cooked);
				if (callback) callback();
			}
		} else {
			self.modules[d.file] = self.interpret(d.text);
			if (callback) callback();
		}
	});
};

/*
	https://www.nczonline.net/blog/2013/06/25/eval-isnt-evil-just-misunderstood/
*/
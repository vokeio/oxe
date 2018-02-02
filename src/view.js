import Global from './global';

var View = function () {

	this.data = {};

	document.addEventListener('input', this.inputListener.bind(this), true);
	document.addEventListener('change', this.changeListener.bind(this), true);

	if (document.readyState === 'interactive' || document.readyState === 'complete') {
		this.add(document.body);
	} else {
		document.addEventListener('DOMContentLoaded', function _ () {
			this.add(document.body);
			document.removeEventListener('DOMContentLoaded', _);
		}.bind(this), true);
	}

	this.mutationObserver = new MutationObserver(this.mutationListener.bind(this));
	this.mutationObserver.observe(document.body, { childList: true, subtree: true });
};

View.prototype.hasAcceptAttribute = function (element) {
	var attributes = element.attributes;

	for (var i = 0, l = attributes.length; i < l; i++) {
		var attribute = attributes[i];

		if (
			attribute.name.indexOf('o-') === 0
			|| attribute.name.indexOf('data-o-') === 0
		) {
			return true;
		}

	}

	return false;
};

View.prototype.eachAttribute = function (element, callback) {
	var attributes = element.attributes;

	for (var i = 0, l = attributes.length; i < l; i++) {
		var attribute = attributes[i];

		if (attribute.name.indexOf('o-') !== 0
			&& attribute.name.indexOf('data-o-') !== 0
		) {
			continue;
		}

		if (
			attribute.name !== 'o-auth'
			&& attribute.name !== 'o-scope'
			&& attribute.name !== 'o-reset'
			&& attribute.name !== 'o-method'
			&& attribute.name !== 'o-action'
			&& attribute.name !== 'o-external'
			&& attribute.name !== 'data-o-auth'
			&& attribute.name !== 'data-o-scope'
			&& attribute.name !== 'data-o-reset'
			&& attribute.name !== 'data-o-method'
			&& attribute.name !== 'data-o-action'
			&& attribute.name !== 'data-o-external'
		) {
			callback.call(this, attribute);
		}

	}

};

View.prototype.each = function (element, callback, container) {

	if (
		element.nodeName !== 'O-ROUTER'
		&& !element.hasAttribute('o-setup')
		&& !element.hasAttribute('o-router')
		&& !element.hasAttribute('o-external')
		&& !element.hasAttribute('data-o-setup')
		&& !element.hasAttribute('data-o-router')
		&& !element.hasAttribute('data-o-external')
		&& this.hasAcceptAttribute(element)
	) {

		if (element.hasAttribute('o-scope') || element.hasAttribute('data-o-scope')) {
			container = element;
		} else if (!document.body.contains(element)) {
			container = Global.utility.getScope(container);
		} else if (!container) {
			container = Global.utility.getScope(element);
		}

		var scope = container.getAttribute('o-scope') || container.getAttribute('data-o-scope');

		callback.call(this, element, container, scope);
	}

	if (
		// element.nodeName !== 'SVG'
		element.nodeName !== 'STYLE'
		& element.nodeName !== 'SCRIPT'
		& element.nodeName !== 'OBJECT'
		& element.nodeName !== 'IFRAME'
	) {

		for (var i = 0, l = element.children.length; i < l; i++) {
			this.each(element.children[i], callback, container);
		}

	}

};

View.prototype.add = function (addedElement) {
	this.each(addedElement, function (element, container, scope) {
		this.eachAttribute(element, function (attribute) {
			Global.binder.render({
				scope: scope,
				element: element,
				container: container,
				name: attribute.name,
				value: attribute.value
			});
		});
	});
};

View.prototype.remove = function (removedElement, target) {
	this.each(removedElement, function (element, container, scope) {
		this.eachAttribute(element, function (attribute) {
			Global.binder.unrender({
				scope: scope,
				element: element,
				container: container,
				name: attribute.name,
				value: attribute.value
			});
		});
	}, target);
};

View.prototype.inputListener = function (e) {
	if (
		e.target.type !== 'checkbox'
		&& e.target.type !== 'radio'
		&& e.target.type !== 'option'
		&& e.target.nodeName !== 'SELECT'
	) {
		Global.binder.render({
			name: 'o-value',
			element: e.target,
		}, 'view');
	}
};

View.prototype.changeListener = function (e) {
	Global.binder.render({
		name: 'o-value',
		element: e.target,
	}, 'view');
};

View.prototype.mutationListener = function (mutations) {
	var c, i = mutations.length;

	while (i--) {
		var target = mutations[i].target;
		var addedNodes = mutations[i].addedNodes;
		var removedNodes = mutations[i].removedNodes;

		c = addedNodes.length;

		while (c--) {
			var addedNode = addedNodes[c];

			if (addedNode.nodeType === 1 && !addedNode.inRouterCache) {

				if (addedNode.isRouterComponent) {
					addedNode.inRouterCache = true;
				}

				this.add(addedNode);
			}

		}

		c = removedNodes.length;

		while (c--) {
			var removedNode = removedNodes[c];

			if (removedNode.nodeType === 1 && !removedNode.inRouterCache) {

				if (removedNode.isRouterComponent) {
					removedNode.inRouterCache = true;
				}

				this.remove(removedNode, target);
			}

		}

	}

};

export default View;

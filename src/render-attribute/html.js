
export default function (binder, data) {
	return {
		read () {

			if (data === undefined || data === null) {
				return false;
			} else if (typeof data === 'object') {
				data = JSON.stringify(data);
			} else if (typeof data !== 'string') {
				data = String(data);
			}

			if (data === binder.element.innerHTML) {
				return false;
			}

		},
		write () {
			binder.element.innerHTML = data;
		}
	};
};

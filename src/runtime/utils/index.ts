import { Listener, ListenerNode } from "./types";

export class EventListener<T> implements Listener {
	private _head!: ListenerNode;

	public do(callback: (value: T) => void): Listener {
		const node: ListenerNode = {
			value: callback,
			next: this._head,
		};

		this._head = node;

		return this;
	}

	public notify(value: T): void {
		let item = this._head;

		while (item !== undefined) {
			item.value(value);

			item = item.next;
		}
	}
}

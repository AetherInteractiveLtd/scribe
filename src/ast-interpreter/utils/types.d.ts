export declare type ListenerNode = {
	value: Callback;
	next: ListenerNode;
};

export interface Listener {
	do(callback: Callback): void;
	notify(value: unknown): void;
}

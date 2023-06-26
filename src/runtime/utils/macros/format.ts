const pattern = "{}";

/**
 * Formats a string such as this `$format("Hello, {}", "world!")`
 *
 * @param str the string to format.
 * @param arguments the arguments given.
 */
export default function format(str: string, ...args: Array<string>): string {
	let last: number | undefined = 0;

	let strCopy = str;
	let formatted = "";

	for (const _ of str.gmatch(pattern)) {
		const [fst, fnl] = str.find(pattern, last);

		let arg!: string;
		if (!(fst === undefined && fnl === undefined)) {
			arg = args.shift() as string;

			if (arg === undefined) throw `Arguments mismatch within the formatting macro.`;
		}

		strCopy = str.sub(1, fst! - 1) + arg;
		formatted = strCopy + str.sub(fnl! + 1, str.size());

		last = fnl;
	}

	return formatted;
}

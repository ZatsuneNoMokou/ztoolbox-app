import {Dict} from "../../browserViews/js/bo/Dict.js";

type UserscriptRawMeta = (string | [string, string])[];
const metaRegex = /(?:\/\*|\/\/)\s*==(?<type>UserStyle|UserScript)==\s*\n\s*(?<meta>.*?)\n\s*(?:==\/UserStyle==\s*\*\/|\/\/\s*==\/UserScript==)\n?/s;

export class UserscriptMeta {
	readonly #fileContent: string
	readonly #userscriptMeta: UserscriptRawMeta
	readonly #fileName: string
	constructor(fileContent: string, fileName: string) {
		this.#fileName = fileName;
		const {fileContent: _fileContent, userscriptMeta} = this.#parseFileCode(fileContent);
		this.#fileContent = _fileContent;
		this.#userscriptMeta = userscriptMeta;
	}

	get fileContent(): string {
		return this.#fileContent;
	}

	#parseFileCode(fileContent: string) {
		const result = metaRegex.exec(fileContent);
		if (!result || !result.groups) throw new Error(`Could not parse userscript meta with "${this.#fileName}"`);

		const userscriptMeta: UserscriptRawMeta = [];
		for (let line of result.groups.meta.split(/\s*\n\s*/)) {
			const data = line.match(/@([\w-]+)\s*(.*)/);
			if (data) {
				userscriptMeta.push([data[1], data[2]]);
			}
		}

		return {
			fileContent: fileContent.replace(result[0], ''),
			userscriptMeta,
		};
	}

	getAll(metaName: string): string[]|boolean {
		const output: string[] = [];
		let asBoolean = false;

		for (let line of this.#userscriptMeta) {
			if (Array.isArray(line) && (line.at(1) ?? '').length > 0) {
				const [name, value] = line;
				if (metaName === name) {
					output.push(value);
				}
			} else if (metaName === line) {
				asBoolean = true;
			}
		}

		if (this.#userscriptMeta.length > 0 && output.length === 0) return asBoolean;
		return output;
	}

	get(metaName: string): string|boolean|undefined {
		const values = this.getAll(metaName);
		return Array.isArray(values) ? values.at(0) : values;
	}

	toJSON(): Dict<string|boolean> {
		const json: Dict<string|boolean> = {};

		for (let item of this.#userscriptMeta) {
			if (Array.isArray(item) && (item.at(1) ?? '').length > 0) {
				json[item[0]] = item[1];
			} else {
				json[item[0]] = true;
			}
		}

		return json;
	}
}

import {Dict} from "../../browserViews/js/bo/Dict.js";

export interface IUserscriptJson {
	name: string
	fileName: string
	ext: string
	content: string
	domains: string[]
	tags: string[]
	grant?: string[]
	match?: string[]
	excludeMatches?: string[]
	meta: Dict<string | boolean>
}

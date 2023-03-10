interface Dict<T> {
	[key: string]: T | undefined;
}

interface IButtonConfig {
	type: 'button',
	group?: string
}

interface IConfigBase<T extends SettingValues> {
	value: T,
	group?: string
}

interface IStringConfig extends IConfigBase<string> {
	type: 'string'
}

interface IMenuListConfig extends IConfigBase<string> {
	type: 'menulist'
	options: {value: string, label: string}[]
}

interface IColorConfig extends IConfigBase<string> {
	type: 'color'
}

interface IIntegerInputNumberConfig extends IConfigBase<number> {
	type: 'integer'
	minValue?: number
	maxValue?: number
	rangeInput?: false
}
interface IIntegerInputRangeConfig extends IConfigBase<number> {
	type: 'integer'
	minValue: number
	maxValue: number
	stepValue?: number
	rangeInput: true
}

interface IBooleanConfig extends IConfigBase<boolean> {
	type: 'bool'
}

interface IJsonConfig extends IConfigBase<SettingJsonValue> {
	type: 'json'
}

interface IYamlConfig extends IConfigBase<SettingJsonValue> {
	type: 'yaml'
}

export type IPathConfigFilter = {
	name: string
	extensions: string[]
};
interface IPathConfig extends IConfigBase<string> {
	type: 'path',
	opts: {
		asText?: boolean
		asFile?: IPathConfigFilter[]|true // file filter for file input, true for path input
	}
}
interface IPathsConfig extends IConfigBase<string[]> {
	type: 'paths',
	opts: {
		asFile?: IPathConfigFilter[]|true // file filter for file input, true for path input
	}
}

export type SettingConfig =
	IButtonConfig |
	IStringConfig |
	IColorConfig |
	IMenuListConfig |
	IIntegerInputNumberConfig |
	IIntegerInputRangeConfig |
	IBooleanConfig |
	IJsonConfig |
	IYamlConfig |
	IPathConfig |
	IPathsConfig
;
export type SettingJsonValue = Dict<string|boolean|number|null>;
export type SettingValues = string|string[]|number|boolean|SettingJsonValue
export type SettingsConfig = Dict<SettingConfig>;



export type PrimitivesValues = string | number | boolean | null;
export type RandomJsonData = PrimitivesValues | Dict<RandomJsonData|PrimitivesValues> | PrimitivesValues[];

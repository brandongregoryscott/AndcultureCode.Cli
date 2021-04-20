import { CollectionUtils, StringUtils } from "andculturecode-javascript-core";
import { Options } from "../constants/options";
import { CommandDefinitionUtils } from "../utilities/command-definition-utils";
import { Constants } from "./constants";
import { Echo } from "./echo";
import { Formatters } from "./formatters";
import upath from "upath";
import os from "os";
import shell from "shelljs";
import fs from "fs";
import { File } from "./file";
import { ListCommandsOptions } from "../interfaces/list-commands-options";
import { CommandDefinitions } from "./command-definitions";

// -----------------------------------------------------------------------------------------
// #region Interfaces
// -----------------------------------------------------------------------------------------

/**
 * DTO for parsing & storing command/option info from commander's output
 */
interface CommandStructure {
    command: string;
    options: string[];
    parent: string | null;
}

// #endregion Interfaces

// -----------------------------------------------------------------------------------------
// #region Constants
// -----------------------------------------------------------------------------------------

const { CLI_CONFIG_DIR, DIST, ENTRYPOINT } = Constants;
const { difference, hasValues, isEmpty } = CollectionUtils;
const { shortFlag: helpFlag } = Options.Help;
const CACHE_FILENAME = "commands.json";
const CACHE_PATH = upath.join(os.homedir(), CLI_CONFIG_DIR, CACHE_FILENAME);
const COMMANDS_START_STRING = "Commands:";
const COMMANDS_END_STRING = "help [command]";
const DEFAULT_INDENT = 4;
const DEFAULT_OPTIONS: Required<ListCommandsOptions> = {
    includeHelp: false,
    indent: DEFAULT_INDENT,
    useColor: true,
    prefix: "- [ ] ",
    skipCache: false,
};
const OPTIONS_START_STRING = "Options:";
const OPTIONS_END_STRING = Options.Help.toString();
const PARENT_COMMANDS = CommandDefinitionUtils.getNames();

// #endregion Constants

// -----------------------------------------------------------------------------------------
// #region Variables
// -----------------------------------------------------------------------------------------

let _options: ListCommandsOptions = DEFAULT_OPTIONS;
let _structures: CommandStructure[] = [];

// #endregion Variables

// -----------------------------------------------------------------------------------------
// #region Public Functions
// -----------------------------------------------------------------------------------------

const ListCommands = {
    DEFAULT_OPTIONS,
    cmd(command: string): string {
        const cliEntrypoint = upath.join(".", DIST, ENTRYPOINT);
        return `node ${cliEntrypoint} ${command} ${helpFlag}`;
    },
    description(): string {
        return CommandDefinitions.ls.description;
    },
    run(options: ListCommandsOptions): void {
        this.setOptions(options);

        _parseOrReadCache();
        _printStructure(_structures, 0);
        if (_options.skipCache === true) {
            _saveCachedFile();
        }
    },
    setOptions(updated: Partial<ListCommandsOptions>) {
        _options = { ...DEFAULT_OPTIONS, ..._options, ...updated };
    },
};

// #endregion Public Functions

// -----------------------------------------------------------------------------------------
// #region Private Functions
// -----------------------------------------------------------------------------------------

const _addOrUpdateStructure = (command: string, options: string[]) => {
    const commands = command.split(" ");
    const hasNestedCommands = command.includes(" ");
    // Remove the last space-separated string if present as it should be the deepest child
    command = hasNestedCommands ? commands.pop()! : command;
    // If there are nested commands, pop off the closest parent from the end of the string (supports nesting of any depth)
    const parent = hasNestedCommands ? commands.pop()! : null;

    const findByCommand = (existing: CommandStructure) =>
        existing.command === command;
    const existing = _structures.find(findByCommand);
    if (existing == null) {
        _structures.push({
            command,
            options,
            parent,
        });
        return;
    }

    _structures = _structures.filter((existing) => !findByCommand(existing));
    _structures.push({
        ...existing,
        command,
        parent,
    });
};

const _diffParentCommands = () => {
    const cachedParentCommands = _structures
        .filter((structure) => structure.parent == null)
        .map((structure) => structure.command);

    const parentCommandsDiffer =
        hasValues(difference(PARENT_COMMANDS, cachedParentCommands)) ||
        hasValues(difference(cachedParentCommands, PARENT_COMMANDS));

    if (!parentCommandsDiffer) {
        return;
    }

    ListCommands.setOptions({ skipCache: true });
    Echo.message(
        "Detected changes in parent commands that are not yet saved to the cache file - rebuilding."
    );
};

const _filterLinesByPattern = (
    output: string,
    startPattern: string,
    endPattern: string
): string[] => {
    let lines = output.split("\n");
    const start = lines.findIndex((line) => line.includes(startPattern));
    const end = lines.findIndex((line) => line.includes(endPattern));

    lines = lines
        .slice(start + 1, end + 1)
        // Commands and options both start with two spaces in the command help output
        .map((line) => line.split("  ")[1])
        .filter(
            // Some additional sanitization - empty lines obviously have no option or command in them
            // and lines with tabs in them are more than likely custom command/option descriptions
            (line) => StringUtils.hasValue(line) && !line.includes("\t")
        );

    if (!_options.includeHelp) {
        lines = lines.filter(
            (line) =>
                line !== OPTIONS_END_STRING && line !== COMMANDS_END_STRING
        );
    }

    return lines;
};

const _echoFormatted = (value: string, indent: number = 0) =>
    Echo.message(`${" ".repeat(indent)}${_options.prefix}${value}`, false);

const _parseChildrenAndOptions = (command: string) => {
    const { stdout } = shell.exec(ListCommands.cmd(command), { silent: true });

    const children = _parseChildren(stdout);
    children.forEach((child: string) => {
        // Recursively parse children/options
        _parseChildrenAndOptions(`${command} ${child}`);
    });

    const options = _parseOptions(stdout);
    _addOrUpdateStructure(command, options);
};

const _parseOrReadCache = () => {
    _readCachedFile();
    _diffParentCommands();

    if (_options.skipCache == null || !_options.skipCache) {
        return;
    }

    PARENT_COMMANDS.forEach(_parseChildrenAndOptions);
};

const _readCachedFile = () => {
    if (_options.skipCache === true) {
        Echo.message("Skipping cache if it exists...");
        return;
    }

    if (!File.exists(CACHE_PATH)) {
        ListCommands.setOptions({ skipCache: true });
        Echo.message("No cached file found, building from scratch.");
        return;
    }

    Echo.message("Found command list cache, attempting to read...");
    try {
        const file = fs.readFileSync(CACHE_PATH);
        _structures = JSON.parse(file.toString());
    } catch (error) {
        ListCommands.setOptions({ skipCache: true });
        Echo.error(
            `There was an error attempting to read or deserialize the file at ${CACHE_PATH} - ${error}`
        );
        return;
    }
};

const _parseChildren = (stdout: string) =>
    _filterLinesByPattern(stdout, COMMANDS_START_STRING, COMMANDS_END_STRING);

const _parseOptions = (stdout: string) =>
    _filterLinesByPattern(stdout, OPTIONS_START_STRING, OPTIONS_END_STRING);

const _printStructure = (
    structures: CommandStructure[],
    indent: number = DEFAULT_INDENT
) => {
    let parents = structures.filter((structure) => structure.parent == null);

    if (isEmpty(parents)) {
        parents = [...structures];
    }

    parents.forEach((parent) => {
        _echoFormatted(
            _options.useColor
                ? Formatters.green(parent.command)
                : parent.command,
            indent
        );

        const children = _structures.filter(
            (child: CommandStructure) => child.parent === parent.command
        );

        _printStructure(children, indent + _options.indent! * 2);

        parent.options.forEach((option: string) =>
            _echoFormatted(
                _options.useColor ? Formatters.yellow(option) : option,
                indent + _options.indent!
            )
        );
    });
};

const _saveCachedFile = () => {
    Echo.message(`Writing command list to cached file at ${CACHE_PATH}...`);
    try {
        shell.mkdir("-p", upath.dirname(CACHE_PATH));
        shell.touch(CACHE_PATH);
        fs.writeFileSync(CACHE_PATH, JSON.stringify(_structures, undefined, 4));
    } catch (error) {
        Echo.error(`There was an error writing to ${CACHE_PATH} - ${error}`);
    }

    Echo.success("Cached file successfully updated.");
};

// #endregion Private Functions

// -----------------------------------------------------------------------------------------
// #region Exports
// -----------------------------------------------------------------------------------------

export { ListCommands };

// #endregion Exports

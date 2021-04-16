#!/usr/bin/env node

import { CommandRunner } from "./modules/command-runner";
import { CommandDefinitions } from "./modules/command-definitions";
import program from "commander";
import { CollectionUtils, StringUtils } from "andculturecode-javascript-core";
import { CommandDefinitionUtils } from "./utilities/command-definition-utils";
import { Options } from "./constants/options";
import { Constants } from "./modules/constants";
import { Echo } from "./modules/echo";
import upath from "upath";
import shell from "shelljs";
import os from "os";
import fs from "fs";
import { File } from "./modules/file";
import { Formatters } from "./modules/formatters";

// -----------------------------------------------------------------------------------------
// #region Interfaces
// -----------------------------------------------------------------------------------------

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
const OPTIONS_START_STRING = "Options:";
const OPTIONS_END_STRING = Options.Help.toString();
const PARENT_COMMANDS = CommandDefinitionUtils.getNames();

// #endregion Constants

// -----------------------------------------------------------------------------------------
// #region Variables
// -----------------------------------------------------------------------------------------

let _cachedStructures: CommandStructure[] = [];
let _useColor: boolean = true;
let _prefix: string = "- [ ] ";
let _includeHelp: boolean = false;
let _indent: number = 4;
let _useCache: boolean = true;

// #endregion Variables

CommandRunner.run(async () => {
    // -----------------------------------------------------------------------------------------
    // #region Functions
    // -----------------------------------------------------------------------------------------

    const addOrUpdateStructure = (command: string, options: string[]) => {
        const commands = command.split(" ");
        const hasNestedCommands = command.includes(" ");
        // Remove the last space-separated string if present as it should be the deepest child
        command = hasNestedCommands ? commands.pop()! : command;
        // If there are nested commands, pop off the closest parent from the end of the string (supports nesting of any depth)
        const parent = hasNestedCommands ? commands.pop()! : null;

        const findByCommand = (existing: CommandStructure) =>
            existing.command === command;
        const existing = _cachedStructures.find(findByCommand);
        if (existing == null) {
            _cachedStructures.push({
                command,
                options,
                parent,
            });
            return;
        }

        _cachedStructures = _cachedStructures.filter(
            (existing) => !findByCommand(existing)
        );
        _cachedStructures.push({
            ...existing,
            command,
            parent,
        });
    };

    const buildHelpCommand = (command: string) =>
        `node ${upath.join(".", DIST, ENTRYPOINT)} ${command} ${helpFlag}`;

    const filterLinesByPattern = (
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

        if (!_includeHelp) {
            lines = lines.filter(
                (line) =>
                    line !== OPTIONS_END_STRING && line !== COMMANDS_END_STRING
            );
        }

        return lines;
    };

    const echoFormatted = (value: string, indent: number = 0) =>
        Echo.message(`${" ".repeat(indent)}${_prefix}${value}`, false);

    const parseChildrenAndOptions = (command: string) => {
        const { stdout } = shell.exec(buildHelpCommand(command));

        const children = parseChildren(stdout);
        children.forEach((child: string) => {
            // Recursively parse children/options
            parseChildrenAndOptions(`${command} ${child}`);
        });

        const options = parseOptions(stdout);
        addOrUpdateStructure(command, options);
    };

    const parseOrReadCache = () => {
        readCachedFile();

        if (_useCache) {
            return;
        }

        const commands = CommandDefinitionUtils.getNames();
        commands.forEach(parseChildrenAndOptions);
    };

    const readCachedFile = () => {
        if (!_useCache) {
            Echo.message("Skipping cache if it exists...");
            return;
        }

        if (!File.exists(CACHE_PATH)) {
            _useCache = false;
            Echo.message("No cached file found, building from scratch.");
            return;
        }

        Echo.message("Found command list cache, attempting to read...");
        try {
            const file = fs.readFileSync(CACHE_PATH);
            _cachedStructures = JSON.parse(file.toString());
        } catch (error) {
            _useCache = false;
            Echo.error(
                `There was an error attempting to read or deserialize the file at ${CACHE_PATH} - ${error}`
            );
            return;
        }

        const cachedParentCommands = _cachedStructures
            .filter((structure: CommandStructure) => structure.parent == null)
            .map((structure: CommandStructure) => structure.command);

        const parentCommandsDiffer =
            hasValues(difference(PARENT_COMMANDS, cachedParentCommands)) ||
            hasValues(difference(cachedParentCommands, PARENT_COMMANDS));

        if (!parentCommandsDiffer) {
            return;
        }

        _useCache = false;
        Echo.message(
            "Detected changes in parent commands that are not yet saved to the cache file - rebuilding."
        );
    };

    const parseChildren = (stdout: string) =>
        filterLinesByPattern(
            stdout,
            COMMANDS_START_STRING,
            COMMANDS_END_STRING
        );

    const parseOptions = (stdout: string) =>
        filterLinesByPattern(stdout, OPTIONS_START_STRING, OPTIONS_END_STRING);

    const printStructure = (
        structures: CommandStructure[],
        indent: number = _indent
    ) => {
        let parents = structures.filter(
            (structure) => structure.parent == null
        );

        if (isEmpty(parents)) {
            parents = [...structures];
        }

        parents.forEach((parent) => {
            echoFormatted(
                _useColor ? Formatters.green(parent.command) : parent.command,
                indent
            );

            const children = _cachedStructures.filter(
                (child: CommandStructure) => child.parent === parent.command
            );

            printStructure(children, indent + _indent * 2);

            parent.options.forEach((option: string) =>
                echoFormatted(
                    _useColor ? Formatters.yellow(option) : option,
                    indent + _indent
                )
            );
        });
    };

    const saveCachedFile = () => {
        Echo.message(`Writing command list to cached file at ${CACHE_PATH}...`);
        try {
            shell.mkdir("-p", upath.dirname(CACHE_PATH));
            shell.touch(CACHE_PATH);
            fs.writeFileSync(
                CACHE_PATH,
                JSON.stringify(_cachedStructures, undefined, 4)
            );
        } catch (error) {
            Echo.error(
                `There was an error writing to ${CACHE_PATH} - ${error}`
            );
        }

        Echo.success("Cached file successfully updated.");
    };

    // #endregion Functions

    // -----------------------------------------------------------------------------------------
    // #region Entrypoint
    // -----------------------------------------------------------------------------------------

    program
        .description(CommandDefinitions.commands.description)
        .option(
            "-i, --indent <indent>",
            "Number of spaces to indent each level",
            _indent.toString()
        )
        .option(
            "--include-help",
            `Include the ${Options.Help} option for each command`,
            _includeHelp
        )
        .option(
            "--no-color",
            "Do not colorize command/options in output",
            !_useColor
        )
        .option(
            "-p, --prefix <prefix>",
            "Prefix to display before each command/option",
            _prefix
        )
        .option(
            "--skip-cache",
            "Skip attempting to read cached command list file",
            false
        )
        .parse(process.argv);

    const { color, includeHelp, indent, prefix, skipCache } = program.opts();

    if (color != null) {
        _useColor = color;
    }

    if (indent != null) {
        _indent = Number.parseInt(indent);
    }

    if (prefix != null) {
        _prefix = prefix;
    }

    if (includeHelp != null) {
        _includeHelp = includeHelp;
    }

    if (skipCache === true) {
        _useCache = false;
    }

    parseOrReadCache();
    printStructure(_cachedStructures, 0);
    if (!_useCache) {
        saveCachedFile();
    }

    // #endregion Entrypoint
});

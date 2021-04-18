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

    // parseOrReadCache();
    // printStructure(_cachedStructures, 0);
    // if (!_useCache) {
    //     saveCachedFile();
    // }

    // #endregion Entrypoint
});

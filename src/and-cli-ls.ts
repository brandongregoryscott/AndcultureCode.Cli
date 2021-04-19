#!/usr/bin/env node

import { CommandRunner } from "./modules/command-runner";
import { CommandDefinitions } from "./modules/command-definitions";
import program from "commander";
import { CollectionUtils } from "andculturecode-javascript-core";
import { CommandDefinitionUtils } from "./utilities/command-definition-utils";
import { Options } from "./constants/options";
import { Constants } from "./modules/constants";
import upath from "upath";
import os from "os";
import { ListCommands } from "./modules/list-commands";

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

const { CLI_CONFIG_DIR } = Constants;
const CACHE_FILENAME = "commands.json";

// #endregion Constants

// -----------------------------------------------------------------------------------------
// #region Variables
// -----------------------------------------------------------------------------------------

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

    ListCommands.run({
        skipCache,
        includeHelp,
        indent: Number.parseInt(indent),
        prefix,
        useColor: color,
    });

    // parseOrReadCache();
    // printStructure(_cachedStructures, 0);
    // if (!_useCache) {
    //     saveCachedFile();
    // }

    // #endregion Entrypoint
});

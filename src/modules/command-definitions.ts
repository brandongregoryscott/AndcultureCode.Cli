import { CommandDefinitions as BaseCommandDefinitions } from "../interfaces/command-definitions";

// -----------------------------------------------------------------------------------------
// #region Public Members
// -----------------------------------------------------------------------------------------

const CommandDefinitions: BaseCommandDefinitions = {
    commands: {
        command: "commands",
        description: "List all commands/options",
    },
    copy: {
        command: "copy",
        description: "Copy files and/or directories",
    },
    deploy: {
        command: "deploy",
        children: {
            awsBeanstalk: {
                command: "aws-beanstalk",
                description: "Run deployments for AWS Beanstalk",
                children: {
                    test: {
                        command: "test",
                        description: "Testing deeply nested command",
                    },
                },
            },
            awsS3: {
                command: "aws-s3",
                description: "Run deployments for AWS S3",
            },
            azureStorage: {
                command: "azure-storage",
                description: "Run deployments for Azure Storage",
            },
            azureWebApp: {
                command: "azure-web-app",
                description: "Run deployments for Azure Web Apps",
            },
            jenkins: {
                command: "jenkins",
                description: "Run deployments for Jenkins",
            },
        },
        description: "Deploy various application types",
    },
    dotnetTest: {
        command: "dotnet-test",
        description: "Run various dotnet test runner commands for the project",
    },
    dotnet: {
        command: "dotnet",
        description: "Run various dotnet commands for the project",
    },
    github: {
        command: "github",
        children: {
            issue: {
                command: "issue",
                description:
                    "Commands for interacting with AndcultureCode github issues",
            },
            repo: {
                command: "repo",
                description:
                    "Commands for interacting with AndcultureCode github repositories",
            },
            topic: {
                command: "topic",
                description:
                    "Commands for interacting with AndcultureCode github repository topics",
            },
        },
        description:
            "Commands for interacting with AndcultureCode github resources",
    },
    install: {
        command: "install",
        description:
            "Collection of commands related to installation and configuration of the and-cli",
    },
    migration: {
        command: "migration",
        description: "Run commands to manage Entity Framework migrations",
    },
    nuget: {
        command: "nuget",
        description: "Manages publishing of nuget dotnet core projects",
    },
    restore: {
        command: "restore",
        description:
            "Restores application data assets for various application types",
        children: {
            azureStorage: {
                command: "azure-storage",
                description: "Restore application assets in Azure Storage",
            },
        },
    },
    webpack: {
        command: "webpack",
        description: "Run various webpack commands for the project",
    },
    webpackTest: {
        command: "webpack-test",
        description: "Run various webpack test commands for the project",
    },
    workspace: {
        command: "workspace",
        description: "Manage AndcultureCode projects workspace",
    },
};

// #endregion Public Members

// -----------------------------------------------------------------------------------------
// #region Exports
// -----------------------------------------------------------------------------------------

export { CommandDefinitions };

// #endregion Exports

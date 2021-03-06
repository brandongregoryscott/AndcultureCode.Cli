import { DotnetBuild } from "./dotnet-build";
import { DotnetClean } from "./dotnet-clean";
import { DotnetPath } from "./dotnet-path";
import { DotnetRestore } from "./dotnet-restore";
import { TestUtils } from "../tests/test-utils";
import faker from "faker";

// -----------------------------------------------------------------------------------------
// #region Tests
// -----------------------------------------------------------------------------------------

describe("DotnetBuild", () => {
    let dotnetCleanSpy: jest.SpyInstance;
    let dotnetPathSpy: jest.SpyInstance;
    let dotnetRestoreSpy: jest.SpyInstance;
    let shellExitSpy: jest.SpyInstance;

    beforeEach(() => {
        dotnetCleanSpy = jest.spyOn(DotnetClean, "run").mockImplementation();
        dotnetPathSpy = jest
            .spyOn(DotnetPath, "solutionPathOrExit")
            .mockImplementation();
        dotnetRestoreSpy = jest
            .spyOn(DotnetRestore, "run")
            .mockImplementation();
        shellExitSpy = TestUtils.spyOnShellExit();
    });

    // -----------------------------------------------------------------------------------------
    // #region run
    // -----------------------------------------------------------------------------------------

    describe("run", () => {
        test("it verifies the dotnet solution can be found by calling DotnetPath module", () => {
            // Arrange & Act
            DotnetBuild.run(faker.random.boolean(), faker.random.boolean());

            // Assert
            expect(dotnetPathSpy).toHaveBeenCalled();
        });

        test("when 'clean' is true, it calls DotnetClean module", () => {
            // Arrange & Act
            DotnetBuild.run(true, faker.random.boolean());

            // Assert
            expect(dotnetCleanSpy).toHaveBeenCalled();
        });

        test("when 'restore' is true, it calls DotnetRestore module", () => {
            // Arrange & Act
            DotnetBuild.run(faker.random.boolean(), true);

            // Assert
            expect(dotnetRestoreSpy).toHaveBeenCalled();
        });

        test("when dotnet command returns non-zero exit code, it calls shell.exit with that code", () => {
            // Arrange
            const exitCode = faker.random.number({ min: 1 });
            const spawnSyncSpy = TestUtils.spyOnSpawnSync(exitCode);

            // Act
            DotnetBuild.run(faker.random.boolean(), faker.random.boolean());

            // Assert
            expect(spawnSyncSpy).toHaveBeenCalled();
            expect(shellExitSpy).toHaveBeenCalledWith(exitCode);
        });
    });

    // #endregion run
});

// #endregion Tests

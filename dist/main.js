#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const util_1 = __importDefault(require("util"));
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = __importDefault(require("commander"));
const ENet_1 = __importDefault(require("./ENet"));
const ENetClient_1 = __importDefault(require("./ENetClient"));
const { version, description } = require("../package.json");
global.debug = false;
var json = false;
var pretty = false;
var deviceLsIncludeState = false;
const cpath = `${process.env.HOME}/.enet`;
if (!fs_1.default.existsSync(cpath)) {
    try {
        fs_1.default.writeFileSync(cpath, "");
    }
    catch (error) {
        console.log(error);
    }
}
commander_1.default
    .version(version)
    .description(description)
    .option("-d, --debug", "Debug", () => {
    global.debug = true;
})
    .option("-j, --json", "JSON", () => {
    json = true;
})
    .option("-p, --pretty", "Pretty printed", () => {
    pretty = true;
})
    .option("-s, --include-state", "Include device state in device list (when executing 'enet device ls')", () => {
    deviceLsIncludeState = true;
});
commander_1.default
    .command("auth <username> <password> <hostname>")
    .description("authenticate with eNet server", {
    hostname: "Hostname or IP",
    username: "Username",
    password: "Password"
})
    .action(async (username, password, hostname) => {
    if (getISID()) {
        console.log(`\nYou are already authenticated with '${getHost()}' as '${getUser()}'!`);
        console.log(`  Use 'enet deauth' to deauthenticate first.\n`);
        return;
    }
    try {
        const enet = new ENet_1.default(hostname);
        const token = await enet.authenticate(username, password);
        console.log("Authentication successful");
        setISID(token);
        setHost(hostname);
        setUser(username);
    }
    catch (error) {
        if (error) {
            console.log("Error:", error);
        }
    }
});
commander_1.default
    .command("deauth")
    .description("Deauthenticate from eNet server")
    .action(async () => {
    try {
        const token = getISID();
        if (token === null)
            throw new Error("Cannot deauthenticate: Not authenticated");
        const host = getHost();
        if (host === null)
            throw new Error("Cannot deauthenticate: No host to deauthenticate from");
        const enet = new ENet_1.default(host, token);
        await enet.deauthenticate();
        setISID(null);
        console.log("Deauthentication successful");
    }
    catch (error) {
        if (error) {
            console.log("Error:", error);
        }
    }
});
commander_1.default
    .command("reboot")
    .description("Restarts the eNet server")
    .action(async () => {
    try {
        const token = getISID();
        if (token === null)
            throw new Error("Not authenticated");
        const host = getHost();
        if (host === null)
            throw new Error("Not authenticated");
        const enet = new ENet_1.default(host, token);
        await enet.reboot();
        console.log("Rebooting... (this may take sevral minutes");
    }
    catch (error) {
        if (error) {
            console.log("Error:", error);
        }
    }
});
// program
//   .command("ibn <command>")
//   .description("manage the ibn service", {
//     command: "(options: 'up' or 'down')"
//   })
//   .action(async (command) => {
//     try {
//       switch (command) {
//         case "up":
//           animation.pulse("Starting IBN service", 2);
//           await startIBNClient(getHost(), getISID());
//           console.log("IBN service started successfully!", "\n");
//           break;
//         case "down":
//           animation.pulse("Shutting down IBN service", 2);
//           await stopIBNClient(getHost(), getISID());
//           process.stdout.clearLine();
//           console.log("IBN service shut down successfully!", "\n");
//           break;
//         default:
//           throw new Error(`Argument '${command}' is invalid. Allowed choices are 'up' or 'down'.`);
//       }
//     } catch (error) {
//       if (error) {
//         console.log("Error:", error);
//       }
//     }
//   });
commander_1.default
    .command("location <command>")
    .description("manage locations", {
    command: "(options: 'ls')"
})
    .action(async (command) => {
    try {
        switch (command) {
            case "ls":
                const enet = new ENet_1.default(getHost(), getISID());
                const response = await enet.getLocations();
                if (json) {
                    if (pretty) {
                        console.log(util_1.default.inspect(response, false, null, true));
                    }
                    else {
                        console.log(JSON.stringify(response));
                    }
                }
                else {
                    console.log("\n", resolveLocations(response));
                }
                break;
            default:
                throw new Error(`Argument '${command}' is invalid. Allowed choices are 'ls'.`);
        }
    }
    catch (error) {
        if (error) {
            console.log("Error:", error);
        }
    }
});
commander_1.default
    .command("project <command> [project]")
    .description("manage projects", {
    command: "(options: 'ls' or 'inspect')",
    project: "UID if the project"
})
    .action(async (command, project) => {
    try {
        switch (command) {
            case "ls":
                await (async () => {
                    const response = await new ENetClient_1.default(getHost(), getISID()).getProjectUIDs();
                    if (json) {
                        if (pretty) {
                            console.log(util_1.default.inspect(response, false, null, true));
                        }
                        else {
                            console.log(JSON.stringify(response));
                        }
                    }
                    else {
                        console.log("");
                        for (const project of response) {
                            console.log(` ${project.projectUID} \t ${project.projectName}`);
                        }
                        console.log("");
                    }
                })();
                break;
            case "inspect":
                await (async () => {
                    if (typeof project !== "string")
                        throw new Error("a project must be specified");
                    const response = await new ENetClient_1.default(getHost(), getISID()).getProjectInformation(project);
                    if (json) {
                        if (pretty) {
                            console.log(util_1.default.inspect(response, false, null, true));
                        }
                        else {
                            console.log(JSON.stringify(response));
                        }
                    }
                    else {
                        console.log("\n Created at", response.creationDate);
                        console.log(" Changed at", response.changeDate, "\n");
                        for (const object of response.projectInformation) {
                            console.log(` ${object.key}:`, object.value);
                        }
                        console.log("");
                    }
                })();
                break;
            default:
                throw new Error(`Argument '${command}' is invalid. Allowed choices are 'ls' or 'inspect'.`);
        }
    }
    catch (error) {
        if (error) {
            console.log("Error:", error);
        }
    }
});
commander_1.default
    .command("device <uid/ls> [action] [function] [value]")
    .description("manage devices", {
    "uid/ls": "'ls' or Device UID.",
    "action": "(options: 'inspect', 'functions', 'status', 'state', 'on', 'off', 'set' or 'get')",
    "function": "for example: 'FT_INSTA.SOO'",
    "value": "value of device when using the 'device <uid> set' command"
})
    .action(async (fuid, command, artifact, value) => {
    try {
        const client = new ENetClient_1.default(getHost(), getISID());
        if (fuid === "ls") {
            const devices = await client.getDevicesWithParameterFilter();
            console.log("");
            for (const device of devices) {
                console.log(`${device.uid} ${device.installationArea}`);
                for (const { deviceChannels } of device.deviceChannelConfigurationGroups) {
                    for (const { outputDeviceFunctions } of deviceChannels) {
                        for (const { currentValues } of outputDeviceFunctions) {
                            const values = currentValues.filter(x => x.valueTypeID == "VT_SWITCH");
                            for (const { valueTypeID, value } of values) {
                                console.log(`  ${valueTypeID} ${value ? chalk_1.default.greenBright("ON") : chalk_1.default.redBright("OFF")}`);
                            }
                        }
                    }
                }
            }
            console.log("");
            return;
        }
        switch (command) {
            case "inspect":
                await (async () => {
                    const response = await client.getDevicesWithParameterFilter([fuid]);
                    var data = response;
                    if (json) {
                        if (pretty) {
                            console.log(util_1.default.inspect(data, false, null, true));
                        }
                        else {
                            console.log(JSON.stringify(data));
                        }
                    }
                    else {
                        const { uid, typeID, metaData, batteryState, securityMode, isSoftwareUpdateAvailable, usedLinkResources } = data[0];
                        console.log("\n UID:", uid);
                        console.log(" Type: ", typeID);
                        console.log(" SerialNumber: ", metaData.serialNumber);
                        console.log(" BatteryState: ", batteryState);
                        console.log(" SoftwareUpdateAvailable: ", isSoftwareUpdateAvailable);
                        console.log(" UsedLinkResources: ", usedLinkResources);
                        console.log(" SecurityMode: ", securityMode);
                        console.log("");
                    }
                })();
                break;
            case "functions":
                await (async () => {
                    const response = await client.getDevicesWithParameterFilter([fuid]);
                    var data = parseDeviceFunctions(response);
                    if (json) {
                        if (pretty) {
                            console.log(util_1.default.inspect(data, false, null, true));
                        }
                        else {
                            console.log(JSON.stringify(data));
                        }
                    }
                    else {
                        console.log("");
                        for (const func of data) {
                            const io = func.io === "IN" ? chalk_1.default.greenBright(func.io) : chalk_1.default.yellowBright(func.io);
                            const values = func.currentValues ? func.currentValues.length : null;
                            console.log(`${func.uid}\t[${io}]\t[${func.active ? chalk_1.default.greenBright("ACTIVE") : chalk_1.default.redBright("INACTIVE")}]\t${func.typeID}${values ? `\t(${values != 1 ? `${values} values` : `1 value`})` : ""}`);
                        }
                        console.log("");
                    }
                })();
                break;
            case "on":
                const devicesToTurnOn = await client.getDevicesWithParameterFilter([fuid]);
                for (const func of devicesToTurnOn[0].getInputFunctions()) {
                    if (func.typeID.includes(".SOO")) {
                        await client.callInputDeviceFunction(func.uid, true);
                        return;
                    }
                }
                console.log(`Device has been instructed to update state to '${command}'`);
                break;
            case "off":
                const devicesToTurnOff = await client.getDevicesWithParameterFilter([fuid]);
                for (const func of devicesToTurnOff[0].getInputFunctions()) {
                    if (func.typeID.includes(".SOO")) {
                        await client.callInputDeviceFunction(func.uid, false);
                        return;
                    }
                }
                console.log(`Device has been instructed to update state to '${command}'`);
                break;
            case "state":
                await (async () => {
                    const response = await client.getDevicesWithParameterFilter([fuid]);
                    var data = parseDeviceFunctions(response);
                    for (const func of data) {
                        if (func.typeID.includes(".IOO") && func.io === "OUT") {
                            const values = await client.getCurrentValuesFromOutputDeviceFunction(func.uid);
                            if (json) {
                                if (pretty) {
                                    console.log(util_1.default.inspect(values, false, null, true));
                                }
                                else {
                                    console.log(JSON.stringify(values));
                                }
                            }
                            else {
                                console.log("");
                                for (const valueInfo of values) {
                                    const { valueTypeID, value } = valueInfo;
                                    const valueString = value === true ? chalk_1.default.greenBright("ON") : value === false ? chalk_1.default.redBright("OFF") : value;
                                    console.log(` ${valueTypeID}`, valueString);
                                }
                                console.log("");
                            }
                        }
                    }
                })();
                break;
            case "status":
                await (async () => {
                    const response = await client.getDevicesWithParameterFilter([fuid]);
                    var data = parseDeviceFunctions(response);
                    for (const func of data) {
                        const values = await client.getCurrentValuesFromOutputDeviceFunction(func.uid);
                        for (const valueInfo of values) {
                            const { valueTypeID, value } = valueInfo;
                            const valueString = value === true ? chalk_1.default.greenBright("ON") : value === false ? chalk_1.default.redBright("OFF") : value;
                            const io = func.io === "IN" ? chalk_1.default.greenBright(func.io) : chalk_1.default.yellowBright(func.io);
                            console.log(`${func.typeID}\t[${io}]\t[${func.active ? chalk_1.default.greenBright("ACTIVE") : chalk_1.default.redBright("INACTIVE")}]\t${valueTypeID}   `, valueString);
                        }
                    }
                })();
                break;
            case "set":
                if (!artifact)
                    throw new Error("a function must be specified. (for example: 'FT_INSTA.SOO')");
                await (async () => {
                    (async () => {
                        await client.getLocations();
                    })();
                    const response = await client.getDevicesWithParameterFilter([fuid]);
                    var data = parseDeviceFunctions(response);
                    for (const func of data) {
                        if (func.typeID === artifact) {
                            if (func.io !== "IN") {
                                throw new Error(`Unable to get device state: Function '${artifact}' is not an INPUT function.`);
                            }
                            const numberValue = parseFloat(value);
                            const endValue = value.toLowerCase() === "false" ? false : value.toLowerCase() === "true" ? true : numberValue !== NaN ? numberValue : value;
                            await client.callInputDeviceFunction(func.uid, endValue);
                            console.log(`Device has been instructed to ${command} ${artifact}`);
                            return;
                        }
                    }
                    console.log(`Unable to ${command} device function: Function '${artifact}' not found!`);
                })();
                break;
            case "get":
                if (!artifact)
                    throw new Error("a function must be specified. (for example: 'FT_INSTA.IOO')");
                await (async () => {
                    const response = await client.getDevicesWithParameterFilter([fuid]);
                    var data = parseDeviceFunctions(response);
                    for (const func of data) {
                        if (func.typeID === artifact) {
                            if (func.io !== "OUT") {
                                throw new Error(`Unable to get device state: Function '${artifact}' is not an OUTPUT function.`);
                            }
                            const values = await client.getCurrentValuesFromOutputDeviceFunction(func.uid);
                            if (json) {
                                if (pretty) {
                                    console.log(util_1.default.inspect(values, false, null, true));
                                }
                                else {
                                    console.log(JSON.stringify(values));
                                }
                            }
                            else {
                                console.log("");
                                for (const valueInfo of values) {
                                    const { valueUID, valueTypeID, value } = valueInfo;
                                    const valueString = value === true ? chalk_1.default.greenBright("ON") : value === false ? chalk_1.default.redBright("OFF") : value;
                                    console.log(` ${valueUID}  ${valueTypeID} `, valueString);
                                }
                                console.log("");
                            }
                            return;
                        }
                    }
                    console.log(`Unable to ${command} device function: Function '${artifact}' not found!`);
                })();
                break;
            default:
                throw new Error(`Argument '${command}' is invalid. Allowed choices are 'inspect', 'functions', 'status', 'state', 'on', 'off', 'set' or 'get'.`);
        }
    }
    catch (error) {
        if (error) {
            console.log("Error:", error);
        }
    }
});
commander_1.default
    .command("function <fuid> <action>")
    .description("manage device functions", {
    fuid: "Device function UID.",
    action: "",
})
    .action(async (fuid, action) => {
    try {
        switch (action) {
            case "enable":
            case "disable":
                await (async () => {
                    await new ENetClient_1.default(getHost(), getISID()).callInputDeviceFunction(fuid, action === "enable");
                    console.log(`Device has been instructed to ${action} ${fuid}`);
                })();
                break;
            default:
                throw new Error(`error: argument '${action}' is invalid. Allowed choices are 'inspect', 'functions', 'enable' or 'disable'.`);
                break;
        }
    }
    catch (error) {
        if (error) {
            console.log("Error:", error);
        }
    }
});
commander_1.default
    .command("get <command>")
    .description("manage variables", {
    command: "(options: 'token' or 'host')"
})
    .action(async (command) => {
    try {
        switch (command) {
            case "token":
                console.log(getISID());
                break;
            case "host":
                console.log(getHost());
                break;
            default:
                console.log(`error: argument '${command}' is invalid. Allowed choices are 'token' or 'host'.`);
                break;
        }
    }
    catch (error) {
        if (error) {
            console.log("Error:", error);
        }
    }
});
commander_1.default
    .command("set <command> <value>")
    .description("manage variables", {
    command: "(options: 'token' or 'host')"
})
    .action(async (command, value) => {
    try {
        switch (command) {
            case "token":
                setISID(value);
                console.log("token updated!");
                break;
            case "host":
                setHost(value);
                console.log("host updated!");
                break;
            default:
                console.log(`error: argument '${command}' is invalid. Allowed choices are 'token' or 'host'.`);
                break;
        }
    }
    catch (error) {
        if (error) {
            console.log("Error:", error);
        }
    }
});
commander_1.default
    .parse(process.argv);
/**
 * Stops the eNet IBNClient interface.
 *
 * @param {String} hostname Hostname or IP address
 * @param {String} cookie Valid cookie
 * @returns
 */
// function stopIBNClient(hostname, cookie) {
//   return new Promise(async (resolve, reject) => {
//     if (!hostname) {
//       reject(new Error("Missing host: use 'enet auth' to authenticate with a host"));
//       return;
//     }
//     if (!cookie) {
//       reject(new Error("Unauthorized: use 'enet auth' to authenticate"));
//       return;
//     }
//     try {
//       const browser = await puppeteer.launch({
//         ignoreHTTPSErrors: true,
//         headless: !debug,
//         defaultViewport: { width: 1280, height: 720 },
//         args: ["--no-sandbox"]
//       });
//       const page = await browser.newPage()
//       await page.setCookie({ name: "INSTASESSIONID", value: cookie, domain: hostname, });
//       await page.goto(`https://${hostname}/ibnclient.html`);
//       await page.waitForSelector("#GotoLoginButton");
//       await new Promise((resolve, reject) => setTimeout(resolve, 1000));
//       await page.click("#GotoLoginButton");
//       await page.waitForSelector(".loginStartContainer .PrimaryTextButtonMCV", { visible: true, timeout: 0 });
//       resolve();
//       if (debug) return;
//       try {
//         await browser.close();
//       } catch (error) {
//         console.log(error);
//       }
//     } catch (error) {
//       if (debug) console.log(error);
//       reject(new Error("Unable to shut down ibn service at this time!"));
//     }
//   });
// }
function resolveLocations(data, indentation = 0) {
    var string = "";
    for (const location of data) {
        const { uid, name, childLocations } = location;
        string += Array.from({ length: indentation }, (_, i) => "  ").join("");
        string += `${uid}        ${name}\n`;
        if (childLocations) {
            string += resolveLocations(childLocations, indentation + 1);
        }
    }
    return string;
}
function getCache() {
    try {
        return JSON.parse(fs_1.default.readFileSync(cpath, 'utf8'));
    }
    catch (error) {
        return {};
    }
}
function setISID(value) {
    const data = getCache();
    data.s = value;
    fs_1.default.writeFileSync(cpath, JSON.stringify(data));
}
function setHost(value) {
    const data = getCache();
    data.h = value;
    fs_1.default.writeFileSync(cpath, JSON.stringify(data));
}
function setUser(value) {
    const data = getCache();
    data.u = value;
    fs_1.default.writeFileSync(cpath, JSON.stringify(data));
}
function getISID() {
    try {
        return JSON.parse(fs_1.default.readFileSync(cpath, 'utf8')).s;
    }
    catch (error) {
        return null;
    }
}
function getHost() {
    try {
        return JSON.parse(fs_1.default.readFileSync(cpath, 'utf8')).h;
    }
    catch (error) {
        return null;
    }
}
function getUser() {
    try {
        return JSON.parse(fs_1.default.readFileSync(cpath, 'utf8')).u;
    }
    catch (error) {
        return null;
    }
}
function parseDeviceFunctions(data) {
    const functions = [];
    for (const device of data) {
        for (const configurationGroup of device["deviceChannelConfigurationGroups"]) {
            for (const deviceChannel of configurationGroup["deviceChannels"]) {
                const inputFunctions = deviceChannel["inputDeviceFunctions"];
                const outputFunctions = deviceChannel["outputDeviceFunctions"];
                for (const func of inputFunctions)
                    if (typeof func === "object") {
                        func.io = "IN";
                        functions.push(func);
                    }
                for (const func of outputFunctions)
                    if (typeof func === "object") {
                        func.io = "OUT";
                        functions.push(func);
                    }
            }
        }
    }
    return functions;
}

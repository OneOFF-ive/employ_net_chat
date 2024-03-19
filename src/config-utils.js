import fs from "fs"
import {dirname, isAbsolute, join} from "path"
import os from "os"

export function resolveAppStoragePath(appDir, path) {
    if (isAbsolute(path)) return path
    else return join(join(os.homedir(), appDir), path)
}

function ensureParent(path) {
    const dir = dirname(path)
    fs.mkdirSync(dir, {recursive: true})
}

function checkReadable(path) {
    try {
        fs.accessSync(path, fs.constants.R_OK)
        return true
    } catch (error) {
        return error
    }
}

function checkWritable(path) {
    try {
        fs.accessSync(path, fs.constants.W_OK)
        return true
    } catch (error) {
        return error
    }
}

export function loadConfigFromFile(
    configPath,
    setupConfig,
) {
    if (!checkReadable(configPath)) {
        return setupConfig({})
    }
    if (!fs.existsSync(configPath)) {
        ensureParent(configPath)
        const config = setupConfig({})
        fs.writeFileSync(configPath, JSON.stringify(config))
        return config
    }
    const data = fs.readFileSync(configPath, "utf8")
    let json
    try {
        json = JSON.parse(data)
    } catch {
        json = {}
    }
    const config = setupConfig(json)
    if (checkWritable(configPath)) {
        ensureParent(configPath)
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    }
    return config
}

export function loadAppConfig(
    appName,
    setupConfig,
) {
    const appDir = `.${appName}`
    const configPath = resolveAppStoragePath(appDir, "config.json")
    return loadConfigFromFile(configPath, setupConfig)
}
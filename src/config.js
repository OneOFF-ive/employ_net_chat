import {loadAppConfig} from "./config-utils.js";

//在/user/.appName/下生成配置文件
export function loadConfig() {
    return loadAppConfig("employ_net_chat", (config) => {
        config.key ??= "key"
        config.request ??= {}
        config.request.base_url ??= "http://localhost:8080"
        config.mongodb ??= {}
        config.mongodb.url ??= "mongodb://localhost:27017/employ_net"
        config.server ??= {}
        config.server.port ??= 8899
        config.server.path ??= "/chat"
        return config
    })
}
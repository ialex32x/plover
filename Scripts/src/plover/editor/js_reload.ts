import { EFileState, FileWatcher, IFileStateMap } from "./file_watcher";
import { ModuleManager } from "jsb";
import { EditorRuntime } from "jsb.editor";

let FileWatcherSymbol = Symbol.for("GlobalFileWatcher");

if (typeof globalThis[FileWatcherSymbol] !== "undefined") {
    globalThis[FileWatcherSymbol].dispose();
    delete globalThis[FileWatcherSymbol];
}

export function reload(mod: NodeModule) {
    if (typeof mod === "object") {
        let dirtylist = [];
        collect_reload_deps(mod, dirtylist);
        do_reload(dirtylist);
    }
}

function do_reload(dirtylist: Array<NodeModule>) {
    if (dirtylist.length > 0) {
        ModuleManager.BeginReload();
        for (let i = 0; i < dirtylist.length; i++) {
            let mod = dirtylist[i];

            console.warn("reloading", mod.id);
            ModuleManager.MarkReload(mod.id);
        }
        ModuleManager.EndReload();
    }
}

function collect_reload_deps(mod: NodeModule, dirtylist: Array<NodeModule>) {
    if (dirtylist.indexOf(mod) < 0) {
        dirtylist.push(mod);

        let parent = mod.parent;
        if (typeof parent === "object") {
            collect_reload_deps(parent, dirtylist);
            parent = parent.parent;
        }
    }
}

let outDir = EditorRuntime?.tsconfig?.compilerOptions?.outDir || EditorRuntime?.prefs?.javascriptDir;
if (typeof outDir === "string" && outDir.length > 0) {
    try {
        let fw = new FileWatcher(outDir, "*.js");

        fw.on(FileWatcher.CHANGED, this, function (filestates: IFileStateMap) {
            let cache = require.main["cache"];
            let dirtylist = [];

            for (let name in filestates) {
                let filestate = filestates[name];

                // console.log("file changed:", filestate.name, filestate.fullPath, filestate.state);

                if (filestate.state != EFileState.CHANGE) {
                    continue;
                }

                for (let moduleId in cache) {
                    let mod: NodeModule = cache[moduleId];

                    // console.warn(mod.filename, mod.filename == filestate.fullPath)
                    if (mod.filename == filestate.fullPath) {
                        collect_reload_deps(mod, dirtylist);
                        break;
                    }
                }
            }
            do_reload(dirtylist);
        });

        globalThis[FileWatcherSymbol] = fw;
        console.log("watching", outDir);
    } catch (error) {
        console.error(error);
    }
} else {
    console.warn("can not read compilerOptions.outDir from EditorRuntime");
}

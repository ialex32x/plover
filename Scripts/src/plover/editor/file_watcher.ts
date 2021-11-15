import { EventDispatcher } from "../events/dispatcher";

export enum EFileState {
    CHANGE = 1,
    NEW = 2,
    DELETE = 3,
}

export interface FileState {
    name: string
    fullPath: string
    state: EFileState
}

export interface IFileStateMap {
    [name: string]: FileState
}

export class FileWatcher {
    static readonly ANY = "* ANY";
    static readonly CHANGED = "* CHANGED";

    private _fsw: FSWatcher;
    private _dispatcher: EventDispatcher = new EventDispatcher();
    private _disposed = false;

    private _pending = false;
    private _cache: IFileStateMap;

    get includeSubdirectories() {
        return this._fsw.includeSubdirectories;
    }

    set includeSubdirectories(v: boolean) {
        this._fsw.includeSubdirectories = v;
    }

    get enableRaisingEvents() {
        return this._fsw.enableRaisingEvents;
    }

    set enableRaisingEvents(v: boolean) {
        this._fsw.enableRaisingEvents = v;
    }

    constructor(path: string, filter: string) {
        this._cache = {};
        this._fsw = new FSWatcher(path, filter);
        this._fsw.oncreate = this.oncreate.bind(this);
        this._fsw.onchange = this.onchange.bind(this);
        this._fsw.ondelete = this.ondelete.bind(this);
        this._fsw.includeSubdirectories = true;
        this._fsw.enableRaisingEvents = true;
    }

    dispose() {
        if (this._disposed) {
            return;
        }
        this._disposed = true;
        this._fsw.dispose();
        this._fsw = null;
    }

    on(name: string, caller: any, fn: Function) {
        this._dispatcher.on(name, caller, fn);
    }

    off(name: string, caller: any, fn: Function) {
        this._dispatcher.off(name, caller, fn);
    }

    private oncreate(name: string, fullPath: string) {
        this.setCacheState(name, fullPath, EFileState.NEW);
    }

    private onchange(name: string, fullPath: string) {
        this.setCacheState(name, fullPath, EFileState.CHANGE);
    }

    private ondelete(name: string, fullPath: string) {
        this.setCacheState(name, fullPath, EFileState.DELETE);
    }

    private setCacheState(name: string, fullPath: string, state: EFileState) {
        if (this._disposed) {
            return;
        }

        this._cache[name] = {
            name: name,
            fullPath: fullPath,
            state: state,
        };
        if (!this._pending) {
            this._pending = true;
            setTimeout(() => this.dispatchEvents(), 500);
        }
    }

    private dispatchEvents() {
        if (this._disposed) {
            return;
        }

        this._pending = false;
        let map: IFileStateMap = this._cache;
        this._cache = {};
        for (let name in map) {
            let state = map[name];
            this._dispatcher.dispatch(name, state);
            this._dispatcher.dispatch(FileWatcher.ANY, state);
        }

        this._dispatcher.dispatch(FileWatcher.CHANGED, map);
    }
}

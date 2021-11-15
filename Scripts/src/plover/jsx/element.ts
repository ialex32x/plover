import { Component, GameObject, MonoBehaviour, Transform } from "UnityEngine";
import { Text } from "UnityEngine.UI";
import { JSXWidgetBridge } from "./bridge";
import { IViewModelWatcher, ViewModel } from "./vue";

export interface Activator<T = JSXNode> {
    new(): T;
}

let elementActivators: { [key: string]: Activator } = {};

export abstract class JSXNode {
    private _parent: JSXNode;

    get parent() { return this._parent; }

    set parent(value: JSXNode) {
        if (this._parent != value) {
            this._parent = value;
            this.onParentSet();
        }
    }

    get widget(): JSXWidget {
        let p = this._parent;
        while (p) {
            if (p instanceof JSXWidget) {
                return p;
            }
            p = p._parent;
        }
    }

    protected abstract onParentSet();

    abstract init(attributes: any, ...children: Array<JSXNode>);
    abstract evaluate();
    abstract destroy();
}

export function findUIComponent<T extends Component>(transform: Transform, name: string, type: { new(): T }): T {
    let n = transform.childCount;
    for (let i = 0; i < n; i++) {
        let child = transform.GetChild(i);

        if (child.name == name) {
            let com = child.GetComponent(type);
            if (com) {
                return com;
            }
        }

        let com = findUIComponent(child, name, type);
        if (com) {
            return com;
        }
    }
}

export function element(name: string) {
    return function (target) {
        registerElement(name, target);
    }
}

export function createElement(name: string, attributes: any, ...children: Array<JSXNode>): JSXNode {
    let act = elementActivators[name];

    if (typeof act !== "undefined") {
        let element = new act();
        element.init(attributes, ...children);
        return element;
    }
}

export function registerElement(name: string, activator: Activator) {
    elementActivators[name] = activator;
}

export abstract class JSXCompoundNode extends JSXNode {
    private _children: Array<JSXNode>;

    init(attributes: any, ...children: Array<JSXNode>) {
        this._children = children;

        for (let i = 0; i < this._children.length; i++) {
            let child = this._children[i];

            child.parent = this;
        }
    }

    evaluate() {
        for (let i = 0; i < this._children.length; i++) {
            let child = this._children[i];

            child.evaluate();
        }
    }

    destroy() {
        for (let i = 0; i < this._children.length; i++) {
            let child = this._children[i];
            child.destroy();
        }
    }
}

// export interface IWidgetInstance {
//     readonly gameObject: GameObject;
//     readonly data: any;
// }

@element("widget")
export class JSXWidget extends JSXCompoundNode {
    private _instance: JSXWidgetBridge;

    get instance() { return this._instance; }

    get data() { return this._instance.data; }

    init(attributes: any, ...children: Array<JSXNode>) {
        this._instance = attributes.class;
        super.init(attributes, ...children);
    }

    protected onParentSet() {
    }
}

@element("text")
export class JSXText extends JSXNode {
    private _name: string;
    private _text: string;
    private _component: Text;
    private _watcher: IViewModelWatcher;

    init(attributes: any, ...children: Array<JSXNode>) {
        if (attributes) {
            this._name = attributes.name;
            this._text = attributes.text;
        }
    }

    protected onParentSet() {
        this._component = findUIComponent(this.widget.instance.transform, this._name, Text);
        this._watcher = ViewModel.expression(this.widget.data, this._text, this.onValueChanged.bind(this));
    }

    private onValueChanged(value) {
        this._component.text = value;
    }

    evaluate() {
        if (this._watcher) {
            this._watcher.evaluate();
        }
    }

    destroy() {
        if (this._watcher) {
            this._watcher.teardown();
            this._watcher = null;
        }
    }
}

import { GUIContent, Texture } from "UnityEngine";


export class EdCache {
    static cache: { [key: string]: GUIContent } = {};

    static T(title: string, tooltip: string = null, image: Texture = null): GUIContent {
        let item = EdCache.cache[title];

        if (typeof item === "undefined") {
            item = EdCache.cache[title] = tooltip == null ? new GUIContent(title, image) : new GUIContent(title, image, tooltip);
        }
        return item;
    }
}

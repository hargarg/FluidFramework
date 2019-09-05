/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    IComponentLoadable,
    IComponentRouter,
    IRequest,
    IResponse,
    IComponentHTMLOptions,
    IComponentHTMLVisual,
    IComponent,
    IComponentHTMLView,
} from "@prague/component-core-interfaces";
import { ComponentRuntime } from "@prague/component-runtime";
import { IPackageManager } from "@prague/host-service-interfaces";
import { ISharedMap, SharedMap } from "@prague/map";
import { IComponentContext, IComponentFactory, IComponentRuntime } from "@prague/runtime-definitions";
import { SharedString } from "@prague/sequence";
import { ISharedObjectFactory } from "@prague/shared-object-common";
import { initializeIcons } from '@uifabric/icons';
import { EventEmitter } from "events";
import * as semver from "semver";
import { DrawerView } from "./drawerView";

export class Drawer extends EventEmitter implements IComponentLoadable, IComponentRouter, IComponentHTMLVisual {
    public static async load(runtime: IComponentRuntime, context: IComponentContext) {
        const collection = new Drawer(runtime, context);
        await collection.initialize();

        return collection;
    }

    private static packages = [
        { pkg: "@chaincode/drawer", name: "Folder", version: "latest", icon: "FabricNewFolder" },
        { pkg: "@chaincode/shared-text", name: "Shared Text", version: "^0.10.0", icon: "TextDocument" },
        { pkg: "@chaincode/flow-scroll", name: "Web Flow", version: "^0.10.0", icon: "WebComponents" },
        { pkg: "@chaincode/smde", name: "Markdown", version: "latest", icon: "MarkDownLanguage" },
        { pkg: "@chaincode/monaco", name: "Monaco", version: "^0.10.0", icon: "Code" },
        { pkg: "@chaincode/table-view", name: "Table", version: "^0.10.0", icon: "Table" },
    ];

    public get IComponentLoadable() { return this; }
    public get IComponentRouter() { return this; }
    public get IComponentHTMLVisual() { return this; }

    public url: string;
    private root: ISharedMap;
    private views = new Set<DrawerView>();
    private packageManager: IPackageManager;
    private packagesP: Promise<{ pkg: string, name: string, version: string, icon: string }[]>;

    constructor(
        private readonly runtime: IComponentRuntime,
        private readonly context: IComponentContext,
    ) {
        super();

        this.context.clientId;

        this.url = context.id;
    }

    public async request(request: IRequest): Promise<IResponse> {
        return {
            mimeType: "fluid/component",
            status: 200,
            value: this,
        };
    }

    private async initialize() {
        if (!this.runtime.existing) {
            this.root = SharedMap.create(this.runtime, "root");
            this.root.register();
        }

        this.root = await this.runtime.getChannel("root") as ISharedMap;

        this.packageManager = this.context.scope.IPackageManager;
        this.packagesP = this.packageManager
            ? this.fetchPackageData()
            : Promise.resolve([]);
    }

    private async fetchPackageData() {
        const latest = await Promise.all(Drawer.packages.map(async (value) => {
            if (value.version === "latest") {
                return this.packageManager.getVersion(value.pkg, value.version);
            }

            const packument = await this.packageManager.get(value.pkg);
            const versions = Object.keys(packument.versions);
            const max = semver.maxSatisfying(versions, value.version);

            return packument.versions[max];
        }));

        return latest.map((value, index) => {
            return {
                pkg: value.name,
                name: Drawer.packages[index].name,
                version: value.version,
                icon: Drawer.packages[index].icon,
            }
        });
    }

    public addView(scope?: IComponent): IComponentHTMLView {
        const view = new DrawerView(
            this.context.scope.IDocumentFactory,
            this.root,
            this.context,
            this.packagesP,
            () => this.views.delete(view));
        this.views.add(view);

        return view;
    }

    public render(elm: HTMLElement, options?: IComponentHTMLOptions): void {
        throw new Error("Just addView please");
    }
}

class DrawerFactory implements IComponentFactory {
    public get IComponentFactory() { return this; }

    public instantiateComponent(context: IComponentContext): void {
        const dataTypes = new Map<string, ISharedObjectFactory>();
        const mapFactory = SharedMap.getFactory();
        const sequenceFactory = SharedString.getFactory();

        dataTypes.set(mapFactory.type, mapFactory);
        dataTypes.set(sequenceFactory.type, sequenceFactory);

        initializeIcons();

        ComponentRuntime.load(
            context,
            dataTypes,
            (runtime) => {
                const progressCollectionP = Drawer.load(runtime, context);
                runtime.registerRequestHandler(async (request: IRequest) => {
                    const progressCollection = await progressCollectionP;
                    return progressCollection.request(request);
                });
            });
    }
}

export const fluidExport = new DrawerFactory();

export function instantiateComponent(context: IComponentContext): void {
    fluidExport.instantiateComponent(context);
}
